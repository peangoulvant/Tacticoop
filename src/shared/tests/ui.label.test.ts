import type * as engine from '../../engine';
import {
  sweepEventLabel,
  contactCaption,
  contactEventLabel,
  eventLabel,
  sweepDraftLabel,
  sweepResultLabel,
  fireDraftLabel,
  fireOptionLabel,
  fireResultLabel,
  fireTargetLabel,
  fireWarningLabel,
  projectileCaption,
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
    expect(eventLabel({ type: 'MISSION_WON', cycle: 4, cause: 'carrier_arrived' })).toContain(
      'Mission réussie',
    );
  });

  it('décrit les tirs et les projectiles sans révéler de détail caché (AB-49)', () => {
    expect(
      eventLabel({
        type: 'SHOT_FIRED',
        cycle: 1,
        unitId: 'a',
        shipClass: 'frigate_da',
        weapon: 'torpedo',
        contactId: 'C-2',
        hex: from,
      }),
    ).toBe('Frégate DA : tir de torpille sur le contact C-2, hexagone choisi (2, 4)');
    expect(
      eventLabel({
        type: 'PROJECTILE_DETECTED',
        cycle: 1,
        projectileId: 'P-2',
        weapon: 'missile',
        position: from,
      }),
    ).toBe('Projectile détecté : missile en (2, 4)');
    expect(
      eventLabel({
        type: 'PROJECTILE_NEUTRALISED',
        cycle: 1,
        projectileId: 'P-2',
        weapon: 'torpedo',
      }),
    ).toBe('Une torpille est restée sans effet');
  });

  it('décrit un impact : l’arme en sujet, la cible nommée par sa classe, sans détail hostile', () => {
    const base = { type: 'PROJECTILE_IMPACT', cycle: 1, projectileId: 'P-1' } as const;
    const friend = { side: 'friend', unitId: 'a', shipClass: 'fremm' } as const;
    const missile = { ...base, weapon: 'missile' } as const;
    expect(eventLabel({ ...missile, result: 'hit', victim: friend })).toBe(
      'Un missile a touché la cible FREMM multimission',
    );
    expect(eventLabel({ ...missile, result: 'destroyed', victim: friend })).toBe(
      'Un missile a détruit la cible FREMM multimission',
    );
    expect(eventLabel({ ...missile, result: 'missed', victim: friend })).toBe(
      'Un missile a manqué la cible FREMM multimission',
    );
    expect(eventLabel({ ...base, weapon: 'torpedo', result: 'missed', victim: friend })).toBe(
      'Une torpille a manqué la cible FREMM multimission',
    );
    expect(eventLabel({ ...missile, result: 'hit', victim: { side: 'hostile' } })).toBe(
      'Un missile a touché un navire hostile',
    );
    expect(
      eventLabel({ ...base, weapon: 'torpedo', result: 'destroyed', victim: { side: 'hostile' } }),
    ).toBe('Une torpille a détruit un navire hostile');
  });

  it('annonce la fin de mission avec sa cause', () => {
    expect(eventLabel({ type: 'MISSION_WON', cycle: 2, cause: 'hostile_fleet_destroyed' })).toBe(
      'Mission réussie : La flotte ennemie est détruite.',
    );
    expect(eventLabel({ type: 'MISSION_LOST', cycle: 2, cause: 'carrier_destroyed' })).toBe(
      'Mission perdue : Le porte-avions est détruit.',
    );
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

describe('textes du tir (AB-45)', () => {
  it('récapitule l’arme, la cible et le stock, au singulier comme au pluriel', () => {
    expect(fireDraftLabel('Frégate DA', 'missile', 6, 'contact C-1 (frégate)')).toBe(
      'Frégate DA : missile, contact C-1 (frégate) (6 restants)',
    );
    expect(fireDraftLabel('Sous-marin', 'torpedo', 1, 'zone C-2, hexagone (4, 3)')).toBe(
      'Sous-marin : torpille, zone C-2, hexagone (4, 3) (1 restant)',
    );
  });

  it('nomme la cible : contact identifié, zone avec son hexagone, ou invite à choisir', () => {
    const identified = {
      kind: 'identified',
      id: 'C-1',
      cycle: 1,
      targetType: 'submarine',
      position: { col: 4, row: 4 },
      stale: false,
    } as const;
    const suspect = { kind: 'suspect', id: 'C-2', cycle: 1, zone } as const;
    const candidate: engine.ShotCandidate = { contactId: 'C-1', kind: 'identified', hexes: [] };
    expect(fireTargetLabel(candidate, identified, null)).toBe('contact C-1 (sous-marin)');
    expect(fireTargetLabel({ ...candidate, kind: 'suspect' }, suspect, { col: 12, row: 5 })).toBe(
      'zone C-2, hexagone (12, 5)',
    );
    expect(fireTargetLabel(undefined, undefined, null)).toBe('cible à choisir');
    expect(fireOptionLabel(suspect)).toBe('C-2 — zone suspecte');
  });

  it('avertit des lignes de tir amies, annonce le lancement et légende un projectile', () => {
    expect(fireWarningLabel.FRIENDLY_ON_ROUTE).toMatch(/croise une unité alliée/);
    expect(fireWarningLabel.FRIENDLY_ON_AIMED_HEX).toMatch(/occupe la case visée/);
    expect(fireResultLabel.missile).toBe('Missile lancé');
    expect(fireResultLabel.torpedo).toBe('Torpille lancée');
    const shot: engine.ObservedProjectile = {
      id: 'P-2',
      weapon: 'torpedo',
      side: 'hostile',
      position: { col: 2, row: 4 },
      route: [],
    };
    expect(projectileCaption(shot)).toBe('torpille hostile P-2');
  });
});
