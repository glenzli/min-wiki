import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createSolarPhotosphereMaterial,createSolarHalo,setSolarPhotospherePhase} from '../solarPhotosphere3d.ts';
import {SOLAR_SURFACE_STYLE,SOLAR_SURFACE_GLSL,SOLAR_SPOTS,solarSurfacePhase} from '../solarSurfaceModel.ts';

test('GPU surface consumes the canonical Sun field without its own palette, exposure, texture or clock',()=>{
 const a=createSolarPhotosphereMaterial(8.49),b=createSolarPhotosphereMaterial();
 assert.ok(a instanceof THREE.ShaderMaterial);assert.equal(a.userData.solarProfile,SOLAR_SURFACE_STYLE.revision);assert.ok(a.fragmentShader.includes(SOLAR_SURFACE_GLSL));
 assert.equal(a.toneMapped,false);assert.equal(a.lights,false);assert.equal(a.transparent,false);assert.equal(a.depthWrite,true);assert.equal(a.uniforms.surfacePhase!.value,solarSurfacePhase(8.49));
 assert.doesNotMatch(a.fragmentShader,/tonemapping_fragment|colorspace_fragment|sampler[23]D|gl_FragCoord/);assert.equal(a.userData.maxNoiseHashesPerFragment,32);
 a.uniforms.solarSpots!.value[0].x=.7;assert.notEqual(a.uniforms.solarSpots!.value[0].x,b.uniforms.solarSpots!.value[0].x);assert.notEqual(a.uniforms.solarSpots!.value,b.uniforms.solarSpots!.value);
 setSolarPhotospherePhase(a,20.49);assert.equal(a.uniforms.surfacePhase!.value,solarSurfacePhase(20.49));assert.equal(b.uniforms.surfacePhase!.value,0);
 a.dispose();b.dispose();
});
test('the surface keeps the caller sphere and object-bound coordinates, with calibrated adapter handedness',()=>{
 const material=createSolarPhotosphereMaterial(),sphere=new THREE.SphereGeometry(1,40,28),position=sphere.getAttribute('position'),before=position.array.slice(),mesh=new THREE.Mesh(sphere,material);
 mesh.scale.setScalar(695700);mesh.rotation.set(.3,.7,0);mesh.updateMatrixWorld(true);assert.deepEqual(position.array,before);assert.deepEqual(mesh.scale.toArray(),[695700,695700,695700]);
 assert.match(material.vertexShader,/vLocalPosition=position/);assert.doesNotMatch(material.vertexShader,/position[+\-]=|displace/);
 assert.match(material.fragmentShader,/canonical=vec3\(p.x,-p.y,p.z\)/);assert.match(material.fragmentShader,/isOrthographic\?vec3\(0\.,0\.,1\.\):normalize\(vToEye\)/);assert.match(material.fragmentShader,/fwidth\(p\)/);
 assert.deepEqual(material.uniforms.solarSpots!.value.map((spot:THREE.Vector4)=>spot.toArray()),SOLAR_SPOTS.map(spot=>[...spot]));sphere.dispose();material.dispose();
});
test('the common soft halo is a separately owned billboard with no inflated body geometry',()=>{
 const halo=createSolarHalo(),s=SOLAR_SURFACE_STYLE;
 assert.equal(halo.material.userData.solarProfile,s.revision);assert.equal(halo.material.depthWrite,false);assert.equal(halo.material.depthTest,true);assert.equal(halo.material.toneMapped,false);
 assert.equal(halo.material.uniforms.innerRadius!.value*s.haloOuter,s.haloInner);assert.deepEqual(halo.material.uniforms.haloColour!.value.toArray(),s.haloColour.map(value=>value/255));
 assert.match(halo.material.fragmentShader,/r<innerRadius/);assert.match(halo.material.vertexShader,/center=modelViewMatrix/);assert.ok(halo.geometry.getAttribute('position').count<=4);
 let geometries=0,materials=0;halo.geometry.addEventListener('dispose',()=>geometries++);halo.material.addEventListener('dispose',()=>materials++);halo.geometry.dispose();halo.material.dispose();assert.equal(geometries,1);assert.equal(materials,1);
});
test('all three consumers share surface identity while the original activity clock stays with comparison',()=>{
 const comparison=readFileSync(new URL('../comparison.ts',import.meta.url),'utf8'),membership=readFileSync(new URL('../membership3d.ts',import.meta.url),'utf8'),zoom=readFileSync(new URL('../scene.ts',import.meta.url),'utf8'),main=readFileSync(new URL('../main.ts',import.meta.url),'utf8');
 assert.match(comparison,/if\(index===2\)\{paintSolarDisk/);assert.doesNotMatch(comparison,/if\(index===2\)for\(const \[spot/);
 assert.match(membership,/createSolarPhotosphereMaterial\(this.solarPhase\)/);assert.match(zoom,/createSolarPhotosphereMaterial\(/);
 for(const source of [membership,zoom]){assert.match(source,/createSolarHalo\(/);assert.match(source,/setSolarPhotospherePhase\(/);assert.doesNotMatch(source,/setInterval\(|Date.now\(/);}
 assert.match(comparison,/setSolarPhase\(this.solarPhase\)/);assert.match(main,/scene\?\.setSolarPhase\(comparison.solarPhase\)/);
});
