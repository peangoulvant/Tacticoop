# Diagrammes du code

Des schémas **simples** pour comprendre comment le code est organisé sans le lire : qui parle à qui, jamais les détails (pas de variables, pas de signatures). Ils sont écrits en [Mermaid](https://mermaid.js.org/) dans [`docs/diagrams/`](../diagrams/) ; GitHub les affiche directement.

## Les diagrammes

| Diagramme | Question à laquelle il répond |
|---|---|
| [1. Architecture générale](../diagrams/01-architecture.md) | Comment l'application est-elle découpée en couches ? |
| [2. Le moteur](../diagrams/02-engine.md) | Quels modules composent les règles du jeu et comment s'appellent-ils ? |
| [3. Le chemin d'une action](../diagrams/03-flux-commande.md) | Que se passe-t-il quand le joueur confirme une action ? |
| [4. Le déroulement d'un cycle](../diagrams/04-cycle.md) | Dans quel ordre jouent le joueur, l'IA, le porte-avions et la veille ? |
| [5. L'IA ennemie](../diagrams/05-ia.md) | Comment une unité ennemie décide-t-elle ? |
| [6. La détection](../diagrams/06-detection.md) | Comment chaque camp apprend-il où sont les navires adverses ? |

**Par où commencer :** le 1, puis le 4 (le temps de jeu), puis le 2 et le 5.

## Mettre à jour les diagrammes

**Une PR qui change la structure ou le comportement décrit par un diagramme met ce diagramme à jour dans la même PR.** Un schéma périmé est pire que pas de schéma. Les schémas sont écrits à la main : rien ne les régénère à partir du code.

| La PR… | Diagramme à revoir |
|---|---|
| ajoute, supprime, renomme ou déplace un dossier de `src/` (`app`, `features`, `store`, `persistence`, `shared`, `engine`), ou change le sens d'une dépendance entre couches | 1 |
| ajoute, supprime ou renomme un module du moteur (`core`, `missions`, `units`, `detection`, `ai`, `map`, `config`), ou change qui appelle qui | 2 |
| change le chemin d'une commande (brouillon, `dispatch`, `executeCommand`, événements, sauvegarde automatique) | 3 |
| change l'ordre d'un cycle (activations, réaction ennemie, clôture, porte-avions, veille, résultat) | 4 |
| change la façon dont l'IA choisit, balaie ou se déplace | 5 |
| change la veille, le balayage, les contacts ou les vues de chaque camp | 6 |

Quand un nouveau sujet mérite son schéma (le combat, par exemple), ajouter un fichier `NN-sujet.md` dans `docs/diagrams/`, le lister dans le tableau ci-dessus et dans la ligne qui le renvoie du [README d'architecture](README.md). Un changement de détail (une valeur, un paramètre, le corps d'une fonction) ne demande **aucune** mise à jour.

## Style commun

- **Un schéma, une question**, une douzaine de boîtes au plus, sans variables ni fonctions, sauf le point d'entrée (`executeCommand`) ou la vue d'un camp (`observeFriend`).
- **En-tête de configuration** identique dans tous les fichiers :

  ````text
  ---
  config:
    layout: elk
    theme: default
    look: classic
  ---
  ````

- **Libellés en deux temps** : le **nom en gras** (avec `/` pour un dossier), puis l'*explication en italique* : `"`**store/**<br>*état de la partie*`"`.
- **Pas de couleur propre** : le thème par défaut s'applique. Ne pas ajouter de `classDef` ni de `style` de couleur.
- **Une flèche = « appelle » ou « lit »**, sauf mention contraire sur la flèche. Un trait pointillé = lien secondaire.
- **Vocabulaire du projet** : `hostile` (jamais `enemy`), `friend`, **veille** et **balayage**. Un contact désigne toujours un navire du **camp adverse** de celui qui le détient.
- Les liens entre dossiers viennent des imports réels du code (aucun cycle de dépendances entre fichiers).

## Vérifier un schéma

- Ouvrir le fichier sur GitHub, ou coller le bloc dans l'[éditeur Mermaid](https://mermaid.live/).
- La disposition `elk` peut **inverser l'ordre** d'un schéma quand une flèche revient en arrière sur un grand cycle (une boîte « cycle suivant » qui pointe vers le « début »). Terminer plutôt le schéma par une boîte « retour au début » (voir le diagramme 4).
- Un libellé qui commence par `1.` ou `-` est lu comme une liste Markdown : éviter ce début.
