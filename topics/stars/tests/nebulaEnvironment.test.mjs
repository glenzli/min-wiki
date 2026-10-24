import test from 'node:test';
import assert from 'node:assert/strict';
import {SphereGeometry} from 'three';
import {nebulaEnvironmentField,nebulaEnvironmentSampler,nebulaEnvironmentStars,nebulaEnvironmentDirection,writeNebulaEnvironment,NEBULA_SKY_STARS} from '../nebulaEnvironment.ts';
import {nebulaCloudPoint,nebulaCloudCoordinates} from '../nebulaCloud.ts';

test('the distant angular field has no seam or observer-distance dependence',()=>{
  for(const reference of ['orion','pillars','horsehead']){
    for(const point of [[1,0,0],[0,1,0],[0,0,1],[.4,-.3,-.8]]){
      const field=nebulaEnvironmentField(reference,...point),far=nebulaEnvironmentField(reference,...point.map(v=>v*27));
      assert.ok(field.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
      field.forEach((v,i)=>assert.ok(Math.abs(v-far[i])<1e-12));
    }
    const a=nebulaEnvironmentField(reference,-1,.2,-1e-8),b=nebulaEnvironmentField(reference,-1,.2,1e-8);
    a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-6));
    for(const light of ['emission','reflection','dark']){
      const sample=nebulaEnvironmentSampler(reference,light);
      for(const point of [[0,0,0],...[[1,0,0],[0,1,0],[0,0,1],nebulaCloudPoint(0,0,-1)]])assert.ok(sample(...point).every(v=>Number.isFinite(v)&&v>=0&&v<=1));
    }
  }
});

test('the uploaded field follows the sphere UV orientation and fully replaces the current case',()=>{
  const width=32,height=16,data=new Uint8Array(width*height*4),geometry=new SphereGeometry(1,width,height);
  writeNebulaEnvironment('pillars',data,width,height);const original=data.slice();
  const position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  for(const i of [50,130,220,350]){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i),expected=nebulaEnvironmentField('pillars',x,y,z);
    const tx=Math.min(width-1,Math.floor(uv.getX(i)*width)),ty=Math.min(height-1,Math.floor(uv.getY(i)*height)),actual=Array.from(data.subarray((ty*width+tx)*4,(ty*width+tx)*4+4),v=>v/255);
    // The deliberately tiny test texture samples at texel centres, unlike a
    // sphere vertex on the texel boundary. This catches flipped hemispheres.
    assert.ok(actual.every((v,c)=>Math.abs(v-expected[c])<.32));
  }
  writeNebulaEnvironment('horsehead',data,width,height);assert.notDeepEqual(data,original);
  writeNebulaEnvironment('pillars',data,width,height);assert.deepEqual(data,original);
  assert.throws(()=>writeNebulaEnvironment('pillars',new Uint8Array(7),width,height));
  geometry.dispose();
});

test('stars are fixed beyond every allowed camera and foreground volume, with a sparse bright tail',()=>{
  for(const reference of ['orion','pillars','horsehead']){
    const stars=nebulaEnvironmentStars(reference);assert.equal(stars.length,NEBULA_SKY_STARS);assert.deepEqual(stars,nebulaEnvironmentStars(reference));
    for(const star of stars){assert.ok(Math.abs(Math.hypot(...star.position)-24)<1e-12);assert.ok(star.size>=1&&star.size<9&&star.brightness>0&&star.brightness<=1);}
    const bright=stars.filter(s=>s.brightness>.7).length;assert.ok(bright>3&&bright<stars.length*.12,'most stars remain small and faint');
    assert.ok(stars.some(s=>s.warmth<.15)&&stars.some(s=>s.warmth>.85));
  }
  const [u,v,w]=nebulaCloudCoordinates(...nebulaEnvironmentDirection(520,280));assert.ok(Math.abs(u)<.001&&Math.abs(v)<.001&&w<-.99);
});
