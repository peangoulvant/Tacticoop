# 6. La détection et le brouillard de guerre (`src/engine/detection/`)

Comment chaque camp apprend où sont les navires adverses. Les deux camps suivent exactement les mêmes règles.  
Fichiers : `watch-sensor`, `sweep`, `side-contacts`, `observation` ; projectiles : `combat/projectile-observation`. Portées et probabilités : `config/game.config.ts`.  

```mermaid
---
config:
  layout: elk
  theme: default
  look: classic
---
flowchart TB
    reel[("`**État réel**<br>*toutes les unités*`")]:::ext

    veille["`**Veille**<br>*automatique, à la clôture du cycle*`"]:::ui
    balayage["`**Balayage**<br>*action choisie, à la demande*`"]:::ui

    suspect["`**Contact suspect**<br>*une zone approximative*`"]:::ui
    identifie["`**Contact identifié**<br>*type et position exacte*`"]:::ui

    amis[("`**Contacts du joueur**<br>*navires hostiles repérés*`")]:::ui
    hostiles[("`**Contacts de l'IA**<br>*navires alliés repérés*`")]:::ui

    vueAmie["`**observeFriend**<br>*ce que le joueur sait*`"]:::ui
    vueHostile["`**observeHostile**<br>*ce que l'IA sait*`"]:::ui

    projectiles["`**Projectiles**<br>*les siens toujours ; ceux de l'adversaire dès qu'ils passent à 3 hexagones d'une unité, sans tirage*`"]:::ui

    ecran(["`**Interface du joueur**`"]):::ext
    ia(["`**IA ennemie**`"]):::ext

    reel --> veille --> suspect
    reel --> balayage --> identifie
    balayage -.->|"du bruit : la veille repère plus facilement l'émetteur"| veille
    suspect -->|"repéré par une unité alliée"| amis
    suspect -->|"repéré par une unité hostile"| hostiles
    identifie -->|"repéré par une unité alliée"| amis
    identifie -->|"repéré par une unité hostile"| hostiles
    reel --> projectiles
    projectiles --> vueAmie & vueHostile
    amis --> vueAmie --> ecran
    hostiles --> vueHostile --> ia
```