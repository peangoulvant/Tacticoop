import * as engine from '../../../engine';

/**
 * Teinte d'un contact parmi une liste, selon son numéro : C-1, C-5 et C-9 partagent la même teinte
 * quand il y en a quatre (AB-26). Le numéro ne désigne pas la cible, seulement l'ordre de création.
 */
export function contactTint(id: string, tints: readonly string[]): string {
  return tints[(engine.contactNumber(id) - 1) % tints.length] as string;
}
