import { defaultConfig } from '../../config/game.config';
import { createUnit, unitAt } from '../unit.model';

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

describe('unitAt', () => {
  const units = [
    createUnit('a', 'friend', 'fremm', { col: 2, row: 3 }, defaultConfig, {
      ammoFactor: 1,
      movementCap: null,
    }),
    createUnit('b', 'hostile', 'submarine', { col: 5, row: 1 }, defaultConfig, {
      ammoFactor: 1,
      movementCap: null,
    }),
  ];

  it('rend l’unité qui occupe la case, de n’importe quel camp', () => {
    expect(unitAt(units, { col: 2, row: 3 })?.id).toBe('a');
    expect(unitAt(units, { col: 5, row: 1 })?.id).toBe('b');
  });

  it('ne rend rien pour une case vide', () => {
    expect(unitAt(units, { col: 0, row: 0 })).toBeUndefined();
    expect(unitAt([], { col: 2, row: 3 })).toBeUndefined();
  });
});
