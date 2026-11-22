import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import * as engine from '../../../engine';
import { useCarrierOrderDraftStore } from '../../../store/carrier-order-draft.store';
import { useFireDraftStore } from '../../../store/fire-draft.store';
import { useMoveDraftStore } from '../../../store/move-draft.store';
import { useSelectionStore } from '../../../store/selection.store';
import type { CarrierRouteView } from '../../fleet';
import type { FireDraft, MoveDraft, SweepDraft } from '../../commands';
import { FinishFlag, TerrainLayer, UnitToken } from './map-layers.component';
import { HexCaption, ZoomControls } from './map-controls.component';
import { HEX_POINTS, hexCenter, mapViewBox } from '../services/hex-geometry.service';
import { CarrierRouteOverlay } from './carrier-route-overlay.component';
import { ContactOverlay } from './contact-overlay.component';
import { FireOverlay } from './fire-overlay.component';
import { MoveOverlay } from './move-overlay.component';
import { ProjectileOverlay, ProjectileRouteOverlay } from './projectile-overlay.component';
import { SweepOverlay } from './sweep-overlay.component';
import {
  currentSelectable,
  nextSelectable,
  selectablesAt,
} from '../services/cell-selection.service';
import { nextHeadings, type HeadingMemory } from '../services/projectile-heading.service';
import { useMapView } from '../services/use-map-view';

/**
 * Carte tactique : rendu SVG 2D simplifié (docs/maquette). Occupe toute la zone (tronquée si
 * besoin), se déplace par glisser-déposer et se zoome à la molette, comme une carte en ligne.
 */
export function TacticalMap({
  mission,
  move,
  sweep,
  fire,
  carrierRoute,
}: {
  mission: engine.MissionState;
  move: MoveDraft | null;
  sweep: SweepDraft | null;
  fire: FireDraft | null;
  carrierRoute: CarrierRouteView | null;
}) {
  // La carte n'affiche que ce que le joueur connaît : jamais une unité hostile non détectée.
  const observation = useMemo(() => engine.observeFriend(mission), [mission]);
  const { map, units, start, goal, contacts, projectiles } = observation;
  const {
    selectedUnitId,
    selectedProjectileId,
    selectedHex,
    selectUnit,
    selectProjectile,
    selectHex,
  } = useSelectionStore();
  const content = mapViewBox(map);

  // Sens de marche observé des projectiles : dérivé pendant le rendu d'après la liste précédente.
  const [seen, setSeen] = useState<{
    source: typeof projectiles | null;
    headings: Map<string, HeadingMemory>;
  }>({ source: null, headings: new Map() });
  if (seen.source !== projectiles) {
    setSeen({ source: projectiles, headings: nextHeadings(seen.headings, projectiles) });
  }
  // Cases où un projectile ne se centre pas : unités alliées et navires hostiles identifiés.
  const occupiedHexes = [
    ...units.map((u) => u.position),
    ...contacts.flatMap((c) => (c.kind === 'identified' ? [c.position] : [])),
  ];

  const previewDestination = useMoveDraftStore((s) => s.previewDestination);
  const previewWaypoint = useCarrierOrderDraftStore((s) => s.previewWaypoint);
  const chooseFireTarget = useFireDraftStore((s) => s.chooseTarget);

  // Pendant un tir, une case visable choisit la cible. Sinon une case occupée choisit l'unité ou le
  // projectile allié qui s'y trouve (des clics répétés font défiler). Une case vide choisit la
  // destination du déplacement ou le point de passage en préparation ; sans rien en préparation,
  // elle désélectionne.
  const selectAt = (hex: engine.Hex) => {
    const current = currentSelectable(selectedUnitId, selectedProjectileId);
    const chosen = nextSelectable(selectablesAt(units, projectiles, hex), current);
    if (chosen?.kind === 'unit') selectUnit(chosen.id);
    else if (chosen) selectProjectile(chosen.id);
    else if (move) previewDestination(hex);
    else if (carrierRoute?.picking) previewWaypoint(hex);
    else selectUnit(null);
  };
  const onCellClick = (hex: engine.Hex) => {
    selectHex(hex);
    const target = fire?.candidates.find((c) => c.hexes.some((h) => engine.sameHex(h, hex)));
    if (target) chooseFireTarget(target.contactId, target.kind === 'suspect' ? hex : null);
    else selectAt(hex);
  };
  const { containerRef, viewport, view, zoomBy, resetView, pointerHandlers } = useMapView(
    content.width,
    content.height,
    hexCenter(start).y,
    onCellClick,
  );
  const selected = selectedHex ? hexCenter(selectedHex) : null;

  return (
    <Box sx={{ position: 'relative', height: '100%', minHeight: 0, bgcolor: '#050c19' }}>
      <Box
        ref={containerRef}
        {...pointerHandlers}
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
          touchAction: 'none',
        }}
      >
        <svg
          role="img"
          aria-label="Carte tactique"
          width={viewport.width}
          height={viewport.height}
          style={{ display: 'block' }}
        >
          {view && (
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              <TerrainLayer map={map} />
              <ContactOverlay contacts={contacts} />
              <SweepOverlay sweep={sweep} />
              <FireOverlay fire={fire} />
              <MoveOverlay move={move} />
              <CarrierRouteOverlay view={carrierRoute} />
              {selected && (
                <g transform={`translate(${selected.x} ${selected.y})`} pointerEvents="none">
                  <polygon points={HEX_POINTS} fill="none" stroke="#5fd3ff" strokeWidth="1.6" />
                </g>
              )}
              {goal && <FinishFlag hex={goal} />}
              {units.map((u) => (
                <UnitToken key={u.id} unit={u} selected={u.id === selectedUnitId} />
              ))}
              <ProjectileRouteOverlay
                projectile={projectiles.find((p) => p.id === selectedProjectileId)}
              />
              <ProjectileOverlay
                projectiles={projectiles}
                occupiedHexes={occupiedHexes}
                headings={seen.headings}
                selectedId={selectedProjectileId}
              />
            </g>
          )}
        </svg>
      </Box>
      <ZoomControls onZoom={zoomBy} onReset={resetView} />
      <HexCaption
        map={map}
        hex={selectedHex}
        unit={units.find((u) => selectedHex && engine.sameHex(u.position, selectedHex))}
        contacts={contacts}
        projectiles={projectiles}
      />
    </Box>
  );
}
