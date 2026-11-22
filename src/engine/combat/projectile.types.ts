import type { ShipClass, WeaponKind } from '../config/game.config';
import type { Axial, Hex } from '../map/hex.service';
import type { Side } from '../units/unit.model';

/*
 * Projectiles persistants (G-09 §1, AB-47) : un missile ou une torpille existe sur la carte après
 * son lancement, indépendamment de la survie de son lanceur (G-09-C3), jusqu'à son impact, sa
 * neutralisation ou la fin de la mission (AB-02).
 */

/** Un projectile en vol, tel que le moteur le conserve (état réel : jamais exposé tel quel). */
export interface Projectile {
  /** `P-<numéro de lancement>` : jamais réutilisé. */
  id: string;
  /**
   * Numéro de lancement, croissant dans toute la partie et indépendant du camp : c'est l'ordre
   * fixe et reproductible de résolution des projectiles (G-09.10.1, AB-48).
   */
  launchNumber: number;
  weapon: WeaponKind;
  /** Camp du tireur. */
  side: Side;
  /** Le tireur, conservé même s'il est détruit ensuite (G-09-C3). */
  launcherId: string;
  launchCycle: number;
  position: Hex;
  /** Case visée, au lancement : le contact désigné ou l'hexagone choisi dans une zone. */
  aimedHex: Hex;
  /**
   * Navire désigné au lancement, donnée **interne** (jamais exposée) : l'autodirecteur de la
   * torpille peut l'acquérir. `null` pour un tir sur zone suspecte (AB-47) et pour un missile.
   */
  targetId: string | null;
  /** Tir sur zone suspecte : l'impact subit la pénalité de zone (AB-47). */
  onSuspectZone: boolean;
  /** Cases restantes jusqu'à la case visée (ou jusqu'à la cible acquise), sans la case courante. */
  route: Hex[];
  /** Torpille : l'autodirecteur suit la cible désignée (acquisition en cours). */
  tracking: boolean;
  /** Torpille : direction du dernier pas, conservée comme cap ; `null` avant le premier pas. */
  heading: Axial | null;
  /** Hexagones restants avant neutralisation ; `null` pour un missile (il s'arrête à la case visée). */
  autonomyLeft: number | null;
  /**
   * Le camp adverse du tireur l'identifie en ce moment (AB-49) : le drapeau tombe quand le
   * projectile sort de la portée, et une nouvelle entrée est annoncée de nouveau.
   */
  detected: boolean;
}

/** Cible d'un tir : un contact du camp, et pour une zone suspecte l'hexagone choisi (AB-46). */
export interface ShotTarget {
  contactId: string;
  /** Obligatoire pour une zone suspecte (un hexagone de la zone), sans objet pour un contact identifié. */
  hex?: Hex;
}

/** Pourquoi un tir est refusé (AB-45, AB-46), en plus des motifs d'ordre et d'action spéciale. */
export type FireRefusal =
  | 'UNKNOWN_CONTACT'
  | 'STALE_CONTACT'
  | 'ZONE_HEX_REQUIRED'
  | 'HEX_NOT_IN_ZONE'
  | 'SAME_HEX'
  | 'INCOMPATIBLE_TARGET'
  | 'OUT_OF_RANGE'
  | 'NO_MARITIME_PATH';

/**
 * Navire détruit, conservé pour le futur bilan (G-13.3) et pour l'épave affichée (AB-52) : l'unité
 * elle-même est retirée (G-09-C4). `position` est la case où il a été détruit, `destroyedBy` le
 * camp du tireur : le joueur ne connaît la destruction d'un navire hostile que si c'est lui qui l'a
 * causée (un navire que l'IA détruit elle-même reste ignoré, brouillard de guerre, AB-49).
 */
export interface Loss {
  unitId: string;
  side: Side;
  shipClass: ShipClass;
  cycle: number;
  position: Hex;
  destroyedBy: Side;
}

/**
 * Statut d'un projectile tel que son camp le voit (AB-51) : `targeted`, il va vers sa cible (un
 * missile vers sa case visée, une torpille dont l'autodirecteur a acquis sa cible) ; `searching`,
 * une torpille en recherche de cible (avant l'acquisition, cible perdue, ou tir sur zone) ;
 * `unknown`, un projectile adverse dont on ignore tout de la visée.
 */
export const PROJECTILE_STATUSES = ['targeted', 'searching', 'unknown'] as const;
export type ProjectileStatus = (typeof PROJECTILE_STATUSES)[number];

/**
 * Projectile tel qu'un camp le connaît (AB-49) : jamais sa cible désignée. Pour les siens, le
 * tracé restant jusqu'à la case visée (AB-49 4) ; pour un projectile adverse identifié d'office,
 * seulement l'arme et la position exacte.
 */
export interface ObservedProjectile {
  id: string;
  weapon: WeaponKind;
  /** Camp du tireur. */
  side: Side;
  position: Hex;
  /** Tracé restant jusqu'à la case visée : renseigné pour les projectiles du camp, vide sinon. */
  route: Hex[];
  /** Où en est le projectile : `unknown` pour un projectile adverse (AB-51). */
  status: ProjectileStatus;
}
