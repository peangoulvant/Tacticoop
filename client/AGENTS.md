# Agents - client

Ces consignes s'appliquent au frontend situé dans `client/`.

## Périmètre

- Garder ici le code, les tests et la configuration appartenant au client.
- Pour un changement de contrat API, vérifier le comportement du serveur dans
	`server/` et coordonner les deux côtés si nécessaire.
- Éviter de modifier le backend pour contourner un problème d'affichage ou de
	validation côté client.

## Conventions

- Avant de choisir une bibliothèque ou un pattern, examiner les fichiers
	voisins et les dépendances déjà déclarées dans ce dossier.
- Respecter les conventions existantes de composants, styles, routes,
	validation, gestion d'état et appels API.
- Prévoir les états de chargement, de succès, d'erreur et les cas sans données
	lorsqu'ils s'appliquent à une interface.
- Ne pas inscrire de secrets ni de valeurs propres à une machine dans le code.

## Vérification

- Trouver les commandes disponibles dans les scripts et la documentation du
	client ; ne pas inventer de commandes.
- Exécuter les tests et contrôles pertinents après une modification.
- Mettre à jour les tests ou la documentation lorsque le comportement change.

## À documenter lorsque le code sera présent

- Framework et commandes d'installation, de développement, de test et de build.
- Organisation des pages/composants et stratégie d'appels API.
- Gestion des variables d'environnement (noms uniquement, jamais leurs valeurs).
