import { Button, TextField, Typography } from '@mui/material';
import * as engine from '../../../engine';
import { MapBar } from '../../../shared/map-bar.component';
import * as labelEngine from '../../../shared/engine.label';
import * as labels from '../../../shared/ui.label';
import { useFireDraftStore } from '../../../store/fire-draft.store';
import { confirmFire } from '../services/command-actions.service';
import type { FireDraft } from '../services/use-fire-draft';

/** Liste des cibles visables : contacts identifiés et zones suspectes à portée (AB-46). */
function TargetSelect({ fire }: { fire: FireDraft }) {
  const chooseTarget = useFireDraftStore((s) => s.chooseTarget);
  const contactsById = new Map(fire.contacts.map((c) => [c.id, c]));
  return (
    <TextField
      select
      size="small"
      label={labels.fireText.target}
      value={fire.contactId ?? ''}
      onChange={(event) => chooseTarget(event.target.value, null)}
      sx={{ minWidth: 280 }}
      slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
    >
      <option value="" disabled>
        —
      </option>
      {fire.candidates.map(({ contactId }) => (
        <option key={contactId} value={contactId}>
          {labels.fireOptionLabel(contactsById.get(contactId) as engine.ObservedContact)}
        </option>
      ))}
    </TextField>
  );
}

/** Ce que le tir choisi appelle d'explication : refus du moteur, ou avertissements de ligne de tir. */
function shotNotices(fire: FireDraft): string[] {
  const { preview } = fire;
  if (!preview) return [];
  if (!preview.ok) return [labelEngine.fireRefusalMessages[preview.reason]];
  return preview.warnings.map((warning) => labels.fireWarningLabel[warning]);
}

/**
 * Confirmation ou annulation du brouillon de tir (AB-45) : récapitulatif de l'arme, de la cible
 * ou zone et du stock, avertissements de ligne de tir, puis Confirmer / Annuler. Un tir avec
 * avertissement reste possible : le joueur est prévenu, pas empêché.
 */
export function FireBar({ fire }: { fire: FireDraft | null }) {
  const cancelDraft = useFireDraftStore((s) => s.cancelDraft);
  if (!fire) return null;
  const { unit, weapon, stock, candidates, target } = fire;
  const label = engine.defaultConfig.ships[unit.shipClass].label;
  const candidate = candidates.find((c) => c.contactId === fire.contactId);
  const contact = fire.contacts.find((c) => c.id === fire.contactId);
  const summary = labels.fireTargetLabel(candidate, contact, fire.hex);
  return (
    <MapBar>
      {candidates.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'warning.main' }}>
          {`${label} : ${labels.fireText.noTarget}`}
        </Typography>
      ) : (
        <>
          <Typography variant="body2">
            {labels.fireDraftLabel(label, weapon, stock, summary)}
          </Typography>
          <TargetSelect fire={fire} />
          {shotNotices(fire).map((notice) => (
            <Typography key={notice} variant="body2" sx={{ color: 'warning.main' }}>
              {notice}
            </Typography>
          ))}
        </>
      )}
      <Button
        size="small"
        variant="contained"
        sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        disabled={!target || !fire.preview?.ok}
        onClick={() => target && confirmFire(unit.id, weapon, target)}
      >
        {labels.fireText.confirm}
      </Button>
      <Button size="small" onClick={cancelDraft}>
        {labels.fireText.cancel}
      </Button>
    </MapBar>
  );
}
