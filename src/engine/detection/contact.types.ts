import type { Hex } from '../map/hex.service';

/**
 * Contact suspect du camp ami (SF-04 §4, G-08.7) : une zone approximative issue d'une détection
 * passive. Il ne porte que ce que le joueur est autorisé à connaître : ni la cible, ni sa classe,
 * ni le détecteur, ni l'ordre dans lequel la zone a été construite (AB-20, AB-21).
 */
export interface Contact {
  /** Identifiant affiché au joueur, « C-1 », « C-2 »… unique dans la mission (AB-21). */
  id: string;
  /** Cycle de la détection (G-08.6.1). */
  cycle: number;
  /** Hexagones de la zone, triés par ligne puis colonne. */
  zone: Hex[];
}

/** Forme d'un identifiant de contact. */
export const CONTACT_ID_PATTERN = /^C-[1-9]\d*$/;

/** Identifiant du contact portant ce numéro d'ordre. */
export function contactId(number: number): string {
  return `C-${number}`;
}
