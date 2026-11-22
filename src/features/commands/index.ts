// API publique de la feature « commands » : les autres features n'importent que depuis ce fichier.
export { ActionResultToast } from './components/action-result-toast.component';
export { EndCycleButton } from './components/end-cycle-button.component';
export { MissionResultBanner } from './components/mission-result-banner.component';
export { FireBar } from './components/fire-bar.component';
export { MoveBar } from './components/move-bar.component';
export { NewGameButton } from './components/new-game-button.component';
export { SweepBar } from './components/sweep-bar.component';
export {
  endActivation,
  startFireDraft,
  startMoveDraft,
  startSweepDraft,
} from './services/command-actions.service';
export { useFireDraft, type FireDraft } from './services/use-fire-draft';
export { useMoveDraft, type MoveDraft } from './services/use-move-draft';
export { useSweepDraft, type SweepDraft } from './services/use-sweep-draft';
