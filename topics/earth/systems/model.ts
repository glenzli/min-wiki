export const observations = ['water', 'sky', 'conditions'] as const;
export const conditionKeys = ['orbit', 'atmosphere', 'gravity', 'interior', 'moon', 'magnetic'] as const;
export type Observation = typeof observations[number];
export type ConditionKey = typeof conditionKeys[number];

export interface SystemsState {
  observation: Observation;
  waterTemp: number;
  waterSalt: number;
  waterProgress: number;
  skyHour: number;
  skyWind: boolean;
  skyField: boolean;
  skyAurora: boolean;
  skyAzimuth: number;
  skyElevation: number;
  skyDistance: number;
  condition: ConditionKey;
  orbitDistance: number;
}

export const defaults: Readonly<SystemsState> = Object.freeze({
  observation: 'water', waterTemp: 25, waterSalt: 32, waterProgress: 0,
  skyHour: 12, skyWind: true, skyField: true, skyAurora: true,
  skyAzimuth: 322, skyElevation: 18, skyDistance: 4.25,
  condition: 'orbit', orbitDistance: 1,
});

const numberSpecs = {
  waterTemp: [5, 25, 1], waterSalt: [30, 38, .5], waterProgress: [0, 1, .01],
  skyHour: [0, 24, .5], orbitDistance: [.9, 1.1, .01],
  skyAzimuth: [0, 360, .1], skyElevation: [-80, 80, .1], skyDistance: [2.6, 8, .01],
} as const;

function strictNumber(value: unknown, fallback: number, spec: readonly number[]) {
  if (typeof value !== 'string' || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return fallback;
  const n = Number(value), [min, max, step] = spec;
  if (!Number.isFinite(n) || n < min || n > max || Math.abs((n - min) / step - Math.round((n - min) / step)) > 1e-7) return fallback;
  return n;
}

export function parseState(raw: Record<string, string> = {}): SystemsState {
  const state = { ...defaults };
  if (observations.includes(raw.observation as Observation)) state.observation = raw.observation as Observation;
  if (conditionKeys.includes(raw.condition as ConditionKey)) state.condition = raw.condition as ConditionKey;
  for (const key of Object.keys(numberSpecs) as (keyof typeof numberSpecs)[]) {
    state[key] = strictNumber(raw[key], defaults[key], numberSpecs[key]);
  }
  for (const key of ['skyWind', 'skyField', 'skyAurora'] as const) {
    if (raw[key] === '0' || raw[key] === '1') state[key] = raw[key] === '1';
  }
  return state;
}

export function serializeState(state: SystemsState): Record<string, string> {
  return Object.fromEntries(Object.entries(state).map(([key, value]) => [key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value)]));
}

/** EOS-80, surface pressure only. Inputs: ITS-90 Celsius and practical salinity.
 * MRI/JMA Technical Report 80, chapter 4, equations 4.1–4.2 and temperature-scale footnote.
 * Retained historical equation for a limited comparison, not the current TEOS-10 standard.
 */
export function surfaceDensity(temperature: number, salinity: number): number {
  if (!Number.isFinite(temperature) || !Number.isFinite(salinity) || temperature < 0 || temperature > 40 || salinity < 0 || salinity > 40) {
    throw new RangeError('Surface comparison supports 0–40 Celsius and practical salinity 0–40.');
  }
  const t = temperature * 1.00024;
  const water = 999.842594 + 6.793952e-2 * t - 9.09529e-3 * t ** 2 + 1.001685e-4 * t ** 3 - 1.120083e-6 * t ** 4 + 6.536332e-9 * t ** 5;
  const a = .824493 - 4.0899e-3 * t + 7.6438e-5 * t ** 2 - 8.2467e-7 * t ** 3 + 5.3875e-9 * t ** 4;
  const b = -5.72466e-3 + 1.0227e-4 * t - 1.6546e-6 * t ** 2;
  return water + a * salinity + b * salinity ** 1.5 + 4.8314e-4 * salinity ** 2;
}

export const referenceWater = Object.freeze({ id: 'B', temperature: 15, salinity: 34 });
export const waterPresets = Object.freeze({
  warmFreshened: { waterTemp: 25, waterSalt: 30 },
  coldSalty: { waterTemp: 5, waterSalt: 38 },
  coldFreshened: { waterTemp: 5, waterSalt: 30 },
  warmSalty: { waterTemp: 25, waterSalt: 38 },
  matched: { waterTemp: 15, waterSalt: 34 },
});
export type WaterPreset = keyof typeof waterPresets;
export type WaterTendency = 'rise' | 'sink' | 'neutral';

