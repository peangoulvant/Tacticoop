import { useMemo } from 'react';
import * as engine from '../../../engine';
import { useMoveDraftStore } from '../../../store/move-draft.store';

/**
 * Brouillon de déplacement : le déplacement en préparation, pas encore exécuté. Le trajet (`plan`)
 * est calculé par le moteur à partir de l'unité et de la destination choisie.
 */
export interface MoveDraft {
  unit: engine.Unit;
  /** Destinations accessibles à l'unité. */
  reachable: engine.Hex[];
  destination: engine.Hex | null;
  /** Chemin ou motif du refus ; `null` tant qu'aucune destination n'est choisie. */
  plan: engine.MovePlan | null;
}

/** Déplacement en cours de préparation, ou `null` s'il n'y en a pas ou s'il n'est plus possible. */
export function useMoveDraft(mission: engine.MissionState): MoveDraft | null {
  const unitId = useMoveDraftStore((s) => s.unitId);
  const destination = useMoveDraftStore((s) => s.destination);
  // Aperçu, destinations et refus ne reposent que sur ce que le joueur connaît (SF-02 §7).
  const observation = useMemo(() => engine.observeFriend(mission), [mission]);
  const unit = observation.units.find((u) => u.id === unitId);
  const possible =
    unit !== undefined &&
    observation.outcome === null &&
    engine.moveBlocker(observation.units, unit) === null;

  return useMemo(() => {
    if (!unit || !possible) return null;
    const plan = destination
      ? engine.planMove(observation, unit, destination, engine.defaultConfig)
      : null;
    return {
      unit,
      reachable: engine.reachableHexes(observation, unit, engine.defaultConfig),
      destination,
      plan,
    };
  }, [observation, unit, possible, destination]);
}
