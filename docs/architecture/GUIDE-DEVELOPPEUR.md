# Guide du développeur — Tacticoop V1

Document d'accueil pour un développeur qui découvre le code. Il explique **où est quoi**, **comment une action traverse l'application** et **comment ajouter** une règle sans casser l'architecture. Il ne duplique ni les règles de jeu ([Game Design](../game-design/README.md)), ni les contrats détaillés ([MOTEUR-ET-ETAT.md](MOTEUR-ET-ETAT.md), [PERSISTANCE.md](PERSISTANCE.md)), ni les conventions ([QUALITE-ET-IMPLEMENTATION.md](QUALITE-ET-IMPLEMENTATION.md)).

## 1. Carte du code

```
src/
├─ engine/        Les règles du jeu. Fonctions pures, sans React, Zustand ni IndexedDB.
│  ├─ core/         executeCommand, commandes, événements, erreurs, hasard (rng)
│  ├─ config/       GameConfig : TOUTES les valeurs du jeu (portées, probabilités, délais…)
│  ├─ map/          hexagones, carte, génération du relief
│  ├─ units/        unités, déplacement, porte-avions, force ennemie, actions spéciales
│  ├─ detection/    veille, balayage, contacts, projection du camp ami (observeFriend)
│  └─ missions/     préparation, lancement, activations, cycles
├─ persistence/   Sauvegarde : format JSON versionné, validation, stockage IndexedDB
├─ store/         Zustand : état de la partie, brouillons, sauvegarde automatique
├─ features/      Écrans et composants React, un dossier par sujet (carte, flotte, commandes…)
├─ shared/        Textes (ui.label, engine.label) et ressources (assets.config)
└─ app/           Point d'entrée, thème
```

Sens des dépendances : `features → store → engine`, et `store → persistence → engine`. Le moteur ne dépend de personne.

## 2. Le chemin d'une action (exemple : le balayage)

1. **Clic** sur « Balayage » dans `features/fleet/.../unit-commands.component.tsx` → `startSweepDraft(unitId)` ouvre un *brouillon* (`store/sweep-draft.store.ts`). Rien n'est encore décidé : un brouillon n'est que de l'état d'interface.
2. La carte surligne les cases à portée : `useSweepDraft` demande au moteur `engine.sweepArea(...)`.
3. **Confirmer** → `confirmSweep(unitId)` → `dispatchAndCloseDrafts({ type: 'SWEEP', unitId })` → `useGameStore.dispatch` → `engine.executeCommand`.
4. Le moteur (`core/mission-commands.service.ts`, gestionnaire `sweep`) vérifie les préconditions (`specialActionBlocker`), appelle la règle (`detection/sweep.service.ts`), enregistre l'usage (`special-action.service.ts`) et renvoie le **nouvel état** et un **événement** `SWEEP_PERFORMED`.
5. Le store publie l'état et l'événement ; React redessine. Le journal affiche `labels.eventLabel(event)` ; la sauvegarde automatique écrit le JSON (`store/auto-save.service.ts`).

Si le moteur refuse (`ok: false`), l'état ne change pas et l'interface affiche le message de l'erreur.

## 3. Règles d'or

- **L'interface ne calcule aucune règle.** Elle demande au moteur. Pour savoir ce que le joueur connaît, elle utilise `engine.observeFriend(mission)`, **jamais** `mission.units` (qui contient les navires hostiles cachés).
- **Aucune valeur de jeu en dur** : portée, probabilité, délai, part de terrain… tout est dans `GameConfig`. Les tests peuvent ainsi fabriquer une configuration (`{ ...defaultConfig, … }`).
- **Le hasard est injecté** : une fonction qui tire reçoit un générateur (`Rng`). En cours de partie, on le reprend avec `restoreRng(mission.rngState)` et on le rend à l'état. Un test fixe la graine pour être reproductible.
- **Une information cachée ne sort jamais du moteur** : la cible interne d'un contact (`source`) n'est ni dans la projection, ni dans les événements, ni dans le journal.
- **Un mot, une couche** : `plan` = calcul du moteur ; `draft` = état d'interface ; `watch` (veille) et `sweep` (balayage) = les deux détections.

## 4. Recettes

