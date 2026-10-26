# Game Design — Tacticoop V1

## Objet

Les chapitres G-01 à G-13 définissent les **règles du jeu et les mécaniques tactiques**. Ils constituent le référentiel de conception de la V1. Les [spécifications fonctionnelles](../functional-specs/README.md) traduisent ces règles en comportements attendus du logiciel ; le manuel de jeu destiné aux joueurs sera rédigé séparément.

Les chapitres décrivent les règles retenues, sans détailler le déroulement des anciennes revues. Les décisions non tranchées sont regroupées dans [DECISIONS.md](DECISIONS.md). Les identifiants G-XX et AB-XX sont conservés pour la traçabilité.

## Chapitres

| Référence | Domaine |
|---|---|
| [G-01](G-01.md) | Concept général |
| [G-02](G-02.md) | Conditions de victoire et de défaite |
| [G-03](G-03.md) | Scénarios |
| [G-04](G-04.md) | Carte et coordonnées |
| [G-05](G-05.md) | Forces et unités |
| [G-06](G-06.md) | Cycles tactiques et activations |
| [G-07](G-07.md) | Actions des unités |
| [G-08](G-08.md) | Détection et brouillard de guerre |
| [G-09](G-09.md) | Système de combat naval |
| [G-10](G-10.md) | Intelligence artificielle ennemie |
| [G-11](G-11.md) | Contraintes initiales |
| [G-12](G-12.md) | Journal de bord |
| [G-13](G-13.md) | Fin de mission et débriefing |
| [DECISIONS](DECISIONS.md) | Décisions ouvertes et règles transversales acquises |

## Conventions de lecture

- Les règles approuvées figurent dans les chapitres et leurs précisions SF correspondantes.
- Les mentions historiques `PROPOSÉ` ou `À DÉFINIR` encore présentes dans un chapitre **ne sont pas des exigences à implémenter**. Elles sont regroupées par thème dans le registre des décisions et doivent être arbitrées avant codage.
- Les décisions SF-01 à SF-03 et les révisions explicites de G-06, G-08 et G-09 précisent certaines formulations historiques du GDD. Il ne faut pas implémenter deux variantes contradictoires.
- Les décisions AB-01 à AB-04, autrefois consignées dans un document séparé, sont reprises dans les chapitres concernés et récapitulées dans le registre.

## Navigation et responsabilités

Lire d'abord le chapitre G-XX de la mécanique concernée, puis sa SF, puis les décisions ouvertes correspondantes. Les exemples illustrent les règles mais n'ajoutent pas de mécanisme.

La conception technique (React, TypeScript, Zustand, serveur éventuel, algorithmes et données) sera traitée dans l'architecture. Les documents G-XX et SF-XX restent indépendants des choix d'implémentation.

## Historique documentaire

Les anciens fichiers `ARBITRAGES-BLOQUANTS-V1.md`, `REVUE-COHERENCE-V1.md` et `JOURNAL.md` sont consolidés dans le présent index, le registre [DECISIONS.md](DECISIONS.md) et les chapitres G-02/G-03/G-09/G-12/G-13. Leur historique demeure consultable dans Git.

**Cette réorganisation n'introduit pas de nouvelle règle de gameplay.**
