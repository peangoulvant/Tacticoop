# Décisions ouvertes — Tacticoop V1

Ce registre centralise les choix restant à arbitrer. Les SF-01 à SF-08 décrivent le fonctionnement cible ; les points ci-dessous ne sont **pas** des règles définitivement approuvées. Les formulations proposées dans les SF-04 à SF-08 servent de base à la revue et doivent être confirmées avant implémentation lorsqu'elles ajoutent un comportement.

## Priorité 1 — Cohérence des règles et version jouable

| ID | Références | Question à arbitrer | Effet sur la V1 |
|---|---|---|---|
| D-01 | G-06, G-09, SF-03, SF-05 | Après les activations ennemies **restantes**, faut-il faire progresser les projectiles, et à quelle fréquence ? | Détermine le rythme des menaces quand le joueur termine tôt ou n'a plus d'unités disponibles. |
| D-02 | G-03, G-06, G-09, G-13, SF-08 | Une progression des projectiles intervient-elle **après le déplacement automatique du porte-avions** et avant le contrôle de victoire à B ? | Conditionne la résolution des missiles en vol lors de l'arrivée à destination. |
| D-03 | G-05, G-07, G-09, SF-01, SF-05 | Fixer les fiches des unités, coûts, capacités de mouvement, PV, stocks et caractéristiques initiales des armes et défenses. | Nécessaire pour exécuter une partie et équilibrer les deux missions. |
| D-04 | G-07, G-09, SF-05 | Préciser le catalogue réellement disponible des actions spéciales, leurs préconditions et les règles d'engagement ; préciser les hélicoptères et la préparation des torpilles ou les reporter explicitement. | Empêche de coder des commandes sans règle d'exécution. |
| D-05 | G-09, SF-05 | Définir vitesses/autonomies/portées, dégâts, probabilités d'impact, de panne et d'interception, leurres et perte de PV liée à la coque ; déterminer l'ordre fixe des projectiles et les égalités de défense. | Rend les combats déterminables et testables. |
| D-06 | G-03, G-13, SF-08 | Préciser le résultat si le porte-avions ou son escorte est encore vivant mais définitivement incapable de poursuivre la mission. | Évite une partie bloquée sans issue terminale. |
| D-07 | G-08, SF-04 | Définir la génération des zones passives contiguës de forme variable, la gestion des bords, la réassociation de contacts et le traitement de plusieurs observations. | Évite les fuites de renseignement et les contacts incohérents. |
| D-08 | G-10, SF-01, SF-06 | Définir les critères tactiques minimaux distinguant **Classique** et **Expert**, sans modifier les statistiques ni les renseignements disponibles. | Permet deux niveaux de difficulté observables. |

## Priorité 2 — Précisions de comportement et restitution

| ID | Références | Question à arbitrer |
|---|---|---|
| D-09 | G-08, SF-04 | Effets de la recherche active sur la discrétion ; obstacles, types de mer et contacts anciens ; priorité active/passive. |
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
