export type View = 'layers' | 'worlds';
export type World = 'earth' | 'venus' | 'mars' | 'titan' | 'moon' | 'mercury';
export type ComparisonWorld = Exclude<World, 'earth'>;
export const comparisonWorlds: readonly ComparisonWorld[] = ['venus', 'mars', 'titan', 'moon', 'mercury'];
export const clamp = (n: number, a = 0, b = 1) => Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : a;
export const layerEdges = [0, 11, 50, 85, 600, 1000] as const;
export const layerAt = (km: number) => {
  const index = layerEdges.slice(1).findIndex(edge => clamp(km, 0, 1000) < edge);
  return index < 0 ? 4 : index;
};
/** Display mapping only; horizontal geometry is NOT on this height scale. */
export const heightPosition = (km: number) => Math.log1p(clamp(km, 0, 1000)) / Math.log(1001);
export const heightFromPosition = (p: number) => Math.expm1(clamp(p) * Math.log(1001));

/** Dry 1976 standard-atmosphere lower-layer lapse rates, geopotential km.
 * Rounded layer tops and this teaching profile do not describe local weather.
 * Do not extrapolate the dry hydrostatic approximation into the thermosphere. */
export function profile(km: number) {
  const h = clamp(km, 0, 1000);
  if (h > 84.852) return { temperature: null, pressure: null, density: null };
  const heights = [0, 11, 20, 32, 47, 51, 71, 84.852];
  const lapse = [-6.5, 0, 1, 2.8, 0, -2.8, -2];
  let temperature = 288.15, pressure = 1013.25;
  for (let i = 0; i < lapse.length; i++) {
    const dh = Math.max(0, Math.min(h, heights[i + 1]) - heights[i]);
    const next = temperature + lapse[i] * dh;
    pressure *= lapse[i] === 0 ? Math.exp(-34.1632 * dh / temperature) : Math.pow(temperature / next, 34.1632 / lapse[i]);
    temperature = next;
    if (h <= heights[i + 1]) break;
  }
  return { temperature: temperature - 273.15, pressure, density: pressure * 100 / (287.05287 * temperature) };
}

/** One camera path: overview -> the marked coast -> outward along that same radius.
 * Distances are reference km. The camera is an outside observer, not a person flying.
 * Features are teaching illustrations enlarged independently of their reference altitude. */
export const EARTH_RADIUS = 6371;
export const APPROACH_END = .22;
export const layerStops = [3, 25, 65, 300, 850] as const;
export const journeyAtHeight = (km:number) => APPROACH_END + (1-APPROACH_END)*heightPosition(km);
export function journeyFrame(progress:number) {
  const p=clamp(progress), approach=clamp(p/APPROACH_END);
  const eased=approach*approach*(3-2*approach);
  const height=p<APPROACH_END?0:heightFromPosition((p-APPROACH_END)/(1-APPROACH_END));
  const halfSpan=p<APPROACH_END?Math.exp(Math.log(8500)*(1-eased)+Math.log(18)*eased):18+height*1.1;
  const centerY=p<APPROACH_END?(-EARTH_RADIUS-8)*(1-(halfSpan-18)/(8500-18)):-EARTH_RADIUS-8-height*.8;
  return {progress:p,height,halfSpan,centerY,phase:p===0?'overview':p<APPROACH_END?'approach':'ascent',layer:layerAt(height),site:'illustrative-coast'} as const;
}
/** Same surface anchor and radial feature positions at every camera scale. */
export function radialPoint(tangentKm:number,heightKm:number) {
  const angle=tangentKm/EARTH_RADIUS,r=EARTH_RADIUS+heightKm;
  return {x:r*Math.sin(angle),y:-r*Math.cos(angle)};
}
export interface Settings { view:View; world:ComparisonWorld; journey:number }
export const defaults:Settings={view:'layers',world:'venus',journey:0};
export function parseRoute(search:string):Settings {
  const p=new URLSearchParams(search);
  const finite=(key:string,fallback:number,min:number,max:number)=>p.has(key)?clamp(Number(p.get(key)),min,max):fallback;
  // Old parcel links enter the same low-altitude location, without reviving old controls.
  const legacyHeight=p.get('view')==='motion'
    ? (p.get('motion')==='advect'?.25:finite('lift',3,0,6)*finite('p',0,0,1))
    : finite('height',0,0,1000);
  const journey=p.has('journey')?finite('journey',0,0,1)
    : p.has('height')||p.get('view')==='motion'?journeyAtHeight(legacyHeight):0;
  const world=comparisonWorlds.includes(p.get('world') as ComparisonWorld)?p.get('world') as ComparisonWorld:'venus';
  return {view:p.get('view')==='worlds'?'worlds':'layers',world,journey};
}
export function routeQuery(s:Settings) {
  return new URLSearchParams({view:s.view,world:s.world,journey:s.journey.toFixed(6)});
}

/** Representative rounded surface values, not global constants or weather forecasts.
 * NASA planetary fact sheets and Titan facts, cited in README and learning notes. */
export const worlds = {
  earth: { pressure: 1013.25, temperature: 15, radius: 6371, color: '#538da4', worldId: 'earth' },
  venus: { pressure: 92000, temperature: 464, radius: 6052, color: '#d4b17f', worldId: 'venus' },
  mars: { pressure: 6.36, temperature: -65, radius: 3390, color: '#bc7153', worldId: 'mars' },
  titan: { pressure: 1467, temperature: -179, radius: 2575, color: '#c4a360', worldId: 'titan' },
  // Near-vacuum exospheres do not receive invented zero pressures or global air temperatures.
  moon: { pressure: null, temperature: null, radius: 1737, color: '#aaa6a1', worldId: 'moon' },
  mercury: { pressure: null, temperature: null, radius: 2440, color: '#a79583', worldId: 'mercury' },
} satisfies Record<World, { pressure: number | null; temperature: number | null; radius: number; color: string; worldId: string }>;

/** Equal-size layer bands for orientation only, deliberately not a distance scale. */
export function railPosition(height:number){
 const h=clamp(height,0,1000),i=layerAt(h);
 return (i+(h-layerEdges[i])/(layerEdges[i+1]-layerEdges[i]))/5;
}
export function advanceJourney(position:number,delta:number){
 const next=clamp(position+Math.max(0,delta));
 const stop=[APPROACH_END,...layerStops.map(journeyAtHeight)].find(p=>p>position+1e-8&&p<=next);
 return {position:stop??next,hold:stop!==undefined};
}
