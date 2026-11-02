# Décisions ouvertes — Game Design V1

Ce registre rassemble les règles de gameplay restant à préciser. Les chapitres [G-01 à G-13](README.md) décrivent les mécaniques retenues ; les [spécifications fonctionnelles](../functional-specs/README.md) précisent leur fonctionnement. Les décisions de ce registre ne sont pas des exigences approuvées.

## Priorité 1 — Règles nécessaires à une partie complète

| ID | Chapitres | Décision à prendre | Conséquence |
|---|---|---|---|
| GD-02 | G-05, G-07, G-09 | Capacités, coûts, PV, stocks, caractéristiques des navires et armes ; actions spéciales effectivement disponibles. | Nécessaire pour lancer et résoudre les engagements. Correspond à D-03 à D-05. |
| GD-03 | G-02, G-03, G-13 | Autres incapacités de mission et éventuelle limite de cycles ; la panne temporaire de propulsion du porte-avions est résolue. | Ne pas créer d'autres conditions terminales implicitement. |
| GD-04 | G-08 | Génération des zones passives de forme variable, bords de carte, contacts multiples, actualisation et réassociation. | Préserve le brouillard de guerre. Correspond à D-07 et D-09. |
| GD-05 | G-10 | Comportements distincts des difficultés **Classique** et **Expert**, critères de choix tactique et départage. | Rend les deux difficultés utilisables. Correspond à D-08 et D-13. |

## Priorité 2 — Détails et cas limites

| ID | Chapitres | Décision à prendre |
|---|---|---|
| GD-06 | G-04 | Convention interne des coordonnées et paramètres de génération procédurale, sans modifier les terrains, dimensions par défaut ou règles de navigabilité de SF-02. |
| GD-07 | G-08 | Effets éventuels des terrains sur la détection, portée et discrétion de l'émission active, contacts anciens et probabilités non encore chiffrées. |
| GD-08 | G-09 | Passage répété dans un même leurre, ordre reproductible des projectiles, égalités entre défenseurs, plafonds et valeurs d'équilibrage. |
| GD-09 | G-12, G-13 | Liste des événements significatifs, rubriques des bilans, statistiques factuelles et règles de révélation post-mission. |
| GD-10 | G-01, G-05, G-07 | Précisions de périmètre V1, classes de navires et actions hors recherche active, sans inventer de nouvelles mécaniques. |

## Décisions acquises — ne pas rouvrir

Les arbitrages D-01 à D-06 et paramètres provisoires sont consolidés dans [le registre SF](../functional-specs/DECISIONS.md).

| Référence | Règle retenue | Source |
|---|---|---|
| AB-01 | Arrivée du porte-avions en B : terminer les phases applicables, puis déclarer la victoire si aucune condition de défaite ne prévaut. | G-03, G-13, SF-08 |
| AB-02 | Résoudre les impacts prévus avant la déclaration officielle de fin ; à cette déclaration, les projectiles encore en vol cessent de progresser. | G-09, G-13 |
| AB-03.1 | Lutte navale : destruction de toutes les unités alliées = défaite après résolution de la séquence engagée. | G-02, G-13 |
| AB-03.2 | Escorte : destruction du porte-avions **ou** de tous les navires d'escorte alliés = défaite. | G-02, G-13 |
| AB-04 | Mise en cohérence documentaire des chapitres concernés, sans mécanique nouvelle. | Historique Git |
| SF-01 | Quatre contraintes V1 ; « Moyens limités » réduit le budget à 70 points, sans retirer automatiquement un navire ; 0, 1 ou 2 contraintes distinctes. | G-11, SF-01 |
| SF-02 | Carte 35 × 35 par défaut, six terrains, navigabilité et itinéraire A→B garanti. | G-04, SF-02 |
| SF-03 | Activation volontairement terminée, action facultative, navigation du porte-avions et commandes. | G-06, SF-03 |
| Révision G-08 | Détection passive : zone contiguë de géométrie variable contenant la cible sans l'imposer au centre. | G-08, SF-04 |
| Révision G-06/G-09 | Progression des projectiles après chaque séquence complète activation alliée / réaction ennemie. | G-06, G-09, SF-05 |

## Cohérence et précédentes revues

L'ancienne revue transversale avait signalé des ambiguïtés sur l'arrêt immédiat, l'arrivée en B, les projectiles et la destruction des escortes. **Ces sujets ont été arbitrés par AB-01 à AB-04**, à l'exception des questions distinctes GD-01 et GD-03. Le registre ne doit donc pas présenter ces anciennes observations comme des problèmes encore non résolus.

Le journal de bord conserve le brouillard de guerre pendant la mission (G-12). Le débriefing peut révéler certains événements ennemis après la fin, sans réécrire l'historique visible pendant la partie.

**Les propositions historiques et exemples ne constituent pas de nouvelles règles.** Un point absent ou ouvert ne doit pas être décidé automatiquement par l'agent de développement. Les questions fonctionnelles détaillées sont également recensées dans [DECISIONS.md des SF](../functional-specs/DECISIONS.md).

L'historique des anciens fichiers `ARBITRAGES-BLOQUANTS-V1.md`, `REVUE-COHERENCE-V1.md` et `JOURNAL.md` reste consultable dans Git ; les règles utiles sont reprises dans G-02/G-03/G-09/G-12/G-13 et dans le présent registre.
