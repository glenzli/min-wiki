import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { frameLab, projectInViewport } from '../framing.ts';

test('all tank corners and suspended apparatus fit wide, square and narrow viewports',()=>{
 for(const [width,height] of [[1236,350],[760,480],[360,330],[390,500]])for(const held of [false,true])for(const comparison of [false,true]){
  const camera=new THREE.OrthographicCamera(-5,5,3,-3,.1,70);
  camera.position.set(4.4,8.4,12.8);camera.lookAt(0,1.65,0);
  frameLab(camera,width,height,comparison,held);
  assert.ok(Math.abs((camera.right-camera.left)/(camera.top-camera.bottom)-width/height)<1e-12);
  for(const x of [held?-3.5:-2.64,comparison?4.3:2.64])for(const y of [-.26,held?4.12:3.48])for(const z of [-1.16,1.16]){
   const [px,py]=projectInViewport(camera,new THREE.Vector3(x,y,z),width,height);
   assert.ok(px>=0&&px<=width&&py>=0&&py<=height,`${width}×${height}: ${px}, ${py}`);
  }
 }
});
test('annotation projection uses the actual viewport without changing experimental coordinates',()=>{
 const camera=new THREE.OrthographicCamera(-5,5,3,-3,.1,70);
 camera.position.set(0,0,10);camera.lookAt(0,0,0);frameLab(camera,1200,320,false,false);
 const [x,y]=projectInViewport(camera,new THREE.Vector3(0,0,0),1200,320);
 const right=projectInViewport(camera,new THREE.Vector3(1,0,0),1200,320),up=projectInViewport(camera,new THREE.Vector3(0,1,0),1200,320);
 assert.ok(Math.abs((right[0]-x)-(y-up[1]))<1e-10);
});
