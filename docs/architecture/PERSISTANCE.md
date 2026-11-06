# Persistance locale — Tacticoop V1

## Décision AT-02

Utiliser **IndexedDB** pour les sauvegardes automatiques et un **fichier JSON** pour l'export/import manuel. La V1 reste autonome, sans serveur ni MongoDB.

## Responsabilités

- Sauvegarder un `GameState` cohérent après une séquence métier complète ; ne pas enregistrer d'état intermédiaire incomplet.
- Restaurer la partie depuis IndexedDB ou depuis un fichier JSON importé.
- Sérialiser dans un format versionné (par exemple `schemaVersion`) et vérifier les données avant chargement.
- Signaler les données incompatibles, invalides ou les échecs de lecture/écriture. Ne pas afficher une sauvegarde comme réussie avant confirmation.
- Garder les appels IndexedDB hors de `engine/` ; le moteur ne connaît que les données métier.

## Conservation et limites

Le rafraîchissement de page et une mise à jour ordinaire du navigateur ne suppriment généralement pas IndexedDB. En revanche, la suppression des données du site, une réinitialisation du profil, la navigation privée ou une éviction du stockage peuvent entraîner une perte.

L'export JSON permet de conserver une copie indépendante du navigateur. Aucune synchronisation distante ni gestion multi-utilisateur simultanée n'est prévue en V1.

## Comportement V1 (arbitrage G-01.7, partie « sauvegardes »)

Décidé avec le propriétaire en novembre 2026 (AB-08) ; les interprétations non tranchées par les spécifications ont été validées avec lui.

- **Un seul emplacement** : la « partie en cours », écrasée après chaque séquence complète. Seule une **mission en cours** est sauvegardée, jamais la préparation. Une mission gagnée est sauvegardée aussi ; la sauvegarde est effacée au retour à la préparation (« Nouvelle partie » ou abandon).
- **Reprise au démarrage** : si une partie existe, l'écran de préparation propose « Reprendre la partie en cours » ou « Nouvelle partie ». Rien n'est restauré sans accord. Lancer une nouvelle mission écrase la sauvegarde sans avertissement.
- **Contenu** : l'état de la partie et le journal de bord. La sélection et les brouillons d'action relèvent de l'interface et ne sont jamais sauvegardés.
- **Version incompatible ou données invalides** : refus total avec un message clair, rien n'est chargé à moitié. Aucune migration en V1.
- **Export et import JSON** : l'export est proposé pendant la mission, désactivé pendant une activation en cours (l'état serait incomplet). L'import n'est proposé que depuis l'écran de préparation, jamais pendant une mission. Fichier exporté : `tacticoop-AAAAMMJJ-HHMM.json`.
- **Échec de stockage** (IndexedDB indisponible, navigation privée) : avertissement non bloquant, la partie continue et l'export manuel reste possible. Une sauvegarde n'est annoncée réussie qu'après confirmation de l'écriture.
- Une commande refusée par le moteur ne modifie pas l'état et ne déclenche aucune écriture.

## Format et module `src/persistence/`

Fichier JSON : `{ schemaVersion: 1, savedAt, state, events }`, avec `state` une `MissionState` et `events` le journal. Aucun hasard n'est conservé : la carte est dans l'état, et les graines ne servent qu'au lancement.

La validation est écrite à la main et refuse la sauvegarde au premier problème : JSON illisible, version inconnue, valeurs inconnues (terrains, classes de bâtiment, états d'activation, types d'événement, ordres du porte-avions), tableau de terrains de taille inattendue, cases hors carte, identifiants ou cases en double, porte-avions absent en escorte ou présent hors escorte, navigation du porte-avions incohérente, activation en cours. Elle ne vérifie ni l'équilibrage (PV, stocks) ni la navigabilité des cases, qui dépendent de valeurs provisoires.

Le module sépare trois responsabilités, une par dossier ou fichier, derrière un seul point d'entrée (`index.ts`) :

| Responsabilité | Fichier | Rôle |
|---|---|---|
| Format et validation | `format/saveFormat.ts` | version, codes d'erreur, `serializeSave()`, `parseSave()` |
| | `format/validation.ts`, `format/guards.ts` | contrôles de l'état et du journal (internes au dossier) |
| Contrat de stockage | `storage/saveStorage.ts` | interface `SaveStorage` (lire, écrire, effacer), sans implémentation |
| Stockage IndexedDB | `storage/indexedDbStorage.ts` | implémentation native, confirmée à la fin de la transaction ; la connexion est rouverte si le navigateur la ferme |

Le stockage ne connaît ni le format ni le moteur : il reçoit et rend du JSON. Il n'existe **aucun repli en mémoire** : si IndexedDB est indisponible, l'écriture échoue et le store avertit le joueur (AB-08), au lieu de faire passer pour réussie une sauvegarde perdue au rechargement.

Le module n'est utilisé que par le store (`features → store → persistence`) : une règle ESLint interdit à tout le reste (features, `app/`, `shared/`) de l'importer, et lui interdit d'importer le store, les features et l'app. Au sein du store, un module dédié à la sauvegarde s'abonne à l'état du jeu et parle à la persistance : `useGameStore` n'en dépend pas. Le module n'est pas encore raccordé (PR C2).
