import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createCloudVolume, type CloudVolumeOptions } from '../cloudVolume.ts';

type Volume=ReturnType<typeof createCloudVolume>;
const shapes=['cumulus','layered','ice'] as const;
const digest=(data:Uint8Array|string)=>createHash('sha256').update(data).digest('hex');

function densityOf(cloud:Volume) {
  const texture=cloud.mesh.material.uniforms.uDensity.value;
  assert.ok(texture instanceof THREE.Data3DTexture);
  return texture as THREE.Data3DTexture & {image:{data:Uint8Array;width:number;height:number;depth:number}};
}

function densityStats(cloud:Volume) {
  const {data,width,height,depth}=densityOf(cloud).image;
  let mass=0,occupied=0,sy=0,syy=0,sz=0,szz=0,asymmetry=0,border=0,feather=0;
  for(let z=0;z<depth;z++)for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const value=data[x+width*(y+height*z)]/255,py=y/(height-1)-.5,pz=z/(depth-1)-.5;
    mass+=value;sy+=value*py;syy+=value*py*py;sz+=value*pz;szz+=value*pz*pz;
    if(value>.05)occupied++;
    asymmetry+=Math.abs(value-data[(width-1-x)+width*(y+height*z)]/255);
    const edge=Math.min(x,width-1-x,y,height-1-y,z,depth-1-z);
    if(edge===0)border=Math.max(border,value);
    if(edge===1)feather=Math.max(feather,value);
  }
  return {mass,occupied,asymmetry:asymmetry/mass,varianceY:syy/mass-(sy/mass)**2,varianceZ:szz/mass-(sz/mass)**2,border,feather};
}

function sampleDensity(cloud:Volume,x:number,y:number,z:number) {
  const {data,width,height,depth}=densityOf(cloud).image;
  const coordinates=[(x+.5)*width-.5,(y+.5)*height-.5,(z+.5)*depth-.5],base=coordinates.map(Math.floor),fraction=coordinates.map((v,i)=>v-base[i]);
  let value=0;
  for(let dz=0;dz<2;dz++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++) {
    const ix=Math.max(0,Math.min(width-1,base[0]+dx)),iy=Math.max(0,Math.min(height-1,base[1]+dy)),iz=Math.max(0,Math.min(depth-1,base[2]+dz));
    value+=data[ix+width*(iy+height*iz)]/255*(dx?fraction[0]:1-fraction[0])*(dy?fraction[1]:1-fraction[1])*(dz?fraction[2]:1-fraction[2]);
  }
  return value;
}

test('legacy no-options clouds retain the exact production density and shader used by the continuous journey',()=>{
  // Captured before the optional natural-cloud path was introduced. Keeping
  // this appearance stable is an explicit cross-consumer compatibility rule.
  const oldDensity=new Map([
    [11,'0fed7d09ff6441d21ce76e8079fbf8a523bbd375ead4644c2e93ee42c5d8fae7'],
    [29,'a38833147f6d8ee11ff518844de504d778851747a3aa4e11840a0d8918a167bb'],
    [47,'aa3d9f303948b8ad6141b5f6aaa78786a9f50fb037e8f3ecb4c5285fb747c597'],
  ]);
  for(const [seed,expected]of oldDensity)for(const options of [undefined,{}, {dynamic:false}]) {
    const cloud=createCloudVolume(seed,options),texture=densityOf(cloud),material=cloud.mesh.material;
    assert.equal(digest(texture.image.data),expected);
    assert.equal(digest(material.fragmentShader),'8074e9dc9c7ede894c1b6efe850b00e8a2b8f14abfcce818fef2ebe9cccccdb6');
    assert.equal(digest(material.vertexShader),'f055f310ec2959ec5757af080c885487e5d2937502da861ede9df49b1c20a296');
    const uniforms=Object.keys(material.uniforms);cloud.setTime(50);
    assert.deepEqual(Object.keys(material.uniforms),uniforms);assert.equal(material.uniforms.uEvolution,undefined);
    assert.equal(material.uniforms.uOpacity.value,1);assert.equal(cloud.mesh.name,'illustrative-cumulus-volume');cloud.dispose();
  }
});

