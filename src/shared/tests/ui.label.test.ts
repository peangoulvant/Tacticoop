import {
  sweepEventLabel,
  contactCaption,
  contactEventLabel,
  eventLabel,
  sweepDraftLabel,
  sweepResultLabel,
} from '../ui.label';

const zone = [
  { col: 12, row: 5 },
  { col: 13, row: 5 },
  { col: 12, row: 6 },
];

describe('textes des contacts (AB-21, AB-23)', () => {
  it('cite « contact suspect », « zone approximative » et toutes les cases, sans désigner la cible', () => {
    const text = contactEventLabel({ type: 'CONTACT_DETECTED', contactId: 'C-3', cycle: 5, zone });
    expect(text).toBe('Veille : contact suspect C-3, zone approximative (12, 5) (13, 5) (12, 6)');
    expect(text).not.toMatch(/frégate|sous-marin|hostile|ennemi/i);
  });

  it('donne la légende d’une case de zone : identifiant, taille et cycle de détection', () => {
    expect(contactCaption({ kind: 'suspect', id: 'C-3', cycle: 5, zone })).toBe(
      'Contact suspect C-3 (zone approximative de 3 hexagones, détecté au cycle 5)',
    );
  });
});

describe('textes du balayage (AB-28, AB-30)', () => {
  const performed = (identified: Parameters<typeof sweepEventLabel>[0]['identified']) =>
    sweepEventLabel({
      type: 'SWEEP_PERFORMED',
      cycle: 5,
      unitId: 'friend-frigate_da-1',
      shipClass: 'frigate_da',
      identified,
    });

  it('journalise une recherche sans résultat', () => {
    expect(performed([])).toBe('Balayage (Frégate DA) : aucun nouveau contact');
  });

  it('journalise une identification avec son type et sa position exacte', () => {
    expect(
      performed([{ contactId: 'C-5', targetType: 'submarine', position: { col: 14, row: 22 } }]),
    ).toBe('Balayage (Frégate DA) : contact identifié C-5, sous-marin en (14, 22)');
  });

  it('tient plusieurs identifications dans une seule entrée, sans citer la classe', () => {
    const text = performed([
      { contactId: 'C-5', targetType: 'submarine', position: { col: 14, row: 22 } },
      { contactId: 'C-6', targetType: 'frigate', position: { col: 15, row: 20 } },
    ]);
    expect(text).toBe(
      'Balayage (Frégate DA) : contacts identifiés C-5, sous-marin en (14, 22) ; C-6, frégate en (15, 20)',
    );
    expect(text).not.toMatch(/FREMM|ASM|hostile|ennemi/i);
  });

  it('donne la légende d’une case de contact identifié, à jour ou ancien', () => {
    const contact = {
      kind: 'identified',
      id: 'C-5',
      cycle: 5,
      targetType: 'submarine',
      position: { col: 14, row: 22 },
      stale: false,
    } as const;
    expect(contactCaption(contact)).toBe(
      'Contact identifié C-5 : sous-marin, position exacte (14, 22), détecté au cycle 5',
    );
    expect(contactCaption({ ...contact, stale: true })).toBe(
      'Contact identifié C-5 : sous-marin, position exacte (14, 22), détecté au cycle 5 (ancien)',
    );
  });

  it('donne le retour explicite de 4 secondes et la consigne du brouillon', () => {
    expect(sweepResultLabel(0)).toBe('Aucun nouveau contact');
    expect(sweepResultLabel(1)).toBe('Contact identifié');
    expect(sweepResultLabel(2)).toBe('Contacts identifiés');
    expect(sweepDraftLabel('Frégate DA', 4, 60)).toContain('portée 4 hexagones (60 cases');
    expect(sweepDraftLabel('Frégate DA', 1, 6)).toContain('portée 1 hexagone ');
  });
});

describe('texte du journal de chaque événement (D-11)', () => {
  const from = { col: 2, row: 4 };
  const to = { col: 3, row: 4 };

  it('décrit un déplacement, normal ou interrompu, sans révéler l’obstacle (SF-02 §7)', () => {
    const moved = {
      type: 'UNIT_MOVED',
      unitId: 'a',
      shipClass: 'fremm',
      from,
      to,
      cycle: 1,
    } as const;
    expect(eventLabel(moved)).toBe('FREMM multimission : déplacement de (2, 4) vers (3, 4)');
    expect(eventLabel({ ...moved, interrupted: true })).toBe(
      'FREMM multimission : Déplacement interrompu (de (2, 4) à (3, 4))',
    );
  });

  it('décrit le lancement, l’ouverture d’un cycle et les événements du porte-avions', () => {
    expect(eventLabel({ type: 'MISSION_LAUNCHED', mission: 'escort', cycle: 1 })).toBe(
      'Mission lancée : Escorte de porte-avions',
    );
    expect(eventLabel({ type: 'CYCLE_STARTED', cycle: 3 })).toBe('Cycle 3 ouvert');
    expect(eventLabel({ type: 'CARRIER_MOVED', from, to, cycle: 1 })).toBe(
      'Porte-avions : navigation de (2, 4) vers (3, 4)',
    );
    expect(eventLabel({ type: 'MISSION_WON', cycle: 4 })).toContain('Mission réussie');
  });

  it('délègue les contacts et le balayage à leurs textes dédiés', () => {
    expect(eventLabel({ type: 'CONTACT_DETECTED', contactId: 'C-1', cycle: 1, zone: [from] })).toBe(
      'Veille : contact suspect C-1, zone approximative (2, 4)',
    );
    expect(
      eventLabel({
        type: 'SWEEP_PERFORMED',
        cycle: 1,
        unitId: 'a',
        shipClass: 'frigate_da',
        identified: [],
      }),
    ).toBe('Balayage (Frégate DA) : aucun nouveau contact');
  });
});
