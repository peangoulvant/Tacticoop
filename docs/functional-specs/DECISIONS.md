# Décisions ouvertes — Tacticoop V1

Ce registre centralise les choix restant à arbitrer. Les SF-01 à SF-08 décrivent le fonctionnement cible ; les points ci-dessous ne sont **pas** des règles définitivement approuvées. Les formulations proposées dans les SF-04 à SF-08 servent de base à la revue et doivent être confirmées avant implémentation lorsqu'elles ajoutent un comportement.

## Arbitrages consolidés — octobre 2026

Ces décisions sont retenues pour la V1 ; les chiffres sont des **paramètres provisoires configurables**, à équilibrer par les tests, sans prétention de réalisme militaire.

- **D-01 / D-02 — Projectiles :** tous les missiles et torpilles présents sur la carte progressent simultanément après chaque paire activation alliée / réaction ennemie. Les activations ennemies restantes et la navigation automatique du porte-avions ne déclenchent pas de progression supplémentaire. Défenses et impacts sont résolus selon les règles existantes.
- **D-03 — Catalogue :** FREMM multimission (35 points, 110 PV, mouvement 3, 4 missiles, 4 torpilles, 1 hélicoptère ASM) ; frégate DA (25 points, 100 PV, mouvement 3, 6 missiles, 2 torpilles, 1 hélicoptère) ; frégate ASM (25 points, 100 PV, mouvement 3, 2 missiles, 6 torpilles, 2 hélicoptères) ; sous-marin (50 points, 80 PV, mouvement 2, 0 missile, 4 torpilles) ; porte-avions de scénario hors budget (200 PV, navigation automatique 0 à 2 hexagones). Mouvement exprimé en hexagones. Les dotations sont des stocks initiaux de test.
- **Spécialisations :** FREMM plus chère et polyvalente ; DA et ASM de même coût ; défense antiaérienne supérieure pour DA, torpilles et hélicoptères supplémentaires pour ASM. Les capacités de défense chiffrées restent à définir. **Un seul hélicoptère est utilisable à la fois par frégate** : le second d'une ASM est en réserve et peut remplacer le premier après destruction, en conservant les règles existantes d'activation et de récupération.
- **D-05 — Armes :** missile (portée 8 hexagones, progression 2 hexagones par paire, dégâts 40 PV, impact 75 %) ; torpille (portée 5 hexagones, progression 1 hexagone, dégâts 50 PV, impact 70 %). Paramètres provisoires, sans modification des mécanismes de guidage, leurres ou défense. Les autres valeurs restent ouvertes.
- **D-04 — Porte-avions :** passif, sans action spéciale ni défense automatique propre ; protection assurée par les escortes. Les autres actions existantes sont conservées.
- **D-06 — Propulsion du porte-avions :** panne = immobilisation, sans défaite immédiate ; réparation automatique au cycle suivant, sans action du joueur et sans récupération de PV ; reprise de la navigation en fin de ce cycle. La règle s'applique à nouveau en cas de nouvelle panne. Les conditions de défaite déjà définies restent applicables.

## Arbitrages — novembre 2026

- **Navigation du porte-avions (AB-05 à AB-07) :** ordres et quota (G-03.2.10, G-06.5.6) validés ; route bloquée (G-03.2.13) : arrêt avant la case occupée ; dernière occasion d'ordre : pause du cycle et bouton « Clôturer le cycle ». Les dégâts de vitesse et l'immobilisation définitive (G-03.2.11) restent à définir avec le combat. Détail dans le [registre Game Design](../game-design/DECISIONS.md).
- **Sauvegardes (AB-08) et route bloquée (AB-09) :** un seul emplacement, reprise proposée, état et journal, sauvegarde automatique illisible ou incompatible traitée comme absente ; export et import manuels de fichiers JSON retirés de la V1 (AB-10) ; le blocage du porte-avions par un navire est le comportement voulu. Détail dans [PERSISTANCE.md](../architecture/PERSISTANCE.md) et le registre Game Design.