test('natural shape textures are bounded, deterministic, smoothly empty at every enclosing face and three-dimensional',()=>{
  const signatures=new Set<string>();
  for(const shape of shapes) {
    const cloud=createCloudVolume(41,{shape}),repeat=createCloudVolume(41,{shape}),texture=densityOf(cloud),stats=densityStats(cloud);
    assert.deepEqual([texture.image.width,texture.image.height,texture.image.depth],[72,52,40]);
    assert.equal(texture.image.data.byteLength,149_760);assert.deepEqual(texture.image.data,densityOf(repeat).image.data);
    assert.equal(texture.format,THREE.RedFormat);assert.equal(texture.type,THREE.UnsignedByteType);
    assert.equal(texture.minFilter,THREE.LinearFilter);assert.equal(texture.magFilter,THREE.LinearFilter);
    assert.equal(texture.wrapS,THREE.ClampToEdgeWrapping);assert.equal(texture.wrapT,THREE.ClampToEdgeWrapping);assert.equal(texture.wrapR,THREE.ClampToEdgeWrapping);
    assert.equal(texture.generateMipmaps,false);assert.equal(texture.unpackAlignment,1);
    assert.equal(stats.border,0);assert.ok(stats.feather<.5);
    assert.ok(stats.mass>1000&&stats.mass<40_000);assert.ok(stats.occupied>1000&&stats.occupied<texture.image.data.length*.65);
    assert.ok(stats.varianceY>.003&&stats.varianceZ>.01);assert.ok(stats.asymmetry>.15);
    if(shape==='layered')assert.equal(digest(texture.image.data),'2ef359ae8dbad3fb19807885b0c2678cbf03d3460322de5c6dd08584dc833b25');
    if(shape==='ice')assert.equal(digest(texture.image.data),'46e7d77aefc6ae88267798fb9626215ad97e07e1e988820b372545a1cf120289');
    signatures.add(digest(texture.image.data));cloud.dispose();repeat.dispose();
  }
  assert.equal(signatures.size,3);
});

test('cumulus has unequal crests and narrowing shoulders rather than an extruded broad slab',()=>{
  for(const seed of [41,63,81]) {
    const cloud=createCloudVolume(seed,{shape:'cumulus'}),{data,width,height,depth}=densityOf(cloud).image,projection=new Float64Array(width*height);
    for(let z=0;z<depth;z++)for(let y=0;y<height;y++)for(let x=0;x<width;x++)projection[x+width*y]+=data[x+width*(y+height*z)]/(255*depth);
    const tops:number[]=[],widths=new Array<number>(height).fill(0);
    for(let x=0;x<width;x++) {
      let top=-1;for(let y=0;y<height;y++)if(projection[x+width*y]>.07){top=y;widths[y]++;}
      if(top>=0&&x>width*.13&&x<width*.87)tops.push(top);
    }
    const mean=tops.reduce((sum,y)=>sum+y,0)/tops.length,spread=Math.sqrt(tops.reduce((sum,y)=>sum+(y-mean)**2,0)/tops.length);
    assert.ok(Math.max(...tops)-Math.min(...tops)>height*.22,'crests differ by a visible fraction of the cloud height');
    assert.ok(spread>height*.065,'upper silhouette has broad unequal rising regions');
    const occupied=widths.filter(w=>w>0),widest=Math.max(...widths),broadRows=occupied.filter(w=>w>widest*.85).length;
    assert.ok(occupied.length>height*.55);assert.ok(broadRows/occupied.length<.63,'shoulders taper instead of staying full-width through the body');
    cloud.dispose();
  }
});

