import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {clearIslandFlowProjection,FLOW_SEGMENTS,FLOW_SIDES,islandFlowBuffers,islandFlows,updateIslandFlow,type IslandFlow} from '../coastalFlow.ts';
import {OceanCoastalFlow3D} from '../coastalFlow3d.ts';
import {oceanGeometryFrame} from '../geometry3d.ts';
import {oceanUniforms} from '../materials3d.ts';

const before=JSON.parse(await readFile(new URL('./flowBasis.before.json',import.meta.url),'utf8'));
type Entry={data:ReturnType<typeof islandFlowBuffers>;geometry:THREE.BufferGeometry};
function entry():Entry{
  const data=islandFlowBuffers(),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setIndex(data.indices);
  return {data,geometry};
}
function bytes(array:ArrayBufferView){return Buffer.from(array.buffer,array.byteOffset,array.byteLength);}
function equalProjection(actual:Entry,flow:IslandFlow,frame:ReturnType<typeof oceanGeometryFrame>){
  const direct=entry();
  try{
    direct.data.source.set(actual.data.source);
    updateIslandFlow(actual.data,flow,frame);updateIslandFlow(direct.data,flow,frame);
    actual.geometry.setAttribute('position',new THREE.BufferAttribute(actual.data.positions,3));
    actual.geometry.computeVertexNormals();direct.geometry.computeVertexNormals();
    for(const name of ['positions','quench','distance','stage'] as const)assert.deepEqual(bytes(actual.data[name]),bytes(direct.data[name]),name);
    assert.deepEqual(bytes(actual.geometry.getAttribute('normal').array),bytes(direct.geometry.getAttribute('normal').array),'normals');
  }finally{direct.geometry.dispose();clearIslandFlowProjection(direct.data);}
}

test('all route positions, normals and flow attributes are byte-identical to the immutable before implementation',()=>{
  assert.equal(before.sourceSha256,'a77fd217049d599d751c408746da7b119cc50179b1a75ecd8eedcf6ec126419b');
  const retained=new Map<number,Entry>(),seen=new Map<string,Set<number>>();
  try{
    for(const sample of before.rows){
      const frame=oceanGeometryFrame(sample.p,'island',sample.supply),flows=islandFlows(frame);
      const position=createHash('sha256'),normal=createHash('sha256'),attributes=createHash('sha256');
      assert.deepEqual(flows.map(flow=>flow.unit.index),sample.units);
      for(const flow of flows){
        let item=retained.get(flow.unit.index);if(!item){item=entry();retained.set(flow.unit.index,item);}
        updateIslandFlow(item.data,flow,frame);item.geometry.computeVertexNormals();
        position.update(bytes(item.data.positions));normal.update(bytes(item.geometry.getAttribute('normal').array));
        for(const array of [item.data.quench,item.data.distance,item.data.stage])attributes.update(bytes(array));
        const indices=seen.get(sample.supply)??new Set<number>();indices.add(flow.unit.index);seen.set(sample.supply,indices);
      }
      assert.equal(position.digest('hex'),sample.position,`${sample.supply} p=${sample.p} positions`);
      assert.equal(normal.digest('hex'),sample.normal,`${sample.supply} p=${sample.p} normals`);
      assert.equal(attributes.digest('hex'),sample.attributes,`${sample.supply} p=${sample.p} attributes`);
    }
    assert.equal(seen.get('sustained')!.size,19);assert.equal(seen.get('limited')!.size,13);
  }finally{for(const item of retained.values()){item.geometry.dispose();clearIslandFlowProjection(item.data);}}
});

test('exact route, front, row, width, source and buffer changes invalidate only current spatial coefficients',()=>{
  const frame=oceanGeometryFrame(.88,'island','sustained'),original=islandFlows(frame).find(flow=>flow.unit.index===4)!;
  const flow: IslandFlow={...original,points:original.points.map(p=>[...p]),widths:[...original.widths],route:{...original.route,ground:original.route.ground.slice(),branch:original.route.branch?{...original.route.branch,ground:original.route.branch.ground.slice()}:undefined}};
  const item=entry();
  try{
    equalProjection(item,flow,frame);const basis=item.data.groundProjection!,arrays=[basis.rows,basis.indices,basis.weights,basis.ready];
    equalProjection(item,flow,oceanGeometryFrame(.99,'island','sustained'));
    assert.equal(item.data.groundProjection,basis);assert.deepEqual([basis.rows,basis.indices,basis.weights,basis.ready],arrays);
    flow.widths[31]+=Number.EPSILON;equalProjection(item,flow,frame);
    flow.widths[31]+=.021;equalProjection(item,flow,frame);
    flow.points[31][0]+=.013;flow.points[30][2]-=.007;equalProjection(item,flow,frame);
    flow.front-=.0001;equalProjection(item,flow,frame);
    flow.route={...flow.route,ground:flow.route.ground.map(value=>value-.017)};equalProjection(item,flow,frame);
    if(flow.route.branch)flow.route.branch.ground=flow.route.branch.ground.map(value=>value-.025);
    equalProjection(item,flow,frame);
    item.data.source[30*FLOW_SIDES*3]+=.031;equalProjection(item,flow,frame);
    item.data.source[30*FLOW_SIDES*3+1]=29/FLOW_SEGMENTS-.5;equalProjection(item,flow,frame);
    flow.widths[29]+=.017;flow.points[29][2]+=.003;equalProjection(item,flow,frame);
    item.data.source=item.data.source.slice();equalProjection(item,flow,frame);assert.notEqual(item.data.groundProjection,basis);
    const sourceBasis=item.data.groundProjection;item.data.positions=item.data.positions.slice();equalProjection(item,flow,frame);assert.notEqual(item.data.groundProjection,sourceBasis);
    const changed=flow.front;flow.front=original.front;equalProjection(item,flow,frame);flow.front=changed;equalProjection(item,flow,frame);
    clearIslandFlowProjection(item.data);assert.equal(item.data.groundProjection,undefined);
    equalProjection(item,flow,frame);assert.notEqual(item.data.groundProjection,basis);
  }finally{item.geometry.dispose();clearIslandFlowProjection(item.data);}
});

test('the retained owner bounds the current basis and clears every CPU projection before disposal',()=>{
  const noise=new THREE.Data3DTexture(),rock=new THREE.MeshStandardMaterial(),owner=new OceanCoastalFlow3D(noise,oceanUniforms(),rock);
  try{
    owner.draw(oceanGeometryFrame(.88,'island','sustained'));
    const channels=(owner as any).channels as {data:ReturnType<typeof islandFlowBuffers>}[];
    assert.equal(channels.length,19);
    const bytes=channels.reduce((sum,{data})=>{const basis=data.groundProjection!;assert.ok(basis);return sum+basis.rows.byteLength+basis.changedRows.byteLength+basis.indices.byteLength+basis.weights.byteLength+basis.ready.byteLength+basis.across.byteLength+basis.stations.byteLength;},0);
    assert.equal(bytes,1315123);assert.ok(bytes<1.4*1024*1024);
    const previous=channels.map(channel=>channel.data.groundProjection);
    owner.draw(oceanGeometryFrame(.8801,'island','sustained'));assert.deepEqual(channels.map(channel=>channel.data.groundProjection),previous);
    owner.dispose();owner.dispose();assert.ok(channels.every(channel=>channel.data.groundProjection===undefined));
  }finally{owner.dispose();noise.dispose();rock.dispose();}
});
