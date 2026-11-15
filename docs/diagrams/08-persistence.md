# 8. La sauvegarde et la reprise (`src/persistence/`)

Comment la partie est sauvegardée automatiquement, puis reprise au démarrage. La persistance n'est connue que du store.

## Sauvegarde

```mermaid
---
config:
  layout: elk
---
flowchart LR
    jeu["`**game.store**<br>*état de la partie*`"]:::ui -->|"à chaque séquence complète"| auto["`**auto-save**<br>*écoute l'état*`"]:::ui
    auto --> ecrire["`**serializeSave**<br>*texte JSON versionné*`"]:::ui
    ecrire --> stockage["`**storage**<br>*IndexedDB*`"]:::ui
    stockage --> idb[("`**Un seul emplacement**`")]:::ext

    classDef ui fill:#cccccc,stroke:#6b7280,color:#111
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#111
```

## Reprise au démarrage

```mermaid
---
config:
  layout: elk
---
flowchart LR
    idb[("`**Emplacement de sauvegarde**`")]:::ext --> stockage["`**storage**<br>*IndexedDB*`"]:::ui
    stockage -->|"texte lu"| lire["`**parseSave**<br>*et validateurs*`"]:::ui
    lire --> verdict{"`**Valide ?**`"}:::ui
    verdict -->|"oui"| reprise["`**Reprise proposée**<br>*restaure game.store*`"]:::ui
    verdict -->|"illisible ou version inconnue"| rien(["`**Traitée comme absente**<br>*nouvelle partie*`"]):::ext

    classDef ui fill:#cccccc,stroke:#6b7280,color:#111
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#111
```

## Lecture

- **Une seule sauvegarde automatique**, écrite entre deux séquences complètes (jamais pendant une activation en cours).
- **Rien de ce qui est lu n'est fiable** avant `parseSave` : validation stricte, refus total au moindre doute.
- **Version du format** (`schemaVersion`) : une sauvegarde d'une autre version est traitée comme absente, sans message ni effacement. Tout changement de la forme de l'état impose de la monter.
- **Les erreurs de stockage** ne bloquent jamais la partie.

Voir aussi : [Persistance](../architecture/PERSISTANCE.md).
