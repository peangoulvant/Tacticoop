# Matrice de traçabilité — Tacticoop V1

Lien entre les exigences du [Game Design](game-design/README.md) et des [spécifications fonctionnelles](functional-specs/README.md) et le code de `src/`. Document de suivi : il ne définit aucune règle et ne reprend pas le détail des spécifications, qui font autorité.

**État analysé :** `main` au commit `54b7e71` (après la PR #9). Le jour de l'analyse, `npm test` donnait 28 tests réussis sur 5 fichiers et `npm run lint` ne signalait rien.

## Lecture

| Statut | Signification |
|---|---|
| **Implémenté** | Le comportement est dans le code **et** au moins un test le vérifie. |
| **Partiel** | Une partie seulement de l'exigence est codée. Le reste figure dans la colonne « Remarque ». |
| **Non vérifié** | Le code existe, mais aucun test automatisé ne vérifie le comportement (souvent de l'interface). |
| **Non implémenté** | Aucun code ne réalise l'exigence. « (ouvert) » signale une ligne `PROPOSÉ` ou `À DÉFINIR` au GDD : elle n'est pas à implémenter avant arbitrage (voir le [README du GDD](game-design/README.md)). |

- Un test réussi prouve le comportement testé, pas la conformité à la spécification. Un statut « Implémenté » se lit avec sa remarque.
- Les symboles sont cités par leur nom, avec leur fichier. Chemins relatifs à `src/`.
- Les références sont celles des documents. Là où une spécification n'a pas d'identifiant par exigence, la ligne cite le paragraphe (§) et les identifiants du titre de section tels qu'ils sont écrits. Aucun identifiant n'est inféré.
- Les tests d'interface (`App.test.tsx`) ont été supprimés à la demande du relecteur (PR #9). Les comportements d'interface sont donc « Non vérifié » par construction.

## Synthèse

Le code actuel couvre **la préparation de mission (SF-01), la génération de carte (SF-02 §1 à §4) et un affichage tactique statique**. Le moteur n'accepte que les commandes de préparation et de lancement (`GameCommand` dans `engine/core/types.ts`). Il n'existe encore ni activation, ni cycle, ni unité ennemie, ni détection, ni combat, ni IA, ni fin de mission.

## SF-01 — Préparation et lancement

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-01 §1, §2 (Q7–Q10, Q14) | Deux missions V1 : lutte navale et escorte | `MISSIONS`, `MissionKind` (`engine/missions/setup.ts`) ; `selectMission` (`engine/core/executeCommand.ts`) ; `launchMission` (`engine/missions/launch.ts`) | `executeCommand.test.ts` : « en lutte navale… », « en escorte… » | Implémenté | |
| SF-01 §2 | Lutte navale : au moins un bâtiment. Escorte : porte-avions fourni hors budget, au moins un bâtiment d'escorte | `launchBlockers` (`NO_SHIP`) ; `rosterOf` (`launch.ts`) ; `computeBudget` ne compte que `PURCHASABLE_CLASSES` | « refuse de lancer sans bâtiment », « en escorte : ajoute le porte-avions hors budget… » | Implémenté | La règle « au moins un bâtiment » est la même pour les deux missions. Les « catégories autorisées » ne sont pas définies : aucune restriction. |
| SF-01 §2 | Difficulté Classique (défaut) ou Expert | `DIFFICULTIES`, `initialSetup`, `setDifficulty` | « change de mission : garde la difficulté… » | Partiel | Seule la sélection existe, sans effet (pas d'IA). Le défaut « Classique » n'est pas vérifié par un test. |
| SF-01 §2 | Briefing : contexte, objectif, victoire/défaite, renseignement initial, catégories disponibles | `briefing` (`shared/labels.ts`) ; `BriefingStep` (`features/mission-setup/SetupSteps.tsx`) | aucun | Partiel | Les catégories de bâtiments disponibles ne sont pas dans le briefing (elles apparaissent à l'étape « Force navale »). Textes non testés. |
| SF-01 §2 | Changer de mission : garde la difficulté, réinitialise contraintes et force | `selectMission` | « change de mission : garde la difficulté, réinitialise contraintes et force » | Implémenté | « Actualiser… les catégories recommandées » : voir la ligne « recommandé » ci-dessous. |
| SF-01 §3 (Q1–Q3, Q5–Q6, Q13) | Budget normal de 100 points, non modifiable par le joueur | `GameConfig.budget.normal` (`engine/config/gameConfig.ts`) ; `computeBudget` | « ajoute des bâtiments dans la limite du budget de 100 points » | Implémenté | |
| SF-01 §3 | Catalogue et fiches provisoires (coûts, PV, stocks, mouvement, hélicoptères) | `defaultConfig.ships` (`ShipSpec`) | Valeurs vérifiées indirectement (budget, stocks et mouvement après contraintes) | Implémenté | Données en configuration. Pas de test sur chaque fiche (PV et mouvement de la FREMM et de la frégate DA non vérifiés). |
| SF-01 §3 | Plusieurs bâtiments de même catégorie ; budget en plafond | `addShip`, `removeShip`, `withShipCount` | « ajoute des bâtiments dans la limite du budget… », « refuse de retirer un bâtiment absent » | Implémenté | |
| SF-01 §3 | Mentions « recommandé pour cette mission », informatives | — | — | Non implémenté | |
| SF-01 §3 | Budget réduit sous le coût de la force : navires conservés, disponible/engagé/dépassement affichés, lancement bloqué | `setConstraints` (ne retire rien) ; `Budget.overrun` ; `launchBlockers` (`BUDGET_EXCEEDED`) ; affichage : `BudgetBar` | « conserve les navires si « Moyens limités » crée un dépassement, mais bloque le lancement » | Implémenté | Règle testée dans le moteur ; l'affichage (`BudgetBar`, `Recap`) n'est pas testé. |
| SF-01 §4 (Q4, Q11–Q12, Q16–Q22) | Quatre contraintes disponibles dans les deux missions | `CONSTRAINTS`, `Constraint` | « accepte 0 à 2 contraintes distinctes seulement » | Implémenté | |
| SF-01 §4 | 0, 1 ou 2 contraintes distinctes, en manuel ou en aléatoire | `areConstraintsValid`, `drawConstraints`, `setConstraints`, `drawRandomConstraints` | « accepte 0 à 2… », « tire le nombre demandé de contraintes distinctes, de façon reproductible » | Implémenté | `MAX_CONSTRAINTS` est une constante du moteur, hors `GameConfig`. |
| SF-01 §4 | Contraintes dévoilées avant le lancement | `ConstraintsStep`, `Recap` | aucun | Non vérifié | |
| SF-01 §4 | « Moyens limités » : budget de 100 à 70 | `computeBudget` (`limitedMeans`) | Indirect : « conserve les navires… » | Implémenté | |
| SF-01 §4 | « Stocks de munitions limités » : dotations −30 %, arrondi inférieur | `modifiersOf` (`launch.ts`), `createUnit` (`engine/units/unit.ts`) | « applique les contraintes : munitions −30 %… » | Implémenté | |
| SF-01 §4 | « Capteurs dégradés » : portée de détection −20 % | La contrainte existe dans `Constraint`, sans consommateur | — | Partiel | Contrainte choisissable et enregistrée, **sans aucun effet** : aucune portée de détection n'existe. |
| SF-01 §4 | « Météo défavorable » : déplacement plafonné à 2, porte-avions inchangé | `modifiersOf`, `createUnit` (`movementCap`) | « applique les contraintes… » | Implémenté | Le test ne prouve pas l'exemption du porte-avions : son mouvement de base (2) égale le plafond. |
| SF-01 §4–§5 | Choix modifiables avant lancement, verrouillés après | Garde `WRONG_PHASE` dans `executeCommand` | « émet MISSION_LAUNCHED et verrouille la préparation » | Implémenté | |
| SF-01 §5 | Récapitulatif avant confirmation (mission, difficulté, contraintes, force, budget) | `Recap` | aucun | Non vérifié | |
| SF-01 §5 | Lancement autorisé seulement si budget et minimum respectés ; mission lancée sur la carte | `launchBlockers`, `launch` (handler), `launchMission` | « refuse de lancer sans bâtiment », « conserve les navires… », « émet MISSION_LAUNCHED… » | Implémenté | |

## SF-02 — Carte et déplacements

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-02 §1 (SF-02.1, SF-02.2) | Carte hexagonale 35×35 par défaut, paramétrable hors joueur ; (0,0) en haut à gauche | `GameConfig.map` ; `generateTerrain` ; `engine/map/hex.ts` ; `indexOf` (`engine/map/gameMap.ts`) | `generate.test.ts` : « produit les six terrains » (1225 cases) ; `hex.test.ts` | Implémenté | La valeur par défaut de `GameConfig.map` n'est vérifiée par aucun test. L'origine (0,0) n'est pas testée explicitement. |
| SF-02 §1 | Six terrains | `TERRAINS` (`engine/map/terrain.ts`) | « produit les six terrains » | Implémenté | |
| SF-02 §1 | Terrains en ensembles cohérents, non en dispersion indépendante | `generateTerrain` (`smooth`, `assignTerrains`) | Déterminisme seulement | Non vérifié | Aucun test ne mesure la cohérence spatiale. |
| SF-02 §1 | Zoom sans modifier les dimensions de la carte | `useMapView` (`features/tactical-map/useMapView.ts`) ; `zoomAt`, `clampView`, `coverScale` (`viewTransform.ts`) | `viewTransform.test.ts` | Implémenté | Les calculs sont testés ; le câblage molette, glisser et boutons ne l'est pas. |
| SF-02 §2 (SF-02.3, SF-02.9) | Navigabilité par terrain et par catégorie d'unité | `NAVIGABLE`, `isNavigable` | Indirect : `gameMap.test.ts` (plage interdite à la frégate), placements valides dans `executeCommand.test.ts` | Implémenté | La table n'est pas testée directement (par exemple, mer côtière interdite au sous-marin). Les unités ennemies n'existent pas. |
| SF-02 §2 | Une seule unité navale par hexagone, au placement et en déplacement | `placeUnits` (`launch.ts`), `nearestNavigableHex` (`taken`) | « place chaque unité sur une case valide et unique » | Partiel | Placement seulement : aucun déplacement. |
| SF-02 §3 (SF-02.4, SF-02.17, SF-02.18) | Trajet navigable A→B garanti pour le porte-avions | `generateEscortMap`, `carveCorridor`, `shortestPath` | « garantit un trajet navigable A→B… quelle que soit la graine » (30 graines) ; « escorte : A et B sont navigables et reliés » | Implémenté | |
| SF-02 §3 | Itinéraires alternatifs possibles en escorte | — | — | Non implémenté | Rien ne les garantit ni ne les mesure. |
| SF-02 §3 | Tous les terrains visibles dès le lancement | `TerrainLayer` (`features/tactical-map/TacticalMap.tsx`) | aucun | Non vérifié | Aucun ennemi n'existe : la non-divulgation du brouillard n'est pas exercée. |
| SF-02 §3 | Nouvelle carte à chaque partie, inchangée pendant la mission | Graine tirée à chaque lancement (`newSeed`, `Recap`) ; carte dans `MissionState.map`, aucune commande ne la modifie | Déterminisme par graine uniquement | Non vérifié | |
| SF-02 §4 (SF-02.7, SF-02.8) | Alliés placés automatiquement près de leur zone de départ | `launchMission`, `placeUnits`, `generateEscortMap`, `generateNavalCombatMap` | « place chaque unité… », « lutte navale : départ à l'ouest… » | Partiel | Zones de départ du scénario non spécifiées : heuristique provisoire (ouest, milieu de la carte). |
| SF-02 §4 | Placement aléatoire des ennemis | — | — | Non implémenté | |
| SF-02 §5 (SF-02.5, SF-02.6) | Navigation du porte-avions : point de passage, déplacement automatique 0 à 2 | — | — | Non implémenté | |
| SF-02 §6 (SF-02.10 à SF-02.14) | Déplacement : chemin le plus court, destinations accessibles, prévisualisation, confirmation, refus motivé | `shortestPath` (BFS à ordre de voisins fixe) | « ne traverse pas la terre » | Partiel | Seul le calcul de chemin existe. Ni capacité de mouvement, ni occupation, ni commande, ni interface. |
| SF-02 §7 (SF-02.15, SF-02.16) | Obstacle ennemi non détecté | — | — | Non implémenté | |

## SF-03 — Cycles et commandes

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-03.1 à SF-03.5 (§1) | Activations : choix libre, une par cycle, « Terminer l'activation », fin anticipée | — | — | Non implémenté | `Unit` n'a aucun état d'activation ; `GameCommand` ne contient que des commandes de préparation. |
| SF-03.6 (§2) | Fiche par unité : PV, composants, état Disponible / En cours / Activée | `FleetPanel`, `HpBar`, `StockLine` (`features/fleet`) | aucun | Partiel | PV et stocks affichés. États d'activation et composants absents. |
| SF-03.7 (§2) | Sélection sur la carte ou dans la fiche, synchronisée et mise en évidence | `useSelectionStore` ; `onCellClick` (`TacticalMap`) ; `FleetPanel` ; `UnitToken` | aucun | Non vérifié | |
| SF-03.8 (§2) | Seule l'unité en cours d'activation reçoit des ordres | — | — | Non implémenté | Aucune notion d'unité active. |
| SF-03.9 (§3) | Commandes indisponibles visibles mais désactivées, avec motif ; « Terminer l'activation » accessible | `COMMANDS` (`features/commands/UnitPanel.tsx`) | aucun | Partiel | Affichage statique : tous les boutons sont désactivés en dur, avec une info-bulle générique. « Terminer l'activation » n'est pas accessible. |
| SF-03.10 à SF-03.12 (§3) | Validation, confirmation et annulation des actions spéciales | — | — | Non implémenté | |
| SF-03.13 (§4) | Fin de cycle, bilan, cycle suivant automatique | `MissionState.cycle` (figé à 1) | — | Non implémenté | Le numéro de cycle est affiché (`TopBar`) mais ne progresse jamais. |
| SF-03.14, SF-03.15 (§5) | Ordres de navigation du porte-avions, un par cycle | — | — | Non implémenté | |
| SF-03.16 (§4) | Enchaînement automatique sans unité activable | — | — | Non implémenté | |

## SF-04 — Détection et contacts

Les paragraphes de SF-04 n'ont pas d'identifiant par exigence.

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-04 §1 | Visibilité : aucune information ennemie révélée sans renseignement légitime | — | — | Non implémenté | Il n'y a aucun ennemi. L'absence de fuite actuelle n'est pas un filtrage : `FriendObservation` et `HostileObservation` (architecture) n'existent pas. |
| SF-04 §2 | Veille passive (zone contiguë d'au plus 7 hexagones, 60 %, portée 2) | — | — | Non implémenté | Génération des zones : D-07 ouvert. |
| SF-04 §3 | Recherche active (portée 4, 90 %) | — | — | Non implémenté | |
| SF-04 §4 | Expiration et actualisation des contacts | — | — | Non implémenté | |
| SF-04 §5 | Fiche de contact, non-divulgation | — | — | Non implémenté | |

## SF-05 — Combats

Les paragraphes de SF-05 n'ont pas d'identifiant par exigence.

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-05 §1 | Stocks limités de missiles, torpilles et leurres ; engagement | `Unit.missiles`, `Unit.torpedoes` (dotations initiales) | « applique les contraintes… » (stocks après contrainte) | Partiel | Stocks initiaux seulement : ni engagement, ni consommation. Aucun stock de leurres ni de munitions défensives. |
| SF-05 §2, §3 | Projectiles persistants, torpilles et ciblage | — | — | Non implémenté | |
| SF-05 §4 | Leurres et défense active antimissile | — | — | Non implémenté | |
| SF-05 §5 | PV globaux et quatre composants binaires ; réparation | `Unit.hp` initialisé par `ShipSpec.maxHp` (`createUnit`) | aucun | Partiel | PV seulement. Composants, dégâts et réparation absents. |
| SF-05 §6 | Journal de combat et fin de mission (AB-01, AB-02) | — | — | Non implémenté | |
| SF-05 §7, D-05 | Paramètres provisoires missile (portée 8, progression 2, 40 PV, 75 %) et torpille (portée 5, progression 1, 50 PV, 70 %) | — | — | Non implémenté | Absents de `GameConfig`. |
| SF-05 « Précision V1 » | Porte-avions passif, sans action ni défense propre | `defaultConfig.ships.carrier` (sans armement) | aucun | Partiel | Passif par absence de toute action : aucune règle n'est codée. |

## SF-06 — IA ennemie

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-06 §1 à §3, §5 | Décisions et activations de l'IA, brouillard de guerre, restitution | — | — | Non implémenté | Pas de module `engine/ai/`. `Side` contient `'hostile'` mais aucune unité hostile n'est créée. |
| SF-06 §4 | Difficulté Classique ou Expert choisie à la préparation | `Difficulty`, `setDifficulty` | « change de mission… » | Partiel | Sélection et affichage seulement ; aucun effet sur l'IA. |

## SF-07 — Journal et historique

Les paragraphes de SF-07 n'ont pas d'identifiant par exigence.

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-07 §1 | Journal de bord sous le bloc « Force » | `LogbookPanel` (`features/logbook`) ; `TacticalScreen` | aucun | Partiel | Panneau présent, placé sous le panneau de l'unité (colonne de droite). Voir les ambiguïtés. |
| SF-07 §2 | Événements majeurs, synthèse de fin de cycle, ordre chronologique | `GameEvent` (`MISSION_LAUNCHED`) ; `useGameStore.events` | aucun | Partiel | Un seul type d'événement. Pas de synthèse. Catalogue ouvert (D-11). |
| SF-07 §3 | Confidentialité tactique | — | — | Non implémenté | Aucun événement caché n'existe. |
| SF-07 §4 | Consultation de tout l'historique, accès direct à un cycle | `LogbookPanel` (liste complète des événements du store) | aucun | Partiel | Pas de navigation par cycle. |
| SF-07 §5 | Articulation avec le débriefing | — | — | Non implémenté | |

## SF-08 — Fin de mission et débriefing

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-08 §1, §2 | Résultat binaire, conditions terminales, arrivée en B | — | — | Non implémenté | `MissionState` n'a ni issue ni évaluation de victoire ou de défaite. |
| SF-08 §3 à §5 | Écran de fin, bilan opérationnel, débriefing collectif | — | — | Non implémenté | Indicateurs à définir (D-12). |
| SF-08.P4 (§6) | Retour à la préparation d'une nouvelle partie après le débriefing | `TopBar` (bouton « Nouvelle partie ») ; `useGameStore.reset` | aucun | Partiel | Le retour est possible à tout moment, pas seulement après un débriefing qui n'existe pas. |

## Game Design (G-01 à G-13)

Les chapitres G-xx dupliquent en partie les SF. Les lignes renvoient aux sections ci-dessus quand le code est le même.

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| G-01.1 | Wargame naval tactique 2D sur grille hexagonale | `features/tactical-map` (`TacticalMap`, `hexGeometry.ts`) | aucun | Non vérifié | |
| G-01.2 | Carte procédurale et aléatoire | `generateTerrain` | `generate.test.ts` | Implémenté | |
| G-01.3 | Le joueur commande une force | Composition : `addShip` | `executeCommand.test.ts` | Partiel | Composition seulement, aucune commande tactique. |
| G-01.4, G-01.5 | Adversaire IA, activations alternées ; brouillard de guerre | — | — | Non implémenté | |
| G-01.6, G-01.7 | Solo contre l'IA (`PROPOSÉ`) ; difficulté, sauvegardes, rejouabilité (`À DÉFINIR`) | — | — | Non implémenté (ouvert) | |
| G-02.1 à G-02.6 | Conditions de victoire et de défaite | — | — | Non implémenté | Voir SF-08. |
| G-02.7, G-02.8 | Porte-avions immobilisé ; limite de cycles | — | — | Non implémenté (ouvert) | |
| G-03.1.1 à G-03.1.3 | Lutte navale : flotte ennemie inconnue de 2 frégates ou 1 frégate et 1 sous-marin | — | — | Non implémenté | La mission se lance sans aucun ennemi. |
| G-03.1.4 | Force alliée, placement et répartition ennemie | — | — | Non implémenté (ouvert) | |
| G-03.2.1 | Escorter le porte-avions de A à B | `generateEscortMap` ; `rosterOf` | « escorte : A et B sont navigables et reliés » | Partiel | Porte-avions et points A et B placés ; ni navigation, ni objectif évalué. |
| G-03.2.2 à G-03.2.9 | Contrôle hybride, ordres, vitesse, navigation automatique, victoire et défaite | — | — | Non implémenté | Voir SF-02 §5 et SF-03.14. |
| G-03.2.10 à G-03.2.12 | Persistance des ordres, cas limites, forces d'interception | — | — | Non implémenté (ouvert) | |
| G-04.1 | Carte 2D d'hexagones, procédurale | `generateTerrain` | `generate.test.ts` | Implémenté | |
| G-04.2 | Hexagone (0,0) en haut à gauche | `indexOf`, `hexCenter` | aucun | Non vérifié | |
| G-04.3 | Déplacements et contacts référencés par coordonnées dans le journal | `HexCaption`, `UnitPanel` (coordonnées affichées) | aucun | Partiel | Le journal ne contient pas de coordonnées. |
| G-04.4 | Navigabilité par type d'unité | `isNavigable` | Voir SF-02 §2 | Implémenté | |
| G-04.5 | Convention des coordonnées (offset, axial, cube) | `engine/map/hex.ts` : offset, lignes impaires décalées, axial en interne | `hex.test.ts` | Implémenté | Statut `À DÉFINIR` au GDD : convention provisoire du code (GD-06). Voir les ambiguïtés. |
| G-04.6 | 35×35, six terrains, A→B garanti | Voir SF-02 §1 et §3 | Voir SF-02 | Implémenté | Comme pour SF-02 §1, la valeur par défaut 35×35 de `GameConfig.map` n'est pas testée. |
| G-05.1 | Frégates, sous-marins, porte-avions | `ShipClass`, `defaultConfig.ships` | « en escorte : ajoute le porte-avions… » | Implémenté | |
| G-05.2, G-05.4 | Choix de l'ordre d'activation ; un déplacement et une action par activation | — | — | Non implémenté | Voir SF-03. |
| G-05.3 | Capacité de déplacement propre à chaque unité | `ShipSpec.movement`, `Unit.movement` | « applique les contraintes… » | Partiel | Valeur de mouvement seulement, aucun déplacement. |
| G-05.5 | Caractéristiques configurables (`PROPOSÉ`) | `ShipSpec` | — | Partiel (ouvert) | Mouvement, armement et PV seulement ; ni capteurs ni composants. |
| G-05.6 | Valeurs par classe, composants, munitions (`À DÉFINIR`) | Valeurs provisoires de D-03 dans `defaultConfig.ships` | Indirect | Partiel (ouvert) | Composants absents. |
| G-05.7 | Quatre contraintes, sans retrait automatique | Voir SF-01 §4 | Voir SF-01 | Partiel | « Capteurs dégradés » sans effet. |
| G-06.2.1 à G-06.2.6 | Activation alliée | — | — | Non implémenté | |
| G-06.3.1, G-06.3.2 | Réaction ennemie sans contre-réaction | — | — | Non implémenté | |
| G-06.3.3, G-06.3.4, G-06.4.5, G-06.5.6 | Règles `PROPOSÉ` : renseignements de l'IA, réaction passée, une activation ennemie par cycle, quota d'ordre | — | — | Non implémenté (ouvert) | |
| G-06.4.1 à G-06.4.4 | Fin anticipée | — | — | Non implémenté | |
| G-06.5.1 à G-06.5.5 | Ordre de navigation, navigation automatique | — | — | Non implémenté | |
| G-07.1 à G-07.3 | Activation (un déplacement, une action) ; actions envisagées ; recherche active | — | — | Non implémenté | |
| G-07.4 à G-07.6 | Préconditions, catalogue, effets d'échec | — | — | Non implémenté (ouvert) | |
| G-08.1.1 à G-08.1.4 | Détection hybride, brouillard, tirage probabiliste, paramétrage par type | — | — | Non implémenté | |
| G-08.1.5 | Mêmes principes pour les deux camps (`PROPOSÉ`) | — | — | Non implémenté (ouvert) | |
| G-08.2.1 à G-08.2.6 | Veille passive, zone d'au plus 7 hexagones | — | — | Non implémenté | |
| G-08.3.1 à G-08.3.3 | Recherche active | — | — | Non implémenté | |
| G-08.3.4, G-08.3.5 | Position non actualisée ; discrétion (`PROPOSÉ`, `À DÉFINIR`) | — | — | Non implémenté (ouvert) | |
| G-08.6.1 à G-08.6.5 | Expiration des contacts | — | — | Non implémenté | |
| G-08.6.6 | Information ancienne marquée (`PROPOSÉ`) | — | — | Non implémenté (ouvert) | |
| G-08 §« Probabilités et portées initiales », §« Construction d'une zone passive », §« États affichés » | Sections sans identifiant | — | — | Non implémenté | |
| G-09 §2 à §4 (« G-09.1 à G-09.6 », « G-09.5 / G-09.7 », « G-09.8 ») | Armes, projectiles, dégâts, composants, leurres | — | — | Non implémenté | Sous-sections sans identifiant. |
| G-09.9.1 à G-09.9.12 | Défense active antimissile | — | — | Non implémenté | |
| G-09.10.1 à G-09.10.4 | Ordonnancement des engagements | — | — | Non implémenté | |
| G-09-C1 à G-09-C4 | Contrôles de cohérence | — | — | Non implémenté | |
| G-10.1 à G-10.8, G-10.10 | IA ennemie | — | — | Non implémenté | |
| G-10.9 | Difficulté sélectionnée avant la partie | `Difficulty`, `setDifficulty` | « change de mission… » | Partiel | Sélection seulement. |
| G-11.1, G-11.6 | Catalogue commun de quatre contraintes, disponibles dans les deux missions | `CONSTRAINTS` | « accepte 0 à 2… » | Implémenté | |
| G-11.2 | 0, 1 ou 2 contraintes, choisies ou tirées | `areConstraintsValid`, `drawConstraints` | « accepte 0 à 2… », « tire le nombre demandé… » | Implémenté | Borne « paramétrable » : `MAX_CONSTRAINTS` n'est pas dans `GameConfig`. |
| G-11.3 | « Moyens limités » : budget à 70 | `computeBudget` | « conserve les navires… » | Implémenté | |
| G-11.4 | « Stocks de munitions limités » : −30 % | `createUnit` | « applique les contraintes… » | Implémenté | |
| G-11.5 | « Capteurs dégradés » et « Météo défavorable » | `createUnit` (météo) | « applique les contraintes… » | Partiel | Capteurs sans effet. |
| G-11.7 | Cumul, paires distinctes compatibles | `areConstraintsValid` | « accepte 0 à 2… » | Implémenté | |
| G-11.8 | Contraintes et conséquences connues avant la mission | `ConstraintsStep`, `Recap` | aucun | Non vérifié | Le récapitulatif liste les noms des contraintes, pas leurs effets (affichés à l'étape 3). |
| G-11.9 | Contraintes indépendantes de la difficulté ; évaluation globale | — | — | Non implémenté | Aucun calcul défini. |
| G-12.1 à G-12.9, G-12.10 | Journal de bord : événements, brouillard, présentation, synthèses, historique | `LogbookPanel`, `GameEvent` | aucun | Partiel | Un seul événement. Voir SF-07. |
| G-13.1 Q1 à Q5, G-13.2 Q1, Q2 | Déclenchement de fin, résultat binaire | — | — | Non implémenté | |
| G-13.3 à G-13.9, C1 à C4 | Bilan, évaluation, réutilisation | — | — | Non implémenté | |

## Décisions acquises (registres `DECISIONS.md`)

| Référence | Règle (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| D-03 (SF) | Catalogue provisoire : coûts, PV, mouvement, dotations, hélicoptères | `defaultConfig.ships` | Indirect | Implémenté | Spécialisations de défense non chiffrées. Hélicoptère « un seul utilisable à la fois » non codé. |
| D-04 (SF) | Porte-avions passif | `defaultConfig.ships.carrier` | — | Partiel | Voir SF-05. |
| D-01, D-02, D-05, D-06 (SF) | Progression des projectiles, paramètres d'armes, panne de propulsion | — | — | Non implémenté | |
| AB-01 à AB-03 | Fin de mission, arrivée en B, projectiles en vol | — | — | Non implémenté | |
| SF-01 (registre GD) | Quatre contraintes, budget 70, 0 à 2 distinctes | Voir SF-01 §4 | Voir SF-01 | Partiel | « Capteurs dégradés » sans effet. |
| SF-02 (registre GD) | Carte 35×35, six terrains, A→B garanti | Voir SF-02 §1 à §3 | Voir SF-02 | Implémenté | |
| SF-03 (registre GD) | Activation, navigation du porte-avions | — | — | Non implémenté | |

## Ambiguïtés et points d'attention

1. **Granularité des identifiants.** SF-04 à SF-08 n'ont pas d'identifiant par exigence (sauf `SF-08.P4`). SF-01 n'a que des Q-numéros dans sa table de traçabilité. SF-02 groupe ses identifiants dans les titres de section, sans correspondance puce par puce. G-09 §2 à §4 n'a que des plages. Les lignes sont donc au niveau du paragraphe.
2. **Emplacement du journal.** SF-07 §1 et G-12.1 placent le journal « sous le bloc « Force » ». Dans la maquette et dans le code actuel, le journal est sous le panneau de l'unité, à droite, à côté des « Forces alliées ». Selon que « Force » désigne les forces alliées ou le panneau d'unité, le code est conforme ou non. SF-07 renvoie aussi à `docs/game-design/JOURNAL.md`, qui n'existe plus (historique Git seulement).
3. **Convention de coordonnées.** G-04.5 et GD-06 sont ouverts, mais le code a choisi une convention (offset, lignes impaires décalées, axial en interne). Elle est marquée « Implémenté » parce qu'elle est testée, pas parce qu'elle est arbitrée.
4. **Lutte navale sans ennemi.** G-03.1.2 et G-03.1.3 définissent la flotte ennemie. Le moteur lance la mission sans adversaire, car la composition et les zones de départ ne sont pas arbitrées.
5. **« Capteurs dégradés ».** SF-01 §4 définit un effet (−20 %) sur une portée de détection qui n'existe pas encore. La contrainte est sélectionnable sans conséquence.
6. **Exemption du porte-avions (météo).** Le test ne distingue pas l'exemption d'un mouvement déjà égal au plafond.
7. **Paramètres de contraintes.** G-11.2 parle d'une borne « paramétrable », alors que `MAX_CONSTRAINTS` est une constante hors `GameConfig`.
8. **SF-08.P4.** Le bouton « Nouvelle partie » est accessible pendant la mission, alors que la spécification le prévoit après le débriefing.
9. **Statuts `PROPOSÉ` et `À DÉFINIR`.** Leur code n'est pas attendu (README du GDD). Ils sont signalés « (ouvert) » pour ne pas les compter comme des manques.
