# Architecture technique — Tacticoop V1

**Statut :** décisions techniques AT-01 à AT-04 validées. **Portée :** documentation d'architecture, sans implémentation.

## Objectif

Construire un **frontend autonome et modulaire**, simple à développer et à maintenir, avec React, TypeScript, Material UI, Zustand et IndexedDB. Aucun backend n'est nécessaire en V1.

Le moteur métier reste indépendant de React, Zustand et de la persistance. Les règles de gameplay sont exclusivement décrites dans le [GDD](../game-design/README.md) et les [spécifications fonctionnelles](../functional-specs/README.md). Les décisions ouvertes demeurent dans leur [registre](../functional-specs/DECISIONS.md).

## Décisions validées

| ID | Décision |
|---|---|
| AT-01 | Moteur fonctionnel à état explicite |
| AT-02 | IndexedDB avec export/import JSON |
| AT-03 | `GameState` unique structuré par domaines, stores Zustand spécialisés |
| AT-04 | Point d'entrée unique `executeCommand()` |

## Documents de référence

- [STRUCTURE.md](STRUCTURE.md) — modules, arborescence et dépendances.
- [MOTEUR-ET-ETAT.md](MOTEUR-ET-ETAT.md) — état métier, Zustand, commandes, observations et IA.
- [PERSISTANCE.md](PERSISTANCE.md) — sauvegarde IndexedDB et export/import JSON.
- [QUALITE-ET-IMPLEMENTATION.md](QUALITE-ET-IMPLEMENTATION.md) — SOLID, conventions, tests et progression de développement.

**Règle de conception :** documenter ici les responsabilités, interfaces et contraintes techniques, pas le déroulement détaillé des cycles, des combats ou des missions. Les décisions fonctionnelles non validées ne doivent pas être inventées pendant l'implémentation.
