import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BlackHoleOptics} from '../blackHoleOptics.ts';

test('black-hole optics carries parallel versus perspective projection into the same retained ray material',()=>{
 const hole=new BlackHoleOptics(.014),owner=new THREE.Group(),scene=new THREE.Scene();owner.rotation.set(.8,0,.4);owner.position.set(.2,-.05,.1);owner.add(hole);hole.position.set(.05,.01,0);scene.add(owner);
 const quad=hole.children[0] as THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>,material=quad.material,geometry=quad.geometry;
 for(const camera of [new THREE.OrthographicCamera(-1,1,1,-1,.001,20),new THREE.PerspectiveCamera(25,1,.001,20)]){
  camera.position.set(.1,-.2,6);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
  quad.onBeforeRender({} as THREE.WebGLRenderer,scene,camera,geometry,material,owner);
  const inverse=hole.matrixWorld.clone().invert(),direction=camera.getWorldDirection(new THREE.Vector3()).transformDirection(inverse);
  assert.ok(material.uniforms.uDirection!.value.distanceTo(direction)<1e-12);assert.equal(material.uniforms.uOrthographic!.value,camera instanceof THREE.OrthographicCamera);
  assert.ok(material.uniforms.uCamera!.value.distanceTo(camera.position.clone().applyMatrix4(inverse))<1e-12);
  assert.equal(hole.children[0],quad);assert.equal(quad.geometry,geometry);assert.equal(material.uniforms.uRs!.value,.014/2.6);
 }
 hole.setAccretion(3,2);assert.equal(material.uniforms.uStrength!.value,1);assert.equal(material.uniforms.uTime!.value,3);hole.setAccretion(4,-1);assert.equal(material.uniforms.uStrength!.value,0);
 let geometries=0,materials=0;geometry.addEventListener('dispose',()=>geometries++);material.addEventListener('dispose',()=>materials++);hole.dispose();assert.equal(geometries,1);assert.equal(materials,1);
});
