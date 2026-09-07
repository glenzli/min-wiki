import test from 'node:test';
import assert from 'node:assert/strict';
import {daylightExperiment,lightAtDayProgress} from '../learning/daylightModel.js';
test('the drawn daily path agrees with analytic daylight across seasons and hemispheres',()=>{
 for(const latitude of [39.9,-33.9,0,66.56]) for(const orbit of [0,.25,.5,.75]) for(const tilt of [0,12,23.44]) {
  const m=daylightExperiment(latitude,orbit,tilt);let day=0;
  const count=7200;
  for(let i=0;i<count;i++)if(lightAtDayProgress(m,(i+.5)/count).state==='day')day++;
  assert.ok(Math.abs(day/count*24-m.daylight)<.01);
 }
});
test('tilting lengthens northern summer days and raises noon Sun, with opposite southern changes',()=>{
 for(const latitude of [39.9,-33.9]) {
  const sign=Math.sign(latitude),start=daylightExperiment(latitude,.25,0),end=daylightExperiment(latitude,.25,23.44);
  assert.ok(sign*(end.daylight-start.daylight)>0);
  assert.ok(sign*(end.noonAltitude-start.noonAltitude)>0);
  assert.equal(lightAtDayProgress(end,0).altitude.toFixed(6),end.noonAltitude.toFixed(6));
  assert.equal(lightAtDayProgress(end,0).state,lightAtDayProgress(end,1).state);
 }
});
test('equator and poles retain their distinct boundaries in the comparison',()=>{
 assert.equal(daylightExperiment(0,.25,23.44).daylight,12);
 assert.equal(daylightExperiment(90,.25,0).daylight,null);
 assert.equal(daylightExperiment(90,.25,23.44).daylight,24);
 assert.equal(daylightExperiment(90,.75,23.44).daylight,0);
});

test('latitude circle on the globe and expanded daily path place the city on the same side of sunlight',async()=>{
 const {latitudeCirclePoint}=await import('../learning/daylightModel.js');
 for(const lat of [39.9,-33.9,0,66.56])for(const phase of [0,.25,.75]){
  const m=daylightExperiment(lat,phase,23.44);
  for(let i=0;i<100;i++){
   const p=latitudeCirclePoint(m,i/100),light=lightAtDayProgress(m,i/100);
   assert.ok(Math.abs(-p.x-Math.sin(light.altitude*Math.PI/180))<1e-10);
  }
 }
});
