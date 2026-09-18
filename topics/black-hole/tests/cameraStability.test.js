import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TdeSimulation } from '../physics/tdeSimulation.ts';

function fixture(view, width=1192, height=1020) {
  const positions=new Float32Array([109.999,0,0]);
  const scene=Object.assign(Object.create(TdeSimulation.prototype),{
    scenario:'tidal',view,lastProgress:.8,gasStatus:'ready',cameraStarted:-Infinity,
    container:{clientWidth:width,clientHeight:height},
    camera:new THREE.PerspectiveCamera(18,width/height,.1,12000),
    controls:{target:new THREE.Vector3(),update(){}},
    stellarGas:{model:{},points:{geometry:{attributes:{
      position:{array:positions},state:{array:new Float32Array([1,1])},bound:{array:new Uint8Array([1])}
    }}}}
  });
  return {scene,positions};
}
const pose=scene=>[...scene.camera.position,...scene.controls.target,...scene.camera.quaternion];

test('a parcel crossing the former framing cutoff cannot move the camera',()=>{
  for(const view of ['overview','top','close']) {
    const {scene,positions}=fixture(view);
    scene.frameCamera(); const before=pose(scene);
    positions[0]=110.001;
    scene.frameCamera(); assert.deepEqual(pose(scene),before);
  }
});
test('late framing stays fixed, pause and reverse seeking restore the same pose',()=>{
  for(const [width,height] of [[1192,1020],[390,440]]) for(const view of ['overview','top','close']) {
    const {scene}=fixture(view,width,height);
    scene.frameCamera(); const late=pose(scene);
    for(const p of [.9,1.2,.8,.8]) {scene.lastProgress=p;scene.frameCamera();assert.deepEqual(pose(scene),late);}
    scene.lastProgress=.3;scene.frameCamera();scene.lastProgress=.8;scene.frameCamera();
    assert.deepEqual(pose(scene),late);
  }
});
test('automatic framing enters the observation view continuously',()=>{
  const {scene}=fixture('overview');
  for(const boundary of [.18,.43,.65]) {
    scene.lastProgress=boundary-1e-6;scene.frameCamera();const before=scene.camera.position.clone();
    scene.lastProgress=boundary+1e-6;scene.frameCamera();
    assert.ok(before.distanceTo(scene.camera.position)<.01);
  }
});

test('a paused view transition renders its final pose once, then stops rendering',()=>{
  let frames=0, framed=0;
  const scene=Object.assign(Object.create(TdeSimulation.prototype),{
    scenario:'tidal',view:'overview',lastProgress:.8,lastGuides:true,guidesVisible:true,
    needsRender:true,cameraStarted:performance.now()-801,gasStatus:'ready',
    stellarGas:{points:{visible:true}},guides:{},camera:new THREE.PerspectiveCamera(),
    renderer:{render(){frames++;}},frameCamera(){framed++;},
  });
  scene.update(.8,'tidal');
  assert.equal(framed,1,'settle the camera even when the transition deadline passed between frames');
  scene.update(.8,'tidal');
  assert.equal(frames,1,'paused scenes must not keep changing or repainting');
});
