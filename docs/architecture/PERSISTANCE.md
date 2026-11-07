# Persistance locale — Tacticoop V1

## Décision AT-02

Utiliser **IndexedDB** pour la sauvegarde automatique de la partie en cours. La V1 reste autonome, sans serveur ni MongoDB. L'export et l'import manuels de fichiers JSON, prévus à l'origine, sont **retirés du périmètre V1** (AB-10) : voir « Hors périmètre V1 ».

## Responsabilités

- Sauvegarder un `GameState` cohérent après une séquence métier complète ; ne pas enregistrer d'état intermédiaire incomplet.
- Restaurer la partie depuis IndexedDB.
- Sérialiser dans un format versionné (par exemple `schemaVersion`) et vérifier les données avant chargement.
- Signaler les données incompatibles, invalides ou les échecs de lecture/écriture. Ne pas afficher une sauvegarde comme réussie avant confirmation.
- Garder les appels IndexedDB hors de `engine/` ; le moteur ne connaît que les données métier.

## Conservation et limites

Le rafraîchissement de page et une mise à jour ordinaire du navigateur ne suppriment généralement pas IndexedDB. En revanche, la suppression des données du site, une réinitialisation du profil, la navigation privée ou une éviction du stockage peuvent entraîner une perte.

Aucune copie indépendante du navigateur n'est proposée en V1 (pas d'export manuel). Aucune synchronisation distante ni gestion multi-utilisateur simultanée n'est prévue en V1.

## Comportement V1 (arbitrage G-01.7, partie « sauvegardes »)

Décidé avec le propriétaire en novembre 2026 (AB-08) ; les interprétations non tranchées par les spécifications ont été validées avec lui.

- **Un seul emplacement** : la « partie en cours », écrasée après chaque séquence complète. Seule une **mission en cours** est sauvegardée, jamais la préparation. Une mission gagnée est sauvegardée aussi ; la sauvegarde est effacée au retour à la préparation (« Nouvelle partie » ou abandon).
- **Reprise au démarrage** : si une partie existe, l'écran de préparation propose « Reprendre la partie en cours » ou « Nouvelle partie ». Rien n'est restauré sans accord. Lancer une nouvelle mission écrase la sauvegarde sans avertissement.
- **Contenu** : l'état de la partie et le journal de bord. La sélection et les brouillons d'action relèvent de l'interface et ne sont jamais sauvegardés.
- **Version incompatible ou données invalides** : aucune migration en V1, et rien n'est jamais chargé à moitié. Une **sauvegarde automatique** illisible ou incompatible au démarrage est traitée comme **absente** : aucun message, aucun bouton de suppression, et elle n'est **pas effacée** (décision du propriétaire, pour éviter une complexité inutile). Elle est écrasée au lancement de la mission suivante.
- **Échec de stockage** (IndexedDB indisponible, quota, navigation privée) : avertissement non bloquant dans la barre du haut, jusqu'à la prochaine écriture réussie ; la partie continue. « Sauvegardée à HH:MM » n'est affiché qu'après confirmation de l'écriture. Aucun repli en mémoire.
- Une commande refusée par le moteur ne modifie pas l'état et ne déclenche aucune écriture.
- **« Nouvelle partie » sur le bandeau de reprise** masque le bandeau mais garde la sauvegarde jusqu'au lancement suivant (rechargée, elle est de nouveau proposée). Le bandeau indique mission, cycle, date et heure locales, et n'apparaît qu'une fois la lecture terminée.

## Format et module `src/persistence/`

Contenu stocké dans IndexedDB, sérialisé en JSON : `{ schemaVersion: 1, savedAt, state, events }`, avec `state` une `MissionState` et `events` le journal. Aucun hasard n'est conservé : la carte est dans l'état, et les graines ne servent qu'au lancement.

La validation est écrite à la main et refuse la sauvegarde au premier problème : JSON illisible, version inconnue, valeurs inconnues (terrains, classes de bâtiment, états d'activation, types d'événement, ordres du porte-avions), tableau de terrains de taille inattendue, cases hors carte, identifiants ou cases en double, porte-avions absent en escorte ou présent hors escorte, navigation du porte-avions incohérente, activation en cours. Elle ne vérifie ni l'équilibrage (PV, stocks) ni la navigabilité des cases, qui dépendent de valeurs provisoires.

