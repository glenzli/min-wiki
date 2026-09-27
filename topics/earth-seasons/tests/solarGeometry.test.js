import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {solarGeometry, surfaceNormal, cityIllumination, rotationAtLocalNoon, wrapCycle} from '../physics/solarGeometry.ts';
import {calcDaylightHours, calcNoonSolarAltitude, MAJOR_CITIES} from '../data/seasonsData.ts';
import {daylightExperiment, lightAtDayProgress} from '../learning/daylightModel.ts';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('render transforms and local city light agree through a full orbit and rotation',()=>{
  for (const orbit of [0,.13,.25,.5,.75,.98]) for(const spin of [0,.2,.5,.8]) {
    const g=solarGeometry(orbit,spin,23.44);
    const matrix=new THREE.Matrix4().makeRotationZ(23.44*Math.PI/180).multiply(new THREE.Matrix4().makeRotationY(spin*2*Math.PI));
    for(const [lat,lon] of [[90,0],[-90,0],[39.9,116.4],[-33.9,151.2],[0,0]]) {
      const n=surfaceNormal(lat,lon);
      const world=new THREE.Vector3(n.x,n.y,n.z).transformDirection(matrix);
      const dot=world.dot(new THREE.Vector3(g.sunWorld.x,g.sunWorld.y,g.sunWorld.z));
      near(Math.sin(cityIllumination(lat,lon,g.sunLocal).altitude*Math.PI/180),dot);
    }
  }
});
test('north pole remains lit all summer day and dark all winter day',()=>{
  for(let i=0;i<100;i++) {
    assert.equal(cityIllumination(90,0,solarGeometry(.25,i/100,23.44).sunLocal).state,'day');
    assert.equal(cityIllumination(90,0,solarGeometry(.75,i/100,23.44).sunLocal).state,'night');
  }
});
test('zero tilt and equinox distinguish polar horizon from ordinary twelve-hour days',()=>{
  assert.equal(calcDaylightHours(90,0),null);
  assert.equal(calcDaylightHours(-90,0),null);
  assert.equal(calcDaylightHours(39.9,0),12);
  for(const phase of [0,.25,.5,.75]) {
    assert.equal(cityIllumination(90,0,solarGeometry(phase,.3,0).sunLocal).state,'horizon');
  }
});
test('a chosen place and day progress carry the same illumination into the globe',()=>{
  for(const city of MAJOR_CITIES) for(const orbit of [0,.25,.5,.75]) for(const tilt of [0,12,23.44]) {
    const noon=rotationAtLocalNoon(orbit,tilt,city.lon);
    const model=daylightExperiment(city.lat,orbit,tilt);
    for(const progress of [0,.125,.25,.5,.75,.875]) {
      const light=solarGeometry(orbit,wrapCycle(noon+progress),tilt);
      const globe=cityIllumination(city.lat,city.lon,light.sunLocal);
      const flat=lightAtDayProgress(model,progress);
      assert.ok(Math.abs(globe.altitude-flat.altitude)<1e-8,`${city.id}: ${globe.altitude} != ${flat.altitude}`);
      assert.equal(globe.state,flat.state);
    }
    near(cityIllumination(city.lat,city.lon,solarGeometry(orbit,noon,tilt).sunLocal).altitude,calcNoonSolarAltitude(city.lat,model.declination));
  }
});
