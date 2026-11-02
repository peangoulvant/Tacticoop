# Tacticoop — Instructions pour Claude Code

@AGENTS.md

## Démarrage d'une tâche

1. Lire le [README](README.md) et les documents ciblés dans [docs/](docs/).
2. Consulter [l'architecture V1](docs/architecture/README.md) et [les décisions fonctionnelles ouvertes](docs/functional-specs/DECISIONS.md) avant tout changement métier.
3. Identifier le plus petit incrément utile, le plan de vérification et les éventuels arbitrages manquants.
4. Implémenter puis tester sans élargir le périmètre.

## Contexte essentiel

Tacticoop est un wargame naval tactique web destiné à la réflexion et au débriefing collectif. Le code applicatif sera organisé sous `src/` à la racine du dépôt, selon [STRUCTURE.md](docs/architecture/STRUCTURE.md).

Les contrats du moteur, la persistance et les exigences de qualité sont documentés dans [docs/architecture/](docs/architecture/README.md). Les SF/GDD définissent les règles ; les questions fonctionnelles non résolues nécessitent une décision explicite.

## À la fin d'une intervention

Fournir un récapitulatif des fichiers modifiés, des tests/lint/build réellement exécutés et des points bloquants. Ne pas annoncer de vérifications non effectuées.
