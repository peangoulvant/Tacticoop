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
