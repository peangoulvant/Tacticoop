import { defaultConfig, type ShipClass } from '../config/gameConfig';
import { createUnit, type Unit } from '../units/unit';
import { moveBlocker, orderBlocker } from './activation';

function make(id: string, shipClass: ShipClass, patch: Partial<Unit> = {}): Unit {
  const unit = createUnit(id, 'friend', shipClass, { col: 0, row: 0 }, defaultConfig, {
    ammoFactor: 1,
    movementCap: null,
  });
  return { ...unit, ...patch };
}

describe('orderBlocker', () => {
  it('laisse une unité disponible recevoir des ordres', () => {
    const a = make('a', 'fremm');
    expect(orderBlocker([a, make('b', 'frigate_da')], a)).toBeNull();
  });

  it('bloque le porte-avions et une unité déjà activée', () => {
    const carrier = make('c', 'carrier');
    const done = make('a', 'fremm', { activation: 'activated' });
    expect(orderBlocker([carrier, done], carrier)).toBe('NOT_ACTIVABLE');
    expect(orderBlocker([carrier, done], done)).toBe('ALREADY_ACTIVATED');
  });

  it("réserve les ordres à l'unité en cours d'activation", () => {
    const engaged = make('a', 'fremm', { activation: 'in_progress' });
    const other = make('b', 'frigate_da');
    expect(orderBlocker([engaged, other], other)).toBe('OTHER_ACTIVATION_IN_PROGRESS');
    expect(orderBlocker([engaged, other], engaged)).toBeNull();
  });
});

describe('moveBlocker', () => {
  it('autorise un seul déplacement par activation', () => {
    const moved = make('a', 'fremm', { activation: 'in_progress', hasMoved: true });
    expect(moveBlocker([moved], moved)).toBe('ALREADY_MOVED');
    const fresh = make('b', 'fremm');
    expect(moveBlocker([fresh], fresh)).toBeNull();
  });

  it('reprend les motifs qui empêchent de recevoir un ordre', () => {
    const carrier = make('c', 'carrier');
    expect(moveBlocker([carrier], carrier)).toBe('NOT_ACTIVABLE');
  });
});
