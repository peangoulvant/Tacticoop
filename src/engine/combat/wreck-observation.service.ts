import type { MissionState } from '../core/game.types';
import { sameHex, type Hex } from '../map/hex.service';
import type { Side } from '../units/unit.model';

/*
 * Épaves connues d'un camp (AB-52) : la case où un navire a été détruit, affichée jusqu'à la fin de
 * la partie. Un camp connaît la destruction de ses propres navires, et celle des navires adverses
 * qu'il a lui-même détruits (le journal l'annonce). Un navire que l'IA détruit elle-même (tir
 * ami) reste ignoré du joueur : brouillard de guerre, comme pour son contact (AB-49). Une épave
 * ne dit ni la classe ni l'identifiant du navire, seulement sa case et son camp.
 */

/** Une épave telle qu'un camp la connaît. */
export interface ObservedWreck {
  position: Hex;
  /** Camp du navire détruit. */
  side: Side;
}

/**
 * Épaves que `side` connaît, dans l'ordre des destructions, une seule par case (la première).
 * Exemple : une frégate alliée détruite en (5, 4) et un navire hostile détruit par un missile allié
 * en (9, 6) : deux épaves ; un navire hostile détruit par l'IA en (2, 2) : aucune.
 */
export function observedWrecks(mission: MissionState, side: Side): ObservedWreck[] {
  const known = mission.losses.filter((loss) => loss.side === side || loss.destroyedBy === side);
  const wrecks: ObservedWreck[] = [];
  for (const loss of known) {
    if (!wrecks.some((wreck) => sameHex(wreck.position, loss.position))) {
      wrecks.push({ position: loss.position, side: loss.side });
    }
  }
  return wrecks;
}
