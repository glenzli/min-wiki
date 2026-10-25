import test from 'node:test';
import assert from 'node:assert/strict';
import {edgeSine,iceEdgeLatitude,regionSnapshot,REGION_A} from '../journeyModel.ts';
import {glacierBudget} from '../model.ts';

test('the same spherical edge crosses region A at the area-derived latitude rather than a linear percent angle',()=>{
  for(const [cover,latitude] of [[25,48.59037789],[30,44.427004],[50,30],[100,0]])assert.ok(Math.abs(iceEdgeLatitude(cover)-latitude)<1e-5);
  assert.equal(regionSnapshot(25,80).inside,false);assert.equal(regionSnapshot(30,80).inside,true);
  const threshold=100*(1-Math.sin(45*Math.PI/180));assert.ok(Math.abs(iceEdgeLatitude(threshold)-45)<1e-10);
  assert.equal(regionSnapshot(0,80).inside,false);assert.equal(regionSnapshot(100,80).inside,true);
});

test('irregular two-pole edges conserve nominal reference-sphere covered area and end without an equatorial gap',()=>{
  for(const cover of [0,5,25,60,95,100]){
    let mean=0;for(let i=0;i<3600;i++)mean+=1-edgeSine(cover,i/10);
    assert.ok(Math.abs(mean/3600-cover/100)<1e-12);
    for(let lon=0;lon<360;lon+=5){assert.ok(edgeSine(cover,lon)>=0&&edgeSine(cover,lon)<=1);if(cover===100)assert.equal(iceEdgeLatitude(cover,lon),0);}
  }
});

test('global coverage links site/sea-ice/reflection while keeping the nested land-glacier budget independent',()=>{
  const local=glacierBudget(8,4,3),a=regionSnapshot(25,80),b=regionSnapshot(30,80);
  assert.equal(a.id,b.id);assert.equal(a.sample,'P1');assert.equal(a.latitude,REGION_A.latitude);assert.equal(a.seaIce,0);assert.equal(b.seaIce,1);
  assert.ok(b.reflection.reflected>a.reflection.reflected);
  assert.equal(b.reflection.reflected+b.reflection.absorbed,100);
  assert.deepEqual(glacierBudget(8,4,3),local);assert.equal(local.mass,72);
});
