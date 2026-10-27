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
  const rasters:{x:number;y:number;width:number;height:number}[]=[];
  let pending: {x: number; y: number; radius: number} | undefined;
  const target = {
    beginPath() { pending = undefined; },
    arc(x: number, y: number, radius: number) { pending = {x, y, radius}; },
    clip() { if (pending) circles.push({...pending, kind: 'body'}); },
    fill() { if (pending) circles.push({...pending, kind: 'mark'}); },
    createRadialGradient() { return {addColorStop() {}}; },
    measureText(value: string) { return {width: value.length * 6}; },
    drawImage(_image:unknown,x:number,y:number,width:number,height:number){rasters.push({x,y,width,height});},
  };
  const context = new Proxy(target, {get: (object, key) => (object as any)[key] ?? (() => {})}) as unknown as CanvasRenderingContext2D;
  return {context, circles,rasters};
}

test('the production membership illustration draws every planet smaller than its Sun without reversed ranks', t => {
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');let painted=0;
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(){return {width:0,height:0,getContext(){return {createImageData(width:number,height:number){return {data:new Uint8ClampedArray(width*height*4)};},putImageData(){painted++;}};}};}}});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
  for (const [width, height] of [[342, 320], [1100, 500]]) {
    const {context, circles,rasters} = recordingContext(),scene=new MembershipScene();
    scene.draw(context, width, height, 0, content.en);
    const planets = circles.filter(circle => circle.kind === 'body');
    assert.equal(planets.length, 8);
    assert.equal(rasters.length,1);const raster=rasters[0]!,sun={x:raster.x+raster.width/2,y:raster.y+raster.height/2,radius:raster.width/2};assert.equal(raster.width,raster.height);
    assert.equal(sun.radius, 18);
    for (const [i, planet] of planets.entries()) {
      assert.ok(planet.radius < sun.radius);
      assert.ok(Math.hypot(planet.x - sun.x, planet.y - sun.y) > sun.radius + planet.radius, `planet ${i} remains outside the Sun`);
      for (const [j, other] of planets.entries()) if (PLANET_RADII_KM[i]! > PLANET_RADII_KM[j]!) assert.ok(planet.radius > other.radius);
    }
    scene.dispose();
  }
  assert.equal(painted,2);
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
