export interface Settings { moon: string }
/** Rounded mean radii (km) and JPL SAT441 mean elements, not a live ephemeris. */
export const MOONS = [
  { id: 'mimas', radius: 198.2, distance: 186000, period: .942422, displayOrbit: 7.2 },
  { id: 'enceladus', radius: 252.1, distance: 238400, period: 1.370218, displayOrbit: 9.4 },
  { id: 'tethys', radius: 531.1, distance: 295000, period: 1.887802, displayOrbit: 11.6 },
  { id: 'dione', radius: 561.4, distance: 377700, period: 2.736916, displayOrbit: 13.8 },
  { id: 'rhea', radius: 763.5, distance: 527200, period: 4.517503, displayOrbit: 16.3 },
  { id: 'titan', radius: 2574.7, distance: 1221900, period: 15.945448, displayOrbit: 20.5 },
  { id: 'iapetus', radius: 734.5, distance: 3561700, period: 79.331002, displayOrbit: 26 },
];
export const elapsedDays = (progress: number) => progress * 16;
export function orbitalAngle(progress: number, index: number) { return index * .86 + elapsedDays(progress) / MOONS[index].period * Math.PI * 2; }
export function comparisonRadius(index: number) { return MOONS[index].radius / MOONS[5].radius * 3.6; }
export function readout(progress: number, settings: Settings) {
  const moon = MOONS.find(m => m.id === settings.moon) ?? MOONS[5];
  return { value: `${moon.period.toFixed(2)} d`, stage: Math.min(3, Math.floor(progress * 4)), limited: false };
}
