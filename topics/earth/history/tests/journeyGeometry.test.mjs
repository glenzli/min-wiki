import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HISTORY_OBSERVATION_HOLD, HISTORY_STATIONS, journeyFrame } from '../journeyModel.ts';
import { createHistoryJourneyGeometry, createHistoryCoastGeometry, floodedHistoryTriangle, historyCutFaceGeometry, historyLocalBed, historyLocalFocusTarget, historySurfaceField, historyNoise3, historyThermalField, historyEarlyRelief, historyLunarImpact, HISTORY_LOCAL_WATER, HISTORY_LOCAL_EXTENT, HISTORY_PLANET_RADIUS } from '../journeyGeometry.ts';
import { HISTORY_LOCAL_CAMERA, historyCameraOffset } from '../journeyScene3d.ts';

const triangleArea = (a,b,c) => b.clone().sub(a).cross(c.clone().sub(a)).length()/2;
const frames = HISTORY_STATIONS.map(s => journeyFrame(s.ageMa,s.id));

test('object-bound multiscale fields are finite, repeatable and continuous at the spherical seam', () => {
  for(let i=0;i<=40;i++) {
    const latitude=-Math.PI/2+i*Math.PI/40,x=-Math.cos(latitude),y=Math.sin(latitude);
    assert.equal(historySurfaceField(x,y,0),historySurfaceField(x,y,-0));
    const v=historySurfaceField(x,y,0);assert.ok(Number.isFinite(v)&&v>=-.9&&v<=.9);
    const n=historyNoise3(x*17,y*17,0);assert.ok(n>=0&&n<=1);
    assert.ok(Math.abs(historySurfaceField(x,y,.00001)-v)<.001);
  }
});

test('the curved example has a submerged bed and exact radial water level without water over high land', () => {
  for(const compact of [true,false]) {
    const coast=createHistoryCoastGeometry(compact), p=coast.water.getAttribute('position');
    assert.equal(Math.max(...coast.samples.map(p=>p.x)),HISTORY_LOCAL_EXTENT);
    assert.equal(Math.min(...coast.samples.map(p=>p.x)),-HISTORY_LOCAL_EXTENT);
    assert.ok(p.count>100);
    for(let i=0;i<p.count;i++) {
      const v=new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i));
      assert.ok(Math.abs(v.length()-HISTORY_PLANET_RADIUS-HISTORY_LOCAL_WATER)<2e-7);
      const x=v.x/v.z/.67,y=v.y/v.z/.67;
      assert.ok(historyLocalBed(x,y)<=HISTORY_LOCAL_WATER+.0015);
    }
    for(let i=0;i<=20;i++)for(let j=0;j<=20;j++)assert.ok(historyLocalBed(-1+i/10,-.76+j*.076)>0,'solid bed stays above the retained underlying sphere');
    for(const g of [coast.bed,coast.skirt,coast.water])g.dispose();
  }
  const clipped=floodedHistoryTriangle([{x:0,y:0,h:0},{x:1,y:0,h:2},{x:0,y:1,h:0}],1);
  assert.equal(clipped.length,4);assert.ok(clipped.every(v=>v.h<=1));
  assert.equal(clipped.filter(v=>v.h===1).length,2);
  const onEdge=floodedHistoryTriangle([{x:0,y:0,h:1},{x:1,y:0,h:2},{x:0,y:1,h:0}],1);
  assert.equal(new Set(onEdge.map(p=>`${p.x}:${p.y}`)).size,onEdge.length);
});

