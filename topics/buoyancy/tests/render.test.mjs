import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { frameLab, orientLab, projectInViewport } from '../framing.ts';
import { tankFixture, boatState, drawBoat, visibleCargoSamples, cargoTopPointVisible, morphFixture } from './renderFixtures.mjs';

test('production boat camera reveals all four cargo tops without moving them off the inner floor',()=>{
 for(const [width,height] of [[1238,476],[368,312]])for(const capacity of [900,1200,1400,1800]){
  const tank=tankFixture(width,height),state=boatState(capacity),{geometry}=drawBoat(tank,state);
  const samples=visibleCargoSamples(tank,4);
  // A curved narrow hull may hide one outer corner, but never the stamp or
  // bulk of a block's top. Wider hulls expose the entire sampled top faces.
  assert.ok(samples.every(count=>count>=8),`${width}px, ${capacity}mL: ${samples}`);
  if(capacity>=1200)assert.deepEqual(samples,[9,9,9,9],`${width}px, ${capacity}mL`);
  const bottom=.08+(440-geometry.bottom)*.01,thickness=(20*260/geometry.width)*.01;
  for(const cargo of tank.cargo.slice(0,4)){
   assert.equal(cargo.visible,true);
   assert.equal(cargoTopPointVisible(tank,cargo),true);
   assert.ok(Math.abs(cargo.position.y-.115-bottom-thickness)<1e-10);
  }
  // Show that this geometric test detects the reported old viewing defect.
  if(capacity===1800){orientLab(tank.camera,0);frameLab(tank.camera,width,height,false,false);assert.deepEqual(visibleCargoSamples(tank,4),[0,0,0,0]);}
 }
});
test('production camera follows the retained opening and still fits the entire apparatus',()=>{
 const tank=tankFixture(368,312),state=boatState();
 for(const form of [0,.4,1,.4,0]){
  drawBoat(tank,state,form);
  assert.ok(Math.abs(tank.camera.position.y-(8.4+(26-8.4)*form))<1e-10);
  for(const x of [-2.64,2.64])for(const y of [-.26,3.48])for(const z of [-1.16,1.16]){
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
