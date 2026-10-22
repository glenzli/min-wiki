import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { earthCompositionCue } from '../compositionModel.ts';
import { AtmosphereStructureWorld } from '../structureScene.ts';
import { defaultPhenomena, readPhenomenonQuery, writePhenomenonQuery } from '../phenomenaModel.ts';
import { expandedHeight, displayHeight } from '../structureModel.ts';

test('constituent cues are finite independent envelopes with lower water vapour and a broad stratospheric ozone region',()=>{
 for(let h=0;h<=1000;h+=.5){const q=earthCompositionCue(h);assert.ok(q.water>=0&&q.water<=1&&q.ozone>=0&&q.ozone<=1);}
 assert.ok(earthCompositionCue(1).water>earthCompositionCue(5).water&&earthCompositionCue(5).water>earthCompositionCue(12).water);
 assert.ok(earthCompositionCue(25).ozone>earthCompositionCue(0).ozone*10);
 for(const h of [15,25,35])assert.ok(earthCompositionCue(h).ozone>earthCompositionCue(55).ozone*50);
 assert.ok(earthCompositionCue(100).water<1e-6&&earthCompositionCue(100).ozone<1e-6);
 for(const h of [11,25,50])assert.ok(Math.abs(earthCompositionCue(h+.001).ozone-earthCompositionCue(h-.001).ozone)<.001);
});

test('composition switch survives navigation independently of process cues, detail and weather',()=>{
 const q=writePhenomenonQuery('?lang=en&journey=.376&world=venus',defaultPhenomena,defaultPhenomena,false,[{world:'earth',id:'ozone'}],true);
 const restored=readPhenomenonQuery(q.toString());assert.equal(restored.composition,true);assert.equal(restored.clues,false);assert.equal(restored.earth.weather,'rain');assert.equal(restored.detail[0].id,'ozone');assert.equal(q.get('journey'),'.376');
 const off=writePhenomenonQuery(q.toString(),restored.earth,restored.titan,false,restored.detail,false);
 assert.equal(off.has('composition'),false);assert.equal(readPhenomenonQuery(off.toString()).composition,false);assert.deepEqual(readPhenomenonQuery(off.toString()).detail,restored.detail);
 assert.equal(readPhenomenonQuery('?composition=rainbow').composition,false);
});

test('Earth toggles the same finite profile without changing natural objects or imposing profiles on other worlds',()=>{
 const model=new AtmosphereStructureWorld('earth');let air:THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>|undefined;
 model.scene.traverse(o=>{if(o instanceof THREE.Mesh&&o.material instanceof THREE.ShaderMaterial&&o.material.uniforms.uComposition)air=o;});
 assert.ok(air);const material=air.material,texture=material.uniforms.uCompositionProfile.value as THREE.DataTexture,geometry=air.geometry,bytes=model.resourceBytes;
 const data=texture.image.data;assert.equal(data.byteLength,1024);assert.equal(texture.image.width,256);assert.equal(texture.image.height,1);
 const at=(km:number,channel:number)=>data[Math.round(expandedHeight('earth',km)/displayHeight('earth')*255)*4+channel];
 assert.ok(at(25,1)>at(0,1)*10&&at(1,0)>at(12,0)*10);
 const rain=model.scene.getObjectByName('cloud-grown-rain')!,plane=model.scene.getObjectByName('enlarged-cruise-airplane')!;
 model.update('weather',7,null,null,{...defaultPhenomena,clues:false,composition:false});const position=plane.position.clone();assert.equal(rain.visible,true);
 for(let i=0;i<30;i++){
  model.update('weather',7,null,null,{...defaultPhenomena,clues:false,composition:!!(i%2)});
  assert.equal(material.uniforms.uComposition.value,i%2);assert.equal(air.geometry,geometry);assert.equal(material.uniforms.uCompositionProfile.value,texture);assert.equal(model.resourceBytes,bytes);assert.deepEqual(plane.position,position);assert.equal(rain.visible,true);
 }
 let disposed=0;texture.addEventListener('dispose',()=>disposed++);model.dispose();model.dispose();assert.equal(disposed,1);
 for(const world of ['venus','moon'] as const){const foreign=new AtmosphereStructureWorld(world);foreign.scene.traverse(o=>{if(o instanceof THREE.Mesh&&o.material instanceof THREE.ShaderMaterial)assert.equal(o.material.uniforms.uCompositionProfile,undefined);});foreign.dispose();}
});
