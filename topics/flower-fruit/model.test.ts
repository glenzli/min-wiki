import test from 'node:test';
import assert from 'node:assert/strict';
import { pollinationFrame } from './model.ts';
test('pollen arrives continuously and remains on the stigma while the bee leaves', () => {
  const before=pollinationFrame(.42-1e-6), contact=pollinationFrame(.42), after=pollinationFrame(.95);
  assert.ok(Math.abs(before.pollenX-contact.pollenX)<.001);
  assert.equal(contact.pollenX,after.pollenX); assert.equal(contact.pollenY,after.pollenY);
  assert.ok(after.beeX<contact.beeX); assert.equal(before.deposited,false);
});
test('pollen tube grows only after contact and completes before fruit development',()=>{
  for(const p of [0,.2,.419,.42,.49])assert.equal(pollinationFrame(p).tube,0);
  assert.ok(pollinationFrame(.8).tube>0); assert.equal(pollinationFrame(1).tube,1);
  for(const p of [NaN,Infinity,-1,4])for(const v of Object.values(pollinationFrame(p)))assert.ok(typeof v==='boolean'||Number.isFinite(v));
});
