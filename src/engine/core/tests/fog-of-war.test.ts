import { defaultConfig, type ShipClass } from '../../config/game.config';
import { observeFriend } from '../../detection/observation.service';
import type { Hex } from '../../map/hex.service';
import { initialSetup } from '../../missions/setup.service';
import { planMove, reachableHexes } from '../../units/unit-movement.service';
import { createUnit, type Side, type Unit } from '../../units/unit.model';
import { executeCommand } from '../execute-command.service';
import type { CommandResult, GameCommand, MissionState } from '../game.types';

function make(id: string, side: Side, shipClass: ShipClass, position: Hex): Unit {
  return createUnit(id, side, shipClass, position, defaultConfig, {
    ammoFactor: 1,
    movementCap: null,
  });
}

/**
 * Une FREMM alliée en (2,4) (mouvement 3), un navire hostile **non détecté** en `hostileAt`,
 * un navire allié en (2,7), en pleine mer.
 */
function mission(hostileAt: Hex): MissionState {
  return {
    status: 'in_progress',
    setup: initialSetup(),
    map: { width: 9, height: 9, terrain: Array(81).fill('sea') },
    start: { col: 0, row: 4 },
    goal: null,
    cycle: 1,
    carrierNavigation: null,
    outcome: null,
    friendContacts: [],
    nextContactNumber: 1,
    hostileContacts: [],
    nextHostileContactNumber: 1,
    rngState: 1,
    units: [
      make('a', 'friend', 'fremm', { col: 2, row: 4 }),
      make('b', 'friend', 'frigate_da', { col: 2, row: 7 }),
      make('hostile-1', 'hostile', 'frigate_da', hostileAt),
    ],
  };
}

function move(destination: Hex): GameCommand {
  return { type: 'MOVE_UNIT', unitId: 'a', destination };
}

function run(state: MissionState, command: GameCommand): CommandResult {
  return executeCommand(state, command, defaultConfig);
}

function accepted(state: MissionState, command: GameCommand) {
  const result = run(state, command);
  if (!result.ok || result.state.status !== 'in_progress') throw new Error('commande refusée');
  return { state: result.state, events: result.events };
}

function unitA(state: MissionState): Unit {
  return state.units.find((u) => u.id === 'a')!;
}

describe('aperçu du déplacement : un occupant non détecté ne se voit pas', () => {
  const hidden = { col: 4, row: 4 };

  it('laisse la case libre dans les destinations accessibles du joueur', () => {
    const state = mission(hidden);
    const unit = unitA(state);
    const known = reachableHexes(observeFriend(state), unit, defaultConfig);
    expect(known).toContainEqual(hidden);
    // L'état réel, lui, la signalerait comme occupée : c'est la fuite à éviter.
    expect(reachableHexes(state, unit, defaultConfig)).not.toContainEqual(hidden);
  });

  it("prévoit un trajet valide, y compris à travers ou vers la case de l'occupant caché", () => {
    const state = mission(hidden);
    const unit = unitA(state);
    const through = planMove(observeFriend(state), unit, { col: 5, row: 4 }, defaultConfig);
    const onIt = planMove(observeFriend(state), unit, hidden, defaultConfig);
    expect(through).toMatchObject({ ok: true });
    expect(onIt).toMatchObject({ ok: true });
    // Sur l'état réel le refus « occupée » révélerait quelque chose.
    expect(planMove(state, unit, hidden, defaultConfig)).toEqual({ ok: false, reason: 'OCCUPIED' });
  });

  it('refuse toujours une case occupée par une unité connue du joueur', () => {
    const state = mission(hidden);
    const known = planMove(observeFriend(state), unitA(state), { col: 2, row: 7 }, defaultConfig);
    expect(known).toEqual({ ok: false, reason: 'OCCUPIED' });
  });
});

