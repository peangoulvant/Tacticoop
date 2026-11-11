import type { GameConfig } from '../config/game.config';
import type { Constraint } from '../missions/setup.service';
import type { Unit } from '../units/unit.model';

/**
 * Portée effective d'un capteur : « Capteurs dégradés » réduit celle des unités alliées, arrondie
 * à l'inférieur (SF-01 §4). Commune à la veille et à la balayage.
 */
export function effectiveRange(
  baseRange: number,
  unit: Unit,
  constraints: readonly Constraint[],
  config: GameConfig,
): number {
  const degraded = unit.side === 'friend' && constraints.includes('degraded_sensors');
  return degraded ? Math.floor(baseRange * config.constraints.sensorsFactor) : baseRange;
}
