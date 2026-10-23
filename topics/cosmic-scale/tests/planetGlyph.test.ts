import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANET_RADII_KM } from '../model.ts';
import { planetGlyphRadius, drawPlanetGlyph } from '../planetGlyph.ts';
import { MembershipScene } from '../membershipScene.ts';
import content from '../comparisonContent.json';

test('recognition symbols preserve all planet size relations at every used symbol scale', () => {
  const largestFirst = [4, 5, 6, 7, 2, 1, 3, 0];
  for (const size of [6, 8.5]) {
    const radii = largestFirst.map(index => planetGlyphRadius(index, size));
    assert.ok(radii.every(Number.isFinite));
    radii.slice(1).forEach((radius, index) => assert.ok(radius < radii[index]!, `${largestFirst[index]} > ${largestFirst[index + 1]}`));
    // Compression makes Mercury recognisable but never larger than Earth or the gas giants.
    assert.ok(radii.at(-1)! / radii[0]! > PLANET_RADII_KM[0] / PLANET_RADII_KM[4]);
  }
});

function recordingContext() {
  const circles: { x: number; y: number; radius: number; kind: 'body' | 'mark' }[] = [];
  let pending: {x: number; y: number; radius: number} | undefined;
  const target = {
    beginPath() { pending = undefined; },
    arc(x: number, y: number, radius: number) { pending = {x, y, radius}; },
    clip() { if (pending) circles.push({...pending, kind: 'body'}); },
    fill() { if (pending) circles.push({...pending, kind: 'mark'}); },
    createRadialGradient() { return {addColorStop() {}}; },
    measureText(value: string) { return {width: value.length * 6}; },
  };
  const context = new Proxy(target, {get: (object, key) => (object as any)[key] ?? (() => {})}) as unknown as CanvasRenderingContext2D;
  return {context, circles};
}

test('the production membership illustration draws every planet smaller than its Sun without reversed ranks', () => {
  for (const [width, height] of [[342, 320], [1100, 500]]) {
    const {context, circles} = recordingContext();
    new MembershipScene().draw(context, width, height, 0, content.en);
    const planets = circles.filter(circle => circle.kind === 'body');
    assert.equal(planets.length, 8);
    const sun = circles.filter(circle => circle.kind === 'mark').at(-1)!;
    assert.equal(sun.radius, 18);
    for (const [i, planet] of planets.entries()) {
      assert.ok(planet.radius < sun.radius);
      assert.ok(Math.hypot(planet.x - sun.x, planet.y - sun.y) > sun.radius + planet.radius, `planet ${i} remains outside the Sun`);
      for (const [j, other] of planets.entries()) if (PLANET_RADII_KM[i]! > PLANET_RADII_KM[j]!) assert.ok(planet.radius > other.radius);
    }
  }
});

test('the symbol renderer retains one spherical body outline for each planet', () => {
  for (let index = 0; index < 8; index++) {
    const {context, circles} = recordingContext();
    drawPlanetGlyph(context, 20, 20, index, 6);
    const body = circles.filter(circle => circle.kind === 'body');
    assert.equal(body.length, 1);
    assert.equal(body[0]!.radius, planetGlyphRadius(index, 6));
  }
});
