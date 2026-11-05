import { defaultConfig } from '../config/gameConfig';
import { createUnit } from './unit';

const position = { col: 0, row: 0 };
function make(
  shipClass: Parameters<typeof createUnit>[2],
  movementCap: number | null,
  config = defaultConfig,
) {
  return createUnit('u', 'friend', shipClass, position, config, { ammoFactor: 1, movementCap });
}

describe('createUnit — plafond de déplacement (Météo défavorable)', () => {
  it('plafonne une frégate à 2 hexagones et laisse inchangée une unité déjà à 2', () => {
    expect(make('fremm', 2).movement).toBe(2);
    expect(make('submarine', 2).movement).toBe(2);
  });

  it('ne plafonne pas le porte-avions, même si son mouvement dépasse le plafond', () => {
    // Le porte-avions de base a 2 hexagones, égal au plafond : on force 3 pour distinguer l'exemption.
    const config = {
      ...defaultConfig,
      ships: { ...defaultConfig.ships, carrier: { ...defaultConfig.ships.carrier, movement: 3 } },
    };
    expect(make('carrier', 2, config).movement).toBe(3);
  });
});

describe('createUnit — dotations', () => {
  it("arrondit à l'entier inférieur après réduction", () => {
    const unit = createUnit('u', 'friend', 'frigate_asm', position, defaultConfig, {
      ammoFactor: 0.7,
      movementCap: null,
    });
    expect(unit).toMatchObject({ missiles: 1, torpedoes: 4, helicopters: 2 });
  });
});
