import * as engine from '../engine';

/*****************************
 *
 * PARTIE MISSIONS ET PRÉPARATION
 *
 *****************************/

/** Textes d'interface en français ; les identifiants du moteur restent en anglais. */
export const missionLabel: Record<engine.MissionKind, string> = {
  naval_combat: 'Lutte navale',
  escort: 'Escorte de porte-avions',
};

export const difficultyLabel: Record<engine.Difficulty, string> = {
  classic: 'Classique',
  expert: 'Expert',
};

export const terrainLabel: Record<engine.Terrain, string> = {
  deep_sea: 'Mer profonde',
  sea: 'Mer classique',
  coastal_sea: 'Mer côtière',
  beach: 'Plage',
  plain: 'Plaine',
  mountain: 'Montagne',
};

export const constraintLabel: Record<engine.Constraint, { name: string; effect: string }> = {
  limited_means: { name: 'Moyens limités', effect: 'Budget ramené à 70 points' },
  limited_ammo: { name: 'Stocks de munitions limités', effect: 'Dotations initiales −30 %' },
  degraded_sensors: { name: 'Capteurs dégradés', effect: 'Portée de détection −20 %' },
  bad_weather: { name: 'Météo défavorable', effect: 'Déplacement plafonné à 2 hexagones' },
};

export const briefing: Record<
  engine.MissionKind,
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

export function errorMessage(error: engine.GameError): string {
  return error.message;
}

/*****************************
 *
 * PARTIE PORTE-AVIONS
 *
 *****************************/

/** Nom de chaque ordre de navigation du porte-avions (G-03.2.3). */
export const carrierOrderLabel: Record<engine.CarrierOrderKind, string> = {
  [engine.CarrierOrderKind.CONTINUE]: 'Poursuivre',
  [engine.CarrierOrderKind.STOP]: 'Stopper',
  [engine.CarrierOrderKind.REROUTE]: 'Modifier l’itinéraire',
};

/** Ce que fait le porte-avions en fin de cycle, affiché sur sa fiche (SF-03.15). */
export const carrierModeLabel: Record<engine.CarrierMode, string> = {
  [engine.CarrierOrderKind.CONTINUE]: 'Poursuit sa route vers B',
  [engine.CarrierOrderKind.STOP]: 'À l’arrêt',
};

/** Textes de l'interface de navigation du porte-avions (SF-03 §5). */
export const carrierText = {
  title: 'Navigation',
  quotaFree: 'Un ordre peut être donné ce cycle.',
  quotaUsed: 'Ordre de navigation déjà donné ce cycle.',
  chooseWaypoint: 'Choisissez un point de passage sur la carte.',
  confirm: 'Confirmer',
  cancel: 'Annuler',
  finalOrder:
    'Toutes les activations sont terminées : donnez un ordre de navigation du porte-avions ou clôturez le cycle.',
  giveOrder: 'Donner un ordre',
  closeCycle: 'Clôturer le cycle',
  endCycleDuringFinalOrder:
    'Utilisez « Clôturer le cycle » : plus aucune activation n’est possible.',
  victoryTitle: 'Mission réussie',
  victoryText: 'Le porte-avions est arrivé à destination.',
  defeatTitle: 'Mission perdue',
  newGame: 'Nouvelle partie',
};

/** Point de passage actif du porte-avions, ou mention de son absence. */
export function carrierWaypointLabel(waypoint: engine.Hex | null): string {
  return waypoint
    ? `Point de passage : (${waypoint.col}, ${waypoint.row})`
    : 'Aucun point de passage';
}

/** Consigne de la barre de confirmation d'un ordre de navigation en préparation. */
export function carrierDraftLabel(
  kind: engine.CarrierOrderKind,
  waypoint: engine.Hex | null,
  refusal: engine.WaypointRefusal | null,
): string {
  if (refusal) return engine.WAYPOINT_REFUSAL_MESSAGES[refusal];
  if (kind === engine.CarrierOrderKind.REROUTE && !waypoint) return carrierText.chooseWaypoint;
  return `Ordre « ${carrierOrderLabel[kind]} » : confirmez pour l’exécuter.`;
}

