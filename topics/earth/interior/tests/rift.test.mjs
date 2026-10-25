import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RIFT_DEFAULT,parseRiftState,serializeRiftState,riftFrame,quakeFrame,basinPoint,faultX,eventDrop} from '../rift/model.ts';
import {beddingPoint,createBlockGeometry,createContinentGeometry,materialCells} from '../rift/geometry.ts';
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const state=values=>parseRiftState(JSON.stringify({...RIFT_DEFAULT,...values}));

test('rift state is bounded, canonical and independent of unknown or malformed nested values',()=>{
  for(const raw of [undefined,'null','[]','{broken','x'.repeat(2049)])assert.equal(serializeRiftState(parseRiftState(raw)),serializeRiftState(RIFT_DEFAULT));
  const restored=state({scale:'material',stage:73,quake:62,evolution:'stall',motion:'still',event:'unloaded',focus:'magma',camera:{region:[4,3,7],global:[Infinity,0,8],unknown:[1,2,3]},tag:19});
  assert.deepEqual(restored.camera,{region:[4,3,7]});assert.equal(restored.tag,19);
  assert.deepEqual(parseRiftState(serializeRiftState(restored)),restored);
  for(const stage of [-1,101,NaN,Infinity,2.5,'70'])assert.equal(state({stage}).stage,0);
  assert.equal(state({camera:{region:[0,0,0]},scale:'planet',tag:20}).scale,'global');
  assert.deepEqual(state({camera:{region:[0,0,0]}}).camera,{});
});

test('fixed P1 identities and continuous arbitrary portions balance through all reversible states',()=>{
  const expected=riftFrame(state({})).tags.map(tag=>tag.id);
  for(const stage of Array.from({length:101},(_,i)=>i))for(const thermal of ['warm','cool'])for(const path of ['open','sealed']){
    const f=riftFrame(state({stage,thermal,path}));assert.deepEqual(f.tags.map(tag=>tag.id),expected);
    assert.equal(new Set(f.tags.map(tag=>tag.id)).size,20);near(Object.values(f.portions).reduce((a,b)=>a+b),20);
    assert.equal(Object.values(f.counts).reduce((a,b)=>a+b),20);
    for(const value of Object.values(f.portions))assert.ok(value>=0&&value<=20);
    for(const tag of f.tags){assert.ok(tag.crystallize<=tag.melt+1e-9);assert.ok(tag.rise<=tag.melt+1e-9);}
  }
  const end=riftFrame(state({stage:100}));assert.deepEqual(end.portions,{residue:16,melt:0,crystal:4});
  const mid=riftFrame(state({stage:53}));assert.ok(mid.portions.melt>0&&mid.portions.melt<4);assert.equal(mid.cooled,0);
  assert.deepEqual(riftFrame(state({stage:53})),mid);
});

test('no extension, early cessation and no melting produce meaningful different outcomes',()=>{
  for(const stage of [0,50,100]){
    const still=riftFrame(state({stage,motion:'still'}));assert.equal(still.extension,0);assert.equal(still.melt,0);
    const cold=riftFrame(state({stage,thermal:'cool'}));assert.deepEqual(cold.portions,{residue:20,melt:0,crystal:0});
  }
  const ceased=riftFrame(state({stage:100,evolution:'stall'}));assert.equal(ceased.p,.32);assert.ok(ceased.opening>0);assert.equal(ceased.melt,0);
  assert.equal(ceased.basinDrop,riftFrame(state({stage:70,evolution:'stall'})).basinDrop);
});

test('melting precedes migration and crystallization; restricted transport retains material deeper',()=>{
  const early=riftFrame(state({stage:50}));assert.ok(early.melt>0);assert.equal(early.rise,0);assert.equal(early.cooled,0);
  const later=riftFrame(state({stage:73}));assert.ok(later.rise>0);assert.equal(later.cooled,0);
  const open=riftFrame(state({stage:100})),sealed=riftFrame(state({stage:100,path:'sealed'}));
  assert.equal(open.tags[19].rise,1);assert.equal(sealed.tags[19].rise,.23);assert.equal(sealed.portions.crystal,4);
  assert.deepEqual(open.portions,sealed.portions);
});

test('F1 event does not advance geology or create melt, and unloaded events do not slip',()=>{
  for(const stage of [0,54,77,100]){
    const baseline=riftFrame(state({stage,quake:0}));
    for(const quake of [0,40,55,70,100]){
      const f=riftFrame(state({stage,quake}));
      for(const key of ['p','extension','thinning','upwelling','melt','rise','cooled','opening','basinDrop'])assert.equal(f[key],baseline[key]);
      assert.deepEqual(f.tags,baseline.tags);assert.deepEqual(f.portions,baseline.portions);
      const unloaded=quakeFrame({quake,event:'unloaded'});assert.equal(unloaded.slip,0);assert.equal(unloaded.strain,0);assert.equal(unloaded.wave,0);
    }
  }
  assert.equal(quakeFrame({quake:40,event:'loaded'}).slip,0);
  assert.ok(quakeFrame({quake:55,event:'loaded'}).slip>0);
  assert.equal(quakeFrame({quake:100,event:'loaded'}).slip,1);
});

