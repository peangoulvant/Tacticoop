# Game Design Document — Wargame naval

**Périmètre : G-01 à G-13.** Cycle d’arbitrage du Game Design V1 clôturé. Les sujets `PROPOSÉ` et `À DÉFINIR` demeurent ouverts et ne constituent pas des exigences validées.

## Convention

- **VALIDÉ** : décision explicitement prise.
- **PROPOSÉ** : hypothèse, pas une règle définitive.
- **À DÉFINIR** : sujet ouvert.

## Chapitres

- [G-01 — Concept général](G-01.md)
- [G-02 — Conditions de victoire et de défaite](G-02.md)
- [G-03 — Scénarios](G-03.md)
- [G-04 — Carte et coordonnées](G-04.md)
- [G-05 — Forces et unités](G-05.md)
- [G-06 — Cycles tactiques et activations](G-06.md)
- [G-07 — Actions des unités](G-07.md)
- [G-08 — Détection et brouillard de guerre](G-08.md)
- [G-09 — Système de combat naval](G-09.md)
- [G-10 — Intelligence artificielle ennemie](G-10.md)
- [G-11 — Contraintes initiales](G-11.md)
- [G-12 — Journal de bord](G-12.md)
- [G-13 — Fin de partie](G-13.md)
- [Journal de bord — règle transversale](JOURNAL.md)

## Consignes aux futurs agents

1. Lire les fichiers G-XX pertinents avant de coder une mécanique.
2. Ne jamais convertir une règle PROPOSÉE en VALIDÉE sans accord.
3. En cas d'ambiguïté, demander un arbitrage et garder la question ouverte.
4. Consulter G-13 pour les décisions de fin de partie ; ne jamais transformer les sujets ouverts en règles validées.
5. Respecter le brouillard de guerre, y compris dans les logs visibles du joueur.
6. Conserver les décisions fonctionnelles indépendantes des choix React, Zustand, Flask ou autres.

## Registre des décisions restant ouvertes

- G-02/G-03 : porte-avions immobilisé définitivement ; limites éventuelles de cycles. La défaite si toutes les escortes sont détruites est désormais VALIDÉE (AB-03.2).
- G-04 : convention interne des coordonnées, taille de carte et génération de chemins navigables.
- G-05 : fiches de navires, états et malus initiaux.
- G-06 : cas limites de résolution et stratégie d'activation ennemie.
- G-07 : préconditions et effets des actions hors recherche active.
- G-08 : suivi d'un contact identifié, contacts multiples, émission active et discrétion ; paramètres de base déjà validés.

- G-09 : paramètres et cas particuliers explicitement reportés dans [G-09](G-09.md).
- G-10 : modalités d’activation (G-06), suivi du renseignement (G-08), navigabilité (G-04), cas de mission (G-02/G-03) et détails de difficulté/prise de décision, voir [G-10](G-10.md).

- G-11 : nombre effectif sous un maximum choisi, composition minimale, valeurs de réduction, réparabilité des avaries, compatibilités et traitement des tirages incompatibles, évaluation de difficulté ; voir [G-11](G-11.md).

- G-12 : liste des événements, critères de significativité, modalités de restitution, formats, historique technique et débriefing détaillé ; voir [G-12](G-12.md). **Attention :** pendant la partie, respect du brouillard de guerre (G-12.4) ; après la mission, le débriefing peut révéler les événements auparavant inconnus (G-12.10 C4=B), sans réécriture des entrées historiques (C3=A). La proposition « une entrée par activation » de [JOURNAL.md](JOURNAL.md) reste non validée.

- G-13 : fin de mission après activation, consultation finale, victoire/défaite et bilan factuel validés ; aucun score. **Résolus :** arrivée du porte-avions en fin de cycle et projectiles encore en vol (AB-01/AB-02). **À DÉFINIR :** indicateurs et calculs du bilan ; voir [G-13](G-13.md).

## Revue transversale de cohérence

Voir [REVUE-COHERENCE-V1.md](REVUE-COHERENCE-V1.md) pour les écarts documentaires repérés et les décisions ouvertes à traiter avant la spécification fonctionnelle détaillée. **La clôture du cycle GDD n’équivaut pas à la validation de tous les paramètres de gameplay.**

## Arbitrages bloquants harmonisés

Voir [ARBITRAGES-BLOQUANTS-V1.md](ARBITRAGES-BLOQUANTS-V1.md) pour AB-01 à AB-04. Ces arbitrages précisent G-02, G-03, G-06, G-09 et G-13 sans annuler les autres points ouverts.
