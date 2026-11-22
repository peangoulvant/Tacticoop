import * as engine from '../engine';
import carrier from '../assets/units/porte-avions.png';
import frigate from '../assets/units/fregate.png';
import helicopter from '../assets/units/helicoptere.png';
import missile from '../assets/units/missile.png';
import destroyedShip from '../assets/states/destroyed_ship.png';
import statusTargeted from '../assets/states/targeted.png';
import statusWaiting from '../assets/states/waiting.png';
import submarine from '../assets/units/sna.png';
import torpedo from '../assets/units/torpille.png';
import finishFlag from '../assets/map/drapeau.png';
import beach from '../assets/terrains/plage.png';
import coastalSea from '../assets/terrains/mer_cotiere.png';
import deepSea from '../assets/terrains/mer_profonde.png';
import mountain from '../assets/terrains/montagne.png';
import plain from '../assets/terrains/plaine.png';
import sea from '../assets/terrains/mer_classique.png';

/** Silhouettes blanches des bâtiments (une seule image pour les trois classes de frégates). */
export const shipIcon: Record<engine.ShipClass, string> = {
  fremm: frigate,
  frigate_da: frigate,
  frigate_asm: frigate,
  submarine,
  carrier,
};

/**
 * Silhouette d'un contact identifié, selon son seul type (AB-30) : l'icône de frégate est la même
 * pour les trois classes, donc aucune classe n'est révélée.
 */
export const contactTargetIcon: Record<engine.ContactTargetType, string> = {
  frigate,
  submarine,
  carrier,
};

export const weaponIcon = { missile, torpedo, helicopter };

/** Épave d'un navire détruit, affichée en pleine case jusqu'à la fin de la partie (AB-52). */
export const destroyedShipIcon = destroyedShip;

/** Pictogrammes de statut d'un projectile (AB-51) : « cible » pour `targeted`, « ? » sinon. `destroyed.png` est en réserve. */
export const projectileStatusIcon: Record<engine.ProjectileStatus, string> = {
  targeted: statusTargeted,
  searching: statusWaiting,
  unknown: statusWaiting,
};

export const terrainIcon: Record<engine.Terrain, string> = {
  deep_sea: deepSea,
  sea,
  coastal_sea: coastalSea,
  beach,
  plain,
  mountain,
};

/** Drapeau d'arrivée affiché sur la case du point B. */
export const finishFlagIcon = finishFlag;
