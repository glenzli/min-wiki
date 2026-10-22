import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import content from '../content.json';
import { defaults, layerEdges, parseRoute, routeQuery, type World } from '../model.ts';
import { displayHeight, expandedHeight, expandedAltitude, structureProfiles, structureTerrain } from '../structureModel.ts';
import { AtmosphereStructureWorld } from '../structureScene.ts';
import { cloudExamples, cloudSample, defaultPhenomena, precipitationSource } from '../phenomenaModel.ts';

const allWorlds=Object.keys(structureProfiles) as World[];
test('worlds have independent named features; only Earth carries the five thermal layer indices',()=>{
 assert.deepEqual(structureProfiles.earth.features.map(f=>f.layer),[0,1,2,3,4]);
 assert.deepEqual(allWorlds.map(w=>structureProfiles[w].features.length),[5,4,4,4,2,2]);
 for(const world of allWorlds){
  const features=structureProfiles[world].features;
  assert.equal(new Set(features.map(f=>f.id)).size,features.length);
  if(world!=='earth')assert.ok(features.every(f=>f.layer===undefined));
  for(const f of features){
   for(const lang of ['zh','en'] as const){const words=content[lang].structure.features[f.id as keyof typeof content.zh.structure.features];assert.ok(words?.title&&words.body&&words.range);}
   assert.ok(f.height>=0&&f.height<=structureProfiles[world].top);
  }
 }
});
test('each expanded window is monotone, reversible and bounded without claiming equal thickness',()=>{
 for(const world of allWorlds){const top=structureProfiles[world].top;let previous=-1;
  for(let i=0;i<=100;i++){const km=i*top/100,y=expandedHeight(world,km);assert.ok(y>previous);assert.ok(Math.abs(expandedAltitude(world,y)-km)<1e-8);previous=y;}
  assert.equal(expandedHeight(world,Infinity),0);assert.ok(Math.abs(expandedHeight(world,top)-displayHeight(world))<1e-12);
 }
 assert.notEqual(expandedHeight('earth',70),expandedHeight('venus',70));
});
test('Earth gives every region readable depth with continuous boundaries while foreign height maps stay independent',()=>{
 for(let i=1;i<layerEdges.length;i++)assert.ok(expandedHeight('earth',layerEdges[i])-expandedHeight('earth',layerEdges[i-1])>=1.2);
 for(const edge of layerEdges.slice(1,-1)){
  const below=expandedHeight('earth',edge-1e-7),above=expandedHeight('earth',edge+1e-7);
  assert.ok(above>below&&above-below<1e-6);
  assert.ok(Math.abs(expandedAltitude('earth',expandedHeight('earth',edge))-edge)<1e-10);
 }
 assert.ok(expandedHeight('earth',22)-expandedHeight('earth',12)>.8);
 assert.ok(expandedHeight('earth',64)-expandedHeight('earth',32)>1.3);
 for(const world of allWorlds.filter(w=>w!=='earth'))for(const km of [0,11,50,85,structureProfiles[world].top]){
  assert.ok(Math.abs(expandedHeight(world,km)-4.65*Math.log1p(km)/Math.log1p(structureProfiles[world].top))<1e-12);
 }
});
test('continuous gas volume bounds enclose each expanded window, including the higher Earth column',()=>{
 for(const world of ['earth','venus','mars','titan'] as const){
  const model=new AtmosphereStructureWorld(world);let found=false;
  model.scene.traverse(o=>{if(o instanceof THREE.Mesh&&o.material instanceof THREE.ShaderMaterial&&o.material.uniforms.uAir){
   found=true;o.geometry.computeBoundingBox();const box=o.geometry.boundingBox!;
   assert.ok(box.min.y<0&&box.max.y>expandedHeight(world,structureProfiles[world].top));
   assert.equal(o.material.uniforms.uHeight.value,displayHeight(world));
   assert.ok(box.getSize(new THREE.Vector3()).distanceTo(o.material.uniforms.uBoxHalf.value.clone().multiplyScalar(2))<1e-6);
  }});assert.ok(found);model.dispose();
 }
});
test('retained terrain has closed topology, outward volume and bounded payload for every world',()=>{
 for(const world of allWorlds){
  const a=structureTerrain(world),b=structureTerrain(world);assert.deepEqual(a.positions,b.positions);
  const edgeCount=new Map<string,number>();let volume=0;
  for(let i=0;i<a.indices.length;i+=3){const ids=[a.indices[i],a.indices[i+1],a.indices[i+2]];
   for(let j=0;j<3;j++){const x=ids[j],y=ids[(j+1)%3],key=x<y?`${x}:${y}`:`${y}:${x}`;edgeCount.set(key,(edgeCount.get(key)??0)+1);}
   const [p,q,r]=ids.map(id=>new THREE.Vector3().fromArray(a.positions,id*3));volume+=p.dot(q.cross(r))/6;
  }
  assert.ok([...edgeCount.values()].every(count=>count===2));assert.ok(volume>10);
  assert.ok(a.positions.byteLength+a.uv.byteLength+a.indices.byteLength<300_000);
 }
});
test('new display choice round-trips while old height and parcel links retain the continuous journey',()=>{
 assert.equal(parseRoute('').display,'structure');
 assert.equal(parseRoute('?height=25').display,'journey');assert.equal(parseRoute('?view=motion&lift=3&p=1').display,'journey');
 for(const display of ['journey','structure'] as const){const s={...defaults,display,journey:.5};assert.deepEqual(parseRoute('?'+routeQuery(s)),s);}
});
test('near-vacuum scenes contain sparse particles and no continuous fog or cloud volume',()=>{
 for(const world of ['moon','mercury'] as const){const model=new AtmosphereStructureWorld(world);let air=0,clouds=0,points=0;
  model.scene.traverse(object=>{if(object instanceof THREE.Mesh){if(object.material instanceof THREE.ShaderMaterial&&object.material.uniforms.uAir)air++;if(object.name==='illustrative-cumulus-volume')clouds++;}if(object instanceof THREE.Points)points++;});
  assert.equal(air,0);assert.equal(clouds,0);assert.equal(points,1);model.dispose();
 }
});
test('cloud bodies inhabit their own world height mapping and do not receive Earth layer identities',()=>{
 for(const world of ['earth','venus','mars','titan'] as const){const model=new AtmosphereStructureWorld(world);const clouds:THREE.Mesh[]=[];
  model.scene.traverse(object=>{if(object instanceof THREE.Mesh&&object.name==='illustrative-cumulus-volume')clouds.push(object);});
  assert.equal(clouds.length,world==='earth'||world==='venus'?3:2);
  if(world==='venus')for(const cloud of clouds){assert.ok(cloud.position.y-cloud.scale.y/2>=expandedHeight(world,45));assert.ok(cloud.position.y+cloud.scale.y/2<=expandedHeight(world,70));}
  if(world==='mars')assert.ok(Math.abs(clouds[0].position.y-expandedHeight(world,22))<1e-10&&Math.abs(clouds[1].position.y-expandedHeight(world,70))<1e-10);
  model.dispose();
 }
});
test('activity and selection retain geometry, density textures and buffers rather than rebuilding worlds',()=>{
 const model=new AtmosphereStructureWorld('earth');const geometry=new Set<THREE.BufferGeometry>(),textures=new Set<THREE.Texture>();
 model.scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Points||object instanceof THREE.Line){geometry.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])if(material instanceof THREE.ShaderMaterial)for(const u of Object.values(material.uniforms))if(u.value instanceof THREE.Texture)textures.add(u.value);}});
 const arrays=[...geometry].map(g=>g.getAttribute('position').array);
 for(let i=0;i<100;i++)model.update(i%2?'ozone':'weather',i/10,{layer:0,step:2,progress:i/100},i*10);
 const after=new Set<THREE.BufferGeometry>();model.scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Points||object instanceof THREE.Line)after.add(object.geometry);});assert.deepEqual(after,geometry);
 assert.ok([...geometry].every((g,i)=>g.getAttribute('position').array===arrays[i]));assert.equal(textures.size,4);assert.ok(model.resourceBytes<1_020_000);model.dispose();
});
test('world cloud materials, transparency, wind and conditional illumination remain distinct',()=>{
 for(const world of ['venus','mars','titan'] as const){
  const model=new AtmosphereStructureWorld(world),clouds:THREE.Mesh<THREE.BoxGeometry,THREE.ShaderMaterial>[]=[];
  model.scene.traverse(object=>{if(object instanceof THREE.Mesh&&object.name==='illustrative-cumulus-volume')clouds.push(object);});
  const arrays=clouds.map(cloud=>cloud.geometry.getAttribute('position').array),textures=clouds.map(cloud=>cloud.material.uniforms.uDensity.value);
  if(world==='venus'){
   model.update('acid-cloud',2,null,null,defaultPhenomena);
   assert.ok(clouds.every(cloud=>cloud.userData.cloudShape==='layered'&&cloud.userData.cloudMaterial==='sulfuric-acid'));
   assert.ok(clouds.every(cloud=>cloud.scale.x/cloud.scale.y>14&&cloud.material.uniforms.uOpacity.value>.75));
  }else if(world==='mars'){
   model.update('water-ice',2,null,null,defaultPhenomena);assert.equal(clouds[0].visible,true);assert.equal(clouds[1].visible,false);
   assert.equal(clouds[0].userData.cloudMaterial,'water-ice');assert.equal(clouds[1].userData.cloudMaterial,'carbon-dioxide-ice');
   const sunlight=model.scene.getObjectByName('world-sunlight') as THREE.DirectionalLight,daylight=sunlight.intensity;
   model.update('co2-ice',2,null,null,defaultPhenomena);assert.equal(clouds[0].visible,false);assert.equal(clouds[1].visible,true);assert.ok(sunlight.intensity<daylight*.1);
   const sky=model.scene.getObjectByName('layer-sky-backdrop') as THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;assert.ok(sky.material.uniforms.uNight.value>.9);
   assert.ok(cloudSample('mars',0,4).x>cloudSample('mars',0,2).x&&cloudSample('mars',1,4).x<cloudSample('mars',1,2).x);
   model.update('dust',2,null,null,{...defaultPhenomena,clues:false});assert.ok(clouds.every(cloud=>!cloud.visible));assert.equal(model.scene.getObjectByName('wind-carried-martian-dust')!.visible,true);assert.equal(sunlight.intensity,daylight);
  }else{
   model.update('methane-cloud',2,null,null,{...defaultPhenomena,detail:true});
   assert.ok(clouds.every(cloud=>cloud.userData.cloudMaterial==='methane'&&cloud.userData.cloudShape==='cumulus'));
   assert.ok(clouds[0].scale.y>.7&&clouds[0].material.uniforms.uOpacity.value>.8);
   const source=precipitationSource('titan',2);assert.ok(Math.abs((source.y-clouds[0].position.y)/clouds[0].scale.y+.279)<1e-12);
   model.update('organic-haze',4,null,null,{...defaultPhenomena,detail:true});assert.ok(clouds.every(cloud=>!cloud.visible));
   assert.equal(model.scene.getObjectByName('occasional-methane-rain')!.visible,false);
  }
  for(let i=0;i<clouds.length;i++){assert.equal(clouds[i].geometry.getAttribute('position').array,arrays[i]);assert.equal(clouds[i].material.uniforms.uDensity.value,textures[i]);assert.deepEqual(clouds[i].scale.toArray(),cloudExamples[world][i].scale);}
  model.dispose();
 }
});
test('resource accounting includes finite cloud textures and box buffers without calling it total GPU memory',()=>{
 for(const world of allWorlds){
  const model=new AtmosphereStructureWorld(world),geometries=new Set<THREE.BufferGeometry>(),textures=new Set<THREE.Texture>();let instances=0,sparseCopy=0;
  model.scene.traverse(object=>{
   if(object instanceof THREE.Mesh||object instanceof THREE.Points||object instanceof THREE.Line){
    geometries.add(object.geometry);
    if(object instanceof THREE.Points&&(object.name==='enlarged-sparse-gas-markers'||object.name==='wind-carried-martian-dust'))sparseCopy=object.geometry.getAttribute('position').array.byteLength;
   }
   if(object instanceof THREE.InstancedMesh)instances+=object.instanceMatrix.array.byteLength+(object.instanceColor?.array.byteLength??0);
   if(object instanceof THREE.Mesh||object instanceof THREE.Points||object instanceof THREE.Line||object instanceof THREE.Sprite)for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if('map'in material&&material.map instanceof THREE.Texture)textures.add(material.map);
    if(material instanceof THREE.ShaderMaterial)for(const uniform of Object.values(material.uniforms))if(uniform.value instanceof THREE.Texture)textures.add(uniform.value);
   }
  });
  let payload=instances+sparseCopy;
  for(const geometry of geometries){for(const attribute of Object.values(geometry.attributes))payload+=attribute.array.byteLength;payload+=geometry.index?.array.byteLength??0;}
  for(const texture of textures)payload+=(texture.image.data as ArrayBufferView).byteLength;
  assert.equal(model.resourceBytes,payload);assert.ok(payload<(world==='earth'?1_020_000:world==='venus'?710_000:560_000));
  model.dispose();
 }
});
test('all owned geometry, materials and cloud density textures are disposed exactly once',()=>{
 const model=new AtmosphereStructureWorld('earth'),resources=new Set<THREE.BufferGeometry|THREE.Material|THREE.Texture>();
 model.scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Points||object instanceof THREE.Line){resources.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){resources.add(material);if(material instanceof THREE.ShaderMaterial)for(const uniform of Object.values(material.uniforms))if(uniform.value instanceof THREE.Texture)resources.add(uniform.value);}}});
 const count=new Map<object,number>();for(const resource of resources)resource.addEventListener('dispose',()=>count.set(resource,(count.get(resource)??0)+1));model.dispose();model.dispose();assert.equal(count.size,resources.size);assert.ok([...count.values()].every(n=>n===1));assert.equal(model.scene.children.length,0);
});
test('3D causal steps retain the same moving objects and restore their positions on seeking',()=>{
 const model=new AtmosphereStructureWorld('earth');
 const parcel=model.scene.getObjectByName('reference-moist-parcel')!,rays=model.scene.getObjectByName('ozone-absorption-rays')!;
 model.update('weather',0,{layer:0,step:0,progress:0},3);const base=parcel.position.y;
 model.update('weather',0,{layer:0,step:1,progress:1},3);assert.ok(parcel.position.y>base);assert.ok(parcel.scale.x>1);assert.equal(rays.visible,false);
 model.update('ozone',0,{layer:1,step:1,progress:.5},25);assert.equal(rays.visible,true);assert.equal(parcel.visible,false);
 const meteor=model.scene.getObjectByName('retained-meteoroid')!,trail=model.scene.getObjectByName('meteor-emission-trail') as THREE.Mesh;
 model.update('meteor',0,{layer:2,step:1,progress:.3},65);const first=meteor.position.clone(),count=trail.geometry.drawRange.count;
 model.update('meteor',0,{layer:2,step:1,progress:.8},65);assert.ok(meteor.position.distanceTo(first)>.1);assert.ok(trail.geometry.drawRange.count>count);
 model.update('meteor',0,{layer:2,step:1,progress:.3},65);assert.deepEqual(meteor.position,first);
 model.update('escape',0,{layer:4,step:1,progress:1},850);const retained=model.scene.getObjectByName('illustrative-retained-particle')!,end=retained.position.clone();
 model.update('escape',0,{layer:4,step:2,progress:.6},850);assert.deepEqual(retained.position,end);assert.equal(model.scene.getObjectByName('illustrative-escaping-particle')!.visible,true);model.dispose();
});
