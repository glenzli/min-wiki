import type { Planet } from '../data/planetsData.ts';
const TAU=2*Math.PI;
// Mean anomaly advances uniformly; true anomaly does not.
export function eccentricAnomaly(meanAnomaly: number,eccentricity: number) {
  if (!(eccentricity>=0 && eccentricity<1)) throw new RangeError('Expected an elliptic orbit');
  const M=((meanAnomaly+Math.PI)%TAU+TAU)%TAU-Math.PI;
  let E=eccentricity<0.8?M:Math.sign(M||1)*Math.PI;
  for(let i=0;i<24;i++) {
    const correction=(E-eccentricity*Math.sin(E)-M)/(1-eccentricity*Math.cos(E));
    E-=correction;
    if(Math.abs(correction)<1e-13)break;
  }
  return E;
}
export function orbitalState(data: Planet,timeYears: number) {
  const a=data.semiMajorAxisAU, e=data.eccentricity, n=TAU/data.orbitalPeriodYears;
  // Schematic initial phases, not an ephemeris for a calendar date.
  const M=n*timeYears+(data.index-1)*2.399963229728653;
  const E=eccentricAnomaly(M,e), q=Math.sqrt(1-e*e);
  const i=data.inclinationDeg*Math.PI/180, dE=n/(1-e*Math.cos(E));
  return {x:a*(Math.cos(E)-e), y:a*q*Math.sin(E)*Math.sin(i), z:-a*q*Math.sin(E)*Math.cos(i),
    vx:-a*Math.sin(E)*dE, vy:a*q*Math.cos(E)*dE*Math.sin(i), vz:-a*q*Math.cos(E)*dE*Math.cos(i),
    radius:a*(1-e*Math.cos(E)), eccentricAnomaly:E};
}