test('the Earth rain footprint remains inside a dense lower cloud across the existing vertical breathing envelope',()=>{
  const cloud=createCloudVolume(41,{shape:'cumulus',dynamic:true});
  // Current production rain starts .34 display units below the 1.22-high
  // volume center. Include both sides of its small view-owned scale change.
  for(const y of [-.29,-.34/1.22,-.269])for(const x of [-.18,-.09,0,.09,.18])for(const z of [-.16,-.08,0,.08,.16]) {
    assert.ok(sampleDensity(cloud,x,y,z)>.15,`empty rain origin at ${x},${y},${z}`);
  }
  const light=cloud.mesh.material.uniforms.uLightDirection.value as THREE.Vector3;
  assert.ok(light.y>.7&&light.z<0,'high, slightly rearward illumination reveals front-billow self-shadow');
  cloud.dispose();
});

test('layered and ice fields differ in actual depth/density structure from the cumulus envelope',()=>{
  const clouds=shapes.map(shape=>createCloudVolume(41,{shape})),[cumulus,layered,ice]=clouds.map(densityStats);
  assert.ok(layered.varianceY<cumulus.varianceY*.65);
  assert.ok(layered.varianceZ>layered.varianceY*2);
  assert.ok(ice.mass<cumulus.mass*.25);assert.ok(ice.occupied<cumulus.occupied*.5);
  assert.ok(ice.varianceZ>ice.varianceY*2);
  for(const cloud of clouds)cloud.dispose();
});

test('seed variation changes the retained natural field while nonfinite seeds normalize deterministically',()=>{
  for(const shape of shapes) {
    const a=createCloudVolume(41,{shape}),b=createCloudVolume(63,{shape}),zero=createCloudVolume(0,{shape}),invalid=createCloudVolume(NaN,{shape});
    const data=densityOf(a).image.data,other=densityOf(b).image.data;
    let variation=0;for(let i=0;i<data.length;i++)variation+=Math.abs(data[i]-other[i])/255;
    assert.ok(variation/data.length>.01);assert.deepEqual(densityOf(zero).image.data,densityOf(invalid).image.data);
    for(const cloud of [a,b,zero,invalid])cloud.dispose();
  }
});

test('supplied time updates one retained evolution uniform, supports seeking and does not animate static options',()=>{
  for(const shape of shapes) {
    const cloud=createCloudVolume(41,{shape,dynamic:true}),material=cloud.mesh.material,texture=densityOf(cloud),data=texture.image.data,geometry=cloud.mesh.geometry;
    const positions=geometry.getAttribute('position').array,uniforms=material.uniforms,evolution=uniforms.uEvolution.value as THREE.Vector4;
    const pose=[...cloud.mesh.position,...cloud.mesh.quaternion,...cloud.mesh.scale];
    assert.deepEqual(evolution.toArray(),[0,0,0,0]);
    cloud.setTime(18);const state=evolution.clone();assert.ok(state.length()>.1);
    cloud.setTime(3);cloud.setTime(18);assert.deepEqual(evolution,state);
    for(let i=0;i<300;i++)cloud.setTime(i*.25);
    assert.equal(cloud.mesh.geometry,geometry);assert.equal(cloud.mesh.material,material);assert.equal(material.uniforms,uniforms);
    assert.equal(densityOf(cloud),texture);assert.equal(texture.image.data,data);assert.equal(geometry.getAttribute('position').array,positions);
    assert.equal(uniforms.uEvolution.value,evolution);assert.equal(texture.version,1);
    assert.deepEqual([...cloud.mesh.position,...cloud.mesh.quaternion,...cloud.mesh.scale],pose);
    cloud.setTime(Infinity);assert.deepEqual(evolution.toArray(),[0,0,0,0]);cloud.dispose();
    const still=createCloudVolume(41,{shape,dynamic:false}),stillEvolution=still.mesh.material.uniforms.uEvolution.value as THREE.Vector4;
    still.setTime(30);assert.deepEqual(stillEvolution.toArray(),[0,0,0,0]);still.dispose();
  }
});

