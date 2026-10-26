import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlateGeometry, frameForPlates } from '../plates/geometry.ts';
import { DEFAULT_STATE, restoreState, serializeState, parsePlateCamera } from '../model.ts';

const cases=['divergent','subduction','collision','transform'];
const count=9*7;
test('actual retained crust and lithospheric mantle meshes share every sampled contact',()=>{
  for(const boundary of cases)for(const p of [0,.17,.53,1])for(const side of [-1,1]){
    const crust=createPlateGeometry(side,'crust',8,6),mantle=createPlateGeometry(side,'mantle',8,6);
    crust.update({boundary,p});mantle.update({boundary,p});
    const a=crust.geometry.getAttribute('position'),b=mantle.geometry.getAttribute('position');
    for(let i=0;i<count;i++)for(const axis of ['getX','getY','getZ'])assert.ok(Math.abs(a[axis](count+i)-b[axis](i))<1e-6,boundary+'/'+p+'/'+side+'/'+i);
    for(const geo of [crust.geometry,mantle.geometry]){assert.ok(geo.getIndex().count>0);for(const value of geo.getAttribute('position').array)assert.ok(Number.isFinite(value));geo.dispose();}
  }
});
test('new ridge crust fits both retained old plate edges without section gaps',()=>{
  for(const p of [.02,.4,1]){
    const shapes=[-1,0,1].map(side=>createPlateGeometry(side,'crust',8,6));shapes.forEach(s=>s.update({boundary:'divergent',p}));
    for(let j=0;j<7;j++)for(const offset of [0,count])for(const axis of ['getX','getY','getZ']){
      const [left,middle,right]=shapes.map(s=>s.geometry.getAttribute('position'));
      assert.ok(Math.abs(left[axis](offset+j*9+8)-middle[axis](offset+j*9))<1e-6);
      assert.ok(Math.abs(right[axis](offset+j*9)-middle[axis](offset+j*9+8))<1e-6);
    }shapes.forEach(s=>s.geometry.dispose());
  }
});
test('no-motion uses the same actual initial geometry and repeated progress is reversible',()=>{
  for(const boundary of cases){
    const shape=createPlateGeometry(-1,'crust',8,6),initial=frameForPlates({...DEFAULT_STATE,interiorBoundary:boundary});shape.update(initial);
    const start=shape.geometry.getAttribute('position').array.slice();
    shape.update(frameForPlates({...DEFAULT_STATE,interiorBoundary:boundary,interiorMotion:'still',interiorProgress:83}));assert.deepEqual(shape.geometry.getAttribute('position').array,start);
    shape.update({boundary,p:.47});const middle=shape.geometry.getAttribute('position').array.slice();shape.update({boundary,p:1});shape.update({boundary,p:0});shape.update({boundary,p:.47});assert.deepEqual(shape.geometry.getAttribute('position').array,middle);shape.geometry.dispose();
  }
});
test('wave reveal and independent plate camera survive language/route restoration with bounds',()=>{
  const state={...DEFAULT_STATE,interiorWaveProgress:42,interiorPlateCamera:'[7.8,5.9,11.8]'};
  assert.deepEqual(restoreState(serializeState(state)),state);
  for(const value of ['{}','[1,2]','[null,7,9]','[0,0,0]','[100,5,10]','["7",8,10]'])assert.equal(parsePlateCamera(value),undefined);
  assert.equal(restoreState({interiorWaveProgress:'Infinity'}).interiorWaveProgress,100);
  assert.equal(restoreState({interiorPlateCamera:'[100,5,10]'}).interiorPlateCamera,'');
});
