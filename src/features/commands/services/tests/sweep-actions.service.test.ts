import * as engine from '../../../../engine';
import { useGameStore } from '../../../../store/game.store';
import { useMoveDraftStore } from '../../../../store/move-draft.store';
import { useSweepDraftStore } from '../../../../store/sweep-draft.store';
import { useSweepResultStore } from '../../../../store/sweep-result.store';
import { confirmSweep, startMoveDraft, startSweepDraft } from '../command-actions.service';

/** Mission lancée par le moteur, comme l'application, puis restaurée dans le store. */
function launchedMission(): engine.MissionState {
  let state: engine.GameState = { status: 'preparation', setup: engine.initialSetup() };
  const commands: engine.GameCommand[] = [
    { type: 'SELECT_MISSION', mission: 'naval_combat' },
    { type: 'ADD_SHIP', shipClass: 'frigate_da' },
    { type: 'LAUNCH_MISSION', seed: 3 },
  ];
  for (const command of commands) {
    const result = engine.executeCommand(state, command, engine.defaultConfig);
    if (!result.ok) throw new Error(result.error.message);
    state = result.state;
  }
  if (state.status !== 'in_progress') throw new Error('mission non lancée');
  return state;
}

beforeEach(() => {
  useGameStore.getState().restore(launchedMission(), []);
  useSweepDraftStore.getState().cancelDraft();
  useMoveDraftStore.getState().cancelDraft();
  useSweepResultStore.getState().clear();
});

function searcherId(): string {
  const state = useGameStore.getState().state;
  if (state.status !== 'in_progress') throw new Error('mission non lancée');
  return state.units.find((u) => u.side === 'friend')!.id;
}

describe('actions de la balayage (AB-30)', () => {
  it('confirmer résout la recherche, ferme le brouillon et affiche le retour explicite', () => {
    const unitId = searcherId();
    startSweepDraft(unitId);
    expect(useSweepDraftStore.getState().unitId).toBe(unitId);
    confirmSweep(unitId);
    expect(useSweepDraftStore.getState().unitId).toBeNull();
    expect(useSweepResultStore.getState().result).toMatchObject({
      identified: expect.any(Number),
    });
    const events = useGameStore.getState().events;
    expect(events.map((e) => e.type)).toEqual(['SWEEP_PERFORMED']);
  });

  it('un seul brouillon à la fois : une recherche remplace le déplacement, et inversement', () => {
    const unitId = searcherId();
    startMoveDraft(unitId);
    startSweepDraft(unitId);
    expect(useMoveDraftStore.getState().unitId).toBeNull();
    expect(useSweepDraftStore.getState().unitId).toBe(unitId);
    startMoveDraft(unitId);
    expect(useSweepDraftStore.getState().unitId).toBeNull();
    expect(useMoveDraftStore.getState().unitId).toBe(unitId);
  });

  it('une recherche refusée garde le brouillon et n’affiche aucun retour', () => {
    const unitId = searcherId();
    confirmSweep(unitId);
    useSweepResultStore.getState().clear();
    startSweepDraft(unitId);
    confirmSweep(unitId);
    expect(useGameStore.getState().lastError).toMatchObject({ code: 'SPECIAL_ACTION_USED' });
    expect(useSweepDraftStore.getState().unitId).toBe(unitId);
    expect(useSweepResultStore.getState().result).toBeNull();
    expect(useGameStore.getState().events).toHaveLength(1);
  });
});
