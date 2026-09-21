import {test} from 'node:test';
import assert from 'node:assert/strict';
import {heatState,changeCondition,WATER_MASS,FUSION_HEAT} from '../heatModel.ts';
test('heat changes phase amounts while preserving the sample and its latent-heat budget',()=>{
 for(const condition of ['warm','cold','insulated'])for(let i=0;i<=100;i++){
  const result=heatState({initialLiquid:.5,condition},i/100);
  assert.ok(Math.abs(result.iceMass+result.liquidMass-WATER_MASS)<1e-9);
  assert.ok(Math.abs(result.heat-(result.liquidMass-50)*FUSION_HEAT)<1e-8);
 }
 assert.equal(heatState({initialLiquid:.5,condition:'warm'},1).liquid,1);
 assert.equal(heatState({initialLiquid:.5,condition:'cold'},1).liquid,0);
 assert.equal(heatState({initialLiquid:.5,condition:'insulated'},1).liquid,.5);
});
test('changing conditions preserves the current sample and insulation does not advance it',()=>{
 const initial={initialLiquid:.5,condition:'warm'};
 const changed=changeCondition(initial,.4,'cold');
 assert.equal(heatState(changed,0).liquid,heatState(initial,.4).liquid);
 const held=changeCondition(changed,.6,'insulated');
 assert.equal(heatState(held,1).liquid,heatState(changed,.6).liquid);
 assert.equal(heatState(held,1).heat,0);
 const before=heatState(changed,.6);heatState(changed,1);heatState(changed,0);
 assert.deepEqual(heatState(changed,.6),before);
});
