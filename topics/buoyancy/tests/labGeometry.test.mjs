import test from 'node:test';
import assert from 'node:assert/strict';
import { basinPoint, createVesselWall, createBasinWater, updateBasinWater, createWoodShape, createPebbleShape, createMetalShape, createClayShape } from '../labGeometry.ts';

test('curved water boundary stays inside the same glass profile at every displayed depth',()=>{
 const water=createBasinWater();
 for(const height of [1.95,2.1,2.3,2.65,2.9]){
  updateBasinWater(water,height);const p=water.getAttribute('position');
  for(let i=0;i<=128;i++){
   const angle=i/128*Math.PI*2,inner=basinPoint(angle,height,.070),edge=basinPoint(angle,height,.075);
   assert.ok(Math.hypot(edge.x,edge.y)<Math.hypot(inner.x,inner.y));
   assert.ok(Math.abs(p.getX(129+i)-edge.x)<1e-6);
   assert.ok(Math.abs(p.getZ(129+i)-edge.y)<1e-6);
   assert.equal(p.getY(129+i),.5);assert.equal(p.getY(i),-.5);
  }
 }
 water.dispose();
});

test('distinct specimens retain unit bounds for the existing draft and floor placement',()=>{
 for(const make of [createWoodShape,createPebbleShape,createMetalShape,createClayShape]){
  const geometry=make();geometry.computeBoundingBox();
  for(const key of ['x','y','z']){
   assert.ok(Math.abs(geometry.boundingBox.min[key]+.5)<1e-6);
   assert.ok(Math.abs(geometry.boundingBox.max[key]-.5)<1e-6);
  }
  for(const value of geometry.getAttribute('normal').array)assert.ok(Number.isFinite(value));
  geometry.dispose();
 }
 const glass=createVesselWall();glass.computeBoundingBox();
 assert.ok(glass.boundingBox.min.x>=-2.64&&glass.boundingBox.max.x<=2.64);
 assert.ok(glass.boundingBox.min.z>=-1.16&&glass.boundingBox.max.z<=1.16);
 assert.ok(glass.boundingBox.max.y<=3.48);glass.dispose();
});