// Stable tracer identities. These are marks for two retained water bodies, not molecules.
const tracerSeeds = Array.from({ length: 16 }, (_, i) => ({
  angle:i*2.399963229728653,
  radius:Math.sqrt((i+.5)/16)*.86,
}));

type WaterPoint={x:number;y:number};
function halfWindow(nx:number,ny:number,direction:number){
  const corners=[{x:-1,y:-1},{x:1,y:-1},{x:1,y:1},{x:-1,y:1}],result:WaterPoint[]=[];
  for(let i=0;i<4;i++){
    const a=corners[i],b=corners[(i+1)%4],da=(a.x*nx+a.y*ny)*direction,db=(b.x*nx+b.y*ny)*direction;
    if(da<=1e-10)result.push(a);
    if((da<0)!==(db<0)){const t=da/(da-db);result.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
  }
  return result.filter((p,i)=>!result.slice(0,i).some(q=>Math.hypot(p.x-q.x,p.y-q.y)<1e-8));
}
function waterCentroid(points:WaterPoint[]){
  let area=0,x=0,y=0;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],cross=a.x*b.y-b.x*a.y;
    area+=cross;x+=(a.x+b.x)*cross;y+=(a.y+b.y)*cross;
  }
  return{x:x/(3*area),y:y/(3*area)};
}
function curvedWindow(points:WaterPoint[],boundary:WaterPoint[],nx:number,ny:number){
  const result:WaterPoint[]=[];
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];result.push(a);
    if(Math.abs(a.x*nx+a.y*ny)<1e-8&&Math.abs(b.x*nx+b.y*ny)<1e-8){
      const ordered=Math.hypot(a.x-boundary[0].x,a.y-boundary[0].y)<1e-7?boundary:[...boundary].reverse();
      result.push(...ordered.slice(1,-1));
    }
  }
  return result;
}
function markerInWindow(points:WaterPoint[],center:WaterPoint,angle:number,radius:number){
  const dx=Math.cos(angle),dy=Math.sin(angle);let edge=Infinity;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],ex=b.x-a.x,ey=b.y-a.y;
    const denominator=dx*ey-dy*ex;if(Math.abs(denominator)<1e-10)continue;
    const distance=((a.x-center.x)*ey-(a.y-center.y)*ex)/denominator;
    const along=((a.x-center.x)*dy-(a.y-center.y)*dx)/denominator;
    if(distance>0&&along>=-1e-9&&along<=1+1e-9)edge=Math.min(edge,distance);
  }
  return{x:center.x+dx*edge*radius,y:center.y+dy*edge*radius};
}
function bendMarker(point:WaterPoint,nx:number,ny:number,ends:WaterPoint[],amplitude:number,id:'A'|'B'){
  const tx=-ny,ty=nx,s=point.x*tx+point.y*ty,start=ends[0].x*tx+ends[0].y*ty,end=ends[ends.length-1].x*tx+ends[ends.length-1].y*ty;
  const t=(s-start)/(end-start);if(t<=0||t>=1)return point;
  let min=-Infinity,max=Infinity;
  for(const [n,offset]of [[nx,tx*s],[ny,ty*s]]){
    if(Math.abs(n)<1e-10)continue;
    const a=(-1-offset)/n,b=(1-offset)/n;min=Math.max(min,Math.min(a,b));max=Math.min(max,Math.max(a,b));
  }
  const d=point.x*nx+point.y*ny,far=id==='A'?min:max;
  const offset=amplitude*Math.sin(t*Math.PI*2)*(1-d/far);
  return{x:point.x+nx*offset,y:point.y+ny*offset};
}
const windowPoint=(p:WaterPoint)=>({x:300+p.x*216,y:186+p.y*110});

