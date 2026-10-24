import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { advanceOceanPlayback, advanceVisit, createBirdVisit, createFishVisit, islandEpilogue, seabirdPose, passingFishPose,
  SEABIRD_ENTRY_SPAN, ISLAND_ENDING_SECONDS, ISLAND_FISH_COUNT, VISITOR_SEQUENCE_LENGTH } from '../islandEpilogue.ts';
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
  const dt=1e-4,bird=createBirdVisit(),fish=createFishVisit();
  for(let age=.01;age<bird.duration-dt;age+=.13) {
    const a=[seabirdPose(age,{...bird,age}),passingFishPose(age,{...fish,age},0)];
    const b=[seabirdPose(age+dt,{...bird,age:age+dt}),passingFishPose(age+dt,{...fish,age:age+dt},0)];
    for(const [index,pose] of a.entries()) {
      if(!pose.visible)continue;
      const next=b[index],dx=next.position[0]-pose.position[0],dz=next.position[2]-pose.position[2];
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

test('entry and exit meet the circling flight with continuous position and velocity', () => {
  const visit=createBirdVisit(),h=1e-5;
  for(const age of [SEABIRD_ENTRY_SPAN,SEABIRD_ENTRY_SPAN+visit.orbitSpan]) {
    const end=seabirdPose(1,{...visit,age});
    const before=seabirdPose(1,{...visit,age:age-h}),after=seabirdPose(1,{...visit,age:age+h});
    assert.ok(Math.hypot(...before.position.map((v,i)=>v-end.position[i]))<h*5);
    const left=before.position.map((v,i)=>(end.position[i]-v)/h),right=after.position.map((v,i)=>(v-end.position[i])/h);
    assert.ok(Math.hypot(...left.map((v,i)=>v-right[i]))<.001);
    assert.ok(Math.abs(Math.sin(before.heading-end.heading))<.001);
  }
});

test('birds and fish enter, leave, rest and return after playback ends without restarting on phase wrap', () => {
  const frame=oceanGeometryFrame(1,'island','sustained');
  const camera=new THREE.PerspectiveCamera(37,1099/796,.08,220);
  camera.position.set(2.44411,10.76927,8.77485);camera.lookAt(.00321,7.69437,.34265);camera.updateMatrixWorld();
  const owner=new IslandEpilogue3D();owner.draw(oceanGeometryFrame(.8,'island','sustained'),camera);
  owner.updatePhase(6.1);owner.draw(frame,camera);
  const initial=new THREE.Vector3(...owner.state!.bird.position).project(camera);
  assert.ok(initial.x < -1.2 && Math.abs(initial.y)<.4,'bird starts beyond the camera edge');
  let previous=owner.state!,birdAbsent=false,birdReturned=false,fishAbsent=false,fishReturned=false;
  const fishCounts=new Set<number>();
  for(let i=1;i<=1600;i++) {
    owner.updatePhase((6.1+i*.025)%(Math.PI*2));
    const next=owner.state!;fishCounts.add(next.fish.filter(f=>f.visible).length);
    if(!next.bird.visible)birdAbsent=true;else if(birdAbsent)birdReturned=true;
    if(next.fish.every(f=>!f.visible))fishAbsent=true;else if(fishAbsent)fishReturned=true;
    if(next.bird.visible&&previous.bird.visible)
      assert.ok(Math.hypot(...next.bird.position.map((v,j)=>v-previous.bird.position[j]))<.7,'no visible teleport at a wrapped phase');
    assert.equal(owner.active,true,'gaps cannot stop the scheduler and strand later visitors');
    previous=next;
  }
  assert.ok(birdAbsent&&birdReturned&&fishAbsent&&fishReturned);
  assert.ok(fishCounts.size>=3,'the passing shoal varies instead of always showing three synchronized fish');
  const retained=structuredClone(owner.state);owner.draw(frame,camera);
  assert.deepEqual(owner.state,retained,'drawing the same final geology cannot restart a visit');
  owner.draw(oceanGeometryFrame(.8,'island','sustained'),camera);owner.draw(frame,camera);
  assert.ok(new THREE.Vector3(...owner.state!.bird.position).project(camera).x < -1.2,'replaying the ending admits a fresh entry');
  owner.setReducedMotion(true);
  assert.ok(owner.state!.bird.visible&&owner.state!.fish.every(f=>f.visible),'reduced motion keeps representative animals on their routes');
  const staticState=structuredClone(owner.state);owner.updatePhase(2.1);assert.deepEqual(owner.state,staticState);
  owner.dispose();
});

test('visit timing stays bounded and reproducible, and varies routes and quiet gaps', () => {
  let bird=createBirdVisit(),fish=createFishVisit();
  const starts=new Set<number>(),counts=new Set<number>();
  for(let i=0;i<10000;i++) {
    bird=advanceVisit(bird,.31,createBirdVisit);fish=advanceVisit(fish,.31,createFishVisit);
    starts.add(bird.start);counts.add(fish.count);
    assert.ok(bird.age>=0&&bird.age<bird.duration+bird.gap);
    assert.ok(fish.age>=0&&fish.age<fish.duration+fish.gap);
    assert.ok(bird.index<VISITOR_SEQUENCE_LENGTH&&fish.index<VISITOR_SEQUENCE_LENGTH);
  }
  assert.ok(starts.size>20&&counts.size===3);
  const a=createBirdVisit(3),b=createBirdVisit(3);
  assert.deepEqual(a,b);assert.deepEqual(advanceVisit(a,1.7,createBirdVisit),advanceVisit(advanceVisit(b,.5,createBirdVisit),1.2,createBirdVisit));
});

test('camera-relative visits enter and retire outside the view, including later fish groups', () => {
  const frame=oceanGeometryFrame(1,'island','sustained');
  for(const distance of [6,18])for(const angle of [0,1.7,3.4]) {
    const camera=new THREE.PerspectiveCamera(37,1.5,.08,220);
    camera.position.set(Math.sin(angle)*distance,11,Math.cos(angle)*distance);camera.lookAt(0,7.7,0);camera.updateMatrixWorld();
    const owner=new IslandEpilogue3D();owner.draw(frame,camera);
    assert.ok(new THREE.Vector3(...owner.state!.bird.position).project(camera).x < -1.2);
    let previous=owner.state!;
    for(let step=1;step<=1600;step++) {
      owner.updatePhase((step*.025)%(Math.PI*2));const state=owner.state!;
      for(const [i,pose] of [state.bird,...state.fish].entries()) {
        const before=[previous.bird,...previous.fish][i];
        if(pose.visible!==before.visible) {
          const edge=new THREE.Vector3(...(pose.visible?pose:before).position).project(camera);
          assert.ok(Math.abs(edge.x)>1.05||Math.abs(edge.y)>1.05,'visibility can change only beyond the captured view');
        }
        if(pose.visible&&i>0)assert.ok(pose.position[1]<WATER_Y-.1&&pose.position[1]>surfaceHeight(frame,pose.position[0],pose.position[2])+.08);
      }
      previous=state;
    }
    owner.dispose();
  }
});
