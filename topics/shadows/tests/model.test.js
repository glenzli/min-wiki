import test from 'node:test';import assert from 'node:assert/strict';import {shadowTip} from '../model.ts';test('shadow reverses side, shortens as light rises, and collapses overhead',()=>{assert.equal(shadowTip(200,240),700);assert.equal(shadowTip(700,240),200);assert.ok(shadowTip(200,320)<shadowTip(200,240));assert.equal(shadowTip(450,240),450);assert.throws(()=>shadowTip(200,120));});
import { groundProjection, parts, project } from '../model.ts';
test('surface projection lies on the continued source ray and agrees with the top-center formula', () => {
  const light = {x:280,y:19,z:240}, point = {x:470,y:-10,z:80}, hit = groundProjection(point, light);
  const scale = (hit.x-light.x)/(point.x-light.x);
  assert.equal(hit.z, 0); assert.ok(Math.abs(hit.y-light.y-scale*(point.y-light.y))<1e-10);
  assert.ok(Math.abs(hit.z-light.z-scale*(point.z-light.z))<1e-10); assert.ok(scale>1);
  assert.equal(groundProjection({x:450,y:0,z:120},{x:280,y:0,z:240}).x,shadowTip(280,240));
});
test('all puppet parts remain projectable at the lowest allowed lamp and retain a footprint overhead', () => {
  for (const x of [231,250,450,650,669]) for (const part of parts) for (const p of part.points) {
    const hit=groundProjection(p,{x,y:0,z:180});
    for(const view of [0,.2,.8,1]) assert.ok(project(hit,view).every(Number.isFinite));
  }
  const feet=parts[0].points.map(p=>groundProjection(p,{x:450,y:0,z:240}));
  assert.ok(Math.max(...feet.map(p=>p.x))-Math.min(...feet.map(p=>p.x))>10);
  assert.throws(()=>groundProjection({x:0,y:0,z:120},{x:1,y:1,z:120}));
});
