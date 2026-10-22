import { normalizeConditions, type Conditions, type FlightSnapshot } from './model.ts';

export const questions = ['airflow', 'forces', 'runway', 'stall'] as const;
export type Question = typeof questions[number];
export type FlightView = 'wing' | 'runway';
export type FlightRoute = Conditions & { progress: number; question: Question; view: FlightView };
const finite = (value: string | null, fallback: number) => value !== null && value.trim() && Number.isFinite(Number(value)) ? Number(value) : fallback;

/** A view is an observation of this experiment, never another copy of its history. */
export function readFlightRoute(search: string): FlightRoute {
  const p = new URLSearchParams(search);
  const requested = p.get('question');
  const legacyRunway = p.get('chapter') === 'runway';
  const question: Question = questions.includes(requested as Question) ? requested as Question : legacyRunway ? 'runway' : 'airflow';
  const requestedView = p.get('view') ?? p.get('chapter');
  const view: FlightView = requestedView === 'wing' ? 'wing' : 'runway';
  return { ...normalizeConditions({ speed: finite(p.get('speed'), 38), pitch: finite(p.get('pitch'), 12) }),
    progress: Math.max(0, Math.min(1, finite(p.get('p'), 0))), question, view };
}

export function writeFlightRoute(search: string, state: FlightRoute): string {
  const p = new URLSearchParams(search);
  p.set('question', state.question); p.set('view', state.view);
  // Keep the historical chapter parameter meaningful for old copied links.
  p.set('chapter', state.view);
  p.set('speed', String(state.speed)); p.set('pitch', String(state.pitch));
  p.set('p', state.progress.toFixed(4));
  return p.toString();
}

export function questionView(_question: Question): FlightView { return 'runway'; }

export type ForceProjection = { lift: readonly [number, number, number]; drag: readonly [number, number, number];
  weight: readonly [number, number, number]; thrust: readonly [number, number, number]; support: readonly [number, number, number] };
/** World +y is up; the aircraft moves along -x, matching the section's nose-left convention. */
export function worldForces(s: FlightSnapshot): ForceProjection {
  return { lift: [s.liftX, s.liftY, 0], drag: [s.dragX, s.dragY, 0], weight: [0, -s.weight, 0],
    thrust: [-s.thrust, 0, 0], support: [0, s.support, 0] };
}

export const AIRFRAME = { bodyDatum: 1.46, wheelCenter: -1.24, wheelRadius: .22, mainGearX: 1.05, noseGearX: -2.75 } as const;
/** One world metre per model metre. Identifying airframe dimensions are invented. */
export function aircraftPose(s: FlightSnapshot) {
  const rotation = -s.pitch * Math.PI / 180;
  const wheelY = (x: number) => x * Math.sin(rotation) + AIRFRAME.wheelCenter * Math.cos(rotation);
  const datum = AIRFRAME.wheelRadius - Math.min(wheelY(AIRFRAME.mainGearX), wheelY(AIRFRAME.noseGearX));
  return { x: -s.distance, y: datum + s.height, rotation,
    wheelBottom: s.height, wheelRotation: s.distance / AIRFRAME.wheelRadius,
    mainWheelX: AIRFRAME.mainGearX * Math.cos(rotation) - AIRFRAME.wheelCenter * Math.sin(rotation) };
}

/** SVG fallback retains its own illustrative drawing scale and the same contact semantics. */
export function diagramAircraftPose(s: FlightSnapshot) {
  const angle = s.pitch * Math.PI / 180, airframeScale = 30;
  const mainX = AIRFRAME.mainGearX * airframeScale, noseX = AIRFRAME.noseGearX * airframeScale;
  const wheelY = -AIRFRAME.wheelCenter * airframeScale, radius = AIRFRAME.wheelRadius * airframeScale;
  const lowestTyre = Math.max(noseX * Math.sin(angle) + wheelY * Math.cos(angle) + radius, mainX * Math.sin(angle) + wheelY * Math.cos(angle) + radius);
  return { x: 720 - s.distance * 3.2, y: 285 - lowestTyre - s.height * 5, angle,
    contactX: mainX * Math.cos(angle) - wheelY * Math.sin(angle), contactY: 285 - s.height * 5 };
}
