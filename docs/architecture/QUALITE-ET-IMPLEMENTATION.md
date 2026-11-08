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
- **Style des fonctions** (inspiré du *Google TypeScript Style Guide*) : au premier niveau d'un module, une fonction est une déclaration `function nom() {}`. Les flèches servent aux rappels (`map`, `filter`, gestionnaires) et aux expressions, y compris les petites fonctions locales imbriquées. Exception : une constante annotée d'un type de fonction, comme les gestionnaires `Handler<'X'>`. ESLint l'impose au premier niveau (`no-restricted-syntax`).
- Complexité cyclomatique par fonction : **5 conseillé, 10 au maximum** (règle ESLint `complexity`, valable pour tout le code source, composants React compris).
- Commentaires expliquant **pourquoi** une décision ou une règle est appliquée ; ne pas paraphraser les instructions évidentes.
- JSDoc ciblé pour les interfaces publiques et les comportements délicats.
- Pas de limite arbitraire de lignes par fonction/fichier, ni d'outil de qualimétrie lourd imposé à la V1.
- Ne pas sur-découper : le coût de navigation entre fichiers fait aussi partie de la maintenabilité.

## Conventions de nommage et d'import

Un développeur doit savoir **d'où vient** une fonction ou un type en lisant une seule ligne.

**Importer sous un nom ce dont l'origine n'est pas évidente.**
- Par défaut, un module d'une autre couche s'importe sous un nom : `import * as engine from '../../engine'`, puis `engine.planMove(...)`, `engine.MoveBlocker`. Même principe pour `shared/ui.label` (`labels`) et `shared/assets.config` (`assets`).
- L'import nommé reste accepté quand le nom porte déjà son origine : composant React (`UnitPanel`), hook ou store (`useGameStore`), fonction du même dossier.
- Le moteur (`src/engine`) importe ses propres modules par chemin relatif, sans espace de noms. Il importe `shared/engine.label` (textes du moteur) sous un nom : `import * as labelEngine from '../../shared/engine.label'`.
- ESLint impose cette règle pour le moteur, `shared/ui.label`, `shared/assets.config` et `shared/engine.label` (`no-restricted-syntax`). Il interdit aussi au moteur d'importer `shared/ui.label` et `shared/assets.config` (dépendance circulaire). Pour les autres cas, la relecture tranche : dans le doute, importer sous un nom.

**Un mot, une couche.** Deux éléments de couches différentes ne portent pas des noms voisins.
- `plan` désigne le calcul du moteur : `engine.planMove`, `engine.MovePlan`.
- `draft` (« brouillon ») désigne l'état d'interface d'une action en préparation, pas encore exécutée : `useMoveDraft`, `MoveDraft`, `useMoveDraftStore`.
- Un hook s'appelle `useXxx`, un store Zustand `useXxxStore` ; un composant React porte un nom de rôle (`UnitPanel`, `MoveBar`).
- Deux notions de déplacement ne partagent pas un nom : `units/unit-movement.service.ts` (déplacement d'une unité par le joueur) et `units/carrier-movement.service.ts` (navigation automatique du porte-avions).
- Avant de nommer, chercher les noms déjà proches dans les autres couches et choisir un mot distinct.

## Nommage des fichiers

Les noms de fichiers `.ts` et `.tsx` suivent la forme **`nom-du-fichier.categorie.ts`** (ou `.tsx`) : **kebab-case** pour le nom, puis un **suffixe de catégorie** parmi la liste ci-dessous. Cette convention vise les **noms de fichiers**, pas les symboles : variables et fonctions en `camelCase`, types, interfaces, classes et composants React en `PascalCase`, constantes globales en `UPPER_SNAKE_CASE` quand c'est pertinent.

| Suffixe | Responsabilité | Exemple |
|---|---|---|
| `.model.ts` | modèles métier, entités | `unit.model.ts` |
| `.types.ts` | interfaces, types et contrats | `game.types.ts`, `save-storage.types.ts` |
| `.service.ts` | logique métier, traitements, services | `unit-movement.service.ts` |
| `.store.ts` | stores Zustand | `game.store.ts` |
| `.component.tsx` | composants React | `tactical-map.component.tsx` |
| `.validator.ts` | validation de données | `save.validator.ts` |
| `.config.ts` | configuration | `game.config.ts` |
| `.label.ts` | libellés et messages | `engine.label.ts`, `ui.label.ts` |
| `.test.ts` (`.test.tsx` si JSX) | tests | `unit-movement.service.test.ts` |

Règles :
1. Le nom décrit la responsabilité du fichier ; le suffixe de catégorie se place avant l'extension.
2. **Aucun autre suffixe** (`.handler`, `.controller`, `.adapter`, `.port`, `.factory`, `.hook`…) n'est créé.
3. Exceptions, qui gardent leur nom : `index.ts`, les points d'entrée (`main.tsx`, `App.tsx`), les fichiers attendus par les outils (`test-setup.ts`, configurations), et les **hooks React**, nommés `use-xxx.ts` en kebab-case (un `.service.ts` y serait trompeur). Le hook exporte `useXxx`.
4. Un fichier n'est ni déplacé ni découpé pour le seul plaisir de la convention : on ne change que son nom.
5. Un test porte le nom de son fichier testé suivi de `.test.ts` ; un test qui couvre un comportement transversal garde un nom descriptif (`carrier-commands.test.ts`).
6. **Qualificatif `.ai` (AB-17).** Un fichier de l'IA ennemie qui a un homologue côté unités ou missions porte le qualificatif `.ai` avant la catégorie : `unit-movement.ai.service.ts` (décision de l'IA) à côté de `unit-movement.service.ts` (règle). C'est un qualificatif de la catégorie `.service`, pas une catégorie nouvelle : la règle 2 reste valable. Le test suit la règle 5 (`unit-movement.ai.service.test.ts`). Aucune règle ESLint ne l'impose.

