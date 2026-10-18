import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { EARTH_RADIUS, radialPoint } from '../model.ts';
import { SURFACE_REFERENCE, surfacePoint, surfaceUV, coastWeight, reliefHeight, surfaceViewFrame } from '../surfaceModel.ts';

test('GPU surface camera and Canvas altitude markers share one projection through the full journey',()=>{
 for(const [w,h]of [[1280,720],[1440,1000],[264,470]])for(let i=0;i<=200;i++){
  const view=surfaceViewFrame(i/200,w,h),{frame,scale}=view;
  const camera=new THREE.OrthographicCamera(-w/(2*scale),w/(2*scale),h/(2*scale),-h/(2*scale),.1,40000);
  camera.position.set(0,-frame.centerY+20000*view.sin,20000*view.cos);camera.lookAt(0,-frame.centerY,0);camera.updateMatrixWorld();
  for(const [x,height]of [[0,0],[0,frame.height],[-9,3],[14,2]]){
   const reference=radialPoint(x,height),point=surfacePoint(x,0,height),screen=new THREE.Vector3(point.x,point.y,point.z).project(camera);
   assert.ok(Math.abs((screen.x+1)*w/2-(w/2+reference.x*scale))<1e-8);
   assert.ok(Math.abs((1-screen.y)*h/2-(h/2+(reference.y-frame.centerY)*scale*view.cos))<1e-8);
  }
 }
});
test('external pitch is continuous, bounded and independent of viewport size',()=>{
 let previous=surfaceViewFrame(0,1280,720).tilt;
 for(let i=1;i<=1000;i++){
  const a=surfaceViewFrame(i/1000,1280,720),b=surfaceViewFrame(i/1000,390,844);
  assert.equal(a.tilt,b.tilt);assert.ok(a.tilt>=0&&a.tilt<=Math.PI/150);
  assert.ok(Math.abs(a.tilt-previous)<.002);previous=a.tilt;
 }
 assert.equal(surfaceViewFrame(0,1280,720).tilt,0);
});
test('the same marked sphere location supplies the far map and local coast',()=>{
 const uv=surfaceUV(0,EARTH_RADIUS,0);
 assert.ok(Math.abs(uv.u-(SURFACE_REFERENCE.longitude/360+.5))<1e-12);
 assert.ok(Math.abs(uv.v-(.5-SURFACE_REFERENCE.latitude/180))<1e-12);
 for(const [x,z]of [[0,0],[10,40],[-880,-295],[880,1380]]){
  const p=surfacePoint(x,z),a=surfaceUV(p.x,p.y,p.z),b=surfaceUV(p.x*2,p.y*2,p.z*2);
  assert.ok(Math.abs(Math.hypot(p.x,p.y,p.z)-EARTH_RADIUS)<1e-9);assert.deepEqual(a,b);
 }
});
test('illustrative relief is bounded, deterministic and absent at sea, the anchor and patch edges',()=>{
 assert.equal(coastWeight(30,59,120),0);assert.equal(coastWeight(87,97,89),1);
 for(const land of [0,.5,1]){
  assert.equal(reliefHeight(0,0,land),0);
  for(const [x,z]of [[-880,100],[880,100],[100,-295],[100,1380]])assert.equal(reliefHeight(x,z,land),0);
 }
 for(let x=-880;x<=880;x+=17)for(let z=-295;z<=1380;z+=23){
  const h=reliefHeight(x,z,1);assert.ok(Number.isFinite(h)&&h>=0&&h<=1.65);assert.equal(h,reliefHeight(x,z,1));assert.equal(reliefHeight(x,z,0),0);
 }
});
