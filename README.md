# Tacticoop

Wargame naval tactique web, destiné à la réflexion et au débriefing collectif. La V1 est un **frontend autonome**, sans backend : le moteur de jeu, l'interface et la sauvegarde tournent dans le navigateur.

## État de la V1

**Opérationnel**
- Préparation de mission : lutte navale ou escorte, difficulté, contraintes, budget et composition de la force navale (SF-01).
- Carte hexagonale générée par graine, force ennemie créée au lancement mais cachée.
- Déplacement des unités alliées, activations et cycles ; navigation du porte-avions et victoire à l'arrivée en B.
- Détection, symétrique pour les deux camps : **veille** automatique de fin de cycle (contacts suspects) et **balayage** (contacts identifiés, bruit, délai de récupération), chaque camp ayant ses propres contacts.
- IA hostile (cadre) : les unités ennemies se déplacent vers leur objectif et balayent avec les mêmes commandes que le joueur, sans arme.
- Journal de bord, sauvegarde automatique et reprise de la partie en cours.

**À développer** : combat et dégâts (armes de l'IA comprises), défaite et bilan, autres actions spéciales (torpille, hélicoptère, réparation, tir, leurre), débriefing. Le détail, exigence par exigence, est dans la [matrice de traçabilité](docs/TRACEABILITY.md).

## Stack

React 19, TypeScript, Material UI, Zustand, Vite. Persistance dans IndexedDB. Tests avec Vitest, React Testing Library et jsdom. ESLint et Prettier.

## Architecture en bref

Code sous `src/`, par couches ([structure](docs/architecture/STRUCTURE.md), [guide du développeur](docs/architecture/GUIDE-DEVELOPPEUR.md)) :

| Dossier | Rôle |
|---|---|
| `engine/` | Règles du jeu : fonctions pures, sans React ni stockage. Toutes les valeurs du jeu sont dans `GameConfig`. |
| `store/` | Zustand : état de la partie, brouillons d'action, sauvegarde automatique. |
| `persistence/` | Format JSON versionné, validation, stockage IndexedDB. |
| `features/` | Écrans et composants React, un dossier par sujet. |
| `shared/`, `app/` | Textes et ressources communs, point d'entrée et thème. |

L'interface ne calcule aucune règle : elle envoie des commandes au moteur et n'affiche que ce que le joueur connaît (`engine.observeFriend`).

## Persistance

Une partie en cours est sauvegardée automatiquement dans IndexedDB, dans un seul emplacement, à la fin de chaque séquence complète (jamais pendant une activation). Au démarrage, une sauvegarde valide est proposée à la reprise. Une sauvegarde illisible ou d'une autre version du format est ignorée sans message et sans migration. L'export et l'import manuels de fichiers sont hors V1. Détail : [PERSISTANCE.md](docs/architecture/PERSISTANCE.md).

## Scripts

Node.js 22 et npm.

| Commande | Rôle |
|---|---|
| `npm install` | Installer les dépendances |
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Vérification TypeScript puis build de production |
| `npm run lint` | ESLint |
| `npm run format` / `npm run format:check` | Prettier (écriture / contrôle) |
| `npm test` | Tous les tests Vitest |

## Tests

- **Tests métier** (moteur, store, persistance) : environnement Node, rangés dans un sous-dossier `tests/` du dossier testé.
- **Tests d'interface** : `src/app/tests/*.test.tsx`, avec React Testing Library et jsdom (déclaré en tête de chaque fichier par `// @vitest-environment jsdom`). Ils exercent les vrais composants, le store et le moteur : préparation de mission, commandes, déplacement, balayage, fin de cycle, reprise.
- jsdom ne permet pas de tester le clic sur la carte, le zoom, le glisser ni le rendu SVG ; ces points se vérifient dans un navigateur réel (Playwright pourra les couvrir plus tard). Limites détaillées dans la [matrice de traçabilité](docs/TRACEABILITY.md).
- La CI GitHub Actions rejoue lint, format, tests et build sur chaque PR vers `main`.

## Documentation

- [Game Design G-01 à G-13](docs/game-design/README.md) — règles du jeu et [registre des arbitrages](docs/game-design/DECISIONS.md).
- [Spécifications fonctionnelles SF-01 à SF-08](docs/functional-specs/README.md) — comportements attendus et décisions ouvertes.
- [Architecture technique V1](docs/architecture/README.md) — moteur, Zustand, IndexedDB, conventions et qualité.
- [Diagrammes du code](docs/diagrams/README.md) — schémas Mermaid simples : couches, moteur, cycle, IA, détection, interface, sauvegarde.
- [Maquette](docs/maquette/README.md) — référence visuelle non normative.
- [HANDOFF.md](HANDOFF.md) — passation entre sessions de développement ; [CLAUDE.md](CLAUDE.md) et [AGENTS.md](AGENTS.md) — consignes pour Claude Code et les contributeurs.

Les documents d'architecture ne modifient pas les règles du jeu. Les décisions fonctionnelles ouvertes doivent être arbitrées avant leur implémentation.
