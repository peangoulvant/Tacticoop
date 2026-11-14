/*
 * Tour de l'IA (AB-35, AB-39) : une unité ennemie est activée, balaie si la politique le veut, se
 * déplace vers son objectif puis termine son activation, avec les mêmes commandes que le joueur
 * (`unit-commands.service.ts`). Aucune de ses actions ne produit d'événement : le journal du
 * joueur n'en voit rien (AB-41, SF-06 §5). Le hasard est repris et rendu à l'état (AB-24).
 *
 *   activation alliée achevée ──► `reactToFriendActivation` (une unité ennemie)
 *   clôture du cycle           ──► `playRemainingHostileActivations` (les autres), avant le porte-avions
 */
import type { GameConfig } from '../config/game.config';
import type { CommandResult, MissionState } from '../core/game.types';
import { restoreRng } from '../core/rng.service';
import { finishActivation, moveUnit, sweep } from '../core/unit-commands.service';
import { observeHostile } from '../detection/observation.service';
import { intentOf } from './objective.ai.service';
import { shouldSweep } from './sweep.ai.service';
import { chooseHostileUnit } from './unit-selection.ai.service';
import { chooseDestination } from './unit-movement.ai.service';

/**
 * Nouvel état si la commande est acceptée ; sinon l'état inchangé. Un refus d'une commande de
 * l'IA ne bloque jamais la partie : l'IA renonce à cette action, comme un joueur qui s'en abstient.
 */
function stateAfter(result: CommandResult, fallback: MissionState): MissionState {
  // Les commandes d'unité renvoient toujours une mission en cours.
  return result.ok ? (result.state as MissionState) : fallback;
}

/** Balaie si la politique de l'IA le veut (`PROPOSÉ`, AB-40). */
function sweepIfWanted(mission: MissionState, unitId: string, config: GameConfig): MissionState {
  const observation = observeHostile(mission);
  const unit = observation.units.find((u) => u.id === unitId);
  return unit && shouldSweep(observation, unit, config)
    ? stateAfter(sweep(mission, { unitId }, config, 'hostile'), mission)
    : mission;
}

/**
 * Déplace l'unité vers son objectif ou son contact (voir `chooseDestination`). Le tirage des
 * égalités reprend le générateur de la mission et le lui rend, pour une partie reproductible.
 */
function moveTowardIntent(mission: MissionState, unitId: string, config: GameConfig): MissionState {
  const observation = observeHostile(mission);
  const unit = observation.units.find((u) => u.id === unitId);
  if (!unit) return mission;
  const rng = restoreRng(mission.rngState);
  const destination = chooseDestination(
    observation,
    unit,
    intentOf(observation, unit, config),
    config,
    rng,
  );
  if (!destination) return mission;
  const drawn = { ...mission, rngState: rng.state() };
  return stateAfter(moveUnit(drawn, { unitId, destination }, config, 'hostile'), drawn);
}

/**
 * Réaction ennemie à une activation alliée achevée (AB-39) : une unité disponible, choisie selon
 * AB-38, joue son activation entière ; sans unité disponible, la réaction est passée sans effet
 * (`mission` est alors rendue telle quelle).
 */
export function reactToFriendActivation(mission: MissionState, config: GameConfig): MissionState {
  const unit = chooseHostileUnit(observeHostile(mission), config);
  if (!unit) return mission;
  const swept = sweepIfWanted(mission, unit.id, config);
  const moved = moveTowardIntent(swept, unit.id, config);
  return stateAfter(finishActivation(moved, { unitId: unit.id }, config, 'hostile'), moved);
}

/**
 * Clôture du cycle (G-06.4.4, AB-39) : les unités ennemies encore disponibles jouent leur
 * activation, avant la navigation du porte-avions. Chaque passage termine une activation ; la
 * borne protège d'un refus imprévu qui laisserait une unité disponible.
 */
export function playRemainingHostileActivations(
  mission: MissionState,
  config: GameConfig,
): MissionState {
  let state = mission;
  for (let turn = 0; turn < mission.units.length; turn++) {
    const next = reactToFriendActivation(state, config);
    if (next === state) break;
    state = next;
  }
  return state;
}
