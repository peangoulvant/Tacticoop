import { IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import * as engine from '../../../engine';
import * as labels from '../../../shared/ui.label';

/*
 * Contrôles posés par-dessus la carte : zoom et légende de la case sélectionnée.
 */

const overlay = { position: 'absolute', bgcolor: 'rgba(6,15,31,0.85)', borderRadius: 1 } as const;

export function ZoomControls({
  onZoom,
  onReset,
}: {
  onZoom: (factor: number) => void;
  onReset: () => void;
}) {
  return (
    <Stack sx={{ ...overlay, top: 8, right: 16 }}>
      <IconButton size="small" aria-label="Zoom avant" onClick={() => onZoom(1.25)}>
        <AddIcon />
      </IconButton>
      <IconButton size="small" aria-label="Zoom arrière" onClick={() => onZoom(0.8)}>
        <RemoveIcon />
      </IconButton>
      <IconButton size="small" aria-label="Réinitialiser la vue" onClick={onReset}>
        <FitScreenIcon />
      </IconButton>
    </Stack>
  );
}

/** Légende de la case sélectionnée : coordonnées, terrain et bâtiment éventuel. */
export function HexCaption({
  map,
  hex,
  unit,
  contacts,
}: {
  map: engine.GameMap;
  hex: engine.Hex | null;
  unit?: engine.Unit;
  contacts: readonly engine.ObservedContact[];
}) {
  const text = hex
    ? `(${hex.col}, ${hex.row}) — ${labels.terrainLabel[engine.terrainAt(map, hex)]}`
    : 'Sélectionnez un hexagone';
  const ship = unit ? ` — ${engine.defaultConfig.ships[unit.shipClass].label}` : '';
  const covering = hex
    ? contacts.filter((c) => engine.contactHexes(c).some((h) => engine.sameHex(h, hex)))
    : [];
  const suspects = covering.map((contact) => ` — ${labels.contactCaption(contact)}`).join('');
  return (
    <Typography variant="caption" sx={{ ...overlay, left: 8, bottom: 8, px: 1, py: 0.25 }}>
      {`${text}${ship}${suspects} · ${map.width}×${map.height}`}
    </Typography>
  );
}