test('the default local illustration fills foreground without exposing a cut tile or underlying globe',()=>{
  const asset=createHistoryJourneyGeometry(true),identity=asset.earth.uuid,site=asset.site;
  asset.update(frames[3],'local');asset.group.updateMatrixWorld(true);
  assert.equal(asset.earth.visible,false);
  assert.equal(asset.group.getObjectByName('history-bed-cut-edge').visible,false);
  const bed=asset.group.getObjectByName('history-contact-bed'),water=asset.group.getObjectByName('history-water-meets-bed');
  const target=historyLocalFocusTarget(),ray=new THREE.Raycaster();
  for(const aspect of [1994/630,350/420]){
    const camera=new THREE.PerspectiveCamera(34,aspect,.03,250);
    camera.position.copy(target).add(historyCameraOffset(HISTORY_LOCAL_CAMERA));camera.lookAt(target);camera.updateMatrixWorld(true);
    for(const x of [-.7,0,.7]){
      ray.setFromCamera(new THREE.Vector2(x,-.7),camera);
      assert.ok(ray.intersectObjects([bed,water]).length>0,`foreground contact surface fills ${aspect}:${x}`);
    }
  }
  asset.update(frames[3],'globe');assert.equal(asset.earth.visible,true);assert.equal(asset.earth.uuid,identity);assert.equal(asset.site,site);
  asset.update(frames[3],'local');assert.equal(asset.earth.uuid,identity);assert.equal(asset.site,site);
  asset.dispose();
});

test('cut faces are solid nondegenerate fans or annuli in one radius convention',()=>{
  for(const [inside,outside]of[[0,.61],[.61,1.25],[1.25,HISTORY_PLANET_RADIUS]])for(const angle of [0,Math.PI/2]){
    const g=historyCutFaceGeometry(inside,outside,angle,40),p=g.getAttribute('position'),index=g.getIndex();
    const uv=g.getAttribute('uv');assert.equal(uv.count,p.count);assert.ok([...uv.array].every(Number.isFinite));
    assert.ok(Math.max(...uv.array)-Math.min(...uv.array)>.1,'cut materials have a nonconstant surface coordinate');
    for(let i=0;i<index.count;i+=3){
      const v=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index.getX(i+j)));
      assert.ok(triangleArea(...v)>1e-8);
      for(const point of v)assert.ok(point.length()>=inside-1e-6&&point.length()<=outside+1e-6);
    }g.dispose();
  }
});

test('all phases and lenses retain one Earth and fixed allocations; core and modern map stay scoped',()=>{
  const asset=createHistoryJourneyGeometry(true),earth=asset.earth,identity=earth.uuid;
  const objectIds=[];asset.group.traverse(o=>objectIds.push(o.uuid));
  const resourceCount=[asset.resources.geometries.size,asset.resources.materials.size,asset.resources.textures.size];
  for(const frame of frames)for(const lens of ['globe','local','evidence']){
    asset.update(frame,lens);assert.equal(asset.earth,earth);assert.equal(asset.earth.uuid,identity);
    assert.equal(asset.group.visible,lens!=='evidence');
    assert.equal(asset.group.getObjectByName('history-explicit-differentiation-cut').visible,lens==='local'&&frame.mode==='differentiation');
    assert.deepEqual([asset.resources.geometries.size,asset.resources.materials.size,asset.resources.textures.size],resourceCount);
    const currentIds=[];asset.group.traverse(o=>currentIds.push(o.uuid));assert.deepEqual(currentIds,objectIds);
  }
  const map=new THREE.Texture();asset.setModernTexture(map);
  asset.update(frames.at(-1),'globe');assert.equal(asset.earth.material.map,map);
  asset.update(frames[3],'globe');assert.equal(asset.earth.material.map,null);
  const a=frames[4];asset.update({...a,progress:.2},'local');
  const state=asset.earth.geometry.getAttribute('color').array.slice();asset.update({...frames[10],progress:.8},'local');asset.update({...a,progress:.2},'local');
  assert.deepEqual(asset.earth.geometry.getAttribute('color').array,state);
  const differentiation=frames[1];asset.update({...differentiation,progress:0},'local');
  const starts=Array.from({length:10},(_,i)=>asset.group.getObjectByName(`history-inward-metal-${i}`).position.clone());
  asset.update({...differentiation,progress:HISTORY_OBSERVATION_HOLD},'local');
  for(let i=0;i<10;i++)assert.ok(asset.group.getObjectByName(`history-inward-metal-${i}`).position.length()<.61);
  asset.update({...differentiation,progress:0},'local');
  for(let i=0;i<10;i++)assert.deepEqual(asset.group.getObjectByName(`history-inward-metal-${i}`).position,starts[i]);
  asset.update({...frames[0],progress:0},'globe');assert.equal(asset.planet.scale.x,.9);
  const initialRockPose=asset.resources.instances[0].instanceMatrix.array.slice();
  asset.update({...frames[0],progress:HISTORY_OBSERVATION_HOLD},'globe');assert.equal(asset.planet.scale.x,1);
  asset.update({...frames[0],progress:0},'globe');assert.deepEqual(asset.resources.instances[0].instanceMatrix.array,initialRockPose);
  assert.deepEqual(asset.resources.instances.map(o=>o.count),[48,128,64]);
  asset.dispose();map.dispose();
});

