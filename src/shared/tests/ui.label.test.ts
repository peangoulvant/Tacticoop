import { contactCaption, contactEventLabel } from '../ui.label';

const zone = [
  { col: 12, row: 5 },
  { col: 13, row: 5 },
  { col: 12, row: 6 },
];

describe('textes des contacts (AB-21, AB-23)', () => {
  it('cite « contact suspect », « zone approximative » et toutes les cases, sans désigner la cible', () => {
    const text = contactEventLabel({ type: 'CONTACT_DETECTED', contactId: 'C-3', cycle: 5, zone });
    expect(text).toBe(
      'Veille passive : contact suspect C-3, zone approximative (12, 5) (13, 5) (12, 6)',
    );
    expect(text).not.toMatch(/frégate|sous-marin|hostile|ennemi/i);
  });

  it('donne la légende d’une case de zone : identifiant, taille et cycle de détection', () => {
    expect(contactCaption({ id: 'C-3', cycle: 5, zone })).toBe(
      'Contact suspect C-3 (zone approximative de 3 hexagones, détecté au cycle 5)',
    );
  });
});
