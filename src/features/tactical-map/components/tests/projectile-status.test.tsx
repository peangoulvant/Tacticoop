// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import * as engine from '../../../../engine';
import { ProjectileOverlay } from '../projectile-overlay.component';

/*
 * Pastille de statut des projectiles (AB-51) : le statut du moteur se lit dans le DOM SVG
 * (`data-status`) et dans l'info-bulle. Le dessin lui-même (position, couleurs) se vérifie dans un
 * navigateur : jsdom ne rend pas le SVG.
 */

function shot(
  id: string,
  weapon: engine.WeaponKind,
  side: engine.Side,
  status: engine.ProjectileStatus,
  col: number,
): engine.ObservedProjectile {
  return { id, weapon, side, position: { col, row: 2 }, route: [], status };
}

describe('statut affiché sur chaque projectile', () => {
  it('montre le statut du moteur et le dit en toutes lettres dans l’info-bulle', () => {
    render(
      <svg>
        <ProjectileOverlay
          projectiles={[
            shot('P-1', 'missile', 'friend', 'targeted', 1),
            shot('P-2', 'torpedo', 'friend', 'searching', 3),
            shot('P-3', 'missile', 'hostile', 'unknown', 5),
          ]}
          occupiedHexes={[]}
          orientations={new Map()}
          selectedId={null}
        />
      </svg>,
    );
    const statuses = screen.getAllByTestId('projectile-status').map((el) => el.dataset.status);
    expect(statuses).toEqual(['targeted', 'searching', 'unknown']);
    expect(screen.getByText('missile allié P-1 — en route vers sa cible')).toBeInTheDocument();
    expect(screen.getByText('torpille allié P-2 — recherche sa cible')).toBeInTheDocument();
    expect(screen.getByText('missile hostile P-3 — cible inconnue')).toBeInTheDocument();
  });
});
