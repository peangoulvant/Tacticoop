# 4. Le déroulement d'un cycle

L'enchaînement d'un cycle de jeu, avec la place de l'IA ennemie.

```mermaid
---
config:
  layout: elk
---
flowchart TB
    debut(["`**Début du cycle**`"]):::ext --> act["`**Le joueur active une unité alliée**<br>*déplacement et balayage*`"]:::ui
    act --> fin["`**Fin de son activation**`"]:::ui
    fin --> reac["`**Une unité ennemie réagit**<br>*IA*`"]:::ui
    reac --> reste{"`**Il reste des unités alliées à activer ?**`"}:::ui
    reste -->|"oui"| act
    reste -->|"non, ou fin anticipée"| ordre["`**Escorte : dernière occasion d'ordre**<br>*navigation du porte-avions*`"]:::ui
    ordre --> cloture

    subgraph cloture["`**Clôture du cycle**`"]
        direction TB
        c1["`**Les unités ennemies restantes jouent**<br>*IA*`"]:::ui
        c2["`**Le porte-avions navigue**`"]:::ui
        c3["`**Veille des deux camps**<br>*nouveaux contacts*`"]:::ui
        c4{"`**Résultat ?**`"}:::ui
        c1 --> c2 --> c3 --> c4
    end

    c4 -->|"victoire"| victoire(["`**Fin de la mission**`"]):::ext
    c4 -->|"la mission continue"| suivant["`**Cycle suivant**<br>*les unités redeviennent disponibles*`"]:::ui
    suivant --> retour(["`**Retour au début du cycle**`"]):::ext

    style cloture stroke:#fffff,fill:transparent,color:#ffffff

    classDef ui fill:#cccccc,stroke:#6b7280,color:#111
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#111
```

## Lecture

- **Tour par tour** : après chaque activation alliée, une unité ennemie joue. Chaque unité n'a qu'une activation par cycle.
- **La clôture est automatique** quand toutes les activations sont terminées. Avec « Terminer le cycle », l'activation en cours est d'abord achevée.
- **La clôture suit toujours le même ordre** : les ennemis restants jouent, le porte-avions navigue une seule fois, la veille des deux camps révèle les contacts, puis le résultat est déterminé.
- **Seule la victoire existe pour l'instant** (arrivée du porte-avions en B). Défaite et bilan arriveront avec le combat.

Code : `missions/cycle.service.ts`, `core/mission-commands.service.ts`.
