import {ORBIT_RADII_AU,PLANET_RADII_KM,EARTH_RADIUS_KM} from './model.ts';
import content from './content.json';
/** Rounded orbital semimajor axes from Agol et al. 2021, via NASA Exoplanet Archive. */
export const trappistPlanets = [
  { id: 'b', au: .01154, days: 1.5109, earthRadius: 1.116 },
  { id: 'c', au: .01580, days: 2.4218, earthRadius: 1.097 },
  { id: 'd', au: .02227, days: 4.0496, earthRadius: .788 },
  { id: 'e', au: .02925, days: 6.0996, earthRadius: .920 },
  { id: 'f', au: .03849, days: 9.2067, earthRadius: 1.045 },
  { id: 'g', au: .04683, days: 12.3529, earthRadius: 1.129 },
  { id: 'h', au: .06189, days: 18.767, earthRadius: .755 },
] as const;
export const MERCURY_AU = ORBIT_RADII_AU[0];
export const EARTH_AU = 1;
/** Reuse the canonical eight planets; periods are circular Kepler approximations in Earth days. */
export const solarPlanets=ORBIT_RADII_AU.map((au,i)=>({id:i,name:content.planets[i]!,au,days:365.256*au**1.5,earthRadius:PLANET_RADII_KM[i]!/EARTH_RADIUS_KM}));
export type PlanetaryFamily='solar'|'trappist';
/** Spread structural orbits make every member visible. No distance scale is claimed in this view. */
export const wholeOrbitRadius=(family:PlanetaryFamily,index:number)=>.10+.28*index/((family==='solar'?8:7)-1);
export function systemPlanetPosition(family:PlanetaryFamily,index:number,days:number,whole:boolean):readonly [number,number,number]{
  if(family==='trappist'&&!whole)return planetPosition(index,days);
  const planet=family==='solar'?solarPlanets[index]!:trappistPlanets[index]!,r=whole?wholeOrbitRadius(family,index):planet.au;
  const phase=(family==='solar'?[2.4,-.5,1.4,3.5,-1,.25,2.8,4.5][index]!:index*2.399963+.52)+days/planet.days*Math.PI*2;
  return [r*Math.cos(phase),r*Math.sin(phase),0];
}
export const orbitRadius = (au: number, spanAu: number, halfPixels: number) => au / spanAu * halfPixels;
export function systemFraming(close: boolean) { return close ? .073 : .44; }
/** Phases are an authored static layout, not a measured epoch or a dynamical integration. */
export function planetPosition(index: number, days = 0): readonly [number, number, number] {
  const planet = trappistPlanets[index]!, a = planet.au, phase = index * 2.399963 + .52 + days / planet.days * Math.PI * 2;
  return [a * Math.cos(phase), a * Math.sin(phase), 0];
}
