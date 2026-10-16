# Agents - Tacticoop

Consignes communes aux contributions dans ce dépôt.

## Organisation

- `client/` contient le frontend ; suivre aussi `client/AGENTS.md` pour toute
  modification dans ce dossier.
- `server/` contient le backend ; suivre aussi `server/AGENTS.md` pour toute
  modification dans ce dossier.
- Garder les changements dans le dossier responsable et coordonner les deux
  côtés lorsqu'un contrat partagé évolue.

## Règles de travail

- Lire les fichiers voisins et la configuration existante avant de modifier le
  code ; privilégier les patterns déjà établis.
- Limiter chaque changement au besoin demandé et ne pas réécrire du code sans
  lien avec celui-ci.
- Ne pas supposer de langage, framework, outil ou commande : vérifier les
  manifests et scripts du dossier concerné.
- Ajouter ou adapter les tests correspondant au comportement modifié, puis
  exécuter les contrôles pertinents disponibles.
- Ne pas modifier de fichiers générés ni de dépendances sans nécessité.
- Ne jamais ajouter de secrets ou de valeurs de variables d'environnement dans
  le dépôt. Documenter uniquement leurs noms.
- Mettre à jour la documentation lorsque les commandes, contrats ou décisions
  d'architecture changent.

## Informations à compléter

La stack, les commandes de développement, les tests, le déploiement et les
variables d'environnement ne sont pas encore décrits dans le dépôt. Les
renseigner à partir de la configuration réelle lorsqu'elle sera disponible.
