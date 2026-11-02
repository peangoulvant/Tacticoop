# Architecture technique — Tacticoop V1

**Statut :** architecture validée (AT-01 à AT-04). Document de conception, sans implémentation.
**Portée :** application web autonome, jouable localement, destinée au travail collectif et au débriefing factuel.
**Références :** [Game Design](../game-design/README.md), [spécifications fonctionnelles](../functional-specs/README.md) et [décisions fonctionnelles ouvertes](../functional-specs/DECISIONS.md).

## 1. Objectifs et principes

- Une V1 **100 % frontend**, sans Flask, API OpenAPI, MongoDB ni infrastructure serveur.
- React + TypeScript pour l'interface, Material UI pour les composants, Zustand pour l'état applicatif, IndexedDB pour la persistance locale.
- **Monolithe frontend modulaire** : moteur métier TypeScript indépendant de React, Zustand, Material UI et IndexedDB.
- Séparer strictement **règles du jeu**, **orchestration des commandes**, **état de présentation** et **stockage**.
- Favoriser la simplicité, la lisibilité, les tests et une progression par incréments jouables. Ne pas introduire de frameworks d'architecture ou de mécanismes superflus.
- Le Game Design et les SF restent les sources de vérité du gameplay. Une architecture technique ne valide aucune décision fonctionnelle encore ouverte.

## 2. Décisions techniques actées

| ID | Choix | Conséquence |
|---|---|---|
| AT-01 | **A — Moteur fonctionnel à état explicite** | Les règles reçoivent des données et retournent des résultats, sans dépendre des stores ni de l'interface. |
| AT-02 | **B — IndexedDB + export/import JSON** | Sauvegarde automatique locale et copie portable indépendante du navigateur. |
| AT-03 | **A — GameState central structuré par domaines** | Une source de vérité métier ; stores Zustand spécialisés pour l'interface et la préparation. |
| AT-04 | **A — Point d'entrée unique executeCommand()** | Validation et résolution centralisées, modules métier séparés. |

**AT-05 (hasard) :** retiré de la liste des arbitrages. Chaque nouvelle partie est unique ; le hasard est un détail technique. Les tests doivent pouvoir contrôler les tirages, et la sauvegarde doit permettre de reprendre une partie correctement. Aucun rejeu intégral ni mécanisme de reproduction de partie n'est demandé.

## 3. Terminologie

Dans les nouveaux types, fonctions et modules métier en anglais :
- **Friend** : camp ami ; `FriendUnit`, `FriendObservation`, etc.
- **Hostile** : camp hostile ; `HostileUnit`, `HostileObservation`, etc.
- Ne pas introduire `Allied` ni `Enemy` dans les nouveaux noms métier.
- Les documents fonctionnels et textes de l'interface peuvent rester rédigés en français (« allié », « ennemi »).

## 4. Organisation cible des fichiers

Arborescence **indicative** : n'ajouter un fichier ou sous-module que lorsqu'il sert réellement le développement.

```text
src/
  app/                    # Initialisation React, thème MUI, composition
  engine/
    core/                 # GameState, GameCommand, CommandResult, executeCommand
    map/                  # Carte hexagonale, terrains, déplacements
    units/                # Unités, caractéristiques, composants
    detection/            # Contacts, observations, brouillard de guerre
    combat/               # Armes, projectiles, défenses, dégâts
    ai/                   # Choix des actions Hostile à partir d'observations
    missions/             # Objectifs, cycles, fin de mission, porte-avions
    config/               # Paramètres de jeu configurables
  features/
    mission-setup/        # Préparation et sélection des forces
    tactical-map/         # Carte et interactions
    fleet/                # Fiches des unités
    commands/             # Commandes et confirmations
    logbook/              # Journal de bord
    debriefing/           # Résultat et bilan factuel
  store/                  # Stores Zustand et coordination UI ↔ moteur
  persistence/            # IndexedDB, versionnement, export/import JSON
  shared/                 # Utilitaires et types véritablement partagés
docs/
  game-design/
  functional-specs/
  architecture/
```

**Dépendances autorisées :** `features → store → engine` ; `store → persistence` pour sauvegarder/charger. `engine` ne dépend ni de React, ni de Zustand, ni d'IndexedDB. `persistence` sérialise des données métier mais ne décide d'aucune règle de jeu. Les modules `engine` peuvent se composer entre eux sans créer de dépendances circulaires.

## 5. GameState et stores Zustand

