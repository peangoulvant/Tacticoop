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
| GD-07 | G-08 | Effets éventuels des terrains sur la détection, portée et discrétion de l'émission active, contacts anciens et probabilités non encore chiffrées. Inclut le chiffrage du surcroît de détection d'un sous-marin en mer côtière (principe validé : AB-15). |
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
| AB-05 | Persistance des ordres de navigation (G-03.2.10) et quota réinitialisé au début du cycle (G-06.5.6) : validés tels que rédigés. Sans ordre, le porte-avions poursuit vers B ; Stopper persiste jusqu'à un nouvel ordre ; le point de passage est accompli à l'arrivée, puis le porte-avions repart vers B. | G-03, G-06, SF-02, SF-03 |
| AB-06 | Route bloquée : le porte-avions s'arrête avant la case occupée, sans contournement ni changement d'ordre, et retente au cycle suivant (G-03.2.13). | G-03, SF-02 |
| AB-07 | Dernière occasion d'ordre de navigation (C3=B) : le cycle attend tant que le quota n'est pas utilisé ; le joueur donne un ordre ou clôture le cycle avec un bouton dédié. | SF-03 |
| AB-08 | Sauvegardes (G-01.7, partie « sauvegardes ») : un seul emplacement « partie en cours » ; reprise proposée au démarrage ; contenu = état et journal ; version incompatible ou invalide sans migration : la sauvegarde automatique est alors traitée comme absente, sans message ni effacement. Détail dans `docs/architecture/PERSISTANCE.md`. Les autres sujets de G-01.7 (difficulté, progression, rejouabilité, ergonomie) restent à définir. | G-01, architecture |
| AB-09 | Route du porte-avions bloquée par un navire : comportement confirmé par le propriétaire (le porte-avions ne change pas de cap tout seul ; c'est au joueur de modifier la route). Aucun indicateur ni contournement n'est ajouté. Précise AB-06. | G-03, SF-02 |
| AB-10 | **Retrait du périmètre V1** : l'export et l'import manuels de fichiers JSON (prévus par AT-02 et par la PR C3, jamais développée) sont abandonnés ; réévaluation possible après la V1. La sauvegarde automatique IndexedDB, sa validation, `schemaVersion` et la reprise sont inchangés. | architecture, G-01.7 |
| AB-11 | **Composition ennemie, lutte navale :** 3 navires, quatre configurations équiprobables (3 frégates, 2F + 1 sous-marin, 1F + 2 sous-marins, 3 sous-marins) ; chaque frégate tirée équiprobablement parmi FREMM, DA et ASM ; poids paramétrables. La difficulté n'influence pas la composition. **Révise G-03.1.2** (2 frégates ou 1 frégate + 1 sous-marin). | G-03.1, SF-02 |
| AB-12 | **Zones de départ ennemies, lutte navale :** bande est (25 % de la largeur), tirage aléatoire indépendant sur hexagones libres navigables pour le type, à au moins 40 % de la largeur du point de départ allié ; pas de regroupement imposé ; échec explicite du lancement si le placement est impossible. | G-03.1, SF-02 §4 |
| AB-13 | **Forces d'interception, escorte (composition et placement de G-03.2.12) :** présentes dès le lancement, mêmes règles de composition qu'AB-11 ; partie centrale de la carte (30 % à 85 % de la largeur), à au moins 40 % de la largeur de A et 25 % de B ; itinéraire initial non exclu (AB-09). Le comportement reste ouvert (D-13). | G-03.2, SF-02 §4 |
| AB-14 | **Force alliée et départs alliés :** pas de règle de départ supplémentaire (budget et catalogue de SF-01) ; alliés groupés autour de A en escorte, autour du point de départ allié (6 % de la largeur, mi-hauteur) en lutte navale. L'équilibrage (3 ennemis contre 2 à 4 alliés) est reporté aux tests de combat (G-03.1.5). | G-03.1, SF-01, SF-02 §4 |
| AB-15 | **Sous-marin en mer côtière :** autorisé (révise SF-02.3), mais plus facilement détecté ; le chiffrage est à définir avec la détection (GD-07, D-09). La table de navigabilité du code n'est modifiée qu'avec ce chiffrage. | SF-02 §2, G-08.4 |
| AB-16 | **Paramétrage des scénarios :** toute valeur chiffrée ou pondération (effectifs, poids, ratios de zones et de distances, colonnes de départ) va dans `GameConfig.missions` ; les règles de structure restent dans le code et les spécifications. Les portées de détection et d'armes ne sont pas mises à l'échelle automatiquement ; un test de cohérence impose que la distance minimale de départ dépasse la portée maximale d'arme plus la portée active de détection. Les littéraux de départ et d'arrivée d'escorte sont externalisés. | architecture, G-03 |
| AB-17 | **Nommage des fichiers de l'IA ennemie :** `nom.ai.service.ts` (ex. `unit-movement.ai.service.ts`) pour distinguer la logique de l'IA de celle des unités ; qualificatif de `.service`, non une nouvelle catégorie. | QUALITE-ET-IMPLEMENTATION |
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