test('owned mesh data are finite and bounded; teardown releases each unique geometry and material once',()=>{
  for(const compact of [true,false]){
    const asset=createHistoryJourneyGeometry(compact);asset.update(frames[4],'local');
    let triangles=0;
    for(const g of asset.resources.geometries){
      const p=g.getAttribute('position');assert.ok([...p.array].every(Number.isFinite));
      const normal=g.getAttribute('normal');if(normal)assert.ok([...normal.array].every(Number.isFinite));
      triangles+=(g.index?.count??p.count)/3;
    }
    assert.ok(triangles<(compact?60000:120000),`${compact}:${triangles}`);
    let gd=0,md=0,td=0,id=0;for(const g of asset.resources.geometries)g.addEventListener('dispose',()=>gd++);for(const m of asset.resources.materials)m.addEventListener('dispose',()=>md++);
    assert.equal(asset.resources.textures.size,7);for(const t of asset.resources.textures.values()){
      assert.ok(t.image.data.length<=(compact?512*256:1024*512)*4);t.addEventListener('dispose',()=>td++);
      if(t.name.startsWith('history-authored-spherical'))for(let row=0;row<t.image.height;row++)for(let channel=0;channel<4;channel++){
        const left=t.image.data[(row*t.image.width)*4+channel],right=t.image.data[(row*t.image.width+t.image.width-1)*4+channel];
        assert.ok(Math.abs(left-right)<=1,`${t.name}: continuous longitude seam`);
      }
    }
    for(const o of asset.resources.instances)o.addEventListener('dispose',()=>id++);
    const parent=new THREE.Group();parent.add(asset.group);asset.dispose();asset.dispose();
    assert.equal(parent.children.length,0);assert.equal(gd,asset.resources.geometries.size);assert.equal(md,asset.resources.materials.size);
    assert.equal(td,7);assert.equal(id,3);
  }
  for(const input of [{azimuth:370,elevation:95,distance:99},{azimuth:-45,elevation:-90,distance:0},{azimuth:NaN,elevation:NaN,distance:Infinity}]){
    const v=historyCameraOffset(input);assert.ok(v.toArray().every(Number.isFinite));assert.ok(v.length()>=2.6-1e-6&&v.length()<=12+1e-6);
  }
});

test('early rock relief follows the same fixed thermal field across the spherical seam',()=>{
  const asset=createHistoryJourneyGeometry(true);asset.update(frames[0],'globe');
  const p=asset.earth.geometry.getAttribute('position');
  let low=Infinity,high=-Infinity;
  for(let i=0;i<p.count;i+=7){
    const v=new THREE.Vector3().fromBufferAttribute(p,i),r=v.length();v.normalize();
    assert.ok(Math.abs(r-HISTORY_PLANET_RADIUS-historyEarlyRelief(v.x,v.y,v.z))<2e-6);
    const hot=historyThermalField(v.x,v.y,v.z);assert.ok(hot>=0&&hot<=1);
    low=Math.min(low,r);high=Math.max(high,r);
  }
  assert.ok(high-low>.02,'cooled rafts have real relief above exposed melt');
  for(let i=0;i<25;i++){
    const lat=-Math.PI/2+i*Math.PI/24,x=Math.cos(lat),y=Math.sin(lat);
    assert.ok(Math.abs(historyThermalField(x,y,0)-historyThermalField(x,y,-.000001))<.0002);
  }
  asset.dispose();
});