Le module sépare trois responsabilités, une par dossier ou fichier, derrière un seul point d'entrée (`index.ts`) :

| Responsabilité | Fichier | Rôle |
|---|---|---|
| Format et validation | `format/save-format.service.ts` | version, codes d'erreur, `serializeSave()`, `parseSave()` |
| | `format/save.validator.ts`, `format/guards.validator.ts` | contrôles de l'état et du journal (internes au dossier) |
| Contrat de stockage | `storage/save-storage.types.ts` | interface `SaveStorage` (lire, écrire, effacer), sans implémentation |
| Stockage IndexedDB | `storage/indexed-db-storage.service.ts` | implémentation native, confirmée à la fin de la transaction ; la connexion est rouverte si le navigateur la ferme |

Le stockage ne connaît ni le format ni le moteur : il reçoit et rend du JSON. Il n'existe **aucun repli en mémoire** : si IndexedDB est indisponible, l'écriture échoue et le store avertit le joueur (AB-08), au lieu de faire passer pour réussie une sauvegarde perdue au rechargement.

Le module n'est utilisé que par le store (`features → store → persistence`) : une règle ESLint interdit à tout le reste (features, `app/`, `shared/`) de l'importer, et lui interdit d'importer le store, les features et l'app. Au sein du store, un module dédié à la sauvegarde s'abonne à l'état du jeu et parle à la persistance : `useGameStore` n'en dépend pas. 

## Branchement dans le store (C2)

Tout est dans `src/store/` ; `useGameStore` ne dépend pas de la persistance.

| Fichier | Rôle |
|---|---|
| `auto-save.service.ts` | `startAutoSave()` s'abonne à `useGameStore`. Écriture quand `state` change, que la mission est en cours et qu'**aucune activation n'est en cours** ; effacement au passage d'une mission à la préparation ; changements de `lastError` ou du seul journal ignorés. Les travaux passent par une file : un seul s'exécute, un seul attend, et le plus récent remplace celui qui attend. |
| `save.store.ts` | sauvegarde trouvée au démarrage (`found`), échec d'écriture (`writeFailed`), heure de la dernière écriture **confirmée** (`lastSavedAt`) |
| `start-persistence.service.ts` | appelée par `app/main.tsx` : branche la sauvegarde automatique, lit et valide la sauvegarde. Une proposition n'est publiée que si le joueur n'a pas lancé de mission pendant la lecture |
| `resume-saved-game.service.ts` | action « Reprendre » : `useGameStore.restore()` (simple mutation), puis sélection et brouillons réinitialisés |

Interface : `ResumeBanner` (écran de préparation) et `SaveStatus` (barre du haut). Les textes sont dans `shared/ui.label.ts` (`saveText`).

## Évolution du format : point de vigilance

- Les validateurs de `format/` sont **écrits à la main** : un champ ajouté à l'état du moteur n'y est pas contrôlé tant qu'on ne les met pas à jour (risque de dérive).
- Tout changement de la **forme de l'état** (`MissionState`, `Unit`, `GameEvent`…) impose de **monter `schemaVersion`** et d'**arbitrer le sort des anciennes sauvegardes** : migration, message ou suppression. Comme une sauvegarde automatique incompatible est traitée comme absente sans message, elle serait sinon perdue en silence au prochain lancement.

## Limite connue

Deux onglets ouverts sur la même partie s'écrasent : **le dernier qui écrit gagne**. Aucune détection en V1 (pas de multi-utilisateur, voir « Conservation et limites »).

## Hors périmètre V1 : export et import manuels de fichiers JSON

Décision du propriétaire (AB-10) : l'export et l'import manuels de fichiers JSON sont retirés de la V1 ; ils pourront être réévalués après la V1 s'ils présentent un intérêt réel. Ne sont **pas** concernés et restent indispensables : la sérialisation JSON interne stockée dans IndexedDB, sa validation stricte (`parseSave`), le versionnement du format (`schemaVersion`) et la reprise de la partie en cours. Le contrat `SaveStorage` n'est pas modifié. Si l'import revient un jour, il devra décider des messages de refus à présenter au joueur (une sauvegarde automatique invalide reste, elle, traitée comme absente sans message).
