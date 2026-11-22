import { describe, expect, it } from 'vitest';
import * as engine from '../../../../engine';
import { nextSelectable, selectablesAt } from '../cell-selection.service';

const HERE = { col: 4, row: 4 };

const unit = { id: 'u', position: HERE } as engine.Unit;
function shot(id: string, side: engine.Side, position = HERE) {
  return {
    id,
    weapon: 'missile',
    side,
    position,
    route: [],
    status: 'targeted',
  } as engine.ObservedProjectile;
}

describe('éléments sélectionnables d’une case', () => {
  it('liste l’unité d’abord, puis les projectiles alliés, jamais les hostiles', () => {
    const list = selectablesAt(
      [unit],
      [shot('P-1', 'friend'), shot('P-2', 'hostile'), shot('P-3', 'friend')],
      HERE,
    );
    expect(list).toEqual([
      { kind: 'unit', id: 'u' },
      { kind: 'projectile', id: 'P-1' },
      { kind: 'projectile', id: 'P-3' },
    ]);
  });

  it('ignore ce qui est sur une autre case', () => {
    expect(selectablesAt([unit], [shot('P-1', 'friend', { col: 0, row: 0 })], HERE)).toEqual([
      { kind: 'unit', id: 'u' },
    ]);
  });
});

describe('défilement par clics répétés', () => {
  const list = selectablesAt([unit], [shot('P-1', 'friend')], HERE);

  it('choisit le premier, puis le suivant, puis revient au premier', () => {
    expect(nextSelectable(list, null, null)).toEqual({ kind: 'unit', id: 'u' });
    expect(nextSelectable(list, 'u', null)).toEqual({ kind: 'projectile', id: 'P-1' });
    expect(nextSelectable(list, null, 'P-1')).toEqual({ kind: 'unit', id: 'u' });
  });

  it('repart du premier si la sélection courante n’est pas sur la case', () => {
    expect(nextSelectable(list, 'ailleurs', null)).toEqual({ kind: 'unit', id: 'u' });
  });

  it('ne choisit rien sur une case sans unité ni projectile allié', () => {
    expect(nextSelectable([], null, null)).toBeNull();
  });
});
