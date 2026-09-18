import test from 'node:test';
import assert from 'node:assert/strict';
import { centerAt, tidalRadius, buildEncounter, FRAMES } from '../model.ts';
test('parabolic encounter conserves zero energy and angular momentum',()=>{
 for(const q of [.52,1.25,2.5])for(const time of [-12,-3,0,3,20]){
  const p=centerAt(time,q);
  assert.ok(Math.abs((p.vx*p.vx+p.vy*p.vy)/2-1/p.r)<1e-9);
  assert.ok(Math.abs(p.x*p.vy-p.y*p.vx-Math.sqrt(2*q))<1e-9);
 }
});
test('density comparison and identical path produce different grazing outcomes',()=>{
 assert.equal(tidalRadius('rocky'),1);assert.ok(tidalRadius('gas')>1.60&&tidalRadius('gas')<1.62);
 const rocky=buildEncounter('rocky','grazing',80),gas=buildEncounter('gas','grazing',80);
 assert.equal(rocky.released.at(-1),0);assert.ok(gas.released.at(-1)>50);
});
test('safe routes stay whole; deep encounters release a stable, deterministic population',()=>{
 for(const p of ['rocky','gas']){
  const safe=buildEncounter(p,'safe',80);assert.equal(safe.released.at(-1),0);
  const deep=buildEncounter(p,'deep',80);assert.equal(deep.released.at(-1),80);
  for(const x of deep.positions)assert.ok(Number.isFinite(x));
  for(let f=1;f<FRAMES;f++)assert.ok(deep.released[f]>=deep.released[f-1]);
  assert.deepEqual(deep.positions,buildEncounter(p,'deep',80).positions);
 }
});
test('only surviving returning debris emits; intact and absorbed matter stay dark',()=>{
 for(const planet of ['rocky','gas'])for(const route of ['safe','grazing','deep']){
  const d=buildEncounter(planet,route,80);
  let firstReleased=-1,firstLight=-1;
  for(let i=0;i<d.emission.length;i++){
   const light=d.emission[i];assert.ok(Number.isFinite(light)&&light>=0&&light<=1);
   if(d.states[i]>0&&firstReleased<0)firstReleased=Math.floor(i/80);
   if(light>0){assert.equal(d.states[i],1);if(firstLight<0)firstLight=Math.floor(i/80);}
   if(d.states[i]!==1)assert.equal(light,0);
  }
  if(route==='safe'||(route==='grazing'&&planet==='rocky'))assert.equal(firstLight,-1);
  if(route==='deep'){assert.ok(firstLight>firstReleased+10);assert.deepEqual(d.emission,buildEncounter(planet,route,80).emission);}
 }
});


test('late planet debris heats only after its own return and keeps multiple orbital scales', () => {
  const count=160, m=buildEncounter('rocky','deep',count);
  assert.ok(m.returnedAt.some(f => f < FRAMES));
  for(let f=0;f<FRAMES;f++) for(let i=0;i<count;i++) if(m.emission[f*count+i]>0) {
    assert.ok(m.bound[i]); assert.ok(m.returnedAt[i]<=f); assert.equal(m.states[f*count+i],1);
  }
  const radii=[];
  for(let i=0;i<count;i++) if(m.bound[i]&&m.states[(FRAMES-1)*count+i]===1) {
    const j=((FRAMES-1)*count+i)*3;
    radii.push(Math.hypot(...m.positions.slice(j,j+3)));
  }
  assert.ok(Math.max(...radii)>4*Math.min(...radii));
});
