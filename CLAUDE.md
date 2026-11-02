# Tacticoop — Instructions pour Claude Code

@AGENTS.md

## Démarrage d'une tâche

1. Lire le [README](README.md) et les documents ciblés dans [docs/](docs/).
2. Consulter [l'architecture V1](docs/architecture/README.md) et [les décisions fonctionnelles ouvertes](docs/functional-specs/DECISIONS.md) avant tout changement métier.
3. Identifier le plus petit incrément utile, le plan de vérification et les éventuels arbitrages manquants.
4. Implémenter puis tester sans élargir le périmètre.

## Contexte essentiel

Tacticoop est un wargame naval tactique web destiné à la réflexion et au débriefing collectif. La V1 est **frontend-only** ; les anciens dossiers `client/` et `server/` sont abandonnés. Le code applicatif sera organisé sous `src/` à la racine du dépôt, selon [STRUCTURE.md](docs/architecture/STRUCTURE.md).

- Moteur : [MOTEUR-ET-ETAT.md](docs/architecture/MOTEUR-ET-ETAT.md)
- Persistance : [PERSISTANCE.md](docs/architecture/PERSISTANCE.md)
- Qualité et incréments : [QUALITE-ET-IMPLEMENTATION.md](docs/architecture/QUALITE-ET-IMPLEMENTATION.md)

**Ne pas générer une nouvelle architecture ni ajouter de backend.** Les SF/GDD définissent les règles ; les questions fonctionnelles non résolues nécessitent une décision explicite.

## À la fin d'une intervention

Fournir un récapitulatif des fichiers modifiés, des tests/lint/build réellement exécutés et des points bloquants. Ne pas annoncer de vérifications non effectuées.