/** Message neutre d'un déplacement interrompu par un obstacle inconnu : l'obstacle n'est pas révélé (SF-02 §7). */
export const interruptedMoveText = 'Déplacement interrompu';

/*****************************
 *
 * PARTIE CONTACTS
 *
 *****************************/

/** Coordonnées d'une liste d'hexagones, dans l'ordre reçu, au format du journal. */
function coordinatesLabel(hexes: readonly engine.Hex[]): string {
  return hexes.map((hex) => `(${hex.col}, ${hex.row})`).join(' ');
}

/**
 * Texte du journal pour un contact de veille (AB-21) : « contact suspect » et « zone
 * approximative », toutes les cases citées, sans jamais désigner la cible.
 */
export function contactEventLabel(
  event: Extract<engine.GameEvent, { type: 'CONTACT_DETECTED' }>,
): string {
  return `Veille : contact suspect ${event.contactId}, zone approximative ${coordinatesLabel(event.zone)}`;
}

/** Type de navire révélé par un balayage : frégate ou sous-marin, jamais la classe (AB-25). */
export const contactTargetLabel: Record<engine.ContactTargetType, string> = {
  frigate: 'frégate',
  submarine: 'sous-marin',
  carrier: 'porte-avions',
};

/** Badge d'un contact identifié : « F » ou « SM », jamais une silhouette de classe (AB-30). */
export const contactBadgeLabel: Record<engine.ContactTargetType, string> = {
  frigate: 'F',
  submarine: 'SM',
  carrier: 'PA',
};

/** Légende d'une case appartenant à un contact : zone suspecte (AB-23) ou navire identifié (AB-30). */
export function contactCaption(contact: engine.ObservedContact): string {
  if (contact.kind === 'suspect') {
    return `Contact suspect ${contact.id} (zone approximative de ${contact.zone.length} hexagones, détecté au cycle ${contact.cycle})`;
  }
  const { col, row } = contact.position;
  const old = contact.stale ? ' (ancien)' : '';
  return `Contact identifié ${contact.id} : ${contactTargetLabel[contact.targetType]}, position exacte (${col}, ${row}), détecté au cycle ${contact.cycle}${old}`;
}

/** Navires identifiés par un balayage, au format du journal : « C-5, sous-marin en (14, 22) ». */
function identificationsLabel(identified: readonly engine.Identification[]): string {
  return identified
    .map(
      (item) =>
        `${item.contactId}, ${contactTargetLabel[item.targetType]} en (${item.position.col}, ${item.position.row})`,
    )
    .join(' ; ');
}

/**
 * Texte du journal pour un balayage (AB-28) : toujours une entrée, réussie ou non. Les
 * mots sont les mêmes pour une première identification et une actualisation ; ni cible réelle ni
 * zone retirée.
 */
export function sweepEventLabel(
  event: Extract<engine.GameEvent, { type: 'SWEEP_PERFORMED' }>,
): string {
  const unit = engine.defaultConfig.ships[event.shipClass].label;
  const { identified } = event;
  if (identified.length === 0) return `Balayage (${unit}) : aucun nouveau contact`;
  const noun = identified.length > 1 ? 'contacts identifiés' : 'contact identifié';
  return `Balayage (${unit}) : ${noun} ${identificationsLabel(identified)}`;
}

/*****************************
 *
 * PARTIE BALAYAGE
 *
 *****************************/

/** Textes de l'action « Balayage » (AB-30). */
export const sweepText = {
  button: 'Balayage',
  title: 'Cherche les navires hostiles à portée',
  confirm: 'Confirmer',
  cancel: 'Annuler',
  unavailable: 'Balayage indisponible',
  noNewContact: 'Aucun nouveau contact',
  identified: 'Contact identifié',
  identifiedSeveral: 'Contacts identifiés',
};