test('cumulus rolling coefficients remain continuous and bounded across seeks without the old common sinusoidal loop',()=>{
  const cloud=createCloudVolume(41,{shape:'cumulus',dynamic:true}),evolution=cloud.mesh.material.uniforms.uEvolution.value as THREE.Vector4;
  for(const time of [-1e308,-300,-20,-.001,0,.001,3,18,60,300,1e6,1e308]) {
    cloud.setTime(time);assert.ok(evolution.toArray().every(value=>Number.isFinite(value)&&Math.abs(value)<=2));
  }
  for(let time=-80;time<=80;time+=.5) {
    cloud.setTime(time-.0001);const before=evolution.clone();cloud.setTime(time+.0001);
    assert.ok(evolution.clone().sub(before).length()<.0003,'crossing an interpolation cell must not pop a billow');
  }
  cloud.setTime(18);const first=evolution.clone();cloud.setTime(18+2000*Math.PI);
  assert.ok(evolution.clone().sub(first).length()>.1,'rolling does not return at the previous four-sine common period');
  cloud.setTime(-7);cloud.setTime(18);assert.deepEqual(evolution,first);cloud.dispose();
});

test('layered and ice clocks retain their pre-turbulence evolution and illumination semantics',()=>{
  const expected=[-1.6102742118058315,1.3742439957105468,-1.084956998172367,.570386231758108];
  for(const shape of ['layered','ice'] as const) {
    const cloud=createCloudVolume(41,{shape,dynamic:true});cloud.setTime(18);
    assert.deepEqual((cloud.mesh.material.uniforms.uEvolution.value as THREE.Vector4).toArray(),expected);
    const light=cloud.mesh.material.uniforms.uLightDirection.value as THREE.Vector3;
    assert.ok(light.y>.7&&light.z>0);assert.equal(cloud.mesh.material.uniforms.uShape.value,shape==='layered'?1:2);
    cloud.dispose();
  }
});

test('one cloud retains the same 150600-byte texture/geometry payload for every mode without extra texture resources',()=>{
  const options:Array<CloudVolumeOptions|undefined>=[undefined,...shapes.map(shape=>({shape,dynamic:true}))];
  for(const option of options) {
    const cloud=createCloudVolume(41,option),texture=densityOf(cloud),geometry=cloud.mesh.geometry;
    let payload=texture.image.data.byteLength;for(const attribute of Object.values(geometry.attributes))payload+=attribute.array.byteLength;payload+=geometry.index?.array.byteLength??0;
    assert.equal(payload,150_600);
    assert.equal(Object.values(cloud.mesh.material.uniforms).filter(u=>u.value instanceof THREE.Texture).length,1);
    assert.match(cloud.mesh.material.fragmentShader,/const int STEPS\s*=\s*56\s*;/);
    for(let i=0;i<100;i++){cloud.setTime(i);cloud.setOpacity(i/100);}
    assert.equal(texture.image.data.byteLength,149_760);assert.equal(cloud.mesh.material.depthWrite,false);assert.equal(cloud.mesh.material.side,THREE.FrontSide);
    assert.equal(cloud.mesh.material.transparent,true);assert.equal(cloud.mesh.material.premultipliedAlpha,true);cloud.dispose();
  }
});

test('opacity remains bounded and density, material and geometry dispose exactly once after all optional modes',()=>{
  for(const options of [undefined,...shapes.map(shape=>({shape,dynamic:true}))]) {
    const cloud=createCloudVolume(41,options),texture=densityOf(cloud),material=cloud.mesh.material,geometry=cloud.mesh.geometry,count={texture:0,material:0,geometry:0};
    texture.addEventListener('dispose',()=>count.texture++);material.addEventListener('dispose',()=>count.material++);geometry.addEventListener('dispose',()=>count.geometry++);
    cloud.setOpacity(2);assert.equal(material.uniforms.uOpacity.value,1);cloud.setOpacity(-1);assert.equal(material.uniforms.uOpacity.value,0);
    cloud.setOpacity(NaN);assert.equal(material.uniforms.uOpacity.value,0);cloud.setOpacity(.6);cloud.setTime(15);
    const evolution=material.uniforms.uEvolution?.value as THREE.Vector4|undefined,state=evolution?.clone();
    cloud.dispose();cloud.dispose();cloud.setOpacity(.1);cloud.setTime(20);
    assert.deepEqual(count,{texture:1,material:1,geometry:1});assert.equal(material.uniforms.uOpacity.value,.6);if(state)assert.deepEqual(evolution,state);
  }
});
