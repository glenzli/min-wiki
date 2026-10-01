import test from 'node:test';
import assert from 'node:assert/strict';
import { buoyancy } from '../model.ts';
const base = { experiment: 'objects', object: 'wood', boat: false, cargo: 0, salt: false, depth: 50 };
test('floating wood balances weight, while a sinking stone still receives buoyancy', () => {
 const wood=buoyancy(base), stone=buoyancy({...base,object:'stone'});
 assert.equal(wood.floating,true); assert.equal(wood.displaced,300); assert.equal(wood.force,wood.weight);
 assert.equal(stone.floating,false); assert.ok(stone.force>0 && stone.force<stone.weight);
});
test('reshaping the same clay changes displacement capacity but preserves mass', () => {
 const ball=buoyancy({...base,experiment:'boat'}), boat=buoyancy({...base,experiment:'boat',boat:true});
 assert.equal(ball.mass,boat.mass); assert.equal(ball.floating,false); assert.equal(boat.floating,true); assert.equal(boat.displaced,600);
 const loaded=buoyancy({...base,experiment:'boat',boat:true,cargo:4}); assert.equal(loaded.displaced,1000);
 const flooded=buoyancy({...base,experiment:'boat',boat:true,cargo:9}); assert.equal(flooded.flooded,true); assert.equal(flooded.displaced,760); assert.ok(flooded.force<flooded.weight);
});
test('buoyancy increases with immersed volume, not further depth after complete immersion', () => {
 const at=depth=>buoyancy({...base,experiment:'depth',depth});
 assert.equal(at(0).force,0); assert.equal(at(50).displaced,500); assert.equal(at(100).force,at(150).force);
});
test('a suspended immersion block balances buoyancy and taut-cord tension at every depth', () => {
 for(const salt of [false,true]){
  const at=depth=>buoyancy({...base,experiment:'depth',salt,depth});
  const samples=[0,25,50,75,100,125,150].map(at);
  for(const r of samples){assert.ok(r.tension>0);assert.equal(r.floorSupport,0);assert.ok(Math.abs(r.tension+r.force-r.weight)<1e-12);}
  assert.ok(at(0).tension>at(50).tension&&at(50).tension>at(100).tension);
  assert.equal(at(100).tension,at(150).tension);
 }
 const stone=buoyancy({...base,object:'stone'});
 assert.equal(stone.tension,0);assert.ok(Math.abs(stone.floorSupport+stone.force-stone.weight)<1e-12);
 const wood=buoyancy(base);assert.equal(wood.tension,0);assert.equal(wood.floorSupport,0);
});
test('salt water supports the same floating weight at less displacement',()=>{
 const fresh=buoyancy(base), salt=buoyancy({...base,salt:true});
 assert.ok(salt.displaced<fresh.displaced); assert.ok(Math.abs(salt.force-salt.weight)<1e-10);
});
test('the same clay and cargo can flood a narrow hull but float in a wider hull',()=>{
 const settings={...base,experiment:'boat',boat:true,cargo:4};
 const narrow=buoyancy({...settings,boatCapacity:900}),wide=buoyancy({...settings,boatCapacity:1800});
 assert.equal(narrow.mass,1000);assert.equal(wide.mass,narrow.mass);
 assert.equal(wide.solidVolume,narrow.solidVolume);
 assert.equal(narrow.flooded,true);assert.equal(wide.floating,true);
 assert.equal(wide.displacedMass,1000);assert.equal(wide.reserve,800);
 assert.equal(buoyancy({...settings,boatCapacity:1000}).flooded,true);
 assert.equal(buoyancy({...settings,boatCapacity:1000,salt:true}).floating,true);
});