/** Consigne de la barre de confirmation d'un balayage en préparation. */
export function sweepDraftLabel(unitLabel: string, range: number, cells: number): string {
  const plural = range > 1 ? 's' : '';
  return `${unitLabel} : balayage, portée ${range} hexagone${plural} (${cells} cases surlignées). Confirmez pour le lancer.`;
}

/** Info-bulle du bouton pendant la récupération du balayage : le cycle où il redevient possible (AB-34). */
export function sweepCooldownLabel(availableFrom: number): string {
  return `${sweepText.unavailable} : en récupération, de nouveau possible au cycle ${availableFrom}.`;
}

/** Retour explicite d'un balayage, affiché 4 secondes : identification ou absence de résultat. */
export function sweepResultLabel(identified: number): string {
  if (identified === 0) return sweepText.noNewContact;
  return identified > 1 ? sweepText.identifiedSeveral : sweepText.identified;
}

/*****************************
 *
 * PARTIE UNITÉS
 *
 *****************************/

/** État d'activation affiché sur les fiches ; le porte-avions n'en a pas (SF-03.6). */
export const activationLabel: Record<Exclude<engine.ActivationStatus, 'not_activable'>, string> = {
  available: 'Disponible',
  in_progress: 'En cours',
  activated: 'Activée',
};

/*****************************
 *
 * PARTIE SAUVEGARDE
 *
 *****************************/

/** Sauvegarde automatique et reprise de la partie en cours (AB-08). */
export const saveText = {
  resumeTitle: 'Une partie est en cours',
  resume: 'Reprendre la partie en cours',
  newGame: 'Nouvelle partie',
  savedAt: (time: string) => `Sauvegardée à ${time}`,
  writeFailed: 'Sauvegarde impossible : la partie continue mais ne sera pas conservée',
};

/** Description de la partie sauvegardée : mission, cycle, date et heure locales. */
export function savedGameSummary(
  mission: engine.MissionKind,
  cycle: number,
  savedAt: Date,
): string {
  const date = savedAt.toLocaleDateString('fr-FR');
  return `${missionLabel[mission]} — cycle ${cycle} — ${date} à ${savedTime(savedAt)}`;
}

/** Heure locale au format HH:MM. */
export function savedTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/*****************************
 *
 * PARTIE JOURNAL DE BORD
 *
 *****************************/

/** Un événement du moteur d'un type donné. */
type EventOf<T extends engine.GameEvent['type']> = Extract<engine.GameEvent, { type: T }>;

/** Nom d'une classe de bâtiment, tel qu'affiché au joueur (« Frégate DA »). */
function shipLabelOf(shipClass: engine.ShipClass): string {
  return engine.defaultConfig.ships[shipClass].label;
}

/** Coordonnées d'une case au format du journal : « (3, 7) ». */
function hexLabel(hex: engine.Hex): string {
  return `(${hex.col}, ${hex.row})`;
}

/**
 * Texte du journal de chaque type d'événement (catalogue provisoire, D-11). Le type `Record`
 * oblige à décrire **tous** les événements : ajouter un `GameEvent` sans son texte ne compile pas.
 * Les textes ne révèlent jamais d'information cachée (SF-07 §3).
 *
 * Exemple : `UNIT_MOVED` de (2, 4) à (3, 4) pour une FREMM s'affiche
 * « FREMM multimission : déplacement de (2, 4) vers (3, 4) ».
 */
