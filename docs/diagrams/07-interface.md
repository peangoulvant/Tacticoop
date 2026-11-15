# 7. L'interface et le store

Les écrans (`src/features/`) et l'état de l'application (`src/store/`). Une feature n'importe une autre feature que par son `index.ts`.

```mermaid
---
config:
  layout: elk
---
flowchart TB
    subgraph features["`**Écrans (features/)**`"]
        setup["`**mission-setup/**<br>*préparation de la mission*`"]:::ui
        tactique["`**tactical-map/**<br>*écran tactique et carte*`"]:::ui
        flotte["`**fleet/**<br>*forces, fiche d'unité, porte-avions*`"]:::ui
        commandes["`**commands/**<br>*déplacement, balayage, fin de cycle*`"]:::ui
        journal["`**logbook/**<br>*journal de bord*`"]:::ui
        tactique --> flotte
        tactique --> commandes
        tactique --> journal
        flotte --> commandes
    end

    subgraph store["`**Store (store/, Zustand)**`"]
        jeu["`**game.store**<br>*état de la partie et dispatch*`"]:::ui
        brouillons["`**brouillons**<br>*déplacement, balayage, ordre du porte-avions*`"]:::ui
        selection["`**selection**<br>*unité et case choisies*`"]:::ui
        sauvegarde["`**save et auto-save**<br>*sauvegarde et reprise*`"]:::ui
    end

    moteur["`**engine/**<br>*règles du jeu*`"]:::ui

    features -->|"lisent l'état, préparent des actions, envoient des commandes"| store
    store -->|"executeCommand"| moteur

    style features stroke:#fffff,fill:transparent,color:#ffffff
    style store stroke:#fffff,fill:transparent,color:#ffffff

    classDef ui fill:#cccccc,stroke:#6b7280,color:#111
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#111
```

## Lecture

- **`tactical-map` est l'écran principal** : il assemble la carte, les forces, les commandes et le journal.
- **`commands` et `fleet` écrivent dans les brouillons** : une action se prépare, puis se confirme. Un seul brouillon à la fois.
- **Seul `game.store` envoie des commandes au moteur** (via `dispatch`). L'interface lit la vue du joueur, jamais l'état réel.
- **`fleet` dépend de `commands`** (pour démarrer un déplacement), jamais l'inverse.

Voir aussi : [Guide du développeur](../architecture/GUIDE-DEVELOPPEUR.md), [maquette](../maquette/README.md).
