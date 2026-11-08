import { Button, Typography } from '@mui/material';
import * as engine from '../../../engine';
import { MapBar } from '../../../shared/map-bar.component';
import * as labels from '../../../shared/ui.label';
import { useSearchDraftStore } from '../../../store/search-draft.store';
import { confirmSearch } from '../services/command-actions.service';
import type { SearchDraft } from '../services/use-search-draft';

/** Confirmation ou annulation du brouillon de recherche active, sans paramètre à choisir (AB-30). */
export function SearchBar({ search }: { search: SearchDraft | null }) {
  const cancelDraft = useSearchDraftStore((s) => s.cancelDraft);
  if (!search) return null;
  const { unit, range, area } = search;
  const label = engine.defaultConfig.ships[unit.shipClass].label;
  return (
    <MapBar>
      <Typography variant="body2">{labels.searchDraftLabel(label, range, area.length)}</Typography>
      <Button size="small" variant="contained" onClick={() => confirmSearch(unit.id)}>
        {labels.searchText.confirm}
      </Button>
      <Button size="small" onClick={cancelDraft}>
        {labels.searchText.cancel}
      </Button>
    </MapBar>
  );
}
