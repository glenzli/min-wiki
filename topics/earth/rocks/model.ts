/** Conditional teaching model; progress is illustrative, never geological time. */
export const PROCESS_IDS = ['weather', 'transport', 'lithify', 'bury', 'heat', 'melt', 'slowCool', 'fastCool', 'uplift', 'stay'] as const;
export type ProcessId = typeof PROCESS_IDS[number];
export const SPECIMEN_IDS = ['granite', 'basalt', 'sandstone', 'limestone', 'slate', 'marble', 'gneiss'] as const;
export type SpecimenId = typeof SPECIMEN_IDS[number];
export const MINERAL_IDS = ['quartz', 'feldspar', 'mica', 'calcite'] as const;
export type MineralId = typeof MINERAL_IDS[number];
export type RockForm = 'igneous' | 'sediment' | 'sedimentary' | 'metamorphic' | 'magma';
export type Setting = 'surface' | 'slope' | 'basin' | 'buried' | 'deep';
export type Texture = 'coarse' | 'fine' | 'loose' | 'cemented' | 'foliated' | 'melt';
export interface RockSnapshot {
  readonly materialId: 'parcel-a';
  readonly form: RockForm;
  readonly setting: Setting;
  readonly texture: Texture;
}
export interface RockSession {
  path: ProcessId[];
  cursor: number;
  process: ProcessId | null;
  progress: number;
  specimen: SpecimenId;
  mineral: MineralId;
  view: 'journey' | 'specimens';
  deep: boolean;
  cooling: number;
  renderer: '3d' | '2d';
  camera: { x: number; y: number; z: number };
  panels: number;
}
export const MAX_STEPS = 48;
export const INITIAL_ROCK: RockSnapshot = Object.freeze({ materialId: 'parcel-a', form: 'igneous', setting: 'surface', texture: 'coarse' });

/** These are origin tracers, not unchanging real crystals or a mass simulation. */
export const MATERIAL_TRACERS = Object.freeze(Array.from({ length: 24 }, (_, id) => Object.freeze({
  id,
  x: ((id * 47 + 19) % 97) / 97,
  y: ((id * 31 + 11) % 89) / 89,
  phase: ((id * 13) % 23) / 23,
})));

export function isProcess(value: unknown): value is ProcessId {
  return typeof value === 'string' && (PROCESS_IDS as readonly string[]).includes(value);
}

export function availableProcesses(rock: RockSnapshot): ProcessId[] {
  if (rock.form === 'magma') return ['slowCool', 'fastCool', 'stay'];
  if (rock.form === 'sediment') return rock.setting === 'basin' ? ['lithify', 'stay'] : ['transport', 'stay'];
  if (rock.setting === 'surface') return ['weather', 'bury', 'stay'];
  return ['heat', 'melt', 'uplift', 'stay'];
}

export function applyProcess(rock: RockSnapshot, process: ProcessId): RockSnapshot {
  if (!availableProcesses(rock).includes(process)) throw new RangeError(`Unavailable process: ${process}`);
  switch (process) {
    case 'weather': return { ...rock, form: 'sediment', setting: 'slope', texture: 'loose' };
    case 'transport': return { ...rock, setting: 'basin' };
    case 'lithify': return { ...rock, form: 'sedimentary', setting: 'buried', texture: 'cemented' };
    case 'bury': return { ...rock, setting: 'buried' };
    case 'heat': return { ...rock, form: 'metamorphic', setting: 'deep', texture: 'foliated' };
    case 'melt': return { ...rock, form: 'magma', setting: 'deep', texture: 'melt' };
    case 'slowCool': return { ...rock, form: 'igneous', setting: 'buried', texture: 'coarse' };
    case 'fastCool': return { ...rock, form: 'igneous', setting: 'surface', texture: 'fine' };
    case 'uplift': return { ...rock, setting: 'surface' };
    case 'stay': return { ...rock };
  }
}

export function historySnapshots(path: readonly ProcessId[]): RockSnapshot[] {
  const snapshots = [INITIAL_ROCK];
  for (const process of path) snapshots.push(applyProcess(snapshots[snapshots.length - 1], process));
  return snapshots;
}

export function currentRock(session: Pick<RockSession, 'path' | 'cursor'>): RockSnapshot {
  return historySnapshots(session.path)[session.cursor] ?? INITIAL_ROCK;
}