test('selected normal-fault event moves F1 hanging wall down-dip and leaves F2 fixed at several depths',()=>{
  for(const stage of [0,45,73,100])for(const baseY of [.43-riftFrame(state({stage})).basinDrop,.1,-.3,-.55]){
    const before=riftFrame(state({stage,quake:0})),after=riftFrame(state({stage,quake:100}));
    const a=basinPoint(0,baseY,before),b=basinPoint(0,baseY,after);
    assert.ok(b[0]>a[0]);assert.ok(b[1]<a[1]);near(b[0]-a[0],-(b[1]-a[1])*.48);
    for(const f of [before,after])for(const u of [0,1]){const [x,y]=basinPoint(u,baseY,f);near(x,faultX(y,f,u===0?'left':'right'));}
    assert.deepEqual(basinPoint(1,baseY,before),basinPoint(1,baseY,after));near(eventDrop(faultX(baseY,after,'right'),after,baseY),0);
  }
});

test('retained crust and mantle geometries share every sampled contact and stay finite',()=>{
  for(const block of ['left','basin','right'])for(const stage of [0,53,100]){
    const frame=riftFrame(state({stage,quake:100}));
    const crust=createBlockGeometry(block,'crust',4,4),mantle=createBlockGeometry(block,'lithosphere',4,4);crust.update(frame);mantle.update(frame);
    const c=crust.geometry.getAttribute('position'),m=mantle.geometry.getAttribute('position');
    for(let i=0;i<25;i++)for(let axis=0;axis<3;axis++)near(c.array[(i+25)*3+axis],m.array[i*3+axis],2e-5);
    for(const geometry of [crust.geometry,mantle.geometry]){assert.ok([...geometry.getAttribute('position').array].every(Number.isFinite));geometry.dispose();}
  }
});

test('both marker beds terminate on their own final inclined fault contacts, without bridging blocks',()=>{
  for(const stage of [0,45,73,100])for(const quake of [0,55,100])for(const level of [0,1]){
    const frame=riftFrame(state({stage,quake}));
    for(const [block,u,side] of [['left',1,'left'],['basin',0,'left'],['basin',1,'right'],['right',0,'right']]){
      const [x,y]=beddingPoint(block,u,level,frame);near(x,faultX(y,frame,side));
    }
    const noEvent=riftFrame(state({stage,quake:0}));
    assert.deepEqual(beddingPoint('basin',1,level,frame),beddingPoint('basin',1,level,noEvent));
  }
});

test('every actual F2-side mesh vertex stays fixed through the independent F1 event, including intermediate depths',()=>{
  for(const stage of [0,53,100])for(const layer of ['crust','lithosphere']){
    const before=riftFrame(state({stage,quake:0})),after=riftFrame(state({stage,quake:100}));
    const shape=createBlockGeometry('basin',layer,6,6);shape.update(before);
    const p=shape.geometry.getAttribute('position'),original=Array.from(p.array),indices=[];
    for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i)-faultX(p.getY(i),before,'right'))<2e-6)indices.push(i);
    assert.ok(indices.length>=63);shape.update(after);
    for(const i of indices)for(let axis=0;axis<3;axis++)near(p.array[i*3+axis],original[i*3+axis],1e-7);
    shape.geometry.dispose();
  }
});

test('authored spherical basin and continents use finite retained geometry in all cases',()=>{
  for(const side of [-1,0,1]){
    const shape=createContinentGeometry(side,12,8),attribute=shape.geometry.getAttribute('position');
    for(const stage of [0,32,70,100]){shape.update(riftFrame(state({stage})));assert.equal(shape.geometry.getAttribute('position'),attribute);assert.ok([...attribute.array].every(Number.isFinite));}
    shape.geometry.dispose();
  }
});

test('twenty fitted material domains are closed nonzero volumes with stable finite centers',()=>{
  const first=materialCells(),second=materialCells();assert.equal(first.length,20);
  for(let i=0;i<20;i++){
    const a=first[i].geometry.getAttribute('position').array;assert.ok(a.length>=36&&[...a].every(Number.isFinite));
    assert.deepEqual(first[i].center.toArray(),second[i].center.toArray());assert.deepEqual([...a],[...second[i].geometry.getAttribute('position').array]);
    let volume=0;for(let j=0;j<a.length;j+=9)volume+=(a[j]*(a[j+4]*a[j+8]-a[j+5]*a[j+7])-a[j+1]*(a[j+3]*a[j+8]-a[j+5]*a[j+6])+a[j+2]*(a[j+3]*a[j+7]-a[j+4]*a[j+6]))/6;
    assert.ok(volume>1e-5);first[i].geometry.dispose();second[i].geometry.dispose();
  }
});

test('rift content provides equivalent bilingual branch, prerequisite and uncertainty explanations',()=>{
  const content=JSON.parse(readFileSync(new URL('../rift/content.json',import.meta.url),'utf8'));
  const shape=value=>Array.isArray(value)?value.map(shape):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,value])=>[key,shape(value)])):typeof value;
  assert.deepEqual(shape(content.zh),shape(content.en));assert.doesNotMatch(JSON.stringify(content.en),/[\u3400-\u9fff]/);
  assert.equal(content.en.notes.length,5);assert.ok(content.en.quakeIntro.includes('neither'));assert.match(content.en.scaleNotes.material,/neither.*nor.*measured/);
});
