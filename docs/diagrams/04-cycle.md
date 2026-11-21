# 4. Le déroulement d'un cycle

L'enchaînement d'un cycle de jeu, avec la place de l'IA ennemie.  
Code : `missions/cycle.service.ts`, `missions/outcome.service.ts`, `core/mission-commands.service.ts`.  

```mermaid
---
config:
  layout: elk
  theme: default
  look: classic
---
flowchart LR
 subgraph cloture["`**Clôture du cycle**`"]
    direction TB
        c1["`**Les unités ennemies restantes jouent**<br>*IA*`"]
        c2["`**Le porte-avions navigue**`"]
        c3["`**Veille des deux camps**<br>*nouveaux contacts*`"]
        c4{"`**Résultat ?**<br>*la défaite prévaut*`"}
  end
    debut(["`**Début du cycle**`"]) --> act["`**Le joueur active une unité alliée**<br>*déplacement, balayage ou tir*`"]
    act --> fin["`**Fin de son activation**`"]
    fin --> reac["`**Une unité ennemie réagit**<br>*IA*`"]
    reac --> proj["`**Les projectiles progressent**<br>*impacts, destructions*`"]
    proj --> fini{"`**Mission terminée ?**<br>*défaite ou victoire*`"}
    fini -- oui --> victoire
    fini -- non --> reste{"`**Il reste des unités alliées à activer ?**`"}
    reste -- oui --> act
    reste -- non, ou fin anticipée (mission lutte navale) --> cloture
    reste -- non, ou fin anticipée --> ordre@{ label: "**Escorte : dernière occasion d'ordre**<br>*navigation du porte-avions*" }
    ordre --> cloture
    c1 --> c2
    c2 --> c3
    c3 --> c4
    c4 -- victoire ou défaite --> victoire(["`**Fin de la mission**`"])
    c4 -- la mission continue --> suivant["`**Cycle suivant**<br>*les unités redeviennent disponibles*`"]
    suivant --> retour(["`**Retour au début du cycle**`"])

    ordre@{ shape: rect}
```
