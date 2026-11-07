import { defaultConfig, type ShipClass } from '../../config/game.config';
import type { MissionState } from '../../core/game.types';
import type { Hex } from '../../map/hex.service';
import { initialSetup } from '../../missions/setup.service';
import { createUnit, type Side, type Unit } from '../../units/unit.model';
import { observeFriend, observeHostile } from '../observation.service';

function make(id: string, side: Side, shipClass: ShipClass, position: Hex): Unit {
  return createUnit(id, side, shipClass, position, defaultConfig, {
    ammoFactor: 1,
    movementCap: null,
  });
}

/** Mission avec deux unités alliées et deux unités hostiles : aucune n'est détectée. */
function missionWithHostiles(): MissionState {
  return {
    status: 'in_progress',
    setup: initialSetup(),
    map: { width: 9, height: 9, terrain: Array(81).fill('sea') },
    start: { col: 0, row: 4 },
    goal: { col: 8, row: 4 },
    cycle: 2,
    carrierNavigation: { mode: 'continue', waypoint: null, orderUsed: false },
    outcome: null,
    units: [
      make('carrier', 'friend', 'carrier', { col: 0, row: 4 }),
      make('a', 'friend', 'fremm', { col: 2, row: 2 }),
      make('hostile-1', 'hostile', 'frigate_da', { col: 5, row: 4 }),
      make('hostile-2', 'hostile', 'submarine', { col: 6, row: 6 }),
    ],
  };
}

describe('projection du camp ami', () => {
  it("ne contient que les unités amies : aucune unité hostile n'est détectée", () => {
    const observation = observeFriend(missionWithHostiles());
    expect(observation.units.map((u) => u.id)).toEqual(['carrier', 'a']);
  });

  it("ne révèle ni l'identifiant ni la position d'une unité hostile, où que ce soit", () => {
    const text = JSON.stringify(observeFriend(missionWithHostiles()));
    expect(text).not.toContain('hostile-1');
    expect(text).not.toContain('hostile-2');
    expect(text).not.toContain('"side":"hostile"');
  });

  it('garde ce que le joueur connaît : carte, points A et B, cycle, navigation', () => {
    const mission = missionWithHostiles();
    const observation = observeFriend(mission);
    expect(observation).toMatchObject({
      map: mission.map,
      start: mission.start,
      goal: mission.goal,
      cycle: 2,
      outcome: null,
      carrierNavigation: mission.carrierNavigation,
    });
  });

  it("ne modifie pas l'état réel", () => {
    const mission = missionWithHostiles();
    const before = structuredClone(mission);
    observeFriend(mission);
    expect(mission).toEqual(before);
  });
});

describe('projection du camp hostile', () => {
  it('ne contient que les unités hostiles : jamais les positions réelles des alliés', () => {
    const observation = observeHostile(missionWithHostiles());
    expect(observation.units.map((u) => u.id)).toEqual(['hostile-1', 'hostile-2']);
    const text = JSON.stringify(observation);
    expect(text).not.toContain('"id":"a"');
    expect(text).not.toContain('"id":"carrier"');
  });
});