### Ajouter une commande du joueur
1. Ajouter son type à `MissionCommand` (`core/game.types.ts`).
2. Écrire son gestionnaire dans `core/mission-commands.service.ts` ; le type `handlers` oblige à le brancher.
3. Ajouter ses codes d'erreur à `GameErrorCode` et leurs messages à `shared/engine.label.ts`.
4. Tester dans `core/tests/` : cas accepté, chaque refus, et « un refus ne consomme rien ».

### Ajouter un événement du journal
1. Ajouter son type à `GameEvent`. Le compilateur signale alors deux oublis : son texte (`eventDescribers`, `shared/ui.label.ts`) et sa validation (`persistence/format/event.validator.ts`).
2. Ne mettre dans l'événement que ce que le joueur a le droit de savoir.

### Ajouter une action spéciale (torpille, hélicoptère, leurre…)
1. Ajouter sa valeur à `SPECIAL_ACTION_KINDS` et son `cooldownCycles` à `GameConfig.specialActions`.
2. Réutiliser `specialActionBlocker` (préconditions) et `recordSpecialAction` (délai de récupération) : le mécanisme est commun.
3. Ajouter son store de brouillon, puis l'ajouter à `store/cancel-drafts.service.ts` (seul endroit qui connaît la liste).

### Ajouter une valeur au jeu
La déclarer dans l'interface de `GameConfig`, lui donner sa valeur dans `defaultConfig`, la commenter avec un exemple chiffré, ajouter une assertion à `config/tests/game.config.test.ts`.

### Ajouter un champ à l'état (`MissionState`, `Unit`, `GameEvent`)
1. Mettre à jour le type et sa création (`createUnit`, `launchMission`…).
2. **Monter `SAVE_SCHEMA_VERSION`** (`persistence/format/save-format.service.ts`) : les anciennes sauvegardes sont alors traitées comme absentes (AB-08). Mettre à jour le validateur correspondant (`unit.validator.ts`, `contact.validator.ts`, `event.validator.ts`, `save.validator.ts`) : un champ non validé n'est pas contrôlé.
3. Ajouter le test d'aller-retour dans `persistence/format/tests/`.

## 5. Glossaire

| Terme | Sens |
|---|---|
| Cycle | Tour de jeu : activations des unités alliées, puis clôture (porte-avions, veille). |
| Activation | Les ordres d'une unité pendant un cycle : « disponible », « en cours » (un ordre exécuté), « activée ». Une seule unité est « en cours » à la fois (SF-03.8). |
| Veille | Détection **automatique** de fin de cycle : un tirage par paire détecteur–cible à portée, qui donne un *contact suspect* (une zone). Probabilité de base 50 %. |
| Balayage | Détection **voulue** par le joueur (action spéciale) : un tirage à 90 % par navire hostile à portée, qui donne un *contact identifié* (type et position exacte). Fait du bruit : +20 points de veille contre l'unité, ce cycle. Récupération d'un cycle. |
| Contact suspect | Zone approximative de 7 hexagones au plus ; elle ne désigne pas la case réelle. |
| Contact identifié | Navire repéré avec son type (frégate ou sous-marin, jamais la classe) et sa position exacte à l'instant du balayage ; « ancien » s'il date d'un cycle précédent. |
| Projection amie | `observeFriend(mission)` : ce que le joueur a le droit de savoir. |
| Brouillon | Action en préparation, pas encore confirmée ; sans effet sur l'état du jeu. |
| `source` | Identifiant interne de la cible d'un contact. Jamais exposé. |

## 6. Tester

- Priorité aux tests du moteur : ils se placent dans un sous-dossier `tests/` du dossier testé et suivent le nom du fichier (`sweep.service.test.ts`).
- Un tirage se teste de deux façons : avec une probabilité forcée à 0 ou 1 dans une configuration d'essai (comportement), ou sur des centaines de graines avec des bornes larges (statistique).
- Une fonction qui touche à la sauvegarde se teste aussi par un aller-retour `serializeSave` → `parseSave`.
- Les tests d'interface (React Testing Library et jsdom) sont dans `src/app/tests/`, avec `// @vitest-environment jsdom` en première ligne ; les autres tests tournent sous Node. Ils passent par les vrais composants, le store et le moteur, s'interrogent par rôle et nom accessible (`screen.getByRole`) et se pilotent avec `userEvent`. Les stores Zustand sont des singletons : les réinitialiser dans `beforeEach`.
- Ce que jsdom ne sait pas faire (clic sur la carte, zoom, glisser, rendu SVG) se vérifie dans un vrai navigateur ; Playwright pourra le couvrir plus tard.
