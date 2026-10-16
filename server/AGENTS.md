# Agents - serveur

Ces consignes s'appliquent au backend situé dans `server/`.

## Périmètre

- Garder ici le code, les tests et la configuration appartenant au serveur.
- Considérer les contrats API comme une interface partagée avec `client/` ;
	vérifier les usages côté client avant de les modifier.
- Ne pas changer le comportement frontend dans le cadre d'une modification
	backend, sauf si le changement de contrat l'exige.

## Conventions

- Avant de choisir une bibliothèque ou un pattern, examiner les fichiers
	voisins et les dépendances déjà déclarées dans ce dossier.
- Respecter les conventions existantes pour les routes, services, modèles,
	validation, authentification et gestion des erreurs.
- Valider les données aux frontières du système et éviter d'exposer des détails
	internes dans les réponses d'erreur.
- Ne pas inscrire de secrets ni de valeurs propres à une machine dans le code.
- Toute évolution de schéma ou migration doit suivre le mécanisme déjà utilisé
	par le projet et être compatible avec les données existantes.

## Vérification

- Trouver les commandes disponibles dans les scripts et la documentation du
	serveur ; ne pas inventer de commandes.
- Exécuter les tests et contrôles pertinents après une modification.
- Mettre à jour les tests ou la documentation lorsque le comportement change.

## À documenter lorsque le code sera présent

- Framework, stockage et commandes d'installation, de développement et de test.
- Organisation des routes/services et conventions des contrats API.
- Procédure de migrations et noms des variables d'environnement (jamais leurs
	valeurs).