## Organisation des tests

Dans chaque dossier qui contient des tests, ceux-ci sont rangés dans un sous-dossier **`tests/`**, au plus près du code testé (`src/engine/units/tests/unit.model.test.ts` teste `src/engine/units/unit.model.ts`). Aucun dossier `tests/` vide n'est créé. Vitest les découvre par leur suffixe `.test.ts`.

## Blocs de séparation par sujet

Dans un fichier où cohabitent **plusieurs sections significatives** (par exemple les commandes d'unités et de porte-avions de `mission-commands.service.ts`, ou le relief, les itinéraires et les cartes de mission de `generate.service.ts`), les groupes de constantes et de fonctions sont introduits par un bloc de titre court :

```ts
/*****************************
 *
 * PARTIE PORTE-AVIONS
 *
 *****************************/
```

Ces blocs ne sont pas ajoutés aux fichiers simples, et ne justifient pas de découper un fichier en plusieurs.

## Organisation des features

- Une feature (`src/features/<nom>/`) contient `components/` (composants React), `services/` (hooks et logique pure ; leurs tests sont dans `services/tests/`) et un `index.ts` qui exporte uniquement ce que les autres features utilisent. Un sous-dossier vide n'est pas créé.
- **Une feature n'importe une autre feature que par son `index.ts`**, jamais par un chemin profond (`../../fleet`, pas `../../fleet/components/UnitStats`). Il en va de même pour `app/` et `store/`. ESLint l'impose (`no-restricted-imports`).
- Dans une feature, les fichiers s'importent par chemin relatif (`../services/…`).

## Intégration continue

Le workflow `.github/workflows/ci.yml` s'exécute à chaque Pull Request vers `main` (Node.js 22) : `npm ci`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`. Une PR n'est mergeable qu'avec ces contrôles au vert ; ils sont identiques à ceux à lancer en local. Aucun autre outil ni service n'est utilisé.

## Tests

Priorité aux tests unitaires du moteur : commandes et erreurs, calculs de déplacement, contacts et observations filtrées, combat, transitions et conditions terminales selon les règles fonctionnelles.

Compléter par des tests de persistance (validation, reprise) et quelques tests d'intégration des parcours critiques. Les tirages aléatoires doivent être contrôlables dans les tests. Ne pas tester des règles non encore arbitrées.

## Progression de développement

1. **Socle** : React, TypeScript, Material UI, lint, formatage et tests.
2. **Moteur minimal** : `GameState`, commandes, configuration et store principal.
3. **Préparation et carte** : génération, affichage et premières interactions.
4. **Première séquence jouable** : commandes, résolution et sauvegarde.
5. **Fonctionnalités métier complémentaires** : détection, combat, IA, missions, selon les arbitrages disponibles.
6. **Fiabilisation** : débriefing, cas limites et tests d'intégration.

Chaque incrément doit être testable. Les décisions fonctionnelles ouvertes dans [DECISIONS.md](../functional-specs/DECISIONS.md) nécessitent un arbitrage avant l'implémentation concernée.

## Hors périmètre V1

Backend Flask, OpenAPI, MongoDB, synchronisation distante, multijoueur temps réel, event sourcing, rejeu intégral et microservices. Leur éventuelle introduction future dépendra d'un besoin avéré, pas d'une anticipation architecturale.
