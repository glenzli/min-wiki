import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Group,Vector3} from 'three';
import {createHistoryMicroScene} from '../microScene.ts';
const kinds=['meteorite','zircon','microbial','iron','fossil','till','forest','impact','modern'];
const frame=(kind,progress=.5,stationId='cambrian')=>({ageMa:2400,eventId:'oxygen',stationId,stationIndex:5,progress,journeyFraction:.5,mode:'oxygen',cues:{core:1,melt:0,ocean:1,land:.5,ice:0,haze:0,vegetation:0,impact:0},evidenceKind:kind});
function resources(group){const geometries=new Set(),materials=new Set();group.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of [].concat(object.material??[]))materials.add(material);});return{geometries,materials};}
function snapshot(group){const poses=[];group.traverse(object=>{poses.push([object.uuid,object.visible,...object.position.toArray(),...object.scale.toArray(),object.material?.uuid]);});return poses;}

test('micro evidence uses bounded finite volumes and a single retained identity set in either detail tier',()=>{
 for(const compact of [false,true]){
  const scene=createHistoryMicroScene({compact}),initial=resources(scene.group),identities=[];scene.group.traverse(object=>identities.push(object.uuid));
  // Both fixed iron materials are prebuilt; selecting one need not keep the
  // other attached to a mesh. Record that finite pool before repeated updates.
  scene.update(frame('iron',1));for(const paint of resources(scene.group).materials)initial.materials.add(paint);
  assert.equal(scene.group.name,'history-micro-evidence');assert.equal(scene.group.userData.measuredScale,false);
  for(const geometry of initial.geometries){
   const positions=geometry.getAttribute('position');assert.ok(positions?.count>0);
   for(const value of positions.array)assert.ok(Number.isFinite(value));
   geometry.computeBoundingBox();assert.ok(!geometry.boundingBox.isEmpty());
  }
  for(const kind of kinds){
   scene.update(frame(kind,.67));assert.deepEqual(scene.group.children.filter(child=>child.userData.evidenceKind&&child.visible).map(child=>child.userData.evidenceKind),[kind]);
   const box=new Box3().setFromObject(scene.group),size=box.getSize(new Vector3());assert.ok(Math.max(...size.toArray())<=3,`${kind} display bounds ${size.toArray()}`);
  }
  const finalIdentities=[];scene.group.traverse(object=>finalIdentities.push(object.uuid));assert.deepEqual(finalIdentities,identities);
  const after=resources(scene.group);assert.deepEqual(after.geometries,initial.geometries);assert.ok([...after.materials].every(paint=>initial.materials.has(paint)));
  scene.dispose();
 }
});

test('supplied iron phase is reversible, retains all source batches and does not advance while another family is selected',()=>{
 const scene=createHistoryMicroScene({compact:true});scene.update(frame('iron',.61));const before=snapshot(scene.group);
 scene.update(frame('iron',1));scene.update(frame('iron',0));scene.update(frame('iron',.61));assert.deepEqual(snapshot(scene.group),before);
 const iron=scene.group.getObjectByName('evidence-iron'),tags=[];iron.traverse(object=>{if(object.name.startsWith('iron-source-batch-'))tags.push(object);});assert.equal(tags.length,18);
 const positions=tags.map(object=>object.position.toArray());scene.update(frame('zircon',.95));assert.deepEqual(tags.map(object=>object.position.toArray()),positions);
 scene.update(frame('iron',NaN));assert.equal(scene.group.userData.progress,0);scene.dispose();
});

test('fossil cases preserve distinct records, and disposal detaches before releasing each owned resource once',()=>{
 const parent=new Group(),scene=createHistoryMicroScene({compact:true});parent.add(scene.group);
 scene.update(frame('fossil',.5,'cambrian'));assert.equal(scene.group.getObjectByName('bilateral-soft-body-impression').parent.visible,true);
 scene.update(frame('fossil',.5,'permian'));assert.equal(scene.group.getObjectByName('bilateral-soft-body-impression').parent.visible,false);assert.equal(scene.group.getObjectByName('marine-shell-record-example').parent.visible,true);
 const owned=resources(scene.group),counts=new Map();scene.update(frame('iron',1));for(const paint of resources(scene.group).materials)owned.materials.add(paint);scene.update(frame('fossil',.5,'permian'));
 for(const item of [...owned.geometries,...owned.materials])item.addEventListener('dispose',()=>{assert.equal(scene.group.parent,null);counts.set(item,(counts.get(item)??0)+1);});
 scene.dispose();scene.dispose();assert.equal(parent.children.length,0);assert.equal(scene.group.children.length,0);assert.equal(counts.size,owned.geometries.size+owned.materials.size);assert.ok([...counts.values()].every(count=>count===1));
 scene.update(frame('iron',.5));assert.equal(scene.group.children.length,0);
});

test('laminae share actual contact vertices and the fossil is a recessed solid surface',()=>{
 const scene=createHistoryMicroScene({compact:true});
 const points=mesh=>{const p=mesh.geometry.getAttribute('position'),set=new Set();for(let i=0;i<p.count;i++)set.add([p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(6)).join(','));return set;};
 for(let i=0;i<6;i++){
  const a=points(scene.group.getObjectByName(`mat-lamina-${i}`)),b=points(scene.group.getObjectByName(`mat-lamina-${i+1}`));
  assert.ok([...a].filter(point=>b.has(point)).length>=100,`mat contact ${i}`);
 }
 for(let i=0;i<5;i++){
  const a=points(scene.group.getObjectByName(`existing-iron-band-${i}`)),b=points(scene.group.getObjectByName(`existing-iron-band-${i+1}`));
  assert.ok([...a].filter(point=>b.has(point)).length>=40,`iron contact ${i}`);
 }
 const fossil=scene.group.getObjectByName('bilateral-soft-body-impression'),p=fossil.geometry.getAttribute('position'),front=[];
 for(let i=0;i<p.count;i++)if(p.getZ(i)>0)front.push(p.getZ(i));
 assert.ok(Math.max(...front)-Math.min(...front)>.035);assert.ok(fossil.geometry.getIndex().count>0);
 scene.dispose();
});
