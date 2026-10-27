import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import content from '../content.json';
import { AtmosphereStructureWorld } from '../structureScene.ts';
import { cloudSample, defaultPhenomena } from '../phenomenaModel.ts';
import type { MechanismFrame } from '../layerMechanism.ts';

const frame=(layer:number,step:number,progress=.8):MechanismFrame=>({layer,step,progress});
const options={...defaultPhenomena,detail:true};
function objects(world:AtmosphereStructureWorld){
  const get=(name:string)=>{const object=world.scene.getObjectByName(name);assert.ok(object,name);return object;};
  const clouds:THREE.Mesh<THREE.BoxGeometry,THREE.ShaderMaterial>[]=[];
  world.scene.traverse(object=>{if(object instanceof THREE.Mesh&&object.name==='illustrative-cumulus-volume')clouds.push(object);});
  return {get,clouds};
}

test('the same rising parcel forms its local cloud after waiting, seeking back and replaying, while background weather keeps its time',()=>{
  const world=new AtmosphereStructureWorld('earth'),{get,clouds}=objects(world);
  const parcel=get('reference-moist-parcel'),cloud=clouds[2],geometry=cloud.geometry,density=cloud.material.uniforms.uDensity.value;
  for(const seconds of [0,10,20,30,120]){
    world.update('weather',seconds,frame(0,2,1),3,options);
    assert.ok(parcel.position.distanceTo(cloud.position)<1e-12,`cloud left parcel at ${seconds}s`);
    assert.ok(cloud.visible&&cloud.material.uniforms.uOpacity.value>.5);
    const background=cloudSample('earth',0,seconds);
    assert.equal(clouds[0].position.x,background.x);
    assert.equal(clouds[0].position.y,background.y);
    const completed=cloud.position.clone();
    world.update('weather',seconds,frame(0,1,.4),3,options);
    assert.equal(cloud.visible,false);assert.ok(parcel.position.y<completed.y);
    world.update('weather',seconds,frame(0,2,1),3,options);
    assert.deepEqual(cloud.position,completed);assert.equal(cloud.geometry,geometry);assert.equal(cloud.material.uniforms.uDensity.value,density);
  }
  world.update('weather',30,frame(0,2),3,{...options,weather:'dry'});
  assert.equal(cloud.visible,false);assert.equal(parcel.visible,false);assert.equal(get('reference-drier-parcel').visible,true);
  world.update('weather',30,frame(0,2),3,{...options,clues:false});
  assert.equal(cloud.visible,false);assert.equal(parcel.visible,false);assert.equal(get('cloud-grown-rain').visible,true);
  world.dispose();
});

test('ozone steps visibly separate arrival, attenuation and local energy transfer, then air transport at a fixed scene time',()=>{
  const world=new AtmosphereStructureWorld('earth'),{get}=objects(world);
  const ray=get('attenuating-uv-ray-0') as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
  const heat=get('ozone-local-energy-transfer'),wind=get('stratosphere-horizontal-transport') as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
  const opacity=()=>Array.from(ray.geometry.getAttribute('aOpacity').array);
  const transport=()=>Math.max(...wind.geometry.getAttribute('aOpacity').array);
  world.update('ozone',10,frame(1,0),25,options);
  const entering=opacity();assert.equal(heat.visible,false);assert.equal(transport(),0);
  world.update('ozone',10,frame(1,1),25,options);
  const absorbed=opacity();assert.notDeepEqual(absorbed,entering);assert.equal(heat.visible,true);assert.equal(transport(),0);
  world.update('ozone',10,frame(1,2),25,options);
  assert.equal(heat.visible,true);assert.ok(transport()>0);
  world.update('ozone',10,frame(1,1),25,{...options,clues:false});
  assert.equal(get('ozone-absorption-rays').visible,false);assert.equal(heat.visible,false);assert.equal(wind.visible,false);
  world.dispose();
});

test('interpretation paths have real width and contrast above continuous air while remaining bounded non-glowing guides',()=>{
  const world=new AtmosphereStructureWorld('earth'),{get}=objects(world);
  let air:THREE.Mesh|undefined;world.scene.traverse(object=>{if(object instanceof THREE.Mesh&&object.material instanceof THREE.ShaderMaterial&&object.material.uniforms.uAir)air=object;});assert.ok(air);
  const guides=['attenuating-uv-ray-0','incoming-uv-direction-guides','ozone-local-energy-transfer','stratosphere-horizontal-transport','thermosphere-solar-energy-guide','thermosphere-particle-energy-guide'];
  world.update('ozone',10,frame(1,2),25,options);
  for(const name of guides){
    const guide=get(name) as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
    assert.ok(guide instanceof THREE.Mesh);assert.ok(guide.renderOrder>air.renderOrder);assert.equal(guide.material.depthWrite,false);assert.equal(guide.material.depthTest,true);assert.equal(guide.material.blending,THREE.NormalBlending);
    assert.ok(guide.geometry.getAttribute('aAcross'));assert.ok(guide.geometry.index);assert.ok(Array.from(guide.geometry.getAttribute('position').array).every(Number.isFinite));
  }
  const transport=get('stratosphere-horizontal-transport') as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
  assert.equal(transport.geometry.getAttribute('position').count,4*3*4,'keep four simple arrows rather than a dense tracer field');
  assert.ok(Math.max(...transport.geometry.getAttribute('aOpacity').array)>.8);
  world.update('ozone',10,frame(1,1),25,{...options,clues:false});
  for(const name of guides){let visible=true;for(let object:THREE.Object3D|null=get(name);object;object=object.parent)visible&&=object.visible;assert.equal(visible,false,`${name} remained after hiding explanations`);}
  world.dispose();
});

