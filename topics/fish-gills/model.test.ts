import { test } from 'node:test';
import assert from 'node:assert/strict';
import { oxygenAt } from './model.ts';
import { conditionAt, waterConditions } from './exchangeStudy.ts';
test('the same oxygen parcel crosses the interface before blood transports it',()=>{
 const water=oxygenAt(.2),cross=oxygenAt(.5),blood=oxygenAt(.8);
 assert.equal(water.y,72);assert.ok(cross.y>72&&cross.y<137);assert.equal(cross.carry,0);assert.equal(blood.y,137);assert.ok(blood.carry>0);assert.ok(oxygenAt(1).x>blood.x);
});
test('water and blood markers travel in opposite directions',()=>{const a=oxygenAt(.2),b=oxygenAt(.8);assert.ok(b.waterX<a.waterX);assert.ok(b.bloodX>a.bloodX);});
test('transfer and uptake paths stay continuous on reverse seek',()=>{for(const p of [.3,.7]){const a=oxygenAt(p-1e-7),b=oxygenAt(p+1e-7);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.001);}assert.deepEqual(oxygenAt(2),oxygenAt(1));});
test('water comparisons isolate oxygen availability from renewal rate',()=>{const normal=conditionAt('renewed'),low=conditionAt('low-oxygen'),slow=conditionAt('slow-flow');assert.deepEqual(waterConditions,['renewed','low-oxygen','slow-flow']);assert.equal(low.flow,normal.flow);assert.ok(low.oxygenDots<normal.oxygenDots);assert.equal(slow.oxygenDots,normal.oxygenDots);assert.ok(slow.flow<normal.flow);});
