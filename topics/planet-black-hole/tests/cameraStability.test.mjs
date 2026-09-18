import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PlanetScene } from '../scene.ts';
import { FRAMES } from '../model.ts';

test('planet fallback framing settles independently of debris motion and seeking order',()=>{
  const oldWindow=globalThis.window;
  globalThis.window={matchMedia:()=>({matches:false})};
  try {
    for(const aspect of [1192/1020,390/440]) for(const view of ['overview','top','close']) {
      const scene=Object.assign(Object.create(PlanetScene.prototype),{
        data:{released:new Uint16Array(FRAMES).fill(1)},
        camera:new THREE.PerspectiveCamera(18,aspect,.01,3000),
        controls:{target:new THREE.Vector3()},cameraStarted:-Infinity
      });
      const pose=()=>[...scene.camera.position,...scene.controls.target,...scene.camera.quaternion];
      scene.frameCamera(.7,'deep',view);const late=pose();
      for(const p of [1,.8,.7]) {scene.frameCamera(p,'deep',view);assert.deepEqual(pose(),late);}
      scene.frameCamera(.2,'deep',view);scene.frameCamera(.7,'deep',view);assert.deepEqual(pose(),late);
    }
  } finally {globalThis.window=oldWindow;}
});
