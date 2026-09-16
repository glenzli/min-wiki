import test from 'node:test';
import assert from 'node:assert/strict';
import { batteryState,advanceDischarge,carrierPosition } from '../model.ts';
test('an open circuit cannot discharge or sustain current',()=>{
 for(const used of [0,.2,.7,1]){assert.equal(batteryState(used,false).current,0);assert.equal(batteryState(used,false).conducting,false);assert.equal(advanceDischarge(used,used+.2,false),used);}
});
test('closed usable cell conducts, but a depleted example cannot supply current',()=>{
 assert.ok(batteryState(.4,true).current>0);assert.equal(batteryState(1,true).current,0);assert.equal(batteryState(1,true).conducting,false);
 assert.equal(advanceDischarge(.4,.7,true),.7);
});
test('energy destinations account for the initial chemical energy',()=>{
 for(let i=0;i<=100;i++){const s=batteryState(i/100,true);assert.ok(Math.abs(s.remaining+s.work+s.heat-1)<1e-12);assert.ok(s.work>=0&&s.heat>=0);}
});
test('opening changes topology without erasing prior motor and chemical state',()=>{
 const before=batteryState(.43,true),after=batteryState(.43,false);
 for(const key of ['used','remaining','work','heat','electronTravel','ionTravel','rotorAngle'] as const)assert.equal(after[key],before[key]);
});
test('bounded replay and carrier positions remain deterministic for all display inputs',()=>{
 for(const v of [-1,0,.3,1,2,Infinity,NaN])for(const closed of [false,true]){const s=batteryState(v,closed);for(const x of Object.values(s))if(typeof x==='number')assert.ok(Number.isFinite(x));assert.ok(s.used>=0&&s.used<=1);}
 for(let i=0;i<22;i++){const f=carrierPosition(i,.47,22);assert.ok(f>=0&&f<1);assert.equal(f,carrierPosition(i,.47,22));}
});
