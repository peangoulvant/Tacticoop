# 3. Le chemin d'une action

Ce qui se passe quand le joueur confirme une action, par exemple un déplacement ou un balayage.  
Un brouillon (`..Draft..` dans le code) concerne un état d'interface.  


```mermaid
---
config:
  theme: default
  look: classic
---
sequenceDiagram
    actor J as Joueur
    participant UI as Interface (features)
    participant S as Store
    participant M as Moteur
    participant R as Règles
    participant P as Sauvegarde

    J->>UI: choisit une action
    UI->>S: ouvre un brouillon
    J->>UI: confirme
    UI->>S: dispatch(commande)
    S->>M: executeCommand
    M->>R: vérifie et applique la règle
    alt commande refusée
        R-->>M: motif du refus
        M-->>S: erreur, état inchangé
        S-->>UI: message affiché
    else commande acceptée
        R-->>M: nouvel état
        M->>M: réaction de l'IA ennemie, invisible
        M-->>S: nouvel état et événements
        S-->>UI: publie
        UI->>UI: redessine d'après observeFriend
        S->>P: sauvegarde automatique
    end
```