`GameState` contient **l'état réel complet** de la partie, structuré par domaines : carte, unités Friend et Hostile, contacts, projectiles, phase/cycle, mission, événements utiles, configuration et informations nécessaires à la reprise. La forme exacte des types sera définie lors de l'implémentation, en suivant les SF.

- `useGameStore` détient le `GameState` courant, appelle `executeCommand`, publie le résultat et déclenche la persistance.
- Des stores spécialisés (ex. `useMapUiStore`, `useSelectionStore`, `useSetupStore`, `usePreferencesStore`) gèrent les besoins propres à leur section : zoom, unité sélectionnée par identifiant, brouillon de préparation, préférences.
- **Ne pas dupliquer** les PV, stocks, positions, contacts ou autres données métier dans plusieurs stores. Exemple : le store de sélection conserve `selectedUnitId`, pas une copie de l'unité.
- Ne pas créer automatiquement un store par domaine du `GameState` : les sous-domaines métier restent dans la source de vérité unique. Créer un store supplémentaire seulement pour un besoin réel d'interface.
- Le moteur ne lit ni n'écrit directement dans les stores.

## 6. Contrat du moteur

Point d'entrée conceptuel :

```ts
function executeCommand(
  state: GameState,
  command: GameCommand,
  config: GameConfig
): CommandResult;
```

`CommandResult` exprime soit un **succès** (nouvel état + événements produits), soit un **échec métier** (raison explicite, état inchangé). Le typage concret est à définir sans complexité artificielle.

