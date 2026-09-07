// Earth-fixed coordinates match SphereGeometry and the equirectangular map:
// Greenwich lies on +X, east longitudes point toward -Z, north is +Y.
const TAU = 2 * Math.PI;
const rad = degrees => degrees * Math.PI / 180;
const deg = radians => radians * 180 / Math.PI;
const bounded = value => Math.max(-1, Math.min(1, value));
export const wrapCycle = value => ((value % 1) + 1) % 1;
export function surfaceNormal(latitude, longitude) {
  const phi = rad(latitude), lambda = rad(longitude);
  return {x: Math.cos(phi)*Math.cos(lambda), y: Math.sin(phi), z: -Math.cos(phi)*Math.sin(lambda)};
}

export function solarGeometry(orbitProgress, rotationProgress, tiltDeg) {
  const angle=wrapCycle(orbitProgress)*TAU, spin=wrapCycle(rotationProgress)*TAU, tilt=rad(tiltDeg);
  // Spring equinox: Earth on +Z; summer solstice: Earth on +X.
  // Orbit and spin are both prograde about +Y. The inertial axis is fixed.
  const orbit={x:Math.sin(angle), y:0, z:Math.cos(angle)};
  const sunWorld={x:-orbit.x, y:0, z:-orbit.z};
  // Undo the same Rz(tilt) * Ry(spin) used by the renderer.
  const tiltedX=Math.cos(tilt)*sunWorld.x;
  const tiltedY=-Math.sin(tilt)*sunWorld.x;
  const sunLocal={x:Math.cos(spin)*tiltedX-Math.sin(spin)*sunWorld.z,
    y:tiltedY, z:Math.sin(spin)*tiltedX+Math.cos(spin)*sunWorld.z};
  return {orbit,sunWorld,sunLocal,declination:deg(Math.asin(bounded(tiltedY)))};
}
export function cityIllumination(latitude, longitude, sunLocal) {
  const n=surfaceNormal(latitude,longitude);
  const cosine=bounded(n.x*sunLocal.x+n.y*sunLocal.y+n.z*sunLocal.z);
  return {altitude:deg(Math.asin(cosine)), flux:Math.max(0,cosine),
    state:cosine>1e-7?'day':cosine<-1e-7?'night':'horizon'};
}