- **Ennemis et départs (AB-11 à AB-17) :** lutte navale à 3 ennemis (quatre configurations équiprobables, frégates tirées parmi FREMM, DA et ASM), zones de départ et distances proportionnelles à la largeur de la carte, forces d'interception de l'escorte présentes dès le lancement, sous-marin autorisé en mer côtière avec détection facilitée (chiffrage ouvert), paramètres sous `GameConfig.scenarios`, nommage `.ai.service.ts`. Détail dans le [registre Game Design](../game-design/DECISIONS.md) et dans SF-02 §4.

Les éléments non précisés ci-dessus (autonomies, probabilités de panne/interception, leurres, cas limites de l'IA et de la détection) ne sont pas automatiquement validés.

## Priorité 1 — Cohérence des règles et version jouable

| ID | Références | Question à arbitrer | Effet sur la V1 |
|---|---|---|---|
| D-04 (compléments) | G-07, G-09, SF-05 | Préciser le catalogue réellement disponible des actions spéciales, leurs préconditions et les règles d'engagement ; préciser les hélicoptères et la préparation des torpilles ou les reporter explicitement. | Empêche de coder des commandes sans règle d'exécution. |
| D-05 (compléments) | G-09, SF-05 | Définir vitesses/autonomies/portées, dégâts, probabilités d'impact, de panne et d'interception, leurres et perte de PV liée à la coque ; déterminer l'ordre fixe des projectiles et les égalités de défense. | Rend les combats déterminables et testables. |
| D-07 | G-08, SF-04 | Définir la génération des zones passives contiguës de forme variable, la gestion des bords, la réassociation de contacts et le traitement de plusieurs observations. | Évite les fuites de renseignement et les contacts incohérents. |
| D-08 | G-10, SF-01, SF-06 | Définir les critères tactiques minimaux distinguant **Classique** et **Expert**, sans modifier les statistiques ni les renseignements disponibles. | Permet deux niveaux de difficulté observables. |

## Priorité 2 — Précisions de comportement et restitution

| ID | Références | Question à arbitrer |
|---|---|---|
| D-09 | G-08, SF-04 | Effets de la recherche active sur la discrétion ; obstacles, types de mer et contacts anciens ; priorité active/passive. Inclut le chiffrage du surcroît de détection du sous-marin en mer côtière (principe validé : AB-15). |
| D-10 | G-09, SF-05 | Passage répété d'un projectile dans la zone d'un même leurre ; modalités de tentative d'interception après échec, sans déroger à la règle « cycle ultérieur ». |
| D-11 | G-12, SF-07 | Catalogue des événements significatifs, champs du journal, rubriques des synthèses et niveau de détail du parcours historique. |
| D-12 | G-12, G-13, SF-08 | Liste des statistiques factuelles, modalités de révélation des événements ennemis après la mission et conservation des résultats. |
| D-13 | G-10, SF-06 | Politique de sélection et départage des unités ennemies, cibles et comportements en absence de contact. |
| D-14 | SF-04 à SF-08 | Confirmer ou amender les choix de présentation et de consultation proposés dans les SF (zones, fiches, confirmations, journal, bilan et retour au menu). |

## Cohérence documentaire repérée

- **G-11 / SF-01 :** la règle historique de retrait d'un navire et la notion de « nombre maximal » de contraintes sont remplacées dans la V1 par la réduction du budget à 70 points et le choix exact de 0, 1 ou 2 contraintes dans SF-01. Ne pas implémenter l'ancienne variante.
- **G-09 / SF-02 :** les six terrains et leur navigabilité sont définis dans SF-02 ; les effets de terrain sur la détection et le combat restent ouverts.
- **G-13 / G-03 / SF-08 :** l'arrivée en B ne clôt pas la mission avant la résolution des phases encore applicables. L'ancienne mention « à définir » sur le principe de cette vérification est obsolète ; D-02 concerne uniquement la progression de projectile supplémentaire.
- **G-06 / G-09 :** la progression après chaque séquence alliée/réaction ennemie est validée. Elle ne doit pas être confondue avec les progressions supplémentaires D-01 et D-02.
- **SF-06 / SF-01 :** les seules difficultés V1 sont **Classique** et **Expert**.

## Règle de lecture

Une décision ouverte n'autorise pas l'agent de développement à inventer une règle. Pour chaque point bloquant, obtenir un arbitrage explicite ou exclure la fonctionnalité de la portée de la V1 par une décision documentée. Les décisions historiques et leur justification restent dans GitHub ; les SF décrivent les comportements attendus.
