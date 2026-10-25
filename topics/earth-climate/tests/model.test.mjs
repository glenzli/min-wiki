import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClimateState,serializeClimateState,reflectionBudget,glacierBudget,meltComparison,agePosition,timeTicks,ICE_EVENTS } from '../model.ts';
test('time windows use distinct linear scales without changing event ages',()=>{
  assert.equal(agePosition(1250,'deep'),.5);
  assert.equal(agePosition(1.5,'recent'),.5);
  assert.equal(agePosition(.075,'last'),.5);
  assert.equal(ICE_EVENTS.find(e=>e.id==='quaternary').startMa,2.58);
});
test('recent glacial time ticks retain the correct unit and distinguish thirty-thousand-year steps',()=>{
  assert.deepEqual(timeTicks('last'),{unit:'ka',values:[150,120,90,60,30,0]});
  assert.deepEqual(timeTicks('deep').values,[2500,2000,1500,1000,500,0]);
});
test('reflected and absorbed sunlight exhaust the same input, and ice increases reflection',()=>{
  for(let ice=0;ice<=100;ice+=5){const b=reflectionBudget(ice,80);assert.ok(Math.abs(b.absorbed+b.reflected-100)<1e-10);}
  assert.ok(reflectionBudget(80,80).absorbed<reflectionBudget(20,80).absorbed);
});
test('glacier mass histories conserve water-equivalent units and cannot lose absent ice',()=>{
  for(const a of [0,4,10])for(const b of [0,7,10]){
    const s=glacierBudget(a,b,12);
    assert.equal(s.mass,s.initial+s.totalAdded-s.totalLost);
    assert.ok(s.mass>=0);assert.equal(s.history.length,13);
  }
  assert.equal(glacierBudget(4,4,8).mass,60);
  assert.ok(glacierBudget(4,7,8).mass<60);
  assert.deepEqual(glacierBudget(4,7,4),glacierBudget(4,7,4));
});
test('floating melt has a different sea-level mechanism than equal land-ice mass',()=>{
  assert.equal(meltComparison(60,'land').directSeaLevelEquivalent,60);
  assert.equal(meltComparison(60,'floating').directSeaLevelEquivalent,0);
  assert.equal(meltComparison(60,'floating').melted,60);
  assert.equal(meltComparison(60,'floating').remaining,40);
});
test('invalid share input is bounded and valid state survives serialization',()=>{
  const s=parseClimateState({view:'bad',event:'bad',steps:'Infinity',iceCover:'999',snowReflect:'-1',accumulation:'<script>',melt:'-1'});
  assert.equal(s.view,'journey');assert.equal(s.iceCover,100);assert.equal(s.snowReflect,50);assert.equal(s.accumulation,4);assert.equal(s.melt,0);
  assert.deepEqual(parseClimateState(serializeClimateState(s)),s);
});
