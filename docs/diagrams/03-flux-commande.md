# 3. Le chemin d'une action

Ce qui se passe quand le joueur confirme une action, par exemple un déplacement ou un balayage.

```mermaid
---
config:
  theme: base
  themeVariables:
    actorBkg: '#cccccc'
    actorBorder: '#6b7280'
    actorTextColor: '#111111'
    actorLineColor: '#6b7280'
    signalColor: '#6b7280'
    signalTextColor: '#6b7280'
    labelBoxBkgColor: '#cccccc'
    labelBoxBorderColor: '#6b7280'
    labelTextColor: '#111111'
    loopTextColor: '#6b7280'
    noteBkgColor: '#f3f4f6'
    noteBorderColor: '#6b7280'
    noteTextColor: '#111111'
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
    Note over UI,S: brouillon = état d'interface seulement
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

## Lecture

- **Rien n'est décidé avant la confirmation** : le brouillon n'a aucun effet sur la partie.
- **Un refus ne consomme rien** : l'état reste identique et le joueur reçoit le motif.
- **La réaction ennemie est résolue avant de rendre la main** et ne produit aucun événement : le joueur n'en voit rien.
- **L'écran ne montre que la vue du joueur** (`observeFriend`) : les navires hostiles n'existent que sous forme de contacts.

Voir aussi : [Guide du développeur, §2](../architecture/GUIDE-DEVELOPPEUR.md).