test('lunar debris follows visible contact and the lunar aggregate forms later; reversal retains identities',()=>{
  const asset=createHistoryJourneyGeometry(true),f=frames[2],impact=historyLunarImpact(0);
  const debris=asset.group.getObjectByName('history-hypothesized-debris-disc'),moon=asset.group.getObjectByName('history-retained-moon');
  const ejecta=asset.group.getObjectByName('history-post-contact-spatial-ejecta');
  for(const motion of [0,impact.contact-.005]){
    asset.update({...f,progress:motion*HISTORY_OBSERVATION_HOLD},'globe');
    assert.equal(debris.visible,false);assert.equal(moon.visible,false);assert.equal(ejecta.visible,false);
    assert.ok(historyLunarImpact(motion).position.length()>HISTORY_PLANET_RADIUS+.4);
  }
  asset.update({...f,progress:(impact.contact+.1)*HISTORY_OBSERVATION_HOLD},'globe');assert.equal(debris.visible,true);assert.equal(moon.visible,false);assert.equal(ejecta.visible,true);
  const ejectaPose=ejecta.instanceMatrix.array.slice();
  asset.update({...f,progress:.9*HISTORY_OBSERVATION_HOLD},'globe');assert.equal(moon.visible,true);
  asset.update({...f,progress:0},'globe');assert.equal(debris.visible,false);assert.equal(moon.visible,false);
  asset.update({...f,progress:(impact.contact+.1)*HISTORY_OBSERVATION_HOLD},'globe');assert.deepEqual(ejecta.instanceMatrix.array,ejectaPose);
  asset.update({...frames[1],progress:0},'local');const core=asset.group.getObjectByName('history-growing-metal-rich-region'),start=core.scale.x;
  asset.update({...frames[1],progress:HISTORY_OBSERVATION_HOLD},'local');assert.ok(core.scale.x>start);
  asset.update({...frames[1],progress:0},'local');assert.equal(core.scale.x,start);
  asset.dispose();
});

test('brief crisis and lunar examples never leak through their multi-million-year representative interval',()=>{
  const asset=createHistoryJourneyGeometry(true);
  for(const [id,age,name]of[['moon',4500,'history-hypothetical-impact-body'],['permian',252,'history-volcanic-proxy'],['cretaceous',66,'history-impact-site-proxy']]){
    const frame=journeyFrame(age,id);asset.update({...frame,progress:.3*HISTORY_OBSERVATION_HOLD},id==='moon'?'globe':'local');
    assert.equal(asset.group.getObjectByName(name).visible,true);
    asset.update({...frame,ageMa:age-.01,progress:.3},id==='moon'?'globe':'local');
    assert.equal(asset.group.getObjectByName(name).visible,false);
  }
  for(const frame of frames.slice(3)){asset.update(frame,'globe');assert.equal(asset.earth.material.emissiveIntensity,0);}
  asset.dispose();
});

test('high resolution material fields are adopted once and disposed with their original owner',()=>{
  const asset=createHistoryJourneyGeometry(true),field=new THREE.Texture(),detail=new THREE.Texture();
  const counts=[asset.resources.geometries.size,asset.resources.materials.size,asset.resources.textures.size];
  let fieldDisposals=0,detailDisposals=0;field.addEventListener('dispose',()=>fieldDisposals++);detail.addEventListener('dispose',()=>detailDisposals++);
  assert.equal(asset.setFieldTextures(field,detail),true);
  assert.deepEqual([asset.resources.geometries.size,asset.resources.materials.size,asset.resources.textures.size],[counts[0],counts[1],counts[2]+2]);
  assert.equal(asset.setFieldTextures(field,detail),false);
  asset.update(frames[0],'globe');asset.update(frames[3],'local');asset.dispose();asset.dispose();
  assert.equal(fieldDisposals,1);assert.equal(detailDisposals,1);
  assert.equal(asset.setFieldTextures(field,detail),false,'late texture completion cannot revive disposed geometry');
});
