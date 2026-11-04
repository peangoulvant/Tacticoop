import type {
  ActivationStatus,
  Constraint,
  Difficulty,
  GameError,
  LaunchBlocker,
  MissionKind,
  Terrain,
} from '../engine';

/** Textes d'interface en français ; les identifiants du moteur restent en anglais. */
export const missionLabel: Record<MissionKind, string> = {
  naval_combat: 'Lutte navale',
  escort: 'Escorte de porte-avions',
};

export const difficultyLabel: Record<Difficulty, string> = {
  classic: 'Classique',
  expert: 'Expert',
};

export const terrainLabel: Record<Terrain, string> = {
  deep_sea: 'Mer profonde',
  sea: 'Mer classique',
  coastal_sea: 'Mer côtière',
  beach: 'Plage',
  plain: 'Plaine',
  mountain: 'Montagne',
};

export const constraintLabel: Record<Constraint, { name: string; effect: string }> = {
  limited_means: { name: 'Moyens limités', effect: 'Budget ramené à 70 points' },
  limited_ammo: { name: 'Stocks de munitions limités', effect: 'Dotations initiales −30 %' },
  degraded_sensors: { name: 'Capteurs dégradés', effect: 'Portée de détection −20 %' },
  bad_weather: { name: 'Météo défavorable', effect: 'Déplacement plafonné à 2 hexagones' },
};

export const briefing: Record<
  MissionKind,
  { context: string; objective: string; victory: string; defeat: string }
> = {
  naval_combat: {
    context: 'Une force navale alliée doit affronter une flotte ennemie dont rien n’est connu.',
    objective: 'Éliminer la flotte ennemie',
    victory: 'Le dernier navire ennemi est détruit.',
    defeat: 'Toutes les unités alliées sont détruites.',
  },
  escort: {
    context: 'Un porte-avions fourni par le scénario doit traverser une zone contestée.',
    objective: 'Protéger le porte-avions jusqu’à l’arrivée',
    victory: 'Le porte-avions atteint l’arrivée en état opérationnel.',
    defeat: 'Le porte-avions ou tous les navires d’escorte sont détruits.',
  },
};

export const blockerLabel: Record<LaunchBlocker, string> = {
  NO_SHIP: 'Sélectionnez au moins un bâtiment.',
  BUDGET_EXCEEDED: 'Le budget est dépassé : retirez des bâtiments.',
};

export const errorMessage = (error: GameError): string => error.message;

/** État d'activation affiché sur les fiches ; le porte-avions n'en a pas (SF-03.6). */
export const activationLabel: Record<Exclude<ActivationStatus, 'not_activable'>, string> = {
  available: 'Disponible',
  in_progress: 'En cours',
  activated: 'Activée',
};
