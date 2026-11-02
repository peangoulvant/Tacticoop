# Consignes communes — Tacticoop

## Sources de vérité

Avant d'implémenter, consulter les documents pertinents :
- [Game Design](docs/game-design/README.md) : règles du jeu.
- [Spécifications fonctionnelles](docs/functional-specs/README.md) : comportements attendus.
- [Décisions ouvertes](docs/functional-specs/DECISIONS.md) : points non arbitrés.
- [Architecture technique](docs/architecture/README.md) : stack, structure, moteur, persistance et qualité.

**Ne pas inventer de règle métier ni trancher implicitement une décision ouverte.** Signaler les points bloquants et demander un arbitrage. Les spécifications font autorité sur le gameplay ; les documents d'architecture sur les choix techniques.

## Pratiques de contribution

- Lire les fichiers voisins et les scripts existants avant de modifier le projet.
- Avancer par changements ciblés et testables ; ne pas élargir le périmètre demandé.
- Appliquer les conventions de développement et les contrôles définis dans [QUALITE-ET-IMPLEMENTATION.md](docs/architecture/QUALITE-ET-IMPLEMENTATION.md).
- Ne jamais committer de secrets, de fichiers générés ou de dépendances installées.
- Adapter les tests et la documentation si le changement le nécessite, sans dupliquer les référentiels.
- En fin de tâche, indiquer les changements, vérifications réellement exécutées et limites éventuelles.
