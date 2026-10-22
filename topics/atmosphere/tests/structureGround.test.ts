import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { World } from '../model.ts';
import { structureGround, structureProfiles, structureTerrain } from '../structureModel.ts';
import { StructureGround3D } from '../structureGround3d.ts';

const worlds=Object.keys(structureProfiles) as World[];

function bodyOf(model:StructureGround3D) {
  const body=model.group.getObjectByName('structure-ground-body');
  assert.ok(body instanceof THREE.Mesh);
  return body as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
}

// Read the actual production triangle surface, including its interpolation.
// This catches details placed against an unrelated procedural height field.
function meshHeight(body:THREE.Mesh<THREE.BufferGeometry>,x:number,z:number) {
  const positions=body.geometry.getAttribute('position');
  const gx=Math.max(0,Math.min(95.999999,(x/8.4+.5)*96));
  const gz=Math.max(0,Math.min(47.999999,(z/4.2+.5)*48));
  const i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j,a=j*97+i;
  const ha=positions.getY(a),hb=positions.getY(a+1),hc=positions.getY(a+97),hd=positions.getY(a+98);
  return u+v<=1?ha*(1-u-v)+hb*u+hc*v:hb*(1-v)+hc*(1-u)+hd*(u+v-1);
}

function resources(model:StructureGround3D) {
  const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),instances=new Set<THREE.InstancedMesh>();
  model.group.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    geometry.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);
    if(object instanceof THREE.InstancedMesh)instances.add(object);
  });
  return {geometry,materials,instances};
}

test('production ground is closed, outward and finite, with finite unit normals for every world',()=>{
  for(const world of worlds) {
    const model=new StructureGround3D(world),body=bodyOf(model),position=body.geometry.getAttribute('position'),normal=body.geometry.getAttribute('normal'),index=body.geometry.index!;
    const edges=new Map<string,number>();let volume=0;
    for(let i=0;i<position.count;i++) {
      assert.ok(Number.isFinite(position.getX(i))&&Number.isFinite(position.getY(i))&&Number.isFinite(position.getZ(i)));
      assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(normal,i).length()-1)<1e-5);
    }
    for(let i=0;i<index.count;i+=3) {
      const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
      for(let j=0;j<3;j++) {const a=ids[j],b=ids[(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)??0)+1);}
      const [a,b,c]=ids.map(id=>new THREE.Vector3().fromBufferAttribute(position,id));volume+=a.dot(b.cross(c))/6;
    }
    assert.ok([...edges.values()].every(n=>n===2));assert.ok(volume>10);
    for(let j=0;j<=48;j++)for(let i=0;i<=96;i++) {
      const n=j*97+i,x=position.getX(n),z=position.getZ(n);
      assert.ok(Math.abs(position.getY(n)-structureGround(world,x,z))<2e-6);
    }
    model.dispose();
  }
});

test('visible sea and lake surfaces share the terrain contact used by rain, with separate land relief',()=>{
  for(const world of ['earth','titan'] as const) {
    const model=new StructureGround3D(world),body=bodyOf(model);
    for(const [x,z]of [[-1.45,-.2],[-1.3,.3],[-1.7,.5]]) {
      const visible=structureGround(world,x,z),water=-.024*x*x-.014*z*z;
      assert.ok(Math.abs(visible-water)<1e-9);
      assert.ok(Math.abs(meshHeight(body,x,z)-visible)<.0002);
    }
    assert.ok(structureGround(world,2.2,-.7)-(-.024*2.2**2-.014*.7**2)>.1);
    model.dispose();
  }
  // The low inlet is connected to the bay rather than painted over high land.
  assert.ok(structureGround('earth',.1,.3)<.002);
  assert.ok(structureGround('earth',.1,-.5)>.025);
});

