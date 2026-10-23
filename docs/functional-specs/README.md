# Spécifications fonctionnelles — Wargame naval V1

## Objet

Ce dossier décrit le fonctionnement attendu du wargame naval V1. Il traduit les décisions validées dans `../game-design/` en comportements fonctionnels, sans redéfinir les règles du jeu.

## Structure documentaire

```text
docs/
├── game-design/                  # Existant — référence
└── functional-specs/
    ├── README.md                 # Index et suivi des spécifications
    ├── SF-01.md                  # Préparation et lancement
    ├── SF-02.md                  # Carte et déplacements
    ├── SF-03.md                  # Cycles et commandes
    ├── SF-04.md                  # Détection et contacts
    ├── SF-05.md                  # Combats
    ├── SF-06.md                  # IA ennemie
    ├── SF-07.md                  # Journal et historique
    ├── SF-08.md                  # Fin de mission et débriefing
    └── DECISIONS.md              # Arbitrages fonctionnels ouverts
```

## Index et suivi

| Référence | Périmètre | État |
|---|---|---|
| [SF-01](SF-01.md) | Préparation et lancement | **Validée** — arbitrages Q1 à Q22 consolidés |
| [SF-02](SF-02.md) | Carte et déplacements | **Validée** — SF-02.1 à SF-02.18, revue C1–C3 conforme |
| [SF-03](SF-03.md) | Cycles et commandes | À suivre |
| [SF-04](SF-04.md) | Détection et contacts | À suivre |
| [SF-05](SF-05.md) | Combats | À suivre |
| [SF-06](SF-06.md) | IA ennemie | À suivre |
| [SF-07](SF-07.md) | Journal et historique | À suivre |
| [SF-08](SF-08.md) | Fin de mission et débriefing | À suivre |
| [DECISIONS](DECISIONS.md) | Arbitrages fonctionnels ouverts | À maintenir |

> « À suivre » signifie que le présent index ne certifie pas encore l'état de validation documentaire de la spécification concernée.

## Principes de rédaction

- **Référence :** les documents de `../game-design/` font autorité pour les règles validées.
- **Traçabilité :** chaque spécification renvoie aux décisions de Game Design pertinentes.
- **Périmètre :** décrire les comportements fonctionnels attendus, sans ajouter de mécanique non arbitrée.
- **Arbitrages :** inscrire les décisions encore ouvertes dans `DECISIONS.md` ; ne pas les présenter comme validées.
- **Évolution :** toute divergence avec le Game Design nécessite un arbitrage explicite et une mise à jour documentaire cohérente.

## SF-01 — Points consolidés

La préparation de mission comprend le choix de la mission et de la difficulté, le briefing, la sélection des contraintes, la composition de la force, puis la vérification et la confirmation du lancement.

Les quatre contraintes V1 sont **Moyens limités** (budget initial ramené de 100 à 70 points), **Stocks de munitions limités** (−30 %), **Capteurs dégradés** (−20 % de portée) et **Météo défavorable** (déplacement plafonné à 2 hexagones). Elles sont disponibles dans les deux missions, compatibles entre elles, avec un maximum de deux contraintes simultanées. Les réductions de munitions et de portée sont arrondies à l'entier inférieur ; les valeurs initiales sont paramétrables.

Les dotations et portées de référence restent à définir dans les spécifications concernées, sans rouvrir les décisions déjà validées pour SF-01.

## SF-02 — Points consolidés

Carte hexagonale procédurale de 50 × 50 cases par défaut, six terrains et navigabilité selon les unités. Placement initial automatique, terrain entièrement visible mais unités ennemies soumises au brouillard de guerre. En escorte, connectivité A→B et itinéraires alternatifs ; le joueur peut désigner un point de passage au porte-avions, dont la navigation reste automatique en fin de cycle. Les déplacements des autres unités sont choisis par le joueur, calculés sur le chemin valide le plus court, prévisualisés puis confirmés. Les obstacles ennemis non détectés interrompent un déplacement confirmé sans révélation automatique. Revue de cohérence C1–C3 validée. Voir [SF-02](SF-02.md).
