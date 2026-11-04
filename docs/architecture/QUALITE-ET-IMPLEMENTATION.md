# Qualité et mise en œuvre — Tacticoop V1

## Principes de développement

Le code doit rester **clair, commenté lorsque nécessaire, concis et maintenable** par un développeur autonome d'environ sept ans d'expérience. Éviter les abstractions qui compliquent la lecture sans bénéfice concret.

Appliquer les principes **SOLID** de manière pragmatique :
- **S — Responsabilité unique :** chaque module ou fonction poursuit un objectif précis.
- **O — Ouvert/fermé :** privilégier l'ajout de variantes par composition lorsque cela évite de modifier de nombreuses règles existantes ; ne pas créer d'extension artificielle.
- **L — Substitution :** les implémentations d'un même contrat respectent les mêmes garanties.
- **I — Ségrégation des interfaces :** contrats ciblés, sans interfaces tentaculaires.
- **D — Inversion des dépendances :** le moteur dépend de contrats ou de données métier, jamais de React, Zustand ou IndexedDB.

## Conventions et qualimétrie

- TypeScript `strict`, sans `any` injustifié ; types et noms explicites.
- ESLint et formatage automatique (par exemple Prettier) ; compilation, lint et tests sans erreurs.
- Fonctions focalisées, imbrication limitée, pas de duplication inutile ni d'effets de bord cachés.
- Complexité cyclomatique par fonction : **5 conseillé, 10 au maximum** (règle ESLint `complexity`, valable pour tout le code source, composants React compris).
- Commentaires expliquant **pourquoi** une décision ou une règle est appliquée ; ne pas paraphraser les instructions évidentes.
- JSDoc ciblé pour les interfaces publiques et les comportements délicats.
- Pas de limite arbitraire de lignes par fonction/fichier, ni d'outil de qualimétrie lourd imposé à la V1.
- Ne pas sur-découper : le coût de navigation entre fichiers fait aussi partie de la maintenabilité.

## Conventions de nommage et d'import

Un développeur doit savoir **d'où vient** une fonction ou un type en lisant une seule ligne.

**Importer sous un nom ce dont l'origine n'est pas évidente.**
- Par défaut, un module d'une autre couche s'importe sous un nom : `import * as engine from '../../engine'`, puis `engine.planMove(...)`, `engine.MoveBlocker`. Même principe pour `shared/labels` (`labels`) et `shared/assets` (`assets`).
- L'import nommé reste accepté quand le nom porte déjà son origine : composant React (`UnitPanel`), hook ou store (`useGameStore`), fonction du même dossier.
- Le moteur (`src/engine`) importe ses propres modules par chemin relatif, sans espace de noms.
- ESLint impose cette règle pour le moteur, `shared/labels` et `shared/assets` (`no-restricted-syntax`). Pour les autres cas, la relecture tranche : dans le doute, importer sous un nom.

**Un mot, une couche.** Deux éléments de couches différentes ne portent pas des noms voisins.
- `plan` désigne le calcul du moteur : `engine.planMove`, `engine.MovePlan`.
- `draft` (« brouillon ») désigne l'état d'interface d'une action en préparation, pas encore exécutée : `useMoveDraft`, `MoveDraft`, `useMoveDraftStore`.
- Un hook s'appelle `useXxx`, un store Zustand `useXxxStore` ; un composant React porte un nom de rôle (`UnitPanel`, `MoveBar`).
- Avant de nommer, chercher les noms déjà proches dans les autres couches et choisir un mot distinct.

## Tests

Priorité aux tests unitaires du moteur : commandes et erreurs, calculs de déplacement, contacts et observations filtrées, combat, transitions et conditions terminales selon les règles fonctionnelles.

Compléter par des tests de persistance (validation, export/import, reprise) et quelques tests d'intégration des parcours critiques. Les tirages aléatoires doivent être contrôlables dans les tests. Ne pas tester des règles non encore arbitrées.

## Progression de développement

1. **Socle** : React, TypeScript, Material UI, lint, formatage et tests.
2. **Moteur minimal** : `GameState`, commandes, configuration et store principal.
3. **Préparation et carte** : génération, affichage et premières interactions.
4. **Première séquence jouable** : commandes, résolution et sauvegarde.
5. **Fonctionnalités métier complémentaires** : détection, combat, IA, missions, selon les arbitrages disponibles.
6. **Fiabilisation** : débriefing, cas limites, export/import et tests d'intégration.

Chaque incrément doit être testable. Les décisions fonctionnelles ouvertes dans [DECISIONS.md](../functional-specs/DECISIONS.md) nécessitent un arbitrage avant l'implémentation concernée.

## Hors périmètre V1

Backend Flask, OpenAPI, MongoDB, synchronisation distante, multijoueur temps réel, event sourcing, rejeu intégral et microservices. Leur éventuelle introduction future dépendra d'un besoin avéré, pas d'une anticipation architecturale.
