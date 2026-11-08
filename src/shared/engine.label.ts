/**
 * Textes produits par le moteur à destination du joueur (refus, motifs de blocage), en français.
 *
 * Ce module n'importe rien du moteur : il ne contient que des objets simples, pour que le moteur
 * puisse l'importer sans dépendance circulaire. C'est le moteur qui vérifie, avec `satisfies`,
 * que les clés correspondent à ses types (`MoveBlocker`, `MoveRefusal`, `LaunchBlocker`).
 */

/** Pourquoi une unité ne peut pas recevoir d'ordre ou se déplacer maintenant. */
export const moveBlockerMessages = {
  NOT_ACTIVABLE: 'Cette unité ne reçoit pas d’activation.',
  ALREADY_ACTIVATED: 'Cette unité a déjà été activée pendant ce cycle.',
  OTHER_ACTIVATION_IN_PROGRESS: 'Une autre unité est en cours d’activation : terminez-la d’abord.',
  ALREADY_MOVED: 'Cette unité s’est déjà déplacée pendant son activation.',
};

/** Pourquoi une unité ne peut pas utiliser son action spéciale (AB-30), en plus des motifs d'ordre. */
export const specialActionBlockerMessages = {
  SPECIAL_ACTION_USED: 'L’action spéciale de cette unité a déjà été utilisée pendant son activation.',
  NO_SENSORS: 'Cette unité ne porte pas de capteurs.',
};

/** Pourquoi une destination est refusée (SF-02 §6). */
export const moveRefusalMessages = {
  SAME_HEX: 'La destination est la position actuelle de l’unité.',
  NOT_NAVIGABLE: 'Terrain infranchissable pour cette unité.',
  OCCUPIED: 'La destination est occupée par une autre unité.',
  OUT_OF_RANGE: 'Destination hors de portée de mouvement.',
  NO_PATH: 'Aucun chemin navigable ne mène à cette destination.',
};

/** Pourquoi le lancement de la mission est bloqué (SF-01 §5). */
export const launchBlockerMessages = {
  NO_SHIP: 'Sélectionnez au moins un bâtiment.',
  BUDGET_EXCEEDED: 'Le budget est dépassé : retirez des bâtiments.',
};

/** Pourquoi un point de passage de « Modifier l'itinéraire » est refusé (SF-02 §5). */
export const waypointRefusalMessages = {
  NOT_NAVIGABLE: 'Ce point de passage n’est pas navigable pour le porte-avions.',
  SAME_HEX: 'Le porte-avions se trouve déjà sur ce point de passage.',
  NO_PATH: 'Aucun chemin navigable ne mène à ce point de passage.',
};

/** Messages des autres refus de commande, présentés tels quels au joueur. */
export const commandRefusalMessages = {
  UNIT_NOT_FOUND: 'Unité inconnue.',
  MISSION_NOT_LAUNCHED: 'Cette commande n’est disponible qu’une fois la mission lancée.',
  PREPARATION_LOCKED: 'Les choix de préparation sont verrouillés après le lancement.',
  SHIP_BUDGET_EXCEEDED: 'Budget insuffisant pour ce bâtiment.',
  NO_SHIP_TO_REMOVE: 'Aucun bâtiment de cette catégorie à retirer.',
  LAUNCH_BLOCKED: 'La composition ne permet pas de lancer la mission.',
  NOT_ESCORT_MISSION: 'Le porte-avions n’existe que dans la mission d’escorte.',
  NAVIGATION_QUOTA_USED: 'Un ordre de navigation a déjà été donné ce cycle.',
  NOT_AT_CYCLE_END: 'Le cycle ne peut être clôturé qu’après la dernière activation.',
  MISSION_ENDED: 'La mission est terminée.',
};

/** Message du refus d'un nombre de contraintes hors limites (SF-01 §4). */
export function invalidConstraintsMessage(max: number): string {
  return `Choisir entre 0 et ${max} contraintes distinctes.`;
}
