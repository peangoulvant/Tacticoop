import type { ShipClass, Terrain } from '../engine';
import carrier from '../assets/units/porte-avions.png';
import frigate from '../assets/units/fregate.png';
import helicopter from '../assets/units/helicoptere.png';
import missile from '../assets/units/missile.png';
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
export const shipIcon: Record<ShipClass, string> = {
  fremm: frigate,
  frigate_da: frigate,
  frigate_asm: frigate,
  submarine,
  carrier,
};

export const weaponIcon = { missile, torpedo, helicopter };

export const terrainIcon: Record<Terrain, string> = {
  deep_sea: deepSea,
  sea,
  coastal_sea: coastalSea,
  beach,
  plain,
  mountain,
};

/** Drapeau d'arrivée affiché sur la case du point B. */
export const finishFlagIcon = finishFlag;
