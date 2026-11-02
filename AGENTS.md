# Consignes communes — Tacticoop

## Sources de vérité

Avant d'implémenter, lire les documents pertinents :
- [Game Design](docs/game-design/README.md) : règles du jeu.
- [Spécifications fonctionnelles](docs/functional-specs/README.md) : comportements attendus.
- [Décisions ouvertes](docs/functional-specs/DECISIONS.md) : points non arbitrés.
- [Architecture technique](docs/architecture/README.md) : responsabilités et décisions AT-01 à AT-04.

**Ne jamais inventer une règle métier absente ou trancher implicitement une décision ouverte.** Signaler le blocage et demander un arbitrage avant d'implémenter le comportement concerné. Les documents fonctionnels prévalent pour le gameplay ; l'architecture prévaut pour les choix techniques.

## Architecture V1

- Frontend autonome **React + TypeScript strict + Material UI**, état applicatif **Zustand**, sauvegarde locale **IndexedDB** avec export/import JSON.
- Pas de backend, serveur, API, MongoDB, authentification ou synchronisation distante en V1.
- Moteur fonctionnel indépendant de React, Zustand et du stockage ; point d'entrée métier `executeCommand(GameState, GameCommand, GameConfig)`.
- `GameState` : source de vérité métier unique. Plusieurs stores Zustand sont possibles pour les besoins d'interface, sans dupliquer les données métier.
- Filtrer les observations visibles pour les camps **Friend** et **Hostile** ; l'IA ne doit pas être omnisciente.
- Pour les nouveaux identifiants métier en anglais, utiliser **Friend** / **Hostile**, pas Allied / Enemy.

## Pratiques de contribution

- Examiner les fichiers voisins et les scripts existants avant de modifier le projet ; ne pas supposer qu'un socle applicatif est déjà initialisé.
- Travailler par petites étapes testables ; limiter chaque changement au besoin demandé.
- Appliquer SOLID **avec pragmatisme** : responsabilités nettes, dépendances maîtrisées, interfaces simples, pas d'abstractions prématurées.
- TypeScript `strict`, pas de `any` injustifié ; fonctions lisibles et ciblées ; commentaires expliquant les règles et les choix non évidents.
- Utiliser ESLint, formatage automatique et tests unitaires adaptés à l'implémentation. Vérifier les commandes réellement disponibles avant de les exécuter.
- Ne jamais committer de secrets, de dépendances générées ou de fichiers temporaires.
- Mettre à jour les tests et la documentation seulement lorsque le changement le nécessite ; ne pas recopier les spécifications fonctionnelles dans les documents techniques.
- Expliquer les changements, les vérifications exécutées et les éventuelles limitations en fin de tâche.
