import { Button, Typography } from '@mui/material';
import * as engine from '../../../engine';
import { MapBar } from '../../../shared/map-bar.component';
import * as labels from '../../../shared/ui.label';
import { useSweepDraftStore } from '../../../store/sweep-draft.store';
import { confirmSweep } from '../services/command-actions.service';
import type { SweepDraft } from '../services/use-sweep-draft';

/** Confirmation ou annulation du brouillon de balayage, sans paramètre à choisir (AB-30). */
export function SweepBar({ sweep }: { sweep: SweepDraft | null }) {
  const cancelDraft = useSweepDraftStore((s) => s.cancelDraft);
  if (!sweep) return null;
  const { unit, range, area } = sweep;
  const label = engine.defaultConfig.ships[unit.shipClass].label;
  return (
    <MapBar>
      <Typography variant="body2">{labels.sweepDraftLabel(label, range, area.length)}</Typography>
      <Button size="small" variant="contained" onClick={() => confirmSweep(unit.id)}>
        {labels.sweepText.confirm}
      </Button>
      <Button size="small" onClick={cancelDraft}>
        {labels.sweepText.cancel}
      </Button>
    </MapBar>
  );
}
