# 4. Le déroulement d'un cycle

L'enchaînement d'un cycle de jeu, avec la place de l'IA ennemie.

```mermaid
flowchart TB
    debut(["Début du cycle"]):::etape --> act["Le joueur active une unité alliée<br/>déplacement et balayage"]:::joueur
    act --> fin["Fin de son activation"]:::joueur
    fin --> reac["Une unité ennemie réagit"]:::ia
    reac --> reste{"Il reste des unités<br/>alliées à activer ?"}
    reste -->|"oui"| act
    reste -->|"non, ou fin anticipée"| ordre["Escorte : dernière occasion<br/>d'un ordre au porte-avions"]:::joueur
    ordre --> cloture

    subgraph cloture["Clôture du cycle"]
        direction TB
        c1["Les unités ennemies<br/>restantes jouent"]:::ia
        c2["Le porte-avions<br/>navigue"]:::moteur
        c3["Veille des deux camps<br/>nouveaux contacts"]:::moteur
        c4{"Résultat ?"}
        c1 --> c2 --> c3 --> c4
    end

    c4 -->|"victoire"| victoire(["Fin de la mission"]):::etape
    c4 -->|"la mission continue"| suivant["Cycle suivant<br/>les unités redeviennent disponibles"]:::moteur
    suivant --> debut

    classDef etape fill:#f3f4f6,stroke:#6b7280,color:#111
    classDef joueur fill:#dbeafe,stroke:#2563eb,color:#111
    classDef ia fill:#fee2e2,stroke:#dc2626,color:#111
    classDef moteur fill:#dcfce7,stroke:#16a34a,color:#111
```

## Lecture

- **Tour par tour** : après chaque activation alliée, une unité ennemie joue. Chaque unité n'a qu'une activation par cycle.
- **La clôture est automatique** quand toutes les activations sont terminées. Avec « Terminer le cycle », l'activation en cours est d'abord achevée.
- **La clôture suit toujours le même ordre** : les ennemis restants jouent, le porte-avions navigue une seule fois, la veille des deux camps révèle les contacts, puis le résultat est déterminé.
- **Seule la victoire existe pour l'instant** (arrivée du porte-avions en B). Défaite et bilan arriveront avec le combat.

Code : `missions/cycle.service.ts`, `core/mission-commands.service.ts`.