export function chooseProcess(session: RockSession, process: ProcessId): RockSession {
  if (!availableProcesses(currentRock(session)).includes(process)) return session;
  return { ...session, process, progress: 0 };
}

export function finishStep(session: RockSession): RockSession {
  if (!session.process || session.cursor >= MAX_STEPS) return session;
  const path = [...session.path.slice(0, session.cursor), session.process];
  return { ...session, path, cursor: path.length, process: null, progress: 0 };
}

export function visitStep(session: RockSession, cursor: number): RockSession {
  const safeCursor = Math.max(0, Math.min(session.path.length, Math.round(Number.isFinite(cursor) ? cursor : 0)));
  return { ...session, cursor: safeCursor, process: null, progress: 0 };
}

export function redoStep(session: RockSession): RockSession {
  if (session.cursor >= session.path.length) return session;
  return { ...session, cursor: session.cursor + 1, process: null, progress: 0 };
}

function integer(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,3})$/.test(value)) return fallback;
  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : fallback;
}

export function parseRockState(raw: Record<string, string>): RockSession {
  let path: ProcessId[] = [];
  try {
    if (typeof raw.rockPath === 'string' && raw.rockPath.length <= 1800) {
      const candidate: unknown = JSON.parse(raw.rockPath);
      if (Array.isArray(candidate) && candidate.length <= MAX_STEPS && candidate.every(isProcess)) {
        historySnapshots(candidate);
        path = [...candidate];
      }
    }
  } catch { /* Invalid or impossible histories restore the safe initial specimen. */ }
  const cursor = integer(raw.rockCursor, 0, path.length, path.length);
  const rock = historySnapshots(path)[cursor];
  const process = isProcess(raw.rockProcess) && availableProcesses(rock).includes(raw.rockProcess) ? raw.rockProcess : null;
  let camera = { x: 2.8, y: 1.9, z: 3.5 };
  try {
    if (typeof raw.rockCamera === 'string' && raw.rockCamera.length <= 120) {
      const value: unknown = JSON.parse(raw.rockCamera);
      if (Array.isArray(value) && value.length === 3 && value.every(n => typeof n === 'number' && Number.isFinite(n))
        && Math.hypot(...value) >= 1.9999 && Math.hypot(...value) <= 7.0001) camera = { x: value[0], y: value[1], z: value[2] };
    }
  } catch { /* Camera is optional; malformed data uses the fixed exhibit view. */ }
  return {
    path, cursor, process,
    progress: process ? integer(raw.rockProgress, 0, 100, 0) : 0,
    specimen: (SPECIMEN_IDS as readonly string[]).includes(raw.rockSpecimen) ? raw.rockSpecimen as SpecimenId : 'granite',
    mineral: (MINERAL_IDS as readonly string[]).includes(raw.rockMineral) ? raw.rockMineral as MineralId : 'quartz',
    view: raw.rockView === 'specimens' ? 'specimens' : 'journey',
    deep: raw.rockDeep === '1',
    cooling: integer(raw.rockCooling, 0, 100, 55),
    renderer: raw.rockRenderer === '2d' ? '2d' : '3d', camera,
    panels: integer(raw.rockPanels, 0, 15, 0),
  };
}

export function serializeRockState(session: RockSession): Record<string, string> {
  return {
    rockPath: JSON.stringify(session.path), rockCursor: String(session.cursor),
    rockProcess: session.process ?? '', rockProgress: String(session.progress),
    rockSpecimen: session.specimen, rockMineral: session.mineral,
    rockView: session.view, rockDeep: session.deep ? '1' : '0', rockCooling: String(session.cooling),
    rockRenderer: session.renderer, rockCamera: JSON.stringify([session.camera.x, session.camera.y, session.camera.z]),
    rockPanels: String(session.panels),
  };
}

export function frameStates(session: RockSession): { from: RockSnapshot; to: RockSnapshot; amount: number } {
  const from = currentRock(session);
  return { from, to: session.process ? applyProcess(from, session.process) : from, amount: session.process ? session.progress / 100 : 0 };
}

/** A qualitative same-composition comparison; the slider never changes chemistry. */
export function coolingTextures(progress: number): { slow: number; fast: number; composition: 'silicic' } {
  const amount = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress / 100 : 0));
  return { slow: 2 + amount * 17, fast: 2 + amount * 2, composition: 'silicic' };
}
