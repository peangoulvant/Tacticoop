# Matrice de traçabilité — Tacticoop V1

Lien entre les exigences du [Game Design](game-design/README.md) et des [spécifications fonctionnelles](functional-specs/README.md) et le code de `src/`. Document de suivi : il ne définit aucune règle et ne reprend pas le détail des spécifications, qui font autorité.

**État analysé :** `main` au commit `6a5fa76` (après la PR #25), avec la PR de renommage des fichiers. `npm test` donne 162 tests réussis sur 16 fichiers, `npm run lint` et `npm run build` ne signalent rien.

## Lecture

| Statut | Signification |
|---|---|
| **Implémenté** | Le comportement est dans le code **et** au moins un test le vérifie. |
| **Partiel** | Une partie seulement de l'exigence est codée. Le reste figure dans la colonne « Remarque ». |
| **Non vérifié** | Le code existe, mais aucun test automatisé ne vérifie le comportement (souvent de l'interface). |
| **Non implémenté** | Aucun code ne réalise l'exigence. « (ouvert) » signale une ligne `PROPOSÉ` ou `À DÉFINIR` au GDD : elle n'est pas à implémenter avant arbitrage (voir le [README du GDD](game-design/README.md)). |

- **Code :** `fichier` → `symbole`. Chemins relatifs à `src/`. Les fichiers suivent la convention `nom-du-fichier.categorie.ts` (voir `QUALITE-ET-IMPLEMENTATION.md`).
- **Tests :** nom du fichier de test, rangé dans le sous-dossier `tests/` du dossier testé. Quand un test ne couvre l'exigence qu'indirectement, la colonne « Remarque » le dit.
- Un test réussi prouve le comportement testé, pas la conformité à la spécification. Un statut « Implémenté » se lit avec sa remarque.
- Les références sont celles des documents. Là où une spécification n'a pas d'identifiant par exigence, la ligne cite le paragraphe (§) et les identifiants du titre de section tels qu'ils sont écrits. Aucun identifiant n'est inféré.
- Les tests d'interface (`App.test.tsx`) ont été supprimés à la demande du relecteur (PR #9). Les comportements d'interface sont donc « Non vérifié » par construction.

## Synthèse

Le code actuel couvre **la préparation de mission (SF-01), la génération de carte, le déplacement des unités alliées, leurs activations et l'enchaînement des cycles (SF-02 §1 à §6, SF-03.1 à SF-03.8)**, avec l'interface correspondante. Le code couvre aussi **la navigation du porte-avions et la victoire à l'arrivée en B** (ordres, quota, dernière occasion d'ordre, déplacement automatique), avec son interface. Le moteur n'accepte que les commandes de préparation, de lancement, de déplacement, d'activation et de navigation (`GameCommand`). Les ennemis sont créés au lancement (composition et zones arbitrées, AB-11 à AB-16) mais restent inertes. Il n'existe encore ni détection, ni combat, ni IA, ni action spéciale, ni défaite, ni écran de fin de mission.

## SF-01 — Préparation et lancement

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-01 §1, §2 (Q7–Q10, Q14) | Deux missions V1 : lutte navale et escorte | `engine/missions/setup.service.ts` → `MISSIONS`<br>`engine/core/preparation-commands.service.ts` → `selectMission()`<br>`engine/missions/launch.service.ts` → `launchMission()` | `execute-command.service.test.ts` | Implémenté | |
| SF-01 §2 | Lutte navale : au moins un bâtiment. Escorte : porte-avions fourni hors budget, au moins un bâtiment d'escorte | `engine/missions/setup.service.ts` → `launchBlockers()`, `computeBudget()`<br>`engine/missions/launch.service.ts` → `rosterOf()` | `execute-command.service.test.ts` | Implémenté | La règle « au moins un bâtiment » est la même pour les deux missions. Les « catégories autorisées » ne sont pas définies : aucune restriction. |
| SF-01 §2 | Difficulté Classique (défaut) ou Expert | `engine/missions/setup.service.ts` → `DIFFICULTIES`, `initialSetup()`<br>`engine/core/preparation-commands.service.ts` → `setDifficulty()` | `execute-command.service.test.ts`, `setup.service.test.ts` | Partiel | Seule la sélection existe, sans effet (pas d'IA). Le défaut « Classique » est testé. |
| SF-01 §2 | Briefing : contexte, objectif, victoire/défaite, renseignement initial, catégories disponibles | `shared/ui.label.ts` → `briefing`<br>`features/mission-setup/components/setup-steps.component.tsx` → `BriefingStep()` | — | Partiel | Les catégories de bâtiments disponibles ne sont pas dans le briefing (elles apparaissent à l'étape « Force navale »). Textes non testés. |
| SF-01 §2 | Changer de mission : garde la difficulté, réinitialise contraintes et force | `engine/core/preparation-commands.service.ts` → `selectMission()` | `execute-command.service.test.ts` | Implémenté | « Actualiser… les catégories recommandées » : voir la ligne « recommandé » ci-dessous. |
| SF-01 §3 (Q1–Q3, Q5–Q6, Q13) | Budget normal de 100 points, non modifiable par le joueur | `engine/config/game.config.ts` → `defaultConfig.budget`<br>`engine/missions/setup.service.ts` → `computeBudget()` | `execute-command.service.test.ts`, `game.config.test.ts` | Implémenté | |
| SF-01 §3 | Catalogue et fiches provisoires (coûts, PV, stocks, mouvement, hélicoptères) | `engine/config/game.config.ts` → `defaultConfig.ships` | `game.config.test.ts`, `execute-command.service.test.ts` | Implémenté | Les cinq fiches (coût, PV, mouvement, dotations, hélicoptères) sont vérifiées. Valeurs provisoires. |
| SF-01 §3 | Plusieurs bâtiments de même catégorie ; budget en plafond | `engine/core/preparation-commands.service.ts` → `addShip()`, `removeShip()` | `execute-command.service.test.ts` | Implémenté | |
| SF-01 §3 | Mentions « recommandé pour cette mission », informatives | — | — | Non implémenté | |
| SF-01 §3 | Budget réduit sous le coût de la force : navires conservés, disponible/engagé/dépassement affichés, lancement bloqué | `engine/core/preparation-commands.service.ts` → `setConstraints()`<br>`engine/missions/setup.service.ts` → `computeBudget()`, `launchBlockers()`<br>`features/mission-setup/components/budget-bar.component.tsx` → `BudgetBar()` | `execute-command.service.test.ts` | Implémenté | Règle testée dans le moteur ; l'affichage (`BudgetBar`, `Recap`) n'est pas testé. |
| SF-01 §4 (Q4, Q11–Q12, Q16–Q22) | Quatre contraintes disponibles dans les deux missions | `engine/missions/setup.service.ts` → `CONSTRAINTS` | `execute-command.service.test.ts` | Implémenté | |
| SF-01 §4 | 0, 1 ou 2 contraintes distinctes, en manuel ou en aléatoire | `engine/missions/setup.service.ts` → `areConstraintsValid()`, `drawConstraints()`<br>`engine/core/preparation-commands.service.ts` → `setConstraints()`, `drawRandomConstraints()`<br>`engine/config/game.config.ts` → `defaultConfig.constraints.maxCount` | `execute-command.service.test.ts`, `setup.service.test.ts`, `game.config.test.ts` | Implémenté | La borne maximale est paramétrable dans `GameConfig`. |
| SF-01 §4 | Contraintes dévoilées avant le lancement | `features/mission-setup/components/setup-steps.component.tsx` → `ConstraintsStep()`<br>`features/mission-setup/components/recap.component.tsx` → `Recap()` | — | Non vérifié | |
| SF-01 §4 | « Moyens limités » : budget de 100 à 70 | `engine/missions/setup.service.ts` → `computeBudget()` | `execute-command.service.test.ts` | Implémenté | Test indirect (dépassement de budget). |
| SF-01 §4 | « Stocks de munitions limités » : dotations −30 %, arrondi inférieur | `engine/missions/launch.service.ts` → `modifiersOf()`<br>`engine/units/unit.model.ts` → `createUnit()` | `execute-command.service.test.ts`, `unit.model.test.ts` | Implémenté | |
| SF-01 §4 | « Capteurs dégradés » : portée de détection −20 % | `engine/missions/setup.service.ts` → `Constraint` | — | Partiel | Contrainte choisissable et enregistrée, **sans aucun effet** : aucune portée de détection n'existe. |
| SF-01 §4 | « Météo défavorable » : déplacement plafonné à 2, porte-avions inchangé | `engine/missions/launch.service.ts` → `modifiersOf()`<br>`engine/units/unit.model.ts` → `createUnit()` | `execute-command.service.test.ts`, `unit.model.test.ts` | Implémenté | L'exemption du porte-avions est testée avec un mouvement de base supérieur au plafond. |
| SF-01 §4–§5 | Choix modifiables avant lancement, verrouillés après | `engine/core/execute-command.service.ts` → `executeCommand()` (garde `WRONG_PHASE`) | `execute-command.service.test.ts` | Implémenté | |
| SF-01 §5 | Récapitulatif avant confirmation (mission, difficulté, contraintes, force, budget) | `features/mission-setup/components/recap.component.tsx` → `Recap()` | — | Non vérifié | |
| SF-01 §5 | Lancement autorisé seulement si budget et minimum respectés ; mission lancée sur la carte | `engine/missions/setup.service.ts` → `launchBlockers()`<br>`engine/core/preparation-commands.service.ts` → `launch()`<br>`engine/missions/launch.service.ts` → `launchMission()` | `execute-command.service.test.ts` | Implémenté | |

## SF-02 — Carte et déplacements

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-02 §1 (SF-02.1, SF-02.2) | Carte hexagonale 35×35 par défaut, paramétrable hors joueur ; (0,0) en haut à gauche | `engine/config/game.config.ts` → `defaultConfig.map`<br>`engine/map/generate.service.ts` → `generateTerrain()`<br>`engine/map/game-map.service.ts` → `indexOf()` | `generate.service.test.ts`, `hex.service.test.ts`, `game.config.test.ts` | Implémenté | L'origine (0,0) n'est pas testée explicitement. |
| SF-02 §1 | Six terrains | `engine/map/terrain.model.ts` → `TERRAINS` | `generate.service.test.ts` | Implémenté | |
| SF-02 §1 | Terrains en ensembles cohérents, non en dispersion indépendante | `engine/map/generate.service.ts` → `generateTerrain()`, `smooth()`, `assignTerrains()` | `generate.service.test.ts` | Non vérifié | Le test ne vérifie que le déterminisme et la présence des six terrains, pas la cohérence spatiale. |
| SF-02 §1 | Zoom sans modifier les dimensions de la carte | `features/tactical-map/services/use-map-view.ts` → `useMapView()`<br>`features/tactical-map/services/view-transform.service.ts` → `zoomAt()`, `clampView()`, `coverScale()` | `view-transform.service.test.ts` | Implémenté | Les calculs sont testés ; le câblage molette, glisser et boutons ne l'est pas. |
| SF-02 §2 (SF-02.3, SF-02.9) | Navigabilité par terrain et par catégorie d'unité | `engine/map/terrain.model.ts` → `isNavigable()`, `NAVIGABLE` | `game-map.service.test.ts`, `execute-command.service.test.ts` | Implémenté | Tests indirects (plage interdite à la frégate, unités placées sur des cases valides). La table n'est pas testée directement, par exemple mer côtière interdite au sous-marin. Les unités ennemies n'existent pas. **AB-15, AB-22 :** le sous-marin sera autorisé en mer côtière avec +20 points de détection passive ; la table est modifiée avec l'implémentation de la veille passive. |
| SF-02 §2 | Une seule unité navale par hexagone, au placement et en déplacement | `engine/missions/launch.service.ts` → `placeUnits()`<br>`engine/map/game-map.service.ts` → `nearestNavigableHex()`<br>`engine/units/unit-movement.service.ts` → `planMove()`, `reachableHexes()` | `execute-command.service.test.ts`, `game-map.service.test.ts`, `unit-movement.service.test.ts` | Implémenté | Une case occupée est infranchissable (hypothèse validée). |
| SF-02 §3 (SF-02.4, SF-02.17, SF-02.18) | Trajet navigable A→B garanti pour le porte-avions | `engine/map/generate.service.ts` → `generateEscortMap()`, `carveCorridor()`<br>`engine/map/game-map.service.ts` → `shortestPath()` | `generate.service.test.ts`, `game-map.service.test.ts` | Implémenté | Testé sur 30 graines. |
| SF-02 §3 | Itinéraires alternatifs possibles en escorte | `engine/map/generate.service.ts` → `withAlternativeRoute()`, `hasAlternativeRoute()` | `generate.service.test.ts` | Partiel | Un contournement (second trajet sans case commune avec le plus court, hors A et B) est favorisé : creusé au nord ou au sud quand la carte n'offre qu'un passage, sans aléa. Mesuré : 195 cartes sur 200 en offrent un (environ la moitié avant). Les cas restants sont un A ou B au fond d'une crique à une seule sortie. Aucun nombre minimal d'itinéraires n'est imposé (la spécification n'en fixe pas) et la sécurité tactique n'est pas évaluée. |
| SF-02 §3 | Tous les terrains visibles dès le lancement | `features/tactical-map/components/tactical-map.component.tsx` → `TerrainLayer()` | — | Non vérifié | Les ennemis existent depuis le lancement mais restent cachés (aucun contact) : la non-divulgation est testée par `hostile-force.service.test.ts` sur la projection amie, pas dans l'interface réelle. |
| SF-02 §3 | Nouvelle carte à chaque partie, inchangée pendant la mission | `features/mission-setup/components/recap.component.tsx` → `newSeed()`<br>`engine/core/game.types.ts` → `MissionState.map` | `generate.service.test.ts` | Non vérifié | Le test vérifie le déterminisme par graine, pas le tirage d'une nouvelle graine à chaque partie. Aucune commande ne modifie la carte. |
| SF-02 §4 (SF-02.7, SF-02.8) | Alliés placés automatiquement près de leur zone de départ | `engine/missions/launch.service.ts` → `launchMission()`, `placeUnits()`, `generateScenario()`<br>`engine/map/generate.service.ts` → `generateEscortMap()`, `generateNavalCombatMap()`, `columnAtRatio()` | `execute-command.service.test.ts`, `game-map.service.test.ts`, `hostile-force.service.test.ts` | Implémenté | Zones arbitrées (AB-14) : groupe autour de A en escorte, autour du point de départ allié en lutte navale ; colonnes lues dans `GameConfig.missions`. Test sur 200 graines : alliés à 2 hexagones au plus de leur point de départ. |
| SF-02 §4 | Placement aléatoire des ennemis | `engine/units/hostile-force.service.ts` → `hostileZoneOf()`, `createHostileUnits()`<br>`engine/missions/launch.service.ts` → `launchMission()` | `hostile-force.service.test.ts` | Implémenté | Zones et distances minimales d'AB-12 et AB-13, une unité par hexagone, navigable pour le type, échec explicite du lancement si impossible. Testé sur 200 graines. Les ennemis restent cachés : aucun contact n'existe. |
| SF-02 §5 (SF-02.5, SF-02.6) | Navigation du porte-avions : point de passage, déplacement automatique 0 à 2 | `engine/units/carrier-orders.service.ts` → `waypointRefusal()`, `applyOrder()`<br>`engine/units/carrier-movement.service.ts` → `plannedRoute()`, `moveCarrier()`<br>`features/fleet/components/carrier-panel.component.tsx` → `CarrierPanel()`<br>`features/tactical-map/components/carrier-route-overlay.component.tsx` → `CarrierRouteOverlay()` | `carrier-commands.test.ts`, `carrier-order-draft.service.test.ts` | Implémenté | Règles testées dans le moteur (AB-05, AB-06). Interface vérifiée dans le navigateur, sans test automatique : choix du point de passage sur la carte, aperçu du trajet (rouge si refusé), refus sans consommer le quota. |
| SF-02 §6 (SF-02.10 à SF-02.14) | Déplacement : chemin le plus court déterministe, capacité de mouvement, destinations accessibles, refus motivé | `engine/units/unit-movement.service.ts` → `planMove()`, `reachableHexes()`<br>`engine/map/game-map.service.ts` → `exploreFrom()`, `pathTo()`<br>`engine/core/mission-commands.service.ts` → `moveUnit()` | `unit-movement.service.test.ts`, `mission-commands.service.test.ts` | Implémenté | Motifs de refus : même case, terrain infranchissable, case occupée, hors de portée, aucun chemin. |
| SF-02 §6 (SF-02.10 à SF-02.14) | Déplacement : destinations mises en évidence, trajet prévisualisé, confirmation ou annulation | `features/commands/services/use-move-draft.ts` → `useMoveDraft()`<br>`features/tactical-map/components/move-overlay.component.tsx` → `MoveOverlay()`<br>`features/commands/components/move-bar.component.tsx` → `MoveBar()`<br>`store/move-draft.store.ts` → `useMoveDraftStore` | — | Non vérifié | Interface : pointillés verts (trajet valide) ou rouges (refus), annulation sans consommation. Non testée. |
| SF-02 §7 (SF-02.15, SF-02.16) | Obstacle ennemi non détecté | `engine/units/unit-movement.service.ts` → `checkMovedUnitPath()`<br>`engine/core/mission-commands.service.ts` → `moveUnit()` (trajet sur la projection connue, parcours sur l'état réel)<br>`features/logbook/components/logbook-panel.component.tsx` → `LogbookPanel()` (« Déplacement interrompu ») | `fog-of-war.test.ts`, `save-format.service.test.ts` | Partiel | Règle codée et testée avec un navire hostile fictif de test : le trajet proposé ne le révèle pas, l'unité s'arrête au dernier hexagone libre (même dès le premier), le déplacement est consommé, aucune donnée sur l'obstacle. Aucun ennemi n'existe dans le jeu : non exercée dans l'application. Message affiché dans le journal seulement. |

## SF-03 — Cycles et commandes

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-03.1, SF-03.2 (§1) | Activation terminée par « Terminer l'activation », y compris sans déplacement ni action | `engine/core/mission-commands.service.ts` → `endActivation()` | `mission-commands.service.test.ts` | Implémenté | Pas d'action spéciale : seule la clôture explicite existe. |
| SF-03.3 (§1) | L'activation reste engagée dès qu'un ordre est exécuté | `engine/core/mission-commands.service.ts` → `moveUnit()`<br>`engine/units/unit.model.ts` → `Unit.activation` | `mission-commands.service.test.ts` | Implémenté | L'abandon de sélection avant ordre relève de l'interface (aucune consommation). |
| SF-03.4 (§1) | Clôture automatique du cycle quand toutes les activations sont achevées | `engine/missions/cycle.service.ts` → `closeCycleIfDone()`, `closeCycle()`, `resolveCycleEnd()`, `isAwaitingFinalOrder()` | `mission-commands.service.test.ts`, `carrier-commands.test.ts`, `cycle.service.test.ts` | Partiel | La dernière occasion d'ordre de navigation (C3=B, AB-07) est implémentée, avec la commande `CLOSE_CYCLE`. Réaction ennemie et progression des projectiles absentes. |
| SF-03.5 (§1) | Fin anticipée entre deux séquences, avec confirmation des activations perdues | `engine/core/mission-commands.service.ts` → `endCycleEarly()`<br>`features/commands/components/end-cycle-button.component.tsx` → `EndCycleButton()` | `mission-commands.service.test.ts` | Implémenté | La règle est testée dans le moteur ; la confirmation d'interface ne l'est pas. Les ennemis restants n'existent pas. |
| SF-03.6 (§2) | Fiche par unité : PV, composants, état Disponible / En cours / Activée | `features/fleet/components/fleet-panel.component.tsx` → `FleetPanel()`<br>`features/fleet/components/activation-badge.component.tsx` → `ActivationBadge()`<br>`features/fleet/components/unit-stats.component.tsx` → `HpBar()`, `StockLine()` | — | Partiel | PV, stocks et état d'activation affichés ; états des composants absents. Le porte-avions n'a pas d'état d'activation. |
| SF-03.7 (§2) | Sélection sur la carte ou dans la fiche, synchronisée et mise en évidence | `store/selection.store.ts` → `useSelectionStore`<br>`features/tactical-map/components/tactical-map.component.tsx` → `TacticalMap()`, `UnitToken()`<br>`features/fleet/components/fleet-panel.component.tsx` → `FleetPanel()` | — | Non vérifié | |
| SF-03.8 (§2) | Seule l'unité en cours d'activation reçoit des ordres | `engine/missions/activation.service.ts` → `orderBlocker()`, `moveBlocker()` | `activation.service.test.ts`, `mission-commands.service.test.ts` | Implémenté | |
| SF-03.9 (§3) | Commandes indisponibles visibles mais désactivées, avec motif ; « Terminer l'activation » accessible | `features/fleet/components/unit-panel.component.tsx` → `UnitPanel()`, `CommandButtons()`<br>`engine/missions/activation.service.ts` → `BLOCKER_MESSAGES` | `activation.service.test.ts` | Partiel | Déplacement et « Terminer l'activation » suivent le moteur, avec motif affiché. Les actions spéciales restent désactivées en dur, avec une info-bulle générique. L'affichage n'est pas testé. |
| SF-03.10, SF-03.11 (§3) | Validation, confirmation et annulation des actions spéciales | — | — | Non implémenté | Aucune action spéciale. |
| SF-03.12 (§3) | Déplacement non confirmé : consultation d'autres unités, ordre conservé pour l'unité active | `store/move-draft.store.ts` → `useMoveDraftStore`<br>`features/tactical-map/components/tactical-map.component.tsx` → `TacticalMap()` | — | Non vérifié | Vérifié visuellement, sans test automatisé. |
| SF-03.13 (§4) | Fin de cycle, bilan, cycle suivant automatique | `engine/missions/cycle.service.ts` → `closeCycle()`<br>`engine/core/game.types.ts` → `MissionState.cycle` | `mission-commands.service.test.ts`, `carrier-commands.test.ts`, `cycle.service.test.ts` | Partiel | Le cycle suivant s'ouvre automatiquement, les unités redeviennent disponibles et le quota de navigation est renouvelé. Ordre de clôture : `resolveCycleEnd()` (navigation ; veille passive, contacts, projectiles et bilan viendront s'y ajouter, avant le résultat), puis `determineOutcome()`, puis fin de mission ou cycle suivant ; une mission terminée n'est jamais prolongée. Pas de bilan de cycle (D-11) ; une mission gagnée n'ouvre pas de cycle suivant. |
| SF-03.14, SF-03.15 (§5) | Ordres de navigation du porte-avions, un par cycle | `engine/core/mission-commands.service.ts` → `orderCarrier()`, `closeCycleWithoutOrder()`<br>`engine/units/carrier-orders.service.ts` → `applyOrder()`<br>`features/fleet/components/carrier-panel.component.tsx` → `CarrierPanel()`<br>`features/fleet/components/carrier-order-bar.component.tsx` → `CarrierOrderBar()`<br>`features/fleet/services/carrier-order-draft.service.ts` → `buildCarrierOrderDraft()`, `carrierOrderUnavailability()` | `carrier-commands.test.ts`, `carrier-order-draft.service.test.ts` | Implémenté | Règles testées dans le moteur (AB-05, AB-07). Interface vérifiée dans le navigateur, sans test automatique : trois ordres dans la fiche du porte-avions, confirmation explicite sur la carte, annulation sans consommation, ordres visibles mais désactivés avec motif après usage du quota, dernière occasion d'ordre avec « Clôturer le cycle ». |
| SF-03.16 (§4) | Enchaînement automatique sans unité activable | — | — | Non implémenté | |

## SF-04 — Détection et contacts

Les paragraphes de SF-04 n'ont pas d'identifiant par exigence.

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-04 §1 | Visibilité : aucune information ennemie révélée sans renseignement légitime | `engine/detection/observation.service.ts` → `observeFriend()`, `observeHostile()`, `isKnownToFriend()`<br>`features/tactical-map/components/tactical-map.component.tsx` → `TacticalMap()`<br>`features/commands/services/use-move-draft.ts` → `useMoveDraft()` | `observation.service.test.ts`, `fog-of-war.test.ts` | Partiel | Filtrage en place : la carte, les destinations accessibles et les refus de déplacement ne reposent que sur `FriendObservation`. Aucun contact n'existe : aucune unité hostile n'est connue, bien que 3 ennemis soient créés au lancement ; le panneau des forces passe lui aussi par la projection amie. Restent à faire avec SF-04 : les contacts et leur expiration, et le filtrage du journal (aucun événement caché n'existe). `HostileObservation` existe sans consommateur (pas d'IA). |
| SF-04 §2 | Veille passive (zone contiguë d'au plus 7 hexagones, 60 %, portée 2) | — | — | Non implémenté (arbitré) | AB-18 à AB-20, AB-22 : contacts distincts, zone de 7 hexagones sans terre alignée sur une case uniforme, +20 points pour le sous-marin côtier. À implémenter (jalon 5, PR A). |
| SF-04 §3 | Recherche active (portée 4, 90 %) | — | — | Non implémenté | Dépend de l'action spéciale (SF-03) ; lot suivant (AB-19). Valeur côtière à définir. |
| SF-04 §4 | Expiration et actualisation des contacts | — | — | Non implémenté (arbitré) | AB-18 : un contact distinct par observation passive ; l'état « ancien » n'apparaît qu'avec la recherche active (AB-23). |
| SF-04 §5 | Fiche de contact, non-divulgation | — | — | Non implémenté (arbitré) | AB-23 : légende de case avec identifiant, nature, cycle et taille de la zone ; panneau dédié reporté (D-14). |

## SF-05 — Combats

Les paragraphes de SF-05 n'ont pas d'identifiant par exigence.

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-05 §1 | Stocks limités de missiles, torpilles et leurres ; engagement | `engine/units/unit.model.ts` → `Unit.missiles`, `Unit.torpedoes` | `execute-command.service.test.ts` | Partiel | Stocks initiaux seulement (testés après contrainte) : ni engagement, ni consommation. Aucun stock de leurres ni de munitions défensives. |
| SF-05 §2, §3 | Projectiles persistants, torpilles et ciblage | — | — | Non implémenté | |
| SF-05 §4 | Leurres et défense active antimissile | — | — | Non implémenté | |
| SF-05 §5 | PV globaux et quatre composants binaires ; réparation | `engine/units/unit.model.ts` → `createUnit()` (`hp` initialisé par `ShipSpec.maxHp`) | — | Partiel | PV seulement. Composants, dégâts et réparation absents. |
| SF-05 §6 | Journal de combat et fin de mission (AB-01, AB-02) | — | — | Non implémenté | |
| SF-05 §7, D-05 | Paramètres provisoires missile (portée 8, progression 2, 40 PV, 75 %) et torpille (portée 5, progression 1, 50 PV, 70 %) | — | — | Non implémenté | Absents de `GameConfig`. |
| SF-05 « Précision V1 » | Porte-avions passif, sans action ni défense propre | `engine/config/game.config.ts` → `defaultConfig.ships.carrier` | — | Partiel | Passif par absence de toute action : aucune règle n'est codée. |

## SF-06 — IA ennemie

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-06 §1 à §3, §5 | Décisions et activations de l'IA, brouillard de guerre, restitution | — | — | Non implémenté | Pas de module `engine/ai/`. Les unités hostiles sont créées au lancement (`hostile-force.service.ts`) mais restent inertes. |
| SF-06 §4 | Difficulté Classique ou Expert choisie à la préparation | `engine/missions/setup.service.ts` → `Difficulty`<br>`engine/core/preparation-commands.service.ts` → `setDifficulty()` | `execute-command.service.test.ts` | Partiel | Sélection et affichage seulement ; aucun effet sur l'IA. |

## SF-07 — Journal et historique

Les paragraphes de SF-07 n'ont pas d'identifiant par exigence.

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-07 §1 | Journal de bord sous le bloc « Force » | `features/logbook/components/logbook-panel.component.tsx` → `LogbookPanel()`<br>`features/tactical-map/components/tactical-screen.component.tsx` → `TacticalScreen()` | — | Non vérifié | SF-07 §1 est aligné sur la maquette : colonne de droite, sous le panneau de l'unité (G-12.1 ne fixe plus d'emplacement). Disposition non testée. |
| SF-07 §2 | Événements majeurs, synthèse de fin de cycle, ordre chronologique | `engine/core/game.types.ts` → `GameEvent`<br>`store/game.store.ts` → `useGameStore` (`events`) | — | Partiel | Six événements (`MISSION_LAUNCHED`, `UNIT_MOVED`, `CYCLE_STARTED`, `CARRIER_ORDERED`, `CARRIER_MOVED`, `MISSION_WON`), provisoires. Pas de synthèse. Catalogue ouvert (D-11). |
| SF-07 §3 | Confidentialité tactique | — | — | Non implémenté | Aucun événement caché n'existe. Événement de contact arbitré (AB-21) : sans cible, classe ni détecteur, cases triées. |
| SF-07 §4 | Consultation de tout l'historique, accès direct à un cycle | `features/logbook/components/logbook-panel.component.tsx` → `LogbookPanel()` | — | Partiel | Liste complète des événements du store ; pas de navigation par cycle. |
| SF-07 §5 | Articulation avec le débriefing | — | — | Non implémenté | |

## SF-08 — Fin de mission et débriefing

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| SF-08 §1, §2 | Résultat binaire, conditions terminales, arrivée en B | `engine/missions/cycle.service.ts` → `closeCycle()`, `determineOutcome()`<br>`engine/units/carrier-movement.service.ts` → `hasCarrierArrived()`<br>`engine/core/game.types.ts` → `MissionState.outcome`<br>`features/commands/components/mission-result-banner.component.tsx` → `MissionResultBanner()` | `carrier-commands.test.ts`, `cycle.service.test.ts` | Partiel | Victoire à l'arrivée en B (AB-01) testée dans le moteur ; bandeau de résultat vérifié dans le navigateur, sans test automatique. Commandes ensuite désactivées. Aucune défaite (pas de dégâts), ni bilan ni débriefing (D-12). |
| SF-08 §3 à §5 | Écran de fin, bilan opérationnel, débriefing collectif | — | — | Non implémenté | Indicateurs à définir (D-12). |
| SF-08.P4 (§6) | Retour à la préparation d'une nouvelle partie après le débriefing | `features/tactical-map/components/tactical-screen.component.tsx` → `TopBar()` (bouton « Nouvelle partie » et confirmation)<br>`features/commands/components/mission-result-banner.component.tsx` → `MissionResultBanner()` (« Nouvelle partie » sans confirmation, via `closeMission()`)<br>`store/game.store.ts` → `reset()` | — | Partiel | Le retour est possible pendant la mission, après confirmation, et après la victoire, sans confirmation. L'écran de bilan et le débriefing n'existent pas. |

## Game Design (G-01 à G-13)

Les chapitres G-xx dupliquent en partie les SF. Les lignes renvoient aux sections ci-dessus quand le code est le même.

| Référence | Exigence (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| G-01.1 | Wargame naval tactique 2D sur grille hexagonale | `features/tactical-map/components/tactical-map.component.tsx` → `TacticalMap()`<br>`features/tactical-map/services/hex-geometry.service.ts` → `hexCenter()` | — | Non vérifié | |
| G-01.2 | Carte procédurale et aléatoire | `engine/map/generate.service.ts` → `generateTerrain()` | `generate.service.test.ts` | Implémenté | |
| G-01.3 | Le joueur commande une force | `engine/core/preparation-commands.service.ts` → `addShip()` | `execute-command.service.test.ts` | Partiel | Composition seulement, aucune commande tactique. |
| G-01.4, G-01.5 | Adversaire IA, activations alternées ; brouillard de guerre | — | — | Non implémenté | |
| G-01.6, G-01.7 | Solo contre l'IA (`PROPOSÉ`) ; difficulté, sauvegardes, rejouabilité (`À DÉFINIR`) | `persistence/format/save-format.service.ts` → `serializeSave()`, `parseSave()` | `save-format.service.test.ts`, `indexed-db-storage.service.test.ts` | Partiel (ouvert) | Sauvegardes arbitrées (AB-08) ; sauvegarde automatique et reprise branchées (voir AT-02) ; export et import manuels de fichiers JSON retirés de la V1 (AB-10). Les autres sujets de G-01.7 restent à définir. |
| G-02.1 à G-02.6 | Conditions de victoire et de défaite | `engine/units/carrier-movement.service.ts` → `hasCarrierArrived()` | `carrier-commands.test.ts` | Partiel | Seule la victoire d'escorte par arrivée en B. Voir SF-08. |
| G-02.7, G-02.8 | Porte-avions immobilisé ; limite de cycles | — | — | Non implémenté (ouvert) | |
| G-03.1.1 à G-03.1.3 | Lutte navale : flotte ennemie inconnue de 3 navires (quatre configurations équiprobables, AB-11) | `engine/units/hostile-force.service.ts` → `drawHostileClasses()`<br>`engine/missions/launch.service.ts` → `launchMission()` | `hostile-force.service.test.ts`, `fog-of-war.test.ts`, `observation.service.test.ts` | Partiel | Force créée au lancement, inconnue du joueur (projection amie, panneau des forces compris). Objectif d'élimination (G-03.1.1) non implémenté : ni détection ni combat. |
| G-03.1.4 | Force alliée, placement et répartition ennemie | `engine/units/hostile-force.service.ts`, `engine/config/game.config.ts` → `MissionsConfig` | `hostile-force.service.test.ts`, `game.config.test.ts` | Implémenté | AB-11 à AB-14 ; poids et ratios dans `GameConfig.missions`. |
| G-03.1.5 | Équilibrage de la lutte navale (3 ennemis contre 2 à 4 alliés) | — | — | Non implémenté (ouvert) | À juger sur les premiers tests de combat. |
| G-03.2.1 | Escorter le porte-avions de A à B | `engine/map/generate.service.ts` → `generateEscortMap()`<br>`engine/missions/launch.service.ts` → `rosterOf()`<br>`engine/units/carrier-movement.service.ts` → `moveCarrier()` | `game-map.service.test.ts`, `carrier-commands.test.ts` | Implémenté | Porte-avions, points A et B, navigation et arrivée en B, pilotables depuis l'interface. |
| G-03.2.2 à G-03.2.9 | Contrôle hybride, ordres, vitesse, navigation automatique, victoire et défaite | `engine/core/mission-commands.service.ts` → `orderCarrier()`<br>`engine/units/carrier-movement.service.ts` → `moveCarrier()` | `carrier-commands.test.ts` | Partiel | Trois ordres, un par cycle, 2 hexagones, navigation une fois en fin de cycle, victoire à l'arrivée ; interface vérifiée dans le navigateur. Défaite non implémentée. |
| G-03.2.10, G-03.2.13 | Persistance des ordres, route bloquée | `engine/units/carrier-orders.service.ts` → `applyOrder()`<br>`engine/units/carrier-movement.service.ts` → `moveCarrier()` | `carrier-commands.test.ts` | Implémenté | Arbitrés (AB-05, AB-06). Moteur seul. |
| G-03.2.11 | Vitesse réduite par dégâts, immobilisation définitive | — | — | Non implémenté (ouvert) | À définir avec le combat. |
| G-03.2.12 | Forces d'interception : composition et placement | `engine/units/hostile-force.service.ts` → `hostileZoneOf()`, `createHostileUnits()` | `hostile-force.service.test.ts` | Partiel | Composition et placement faits (AB-13) ; le comportement relève de l'IA (D-13, ouvert). |
| G-04.1 | Carte 2D d'hexagones, procédurale | `engine/map/generate.service.ts` → `generateTerrain()` | `generate.service.test.ts` | Implémenté | |
| G-04.2 | Hexagone (0,0) en haut à gauche | `engine/map/game-map.service.ts` → `indexOf()`<br>`features/tactical-map/services/hex-geometry.service.ts` → `hexCenter()` | — | Non vérifié | |
| G-04.3 | Déplacements et contacts référencés par coordonnées dans le journal | `features/logbook/components/logbook-panel.component.tsx` → `LogbookPanel()`<br>`features/tactical-map/components/tactical-map.component.tsx` → `HexCaption()` | — | Partiel | Les déplacements du journal citent les coordonnées ; les contacts n'existent pas. Non testé. |
| G-04.4 | Navigabilité par type d'unité | `engine/map/terrain.model.ts` → `isNavigable()` | `game-map.service.test.ts` | Implémenté | Voir SF-02 §2. |
| G-04.5 | Convention des coordonnées (offset, axial, cube) | `engine/map/hex.service.ts` → `hexDistance()`, `hexNeighbors()`, `hexLine()` | `hex.service.test.ts` | Implémenté | Statut `À DÉFINIR` au GDD (GD-06 ouvert). Convention consignée comme choix technique dans `docs/architecture/STRUCTURE.md` (« Conventions techniques »). |
| G-04.6 | 35×35, six terrains, A→B garanti | Voir SF-02 §1 et §3 | `generate.service.test.ts`, `game.config.test.ts` | Implémenté | |
| G-05.1 | Frégates, sous-marins, porte-avions | `engine/config/game.config.ts` → `defaultConfig.ships` | `execute-command.service.test.ts` | Implémenté | |
| G-05.2, G-05.4 | Choix de l'ordre d'activation ; un déplacement et une action par activation | `engine/core/mission-commands.service.ts` → `moveUnit()`, `endActivation()` | `mission-commands.service.test.ts` | Partiel | Ordre d'activation libre et un seul déplacement par activation ; l'action spéciale n'existe pas. |
| G-05.3 | Capacité de déplacement propre à chaque unité | `engine/config/game.config.ts` → `ShipSpec.movement`<br>`engine/units/unit-movement.service.ts` → `reachableHexes()` | `game.config.test.ts`, `unit-movement.service.test.ts` | Implémenté | |
| G-05.5 | Caractéristiques configurables (`PROPOSÉ`) | `engine/config/game.config.ts` → `ShipSpec` | — | Partiel (ouvert) | Mouvement, armement et PV seulement ; ni capteurs ni composants. |
| G-05.6 | Valeurs par classe, composants, munitions (`À DÉFINIR`) | `engine/config/game.config.ts` → `defaultConfig.ships` | `game.config.test.ts` | Partiel (ouvert) | Valeurs provisoires de D-03 ; composants absents. |
| G-05.7 | Quatre contraintes, sans retrait automatique | Voir SF-01 §4 | `execute-command.service.test.ts` | Partiel | « Capteurs dégradés » sans effet. |
| G-06.2.1, G-06.2.2, G-06.2.5, G-06.2.6 | Choix libre d'une unité disponible ; déplacement ou rester sur place ; une activation par cycle ; terminer sans déplacement | `engine/core/mission-commands.service.ts` → `moveUnit()`, `endActivation()`<br>`engine/missions/activation.service.ts` → `orderBlocker()` | `mission-commands.service.test.ts`, `activation.service.test.ts` | Implémenté | |
| G-06.2.3, G-06.2.4 | Une action spéciale facultative, dans l'ordre choisi | — | — | Non implémenté | Aucune action spéciale. |
| G-06.3.1, G-06.3.2 | Réaction ennemie sans contre-réaction | — | — | Non implémenté | |
| G-06.3.3, G-06.3.4, G-06.4.5 | Règles `PROPOSÉ` : renseignements de l'IA, réaction passée, une activation ennemie par cycle | — | — | Non implémenté (ouvert) | |
| G-06.5.6 | Quota d'ordre de navigation réinitialisé au début du cycle | `engine/missions/cycle.service.ts` → `startNextCycle()` | `carrier-commands.test.ts` | Implémenté | Arbitré (AB-05). |
| G-06.4.1 à G-06.4.3 | Fin anticipée après une séquence complète ; unités non activées perdues | `engine/core/mission-commands.service.ts` → `endCycleEarly()`<br>`engine/missions/cycle.service.ts` → `startNextCycle()` | `mission-commands.service.test.ts` | Implémenté | |
| G-06.4.4 | Les unités ennemies restantes achèvent leurs activations | — | — | Non implémenté | Les ennemis existent mais n'ont aucune activation (`not_activable`). |
| G-06.5.1 à G-06.5.5 | Ordre de navigation, navigation automatique | `engine/core/mission-commands.service.ts` → `orderCarrier()`<br>`engine/units/carrier-movement.service.ts` → `moveCarrier()` | `carrier-commands.test.ts` | Implémenté | Le rapport avec les activations ennemies est sans objet tant qu'il n'y a aucun ennemi. |
| G-07.1 | Un déplacement et une action spéciale facultative par activation, dans n'importe quel ordre | `engine/core/mission-commands.service.ts` → `moveUnit()` | `mission-commands.service.test.ts` | Partiel | Le déplacement seul est implémenté. |
| G-07.2, G-07.3 | Actions envisagées ; recherche active | — | — | Non implémenté | |
| G-07.4 à G-07.6 | Préconditions, catalogue, effets d'échec | — | — | Non implémenté (ouvert) | |
| G-08.1.1 à G-08.1.4 | Détection hybride, brouillard, tirage probabiliste, paramétrage par type | — | — | Non implémenté | |
| G-08.1.5 | Mêmes principes pour les deux camps | — | — | Non implémenté (arbitré) | Validé (AB-19) ; détection hostile avec l'IA. |
| G-08.2.1 à G-08.2.7 | Veille passive, zone d'au plus 7 hexagones, un contact par cible et par cycle | — | — | Non implémenté (arbitré) | AB-18, AB-20. |
| G-08.3.1 à G-08.3.3 | Recherche active | — | — | Non implémenté | |
| G-08.3.4, G-08.3.5 | Position non actualisée ; discrétion (`PROPOSÉ`, `À DÉFINIR`) | — | — | Non implémenté (ouvert) | |
| G-08.6.1 à G-08.6.5 | Expiration des contacts | — | — | Non implémenté (arbitré) | G-08.6.4 précisé par AB-18. |
| G-08.6.6 | Information ancienne marquée (`PROPOSÉ`) | — | — | Non implémenté (ouvert) | |
| G-08 §« Probabilités et portées initiales », §« Construction d'une zone passive », §« États affichés » | Sections sans identifiant | — | — | Non implémenté (arbitré) | AB-20 (zone), AB-22 (mer côtière, capteurs dégradés), AB-23 (affichage). Porte-avions non détecteur : `PROPOSÉ`. |
| G-09 §2 à §4 (« G-09.1 à G-09.6 », « G-09.5 / G-09.7 », « G-09.8 ») | Armes, projectiles, dégâts, composants, leurres | — | — | Non implémenté | Sous-sections sans identifiant. |
| G-09.9.1 à G-09.9.12 | Défense active antimissile | — | — | Non implémenté | |
| G-09.10.1 à G-09.10.4 | Ordonnancement des engagements | — | — | Non implémenté | |
| G-09-C1 à G-09-C4 | Contrôles de cohérence | — | — | Non implémenté | |
| G-10.1 à G-10.8, G-10.10 | IA ennemie | — | — | Non implémenté | |
| G-10.9 | Difficulté sélectionnée avant la partie | `engine/core/preparation-commands.service.ts` → `setDifficulty()` | `execute-command.service.test.ts` | Partiel | Sélection seulement. |
| G-11.1, G-11.6 | Catalogue commun de quatre contraintes, disponibles dans les deux missions | `engine/missions/setup.service.ts` → `CONSTRAINTS` | `execute-command.service.test.ts` | Implémenté | |
| G-11.2 | 0, 1 ou 2 contraintes, choisies ou tirées | `engine/missions/setup.service.ts` → `areConstraintsValid()`, `drawConstraints()`<br>`engine/config/game.config.ts` → `defaultConfig.constraints.maxCount` | `execute-command.service.test.ts`, `setup.service.test.ts` | Implémenté | |
| G-11.3 | « Moyens limités » : budget à 70 | `engine/missions/setup.service.ts` → `computeBudget()` | `execute-command.service.test.ts` | Implémenté | |
| G-11.4 | « Stocks de munitions limités » : −30 % | `engine/units/unit.model.ts` → `createUnit()` | `execute-command.service.test.ts` | Implémenté | |
| G-11.5 | « Capteurs dégradés » et « Météo défavorable » | `engine/units/unit.model.ts` → `createUnit()` (météo) | `execute-command.service.test.ts` | Partiel | Capteurs sans effet. |
| G-11.7 | Cumul, paires distinctes compatibles | `engine/missions/setup.service.ts` → `areConstraintsValid()` | `execute-command.service.test.ts` | Implémenté | |
| G-11.8 | Contraintes et conséquences connues avant la mission | `features/mission-setup/components/setup-steps.component.tsx` → `ConstraintsStep()`<br>`features/mission-setup/components/recap.component.tsx` → `Recap()` | — | Non vérifié | Le récapitulatif liste les noms des contraintes, pas leurs effets (affichés à l'étape 3). |
| G-11.9 | Contraintes indépendantes de la difficulté ; évaluation globale | — | — | Non implémenté | Aucun calcul défini. |
| G-12.1 à G-12.10 | Journal de bord : événements, brouillard, présentation, synthèses, historique | `features/logbook/components/logbook-panel.component.tsx` → `LogbookPanel()`<br>`engine/core/game.types.ts` → `GameEvent` | — | Partiel | Trois événements provisoires. Voir SF-07. |
| G-13.1 Q1 à Q5, G-13.2 Q1, Q2 | Déclenchement de fin, résultat binaire | — | — | Non implémenté | |
| G-13.3 à G-13.9, C1 à C4 | Bilan, évaluation, réutilisation | — | — | Non implémenté | |

## Décisions acquises (registres `DECISIONS.md`)

| Référence | Règle (résumé) | Code | Tests | Statut | Remarque |
|---|---|---|---|---|---|
| D-03 (SF) | Catalogue provisoire : coûts, PV, mouvement, dotations, hélicoptères | `engine/config/game.config.ts` → `defaultConfig.ships` | `game.config.test.ts` | Implémenté | Spécialisations de défense non chiffrées. Hélicoptère « un seul utilisable à la fois » non codé. |
| D-04 (SF) | Porte-avions passif | `engine/config/game.config.ts` → `defaultConfig.ships.carrier` | — | Partiel | Voir SF-05. |
| D-01, D-02, D-05, D-06 (SF) | Progression des projectiles, paramètres d'armes, panne de propulsion | — | — | Non implémenté | |
| AB-01 à AB-03 | Fin de mission, arrivée en B, projectiles en vol | `engine/missions/cycle.service.ts` → `determineOutcome()`, `closeCycle()` | `cycle.service.test.ts` | Partiel | AB-01 : la victoire n'est décidée qu'**après** les phases de fin de cycle (aujourd'hui la seule navigation) et ne prolonge jamais une mission terminée. Reste à faire avec le combat : défaite (AB-03), résolution des impacts avant la déclaration et arrêt des projectiles en vol (AB-02), qui n'ont ni dégâts ni projectiles à traiter. |
| SF-01 (registre GD) | Quatre contraintes, budget 70, 0 à 2 distinctes | Voir SF-01 §4 | `execute-command.service.test.ts` | Partiel | « Capteurs dégradés » sans effet. |
| SF-02 (registre GD) | Carte 35×35, six terrains, A→B garanti | Voir SF-02 §1 à §3 | `generate.service.test.ts`, `game.config.test.ts` | Implémenté | |
| SF-03 (registre GD) | Activation, navigation du porte-avions | — | — | Non implémenté | |
| AT-02 | IndexedDB (sauvegarde automatique) ; export/import JSON retiré de la V1 (AB-10) | `persistence/format/save-format.service.ts` → `serializeSave()`, `parseSave()`<br>`persistence/format/save.validator.ts` → `checkMissionState()`, `checkEvents()`<br>`persistence/storage/save-storage.types.ts` → `SaveStorage`<br>`persistence/storage/indexed-db-storage.service.ts` → `createIndexedDbStorage()`<br>`store/auto-save.service.ts` → `startAutoSave()`<br>`store/start-persistence.service.ts` → `startPersistence()`<br>`store/resume-saved-game.service.ts` → `resumeSavedGame()`<br>`store/save.store.ts` → `useSaveStore`<br>`features/mission-setup/components/resume-banner.component.tsx` → `ResumeBanner()`<br>`features/tactical-map/components/save-status.component.tsx` → `SaveStatus()` | `save-format.service.test.ts`, `indexed-db-storage.service.test.ts`, `auto-save.service.test.ts` | Partiel | Sauvegarde automatique (après séquence complète, jamais pendant une activation, effacée au retour à la préparation, écritures regroupées, échec signalé sans bloquer) et reprise (état et journal) testées dans le store avec un faux stockage. Interface (bandeau, barre du haut) vérifiée dans le navigateur, sans test automatique. Export et import JSON absents (PR C3). |

## Ambiguïtés et points d'attention

Revue faite après la fusion de la première version. Les points marqués **Résolue** sont corrigés ; les points **Ouverte** attendent une décision ou un développement ultérieur.

1. **Granularité des identifiants — Ouverte.** SF-04 à SF-08 n'ont pas d'identifiant par exigence (sauf `SF-08.P4`). SF-01 n'a que des Q-numéros dans sa table de traçabilité. SF-02 groupe ses identifiants dans les titres de section, sans correspondance puce par puce. G-09 §2 à §4 n'a que des plages. Les lignes restent au niveau du paragraphe tant que les spécifications n'ont pas d'identifiants plus fins.
2. **Emplacement du journal — Résolue.** SF-07 §1 est aligné sur la maquette : colonne de droite, sous le panneau de l'unité, à côté des forces alliées. G-12.1 ne fixe plus d'emplacement, qui relève de la spécification fonctionnelle. La référence à `docs/game-design/JOURNAL.md`, supprimé, est retirée de SF-07.
3. **Convention de coordonnées — Résolue côté technique, Ouverte côté GDD.** La convention (offset, lignes impaires décalées, axial en interne) est consignée dans `docs/architecture/STRUCTURE.md`. G-04.5 et GD-06 restent marqués « À DÉFINIR » au GDD : leur clôture relève d'une décision fonctionnelle.
4. **Lutte navale sans ennemi — Résolue côté moteur.** Composition, zones de départ et forces d'interception sont arbitrées (AB-11 à AB-16) et implémentées au lancement. Restent absents la détection, le combat et l'IA : les ennemis ne bougent ni ne tirent.
5. **« Capteurs dégradés » — Ouverte.** SF-01 §4 définit un effet (−20 %) sur une portée de détection qui n'existe pas encore. La contrainte est sélectionnable sans conséquence jusqu'à l'implémentation de la détection (SF-04).
6. **Exemption du porte-avions (météo) — Résolue.** `unit.model.test.ts` distingue l'exemption d'un mouvement déjà égal au plafond.
7. **Paramètres de contraintes — Résolue.** La borne maximale est dans `GameConfig` (`constraints.maxCount`).
8. **SF-08.P4 — Résolue en partie.** « Nouvelle partie » demande désormais confirmation. Le retour après débriefing reste à faire avec l'écran de fin (SF-08).
9. **Statuts `PROPOSÉ` et `À DÉFINIR` — Sans objet.** Leur code n'est pas attendu (README du GDD). Ils sont signalés « (ouvert) » pour ne pas les compter comme des manques.

Hypothèses d'interprétation **validées** lors de la mise en place du déplacement et des activations (aucune règle de jeu nouvelle, à rouvrir si elles s'avèrent fausses) :

10. **Porte-avions non activable.** G-03.2.4 distingue l'ordre de navigation des activations, et G-06 parle d'« unité standard » : le porte-avions ne reçoit pas d'activation et n'a pas d'état d'activation sur sa fiche (SF-03.6).
11. **Case occupée infranchissable.** SF-02 §2 impose une seule unité navale par hexagone y compris en déplacement, et SF-02 §6 parle d'« occupations connues » : une unité ne traverse pas une case occupée.
12. **Journal minimal provisoire.** Le catalogue des événements est ouvert (D-11) : seuls le déplacement et l'ouverture d'un cycle sont journalisés, d'après la maquette.
13. **Clôture du cycle incomplète — Résolue côté moteur.** La dernière occasion d'ordre (AB-07) et la navigation automatique du porte-avions sont dans le moteur. Les phases de fin de cycle ennemies (réaction, veille passive, bilan) restent absentes.
14. **Hasard et reprise — Reportée.** Le hasard ne sert qu'au lancement ; `rng.service.test.ts` vérifie le déterminisme du générateur et du lancement, et qu'aucune graine n'est conservée dans l'état. La conservation de l'état du générateur (avec montée de `schemaVersion`) est à faire avec le premier tirage en cours de partie, voir `MOTEUR-ET-ETAT.md`.