test('sunlight heating remains distinct from charged-particle arrival and conditional auroral emission',()=>{
  const world=new AtmosphereStructureWorld('earth'),{get}=objects(world);
  const solar=get('thermosphere-solar-energy-guide'),motion=get('thermosphere-particle-energy-guide');
  const sky=get('layer-sky-backdrop') as THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
  const aurora=get('folded-polar-aurora-0') as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>,input=get('enlarged-magnetic-particle-paths');
  for(const auroraInput of [true,false]){
    const selected={...options,aurora:auroraInput};
    world.update('aurora',10,frame(3,0),300,selected);
    assert.equal(sky.material.uniforms.uNight.value,0,'sunlight heating should use its own daylight example');
    assert.equal(solar.visible,true);assert.equal(motion.visible,false);assert.equal(input.visible,false);assert.equal(aurora.visible,false);
    world.update('aurora',10,frame(3,1),300,selected);
    assert.equal(solar.visible,false);assert.equal(motion.visible,true);assert.equal(get('thermal-motion-example-0').visible,true);assert.equal(aurora.visible,false);
    world.update('aurora',10,frame(3,1,1),300,selected);
    const heatedPosition=get('thermal-motion-example-0').position.clone();
    world.update('aurora',10,frame(3,2,.2),300,selected);
    assert.deepEqual(get('thermal-motion-example-0').position,heatedPosition,'starting the auroral example must not imply cooling the already heated gas');
    assert.equal(input.visible,auroraInput);assert.equal(aurora.visible,false,'emission precedes arrival');
    world.update('aurora',10,frame(3,2,.8),300,selected);
    assert.equal(sky.material.uniforms.uNight.value,1,'aurora uses a separate polar-night observation');
    assert.equal(input.visible,auroraInput);assert.equal(aurora.visible,auroraInput);assert.equal(aurora.material.uniforms.uTime.value,10);
  }
  world.update('aurora',10,frame(3,0),300,{...options,clues:false});
  assert.equal(solar.visible,false);assert.equal(motion.visible,false);assert.equal(input.visible,false);assert.equal(aurora.visible,true,'hiding explanatory guides must retain observable aurora');
  world.dispose();
});

test('energy guides do not leak across layers or foreign worlds and retained resources dispose once',()=>{
  const world=new AtmosphereStructureWorld('earth'),{get}=objects(world),resources=new Set<THREE.BufferGeometry|THREE.Material>();
  world.scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Line||object instanceof THREE.Points){resources.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])resources.add(material);}});
  const guideNames=['ozone-local-energy-transfer','stratosphere-horizontal-transport','thermosphere-solar-energy-guide','thermosphere-particle-energy-guide'];
  const bytes=world.resourceBytes;
  for(const selected of ['weather','meteor','escape'])for(const layer of [1,3]){
    world.update(selected,30,frame(layer,1),null,options);
    for(const name of guideNames)assert.equal(get(name).visible,false,`${name} leaked into ${selected}`);
  }
  assert.equal(world.resourceBytes,bytes);
  const disposed=new Map<object,number>();for(const resource of resources)resource.addEventListener('dispose',()=>disposed.set(resource,(disposed.get(resource)??0)+1));
  world.dispose();world.dispose();assert.equal(disposed.size,resources.size);assert.ok([...disposed.values()].every(count=>count===1));
  for(const name of ['venus','mars','titan','moon','mercury'] as const){const foreign=new AtmosphereStructureWorld(name);for(const guide of guideNames)assert.equal(foreign.scene.getObjectByName(guide),undefined);foreign.dispose();}
});

test('both languages carry step-matched visible/invisible energy and weather qualifications',()=>{
  for(const language of ['zh','en'] as const){
    const copy=content[language].structure.mechanismCues;
    for(const key of ['weather','ozone','thermosphere'] as const){assert.equal(copy[key].length,3);assert.ok(copy[key].every(step=>step.trim().length>0));}
    assert.ok(copy.label&&copy.dryWeather&&copy.noAurora);
  }
});
