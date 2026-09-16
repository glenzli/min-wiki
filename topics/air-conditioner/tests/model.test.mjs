import test from 'node:test';
import assert from 'node:assert/strict';
import {cycleState,circuit,tracer,energyBalance,condensation} from '../model.ts';
test('the refrigerant follows one closed route with no stage jumps',()=>{
 for(let j=0;j<4;j++)assert.deepEqual(circuit[j].at(-1),circuit[(j+1)%4][0]);
 for(const p of [.25,.5,.75,1]){const a=tracer(p-1e-8),b=tracer(p+1e-8);assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<.001);}
 for(let i=0;i<=10000;i++)assert.ok(cycleState(i/10000).point.every(Number.isFinite));
});
test('cycle heat and compressor work satisfy the first law',()=>{
 assert.equal(cycleState(.25).enthalpy-cycleState(0).enthalpy,3);
 assert.equal(cycleState(.5).enthalpy-cycleState(.25).enthalpy,1);
 assert.equal(cycleState(.5).enthalpy-cycleState(.75).enthalpy,4);
 assert.equal(cycleState(.75).enthalpy,cycleState(1).enthalpy);
 for(let i=0;i<=100;i++){const e=energyBalance(i/100);assert.ok(Math.abs(e.roomHeat+e.electricWork-e.outdoorHeat)<1e-12);}
});
test('compression is vapor-only and the expansion outlet is a mixture',()=>{
 for(let i=250;i<500;i++)assert.equal(cycleState(i/1000).liquid,0);
 assert.equal(cycleState(.75).liquid,1); assert.equal(cycleState(1).liquid,.8);
 assert.equal(cycleState(.75).pressure,1); assert.equal(cycleState(1).pressure,0);
});
test('fan-only does not remove room heat or produce cooling condensate',()=>{
 assert.deepEqual(energyBalance(0),{roomHeat:0,electricWork:0,outdoorHeat:0,indoorFanHeat:.1});
 assert.equal(condensation(1,0,1),0);assert.equal(condensation(1,1,0),0);
 assert.ok(condensation(.8,1,1)>condensation(.2,1,1));
});
