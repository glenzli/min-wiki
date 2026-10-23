import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { advanceOceanPlayback, islandEpilogue, seabirdPose, SEABIRD_ENTRY_SPAN, ISLAND_ENDING_SECONDS, ISLAND_FISH_COUNT } from '../islandEpilogue.ts';
import { IslandEpilogue3D } from '../islandEpilogue3d.ts';
import { oceanGeometryFrame, surfaceHeight, WATER_Y } from '../geometry3d.ts';

test('only the supplied island ending gains six seconds, with frame-independent finite playback', () => {
  for (const environment of ['deep','shallow'] as const) {
    assert.equal(advanceOceanPlayback(.4,3.6,environment,'sustained'),.5);
  }
  assert.equal(advanceOceanPlayback(.4,3.6,'island','limited'),.5);
  assert.ok(Math.abs(advanceOceanPlayback(.2,3.6,'island','sustained')-.3)<1e-8);
  assert.equal(advanceOceanPlayback(.6,0,'island','sustained'),.6);
  assert.equal(advanceOceanPlayback(.6,NaN,'island','sustained'),.6);
  assert.equal(advanceOceanPlayback(1,2,'island','sustained'),1);
  for(const step of [.1,.04,.016]) {
    let p=0,elapsed=0;
    while(p<1&&elapsed<50){p=advanceOceanPlayback(p,step,'island','sustained');elapsed+=step;}
    assert.ok(Math.abs(elapsed-(36+ISLAND_ENDING_SECONDS))<step+.001);
  }
  const one=advanceOceanPlayback(.79,5,'island','sustained');
  const two=advanceOceanPlayback(advanceOceanPlayback(.79,2,'island','sustained'),3,'island','sustained');
  assert.ok(Math.abs(one-two)<1e-8,'crossing the ending boundary preserves accumulated time');
});

test('passing visitors need a cooled emerged island, not a population or an ecology selector', () => {
  for(const environment of ['deep','shallow','island'] as const) for(const supply of ['limited','sustained'] as const) {
    for(const p of [.08,.65,.80]) assert.equal(islandEpilogue(oceanGeometryFrame(p,environment,supply)).visible,false);
    const ending=islandEpilogue(oceanGeometryFrame(1,environment,supply));
    assert.equal(ending.visible,environment==='island'&&supply==='sustained');
  }
  const frame=oceanGeometryFrame(.87,'island','sustained');
  const first=islandEpilogue(frame,1.3);
  assert.ok(first.opacity>0&&first.opacity<1);
  assert.equal(first.fish.length,ISLAND_FISH_COUNT);
  islandEpilogue(oceanGeometryFrame(.4,'deep','sustained'),5);
  assert.deepEqual(islandEpilogue(frame,1.3),first,'seeking elsewhere cannot mutate this fixed set of visitors');
  assert.deepEqual(islandEpilogue(frame,0),islandEpilogue(frame,Math.PI*2),'phase wrap introduces no position or wing snap');
});

test('the actual retained animal meshes clear rock and stay on their respective side of the water', () => {
  const owner=new IslandEpilogue3D(),position=new THREE.Vector3();
  for(const p of [.84,.91,1]) {
    const frame=oceanGeometryFrame(p,'island','sustained');owner.draw(frame);
    for(let i=0;i<48;i++) {
      owner.updatePhase(i*Math.PI/24);owner.group.updateMatrixWorld(true);
      for(const animal of owner.group.children) animal.traverse(object=>{
        if(!(object instanceof THREE.Mesh))return;
        const vertices=object.geometry.getAttribute('position');
        for(let j=0;j<vertices.count;j++) {
          position.fromBufferAttribute(vertices,j).applyMatrix4(object.matrixWorld);
          assert.ok(position.y>surfaceHeight(frame,position.x,position.z)+.03,'all parts clear the actual island');
          assert.ok(animal.name==='passing-seabird'?position.y>WATER_Y+.7:position.y<WATER_Y-.1,
            'wings stay in air and fish remain submerged rather than drawn on top of the water');
        }
      });
    }
  }
  owner.dispose();
});

test('animals face along their paths and retain their small body sizes through movement', () => {
  const frame=oceanGeometryFrame(1,'island','sustained'),dt=1e-4;
  for(let phase=0;phase<Math.PI*2;phase+=.13) {
    const a=islandEpilogue(frame,phase),b=islandEpilogue(frame,phase+dt);
    for(const [index,pose] of [a.bird,...a.fish].entries()) {
      const next=[b.bird,...b.fish][index],dx=next.position[0]-pose.position[0],dz=next.position[2]-pose.position[2];
      assert.ok((dx*Math.cos(pose.heading)-dz*Math.sin(pose.heading))/Math.hypot(dx,dz)>.999);
    }
  }
});

