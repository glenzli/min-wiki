import test from 'node:test';
import assert from 'node:assert/strict';
import { anchorForScale, halfWidthKm,progressFor,stageFor,stops,zoomRoute,projection,diameterPixels,scaleState,readProgress,ruler,displayLength,formatLength,cameraFrameScale,LIGHT_YEAR_KM,OBSERVABLE_RADIUS_KM } from '../model.ts';
import { readFileSync } from 'node:fs';
test('continuous scale reaches the observable horizon without changing its linear within-frame ruler',()=>{let previous=0;for(let i=0;i<=1000;i++){const p=i/1000,v=halfWidthKm(p);assert.ok(v>previous);assert.ok(Math.abs(progressFor(v)-p)<1e-12);previous=v;}assert.equal(stops.length,9);assert.ok(stops.every((v,i)=>i===0||v>stops[i-1]));assert.ok(OBSERVABLE_RADIUS_KM<halfWidthKm(1));assert.equal(halfWidthKm(1)/LIGHT_YEAR_KM,100e9);});
test('the continuous ruler has seven address waypoints and retains neighbor positions between them',()=>{
 assert.deepEqual(zoomRoute,[0,1,2,3,4,6,8]);
 assert.ok(stops[4]<stops[5]&&stops[5]<stops[6]);
 assert.ok(stops[6]<stops[7]&&stops[7]<stops[8]);
});
test('the Milky Way explanation starts after the local star field recedes',()=>{
 assert.equal(stageFor(progressFor(1000*LIGHT_YEAR_KM)),2);
 assert.equal(stageFor(progressFor(5000*LIGHT_YEAR_KM)),2);
 assert.equal(stageFor(progressFor(20000*LIGHT_YEAR_KM)),3);
});
test('the observer marker adopts the enclosing structure at each scale in both languages',()=>{
 const data=JSON.parse(readFileSync(new URL('../content.json',import.meta.url)));
 const examples=[
  [progressFor(20000),'earth'],
  [progressFor(60*149597870.7),'solarSystemLocation'],
  [progressFor(100000*LIGHT_YEAR_KM),'solarSystemLocation'],
  [progressFor(5e6*LIGHT_YEAR_KM),'milkyLocation'],
  [progressFor(400e6*LIGHT_YEAR_KM),'localGroupLocation'],
  [stops[7],'laniakeaLocation'],
  [progressFor(100e9*LIGHT_YEAR_KM),'laniakeaLocation'],
 ];
 for(const [progress,key] of examples){assert.equal(anchorForScale(progress,'earth'),key);assert.ok(data.ui[key].zh);assert.ok(data.ui[key].en);}
 assert.equal(anchorForScale(progressFor(2200000),'sun'),'sunLocation');
 assert.equal(anchorForScale(stops[4],'sun'),'milkyLocation');
});
test('the observing horizon fits portrait and short desktop canvases with their reported physical widths',()=>{for(const [width,height] of [[390,300],[390,844],[599,300],[600,300],[1185,305]]){const half=halfWidthKm(1)*cameraFrameScale(1,width,height),diameter=OBSERVABLE_RADIUS_KM/half*width;assert.ok(diameter<Math.min(width,height));assert.ok(diameter>Math.min(width,height)*.7);}assert.equal(formatLength(93e9*LIGHT_YEAR_KM,'en'),'93 billion ly');assert.equal(formatLength(93e9*LIGHT_YEAR_KM,'zh'),'930 亿光年');});
test('within-frame projection and diameters use the same linear ruler',()=>{for(const p of [.1,.4,.75,1]){const half=halfWidthKm(p),a=projection(0,0,0,p,0),b=projection(half,0,0,p,0);assert.ok(Math.abs(b[0]-a[0]-520)<1e-9);assert.equal(diameterPixels(half/2,half),520);assert.equal(diameterPixels(half/2000,half),.52);}});
test('camera shift and galaxy rotation preserve a finite Earth anchor',()=>{for(const p of [0,.5,.8,1])for(const tilt of [0,.5,1]){const position=projection(0,0,0,p,tilt);assert.ok(position.every(Number.isFinite));assert.ok(position[0]>=0&&position[0]<=1040);}assert.ok(scaleState(1).galaxy);assert.equal(readProgress('?scale=no'),0);assert.equal(readProgress('?scale=999'),stops[4]);assert.equal(readProgress('?scale=1&scaleVersion=2'),1);});
test('ruler units and truthful boundaries accompany both languages',()=>{assert.ok(ruler(9700)<=9700);assert.equal(displayLength(LIGHT_YEAR_KM).unit,'ly');const data=JSON.parse(readFileSync(new URL('../content.json',import.meta.url)));assert.equal(data.stages.length,stops.length);assert.match(data.stages[4].boundary.en,/three larger galaxies/);assert.match(data.stages[4].boundary.en,/Small rings sample/);assert.match(data.stages[4].boundary.zh,/小光圈只抽样/);assert.match(data.stages[8].boundary.en,/not a physical edge/);const l=JSON.parse(readFileSync(new URL('../learning.json',import.meta.url)));for(const language of ['zh','en']){assert.equal(l[language].academic.length,3);assert.equal(l[language].narration.length,4);for(const n of l[language].academic)assert.ok(n.body.length>55);}});


test('Sun origin starts on its full disk and preserves physical distances across the journey',async()=>{
  const {readJourney,originStart,viewPoint,AU_KM,SUN_RADIUS_KM,EARTH_RADIUS_KM}=await import('../model.ts');
  assert.deepEqual(readJourney(''),{origin:'earth',progress:0});
  assert.equal(readJourney('?origin=invalid').origin,'earth');
  const start=originStart('sun');assert.equal(readJourney('?origin=sun').progress,start);
  assert.equal(readJourney('?origin=sun&scale=0').progress,start);
  assert.equal(readJourney('?origin=sun&scale=.7&scaleVersion=2').progress,.7);
  assert.equal(readJourney('?origin=sun&scale=1').progress,stops[4]);
  assert.ok(diameterPixels(SUN_RADIUS_KM,halfWidthKm(start),390)>100);
  for(let i=0;i<=1000;i++){
    const p=start+(1-start)*i/1000,s=viewPoint(-AU_KM,0,0,p,.35,'sun'),e=viewPoint(0,0,0,p,.35,'sun');
    assert.ok(s.every(Number.isFinite));assert.ok(Math.abs(s[0])<=1);
    if(AU_KM/halfWidthKm(p)>1e-8)assert.ok(Math.abs((e[0]-s[0])*halfWidthKm(p)/AU_KM-1)<1e-7);
  }
  assert.equal(viewPoint(-AU_KM,0,0,start,.35,'sun')[0],0);
  assert.ok(Math.abs(SUN_RADIUS_KM/EARTH_RADIUS_KM-109)<.3);
});
