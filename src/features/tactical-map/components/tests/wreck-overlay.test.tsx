// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import * as engine from '../../../../engine';
import { WreckOverlay } from '../wreck-overlay.component';

/*
 * Épaves (AB-52) : une icône par épave, avec le camp du navire et une légende sans classe. Le
 * dessin (pleine case, teinte, pointillés) se vérifie dans un navigateur : jsdom ne rend pas le SVG.
 */

describe('épaves sur la carte', () => {
  it('dessine une épave par case détruite, avec le camp du navire', () => {
    const wrecks: engine.ObservedWreck[] = [
      { position: { col: 3, row: 2 }, side: 'friend' },
      { position: { col: 9, row: 6 }, side: 'hostile' },
    ];
    render(
      <svg>
        <WreckOverlay wrecks={wrecks} />
      </svg>,
    );
    const drawn = screen.getAllByTestId('wreck');
    expect(drawn.map((el) => el.dataset.side)).toEqual(['friend', 'hostile']);
    expect(screen.getByText('épave d’un navire allié')).toBeInTheDocument();
    expect(screen.getByText('épave d’un navire hostile')).toBeInTheDocument();
  });

  it('ne dessine rien sans épave', () => {
    render(
      <svg>
        <WreckOverlay wrecks={[]} />
      </svg>,
    );
    expect(screen.queryByTestId('wreck')).not.toBeInTheDocument();
  });
});
