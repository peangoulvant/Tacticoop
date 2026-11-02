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
  store/                 # Zustand et coordination de l'application
  persistence/           # IndexedDB, import et export JSON
  shared/                # Utilitaires réellement communs
```

## Responsabilités et dépendances

- `engine/` : règles et calculs métier en TypeScript ; aucune dépendance à React, Zustand, Material UI ou IndexedDB.
- `features/` : composants React, présentation et interactions ; aucune règle métier dupliquée.
- `store/` : état applicatif, sélection et transmission des commandes ; ne réimplémente pas le moteur.
- `persistence/` : sérialisation, validation et stockage ; ne décide d'aucune règle de jeu.
- `shared/` : éléments transversaux uniquement ; éviter d'en faire un dossier fourre-tout.

Dépendances usuelles : `features → store → engine` et `store → persistence`. Les modules du moteur se composent sans dépendances circulaires. Éviter les abstractions de type microservices, plugin system ou backend fictif.

## Terminologie

Les nouveaux noms de types et fonctions métier utilisent **`Friend`** (camp ami) et **`Hostile`** (camp hostile), notamment `FriendObservation` et `HostileObservation`. Les textes fonctionnels et d'interface peuvent conserver les termes français.
