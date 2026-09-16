/** Diagram coordinates and teaching time; this is a representative route, not a forecast. */
export type Point = readonly [number, number];
export const clamp = (p: number) => Math.max(0, Math.min(1, p));
export const smooth = (a: number, b: number, p: number) => {
  const u = clamp((p - a) / (b - a));
  return u * u * (3 - 2 * u);
};
const quad = (u: number, a: Point, b: Point, c: Point): Point => [
  (1-u)**2*a[0]+2*(1-u)*u*b[0]+u*u*c[0],
  (1-u)**2*a[1]+2*(1-u)*u*b[1]+u*u*c[1],
];
const cubic = (u: number, a: Point, b: Point, c: Point, d: Point): Point => [
  (1-u)**3*a[0]+3*(1-u)**2*u*b[0]+3*(1-u)*u*u*c[0]+u**3*d[0],
  (1-u)**3*a[1]+3*(1-u)**2*u*b[1]+3*(1-u)*u*u*c[1]+u**3*d[1],
];
export const stageStops = [0, .34, .64, .84] as const;
/** The river and highlighted trail use the same geometry as this tracked marker. */
export function waterJourney(progress: number): Point {
  const p = clamp(progress);
  if (p < .25) return cubic(p*4, [635,366], [698,263], [681,203], [580,161]);
  if (p < .5) return quad((p-.25)*4, [580,161], [440,110], [300,170]);
  if (p < .75) return [300-(p-.5)*140,170+(p-.5)*540];
  const u = (p-.75)*20;
  if (u < 1) return quad(u,[265,305],[307,354],[287,375]);
  if (u < 2) return quad(u-1,[287,375],[267,396],[365,415]);
  if (u < 3) return quad(u-2,[365,415],[419,409],[457,442]);
  if (u < 4) return [457+(u-3)*144,442];
  return cubic(u-4,[601,442],[672,442],[688,399],[635,366]);
}
/** Terrain contacts are derived from the visible mountain silhouette. */
export function mountainSurface(x: number) {
  if (x <= 269) return 174+(x-169)*1.25;
  if (x <= 343) return 299-(x-269)*57/74;
  return 242+(x-343)*145/171;
}
/** A finite shower: drops never wrap back upward or disappear before touching land. */
export function cycleRainDrop(progress: number, index: number) {
  const birth=.48+index*.008, duration=.145+(index%3)*.01;
  const age=clamp((progress-birth)/duration), x0=282+index*15;
  const groundX=x0-14,groundY=mountainSurface(groundX);
  const startY=185+(index%3)*6;
  return {birth,age,x:x0-14*age,y:startY+(groundY-startY)*age,
    groundX,groundY,radius:2.2+(index%4)*.35,
    outcome:progress<birth?'unborn':age>=1?'landed':'falling',
    afterLanding:Math.max(0,progress-birth-duration)};
}
/** Same identities in both comparisons; condition only changes symbol density. */
export function evaporationCue(progress: number, index: number, coolness: number) {
  const birth=index*.006,age=smooth(birth,.23+index*.008,progress);
  const visibility=smooth(birth,birth+.025,progress)*(1-smooth(.23,.43,progress));
  return {x:642+Math.sin(index*1.5)*19-age*25,y:355-age*(185+index*3),
    opacity:.8*visibility*(index<5?1:1-clamp(coolness))};
}
