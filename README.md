# Tacticoop

Wargame naval tactique web — projet V1 **frontend autonome** en préparation.

## Référentiel documentaire

- [Game Design G-01 à G-13](docs/game-design/README.md) — règles du jeu.
- [Spécifications fonctionnelles SF-01 à SF-08](docs/functional-specs/README.md) — comportements attendus et décisions ouvertes.
- [Architecture technique V1](docs/architecture/README.md) — moteur, Zustand, IndexedDB, conventions et qualité.

## Développement avec Claude Code

- [CLAUDE.md](CLAUDE.md) : point d'entrée Claude Code.
- [AGENTS.md](AGENTS.md) : consignes communes aux agents et contributeurs.

La V1 est prévue avec React, TypeScript, Material UI, Zustand et IndexedDB, **sans backend**. L'application est à la racine du dépôt, code sous `src/` ([structure](docs/architecture/STRUCTURE.md)). La persistance IndexedDB n'est pas encore implémentée.

## Scripts

Node.js 22 et npm.

| Commande | Rôle |
|---|---|
| `npm install` | Installer les dépendances |
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Vérification TypeScript puis build de production |
| `npm run lint` | ESLint |
| `npm run format` / `npm run format:check` | Prettier (écriture / contrôle) |
| `npm test` | Tests Vitest (moteur, store, parcours UI) |

L'interface suit la [maquette](docs/maquette/README.md), référence visuelle non normative.

Les documents d'architecture ne modifient pas les règles du jeu. Les décisions fonctionnelles ouvertes doivent être arbitrées avant leur implémentation.
