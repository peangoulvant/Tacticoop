import { useMemo } from 'react';
import * as engine from '../../../engine';
import { useFireDraftStore } from '../../../store/fire-draft.store';

/**
 * Brouillon de tir : le tir en préparation, pas encore exécuté. Les cibles possibles, le trajet et
 * les avertissements viennent du moteur (`shotCandidates`, `previewShot`) : l'interface ne
 * calcule aucune règle de tir (AB-45, AB-46).
 */
export interface FireDraft {
  unit: engine.Unit;
  weapon: engine.WeaponKind;
  /** Stock courant de l'arme choisie. */
  stock: number;
  /** Contacts visables (identifiés du cycle, ou zones dont une case est à portée). */
  candidates: engine.ShotCandidate[];
  /** Contacts du joueur, pour nommer les cibles (type d'un contact identifié). */
  contacts: engine.ObservedContact[];
  contactId: string | null;
  /** Hexagone choisi dans une zone ; `null` pour un contact identifié. */
  hex: engine.Hex | null;
  /** Aperçu du tir choisi ; `null` tant que la cible n'est pas complète. */
  preview: engine.ShotPreview | null;
  /** Cible complète (contact, et hexagone pour une zone) ; le moteur peut encore refuser le tir (`preview`). */
  target: engine.ShotTarget | null;
}

/** La cible du brouillon est complète : un contact identifié, ou une zone avec son hexagone. */
function targetOf(
  candidates: readonly engine.ShotCandidate[],
  contactId: string | null,
  hex: engine.Hex | null,
): engine.ShotTarget | null {
  const candidate = candidates.find((c) => c.contactId === contactId);
  if (!candidate) return null;
  if (candidate.kind === 'identified') return { contactId: candidate.contactId };
  return hex ? { contactId: candidate.contactId, hex } : null;
}

/** Tir en cours de préparation, ou `null` s'il n'y en a pas ou s'il n'est plus possible. */
export function useFireDraft(mission: engine.MissionState): FireDraft | null {
  const { unitId, weapon, contactId, hex } = useFireDraftStore();
  // Unité, stock et contacts ne reposent que sur ce que le joueur connaît (SF-04 §1).
  const observation = useMemo(() => engine.observeFriend(mission), [mission]);
  const unit = observation.units.find((u) => u.id === unitId);
  const possible =
    unit !== undefined &&
    weapon !== null &&
    observation.outcome === null &&
    engine.specialActionBlocker(
      observation.units,
      unit,
      engine.FIRE_ACTION[weapon],
      observation.cycle,
      engine.defaultConfig,
    ) === null;

  return useMemo(() => {
    if (!unit || !weapon || !possible) return null;
    const candidates = engine.shotCandidates(mission, unit, weapon, engine.defaultConfig);
    const target = targetOf(candidates, contactId, hex);
    const preview = target
      ? engine.previewShot(mission, unit, weapon, target, engine.defaultConfig)
      : null;
    return {
      unit,
      weapon,
      stock: weapon === 'missile' ? unit.missiles : unit.torpedoes,
      candidates,
      contacts: observation.contacts,
      contactId,
      hex,
      preview,
      target,
    };
  }, [mission, observation, unit, weapon, possible, contactId, hex]);
}
