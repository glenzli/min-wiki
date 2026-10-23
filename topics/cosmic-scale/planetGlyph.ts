import { PLANET_RADII_KM } from './model.ts';

/** Recognition symbols compress size differences monotonically; they never use the physical ruler. */
export const planetGlyphRadius = (index: number, jupiterRadius: number) => jupiterRadius * (PLANET_RADII_KM[index]! / PLANET_RADII_KM[4]) ** .28;
const colors = ['#a99e8b', '#e4c6a2', '#68b8e8', '#c58160', '#d3b38b', '#dec391', '#a0d9e1', '#86afc8'];

/** A bounded spherical icon with object-specific landmarks, used outside the quantitative scene. */
export function drawPlanetGlyph(c: CanvasRenderingContext2D, x: number, y: number, index: number, jupiterRadius: number) {
  const r = planetGlyphRadius(index, jupiterRadius);
  const rings = (front: boolean) => {
    c.strokeStyle = front ? '#dac49be0' : '#b9a38199'; c.lineWidth = Math.max(.8, r * .20);
    c.beginPath(); c.ellipse(x, y, r * 1.7, r * .56, -.30, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); c.stroke();
  };
  if (index === 5) rings(false);
  c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
  const globe = c.createRadialGradient(x - r * .35, y - r * .35, 0, x, y, r);
  globe.addColorStop(0, colors[index]!); globe.addColorStop(.72, colors[index]!); globe.addColorStop(1, '#24303c');
  c.fillStyle = globe; c.fillRect(x - r, y - r, r * 2, r * 2);
  if (index === 2) {
    c.fillStyle = '#729f65'; c.beginPath(); c.moveTo(x - r * .7, y - r * .6); c.lineTo(x - r * .1, y - r * .7); c.lineTo(x + r * .12, y - r * .1); c.lineTo(x - r * .4, y + r * .4); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(x + r * .5, y + r * .4, r * .36, r * .22, -.4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#e7edf3aa'; c.lineWidth = Math.max(.7, r * .13); c.beginPath(); c.ellipse(x, y - r * .4, r * .95, r * .22, .2, 0, Math.PI); c.stroke();
  } else if (index === 4 || index === 5) {
    c.strokeStyle = index === 4 ? '#a07658b8' : '#b19a7075'; c.lineWidth = Math.max(.7, r * .17);
    for (const dy of [-.50, .12, .54]) { c.beginPath(); c.moveTo(x - r, y + r * dy); c.lineTo(x + r, y + r * dy); c.stroke(); }
    if (index === 4) { c.fillStyle = '#b96e52'; c.beginPath(); c.ellipse(x + r * .35, y + r * .30, r * .26, r * .16, 0, 0, Math.PI * 2); c.fill(); }
  } else if (index === 0 || index === 3) {
    c.fillStyle = index === 0 ? '#695f5580' : '#8f4e3970';
    for (const [dx, dy] of [[-.35, -.20], [.30, .38], [.35, -.45]]) { c.beginPath(); c.arc(x + r * dx!, y + r * dy!, r * .16, 0, Math.PI * 2); c.fill(); }
  }
  c.restore();
  if (index === 5) rings(true);
}
