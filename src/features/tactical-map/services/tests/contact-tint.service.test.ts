import { contactTint } from '../contact-tint.service';

const TINTS = ['a', 'b', 'c', 'd'];

describe('teinte des contacts (AB-26)', () => {
  it('attribue la teinte selon le numéro, en boucle sur quatre teintes', () => {
    expect(['C-1', 'C-2', 'C-3', 'C-4', 'C-5'].map((id) => contactTint(id, TINTS))).toEqual([
      'a',
      'b',
      'c',
      'd',
      'a',
    ]);
  });

  it('donne la même teinte à C-1, C-5 et C-9, et une autre à C-2', () => {
    expect(contactTint('C-9', TINTS)).toBe(contactTint('C-1', TINTS));
    expect(contactTint('C-5', TINTS)).toBe(contactTint('C-1', TINTS));
    expect(contactTint('C-2', TINTS)).not.toBe(contactTint('C-1', TINTS));
  });
});
