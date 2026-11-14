import { describe, expect, it } from 'vitest';
import { defaultConfig, type GameConfig } from '../../config/game.config';
import { observeFriend } from '../../detection/observation.service';
import { plannedRoute } from '../../units/carrier-movement.service';
import { resolveCycleEnd } from '../../missions/cycle.service';
import type { MissionState } from '../../core/game.types';
import { hexDistance } from '../../map/hex.service';
import { playRemainingHostileActivations, reactToFriendActivation } from '../turn.ai.service';
import { makeUnit, missionOf, openSea } from './mission-fixture.model';

function hostileTrio() {
  return [
    makeUnit('hostile-a', 'hostile', 'fremm', { col: 30, row: 5 }),
    makeUnit('hostile-b', 'hostile', 'frigate_da', { col: 30, row: 17 }),
    makeUnit('hostile-c', 'hostile', 'frigate_asm', { col: 30, row: 28 }),
  ];
}

/** Lutte navale 35 × 35 : un navire allié très loin (aucun contact possible) et trois hostiles. */
function farMission(): MissionState {
  return missionOf({
    map: openSea(35, 35),
    units: [makeUnit('friend-a', 'friend', 'fremm', { col: 1, row: 1 }), ...hostileTrio()],
  });
}

function unitOf(mission: MissionState, id: string) {
  return mission.units.find((u) => u.id === id)!;
}

describe("réaction de l'IA après une activation alliée (AB-39)", () => {
  it('active une seule unité ennemie : balayage, déplacement vers son objectif, activation achevée', () => {
    const before = farMission();
    const after = reactToFriendActivation(before, defaultConfig);
    const played = after.units.filter((u) => u.side === 'hostile' && u.activation === 'activated');
    expect(played.map((u) => u.id)).toEqual(['hostile-a']);
    const unit = unitOf(after, 'hostile-a');
    expect(unit.hasMoved).toBe(true);
    expect(unit.specialActionUsed).toBe(true);
    expect(unit.lastSpecialActionCycle.sweep).toBe(1);
    expect(hexDistance(unit.position, unitOf(before, 'hostile-a').position)).toBe(3);
    expect(unitOf(after, 'hostile-b')).toEqual(unitOf(before, 'hostile-b'));
  });

  it('ne touche ni aux unités alliées ni aux contacts du joueur', () => {
    const before = farMission();
    const after = reactToFriendActivation(before, defaultConfig);
    expect(unitOf(after, 'friend-a')).toEqual(unitOf(before, 'friend-a'));
    expect(after.friendContacts).toEqual(before.friendContacts);
    expect(after.nextContactNumber).toBe(before.nextContactNumber);
  });

  it('est passée sans effet quand aucune unité ennemie n’est disponible', () => {
    const idle = farMission();
    const spent = {
      ...idle,
      units: idle.units.map((u) =>
        u.side === 'hostile' ? { ...u, activation: 'activated' as const } : u,
      ),
    };
    expect(reactToFriendActivation(spent, defaultConfig)).toBe(spent);
  });

  it('balaie avec les mêmes règles que le joueur : un navire allié à portée est identifié, côté IA seulement', () => {
    const sure: GameConfig = {
      ...defaultConfig,
      ships: {
        ...defaultConfig.ships,
        fremm: {
          ...defaultConfig.ships.fremm,
          detection: { ...defaultConfig.ships.fremm.detection!, sweepProbability: 1 },
        },
      },
    };
    const mission = missionOf({
      map: openSea(20, 9),
      units: [
        makeUnit('friend-a', 'friend', 'frigate_da', { col: 7, row: 4 }),
        makeUnit('hostile-a', 'hostile', 'fremm', { col: 10, row: 4 }),
      ],
    });
    const after = reactToFriendActivation(mission, sure);
    expect(after.hostileContacts).toHaveLength(1);
    expect(after.hostileContacts[0]).toMatchObject({
      kind: 'identified',
      targetType: 'frigate',
      source: 'friend-a',
    });
    expect(after.friendContacts).toEqual([]);
    expect(JSON.stringify(observeFriend(after))).not.toContain('hostile');
  });

  it('un contact reçu détourne l’unité vers lui, sans balayer', () => {
    const mission = {
      ...farMission(),
      hostileContacts: [
        {
          kind: 'suspect' as const,
          id: 'C-1',
          cycle: 1,
          zone: [{ col: 20, row: 5 }],
          source: 'friend-a',
        },
      ],
    };
    const after = reactToFriendActivation(mission, defaultConfig);
    const unit = unitOf(after, 'hostile-a');
    expect(unit.specialActionUsed).toBe(false);
    expect(hexDistance(unit.position, { col: 20, row: 5 })).toBe(7);
  });
});

describe('clôture du cycle (G-06.4.4, AB-39)', () => {
  it('toutes les unités ennemies encore disponibles jouent, une fois chacune', () => {
    const after = playRemainingHostileActivations(farMission(), defaultConfig);
    const hostile = after.units.filter((u) => u.side === 'hostile');
    expect(hostile.every((u) => u.activation === 'activated')).toBe(true);
    expect(hostile.every((u) => u.lastSpecialActionCycle.sweep === 1)).toBe(true);
  });

  it('une unité déjà activée ce cycle ne rejoue pas (aucune réactivation)', () => {
    const before = reactToFriendActivation(farMission(), defaultConfig);
    const after = playRemainingHostileActivations(before, defaultConfig);
    expect(unitOf(after, 'hostile-a').position).toEqual(unitOf(before, 'hostile-a').position);
  });

  it('joue avant la navigation du porte-avions : une unité qui libère la route la laisse passer', () => {
    // Escorte 9 × 9 : le porte-avions (mouvement 2) va de (0,4) vers B ; un hostile occupe la 2e case de sa route.
    const base: MissionState = {
      ...missionOf({
        kind: 'escort',
        map: openSea(9, 9),
        goal: { col: 8, row: 4 },
        units: [makeUnit('carrier', 'friend', 'carrier', { col: 0, row: 4 })],
      }),
      carrierNavigation: { mode: 'continue', waypoint: null, orderUsed: false },
    };
    const route = plannedRoute(base, defaultConfig)!;
    const blocker = route[2]!;
    const mission = {
      ...base,
      // En récupération de balayage : sinon il identifierait le porte-avions voisin et resterait près de lui.
      units: [
        ...base.units,
        {
          ...makeUnit('hostile-a', 'hostile', 'fremm', blocker),
          lastSpecialActionCycle: { sweep: 1 },
        },
      ],
    };
    const { state } = resolveCycleEnd(mission, defaultConfig);
    expect(unitOf(state, 'carrier').position).toEqual(blocker);
    expect(unitOf(state, 'hostile-a').position).not.toEqual(blocker);
  });
});
