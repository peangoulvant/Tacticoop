# Matrice de traçabilité — Tacticoop V1

Lien entre les exigences du [Game Design](game-design/README.md) et des [spécifications fonctionnelles](functional-specs/README.md) et le code de `src/`. Document de suivi : il ne définit aucune règle et ne reprend pas le détail des spécifications, qui font autorité.

**État analysé :** `main` au commit `cd1f0f3` (après la PR #19), avec la PR du moteur de navigation du porte-avions. `npm test` donne 102 tests réussis sur 12 fichiers, `npm run lint` et `npm run build` ne signalent rien.

## Lecture

| Statut | Signification |
|---|---|
| **Implémenté** | Le comportement est dans le code **et** au moins un test le vérifie. |
| **Partiel** | Une partie seulement de l'exigence est codée. Le reste figure dans la colonne « Remarque ». |
| **Non vérifié** | Le code existe, mais aucun test automatisé ne vérifie le comportement (souvent de l'interface). |
| **Non implémenté** | Aucun code ne réalise l'exigence. « (ouvert) » signale une ligne `PROPOSÉ` ou `À DÉFINIR` au GDD : elle n'est pas à implémenter avant arbitrage (voir le [README du GDD](game-design/README.md)). |

- **Code :** `fichier` → `symbole`. Chemins relatifs à `src/`.
- **Tests :** nom du fichier de test. Quand un test ne couvre l'exigence qu'indirectement, la colonne « Remarque » le dit.
- Un test réussi prouve le comportement testé, pas la conformité à la spécification. Un statut « Implémenté » se lit avec sa remarque.
- Les références sont celles des documents. Là où une spécification n'a pas d'identifiant par exigence, la ligne cite le paragraphe (§) et les identifiants du titre de section tels qu'ils sont écrits. Aucun identifiant n'est inféré.
- Les tests d'interface (`App.test.tsx`) ont été supprimés à la demande du relecteur (PR #9). Les comportements d'interface sont donc « Non vérifié » par construction.

## Synthèse

Le code actuel couvre **la préparation de mission (SF-01), la génération de carte, le déplacement des unités alliées, leurs activations et l'enchaînement des cycles (SF-02 §1 à §6, SF-03.1 à SF-03.8)**, avec l'interface correspondante. Le moteur couvre aussi **la navigation du porte-avions et la victoire à l'arrivée en B** (ordres, quota, dernière occasion d'ordre, déplacement automatique), **sans interface** pour l'instant. Le moteur n'accepte que les commandes de préparation, de lancement, de déplacement, d'activation et de navigation (`GameCommand`). Il n'existe encore ni unité ennemie, ni détection, ni combat, ni IA, ni action spéciale, ni défaite, ni écran de fin de mission.

## SF-01 — Préparation et lancement

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-01 §1, §2 (Q7–Q10, Q14) | Deux missions V1 : lutte navale et escorte | `engine/missions/setup.ts` → `MISSIONS`<br>`engine/core/preparationCommands.ts` → `selectMission()`<br>`engine/missions/launch.ts` → `launchMission()` | `executeCommand.test.ts` | Implémenté | |
| SF-01 §2 | Lutte navale : au moins un bâtiment. Escorte : porte-avions fourni hors budget, au moins un bâtiment d'escorte | `engine/missions/setup.ts` → `launchBlockers()`, `computeBudget()`<br>`engine/missions/launch.ts` → `rosterOf()` | `executeCommand.test.ts` | Implémenté | La règle « au moins un bâtiment » est la même pour les deux missions. Les « catégories autorisées » ne sont pas définies : aucune restriction. |
| SF-01 §2 | Difficulté Classique (défaut) ou Expert | `engine/missions/setup.ts` → `DIFFICULTIES`, `initialSetup()`<br>`engine/core/preparationCommands.ts` → `setDifficulty()` | `executeCommand.test.ts`, `setup.test.ts` | Partiel | Seule la sélection existe, sans effet (pas d'IA). Le défaut « Classique » est testé. |
| SF-01 §2 | Briefing : contexte, objectif, victoire/défaite, renseignement initial, catégories disponibles | `shared/labels.ts` → `briefing`<br>`features/mission-setup/components/SetupSteps.tsx` → `BriefingStep()` | — | Partiel | Les catégories de bâtiments disponibles ne sont pas dans le briefing (elles apparaissent à l'étape « Force navale »). Textes non testés. |
| SF-01 §2 | Changer de mission : garde la difficulté, réinitialise contraintes et force | `engine/core/preparationCommands.ts` → `selectMission()` | `executeCommand.test.ts` | Implémenté | « Actualiser… les catégories recommandées » : voir la ligne « recommandé » ci-dessous. |
| SF-01 §3 (Q1–Q3, Q5–Q6, Q13) | Budget normal de 100 points, non modifiable par le joueur | `engine/config/gameConfig.ts` → `defaultConfig.budget`<br>`engine/missions/setup.ts` → `computeBudget()` | `executeCommand.test.ts`, `gameConfig.test.ts` | Implémenté | |
| SF-01 §3 | Catalogue et fiches provisoires (coûts, PV, stocks, mouvement, hélicoptères) | `engine/config/gameConfig.ts` → `defaultConfig.ships` | `gameConfig.test.ts`, `executeCommand.test.ts` | Implémenté | Les cinq fiches (coût, PV, mouvement, dotations, hélicoptères) sont vérifiées. Valeurs provisoires. |
| SF-01 §3 | Plusieurs bâtiments de même catégorie ; budget en plafond | `engine/core/preparationCommands.ts` → `addShip()`, `removeShip()` | `executeCommand.test.ts` | Implémenté | |
| SF-01 §3 | Mentions « recommandé pour cette mission », informatives | — | — | Non implémenté | |
| SF-01 §3 | Budget réduit sous le coût de la force : navires conservés, disponible/engagé/dépassement affichés, lancement bloqué | `engine/core/preparationCommands.ts` → `setConstraints()`<br>`engine/missions/setup.ts` → `computeBudget()`, `launchBlockers()`<br>`features/mission-setup/components/BudgetBar.tsx` → `BudgetBar()` | `executeCommand.test.ts` | Implémenté | Règle testée dans le moteur ; l'affichage (`BudgetBar`, `Recap`) n'est pas testé. |
| SF-01 §4 (Q4, Q11–Q12, Q16–Q22) | Quatre contraintes disponibles dans les deux missions | `engine/missions/setup.ts` → `CONSTRAINTS` | `executeCommand.test.ts` | Implémenté | |
| SF-01 §4 | 0, 1 ou 2 contraintes distinctes, en manuel ou en aléatoire | `engine/missions/setup.ts` → `areConstraintsValid()`, `drawConstraints()`<br>`engine/core/preparationCommands.ts` → `setConstraints()`, `drawRandomConstraints()`<br>`engine/config/gameConfig.ts` → `defaultConfig.constraints.maxCount` | `executeCommand.test.ts`, `setup.test.ts`, `gameConfig.test.ts` | Implémenté | La borne maximale est paramétrable dans `GameConfig`. |
| SF-01 §4 | Contraintes dévoilées avant le lancement | `features/mission-setup/components/SetupSteps.tsx` → `ConstraintsStep()`<br>`features/mission-setup/components/Recap.tsx` → `Recap()` | — | Non vérifié | |
| SF-01 §4 | « Moyens limités » : budget de 100 à 70 | `engine/missions/setup.ts` → `computeBudget()` | `executeCommand.test.ts` | Implémenté | Test indirect (dépassement de budget). |
| SF-01 §4 | « Stocks de munitions limités » : dotations −30 %, arrondi inférieur | `engine/missions/launch.ts` → `modifiersOf()`<br>`engine/units/unit.ts` → `createUnit()` | `executeCommand.test.ts`, `unit.test.ts` | Implémenté | |
| SF-01 §4 | « Capteurs dégradés » : portée de détection −20 % | `engine/missions/setup.ts` → `Constraint` | — | Partiel | Contrainte choisissable et enregistrée, **sans aucun effet** : aucune portée de détection n'existe. |
| SF-01 §4 | « Météo défavorable » : déplacement plafonné à 2, porte-avions inchangé | `engine/missions/launch.ts` → `modifiersOf()`<br>`engine/units/unit.ts` → `createUnit()` | `executeCommand.test.ts`, `unit.test.ts` | Implémenté | L'exemption du porte-avions est testée avec un mouvement de base supérieur au plafond. |
| SF-01 §4–§5 | Choix modifiables avant lancement, verrouillés après | `engine/core/executeCommand.ts` → `executeCommand()` (garde `WRONG_PHASE`) | `executeCommand.test.ts` | Implémenté | |
| SF-01 §5 | Récapitulatif avant confirmation (mission, difficulté, contraintes, force, budget) | `features/mission-setup/components/Recap.tsx` → `Recap()` | — | Non vérifié | |
| SF-01 §5 | Lancement autorisé seulement si budget et minimum respectés ; mission lancée sur la carte | `engine/missions/setup.ts` → `launchBlockers()`<br>`engine/core/preparationCommands.ts` → `launch()`<br>`engine/missions/launch.ts` → `launchMission()` | `executeCommand.test.ts` | Implémenté | |

## SF-02 — Carte et déplacements

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-02 §1 (SF-02.1, SF-02.2) | Carte hexagonale 35×35 par défaut, paramétrable hors joueur ; (0,0) en haut à gauche | `engine/config/gameConfig.ts` → `defaultConfig.map`<br>`engine/map/generate.ts` → `generateTerrain()`<br>`engine/map/gameMap.ts` → `indexOf()` | `generate.test.ts`, `hex.test.ts`, `gameConfig.test.ts` | Implémenté | L'origine (0,0) n'est pas testée explicitement. |
| SF-02 §1 | Six terrains | `engine/map/terrain.ts` → `TERRAINS` | `generate.test.ts` | Implémenté | |
| SF-02 §1 | Terrains en ensembles cohérents, non en dispersion indépendante | `engine/map/generate.ts` → `generateTerrain()`, `smooth()`, `assignTerrains()` | `generate.test.ts` | Non vérifié | Le test ne vérifie que le déterminisme et la présence des six terrains, pas la cohérence spatiale. |
| SF-02 §1 | Zoom sans modifier les dimensions de la carte | `features/tactical-map/services/useMapView.ts` → `useMapView()`<br>`features/tactical-map/services/viewTransform.ts` → `zoomAt()`, `clampView()`, `coverScale()` | `viewTransform.test.ts` | Implémenté | Les calculs sont testés ; le câblage molette, glisser et boutons ne l'est pas. |
| SF-02 §2 (SF-02.3, SF-02.9) | Navigabilité par terrain et par catégorie d'unité | `engine/map/terrain.ts` → `isNavigable()`, `NAVIGABLE` | `gameMap.test.ts`, `executeCommand.test.ts` | Implémenté | Tests indirects (plage interdite à la frégate, unités placées sur des cases valides). La table n'est pas testée directement, par exemple mer côtière interdite au sous-marin. Les unités ennemies n'existent pas. |
| SF-02 §2 | Une seule unité navale par hexagone, au placement et en déplacement | `engine/missions/launch.ts` → `placeUnits()`<br>`engine/map/gameMap.ts` → `nearestNavigableHex()`<br>`engine/units/movement.ts` → `planMove()`, `reachableHexes()` | `executeCommand.test.ts`, `gameMap.test.ts`, `movement.test.ts` | Implémenté | Une case occupée est infranchissable (hypothèse validée). |
| SF-02 §3 (SF-02.4, SF-02.17, SF-02.18) | Trajet navigable A→B garanti pour le porte-avions | `engine/map/generate.ts` → `generateEscortMap()`, `carveCorridor()`<br>`engine/map/gameMap.ts` → `shortestPath()` | `generate.test.ts`, `gameMap.test.ts` | Implémenté | Testé sur 30 graines. |
| SF-02 §3 | Itinéraires alternatifs possibles en escorte | — | — | Non implémenté | Rien ne les garantit ni ne les mesure. |
| SF-02 §3 | Tous les terrains visibles dès le lancement | `features/tactical-map/components/TacticalMap.tsx` → `TerrainLayer()` | — | Non vérifié | Aucun ennemi n'existe : la non-divulgation du brouillard n'est pas exercée. |
| SF-02 §3 | Nouvelle carte à chaque partie, inchangée pendant la mission | `features/mission-setup/components/Recap.tsx` → `newSeed()`<br>`engine/core/types.ts` → `MissionState.map` | `generate.test.ts` | Non vérifié | Le test vérifie le déterminisme par graine, pas le tirage d'une nouvelle graine à chaque partie. Aucune commande ne modifie la carte. |
| SF-02 §4 (SF-02.7, SF-02.8) | Alliés placés automatiquement près de leur zone de départ | `engine/missions/launch.ts` → `launchMission()`, `placeUnits()`<br>`engine/map/generate.ts` → `generateEscortMap()`, `generateNavalCombatMap()` | `executeCommand.test.ts`, `gameMap.test.ts` | Partiel | Zones de départ du scénario non spécifiées : heuristique provisoire (ouest, milieu de la carte). |
| SF-02 §4 | Placement aléatoire des ennemis | — | — | Non implémenté | |
| SF-02 §5 (SF-02.5, SF-02.6) | Navigation du porte-avions : point de passage, déplacement automatique 0 à 2 | `engine/missions/carrier-orders.ts` → `waypointRefusal()`, `applyOrder()`<br>`engine/missions/carrier-movement.ts` → `plannedRoute()`, `moveCarrier()` | `carrier-commands.test.ts` | Partiel | Moteur seul (AB-05, AB-06) : point de passage validé ou refusé sans consommer le quota, déplacement automatique en fin de cycle, arrêt avant une case occupée. Aucune interface : ordre, point de passage et trajet ne sont pas affichés. |
| SF-02 §6 (SF-02.10 à SF-02.14) | Déplacement : chemin le plus court déterministe, capacité de mouvement, destinations accessibles, refus motivé | `engine/units/movement.ts` → `planMove()`, `reachableHexes()`<br>`engine/map/gameMap.ts` → `exploreFrom()`, `pathTo()`<br>`engine/core/missionCommands.ts` → `moveUnit()` | `movement.test.ts`, `missionCommands.test.ts` | Implémenté | Motifs de refus : même case, terrain infranchissable, case occupée, hors de portée, aucun chemin. |
| SF-02 §6 (SF-02.10 à SF-02.14) | Déplacement : destinations mises en évidence, trajet prévisualisé, confirmation ou annulation | `features/commands/services/useMoveDraft.ts` → `useMoveDraft()`<br>`features/tactical-map/components/MoveOverlay.tsx` → `MoveOverlay()`<br>`features/commands/components/MoveBar.tsx` → `MoveBar()`<br>`store/useMoveDraftStore.ts` → `useMoveDraftStore` | — | Non vérifié | Interface : pointillés verts (trajet valide) ou rouges (refus), annulation sans consommation. Non testée. |
| SF-02 §7 (SF-02.15, SF-02.16) | Obstacle ennemi non détecté | — | — | Non implémenté | |

## SF-03 — Cycles et commandes

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-03.1, SF-03.2 (§1) | Activation terminée par « Terminer l'activation », y compris sans déplacement ni action | `engine/core/missionCommands.ts` → `endActivation()` | `missionCommands.test.ts` | Implémenté | Pas d'action spéciale : seule la clôture explicite existe. |
| SF-03.3 (§1) | L'activation reste engagée dès qu'un ordre est exécuté | `engine/core/missionCommands.ts` → `moveUnit()`<br>`engine/units/unit.ts` → `Unit.activation` | `missionCommands.test.ts` | Implémenté | L'abandon de sélection avant ordre relève de l'interface (aucune consommation). |
| SF-03.4 (§1) | Clôture automatique du cycle quand toutes les activations sont achevées | `engine/missions/cycle.ts` → `closeCycleIfDone()`, `closeCycle()`, `isAwaitingFinalOrder()` | `missionCommands.test.ts`, `carrier-commands.test.ts` | Partiel | La dernière occasion d'ordre de navigation (C3=B, AB-07) est implémentée, avec la commande `CLOSE_CYCLE`. Réaction ennemie et progression des projectiles absentes. |
| SF-03.5 (§1) | Fin anticipée entre deux séquences, avec confirmation des activations perdues | `engine/core/missionCommands.ts` → `endCycleEarly()`<br>`features/commands/components/EndCycleButton.tsx` → `EndCycleButton()` | `missionCommands.test.ts` | Implémenté | La règle est testée dans le moteur ; la confirmation d'interface ne l'est pas. Les ennemis restants n'existent pas. |
| SF-03.6 (§2) | Fiche par unité : PV, composants, état Disponible / En cours / Activée | `features/fleet/components/FleetPanel.tsx` → `FleetPanel()`<br>`features/fleet/components/ActivationBadge.tsx` → `ActivationBadge()`<br>`features/fleet/components/UnitStats.tsx` → `HpBar()`, `StockLine()` | — | Partiel | PV, stocks et état d'activation affichés ; états des composants absents. Le porte-avions n'a pas d'état d'activation. |
| SF-03.7 (§2) | Sélection sur la carte ou dans la fiche, synchronisée et mise en évidence | `store/useSelectionStore.ts` → `useSelectionStore`<br>`features/tactical-map/components/TacticalMap.tsx` → `TacticalMap()`, `UnitToken()`<br>`features/fleet/components/FleetPanel.tsx` → `FleetPanel()` | — | Non vérifié | |
| SF-03.8 (§2) | Seule l'unité en cours d'activation reçoit des ordres | `engine/missions/activation.ts` → `orderBlocker()`, `moveBlocker()` | `activation.test.ts`, `missionCommands.test.ts` | Implémenté | |
| SF-03.9 (§3) | Commandes indisponibles visibles mais désactivées, avec motif ; « Terminer l'activation » accessible | `features/commands/components/UnitPanel.tsx` → `UnitPanel()`, `CommandButtons()`<br>`engine/missions/activation.ts` → `BLOCKER_MESSAGES` | `activation.test.ts` | Partiel | Déplacement et « Terminer l'activation » suivent le moteur, avec motif affiché. Les actions spéciales restent désactivées en dur, avec une info-bulle générique. L'affichage n'est pas testé. |
| SF-03.10, SF-03.11 (§3) | Validation, confirmation et annulation des actions spéciales | — | — | Non implémenté | Aucune action spéciale. |
| SF-03.12 (§3) | Déplacement non confirmé : consultation d'autres unités, ordre conservé pour l'unité active | `store/useMoveDraftStore.ts` → `useMoveDraftStore`<br>`features/tactical-map/components/TacticalMap.tsx` → `TacticalMap()` | — | Non vérifié | Vérifié visuellement, sans test automatisé. |
| SF-03.13 (§4) | Fin de cycle, bilan, cycle suivant automatique | `engine/missions/cycle.ts` → `closeCycle()`<br>`engine/core/types.ts` → `MissionState.cycle` | `missionCommands.test.ts`, `carrier-commands.test.ts` | Partiel | Le cycle suivant s'ouvre automatiquement, les unités redeviennent disponibles et le quota de navigation est renouvelé. Pas de bilan de cycle (D-11) ; une mission gagnée n'ouvre pas de cycle suivant. |
| SF-03.14, SF-03.15 (§5) | Ordres de navigation du porte-avions, un par cycle | `engine/core/missionCommands.ts` → `orderCarrier()`, `closeCycleWithoutOrder()`<br>`engine/missions/carrier-orders.ts` → `applyOrder()` | `carrier-commands.test.ts` | Partiel | Moteur seul (AB-05, AB-07) : trois ordres, quota par cycle, ordre refusé pendant une activation, persistance de Stopper. L'état et l'itinéraire actif sont dans `MissionState.navigation` et `plannedRoute()` ; aucune interface ne les consulte encore. |
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
| SF-05 §1 | Stocks limités de missiles, torpilles et leurres ; engagement | `engine/units/unit.ts` → `Unit.missiles`, `Unit.torpedoes` | `executeCommand.test.ts` | Partiel | Stocks initiaux seulement (testés après contrainte) : ni engagement, ni consommation. Aucun stock de leurres ni de munitions défensives. |
| SF-05 §2, §3 | Projectiles persistants, torpilles et ciblage | — | — | Non implémenté | |
| SF-05 §4 | Leurres et défense active antimissile | — | — | Non implémenté | |
| SF-05 §5 | PV globaux et quatre composants binaires ; réparation | `engine/units/unit.ts` → `createUnit()` (`hp` initialisé par `ShipSpec.maxHp`) | — | Partiel | PV seulement. Composants, dégâts et réparation absents. |
| SF-05 §6 | Journal de combat et fin de mission (AB-01, AB-02) | — | — | Non implémenté | |
| SF-05 §7, D-05 | Paramètres provisoires missile (portée 8, progression 2, 40 PV, 75 %) et torpille (portée 5, progression 1, 50 PV, 70 %) | — | — | Non implémenté | Absents de `GameConfig`. |
| SF-05 « Précision V1 » | Porte-avions passif, sans action ni défense propre | `engine/config/gameConfig.ts` → `defaultConfig.ships.carrier` | — | Partiel | Passif par absence de toute action : aucune règle n'est codée. |

## SF-06 — IA ennemie

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-06 §1 à §3, §5 | Décisions et activations de l'IA, brouillard de guerre, restitution | — | — | Non implémenté | Pas de module `engine/ai/`. `Side` contient `'hostile'` mais aucune unité hostile n'est créée. |
| SF-06 §4 | Difficulté Classique ou Expert choisie à la préparation | `engine/missions/setup.ts` → `Difficulty`<br>`engine/core/preparationCommands.ts` → `setDifficulty()` | `executeCommand.test.ts` | Partiel | Sélection et affichage seulement ; aucun effet sur l'IA. |

## SF-07 — Journal et historique

Les paragraphes de SF-07 n'ont pas d'identifiant par exigence.

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-07 §1 | Journal de bord sous le bloc « Force » | `features/logbook/components/LogbookPanel.tsx` → `LogbookPanel()`<br>`features/tactical-map/components/TacticalScreen.tsx` → `TacticalScreen()` | — | Non vérifié | SF-07 §1 est aligné sur la maquette : colonne de droite, sous le panneau de l'unité (G-12.1 ne fixe plus d'emplacement). Disposition non testée. |
| SF-07 §2 | Événements majeurs, synthèse de fin de cycle, ordre chronologique | `engine/core/types.ts` → `GameEvent`<br>`store/useGameStore.ts` → `useGameStore` (`events`) | — | Partiel | Six événements (`MISSION_LAUNCHED`, `UNIT_MOVED`, `CYCLE_STARTED`, `CARRIER_ORDERED`, `CARRIER_MOVED`, `MISSION_WON`), provisoires. Pas de synthèse. Catalogue ouvert (D-11). |
| SF-07 §3 | Confidentialité tactique | — | — | Non implémenté | Aucun événement caché n'existe. |
| SF-07 §4 | Consultation de tout l'historique, accès direct à un cycle | `features/logbook/components/LogbookPanel.tsx` → `LogbookPanel()` | — | Partiel | Liste complète des événements du store ; pas de navigation par cycle. |
| SF-07 §5 | Articulation avec le débriefing | — | — | Non implémenté | |

## SF-08 — Fin de mission et débriefing

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-08 §1, §2 | Résultat binaire, conditions terminales, arrivée en B | `engine/missions/cycle.ts` → `closeCycle()`<br>`engine/missions/carrier-movement.ts` → `hasCarrierArrived()`<br>`engine/core/types.ts` → `MissionState.outcome` | `carrier-commands.test.ts` | Partiel | Victoire à l'arrivée en B (AB-01), puis toute commande est refusée. Aucune défaite (pas de dégâts), aucun écran de fin. |
| SF-08 §3 à §5 | Écran de fin, bilan opérationnel, débriefing collectif | — | — | Non implémenté | Indicateurs à définir (D-12). |
| SF-08.P4 (§6) | Retour à la préparation d'une nouvelle partie après le débriefing | `features/tactical-map/components/TacticalScreen.tsx` → `TopBar()` (bouton « Nouvelle partie » et confirmation)<br>`store/useGameStore.ts` → `reset()` | — | Partiel | Le retour est possible pendant la mission, après confirmation (boîte de dialogue « Abandonner la mission ? »). L'écran de fin et le débriefing n'existent pas. |

## Game Design (G-01 à G-13)

Les chapitres G-xx dupliquent en partie les SF. Les lignes renvoient aux sections ci-dessus quand le code est le même.

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| G-01.1 | Wargame naval tactique 2D sur grille hexagonale | `features/tactical-map/components/TacticalMap.tsx` → `TacticalMap()`<br>`features/tactical-map/services/hexGeometry.ts` → `hexCenter()` | — | Non vérifié | |
| G-01.2 | Carte procédurale et aléatoire | `engine/map/generate.ts` → `generateTerrain()` | `generate.test.ts` | Implémenté | |
| G-01.3 | Le joueur commande une force | `engine/core/preparationCommands.ts` → `addShip()` | `executeCommand.test.ts` | Partiel | Composition seulement, aucune commande tactique. |
| G-01.4, G-01.5 | Adversaire IA, activations alternées ; brouillard de guerre | — | — | Non implémenté | |
| G-01.6, G-01.7 | Solo contre l'IA (`PROPOSÉ`) ; difficulté, sauvegardes, rejouabilité (`À DÉFINIR`) | — | — | Non implémenté (ouvert) | |
| G-02.1 à G-02.6 | Conditions de victoire et de défaite | `engine/missions/carrier-movement.ts` → `hasCarrierArrived()` | `carrier-commands.test.ts` | Partiel | Seule la victoire d'escorte par arrivée en B. Voir SF-08. |
| G-02.7, G-02.8 | Porte-avions immobilisé ; limite de cycles | — | — | Non implémenté (ouvert) | |
| G-03.1.1 à G-03.1.3 | Lutte navale : flotte ennemie inconnue de 2 frégates ou 1 frégate et 1 sous-marin | — | — | Non implémenté | La mission se lance sans aucun ennemi. |
| G-03.1.4 | Force alliée, placement et répartition ennemie | — | — | Non implémenté (ouvert) | |
| G-03.2.1 | Escorter le porte-avions de A à B | `engine/map/generate.ts` → `generateEscortMap()`<br>`engine/missions/launch.ts` → `rosterOf()`<br>`engine/missions/carrier-movement.ts` → `moveCarrier()` | `gameMap.test.ts`, `carrier-commands.test.ts` | Partiel | Porte-avions, points A et B, navigation et arrivée en B dans le moteur ; aucune interface de pilotage. |
| G-03.2.2 à G-03.2.9 | Contrôle hybride, ordres, vitesse, navigation automatique, victoire et défaite | `engine/core/missionCommands.ts` → `orderCarrier()`<br>`engine/missions/carrier-movement.ts` → `moveCarrier()` | `carrier-commands.test.ts` | Partiel | Moteur seul : trois ordres, un par cycle, 2 hexagones, navigation une fois en fin de cycle, victoire à l'arrivée. Défaite non implémentée ; pas d'interface. |
| G-03.2.10, G-03.2.13 | Persistance des ordres, route bloquée | `engine/missions/carrier-orders.ts` → `applyOrder()`<br>`engine/missions/carrier-movement.ts` → `moveCarrier()` | `carrier-commands.test.ts` | Implémenté | Arbitrés (AB-05, AB-06). Moteur seul. |
| G-03.2.11, G-03.2.12 | Vitesse réduite par dégâts, immobilisation définitive, forces d'interception | — | — | Non implémenté (ouvert) | Restent à définir avec le combat et l'IA. |
| G-04.1 | Carte 2D d'hexagones, procédurale | `engine/map/generate.ts` → `generateTerrain()` | `generate.test.ts` | Implémenté | |
| G-04.2 | Hexagone (0,0) en haut à gauche | `engine/map/gameMap.ts` → `indexOf()`<br>`features/tactical-map/services/hexGeometry.ts` → `hexCenter()` | — | Non vérifié | |
| G-04.3 | Déplacements et contacts référencés par coordonnées dans le journal | `features/logbook/components/LogbookPanel.tsx` → `LogbookPanel()`<br>`features/tactical-map/components/TacticalMap.tsx` → `HexCaption()` | — | Partiel | Les déplacements du journal citent les coordonnées ; les contacts n'existent pas. Non testé. |
| G-04.4 | Navigabilité par type d'unité | `engine/map/terrain.ts` → `isNavigable()` | `gameMap.test.ts` | Implémenté | Voir SF-02 §2. |
| G-04.5 | Convention des coordonnées (offset, axial, cube) | `engine/map/hex.ts` → `hexDistance()`, `hexNeighbors()`, `hexLine()` | `hex.test.ts` | Implémenté | Statut `À DÉFINIR` au GDD (GD-06 ouvert). Convention consignée comme choix technique dans `docs/architecture/STRUCTURE.md` (« Conventions techniques »). |
| G-04.6 | 35×35, six terrains, A→B garanti | Voir SF-02 §1 et §3 | `generate.test.ts`, `gameConfig.test.ts` | Implémenté | |
| G-05.1 | Frégates, sous-marins, porte-avions | `engine/config/gameConfig.ts` → `defaultConfig.ships` | `executeCommand.test.ts` | Implémenté | |
| G-05.2, G-05.4 | Choix de l'ordre d'activation ; un déplacement et une action par activation | `engine/core/missionCommands.ts` → `moveUnit()`, `endActivation()` | `missionCommands.test.ts` | Partiel | Ordre d'activation libre et un seul déplacement par activation ; l'action spéciale n'existe pas. |
| G-05.3 | Capacité de déplacement propre à chaque unité | `engine/config/gameConfig.ts` → `ShipSpec.movement`<br>`engine/units/movement.ts` → `reachableHexes()` | `gameConfig.test.ts`, `movement.test.ts` | Implémenté | |
| G-05.5 | Caractéristiques configurables (`PROPOSÉ`) | `engine/config/gameConfig.ts` → `ShipSpec` | — | Partiel (ouvert) | Mouvement, armement et PV seulement ; ni capteurs ni composants. |
| G-05.6 | Valeurs par classe, composants, munitions (`À DÉFINIR`) | `engine/config/gameConfig.ts` → `defaultConfig.ships` | `gameConfig.test.ts` | Partiel (ouvert) | Valeurs provisoires de D-03 ; composants absents. |
| G-05.7 | Quatre contraintes, sans retrait automatique | Voir SF-01 §4 | `executeCommand.test.ts` | Partiel | « Capteurs dégradés » sans effet. |
| G-06.2.1, G-06.2.2, G-06.2.5, G-06.2.6 | Choix libre d'une unité disponible ; déplacement ou rester sur place ; une activation par cycle ; terminer sans déplacement | `engine/core/missionCommands.ts` → `moveUnit()`, `endActivation()`<br>`engine/missions/activation.ts` → `orderBlocker()` | `missionCommands.test.ts`, `activation.test.ts` | Implémenté | |
| G-06.2.3, G-06.2.4 | Une action spéciale facultative, dans l'ordre choisi | — | — | Non implémenté | Aucune action spéciale. |
| G-06.3.1, G-06.3.2 | Réaction ennemie sans contre-réaction | — | — | Non implémenté | |
| G-06.3.3, G-06.3.4, G-06.4.5 | Règles `PROPOSÉ` : renseignements de l'IA, réaction passée, une activation ennemie par cycle | — | — | Non implémenté (ouvert) | |
| G-06.5.6 | Quota d'ordre de navigation réinitialisé au début du cycle | `engine/missions/cycle.ts` → `startNextCycle()` | `carrier-commands.test.ts` | Implémenté | Arbitré (AB-05). |
| G-06.4.1 à G-06.4.3 | Fin anticipée après une séquence complète ; unités non activées perdues | `engine/core/missionCommands.ts` → `endCycleEarly()`<br>`engine/missions/cycle.ts` → `startNextCycle()` | `missionCommands.test.ts` | Implémenté | |
| G-06.4.4 | Les unités ennemies restantes achèvent leurs activations | — | — | Non implémenté | Aucun ennemi. |
| G-06.5.1 à G-06.5.5 | Ordre de navigation, navigation automatique | `engine/core/missionCommands.ts` → `orderCarrier()`<br>`engine/missions/carrier-movement.ts` → `moveCarrier()` | `carrier-commands.test.ts` | Implémenté | Moteur seul. Le rapport avec les activations ennemies est sans objet tant qu'il n'y a aucun ennemi. |
| G-07.1 | Un déplacement et une action spéciale facultative par activation, dans n'importe quel ordre | `engine/core/missionCommands.ts` → `moveUnit()` | `missionCommands.test.ts` | Partiel | Le déplacement seul est implémenté. |
| G-07.2, G-07.3 | Actions envisagées ; recherche active | — | — | Non implémenté | |
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
| G-10.9 | Difficulté sélectionnée avant la partie | `engine/core/preparationCommands.ts` → `setDifficulty()` | `executeCommand.test.ts` | Partiel | Sélection seulement. |
| G-11.1, G-11.6 | Catalogue commun de quatre contraintes, disponibles dans les deux missions | `engine/missions/setup.ts` → `CONSTRAINTS` | `executeCommand.test.ts` | Implémenté | |
| G-11.2 | 0, 1 ou 2 contraintes, choisies ou tirées | `engine/missions/setup.ts` → `areConstraintsValid()`, `drawConstraints()`<br>`engine/config/gameConfig.ts` → `defaultConfig.constraints.maxCount` | `executeCommand.test.ts`, `setup.test.ts` | Implémenté | |
| G-11.3 | « Moyens limités » : budget à 70 | `engine/missions/setup.ts` → `computeBudget()` | `executeCommand.test.ts` | Implémenté | |
| G-11.4 | « Stocks de munitions limités » : −30 % | `engine/units/unit.ts` → `createUnit()` | `executeCommand.test.ts` | Implémenté | |
| G-11.5 | « Capteurs dégradés » et « Météo défavorable » | `engine/units/unit.ts` → `createUnit()` (météo) | `executeCommand.test.ts` | Partiel | Capteurs sans effet. |
| G-11.7 | Cumul, paires distinctes compatibles | `engine/missions/setup.ts` → `areConstraintsValid()` | `executeCommand.test.ts` | Implémenté | |
| G-11.8 | Contraintes et conséquences connues avant la mission | `features/mission-setup/components/SetupSteps.tsx` → `ConstraintsStep()`<br>`features/mission-setup/components/Recap.tsx` → `Recap()` | — | Non vérifié | Le récapitulatif liste les noms des contraintes, pas leurs effets (affichés à l'étape 3). |
| G-11.9 | Contraintes indépendantes de la difficulté ; évaluation globale | — | — | Non implémenté | Aucun calcul défini. |
| G-12.1 à G-12.10 | Journal de bord : événements, brouillard, présentation, synthèses, historique | `features/logbook/components/LogbookPanel.tsx` → `LogbookPanel()`<br>`engine/core/types.ts` → `GameEvent` | — | Partiel | Trois événements provisoires. Voir SF-07. |
| G-13.1 Q1 à Q5, G-13.2 Q1, Q2 | Déclenchement de fin, résultat binaire | — | — | Non implémenté | |
| G-13.3 à G-13.9, C1 à C4 | Bilan, évaluation, réutilisation | — | — | Non implémenté | |

## Décisions acquises (registres `DECISIONS.md`)

| Référence | Règle (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| D-03 (SF) | Catalogue provisoire : coûts, PV, mouvement, dotations, hélicoptères | `engine/config/gameConfig.ts` → `defaultConfig.ships` | `gameConfig.test.ts` | Implémenté | Spécialisations de défense non chiffrées. Hélicoptère « un seul utilisable à la fois » non codé. |
| D-04 (SF) | Porte-avions passif | `engine/config/gameConfig.ts` → `defaultConfig.ships.carrier` | — | Partiel | Voir SF-05. |
| D-01, D-02, D-05, D-06 (SF) | Progression des projectiles, paramètres d'armes, panne de propulsion | — | — | Non implémenté | |
| AB-01 à AB-03 | Fin de mission, arrivée en B, projectiles en vol | — | — | Non implémenté | |
| SF-01 (registre GD) | Quatre contraintes, budget 70, 0 à 2 distinctes | Voir SF-01 §4 | `executeCommand.test.ts` | Partiel | « Capteurs dégradés » sans effet. |
| SF-02 (registre GD) | Carte 35×35, six terrains, A→B garanti | Voir SF-02 §1 à §3 | `generate.test.ts`, `gameConfig.test.ts` | Implémenté | |
| SF-03 (registre GD) | Activation, navigation du porte-avions | — | — | Non implémenté | |

## Ambiguïtés et points d'attention

Revue faite après la fusion de la première version. Les points marqués **Résolue** sont corrigés ; les points **Ouverte** attendent une décision ou un développement ultérieur.

1. **Granularité des identifiants — Ouverte.** SF-04 à SF-08 n'ont pas d'identifiant par exigence (sauf `SF-08.P4`). SF-01 n'a que des Q-numéros dans sa table de traçabilité. SF-02 groupe ses identifiants dans les titres de section, sans correspondance puce par puce. G-09 §2 à §4 n'a que des plages. Les lignes restent au niveau du paragraphe tant que les spécifications n'ont pas d'identifiants plus fins.
2. **Emplacement du journal — Résolue.** SF-07 §1 est aligné sur la maquette : colonne de droite, sous le panneau de l'unité, à côté des forces alliées. G-12.1 ne fixe plus d'emplacement, qui relève de la spécification fonctionnelle. La référence à `docs/game-design/JOURNAL.md`, supprimé, est retirée de SF-07.
3. **Convention de coordonnées — Résolue côté technique, Ouverte côté GDD.** La convention (offset, lignes impaires décalées, axial en interne) est consignée dans `docs/architecture/STRUCTURE.md`. G-04.5 et GD-06 restent marqués « À DÉFINIR » au GDD : leur clôture relève d'une décision fonctionnelle.
4. **Lutte navale sans ennemi — Ouverte.** G-03.1.2 et G-03.1.3 définissent la flotte ennemie. Le moteur lance la mission sans adversaire, car la composition et les zones de départ ne sont pas arbitrées.
5. **« Capteurs dégradés » — Ouverte.** SF-01 §4 définit un effet (−20 %) sur une portée de détection qui n'existe pas encore. La contrainte est sélectionnable sans conséquence jusqu'à l'implémentation de la détection (SF-04).
6. **Exemption du porte-avions (météo) — Résolue.** `unit.test.ts` distingue l'exemption d'un mouvement déjà égal au plafond.
7. **Paramètres de contraintes — Résolue.** La borne maximale est dans `GameConfig` (`constraints.maxCount`).
8. **SF-08.P4 — Résolue en partie.** « Nouvelle partie » demande désormais confirmation. Le retour après débriefing reste à faire avec l'écran de fin (SF-08).
9. **Statuts `PROPOSÉ` et `À DÉFINIR` — Sans objet.** Leur code n'est pas attendu (README du GDD). Ils sont signalés « (ouvert) » pour ne pas les compter comme des manques.

Hypothèses d'interprétation **validées** lors de la mise en place du déplacement et des activations (aucune règle de jeu nouvelle, à rouvrir si elles s'avèrent fausses) :

10. **Porte-avions non activable.** G-03.2.4 distingue l'ordre de navigation des activations, et G-06 parle d'« unité standard » : le porte-avions ne reçoit pas d'activation et n'a pas d'état d'activation sur sa fiche (SF-03.6).
11. **Case occupée infranchissable.** SF-02 §2 impose une seule unité navale par hexagone y compris en déplacement, et SF-02 §6 parle d'« occupations connues » : une unité ne traverse pas une case occupée.
12. **Journal minimal provisoire.** Le catalogue des événements est ouvert (D-11) : seuls le déplacement et l'ouverture d'un cycle sont journalisés, d'après la maquette.
13. **Clôture du cycle incomplète — Résolue côté moteur.** La dernière occasion d'ordre (AB-07) et la navigation automatique du porte-avions sont dans le moteur. Les phases de fin de cycle ennemies (réaction, veille passive, bilan) restent absentes.
