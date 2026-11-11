import { useCarrierOrderDraftStore } from './carrier-order-draft.store';
import { useMoveDraftStore } from './move-draft.store';
import { useSweepDraftStore } from './sweep-draft.store';

/**
 * Abandonne tous les brouillons d'action en préparation (déplacement, ordre de navigation,
 * balayage). Un seul brouillon existe à la fois : toute action qui en ouvre un, qui s'exécute ou
 * qui change de partie commence par appeler cette fonction.
 *
 * C'est le **seul** endroit qui connaît la liste des brouillons. Pour ajouter une action à
 * brouillon (par exemple le tir de torpille), on crée son store puis on l'ajoute ici : les
 * autres fichiers n'ont pas à changer.
 */
export function cancelAllDrafts(): void {
  useMoveDraftStore.getState().cancelDraft();
  useCarrierOrderDraftStore.getState().cancelDraft();
  useSweepDraftStore.getState().cancelDraft();
}
