# 2. Le moteur (`src/engine/`)

Les modules du moteur et qui appelle qui. Un module = un dossier.

```mermaid
flowchart TB
    api(["index.ts<br/>API publique"]):::api

    subgraph regles["Règles du jeu"]
        core["core<br/>executeCommand et commandes"]:::core
        missions["missions<br/>préparation, lancement,<br/>activations, cycles"]:::core
        units["units<br/>déplacement, porte-avions,<br/>force ennemie, actions spéciales"]:::core
        detection["detection<br/>veille, balayage, contacts,<br/>vue de chaque camp"]:::core
        ai["ai<br/>IA ennemie"]:::ai
    end

    subgraph socle["Socle"]
        map["map<br/>hexagones, carte, génération"]:::base
        config["config<br/>GameConfig : toutes les valeurs"]:::base
    end

    api --> core
    core -->|"préparer, lancer"| missions
    core -->|"déplacer, agir"| units
    core -->|"après une activation alliée"| ai
    missions -->|"clôture du cycle"| ai
    missions -->|"veille de fin de cycle"| detection
    missions --> units
    ai -.->|"mêmes commandes que le joueur"| core
    ai -->|"lit sa vue"| detection
    detection --> units
    units --> map
    detection --> map
    regles -->|"lisent les valeurs"| config

    classDef api fill:#f3f4f6,stroke:#6b7280,color:#111
    classDef core fill:#dcfce7,stroke:#16a34a,color:#111
    classDef ai fill:#fee2e2,stroke:#dc2626,color:#111
    classDef base fill:#e0e7ff,stroke:#4f46e5,color:#111
```

## Lecture

- **Un seul point d'entrée** : `executeCommand(état, commande, config)`. Il envoie vers le gestionnaire de la commande, qui s'appuie sur `units`, `detection` et `missions`.
- **`missions` gère le temps** : les activations, puis la clôture du cycle (unités ennemies, porte-avions, veille, résultat). Voir [le cycle](04-cycle.md).
- **`ai` joue avec les mêmes fonctions que le joueur** (`core/unit-commands`) : même règles, mêmes refus. Voir [l'IA](05-ia.md).
- **`config` porte toutes les valeurs du jeu** (portées, probabilités, délais) : aucune n'est écrite en dur ailleurs.
- Entre fichiers, il n'y a aucun cycle de dépendances : les flèches dans les deux sens de ce schéma (`core` et `ai`) relient des fichiers différents.

Voir aussi : [Moteur et état](../architecture/MOTEUR-ET-ETAT.md).
