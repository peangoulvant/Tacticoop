import { defaultConfig, type ShipClass } from '../../config/game.config';
import type { MissionState } from '../../core/game.types';
import { createRng } from '../../core/rng.service';
import type { Hex } from '../../map/hex.service';
import { createUnit, type Unit } from '../../units/unit.model';
import { closeCycle, determineOutcome, resolveCycleEnd } from '../cycle.service';
import { initialSetup } from '../setup.service';

const SIZE = 9;

function make(id: string, shipClass: ShipClass, position: Hex): Unit {
  return createUnit(id, 'friend', shipClass, position, defaultConfig, {
    ammoFactor: 1,
    movementCap: null,
  });
}

/** Escorte en pleine mer : A en (0,4), B en (8,4), porte-avions placé sur `carrierAt`. */
function escort(carrierAt: Hex): MissionState {
  return {
    status: 'in_progress',
    setup: initialSetup(),
    map: { width: SIZE, height: SIZE, terrain: Array(SIZE * SIZE).fill('sea') },
    start: { col: 0, row: 4 },
    goal: { col: 8, row: 4 },
    cycle: 3,
    carrierNavigation: { mode: 'continue', waypoint: null, orderUsed: false },
    outcome: null,
    friendContacts: [],
    nextContactNumber: 1,
    rngState: 1,
    units: [make('carrier', 'carrier', carrierAt), make('a', 'fremm', { col: 2, row: 2 })],
  };
}

describe('résolution des phases de fin de cycle', () => {
  it('fait naviguer le porte-avions sans jamais déclarer la fin de la mission', () => {
    const { state, events } = resolveCycleEnd(escort({ col: 7, row: 4 }), defaultConfig);
    expect(state.units.find((u) => u.id === 'carrier')!.position).toEqual({ col: 8, row: 4 });
    expect(state.outcome).toBeNull();
    expect(events.map((e) => e.type)).toEqual(['CARRIER_MOVED']);
  });
});

describe('détermination du résultat', () => {
  it('donne la victoire quand le porte-avions est en B, sinon rien', () => {
    expect(determineOutcome(escort({ col: 8, row: 4 }))).toBe('victory');
    expect(determineOutcome(escort({ col: 7, row: 4 }))).toBeNull();
  });

  it('ne décide rien en lutte navale (pas de porte-avions ni de point B)', () => {
    const navalCombat: MissionState = {
      ...escort({ col: 8, row: 4 }),
      goal: null,
      carrierNavigation: null,
      units: [make('a', 'fremm', { col: 2, row: 2 })],
    };
    expect(determineOutcome(navalCombat)).toBeNull();
  });

  it("ne change pas l'état qu'on lui donne", () => {
    const mission = escort({ col: 8, row: 4 });
    const before = structuredClone(mission);
    determineOutcome(mission);
    expect(mission).toEqual(before);
  });
});

describe('clôture du cycle : navigation, puis résultat, puis suite', () => {
  it("décide la fin après la navigation : l'arrivée se produit pendant la résolution, pas avant", () => {
    const mission = escort({ col: 7, row: 4 });
    // Avant la clôture, le porte-avions n'est pas en B : aucun résultat n'est encore décidé.
    expect(determineOutcome(mission)).toBeNull();
    const { state, events } = closeCycle(mission, defaultConfig);
    expect(events.map((e) => e.type)).toEqual(['CARRIER_MOVED', 'MISSION_WON']);
    expect(state.outcome).toBe('victory');
  });

  it("n'ouvre pas de cycle suivant après la victoire", () => {
    const { state, events } = closeCycle(escort({ col: 7, row: 4 }), defaultConfig);
    expect(state.cycle).toBe(3);
    expect(events.some((e) => e.type === 'CYCLE_STARTED')).toBe(false);
  });

  it('ouvre le cycle suivant quand la mission continue, après la navigation', () => {
    const { state, events } = closeCycle(escort({ col: 2, row: 4 }), defaultConfig);
    expect(state.outcome).toBeNull();
    expect(state.cycle).toBe(4);
    expect(events.map((e) => e.type)).toEqual(['CARRIER_MOVED', 'CYCLE_STARTED']);
  });

  it('ne prolonge jamais une mission déjà terminée', () => {
    const won: MissionState = { ...escort({ col: 8, row: 4 }), outcome: 'victory' };
    const { state, events } = closeCycle(won, defaultConfig);
    expect(state).toBe(won);
    expect(events).toEqual([]);
  });
});

describe('veille passive en fin de cycle (G-08, chronologie)', () => {
  /** Lutte navale : un détecteur allié, un sous-marin hostile adjacent en mer côtière, cycle 3. */
  function withHostileInRange(seed: number): MissionState {
    return {
      ...escort({ col: 0, row: 4 }),
      goal: null,
      carrierNavigation: null,
      map: { width: SIZE, height: SIZE, terrain: Array(SIZE * SIZE).fill('coastal_sea') },
      rngState: createRng(seed).state(),
      units: [
        make('a', 'frigate_da', { col: 4, row: 4 }),
        createUnit('h', 'hostile', 'submarine', { col: 5, row: 4 }, defaultConfig, {
          ammoFactor: 1,
          movementCap: null,
        }),
      ],
    };
  }

  it('détecte après le déplacement du porte-avions, avant l’ouverture du cycle suivant', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const mission = { ...withHostileInRange(seed), goal: escort({ col: 0, row: 4 }).goal };
      const withCarrier: MissionState = {
        ...mission,
        carrierNavigation: { mode: 'continue', waypoint: null, orderUsed: false },
        units: [make('carrier', 'carrier', { col: 6, row: 2 }), ...mission.units],
      };
      const { events } = closeCycle(withCarrier, defaultConfig);
      const types = events.map((e) => e.type);
      if (types.includes('CONTACT_DETECTED')) {
        expect(types.indexOf('CARRIER_MOVED')).toBeLessThan(types.indexOf('CONTACT_DETECTED'));
        expect(types.indexOf('CONTACT_DETECTED')).toBeLessThan(types.indexOf('CYCLE_STARTED'));
        return;
      }
    }
    throw new Error('aucune détection obtenue');
  });

  it('enregistre le cycle clos dans le contact et dans l’événement', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { state, events } = closeCycle(withHostileInRange(seed), defaultConfig);
      const detected = events.filter((e) => e.type === 'CONTACT_DETECTED');
      if (detected.length > 0) {
        expect(detected[0]).toMatchObject({ contactId: 'C-1', cycle: 3 });
        expect(state.friendContacts.map((c) => [c.id, c.cycle])).toEqual([['C-1', 3]]);
        expect(state.cycle).toBe(4);
        return;
      }
    }
    throw new Error('aucune détection obtenue');
  });

  it('détecte aussi quand la mission se termine pendant ce cycle (AB-01)', () => {
    const mission = escort({ col: 7, row: 4 });
    const result = closeCycle(mission, defaultConfig);
    expect(result.state.outcome).toBe('victory');
    expect(result.state.rngState).toBe(mission.rngState);
  });
});
