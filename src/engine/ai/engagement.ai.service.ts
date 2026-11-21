/*
 * Engagement de l'IA (AB-50, `PROPOSÉ`) : sur quel contact et avec quelle arme une unité ennemie
 * tire. Elle tire sur un contact **identifié du cycle courant**, jamais sur une zone ; une torpille
 * contre un sous-marin, un missile contre un navire de surface, sans arme de repli : une unité sans
 * stock de l'arme voulue ne tire pas (elle sert alors à détecter). Elle applique les mêmes
 * avertissements de ligne de tir que le joueur (AB-45) : elle ne tire pas sur sa propre ligne. Les
 * décisions se lisent dans `HostileObservation` ; le moteur valide ensuite le tir comme pour le
 * joueur (`fire`).
 */
import { previewShot } from '../combat/shot-preview.service';
import type { ShotTarget } from '../combat/projectile.types';
import { FIRE_ACTION, type GameConfig, type WeaponKind } from '../config/game.config';
import type { MissionState } from '../core/game.types';
import type { ObservedContact } from '../detection/contact.types';
import type { HostileObservation } from '../detection/observation.types';
import { hexDistance } from '../map/hex.service';
import { specialActionBlocker } from '../missions/activation.service';
import type { Unit } from '../units/unit.model';

/** Un tir décidé par l'IA : l'arme et la cible, à confier à la commande `fire`. */
export interface HostileShot {
  weapon: WeaponKind;
  target: ShotTarget;
}

/** Contact identifié pendant le cycle courant : le seul sur lequel l'IA tire (AB-46, AB-50). */
type FreshIdentified = Extract<ObservedContact, { kind: 'identified' }>;

function isFreshIdentified(contact: ObservedContact): contact is FreshIdentified {
  return contact.kind === 'identified' && !contact.stale;
}

/**
 * Arme que l'IA compte employer contre ce contact si l'unité en a en stock, sinon `null` : torpille
 * contre un sous-marin, missile contre un navire de surface (AB-50). Une zone ou un contact ancien
 * n'est jamais visé. Exemple : un sous-marin ennemi (torpilles seulement) face à une frégate
 * identifiée : `null`, il ne tire pas.
 */
export function plannedWeapon(unit: Unit, contact: ObservedContact): WeaponKind | null {
  if (!isFreshIdentified(contact)) return null;
  const weapon: WeaponKind = contact.targetType === 'submarine' ? 'torpedo' : 'missile';
  return (weapon === 'missile' ? unit.missiles : unit.torpedoes) > 0 ? weapon : null;
}

/** L'unité est sans stock d'aucune arme : seule utilité, détecter pour les autres (AB-50). */
export function isOutOfAmmo(unit: Unit): boolean {
  return unit.missiles === 0 && unit.torpedoes === 0;
}

/**
 * Tir que l'unité peut faire maintenant, ou `null` : le contact identifié le plus proche (égalité :
 * identifiant) pour lequel l'arme voulue est en stock, l'action permise, la portée tenue, le trajet
 * possible et la ligne de tir libre d'unités alliées de l'IA.
 */
export function chooseShot(
  mission: MissionState,
  observation: HostileObservation,
  unit: Unit,
  config: GameConfig,
): HostileShot | null {
  const candidates = observation.contacts
    .flatMap((contact) => {
      const weapon = plannedWeapon(unit, contact);
      return weapon && isFreshIdentified(contact) ? [{ contact, weapon }] : [];
    })
    .sort(
      (a, b) =>
        hexDistance(unit.position, a.contact.position) -
          hexDistance(unit.position, b.contact.position) || (a.contact.id < b.contact.id ? -1 : 1),
    );
  for (const { contact, weapon } of candidates) {
    const kind = FIRE_ACTION[weapon];
    if (specialActionBlocker(observation.units, unit, kind, observation.cycle, config)) continue;
    const target = { contactId: contact.id };
    const preview = previewShot(mission, unit, weapon, target, config);
    if (preview.ok && preview.warnings.length === 0) return { weapon, target };
  }
  return null;
}
