// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import * as engine from '../../engine';
import { LogbookPanel } from '../../features/logbook';

/*
 * Défilement du journal de bord : la barre reste en bas à chaque nouveau message. jsdom ne fait
 * aucune mise en page (`scrollHeight` vaut toujours 0) : on lui impose une hauteur de contenu et on
 * vérifie que le composant place `scrollTop` dessus.
 */

const CONTENT_HEIGHT = 480;

function cycleStarted(cycle: number): engine.GameEvent {
  return { type: 'CYCLE_STARTED', cycle };
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(CONTENT_HEIGHT);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function panelOf(): HTMLElement {
  return screen.getByText('Journal de bord').parentElement as HTMLElement;
}

describe('défilement du journal de bord', () => {
  it('descend tout en bas à l’affichage', () => {
    render(<LogbookPanel events={[cycleStarted(1), cycleStarted(2)]} />);
    expect(panelOf().scrollTop).toBe(CONTENT_HEIGHT);
  });

  it('redescend à chaque nouveau message, même si le joueur avait remonté', () => {
    const { rerender } = render(<LogbookPanel events={[cycleStarted(1)]} />);
    panelOf().scrollTop = 0;
    rerender(<LogbookPanel events={[cycleStarted(1), cycleStarted(2)]} />);
    expect(panelOf().scrollTop).toBe(CONTENT_HEIGHT);
  });
});
