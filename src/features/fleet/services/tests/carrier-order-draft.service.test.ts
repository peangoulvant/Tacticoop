import * as engine from '../../../../engine';
import {
  buildCarrierOrderDraft,
  buildCarrierRouteView,
  carrierOrderUnavailability,
} from '../carrier-order-draft.service';

/** Escorte lancée par le moteur, comme dans l'application. */
function launchedEscort(): engine.MissionState {
  let state: engine.GameState = { status: 'preparation', setup: engine.initialSetup() };
  for (const command of [
    { type: 'SELECT_MISSION', mission: 'escort' },
    { type: 'ADD_SHIP', shipClass: 'fremm' },
    { type: 'LAUNCH_MISSION', seed: 7 },
  ] satisfies engine.GameCommand[]) {
    const result = engine.executeCommand(state, command, engine.defaultConfig);
    if (!result.ok) throw new Error(result.error.message);
    state = result.state;
  }
  if (state.status !== 'in_progress') throw new Error('mission non lancée');
  return state;
}

const REROUTE = engine.CarrierOrderKind.REROUTE;

describe('carrierOrderUnavailability', () => {
  it('est nul quand un ordre peut être donné', () => {
    expect(carrierOrderUnavailability(launchedEscort())).toBeNull();
  });

  it("signale le quota utilisé, l'activation en cours et la mission terminée", () => {
    const mission = launchedEscort();
    const used = {
      ...mission,
      carrierNavigation: { ...mission.carrierNavigation!, orderUsed: true },
    };
    expect(carrierOrderUnavailability(used)).toMatch(/déjà été donné/);
    const moving = {
      ...mission,
      units: mission.units.map((u) =>
        u.shipClass === 'carrier' ? u : { ...u, activation: 'in_progress' as const },
      ),
    };
    expect(carrierOrderUnavailability(moving)).toMatch(/activation/i);
    expect(carrierOrderUnavailability({ ...mission, outcome: 'victory' })).toMatch(/terminée/);
  });
});

describe('buildCarrierOrderDraft', () => {
  it('Poursuivre est prêt à confirmer avec le trajet en vigueur', () => {
    const draft = buildCarrierOrderDraft(launchedEscort(), engine.CarrierOrderKind.CONTINUE, null)!;
    expect(draft.order).toEqual({ kind: 'continue' });
    expect(draft.route?.at(-1)).toEqual(launchedEscort().goal);
  });

  it('Stopper est prêt à confirmer, sans trajet', () => {
    const draft = buildCarrierOrderDraft(launchedEscort(), engine.CarrierOrderKind.STOP, null)!;
    expect(draft).toMatchObject({ order: { kind: 'stop' }, route: null });
  });

  it("Modifier l'itinéraire attend un point de passage", () => {
    const draft = buildCarrierOrderDraft(launchedEscort(), REROUTE, null)!;
    expect(draft).toMatchObject({ order: null, route: null, refusal: null });
  });

  it('prévisualise un point de passage valide et refuse un point identique à la position', () => {
    const mission = launchedEscort();
    const carrier = engine.carrierOf(mission.units)!;
    const same = buildCarrierOrderDraft(mission, REROUTE, carrier.position)!;
    expect(same).toMatchObject({ order: null, refusal: 'SAME_HEX' });
    const goal = mission.goal!;
    const valid = buildCarrierOrderDraft(mission, REROUTE, goal)!;
    expect(valid.order).toEqual({ kind: REROUTE, waypoint: goal });
    expect(valid.route?.at(-1)).toEqual(goal);
  });

  it("n'existe pas quand aucun ordre n'est possible", () => {
    const mission = launchedEscort();
    expect(buildCarrierOrderDraft({ ...mission, outcome: 'victory' }, REROUTE, null)).toBeNull();
  });
});

describe('buildCarrierRouteView', () => {
  it("montre l'ordre en préparation, sinon le trajet du porte-avions sélectionné, sinon rien", () => {
    const mission = launchedEscort();
    expect(buildCarrierRouteView(mission, null, false)).toBeNull();
    expect(buildCarrierRouteView(mission, null, true)?.route?.at(-1)).toEqual(mission.goal);
    const draft = buildCarrierOrderDraft(mission, REROUTE, null)!;
    expect(buildCarrierRouteView(mission, draft, false)).toMatchObject({
      picking: true,
      route: null,
    });
  });
});