test('one retained wildlife owner changes poses without spawning or borrowing GPU resources', () => {
  const owner=new IslandEpilogue3D();owner.draw(oceanGeometryFrame(1,'island','sustained'));
  const geometry=new Set<THREE.BufferGeometry>(),material=new Set<THREE.Material>();
  owner.group.traverse(o=>{if(o instanceof THREE.Mesh){geometry.add(o.geometry);material.add(o.material);}});
  const children=[...owner.group.children],matrices=children.map(o=>o.scale.toArray()),count={geometry:geometry.size,material:material.size};
  let releasedGeometry=0,releasedMaterial=0;
  for(const g of geometry)g.addEventListener('dispose',()=>releasedGeometry++);
  for(const m of material)m.addEventListener('dispose',()=>releasedMaterial++);
  for(let i=0;i<300;i++)owner.updatePhase(i*.027);
  assert.deepEqual(owner.group.children,children);assert.deepEqual(children.map(o=>o.scale.toArray()),matrices);
  owner.setCutaway(true);assert.equal(owner.active,false);assert.equal(owner.group.visible,false);
  owner.setCutaway(false);assert.equal(owner.active,true);assert.equal(owner.group.visible,true);
  owner.draw(oceanGeometryFrame(.4,'island','sustained'));assert.equal(owner.active,false);
  owner.draw(oceanGeometryFrame(1,'island','sustained'));assert.equal(owner.active,true);
  owner.dispose();owner.dispose();owner.updatePhase(2);
  assert.equal(owner.active,false);assert.equal(owner.group.children.length,0);
  assert.equal(releasedGeometry,count.geometry);assert.equal(releasedMaterial,count.material);
});

test('the entry curve meets the orbit with continuous position, tangent and forward orientation', () => {
  const start=2.4,entry:[number,number,number]=[-8,WATER_Y+2.65,2],h=1e-5;
  const end=seabirdPose(start+SEABIRD_ENTRY_SPAN);
  const before=seabirdPose(start+SEABIRD_ENTRY_SPAN-h,{entry,phase:start,age:SEABIRD_ENTRY_SPAN-h});
  const after=seabirdPose(start+SEABIRD_ENTRY_SPAN+h);
  assert.ok(Math.hypot(...before.position.map((v,i)=>v-end.position[i]))<h*4);
  const left=before.position.map((v,i)=>(end.position[i]-v)/h),right=after.position.map((v,i)=>(v-end.position[i])/h);
  assert.ok(Math.hypot(...left.map((v,i)=>v-right[i]))<.001);
  assert.ok(Math.abs(Math.sin(before.heading-end.heading))<.001);
  for(let age=0;age<SEABIRD_ENTRY_SPAN;age+=.02) {
    const p=seabirdPose(start+age,{entry,phase:start,age});
    const q=seabirdPose(start+age+h,{entry,phase:start,age:age+h});
    const dx=q.position[0]-p.position[0],dz=q.position[2]-p.position[2];
    assert.ok((dx*Math.cos(p.heading)-dz*Math.sin(p.heading))/Math.hypot(dx,dz)>.999);
  }
});

test('arrival starts outside the active camera, runs once across phase wrap and respects reduced motion', () => {
  const frame=oceanGeometryFrame(1,'island','sustained');
  const camera=new THREE.PerspectiveCamera(37,1099/796,.08,220);
  camera.position.set(2.44411,10.76927,8.77485);camera.lookAt(.00321,7.69437,.34265);camera.updateMatrixWorld();
  const owner=new IslandEpilogue3D();owner.draw(oceanGeometryFrame(.8,'island','sustained'),camera);
  owner.updatePhase(6.1);owner.draw(frame,camera);
  const initial=new THREE.Vector3(...owner.state!.bird.position).project(camera);
  assert.ok(initial.x < -1.1 && Math.abs(initial.y)<.4,'bird enters from beyond the left edge at the existing altitude');
  for(let i=1;i<=90;i++)owner.updatePhase((6.1+i*.025)%(Math.PI*2));
  const phase=(6.1+90*.025)%(Math.PI*2);
  assert.deepEqual(owner.state!.bird,seabirdPose(phase),'the first entry finishes on the original orbit');
  owner.updatePhase((phase+.02)%(Math.PI*2));owner.draw(frame,camera);
  assert.deepEqual(owner.state!.bird,seabirdPose((phase+.02)%(Math.PI*2)),'a draw or wrap cannot restart the entrance');
  owner.draw(oceanGeometryFrame(.8,'island','sustained'),camera);owner.draw(frame,camera);
  assert.ok(new THREE.Vector3(...owner.state!.bird.position).project(camera).x < -1.1,'replaying the ending admits a fresh entry');
  owner.setReducedMotion(true);
  assert.deepEqual(owner.state!.bird,seabirdPose((phase+.02)%(Math.PI*2)),'reduced motion leaves an observable static bird');
  owner.dispose();
});
