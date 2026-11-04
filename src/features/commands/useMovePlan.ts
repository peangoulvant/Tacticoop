import { useMemo } from 'react';
import {
  defaultConfig,
  moveBlocker,
  planMove,
  reachableHexes,
  type Hex,
  type MovePlan,
  type MissionState,
  type Unit,
} from '../../engine';
import { useMovePlanStore } from '../../store/useMovePlanStore';

/** Déplacement en préparation, calculé par le moteur à partir de l'unité et de la destination. */
export interface MovePreparation {
  unit: Unit;
  /** Destinations accessibles à l'unité. */
  reachable: Hex[];
  destination: Hex | null;
  /** Chemin ou motif du refus ; `null` tant qu'aucune destination n'est choisie. */
  plan: MovePlan | null;
}

/** Déplacement en cours de préparation, ou `null` s'il n'y en a pas ou s'il n'est plus possible. */
export function useMovePlan(mission: MissionState): MovePreparation | null {
  const unitId = useMovePlanStore((s) => s.unitId);
  const destination = useMovePlanStore((s) => s.destination);
  const unit = mission.units.find((u) => u.id === unitId);
  const possible = unit !== undefined && moveBlocker(mission.units, unit) === null;

  return useMemo(() => {
    if (!unit || !possible) return null;
    const plan = destination ? planMove(mission, unit, destination, defaultConfig) : null;
    return { unit, reachable: reachableHexes(mission, unit, defaultConfig), destination, plan };
  }, [mission, unit, possible, destination]);
}