test('retained rocks and Earth vegetation intersect the production terrain instead of floating',()=>{
  const vertex=new THREE.Vector3(),matrix=new THREE.Matrix4();
  for(const world of worlds) {
    const model=new StructureGround3D(world),body=bodyOf(model),owned=resources(model);
    for(const instance of owned.instances) {
      const positions=instance.geometry.getAttribute('position');
      for(let i=0;i<instance.count;i++) {
        instance.getMatrixAt(i,matrix);let below=Infinity,above=-Infinity;
        for(let j=0;j<positions.count;j++) {
          vertex.fromBufferAttribute(positions,j).applyMatrix4(matrix);
          const clearance=vertex.y-meshHeight(body,vertex.x,vertex.z);below=Math.min(below,clearance);above=Math.max(above,clearance);
        }
        assert.ok(below<=.003,`${world}/${instance.name}/${i} floats ${below}`);
        assert.ok(above>.004,`${world}/${instance.name}/${i} is entirely buried`);
        if(instance.name==='structure-ground-vegetation')assert.ok(above<.10);
      }
    }
    const plants=model.group.getObjectByName('structure-ground-vegetation');
    if(world==='earth')assert.ok(plants instanceof THREE.InstancedMesh&&plants.count===180);
    else assert.equal(plants,undefined);
    model.dispose();
  }
});

test('all retained details are deterministic and their payload includes bounded instance buffers',()=>{
  for(const world of worlds) {
    const a=new StructureGround3D(world),b=new StructureGround3D(world),ar=resources(a),br=resources(b);
    assert.deepEqual([...ar.geometry].map(g=>g.getAttribute('position').array),[...br.geometry].map(g=>g.getAttribute('position').array));
    assert.deepEqual([...ar.instances].map(i=>i.instanceMatrix.array),[...br.instances].map(i=>i.instanceMatrix.array));
    assert.deepEqual([...ar.instances].map(i=>i.instanceColor?.array),[...br.instances].map(i=>i.instanceColor?.array));
    let payload=0;
    for(const geometry of ar.geometry) {for(const attribute of Object.values(geometry.attributes))payload+=attribute.array.byteLength;payload+=geometry.index?.array.byteLength??0;}
    for(const instance of ar.instances)payload+=instance.instanceMatrix.array.byteLength+(instance.instanceColor?.array.byteLength??0);
    assert.equal(a.resourceBytes,payload);assert.ok(payload<260_000);
    assert.equal(ar.geometry.size,world==='earth'?3:2);assert.equal(ar.materials.size,world==='earth'?3:2);
    assert.ok([...ar.instances].every(i=>i.count<=180));a.dispose();b.dispose();
  }
});

test('supplied activity time preserves geometry, contact and buffers, and supports repeatable seeking',()=>{
  const model=new StructureGround3D('earth'),before=resources(model),bytes=model.resourceBytes,body=bodyOf(model);
  const arrays=[...before.geometry].map(g=>g.getAttribute('position').array),instances=[...before.instances].map(i=>i.instanceMatrix.array.slice());
  for(let i=0;i<240;i++)model.update(i*.25);
  assert.deepEqual(resources(model),before);assert.equal(model.resourceBytes,bytes);
  assert.ok([...before.geometry].every((g,i)=>g.getAttribute('position').array===arrays[i]));
  assert.deepEqual([...before.instances].map(i=>i.instanceMatrix.array),instances);
  model.update(12);assert.equal(body.material.uniforms.uSeconds.value,12);
  model.update(2);model.update(12);assert.equal(body.material.uniforms.uSeconds.value,12);
  model.update(NaN);assert.equal(body.material.uniforms.uSeconds.value,0);model.dispose();
});

test('geometry, materials and instancing resources dispose exactly once, including repeated teardown',()=>{
  for(const world of worlds) {
    const model=new StructureGround3D(world),owned=resources(model),all=[...owned.geometry,...owned.materials,...owned.instances],count=new Map<object,number>();
    for(const resource of owned.geometry)resource.addEventListener('dispose',()=>count.set(resource,(count.get(resource)??0)+1));
    for(const resource of owned.materials)resource.addEventListener('dispose',()=>count.set(resource,(count.get(resource)??0)+1));
    for(const resource of owned.instances)resource.addEventListener('dispose',()=>count.set(resource,(count.get(resource)??0)+1));
    model.dispose();model.dispose();model.update(20);
    assert.equal(count.size,all.length);assert.ok([...count.values()].every(n=>n===1));
    assert.equal(model.group.children.length,0);assert.equal(model.resourceBytes,0);
  }
});

test('caller-supplied terrain resolutions stay finite and within the 16-bit closed-grid bound',()=>{
  for(const [nx,nz]of [[Infinity,NaN],[-1,0],[1e6,1e6],[15.2,13.8]]) {
    const terrain=structureTerrain('moon',nx,nz),count=terrain.positions.length/3;
    assert.ok(count<65_536);assert.ok(terrain.positions.every(Number.isFinite));
    assert.ok(terrain.indices.every(i=>i<count));
  }
});
