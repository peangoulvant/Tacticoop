import { defaultConfig, type GameConfig } from '../../config/game.config';
import {
  availableFromCycle,
  cooldownRemaining,
  isOnCooldown,
  recordSpecialAction,
  usedActionDuringCycle,
} from '../special-action.service';
import { createUnit, type Unit } from '../unit.model';

function frigate(): Unit {
  return createUnit('f', 'friend', 'frigate_da', { col: 0, row: 0 }, defaultConfig, {
    ammoFactor: 1,
    movementCap: null,
  });
}

/** Configuration avec un délai de récupération donné pour le balayage. */
function withCooldown(cooldownCycles: number): GameConfig {
  return {
    ...defaultConfig,
    specialActions: { ...defaultConfig.specialActions, sweep: { cooldownCycles } },
  };
}

describe('délai de récupération des actions spéciales (AB-34)', () => {
  it('une action jamais utilisée est possible dès le cycle 1', () => {
    expect(availableFromCycle(frigate(), 'sweep', defaultConfig)).toBe(1);
    expect(isOnCooldown(frigate(), 'sweep', 1, defaultConfig)).toBe(false);
  });

  it('avec un délai de 1 : usage au cycle 3, indisponible au 4, possible au 5', () => {
    const used = recordSpecialAction(frigate(), 'sweep', 3);
    expect(availableFromCycle(used, 'sweep', defaultConfig)).toBe(5);
    expect([3, 4, 5, 6].map((cycle) => isOnCooldown(used, 'sweep', cycle, defaultConfig))).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  it('avec un délai de 0 : possible à chaque cycle ; avec 2 : possible trois cycles plus tard', () => {
    const used = recordSpecialAction(frigate(), 'sweep', 3);
    expect(availableFromCycle(used, 'sweep', withCooldown(0))).toBe(4);
    expect(availableFromCycle(used, 'sweep', withCooldown(2))).toBe(6);
  });

  it('compte les cycles de récupération restants', () => {
    const used = recordSpecialAction(frigate(), 'sweep', 3);
    expect(
      [3, 4, 5, 6].map((cycle) => cooldownRemaining(used, 'sweep', cycle, defaultConfig)),
    ).toEqual([2, 1, 0, 0]);
    expect(cooldownRemaining(frigate(), 'sweep', 1, defaultConfig)).toBe(0);
  });

  it('enregistre l’usage sans modifier l’unité d’origine', () => {
    const unit = frigate();
    const used = recordSpecialAction(unit, 'sweep', 2);
    expect(used.lastSpecialActionCycle).toEqual({ sweep: 2 });
    expect(unit.lastSpecialActionCycle).toEqual({});
  });

  it('reconnaît un usage pendant le cycle donné seulement (bruit, AB-33)', () => {
    const used = recordSpecialAction(frigate(), 'sweep', 3);
    expect(usedActionDuringCycle(used, 'sweep', 3)).toBe(true);
    expect(usedActionDuringCycle(used, 'sweep', 4)).toBe(false);
    expect(usedActionDuringCycle(frigate(), 'sweep', 3)).toBe(false);
  });
});
