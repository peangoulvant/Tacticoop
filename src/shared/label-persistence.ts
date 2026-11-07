/**
 * Textes produits par la persistance à destination du joueur (refus d'une sauvegarde), en français.
 *
 * Ce module n'importe rien de la persistance : il ne contient que des objets simples. C'est la
 * persistance qui vérifie, avec `satisfies`, que les clés correspondent à ses codes d'erreur
 * (`SaveErrorCode`), sur le modèle de `label-engine.ts`.
 *
 * Ces messages concernent un fichier importé (refus avec message clair, AB-08). Une sauvegarde
 * automatique illisible ou incompatible est traitée comme absente, sans message.
 */

/** Pourquoi une sauvegarde est refusée. */
export const saveErrorMessages = {
  INVALID_JSON: 'Ce fichier n’est pas un fichier JSON valide.',
  UNSUPPORTED_VERSION: 'Cette sauvegarde provient d’une version incompatible de Tacticoop.',
  INVALID_DATA: 'Cette sauvegarde est invalide ou incohérente : rien n’a été chargé.',
};
