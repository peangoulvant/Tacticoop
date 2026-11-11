import { useMemo } from 'react';
import * as engine from '../../../engine';
import { useSweepDraftStore } from '../../../store/sweep-draft.store';

/**
 * Brouillon de balayage : l'action en préparation, pas encore exécutée. Sans paramètre à
 * choisir, il ne porte que l'unité et ce que le moteur en déduit : la portée effective et les
 * cases à portée, que la carte surligne (AB-30).
 */
export interface SweepDraft {
  unit: engine.Unit;
  /** Portée effective en hexagones, capteurs dégradés compris. */
  range: number;
  /** Cases à portée, la case de l'unité exclue. */
  area: engine.Hex[];
}

/** Balayage en cours de préparation, ou `null` s'il n'y en a pas ou si elle n'est plus possible. */
export function useSweepDraft(mission: engine.MissionState): SweepDraft | null {
  const unitId = useSweepDraftStore((s) => s.unitId);
  // Portée et cases ne reposent que sur ce que le joueur connaît (SF-04 §1).
  const observation = useMemo(() => engine.observeFriend(mission), [mission]);
  const unit = observation.units.find((u) => u.id === unitId);
  const possible =
    unit !== undefined &&
    observation.outcome === null &&
    engine.specialActionBlocker(observation.units, unit, engine.defaultConfig) === null;

  return useMemo(() => {
    if (!unit || !possible) return null;
    return {
      unit,
      range: engine.effectiveSweepRange(unit, observation.constraints, engine.defaultConfig),
      area: engine.sweepArea(observation, unit, engine.defaultConfig),
    };
  }, [observation, unit, possible]);
}
