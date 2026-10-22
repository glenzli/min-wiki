import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { anchors, cameraFrames, channelAt, coastline, glacierCourse, GROUND, LAKE, outletCourse, parcelPosition, riverCourse, runoffCourse, SEA_LEVEL, spatialWatershedState, terrainHeight, type XYZ } from '../watershedGeography.ts';
import { destination, tracerFor, type Settings } from '../watershedModel.ts';
import { poreSection, poreTracer } from '../poreSection.ts';
import { makeTerrainGeometry, makeWatershedRibbon } from '../watershed3d.ts';
const settings:Settings={humidity:75,surface:'soil',route:'warm'};
const distance=(a:XYZ,b:XYZ)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);

test('one hundred identities and their spatial stores remain deterministic across conditions, replay and camera selection',()=>{
 for(const surface of ['soil','clay','paved'] as const)for(const humidity of [10,75,100])for(const p of [0,.12,.3,.5,.64,.72,.86,.93,.98,1]){
  const state=spatialWatershedState(p,{...settings,surface,humidity},.4);
  assert.equal(state.total,100);assert.equal(new Set(state.parcels.map(d=>d.id)).size,100);assert.equal(Object.values(state.pools).reduce((a,b)=>a+b,0),100);
  assert.ok(state.parcels.every(d=>d.position.every(Number.isFinite)));
  assert.deepEqual(state,spatialWatershedState(p,{...settings,surface,humidity},.4));
 }
 const final=spatialWatershedState(1,settings);assert.ok(final.pools.soil>0&&final.pools.lake>0&&final.pools.river>0&&final.pools.ice>0&&final.pools.ocean>0);
 assert.equal(spatialWatershedState(1,{...settings,humidity:10}).pools.vapor,92);
 assert.ok(spatialWatershedState(1,{...settings,surface:'paved'}).pools.soil<final.pools.soil);
});
test('the full river and outlet ribbons sit above the same carved bed, with a downhill water surface',()=>{
 for(const [course,width] of [[riverCourse,(q:number)=>.13+.065*q],[outletCourse,(q:number)=>.15+.055*q]] as const){
  let previous=Infinity;
  for(let i=0;i<=160;i++){
   const q=i/160,p=course(q),a=course(Math.max(0,q-.002)),b=course(Math.min(1,q+.002)),dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz)||1;
   assert.ok(p[1]<=previous+1e-12);previous=p[1];
   for(const s of [-1,0,1]){const x=p[0]-dz/length*width(q)*s,z=p[2]+dx/length*width(q)*s;assert.ok(terrainHeight(x,z)<p[1]-.015,`dry/intersected bed at ${q}`);}
  }
 }
 assert.equal(riverCourse(1)[1],LAKE.y);assert.equal(outletCourse(0)[1],LAKE.y);assert.equal(outletCourse(1)[1],SEA_LEVEL);
 assert.ok(Math.hypot((riverCourse(1)[0]-LAKE.x)/LAKE.rx,(riverCourse(1)[2]-LAKE.z)/LAKE.rz)<1);
 const outlet=outletCourse(1);assert.ok(outlet[0]>coastline(outlet[2]));
});
test('surface runoff and glacier motion remain downhill and meet the actual river',()=>{
 assert.ok(distance(GROUND,runoffCourse(0))<1e-12);assert.ok(distance(runoffCourse(1),riverCourse(.35))<1e-12);
 for(const course of [runoffCourse,glacierCourse]){let previous=Infinity;for(let i=0;i<=120;i++){const point=course(i/120);assert.ok(point[1]<=previous+.00001);previous=point[1];assert.ok(terrainHeight(point[0],point[2])<point[1]);}}
 const ice=tracerFor('ice',settings);let previous=parcelPosition(1,ice,settings,0);
 for(let i=1;i<=2000;i++){const current=parcelPosition(1,ice,settings,i/2000);assert.ok(distance(previous.position,current.position)<.09);assert.ok(current.position[1]<=previous.position[1]+.003);previous=current;}
 const melt=parcelPosition(1,ice,settings,1);assert.equal(melt.pool,'river');assert.ok(channelAt(melt.position[0],melt.position[2]).distance<.14);
});
test('river outlet runoff and glacier ribbons face the observation camera above the terrain',()=>{
 for(const [course,ground]of [[riverCourse,false],[outletCourse,false],[runoffCourse,false],[glacierCourse,true]] as const){
  const geometry=makeWatershedRibbon(course,()=>.13,90,ground?.095:.008,ground),normals=geometry.getAttribute('normal');
  for(let i=0;i<normals.count;i++)assert.ok(normals.getY(i)>0,`downward-facing water or ice vertex ${i}`);
  geometry.dispose();
 }
});
test('precipitation contacts the real hillside; soil moves below it and surface water stays above',()=>{
 for(let id=0;id<100;id++){
  const d=parcelPosition(.64,id,settings),end=parcelPosition(1,id,settings);
  assert.ok(d.position[1]>=terrainHeight(d.position[0],d.position[2])-.005,`buried contact ${id}`);
  if(destination(id,settings)==='soil')assert.ok(end.position[1]<terrainHeight(end.position[0],end.position[2]));
  if(destination(id,settings)==='surface')assert.ok(end.position[1]>terrainHeight(end.position[0],end.position[2]));
 }
});
test('all path junctions are continuous and a portion is counted at sea only after crossing the coast',()=>{
 for(const humidity of [10,75])for(const id of [0,1,2,11,22,45,78,99]){
  let previous=parcelPosition(0,id,{...settings,humidity},.6);
  for(let k=1;k<=2200;k++){
   const p=k/2200,current=parcelPosition(p,id,{...settings,humidity},.6);assert.ok(distance(previous.position,current.position)<.13,`${id} at ${p}`);
   if(p>.64&&current.pool==='ocean')assert.ok(current.position[0]>=coastline(current.position[2]));
   previous=current;
  }
 }
 const lake=tracerFor('lake',settings),ocean=tracerFor('ocean',settings);assert.equal(parcelPosition(1,lake,settings).pool,'lake');assert.equal(parcelPosition(1,ocean,settings).pool,'ocean');
});
test('pore section retains the same soil identities and stable gaps across surfaces and replay',()=>{
 const baseline=poreSection(1,settings,22),again=poreSection(1,settings,22);assert.deepEqual(baseline,again);
 assert.equal((baseline.scene.match(/data-soil-grain=/g)||[]).length,63);
 const expected=spatialWatershedState(1,settings).parcels.filter(p=>p.pool==='soil').map(p=>p.id);
 const ids=[...baseline.scene.matchAll(/data-batch-water="(\d+)"/g)].map(m=>Number(m[1]));assert.deepEqual(ids,expected);
 for(const id of expected)for(let k=0;k<=50;k++){const p=poreTracer(.64+.36*k/50,id,settings);assert.ok(p.x>50&&p.x<320);for(let col=0;col<9;col++)assert.ok(Math.abs(p.x-(36+col*37))>16.2);}
 const grains=(scene:string)=>[...scene.matchAll(/<ellipse data-soil-grain=.*?\/>/g)].map(m=>m[0]);
 assert.deepEqual(grains(baseline.scene),grains(poreSection(1,{...settings,surface:'paved'},22).scene));
 assert.equal(baseline.soil,expected.length);
});
test('one bounded retained terrain and camera anchors remain projectable without changing the cohort',()=>{
 const geometry=makeTerrainGeometry();assert.equal(geometry.getAttribute('position').count,177*105);assert.ok(geometry.index!.count<120000);assert.ok([...geometry.getAttribute('normal').array].every(Number.isFinite));geometry.dispose();
 for(const [view,frame]of Object.entries(cameraFrames)){
  const camera=new THREE.OrthographicCamera(-frame.span/2,frame.span/2,frame.span*.35,-frame.span*.35,.1,90),target=new THREE.Vector3(...frame.target);
  camera.position.set(target.x+Math.sin(.2)*frame.distance*Math.cos(frame.pitch),target.y+Math.sin(frame.pitch)*frame.distance,target.z+Math.cos(.2)*frame.distance*Math.cos(frame.pitch));camera.lookAt(target);camera.updateMatrixWorld();
  const anchor=view==='basin'?anchors.ground:anchors[view as keyof typeof anchors];if(anchor){const projected=new THREE.Vector3(...anchor).project(camera);assert.ok(Math.abs(projected.x)<.9&&Math.abs(projected.y)<.9,view);}
 }
});
test('question path preserves equivalent bilingual mechanisms and explicit independent clock limits',()=>{
 const content=JSON.parse(readFileSync(new URL('../explorerContent.json',import.meta.url),'utf8'));
 const keys=(o:Record<string,unknown>,p=''):string[]=>Object.entries(o).flatMap(([key,value])=>value&&typeof value==='object'?keys(value as Record<string,unknown>,`${p}${key}.`):[p+key]);
 assert.deepEqual(keys(content.zh),keys(content.en));assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(content.en)));
 for(const view of ['basin','cloud','ground','river','ice'])for(const key of ['watch','cause','try','limit'])assert.ok(content.en.questions[view][key].length>45);
 assert.match(content.en.questions.ice.limit,/three distinct/);assert.match(content.en.questions.ground.limit,/cannot be added/);
});
