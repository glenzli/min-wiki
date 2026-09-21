import test from 'node:test';
import assert from 'node:assert/strict';
import { halfWidthKm,progressFor,stops,projection,diameterPixels,scaleState,readProgress,ruler,displayLength,LIGHT_YEAR_KM } from '../model.ts';
import { readFileSync } from 'node:fs';
test('continuous scale is monotonic and invertible across all orders of magnitude',()=>{let previous=0;for(let i=0;i<=1000;i++){const p=i/1000,v=halfWidthKm(p);assert.ok(v>previous);assert.ok(Math.abs(progressFor(v)-p)<1e-12);previous=v;}assert.equal(stops.length,5);});
test('within-frame projection and diameters use the same linear ruler',()=>{for(const p of [.1,.4,.75,1]){const half=halfWidthKm(p),a=projection(0,0,0,p,0),b=projection(half,0,0,p,0);assert.ok(Math.abs(b[0]-a[0]-520)<1e-9);assert.equal(diameterPixels(half/2,half),520);assert.equal(diameterPixels(half/2000,half),.52);}});
test('camera shift and galaxy rotation preserve a finite Earth anchor',()=>{for(const p of [0,.5,.8,1])for(const tilt of [0,.5,1]){const position=projection(0,0,0,p,tilt);assert.ok(position.every(Number.isFinite));assert.ok(position[0]>=0&&position[0]<=1040);}assert.ok(scaleState(1).galaxy);assert.equal(readProgress('?scale=no'),0);assert.equal(readProgress('?scale=999'),1);});
test('ruler units and truthful boundaries accompany both languages',()=>{assert.ok(ruler(9700)<=9700);assert.equal(displayLength(LIGHT_YEAR_KM).unit,'ly');const data=JSON.parse(readFileSync(new URL('../content.json',import.meta.url)));assert.equal(data.stages.length,5);assert.ok(data.stages[4].boundary.en.includes('three representative'));const l=JSON.parse(readFileSync(new URL('../learning.json',import.meta.url)));for(const language of ['zh','en']){assert.equal(l[language].academic.length,3);assert.equal(l[language].narration.length,4);for(const n of l[language].academic)assert.ok(n.body.length>55);}});


test('Sun origin starts on its full disk and preserves physical distances across the journey',async()=>{
  const {readJourney,originStart,viewPoint,AU_KM,SUN_RADIUS_KM,EARTH_RADIUS_KM}=await import('../model.ts');
  assert.deepEqual(readJourney(''),{origin:'earth',progress:0});
  assert.equal(readJourney('?origin=invalid').origin,'earth');
  const start=originStart('sun');assert.equal(readJourney('?origin=sun').progress,start);
  assert.equal(readJourney('?origin=sun&scale=0').progress,start);
  assert.equal(readJourney('?origin=sun&scale=.7').progress,.7);
  assert.ok(diameterPixels(SUN_RADIUS_KM,halfWidthKm(start),390)>100);
  for(let i=0;i<=1000;i++){
    const p=start+(1-start)*i/1000,s=viewPoint(-AU_KM,0,0,p,.35,'sun'),e=viewPoint(0,0,0,p,.35,'sun');
    assert.ok(s.every(Number.isFinite));assert.ok(Math.abs(s[0])<=1);
    if(p<.7)assert.ok(Math.abs((e[0]-s[0])*halfWidthKm(p)/AU_KM-1)<1e-7);
  }
  assert.equal(viewPoint(-AU_KM,0,0,start,.35,'sun')[0],0);
  assert.ok(Math.abs(SUN_RADIUS_KM/EARTH_RADIUS_KM-109)<.3);
});
