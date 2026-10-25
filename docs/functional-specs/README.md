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
| [SF-03](SF-03.md) | Cycles et commandes | **Validée** — SF-03.1 à SF-03.16, revue C1–C3 conforme (C3=B) |
| [SF-04](SF-04.md) | Détection et contacts | **Proposition pour revue** — socle GDD repris, choix P* à confirmer |
| [SF-05](SF-05.md) | Combats | **Proposition pour revue** — socle GDD repris, choix P* à confirmer |
| [SF-06](SF-06.md) | IA ennemie | **Proposition pour revue** — socle GDD repris, choix P* à confirmer |
| [SF-07](SF-07.md) | Journal et historique | **Proposition pour revue** — socle GDD repris, choix P* à confirmer |
| [SF-08](SF-08.md) | Fin de mission et débriefing | **Proposition pour revue** — socle GDD repris, choix P* à confirmer |
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

## SF-03 — Points consolidés

Activation explicite des unités alliées (un déplacement et une action spéciale facultative, dans l'ordre libre), réaction ennemie après clôture de chaque activation et possibilité de fin anticipée avec confirmation si des activations restent inutilisées. Panneau des forces et sélection synchronisée avec la carte ; consultation libre des unités, commandes indisponibles visibles et désactivées, validation explicite des actions spéciales. Clôture et ouverture du cycle suivant automatiques, y compris en l'absence d'unité alliée activable si la mission continue. En escorte, un ordre de navigation du porte-avions au maximum par cycle, confirmé explicitement ; **après la dernière réaction ennemie, une dernière possibilité d'ordre reste ouverte avant la clôture automatique (revue C3=B)**. Revue C1–C3 validée. Voir [SF-03](SF-03.md).

## SF-04 à SF-08 — Lot proposé pour revue

Les cinq spécifications suivantes ont été rédigées en **propositions**, à partir des règles déjà validées du Game Design :

- [SF-04](SF-04.md) : détection passive et active, affichage des contacts, actualisation et expiration.
- [SF-05](SF-05.md) : engagements, projectiles persistants, leurres, défense active, dommages et réparations.
- [SF-06](SF-06.md) : comportement tactique de l'IA, limites de renseignement et difficulté.
- [SF-07](SF-07.md) : journal hybride, historique, confidentialité et bilans de cycle.
- [SF-08](SF-08.md) : conditions de fin, bilan factuel et débriefing collectif.

**Gouvernance :** le statut « Proposition pour revue » ne signifie **pas** que les nouveaux choix fonctionnels ont été validés. Dans chaque document, les décisions **PROPOSÉ — SF-0X.Pn** doivent être approuvées ou amendées lors de la relecture. Les points **À DÉFINIR** du Game Design restent ouverts, même si une proposition fonctionnelle les évoque. **Exception approuvée lors de la revue du 25 octobre 2026 :** G-08 est précisé pour les zones passives de géométrie variable ; G-06 et G-09 sont révisés pour faire progresser les projectiles après chaque séquence alliée/ennemie ; SF-03 est mise en cohérence et SF-04, SF-05 et SF-08 reflètent ces arbitrages. Les modalités de progression hors séquences alliées/ennemies restent ouvertes.

**Ordre de relecture recommandé :** SF-04 → SF-05 → SF-06 → SF-07 → SF-08, puis cohérence transversale G-06/G-08/G-09/G-12/G-13. Les paramètres numériques et cas limites non validés doivent être instruits avant une implémentation qui en dépend.

## Révisions validées pendant la revue — 25 octobre 2026

1. **Détection passive (G-08 / SF-04) :** zone approximative contiguë de géométrie variable, d'au plus sept hexagones, contenant la cible à l'instant de la détection, sans l'imposer au centre. L'algorithme de génération reste à définir.
2. **Projectiles (G-06 / G-09 / SF-03 / SF-05 / SF-08) :** progression après chaque séquence complète alliée/réaction ennemie, avant restitution de la main. La progression après les activations ennemies restantes et la navigation du porte-avions doit encore être arbitrée pour éviter les doubles déplacements et préciser AB-01/AB-02.

Ces deux arbitrages sont approuvés par le concepteur. Les autres propositions Pn restent soumises à revue. Les changements sont consignés sur la branche de la PR #3 et non sur `main`.
