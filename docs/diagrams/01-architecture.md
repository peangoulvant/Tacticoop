# 1. Architecture générale

Les grandes couches de l'application, de l'écran jusqu'au stockage. Le moteur de règles ne dépend de rien : c'est le cœur, que le reste appelle.

```mermaid
flowchart TB
    joueur(["Joueur"]):::ext
    idb[("IndexedDB<br/>sauvegarde automatique")]:::ext

    subgraph navigateur["Application (navigateur)"]
        app["app<br/>point d'entrée et thème"]:::ui
        features["features<br/>écrans React"]:::ui
        shared["shared<br/>textes et ressources"]:::ui
        store["store<br/>état de la partie et brouillons"]:::state
        persistence["persistence<br/>format et validation des sauvegardes"]:::state
        engine["engine<br/>règles du jeu"]:::core
    end

    joueur --> app
    app --> features
    features -->|"commandes et lecture"| store
    features --> shared
    store -->|"executeCommand<br/>observeFriend"| engine
    store -->|"sauvegarder et reprendre"| persistence
    persistence -->|"types et validation"| engine
    persistence --> idb
    engine -.->|"messages d'erreur"| shared

    classDef ui fill:#dbeafe,stroke:#2563eb,color:#111
    classDef state fill:#fef3c7,stroke:#d97706,color:#111
    classDef core fill:#dcfce7,stroke:#16a34a,color:#111
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#111
```

## Lecture

- **Le sens des flèches est celui des appels** : l'interface parle au store, le store parle au moteur. Jamais l'inverse.
- **Le moteur est pur** : ni React, ni Zustand, ni IndexedDB. Il reçoit un état et une commande, il renvoie un nouvel état et des événements.
- **L'interface ne calcule aucune règle** : elle demande au moteur, et ne lit que ce que le joueur a le droit de savoir (`observeFriend`).
- **La persistance n'est connue que du store** (règle ESLint).

Voir aussi : [Guide du développeur](../architecture/GUIDE-DEVELOPPEUR.md), [Structure](../architecture/STRUCTURE.md).
