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

**Implémenté** (`engine/detection/observation.service.ts`) : `observeFriend(mission)` et `observeHostile(mission)` ne gardent que les unités connues du camp. Aucune unité hostile n'est connue du joueur, même identifiée par un balayage : elle n'existe pour lui que sous forme de contact (AB-30). `observeFriend()` projette les contacts en **liste blanche** : `FriendContact` ne porte jamais la cible interne `source` (identifiant du navire réel, AB-26), et marque `stale` (« ancien ») un contact identifié antérieur au cycle courant (AB-27). Le balayage (`engine/detection/sweep.service.ts`, commande `SWEEP`) est résolue à l'action avec `restoreRng(rngState)` ; `FriendObservation.constraints` permet à l'interface d'obtenir la portée effective sans lire l'état réel. Sont déjà branchés sur la projection ami : l'affichage de la carte, les destinations accessibles, le trajet prévu et les motifs de refus d'un déplacement. `HostileObservation` n'est consommée par personne tant que l'IA n'existe pas.

**Déplacement et obstacle non détecté (SF-02 §7).** Le trajet est calculé sur la projection ami (un occupant caché n'y figure pas, donc ni refus « occupée », ni détour). La commande confirmée est ensuite jouée sur l'état réel : l'unité s'arrête au dernier hexagone libre, le déplacement est consommé, et l'événement `UNIT_MOVED` porte `interrupted: true`, présenté par le journal comme « Déplacement interrompu » sans identifier l'obstacle. Le drapeau est optionnel : une sauvegarde existante reste valide, `schemaVersion` n'est donc pas modifié.

L'interface, les contacts et les événements affichés ne doivent pas révéler d'informations masquées. L'IA prend ses décisions à partir de `HostileObservation`, sans accéder directement aux positions réelles non détectées. Les critères de décision non arbitrés restent ouverts dans le registre fonctionnel.

**Limite du frontend autonome :** les outils de développement du navigateur peuvent exposer les données locales complètes. Ce filtrage garantit le comportement attendu du jeu, pas une protection contre l'inspection volontaire.

## Configuration et hasard

Les valeurs réglables sont centralisées dans `GameConfig` ou des catalogues dédiés, sans nombres métier dispersés dans l'UI. Le hasard est isolé pour permettre des tests contrôlés ; la sauvegarde conserve les données nécessaires à la reprise. Aucun système de rejeu intégral n'est requis.

**État du hasard.** `createRng(seed)` renvoie une fonction fermée sur son propre état : aucun état global, deux générateurs de même graine donnent la même suite. Aujourd'hui le hasard ne sert qu'**au lancement** (carte, contraintes tirées) et la graine arrive par la commande ; `MissionState` n'en conserve rien, si bien qu'une mission restaurée est identique à celle qui a été sauvegardée (`rng.service.test.ts`).

**Quand un tirage interviendra en cours de partie** (détection, combat, IA), l'état du générateur (un entier 32 bits pour l'algorithme actuel) devra être conservé dans `MissionState` pour qu'une reprise poursuive la même séquence. Cela modifie la forme de l'état : il faudra alors monter `schemaVersion` et arbitrer le sort des sauvegardes existantes (voir « Évolution du format » dans [PERSISTANCE.md](PERSISTANCE.md)). Arbitré (AB-24) : cela se fera avec la veille (état du générateur dans `MissionState`, `schemaVersion` 2, sauvegardes de version 1 traitées comme absentes, sans migration). Ce n'est **pas fait maintenant** : aucun tirage n'existe après le lancement, et un état de générateur inutilisé compliquerait le moteur et invaliderait les sauvegardes sans bénéfice. Le test « aucune graine dans l'état de la mission » rappellera de faire ce changement en entier.