**Règles d'exécution :**
1. Le store transmet une commande explicite (mouvement, action spéciale, fin d'activation, etc.).
2. Le moteur valide les préconditions et applique les règles via les modules spécialisés.
3. Il résout les conséquences automatiques déclenchées par la commande, dans l'ordre défini par GDD/SF.
4. Il retourne un résultat cohérent ; le store met à jour l'interface puis sauvegarde l'état.
5. Une commande invalide ne consomme pas d'activation et ne modifie pas le `GameState` ; une action valide mais infructueuse suit les règles fonctionnelles de consommation d'action.

Le moteur ne doit pas muter l'état d'entrée à l'insu de l'appelant. Éviter d'exposer à l'UI des étapes intermédiaires incohérentes. Le journal exploite les événements produits par le moteur, filtrés selon les informations accessibles.

### Cycles et projectiles : préserver les règles existantes

- Une activation Friend : au maximum un mouvement et une action spéciale facultative, dans l'ordre permis par les SF, puis fin explicite d'activation.
- Réaction d'une unité Hostile disponible, selon les règles d'IA et de détection.
- **Après chaque paire Friend / Hostile :** progression simultanée des missiles et torpilles et résolution des conséquences prévues.
- Les activations Hostile restantes en fin de cycle **ne provoquent pas** de progression supplémentaire des projectiles.
- Navigation automatique du porte-avions en fin de cycle, sans progression supplémentaire des projectiles ; détection passive et synthèse selon les règles fonctionnelles.
- Les conditions de fin de mission, les menaces en vol et l'ordre des phases respectent G-06/G-09/G-13 et SF-03/SF-05/SF-08. Ne pas inventer un nouvel ordre de résolution pour les points encore ouverts.

## 7. Brouillard de guerre et IA

- `GameState` est l'état réel complet ; il ne doit pas être transmis tel quel aux composants affichant les informations tactiques.
- Produire des projections filtrées `FriendObservation` et `HostileObservation` depuis l'état réel, conformément aux contacts et à la visibilité autorisée.
- L'interface tactique Friend ne lit que les données autorisées ; les messages du journal et les fiches de contact ne révèlent pas d'informations Hostile non détectées.
- L'IA choisit ses actions **uniquement à partir de `HostileObservation`**, de la configuration autorisée et de règles métier : pas d'omniscience.
- Une interface de type `chooseAction(observation, config)` est envisageable ; les critères « Classique » / « Expert » restent soumis aux arbitrages fonctionnels D-08 et D-13.
- Limite assumée du frontend autonome : les données complètes peuvent être inspectées via les outils de développement du navigateur. Le brouillard de guerre est une règle d'interface et de moteur, **pas une protection contre un utilisateur malveillant**.

## 8. Paramétrage et hasard

- Centraliser les valeurs réglables dans `GameConfig` ou des catalogues de configuration, sans nombres métier dispersés dans les composants.
- Respecter les valeurs provisoires et les décisions ouvertes du registre fonctionnel : ne pas transformer un paramètre de test en règle définitive.
- Une nouvelle partie initialise une carte et une situation propres à cette partie.
- Isoler les tirages aléatoires derrière une petite fonction ou interface testable ; conserver dans la sauvegarde les informations requises pour reprendre correctement une partie. Pas d'exigence de rejouer exactement une partie complète à partir d'une graine.

## 9. Persistance : IndexedDB et JSON

- **IndexedDB** : sauvegarde locale automatique après chaque séquence métier cohérente, notamment après la résolution d'une activation et de ses conséquences ; ne pas enregistrer un état intermédiaire incomplet.
- **Export/import JSON** : copie portable initiée par l'utilisateur, pour sauvegarde indépendante du navigateur et transfert éventuel.
- Définir un format de sauvegarde **versionné** (ex. `schemaVersion`) avec validation au chargement ; signaler clairement les sauvegardes invalides ou incompatibles, sans les interpréter silencieusement.
- Prévoir un comportement clair en cas d'échec de lecture/écriture, sans prétendre qu'une sauvegarde a réussi.
- Une actualisation ou une mise à jour normale du navigateur ne supprime généralement pas IndexedDB ; effacement des données du site, navigation privée, profil réinitialisé ou politique d'éviction peuvent néanmoins entraîner une perte. L'export JSON reste la protection indépendante.
- Ne pas utiliser MongoDB : cela impliquerait une infrastructure serveur ou un service externe contraire à la V1 autonome.

## 10. Qualité, lisibilité et tests

**Public cible :** développement et maintenance par un développeur autonome d'expérience junior à intermédiaire/confirmée (~7 ans), assisté éventuellement par Claude Code. La simplicité prévaut sur la sophistication.

- TypeScript `strict` ; éviter `any`, conversions risquées et objets de configuration implicites.
- ESLint + formateur automatique (ex. Prettier) ; compilation et lint sans erreurs.
- Fonctions courtes et centrées sur une responsabilité, noms explicites, dépendances limitées ; pas de seuil arbitraire de lignes par fichier ou fonction.
- Commentaires **sur le pourquoi** (règles métier, cas limites, ordre de résolution), pas sur les opérations évidentes ; JSDoc ciblé pour les contrats publics et mécanismes délicats.
- Éviter duplication, imbrication excessive, effets de bord cachés, abstractions prématurées et sur-découpage.
- Tests unitaires prioritaires sur `engine/` : commandes invalides, déplacement, détection, contacts, brouillard de guerre, séquences d'activation, projectiles, dégâts, fin de mission.
- Tests spécifiques : l'IA ne voit pas les données Hostile/ Friend interdites par son observation ; sauvegarde/chargement et export/import JSON conservent un état valide ; reprise sans corruption.
- Tests de composants et parcours d'intégration ciblés pour les interactions critiques. Les tirages aléatoires doivent être contrôlables dans les tests.
- Ne pas ajouter d'outils de qualimétrie lourds ni d'obligations documentaires disproportionnées à la V1.

## 11. Développement incrémental

1. **Socle** : application React/TS/MUI, lint/format, tests, arborescence minimale.
2. **État et commandes** : types essentiels, `executeCommand`, Zustand, configuration.
3. **Carte et préparation** : génération hexagonale, sélection des forces, mission initiale.
4. **Premier cycle jouable** : déplacement, action, réaction Hostile, journal, sauvegarde.
5. **Détection et combat** : contacts filtrés, armes, projectiles, dégâts et défenses, selon les règles effectivement arbitrées.
6. **Missions complètes** : lutte navale, escorte du porte-avions, verdict, débriefing factuel.
7. **Fiabilisation** : cas limites, export/import, tests d'intégration et ergonomie.

Chaque étape doit rester exécutable et testable. Ne pas développer une infrastructure générale avant d'en avoir besoin.

## 12. Points explicitement non décidés

Cette architecture ne tranche **aucun** arbitrage de gameplay encore ouvert dans [DECISIONS.md](../functional-specs/DECISIONS.md), notamment les compléments sur actions spéciales, combat, zones de détection, critères de difficulté et comportements de l'IA. Un agent de développement doit demander une décision ou différer la fonctionnalité concernée, jamais inventer une règle.

**Hors périmètre V1 :** backend Flask, API OpenAPI, MongoDB, synchronisation multi-navigateurs, authentification, serveur multijoueur, event sourcing, rejeu intégral, architecture microservices.

**Évolution possible :** si un besoin réel de collaboration simultanée ou de sauvegarde centralisée apparaît, un backend pourra être introduit ultérieurement grâce à l'indépendance du moteur. Aucun choix de backend n'est pris aujourd'hui.
