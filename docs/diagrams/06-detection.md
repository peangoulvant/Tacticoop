# 6. La détection et le brouillard de guerre (`src/engine/detection/`)

Comment chaque camp apprend où sont les navires adverses. Les deux camps suivent exactement les mêmes règles.

```mermaid
---
config:
  layout: elk
---
flowchart TB
    reel[("`**État réel**<br>*toutes les unités*`")]:::ext

    veille["`**Veille**<br>*automatique, à la clôture du cycle<br>tirage de base 50 %*`"]:::ui
    balayage["`**Balayage**<br>*action choisie, à la demande<br>tirage 90 %*`"]:::ui

    suspect["`**Contact suspect**<br>*une zone approximative*`"]:::ui
    identifie["`**Contact identifié**<br>*type et position exacte*`"]:::ui

    amis[("`**Contacts du camp ami**`")]:::ui
    hostiles[("`**Contacts du camp hostile**`")]:::ui

    vueAmie["`**observeFriend**<br>*ce que le joueur sait*`"]:::ui
    vueHostile["`**observeHostile**<br>*ce que l'IA sait*`"]:::ui

    ecran(["`**Interface du joueur**`"]):::ext
    ia(["`**IA ennemie**`"]):::ext

    reel --> veille --> suspect
    reel --> balayage --> identifie
    balayage -.->|"du bruit : la veille repère plus facilement l'émetteur"| veille
    suspect -->|"détecteur ami"| amis
    suspect -->|"détecteur hostile"| hostiles
    identifie -->|"détecteur ami"| amis
    identifie -->|"détecteur hostile"| hostiles
    amis --> vueAmie --> ecran
    hostiles --> vueHostile --> ia

    classDef ui fill:#cccccc,stroke:#6b7280,color:#111
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#111
```

## Lecture

- **Le joueur ne voit jamais l'état réel** : un navire hostile n'existe pour lui que sous forme de contact (zone suspecte ou navire identifié).
- **Chaque camp a ses propres contacts**, construits de la même façon : `friendContacts` et `hostileContacts`, numérotés séparément.
- **Veille et balayage** : la veille est automatique et donne une zone ; le balayage est une action du joueur (ou de l'IA) qui donne le type et la position exacte, puis demande un cycle de récupération.
- **Un contact identifié est figé** à la position du balayage : il devient « ancien » au cycle suivant.
- **Rien de ce que détecte l'IA ne sort** vers le joueur : ni événement, ni journal, ni projection.

Fichiers : `watch-sensor`, `sweep`, `side-contacts`, `observation`. Portées et probabilités : `config/game.config.ts`.
