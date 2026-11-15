# 9. Le modèle de données

Les principaux types du moteur et leurs liens. Le code est fonctionnel (fonctions et types, pas de classes) : ce schéma utilise la notation « classes » seulement pour montrer les relations, sans les champs.

```mermaid
classDiagram
    direction LR
    class GameState
    class PreparationState
    class MissionState
    class MissionSetup
    class Unit
    class ShipSpec
    class GameMap
    class Contact
    class CarrierNavigation
    class GameCommand
    class CommandResult
    class GameEvent
    class GameConfig

    GameState <|-- PreparationState
    GameState <|-- MissionState
    PreparationState --> MissionSetup : choix de préparation
    MissionState --> MissionSetup
    MissionState "1" *-- "*" Unit : alliées et hostiles
    MissionState *-- GameMap : carte du scénario
    MissionState "1" *-- "*" Contact : un jeu par camp
    MissionState --> CarrierNavigation : escorte seulement
    Unit --> ShipSpec : sa classe de navire
    GameConfig *-- ShipSpec : une fiche par classe

    GameCommand ..> CommandResult : executeCommand
    CommandResult --> MissionState : nouvel état
    CommandResult --> GameEvent : journal
    GameConfig ..> CommandResult : valeurs lues par les règles
```

## Lecture

- **`GameState`** est soit une préparation (avant le lancement), soit une mission en cours.
- **`MissionState` est l'état réel complet** : le joueur n'y accède jamais directement, il passe par `observeFriend`.
- **`Unit` ne porte que l'état courant** : les caractéristiques de sa classe restent dans `GameConfig` (`ShipSpec`).
- **Une commande ne modifie rien** : `executeCommand` renvoie un nouvel état et des événements, ou un refus.

Fichiers : `core/game.types.ts`, `units/unit.model.ts`, `detection/contact.types.ts`, `config/game.config.ts`.
