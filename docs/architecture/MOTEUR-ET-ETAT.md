# Moteur, état et observations — Tacticoop V1

## Source de vérité métier

`GameState` représente l'état réel complet de la partie, organisé par domaines : carte, unités, contacts, projectiles, phase/cycle et mission. La structure détaillée est définie progressivement selon les spécifications fonctionnelles.

`useGameStore` conserve ce `GameState` et transmet les commandes au moteur. Les stores Zustand spécialisés peuvent gérer le zoom, l'identifiant de l'unité sélectionnée, les préférences ou un formulaire de préparation.

**Ne pas dupliquer les données métier** : un store de sélection garde `selectedUnitId`, pas une seconde copie des PV ou de la position de l'unité. Un domaine de `GameState` ne nécessite pas automatiquement son propre store.

## Contrat des commandes — AT-01 et AT-04

```ts
function executeCommand(
  state: GameState,
  command: GameCommand,
  config: GameConfig
): CommandResult;
```

Ce contrat est conceptuel : les types précis seront définis lors de l'implémentation.

- Le moteur vérifie les préconditions et délègue la résolution aux modules métier concernés.
- Le résultat contient un nouvel état cohérent et les événements produits, ou une erreur métier explicite.
- Une commande rejetée ne modifie pas l'état ; les conséquences d'une commande valide suivent les règles GDD/SF.
- L'état d'entrée ne doit pas être muté à l'insu de l'appelant.
- Les transitions automatiques et leur ordre sont déterminés **par les spécifications**, sans recopier leurs règles dans l'architecture.
- Zustand publie le résultat puis demande sa sauvegarde ; le moteur n'accède pas aux stores.

## Brouillard de guerre et IA

Le moteur produit depuis `GameState` des projections autorisées :
- `FriendObservation` pour l'interface tactique du camp ami ;
- `HostileObservation` pour les décisions de l'IA.

L'interface, les contacts et les événements affichés ne doivent pas révéler d'informations masquées. L'IA prend ses décisions à partir de `HostileObservation`, sans accéder directement aux positions réelles non détectées. Les critères de décision non arbitrés restent ouverts dans le registre fonctionnel.

**Limite du frontend autonome :** les outils de développement du navigateur peuvent exposer les données locales complètes. Ce filtrage garantit le comportement attendu du jeu, pas une protection contre l'inspection volontaire.

## Configuration et hasard

Les valeurs réglables sont centralisées dans `GameConfig` ou des catalogues dédiés, sans nombres métier dispersés dans l'UI. Le hasard est isolé pour permettre des tests contrôlés ; la sauvegarde conserve les données nécessaires à la reprise. Aucun système de rejeu intégral n'est requis.
