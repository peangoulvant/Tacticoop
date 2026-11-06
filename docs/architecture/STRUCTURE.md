# Structure et dépendances — Tacticoop V1

## Organisation cible

Architecture de **monolithe frontend modulaire**. L'arborescence est indicative : créer un dossier seulement lorsqu'un besoin concret le justifie.

```text
src/
  app/                   # Initialisation React et thème Material UI
  engine/
    core/                # Types métier, commandes, résultats
    map/                 # Calculs hexagonaux et déplacements
    units/               # Modèle des unités
    detection/           # Contacts et observations filtrées
    combat/              # Résolution des combats
    ai/                  # Décisions du camp Hostile
    missions/            # Coordination des missions et des phases
    config/              # Paramètres de jeu
  features/
    mission-setup/       # Préparation de partie
    tactical-map/        # Affichage et interactions avec la carte
    fleet/               # Présentation des forces
    commands/            # Interface des commandes
    logbook/             # Journal
    debriefing/          # Bilan
                         # Chaque feature : components/, services/ (hooks et logique pure), index.ts
  store/                 # Zustand et coordination de l'application
  persistence/           # IndexedDB, format et validation des sauvegardes JSON
  shared/                # Utilitaires réellement communs
```

## Responsabilités et dépendances

- `engine/` : règles et calculs métier en TypeScript ; aucune dépendance à React, Zustand, Material UI ou IndexedDB.
- `features/` : composants React, présentation et interactions ; aucune règle métier dupliquée. Chaque feature range ses composants dans `components/`, ses hooks et sa logique pure dans `services/`, et exporte ce qui est public par son `index.ts` (dossiers créés au besoin).
- `store/` : état applicatif, sélection et transmission des commandes ; ne réimplémente pas le moteur.
- `persistence/` : sérialisation, validation et stockage ; ne décide d'aucune règle de jeu.
- `shared/` : éléments transversaux uniquement ; éviter d'en faire un dossier fourre-tout. Toutes les couches peuvent l'utiliser, le moteur compris, pour récupérer des éléments sans dépendance. `shared/label-engine.ts` rassemble les textes que le moteur présente au joueur (refus, motifs de blocage) : objets simples sans import du moteur, dont le moteur vérifie les clés avec `satisfies`. `shared/labels.ts` et `shared/assets.ts` dépendent du moteur : celui-ci ne les importe pas.

Dépendances usuelles : `features → store → engine` et `store → persistence`. Les modules du moteur se composent sans dépendances circulaires. Éviter les abstractions de type microservices, plugin system ou backend fictif.

## Terminologie

Les nouveaux noms de types et fonctions métier utilisent **`Friend`** (camp ami) et **`Hostile`** (camp hostile), notamment `FriendObservation` et `HostileObservation`. Les textes fonctionnels et d'interface peuvent conserver les termes français.

## Conventions techniques

**Coordonnées hexagonales.** Hexagones « pointy-top » (pointe en haut), coordonnées de type *offset* `(col, row)` avec **décalage des lignes impaires** d'une demi-largeur vers la droite ; l'origine `(0,0)` est en haut à gauche. Les distances, voisins et lignes sont calculés en coordonnées axiales, converties en interne (`engine/map/hex.ts`). Les coordonnées présentées au joueur et dans le journal sont les coordonnées *offset*. Ce choix est technique et n'ajoute aucune règle de jeu.

