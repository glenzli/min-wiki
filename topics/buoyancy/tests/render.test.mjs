import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { frameLab, orientLab, projectInViewport, labHeight, LAB_VERTICAL_UNIT } from '../framing.ts';
import { tankFixture, boatState, drawBoat, visibleCargoSamples, cargoTopPointVisible, morphFixture } from './renderFixtures.mjs';
import { drawPressureSection } from '../pressureView.ts';
import { experimentGeometry } from '../scene.ts';
import { buoyancy } from '../model.ts';

test('production boat camera reveals all four cargo tops without moving them off the inner floor',()=>{
 for(const [width,height] of [[1238,476],[368,312]])for(const capacity of [900,1200,1400,1800]){
  const tank=tankFixture(width,height),state=boatState(capacity),{geometry}=drawBoat(tank,state);
  const samples=visibleCargoSamples(tank,4);
  // A curved narrow hull may hide one outer corner, but never the stamp or
  // bulk of a block's top. Wider hulls expose the entire sampled top faces.
  assert.ok(samples.every(count=>count>=8),`${width}px, ${capacity}mL: ${samples}`);
  if(capacity>=1200)assert.deepEqual(samples,[9,9,9,9],`${width}px, ${capacity}mL`);
  const bottom=labHeight(geometry.bottom),thickness=(20*260/geometry.width)*LAB_VERTICAL_UNIT;
  for(const cargo of tank.cargo.slice(0,4)){
   assert.equal(cargo.visible,true);
   assert.equal(cargoTopPointVisible(tank,cargo),true);
   assert.ok(Math.abs(cargo.position.y-.115-bottom-thickness)<1e-10);
  }
 }
});
test('production camera follows the retained opening and still fits the entire apparatus',()=>{
 const tank=tankFixture(368,312),state=boatState();
 for(const form of [0,.4,1,.4,0]){
  drawBoat(tank,state,form);
  assert.ok(Math.abs(tank.camera.position.y-(8.4+(26-8.4)*form))<1e-10);
  for(const x of [-2.72,2.72])for(const y of [-.18,1.95])for(const z of [-1.24,1.24]){
   const [px,py]=projectInViewport(tank.camera,new THREE.Vector3(x,y,z),368,312);
   assert.ok(px>=0&&px<=368&&py>=0&&py<=312);
  }
 }
});
test('lens change and its resize redraw preserve a partially opened hull',()=>{
 for(const form of [.15,.4,.8]){
  const {scene,forms}=morphFixture(form);scene.observe('displacement',false);
  assert.deepEqual(forms,[form,form]);assert.equal(scene.form,form);assert.equal(scene.settled,false);
 }
});
test('same-settings annotation and standalone resize redraw preserve both morph directions',()=>{
 for(const boat of [true,false]){
  const {scene,state,result,forms}=morphFixture(.4);state.boat=boat;
  scene.set(state,result,false);scene.redraw();
  assert.deepEqual(forms,[.4,.4]);assert.equal(scene.form,.4);assert.equal(scene.settled,false);
 }
});


test('manual observation stays with the same experiment through clay reshaping',()=>{
 const tank=tankFixture(),state=boatState();tank.navigation.manual=true;
 tank.camera.position.set(-8,7,10);tank.camera.lookAt(0,1.65,0);
 for(const form of [0,.4,1,.4,0]){drawBoat(tank,state,form);assert.deepEqual(tank.camera.position.toArray(),[-8,7,10]);}
});

test('imagined replacement keeps flooded cargo and uses displaced-water weight, not total object weight',()=>{
 const state=boatState(900,4),before={...state},result=buoyancy(state),g=experimentGeometry(state,result);
 const svg={parentElement:{getBoundingClientRect:()=>({width:760,height:410})},setAttribute(){},innerHTML:''};
 drawPressureSection(svg,state,g,result,true,undefined,true);
 assert.equal(result.flooded,true);assert.equal(result.displaced,560);
 assert.equal((svg.innerHTML.match(/data-parcel-cargo=/g)||[]).length,4);
 assert.match(svg.innerHTML,/data-displaced-ml="560"/);
 assert.match(svg.innerHTML,new RegExp(`id="parcel-weight" data-newtons="${result.force}"`));
 assert.notEqual(result.force,result.weight);assert.deepEqual(state,before);
});

test('imagined dry cavity counts below water while a dry suspended block has no water-weight arrow',()=>{
 const svg={parentElement:{getBoundingClientRect:()=>({width:390,height:330})},setAttribute(){},innerHTML:''};
 for(const state of [boatState(1800,4),{...boatState(),experiment:'depth',depth:0}]){
  const result=buoyancy(state);drawPressureSection(svg,state,experimentGeometry(state,result),result,true,undefined,true);
  assert.match(svg.innerHTML,/clip-path="url\(#parcel-underwater\)"/);
  assert.equal(svg.innerHTML.includes('id="parcel-weight"'),result.displaced>0);
  assert.equal(svg.innerHTML.includes('data-parcel-cargo='),false);
 }
});

test('molecular observation uses one bounded frame owner and stops when leaving the view',()=>{
 const saved={raf:globalThis.requestAnimationFrame,cancel:globalThis.cancelAnimationFrame,document:globalThis.document};
 let nextId=0;const callbacks=new Map(),notifications=[];
 globalThis.requestAnimationFrame=callback=>{callbacks.set(++nextId,callback);return nextId;};
 globalThis.cancelAnimationFrame=id=>callbacks.delete(id);
 globalThis.document={hidden:false};
 try{
  const {scene,state}=morphFixture(1),before={...state};
  Object.assign(scene,{observation:'pressure',microscopic:true,settled:true,disposed:false,molecularRunning:false,molecularProgress:0,reduced:{matches:false},onMolecularMotion:running=>notifications.push(running),redraw(){}});
  scene.toggleMolecularMotion();assert.equal(callbacks.size,1);assert.equal(scene.molecularRunning,true);
  const tick=callbacks.get(scene.frame);callbacks.delete(scene.frame);tick(performance.now()+4100);
  assert.equal(callbacks.size,0);assert.equal(scene.molecularProgress,1);assert.deepEqual(notifications,[true,false]);
  scene.toggleMolecularMotion();assert.equal(callbacks.size,1);
  scene.observe('replacement',false,true);
  assert.equal(callbacks.size,0);assert.equal(scene.molecularRunning,false);assert.deepEqual(state,before);
 }finally{globalThis.requestAnimationFrame=saved.raf;globalThis.cancelAnimationFrame=saved.cancel;globalThis.document=saved.document;}
});

test('reduced-motion molecular view stays readable without starting a second clock',()=>{
 const {scene}=morphFixture(1);let draws=0;
 Object.assign(scene,{observation:'pressure',microscopic:true,settled:true,disposed:false,molecularRunning:false,reduced:{matches:true},redraw(){draws++;}});
 scene.toggleMolecularMotion();assert.equal(draws,1);assert.equal(scene.molecularRunning,false);assert.equal(scene.molecularProgress,.35);
});
