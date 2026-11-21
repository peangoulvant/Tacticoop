/*
 * Choix de l'unité ennemie activée (AB-38, G-10.3) : une unité qui a un contact exploitable à
 * approcher d'abord, puis une unité qui sert l'objectif de la mission, puis les unités déjà en
 * place (sans contact, une unité sans munitions d'abord : elle balaie pour les armées, AB-50) ; départage par l'ordre stable des identifiants (comportement reproductible, la variété
 * venant des tirages).
 */
import type { GameConfig } from '../config/game.config';
import type { HostileObservation } from '../detection/observation.types';
import type { Unit } from '../units/unit.model';
import { isOutOfAmmo } from './engagement.ai.service';
import { exploitableContacts, intentOf } from './objective.ai.service';
import { stepsLeft } from './unit-movement.ai.service';

/** Rang de priorité d'une unité : 0 contact à approcher, 1 objectif à rejoindre, 2 déjà en place. */
function priorityOf(observation: HostileObservation, unit: Unit, config: GameConfig): number {
  const intent = intentOf(observation, unit, config);
  if (stepsLeft(observation, unit, intent, config) <= intent.holdDistance) return 2;
  return intent.source === 'contact' ? 0 : 1;
}

/**
 * Rang de passage d'une unité quand l'IA n'a aucun contact exploitable : une unité sans munitions
 * passe avant les autres, car elle ne peut que détecter, et son balayage donne un contact à
 * l'unité armée qui joue ensuite (AB-50). Avec un contact, ce rang est nul pour tous.
 */
function sweeperRank(observation: HostileObservation, unit: Unit): number {
  if (exploitableContacts(observation).length > 0) return 0;
  return isOutOfAmmo(unit) ? 0 : 1;
}

/**
 * Unité ennemie à activer maintenant, ou `null` s'il n'en reste aucune de disponible.
 * Exemple : trois unités disponibles, la deuxième a une zone de contact à approcher : c'est elle ;
 * sans contact, la première (par identifiant) qui n'est pas encore à son poste.
 */
export function chooseHostileUnit(
  observation: HostileObservation,
  config: GameConfig,
): Unit | null {
  const ranked = observation.units
    .filter((unit) => unit.activation === 'available' && unit.hp > 0)
    .map((unit) => ({
      unit,
      sweeper: sweeperRank(observation, unit),
      priority: priorityOf(observation, unit, config),
    }))
    .sort(
      (a, b) =>
        a.sweeper - b.sweeper || a.priority - b.priority || (a.unit.id < b.unit.id ? -1 : 1),
    );
  return ranked[0]?.unit ?? null;
}
