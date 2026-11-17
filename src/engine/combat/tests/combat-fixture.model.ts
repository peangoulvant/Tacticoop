/*
 * Fixtures des tests de combat : une mer ouverte, des unités posées à la main, des contacts et des
 * projectiles fabriqués, et des configurations où les tirages sont forcés (probabilité 0 ou 1,
 * dégâts fixes) pour tester le comportement sans dépendre du hasard.
 */
import {
  defaultConfig,
  type GameConfig,
  type WeaponKind,
  type WeaponSpec,
} from '../../config/game.config';
import type { Contact, ContactTargetType } from '../../detection/contact.types';
import type { Hex } from '../../map/hex.service';
import type { Projectile } from '../projectile.types';

export { makeUnit, mapFromDrawing, missionOf, openSea } from '../../ai/tests/mission-fixture.model';

/** Configuration d'essai : les paramètres de `patch` remplacent ceux de l'arme. */
export function withWeapons(patch: Partial<Record<WeaponKind, Partial<WeaponSpec>>>): GameConfig {
  const { weapons } = defaultConfig.combat;
  return {
    ...defaultConfig,
    combat: {
      ...defaultConfig.combat,
      weapons: {
        missile: { ...weapons.missile, ...patch.missile },
        torpedo: { ...weapons.torpedo, ...patch.torpedo },
      },
    },
  };
}

/** Tout impact réussit, et inflige exactement `damage` PV. */
export function sureHit(damage = 40): GameConfig {
  const fixed = { impactProbability: 1, damage: { min: damage, max: damage } };
  return withWeapons({ missile: fixed, torpedo: fixed });
}

/** Aucun impact ne réussit jamais. */
export function sureMiss(): GameConfig {
  return withWeapons({ missile: { impactProbability: 0 }, torpedo: { impactProbability: 0 } });
}

/** Contact identifié du cycle donné, avec sa cible interne. */
export function identified(
  id: string,
  position: Hex,
  source: string,
  targetType: ContactTargetType = 'frigate',
  cycle = 1,
): Contact {
  return { kind: 'identified', id, cycle, targetType, position, source };
}

/** Zone de veille, avec sa cible interne. */
export function suspectZone(id: string, zone: Hex[], source: string, cycle = 1): Contact {
  return { kind: 'suspect', id, cycle, zone, source };
}

/** Projectile d'essai : un missile ami lancé au cycle 1, à compléter selon le cas. */
export function aProjectile(patch: Partial<Projectile> = {}): Projectile {
  return {
    id: 'P-1',
    launchNumber: 1,
    weapon: 'missile',
    side: 'friend',
    launcherId: 'launcher',
    launchCycle: 1,
    position: { col: 0, row: 4 },
    aimedHex: { col: 8, row: 4 },
    targetId: null,
    onSuspectZone: false,
    route: [],
    tracking: false,
    heading: null,
    autonomyLeft: null,
    detected: false,
    ...patch,
  };
}

/** Ligne droite de cases sur une ligne : de `from + 1` à `to` (inclus). */
export function rowRoute(row: number, fromCol: number, toCol: number): Hex[] {
  const step = toCol > fromCol ? 1 : -1;
  const route: Hex[] = [];
  for (let col = fromCol + step; col !== toCol + step; col += step) route.push({ col, row });
  return route;
}
