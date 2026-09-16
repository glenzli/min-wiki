import test from 'node:test';
import assert from 'node:assert/strict';
import { digestionSequence, absorptionRoute, lumenRadius } from '../model.ts';
test('food traverses organ stages in order, with absorption only after breakdown starts',()=>{
 let last=0;for(let i=0;i<=1000;i++){const s=digestionSequence(i/1000);assert.ok(s.phase>=last);last=s.phase;if(s.absorption>0)assert.equal(s.breakdown,1);if(s.water>0)assert.equal(s.absorption,1);assert.ok(s.local>=0&&s.local<=1);}
 assert.equal(digestionSequence(0).phase,0);assert.equal(digestionSequence(1).phase,4);
});
test('nutrients cross cells before entering different transport vessels',()=>{
 for(let i=0;i<=100;i++){const p=i/100,s=absorptionRoute(p,'sugar'),f=absorptionRoute(p,'fat');assert.equal(s.vessel,'blood');assert.equal(f.vessel,'lymph');assert.equal(s.packaged,0);assert.equal(s.uptake,f.uptake);if(f.transport>0){assert.equal(f.uptake,1);assert.equal(f.packaged,1);}if(s.processing>0)assert.equal(s.uptake,1);}
});
test('invalid input is bounded; replay is deterministic and reversible',()=>{
 for(const p of [NaN,Infinity,-1,0,.55,.74,1,2]){const s=digestionSequence(p);for(const v of Object.values(s))assert.ok(Number.isFinite(v));}
 const previous=digestionSequence(.74);digestionSequence(1);assert.deepEqual(digestionSequence(.74),previous);
});
test('peristaltic constriction lies behind the illustrated food and never closes the lumen',()=>{
 for(const front of [.2,.4,.6,.8]){assert.ok(lumenRadius(front-.13,front)<lumenRadius(front+.13,front));for(let x=0;x<=1;x+=.01)assert.ok(lumenRadius(x,front)>=49);}
});
