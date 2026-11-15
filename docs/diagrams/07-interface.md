# 7. L'interface et le store

Les écrans (`src/features/`) et l'état de l'application (`src/store/`). Une feature n'importe une autre feature que par son `index.ts`.

```mermaid
flowchart TB
    subgraph features["Écrans (features)"]
        setup["mission-setup<br/>préparation de la mission"]:::ui
        tactique["tactical-map<br/>écran tactique et carte"]:::ui
        flotte["fleet<br/>forces, fiche d'unité,<br/>porte-avions"]:::ui
        commandes["commands<br/>déplacement, balayage,<br/>fin de cycle"]:::ui
        journal["logbook<br/>journal de bord"]:::ui
        tactique --> flotte
        tactique --> commandes
        tactique --> journal
        flotte --> commandes
    end

    subgraph store["Store (Zustand)"]
        jeu["game.store<br/>état de la partie et dispatch"]:::state
        brouillons["brouillons<br/>déplacement, balayage,<br/>ordre du porte-avions"]:::state
        selection["selection<br/>unité et case choisies"]:::state
        sauvegarde["save et auto-save<br/>sauvegarde et reprise"]:::state
    end

    moteur["engine<br/>règles du jeu"]:::core

    features -->|"lisent l'état, préparent des actions,<br/>envoient des commandes"| store
    store -->|"executeCommand"| moteur

    classDef ui fill:#dbeafe,stroke:#2563eb,color:#111
    classDef state fill:#fef3c7,stroke:#d97706,color:#111
    classDef core fill:#dcfce7,stroke:#16a34a,color:#111
```

## Lecture

- **`tactical-map` est l'écran principal** : il assemble la carte, les forces, les commandes et le journal.
- **`commands` et `fleet` écrivent dans les brouillons** : une action se prépare, puis se confirme. Un seul brouillon à la fois.
- **Seul `game.store` envoie des commandes au moteur** (via `dispatch`). L'interface lit la vue du joueur, jamais l'état réel.
- **`fleet` dépend de `commands`** (pour démarrer un déplacement), jamais l'inverse.

Voir aussi : [Guide du développeur](../architecture/GUIDE-DEVELOPPEUR.md), [maquette](../maquette/README.md).
