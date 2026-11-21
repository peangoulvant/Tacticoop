import type { MissionState } from '../core/game.types';
import { hasCarrierArrived } from '../units/carrier-movement.service';
import type { MissionOutcome } from '../units/carrier-orders.service';

/*
 * Conditions de victoire et de défaite (G-02, G-13.1, AB-01, AB-03, AB-48). Elles sont vérifiées
 * après chaque séquence complète (activation, réaction, progression des projectiles), puis à la
 * clôture du cycle ; la défaite prévaut toujours sur la victoire (G-13.1 Q3).
 */

/** Cause principale d'une victoire, affichée avec le résultat (G-13.2 Q2). */
export const VICTORY_CAUSES = ['carrier_arrived', 'hostile_fleet_destroyed'] as const;
export type VictoryCause = (typeof VICTORY_CAUSES)[number];

/** Cause principale d'une défaite. */
export const DEFEAT_CAUSES = [
  'all_units_destroyed',
  'carrier_destroyed',
  'all_escorts_destroyed',
] as const;
export type DefeatCause = (typeof DEFEAT_CAUSES)[number];

/** Résultat de la mission et sa cause. */
export type MissionResult =
  | { outcome: Extract<MissionOutcome, 'victory'>; cause: VictoryCause }
  | { outcome: Extract<MissionOutcome, 'defeat'>; cause: DefeatCause };

/** Navires alliés encore en jeu, porte-avions compris. */
function friendUnits(mission: MissionState) {
  return mission.units.filter((unit) => unit.side === 'friend');
}

/**
 * Cause de défaite, ou `null` (AB-03). Lutte navale : toutes les unités alliées détruites.
 * Escorte : le porte-avions détruit, ou tous les navires d'escorte détruits.
 * Exemple : en escorte, il reste le porte-avions mais plus aucune frégate : `all_escorts_destroyed`.
 */
export function defeatCause(mission: MissionState): DefeatCause | null {
  const friends = friendUnits(mission);
  if (mission.setup.mission === 'naval_combat') {
    return friends.length === 0 ? 'all_units_destroyed' : null;
  }
  if (!friends.some((unit) => unit.shipClass === 'carrier')) return 'carrier_destroyed';
  return friends.every((unit) => unit.shipClass === 'carrier') ? 'all_escorts_destroyed' : null;
}

/**
 * Cause de victoire, ou `null`. Lutte navale : toute la flotte ennemie détruite (G-02.2).
 * Escorte : le porte-avions est arrivé en B (G-03.2.9) ; éliminer les ennemis ne suffit pas (G-02).
 */
export function victoryCause(mission: MissionState): VictoryCause | null {
  if (mission.setup.mission === 'naval_combat') {
    return mission.units.some((unit) => unit.side === 'hostile') ? null : 'hostile_fleet_destroyed';
  }
  return hasCarrierArrived(mission) ? 'carrier_arrived' : null;
}

/**
 * Résultat de la mission, ou `null` si elle continue. C'est ici, et nulle part ailleurs, que se
 * décide la fin d'une mission ; la défaite prévaut sur la victoire (G-13.1 Q3, AB-01).
 */
export function determineOutcome(mission: MissionState): MissionResult | null {
  const defeat = defeatCause(mission);
  if (defeat) return { outcome: 'defeat', cause: defeat };
  const victory = victoryCause(mission);
  return victory ? { outcome: 'victory', cause: victory } : null;
}