describe('déplacement confirmé : obstacle non détecté (SF-02.15, SF-02.16)', () => {
  it("s'arrête au dernier hexagone libre du trajet, et le déplacement est consommé", () => {
    const { state, events } = accepted(mission({ col: 4, row: 4 }), move({ col: 5, row: 4 }));
    expect(unitA(state).position).toEqual({ col: 3, row: 4 });
    expect(unitA(state)).toMatchObject({ activation: 'in_progress', hasMoved: true });
    expect(events).toEqual([
      expect.objectContaining({ type: 'UNIT_MOVED', to: { col: 3, row: 4 }, interrupted: true }),
    ]);
  });

  it("s'arrête avant la destination quand l'obstacle caché l'occupe", () => {
    const { state } = accepted(mission({ col: 5, row: 4 }), move({ col: 5, row: 4 }));
    expect(unitA(state).position).toEqual({ col: 4, row: 4 });
  });

  it("reste en place, déplacement consommé, si l'obstacle bloque dès le premier hexagone", () => {
    const { state, events } = accepted(mission({ col: 3, row: 4 }), move({ col: 5, row: 4 }));
    expect(unitA(state).position).toEqual({ col: 2, row: 4 });
    expect(unitA(state)).toMatchObject({ activation: 'in_progress', hasMoved: true });
    expect(events[0]).toMatchObject({
      interrupted: true,
      from: { col: 2, row: 4 },
      to: { col: 2, row: 4 },
    });
  });

  it("ne produit aucun refus, ni aucune donnée sur l'obstacle, et ne le modifie pas", () => {
    const start = mission({ col: 4, row: 4 });
    const result = run(start, move({ col: 5, row: 4 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const text = JSON.stringify(result.events);
    expect(text).not.toContain('hostile');
    expect(text).not.toContain('"col":4,"row":4');
    if (result.state.status !== 'in_progress') return;
    const hostile = result.state.units.find((u) => u.id === 'hostile-1');
    expect(hostile).toEqual(start.units.find((u) => u.id === 'hostile-1'));
  });

  it("n'interrompt rien quand aucun obstacle n'est sur le trajet : événement inchangé", () => {
    const { state, events } = accepted(mission({ col: 8, row: 8 }), move({ col: 5, row: 4 }));
    expect(unitA(state).position).toEqual({ col: 5, row: 4 });
    expect(events[0]).not.toHaveProperty('interrupted');
  });
});

describe('ce que l’IA détecte reste caché au joueur (AB-35, SF-06 §2)', () => {
  it('une clôture de cycle où l’IA détecte une unité alliée ne produit aucun événement ni information côté joueur', () => {
    let aiDetections = 0;
    for (let seed = 1; seed <= 100; seed++) {
      // Un porte-avions allié (sans capteurs) à 2 hexagones d'une frégate hostile : seule l'IA détecte.
      const state: MissionState = {
        ...mission({ col: 4, row: 4 }),
        rngState: seed,
        units: [
          make('carrier', 'friend', 'carrier', { col: 2, row: 4 }),
          // Immobile et en récupération de balayage : seule la veille agit (50 %).
          {
            ...make('hostile-1', 'hostile', 'frigate_da', { col: 4, row: 4 }),
            movement: 0,
            lastSpecialActionCycle: { sweep: 1 },
          },
        ],
      };
      const closed = accepted(state, { type: 'END_CYCLE_EARLY' });
      if (closed.state.hostileContacts.length > 0) aiDetections++;
      expect(closed.events).toEqual([{ type: 'CYCLE_STARTED', cycle: 2 }]);
      const visible = JSON.stringify([closed.events, observeFriend(closed.state)]);
      expect(visible).not.toContain('hostileContacts');
      expect(visible).not.toContain('"source"');
      expect(closed.state.friendContacts).toEqual([]);
    }
    // Environ 50 % de détections : le test n'est pas vide.
    expect(aiDetections).toBeGreaterThan(30);
    expect(aiDetections).toBeLessThan(70);
  });
});
