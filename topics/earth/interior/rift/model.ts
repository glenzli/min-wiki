/** Deterministic teaching coordinates, not a stress, thermal or tectonic solver. */
export const RIFT_SCALES = ['global', 'region', 'material'] as const;
export type RiftScale = typeof RIFT_SCALES[number];
export type RiftState = {
  scale: RiftScale; stage: number; quake: number;
  motion: 'extend' | 'still'; evolution: 'continue' | 'stall'; thermal: 'warm' | 'cool'; path: 'open' | 'sealed';
  cooling: 'slow' | 'fast'; event: 'loaded' | 'unloaded';
  focus: 'structure' | 'fault' | 'magma'; renderer: 'three' | 'diagram';
  camera: Partial<Record<RiftScale, [number, number, number]>>;
  tag: number;
};
export const RIFT_DEFAULT: Readonly<RiftState> = {
  scale: 'global', stage: 0, quake: 0, motion: 'extend', evolution: 'continue', thermal: 'warm',
  path: 'open', cooling: 'slow', event: 'loaded', focus: 'structure', renderer: 'three', camera: {}, tag: 16,
};
const choice = <T extends string>(raw: unknown, values: readonly T[], fallback: T): T =>
  typeof raw === 'string' && values.includes(raw as T) ? raw as T : fallback;
