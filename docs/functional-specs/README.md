# Spécifications fonctionnelles — Tacticoop V1

## Objet

Ces documents décrivent les **comportements attendus du jeu**, indépendamment des choix techniques. Ils servent de référence commune aux développeurs, agents IA et testeurs. Ils ne sont pas un manuel destiné aux joueurs.

- **Game Design (GDD) :** règles et mécaniques du jeu.
- **Spécifications fonctionnelles (SF) :** comportements observables, commandes, validations, affichages et cas particuliers.
- **Manuel de jeu :** explications destinées aux joueurs, à rédiger après stabilisation des règles.

## Index

| Référence | Périmètre | Avancement |
|---|---|---|
| [SF-01](SF-01.md) | Préparation et lancement | Arbitrages fonctionnels consolidés |
| [SF-02](SF-02.md) | Carte et déplacements | Arbitrages fonctionnels consolidés |
| [SF-03](SF-03.md) | Cycles et commandes | Arbitrages fonctionnels consolidés |
| [SF-04](SF-04.md) | Détection et contacts | Comportements à compléter selon le registre |
| [SF-05](SF-05.md) | Combats | Comportements à compléter selon le registre |
| [SF-06](SF-06.md) | IA ennemie | Comportements à compléter selon le registre |
| [SF-07](SF-07.md) | Journal et historique | Comportements à compléter selon le registre |
| [SF-08](SF-08.md) | Fin de mission et débriefing | Comportements à compléter selon le registre |
| [DECISIONS](DECISIONS.md) | Décisions et paramètres ouverts | À arbitrer avant implémentation concernée |

## Convention de rédaction

Les huit SF emploient un style commun : phrases directes, vocabulaire du jeu, description du comportement du système et des actions du joueur. Les dates de revue, noms de branches et historiques de modifications appartiennent aux commits et aux Pull Requests, pas au texte fonctionnel.

Les SF-04 à SF-08 incluent des précisions de fonctionnement issues de la rédaction initiale. **Leur présence dans le document ne vaut pas approbation de toutes les modalités encore ouvertes.** Le registre [DECISIONS.md](DECISIONS.md) identifie ces points, notamment les choix d'affichage à confirmer (D-14). Un agent de développement ne doit pas compléter de lui-même une règle absente.

Les règles déjà arbitrées prévalent ; toute évolution du gameplay nécessite une décision explicite et une mise en cohérence des documents concernés.

## Revue transversale

La revue a identifié des dépendances entre cycles, projectiles, navigation du porte-avions, détection, combat et débriefing. Les sujets bloquants pour une première version jouable sont classés par priorité dans [DECISIONS.md](DECISIONS.md).

Les points majeurs sont la progression des projectiles hors séquences alliées/ennemies, les paramètres de navires et d'armes, les actions spéciales, les cas terminaux d'escorte et la construction des zones de détection passive.

## Règle de fusion

Cette consolidation documentaire **ne valide pas automatiquement les décisions ouvertes**. Une fusion GitHub met les textes à disposition de l'équipe ; elle ne remplace pas l'arbitrage fonctionnel.
