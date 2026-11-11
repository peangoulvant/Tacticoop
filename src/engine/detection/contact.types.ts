import type { Hex } from '../map/hex.service';

/** Type de navire révélé par une balayage : frégate ou sous-marin, jamais la classe (AB-25). */
export const CONTACT_TARGET_TYPES = ['frigate', 'submarine'] as const;
export type ContactTargetType = (typeof CONTACT_TARGET_TYPES)[number];

/** Champs communs aux deux formes de contact du camp ami. */
interface ContactBase {
  /** Identifiant affiché au joueur, « C-1 », « C-2 »… unique dans la mission (AB-21). */
  id: string;
  /** Cycle de la détection (G-08.6.1). */
  cycle: number;
}

/**
 * Contact suspect du camp ami (SF-04 §4, G-08.7) : une zone approximative issue de la veille
 * (détection continue de fin de cycle). Il ne porte que ce que le joueur est autorisé à connaître : ni la cible, ni sa classe,
 * ni le détecteur, ni l'ordre dans lequel la zone a été construite (AB-20, AB-21).
 */
export interface SuspectContact extends ContactBase {
  kind: 'suspect';
  /** Hexagones de la zone, triés par ligne puis colonne. */
  zone: Hex[];
}

/**
 * Contact identifié par une balayage (AB-25) : le type du navire et sa position exacte à
 * l'instant du balayage. La position n'est jamais actualisée automatiquement (AB-27).
 */
export interface IdentifiedContact extends ContactBase {
  kind: 'identified';
  targetType: ContactTargetType;
  position: Hex;
}

/** Navire identifié par un balayage : ce que l'événement et le journal peuvent dire (AB-28). */
export interface Identification {
  contactId: string;
  targetType: ContactTargetType;
  position: Hex;
}

/**
 * Contact tel que le moteur le conserve : la forme visible du joueur, plus `source`, l'identifiant
 * de la cible réelle (AB-26). `source` est interne : il n'apparaît ni dans la projection amie, ni
 * dans les événements, ni dans le journal.
 */
export type Contact = (SuspectContact | IdentifiedContact) & { source: string };

/**
 * Contact tel que le joueur le voit (`observeFriend()`), sans `source`. Un contact identifié
 * détecté avant le cycle courant est « ancien » (AB-27) ; une zone de veille ne l'est jamais.
 */
export type FriendContact = SuspectContact | (IdentifiedContact & { stale: boolean });

/** Forme d'un identifiant de contact. */
export const CONTACT_ID_PATTERN = /^C-[1-9]\d*$/;

/** Identifiant du contact portant ce numéro d'ordre. */
export function contactId(number: number): string {
  return `C-${number}`;
}

/** Numéro d'ordre d'un contact, lu dans son identifiant (« C-5 » donne 5). */
export function contactNumber(id: string): number {
  return Number(id.slice(2));
}

/** Cases occupées par un contact : sa zone, ou la case exacte d'un contact identifié. */
export function contactHexes(contact: SuspectContact | IdentifiedContact): Hex[] {
  return contact.kind === 'suspect' ? contact.zone : [contact.position];
}
