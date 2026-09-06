import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TdeSimulation } from '../physics/tdeSimulation.js';

test('leaving a disruption explicitly hides the previous gas in Three.js', () => {
  // Start after route selection with an already-visible gas population. Three
  // skips an object only when visible === false; undefined is not sufficient.
  for (const scenario of ['free', 'flyby']) {
    const scene=Object.assign(Object.create(TdeSimulation.prototype), {
      scenario, lastProgress:null, gasStatus:'ready', view:'free', guidesVisible:true,
      star:{group:new THREE.Group(),surface:{material:{uniforms:{uTime:{value:0}}}}},
      stellarGas:{points:new THREE.Points()}, focus:new THREE.Vector3(),
      trail:{geometry:new THREE.BufferGeometry()}, future:{geometry:new THREE.BufferGeometry()},
      guides:new THREE.Group(), controls:{update(){}}, camera:new THREE.PerspectiveCamera(),
      renderer:{render(){}}, scene:new THREE.Scene(),
    });
    scene.stellarGas.points.visible=true;
    scene.update(.5,scenario);
    assert.equal(scene.stellarGas.points.visible,false);
    assert.equal(scene.star.group.visible,true);
  }
});
