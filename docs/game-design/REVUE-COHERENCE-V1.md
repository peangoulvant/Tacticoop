# Revue de cohérence transversale — Game Design V1

**Portée :** lecture des fichiers G-01 à G-12, `JOURNAL.md`, consolidation des arbitrages G-13 et mise à jour de l'index. **Cette revue ne valide aucune règle supplémentaire.**

> **Mise à jour après AB-04 :** les observations ci-dessous sont conservées comme trace de l’audit initial. AB-01 à AB-03 ont été arbitrés et les formulations contradictoires ont été harmonisées ; voir [ARBITRAGES-BLOQUANTS-V1.md](ARBITRAGES-BLOQUANTS-V1.md). Les autres points ouverts demeurent inchangés.

## 1. Écarts et risques identifiés lors de l’audit initial

| Priorité | Références | Observation | Traitement |
|---|---|---|---|
| Haute | G-02.6 et G-02 « règles d’évaluation » vs G-13.1 Q1/Q2 | G-02 propose encore une vérification immédiate après événement et un arrêt immédiat ; G-13 valide la vérification après activation complète. | G-13 prévaut pour l'arbitrage de fin de séquence ; conserver G-02 comme proposition historique non validée, puis harmoniser sa rédaction lors d'une passe documentaire autorisée. |
| Haute | G-03.2.7, G-06.5.4 vs G-13.1 Q2 | Le porte-avions avance automatiquement en fin de cycle, hors activation ; le déclenchement d'une victoire par arrivée en B à cet instant n'est pas explicitement couvert par « après chaque activation ». | Arbitrage ciblé nécessaire avant codage. |
| Haute | G-09-C3/C4 vs G-13.1 Q1/Q4 | Les projectiles lancés continuent selon G-09 ; la portée de « aucune nouvelle action » après fin de mission sur leur résolution n'est pas explicitée. | Ne pas assimiler progression automatique à une nouvelle activation ; clarifier la frontière terminale sans inventer d'arrêt ni de poursuite. |
| Haute | G-02.5, G-02.7/G-02.8, G-03.2.11 | Cas de défaite non tranchés : escorte détruite, porte-avions immobilisé, limite de cycles. Résultat binaire G-13 n'apporte pas de déclencheur pour ces cas. | Maintenir `À DÉFINIR` et éviter les déductions automatiques. |
| Moyenne | G-12.10 C4 | Décision source exacte : **C4=B** (révélation possible après mission), et non C4=A. | G-13 reprend B et distingue possibilité de révélation et obligation de tout révéler. |
| Moyenne | G-12.9 vs G-13.3 | G-12 n'impose aucune statistique ; G-13 ajoute des catégories de statistiques factuelles de bilan. | Pas de contradiction : G-13 complète G-12, indicateurs concrets encore ouverts. |
| Moyenne | G-01.6, G-04, G-05, G-07, G-08, G-09, G-10, G-11 | Propositions et valeurs ouvertes malgré la clôture des arbitrages du cycle GDD. | Ne pas annoncer une spécification entièrement exécutable. |
| Faible | `JOURNAL.md` vs G-12.2/G-12.3 | « Une entrée par activation » est PROPOSÉ, alors que G-12 retient événements significatifs et synthèse. | Conserver la proposition non validée ; ne pas l'imposer en V1. |

## 2. Concordances confirmées

- G-13.1 Q1 respecte le principe de séquence indivisible de G-06.
- G-13.2 maintient les objectifs propres à chaque scénario de G-02/G-03.
- G-13.3 et G-13.4/G-13.5 distinguent bilan factuel et notation, sans système de score.
- G-13.6 à G-13.8 réutilisent G-12.8 à G-12.10 et maintiennent le brouillard de guerre pendant la mission.
- Les décisions de G-10/G-11 n'accordent aucune exception nouvelle aux règles de mission ou d'activation.

## 3. Portée de la clôture

**Clôturé :** cycle d'arbitrage de Game Design G-01 à G-13 et chapitre G-13.

**Non clôturé :** paramètres chiffrés, catalogues de navires/contraintes, règles de certains cas limites, conventions techniques, détail de l'interface et critères des statistiques. Les spécifications fonctionnelles devront soit réutiliser les règles `VALIDÉ`, soit soumettre les questions réellement bloquantes à arbitrage.

**Recommandation de méthode :** traiter en premier les contradictions et trous fonctionnels bloquant des scénarios de bout en bout ; ne pas relancer une conception générale ni ajouter un score à la V1.

## 4. État après harmonisation AB-04

- **Résolu :** ancienne proposition d’arrêt immédiat G-02.6, remplacée par la vérification après activation complète G-13.1.
- **Résolu :** arrivée en B lors de la navigation de fin de cycle (AB-01).
- **Résolu :** arrêt terminal des projectiles encore en vol (AB-02).
- **Résolu :** défaite par destruction de toutes les unités alliées en lutte navale et par perte de toutes les escortes en mission d’escorte (AB-03).
- **Toujours ouvert :** immobilisation définitive du porte-avions, limites éventuelles de cycles, paramètres et autres points explicitement `À DÉFINIR` dans le corpus.