export function waterFrame(state: Pick<SystemsState, 'waterTemp' | 'waterSalt' | 'waterProgress'>) {
  const densityA = surfaceDensity(state.waterTemp, state.waterSalt);
  const densityB = surfaceDensity(referenceWater.temperature, referenceWater.salinity);
  const delta = densityA - densityB;
  // 0.05 kg/m³ is a display-resolution band, not a dynamical mixing criterion.
  const tendency: WaterTendency = Math.abs(delta) < .05 ? 'neutral' : delta > 0 ? 'sink' : 'rise';
  const progress = Math.max(0, Math.min(1, state.waterProgress));
  const sign = tendency === 'neutral' ? 0 : tendency === 'sink' ? 1 : -1;
  // An equal-area, reversible geometric explanation of density order, not a computed flow field.
  const angle=-sign*progress*Math.PI/2,nx=Math.cos(angle),ny=Math.sin(angle);
  const aHalf=halfWindow(nx,ny,1),bHalf=halfWindow(nx,ny,-1);
  const ends=aHalf.filter(p=>Math.abs(p.x*nx+p.y*ny)<1e-8).sort((a,b)=>a.x-b.x||a.y-b.y);
  const amplitude=.09*Math.sin(Math.PI*progress)*(sign===0?0:1);
  const boundary=Array.from({length:25},(_,i)=>{
    const t=i/24,wave=amplitude*Math.sin(t*Math.PI*2);
    return{x:ends[0].x+(ends[ends.length-1].x-ends[0].x)*t+nx*wave,y:ends[0].y+(ends[ends.length-1].y-ends[0].y)*t+ny*wave};
  });
  const parcels = (['A', 'B'] as const).map(id => {
    const half=id==='A'?aHalf:bHalf,body=curvedWindow(half,boundary,nx,ny),center=waterCentroid(body),screen=windowPoint(center),unbentCenter=waterCentroid(half);
    return {
      id,x:screen.x,y:screen.y,body:body.map(windowPoint),
      tracers:tracerSeeds.map((seed,i)=>({id:`${id}-${i}`,...windowPoint(bendMarker(markerInWindow(half,unbentCenter,seed.angle+angle,seed.radius),nx,ny,ends,amplitude,id))})),
    };
  });
  return { densityA, densityB, delta, tendency, progress, parcels,boundary:boundary.map(windowPoint) };
}

/** Equinox, fixed equatorial site, geometric horizon. Solar time, not civil time.
 * View from north; sunlight travels from left to right. Earth rotates counterclockwise.
 */
export function skyFrame(hour: number) {
  if (!Number.isFinite(hour) || hour < 0 || hour > 24) throw new RangeError('Solar hour must be 0–24.');
  const angle = hour * Math.PI / 12;
  const x = Math.cos(angle), y = -Math.sin(angle);
  const sunAboveHorizon = -x;
  const phase: 'horizon' | 'day' | 'night' = Math.abs(sunAboveHorizon) < 1e-8 ? 'horizon' : sunAboveHorizon > 0 ? 'day' : 'night';
  return { site: 'EQ-A', x, y, phase, sunAboveHorizon, rotationDegrees: -hour * 15, rotationRadians: angle };
}

export type SkyCameraState = Pick<SystemsState, 'skyAzimuth' | 'skyElevation' | 'skyDistance'>;
export function skyCameraPosition(state: SkyCameraState): [number,number,number] {
  const azimuth = state.skyAzimuth*Math.PI/180, elevation = state.skyElevation*Math.PI/180;
  return [state.skyDistance*Math.cos(elevation)*Math.sin(azimuth), state.skyDistance*Math.sin(elevation), state.skyDistance*Math.cos(elevation)*Math.cos(azimuth)];
}

export function cameraStateFromPosition(x: number, y: number, z: number): SkyCameraState {
  const distance = Math.hypot(x,y,z);
  if (![x,y,z].every(Number.isFinite) || distance === 0) throw new RangeError('Camera coordinates must be finite and nonzero.');
  const azimuth = ((Math.atan2(x,z)*180/Math.PI)%360+360)%360;
  return {
    skyAzimuth: Math.round(azimuth*10)/10%360,
    skyElevation: Math.round(Math.max(-80,Math.min(80,Math.asin(y/distance)*180/Math.PI))*10)/10,
    skyDistance: Math.round(Math.max(2.6,Math.min(8,distance))*100)/100,
  };
}

/** Relative direct-normal irradiance above the atmosphere; fixed solar luminosity. */
export function relativeSunlight(distance: number) {
  if (!Number.isFinite(distance) || distance < .9 || distance > 1.1) throw new RangeError('Distance comparison supports 0.9–1.1 AU.');
  return 1 / distance ** 2;
}
