/*
 * Politique de balayage de l'IA (AB-40, `PROPOSÉ`) : balayer dès que l'action est disponible et
 * qu'aucun contact valide n'existe. Un contact valide est un contact exploitable (zone de veille
 * ou navire identifié pendant ce cycle). Les conditions d'usage sont celles du joueur : l'IA
 * interroge `specialActionBlocker`, sans règle à part.
 */
import type { GameConfig } from '../config/game.config';
import type { HostileObservation } from '../detection/observation.types';
import { specialActionBlocker } from '../missions/activation.service';
import type { Unit } from '../units/unit.model';
import { exploitableContacts } from './objective.ai.service';

/**
 * L'unité doit-elle balayer avant de se déplacer ? Oui si le balayage lui est permis (capteurs,
 * pas de récupération en cours, action non utilisée) et que l'IA n'a aucun contact valide.
 * Exemple : au cycle 1 sans contact, oui ; au cycle suivant le même navire est en récupération
 * (délai d'un cycle) : non.
 */
export function shouldSweep(
  observation: HostileObservation,
  unit: Unit,
  config: GameConfig,
): boolean {
  if (exploitableContacts(observation).length > 0) return false;
  return specialActionBlocker(observation.units, unit, 'sweep', observation.cycle, config) === null;
}