const eventDescribers: { [T in engine.GameEvent['type']]: (event: EventOf<T>) => string } = {
  MISSION_LAUNCHED: (event) => `Mission lancée : ${missionLabel[event.mission]}`,
  UNIT_MOVED: (event) =>
    event.interrupted
      ? `${shipLabelOf(event.shipClass)} : ${interruptedMoveText} (de ${hexLabel(event.from)} à ${hexLabel(event.to)})`
      : `${shipLabelOf(event.shipClass)} : déplacement de ${hexLabel(event.from)} vers ${hexLabel(event.to)}`,
  CYCLE_STARTED: (event) => `Cycle ${event.cycle} ouvert`,
  CARRIER_ORDERED: (event) => `Porte-avions : ordre « ${carrierOrderLabel[event.order.kind]} »`,
  CARRIER_MOVED: (event) =>
    `Porte-avions : navigation de ${hexLabel(event.from)} vers ${hexLabel(event.to)}`,
  CONTACT_DETECTED: contactEventLabel,
  SWEEP_PERFORMED: sweepEventLabel,
  SHOT_FIRED: shotFiredLabel,
  PROJECTILE_DETECTED: (event) =>
    `Projectile détecté : ${weaponLabel[event.weapon]} en ${hexLabel(event.position)}`,
  PROJECTILE_IMPACT: impactLabel,
  PROJECTILE_NEUTRALISED: (event) => `Un ${weaponLabel[event.weapon]} est neutralisé`,
  MISSION_WON: (event) => `Mission réussie : ${victoryCauseLabel[event.cause]}`,
  MISSION_LOST: (event) => `Mission perdue : ${defeatCauseLabel[event.cause]}`,
};

/*****************************
 *
 * PARTIE COMBAT : tirs, projectiles, résultat de mission
 *
 *****************************/

/** Arme tirée, au masculin ou au féminin selon l'usage du journal. */
const weaponLabel: Record<engine.WeaponKind, string> = {
  missile: 'missile',
  torpedo: 'torpille',
};

/** Cause d'une victoire, affichée avec le résultat (G-13.2 Q2). */
export const victoryCauseLabel: Record<engine.VictoryCause, string> = {
  carrier_arrived: 'Le porte-avions est arrivé à destination.',
  hostile_fleet_destroyed: 'La flotte ennemie est détruite.',
};

/** Cause d'une défaite, affichée avec le résultat (G-13.2 Q2). */
export const defeatCauseLabel: Record<engine.DefeatCause, string> = {
  all_units_destroyed: 'Toutes vos unités sont détruites.',
  carrier_destroyed: 'Le porte-avions est détruit.',
  all_escorts_destroyed: 'Tous les navires d’escorte sont détruits.',
};

/** Cause du résultat d'une mission terminée, telle qu'affichée sur le bandeau (G-13.2 Q2). */
export function resultCauseText(mission: engine.MissionState): string {
  const cause = mission.outcomeCause;
  if (!cause) return '';
  return mission.outcome === 'victory'
    ? victoryCauseLabel[cause as engine.VictoryCause]
    : defeatCauseLabel[cause as engine.DefeatCause];
}

/** Tir du camp ami : « Frégate DA : tir de torpille sur le contact C-2, zone en (4, 3) ». */
function shotFiredLabel(event: EventOf<'SHOT_FIRED'>): string {
  const zone = event.hex ? `, hexagone choisi ${hexLabel(event.hex)}` : '';
  return `${shipLabelOf(event.shipClass)} : tir de ${weaponLabel[event.weapon]} sur le contact ${event.contactId}${zone}`;
}

/** Impact : l'unité alliée visée avec l'arme, ou un navire hostile sans autre détail (AB-49). */
function impactLabel(event: EventOf<'PROJECTILE_IMPACT'>): string {
  const weapon = weaponLabel[event.weapon];
  if (event.victim.side === 'hostile') {
    return `Un navire hostile est ${event.result === 'destroyed' ? 'détruit' : 'touché'} (${weapon})`;
  }
  const ship = shipLabelOf(event.victim.shipClass);
  if (event.result === 'missed') return `${ship} : un tir de ${weapon} a échoué`;
  return `${ship} : impact de ${weapon}${event.result === 'destroyed' ? ', navire détruit' : ''}`;
}

/** Texte du journal pour n'importe quel événement du moteur. */
export function eventLabel(event: engine.GameEvent): string {
  // TypeScript ne relie pas le type de l'événement à son descripteur : le lien est garanti par le
  // type de `eventDescribers`, qui impose un descripteur pour chaque type d'événement.
  const describe = eventDescribers[event.type] as (event: engine.GameEvent) => string;
  return describe(event);
}