const coordinate = (raw: unknown, fallback: number): number => typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw <= 100 ? raw : fallback;
export function parseRiftState(raw?: string): RiftState {
  let input: Record<string, unknown> = {};
  if (typeof raw === 'string' && raw.length <= 2048) {
    try { const value: unknown = JSON.parse(raw); if (value && typeof value === 'object' && !Array.isArray(value)) input = value as Record<string, unknown>; } catch { /* canonical defaults */ }
  }
  const camera: RiftState['camera'] = {};
  if (input.camera && typeof input.camera === 'object' && !Array.isArray(input.camera)) {
    for (const scale of RIFT_SCALES) {
      const vector = (input.camera as Record<string, unknown>)[scale];
      if (Array.isArray(vector) && vector.length === 3 && vector.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 16)
        && Math.hypot(...vector) >= 3 && Math.hypot(...vector) <= 16) camera[scale] = vector.map(n => Math.round(n * 10000) / 10000) as [number, number, number];
    }
  }
  return {
    scale: choice(input.scale, RIFT_SCALES, RIFT_DEFAULT.scale), stage: coordinate(input.stage, 0), quake: coordinate(input.quake, 0),
    motion: choice(input.motion, ['extend', 'still'], 'extend'), thermal: choice(input.thermal, ['warm', 'cool'], 'warm'),
    evolution: choice(input.evolution, ['continue', 'stall'], 'continue'),
    path: choice(input.path, ['open', 'sealed'], 'open'), cooling: choice(input.cooling, ['slow', 'fast'], 'slow'),
    event: choice(input.event, ['loaded', 'unloaded'], 'loaded'), focus: choice(input.focus, ['structure', 'fault', 'magma'], 'structure'),
    renderer: choice(input.renderer, ['three', 'diagram'], 'three'), camera,
    tag: typeof input.tag === 'number' && Number.isInteger(input.tag) && input.tag >= 0 && input.tag < 20 ? input.tag : 16,
  };
}
export const serializeRiftState = (state: RiftState): string => JSON.stringify({
  scale:state.scale,stage:state.stage,quake:state.quake,motion:state.motion,evolution:state.evolution,thermal:state.thermal,path:state.path,
  cooling:state.cooling,event:state.event,focus:state.focus,renderer:state.renderer,camera:state.camera,tag:state.tag,
});
export const bounded = (x: number) => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
export const smooth = (x: number) => { const p = bounded(x); return p * p * (3 - 2 * p); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function quakeFrame(state: Pick<RiftState, 'quake' | 'event'>) {
  const q = bounded(state.quake / 100), loaded = state.event === 'loaded';
  const slip = loaded ? smooth((q - .48) / .14) : 0;
  const strain = loaded ? q < .48 ? .3 + .7 * q / .48 : lerp(1, .14, slip) : 0;
  return { q, slip, strain, wave: loaded && q > .55 ? smooth((q - .55) / .45) : 0,
    phase: !loaded ? 'unloaded' : q < .48 ? 'locked' : q < .65 ? 'slip' : 'after' } as const;
}
export type MaterialTag = { id: string; index: number; phase: 'residue' | 'melt' | 'crystal'; melt: number; rise: number; crystallize: number };
export function riftFrame(state: RiftState) {
  const p = state.motion === 'extend' ? Math.min(state.stage / 100, state.evolution === 'stall' ? .32 : 1) : 0;
  const extension = smooth(p), thinning = smooth((p - .15) / .75), upwelling = smooth((p - .2) / .55);
  const melt = state.thermal === 'warm' ? smooth((p - .43) / .19) : 0;
  const rise = smooth((p - .6) / .2) * melt;
  const cooled = smooth((p - .81) / .19) * melt;
  const tags: MaterialTag[] = Array.from({ length: 20 }, (_, index) => {
    const meltable = index >= 16;
    const localMelt = meltable ? smooth((melt - (index - 16) * .1) / .7) : 0;
    const crystallize = localMelt * cooled;
    return { id: `P1-${String(index + 1).padStart(2, '0')}`, index,
      phase: localMelt < .5 ? 'residue' : crystallize >= .5 ? 'crystal' : 'melt',
      melt: localMelt, rise: localMelt * rise * (state.path === 'open' ? 1 : .23), crystallize };
  });
  const counts = { residue: 0, melt: 0, crystal: 0 };
  const portions = { residue: 0, melt: 0, crystal: 0 };
  for (const tag of tags) { counts[tag.phase]++; portions.residue += 1-tag.melt; portions.melt += tag.melt-tag.crystallize; portions.crystal += tag.crystallize; }
  return { p, extension, thinning, upwelling, melt, rise, cooled, tags, counts, portions,
    opening: .48 * extension, basinDrop: .58 * thinning,
    stage: p < .15 ? 0 : p < .43 ? 1 : p < .68 ? 2 : p < .84 ? 3 : 4,
    quake: quakeFrame(state), crystalSize: state.cooling === 'slow' ? 1 : .42 };
}
export type RiftFrame = ReturnType<typeof riftFrame>;

/** Two mapped normal faults bound a schematic graben. F1 dips toward +x. */
export function faultX(y: number, frame: RiftFrame, side: 'left' | 'right') {
  return side === 'left' ? -.74 - frame.opening + (.43 - y) * .48
    : .79 + frame.opening - (.43 - y) * .4;
}
/** Selected F1 event: down-dip deformation fades across the basin, not slip on F2. */
export function faultInfluence(x:number,frame:RiftFrame,y=.43-frame.basinDrop){
  const left=faultX(y,frame,'left'),right=faultX(y,frame,'right');return 1-bounded((x-left)/(right-left));
}
export function eventDrop(x: number, frame: RiftFrame, y=.43-frame.basinDrop) {
  return frame.quake.slip*.11*Math.pow(faultInfluence(x,frame,y),2);
}
export function basinPoint(u:number,baseY:number,frame:RiftFrame):[number,number]{
  const y=baseY-eventDropAtFraction(u,frame);
  return[lerp(faultX(y,frame,'left'),faultX(y,frame,'right'),u),y];
}
export const eventDropAtFraction=(u:number,frame:RiftFrame)=>frame.quake.slip*.11*Math.pow(1-bounded(u),2);
export function terrainHeight(x: number, z: number, basin = false) {
  const broad = fieldNoise(x*1.2+13,z*1.2+21)*.13+fieldNoise(x*3.8,z*3.8)*.047+fieldNoise(x*10,z*10)*.014;
  const drainage = Math.exp(-Math.pow((z+.18*Math.sin(x*2.7))/.12,2))*.055;
  return (basin ? .2 : 1)*(broad-drainage);
}
/** Stable interpolated value noise; coordinates stay bound to the authored object. */
export function fieldNoise(x:number,y:number) {
  const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);
  const hash=(a:number,b:number)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453123;return (n-Math.floor(n))*2-1;};
  return lerp(lerp(hash(ix,iy),hash(ix+1,iy),u),lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);
}
export function riftLongitude(v:number) { return .045*Math.sin(v*14)*Math.sqrt(Math.max(.002,1-Math.pow(v*2-1,2))); }
