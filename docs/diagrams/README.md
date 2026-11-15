# Diagrammes du code

Des schémas **simples**, pour comprendre comment le code est organisé sans le lire. Ils montrent qui parle à qui, jamais les détails (pas de variables, pas de signatures). Ils sont écrits en [Mermaid](https://mermaid.js.org/) : GitHub les affiche directement dans les fichiers.

| # | Diagramme | Question à laquelle il répond |
|---|---|---|
| 1 | [Architecture générale](01-architecture.md) | Comment l'application est-elle découpée en couches ? |
| 2 | [Le moteur](02-engine.md) | Quels sont les modules des règles du jeu et comment s'appellent-ils ? |
| 3 | [Le chemin d'une action](03-flux-commande.md) | Que se passe-t-il quand le joueur confirme une action ? |
| 4 | [Le déroulement d'un cycle](04-cycle.md) | Dans quel ordre jouent le joueur, l'IA, le porte-avions et la veille ? |
| 5 | [L'IA ennemie](05-ia.md) | Comment une unité ennemie décide-t-elle ? |
| 6 | [La détection](06-detection.md) | Comment chaque camp apprend-il où sont les navires adverses ? |
| 7 | [L'interface et le store](07-interface.md) | Quels écrans et quels états composent l'application ? |
| 8 | [La sauvegarde](08-persistence.md) | Comment la partie est-elle sauvegardée et reprise ? |
| 9 | [Le modèle de données](09-modele-de-donnees.md) | Quels sont les principaux types et leurs liens ? |

**Par où commencer :** le 1, puis le 4 (le temps de jeu), puis le 2 et le 5.

## Conventions

- **Un schéma, une question**, une douzaine de boîtes au plus. Pas de variables ni de fonctions dans les boîtes, sauf le point d'entrée (`executeCommand`) ou la vue du camp (`observeFriend`).
- **Style commun** (celui de [01-architecture.md](01-architecture.md)) :
  - disposition `elk` (en-tête `config: layout: elk`) ;
  - libellés en deux temps, le **nom en gras** (avec `/` pour un dossier) puis l'*explication en italique* : `"`**store/**<br>*état de la partie*`"` ;
  - **gris uni** pour tous les blocs (`fill:#cccccc`, `stroke:#6b7280`), gris plus clair pour ce qui est extérieur ou sert de départ et d'arrivée (joueur, base de données, début et fin) ;
  - cadre des groupes (`subgraph`) transparent, avec la ligne `style groupe stroke:#fffff,fill:transparent,color:#ffffff`.
  - Les diagrammes de séquence et de classes reprennent les mêmes gris.
- **Une flèche = « appelle » ou « lit »**, sauf mention contraire sur la flèche. Un trait pointillé = lien secondaire.
- Les liens entre dossiers viennent des imports réels du code (aucun cycle de dépendances entre fichiers).

## Garder les schémas à jour

Mettre à jour le schéma concerné quand une PR :

- ajoute, supprime ou renomme un module ou un dossier du moteur, du store ou d'une feature (1, 2, 7) ;
- change l'ordre d'un cycle ou le rôle de l'IA (4, 5) ;
- change la détection, la sauvegarde ou un type principal (6, 8, 9).

Pour vérifier qu'un schéma s'affiche, ouvrir le fichier sur GitHub ou coller le bloc dans l'[éditeur Mermaid](https://mermaid.live/). Si une flèche revient en arrière sur un grand cycle, la disposition `elk` peut inverser l'ordre du schéma : terminer plutôt le schéma par une boîte « retour au début » (voir [le cycle](04-cycle.md)).
