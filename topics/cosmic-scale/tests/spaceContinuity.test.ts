import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { spatialWebFrame, spatialWebPose } from '../cosmicSpaceModel.ts';
import { LIGHT_YEAR_KM as LY, progressFor, cameraFrameScale, viewPoint } from '../model.ts';

test('statistical detail handoffs stay bounded and continuous across the physical zoom',()=>{
  for(let step=0;step<=1000;step++){
    const halfLy=10**(7+step/1000*5),frame=spatialWebFrame(halfLy),next=spatialWebFrame(halfLy*1.000001);
    assert.equal(frame.length,3);
    assert.ok(frame.reduce((sum,level)=>sum+level.opacity,0)<=1+1e-12);
    frame.forEach((level,index)=>{assert.ok(level.opacity>=0&&level.opacity<=1);assert.ok(Math.abs(level.opacity-next[index]!.opacity)<1e-5);});
  }
  assert.deepEqual(spatialWebFrame(1e6).map(level=>level.opacity),[0,0,0]);
  assert.deepEqual(spatialWebFrame(1e11).map(level=>level.opacity),[0,0,1]);
});

test('rendered volume coordinates preserve the physical camera and ruler on desktop and mobile',()=>{
  for(const halfLy of [6e7,4e8,5e9,1e11])for(const [width,height]of [[1280,480],[390,400]])for(const tilt of [0,.35,1])for(const origin of ['earth','sun'] as const){
    const progress=progressFor(halfLy*LY),radiusLy=6e8,pose=spatialWebPose(progress,width!,height!,tilt,origin,radiusLy);
    const root=new THREE.Group();root.position.set(...pose.center);root.scale.set(...pose.scale);root.rotation.x=pose.pitch;root.updateMatrixWorld();
    const framing=cameraFrameScale(progress,width!,height!);
    for(const coordinates of [[0,0,0],[.12,-.22,.08],[-.17,.03,-.14]] as [number,number,number][]){
      const actual=new THREE.Vector3(...coordinates).applyMatrix4(root.matrixWorld);
      const expected=viewPoint(coordinates[0]*radiusLy*LY,coordinates[1]*radiusLy*LY,coordinates[2]*radiusLy*LY,progress,tilt,origin).map(value=>value/framing);
      actual.toArray().forEach((value,index)=>assert.ok(Math.abs(value-expected[index]!)<1e-10));
    }
  }
});
