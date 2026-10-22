import test from 'node:test';
import assert from 'node:assert/strict';
import { readFlightRoute, writeFlightRoute, worldForces, aircraftPose, diagramAircraftPose, AIRFRAME } from '../journey.ts';
import { flightSnapshot } from '../model.ts';
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('whole aircraft opens first, while legacy wing and runway links remain meaningful',()=>{
 assert.equal(readFlightRoute('').view,'runway');
 assert.equal(readFlightRoute('').question,'airflow');
 assert.equal(readFlightRoute('?chapter=wing').view,'wing');
 assert.equal(readFlightRoute('?chapter=runway').question,'runway');
 assert.equal(readFlightRoute('?chapter=wing&view=runway').view,'runway');
 assert.equal(readFlightRoute('?question=invalid&view=invalid').view,'runway');
});
test('route roundtrip retains experiment, language and unrelated Reader settings',()=>{
 const state={speed:38,pitch:12,progress:.625,question:'forces',view:'wing'};
 const query=writeFlightRoute('?lang=en&reading=academic&custom=retained',state);
 assert.deepEqual(readFlightRoute(query),state);
 const p=new URLSearchParams(query);assert.equal(p.get('lang'),'en');assert.equal(p.get('reading'),'academic');assert.equal(p.get('custom'),'retained');
 const bounded=readFlightRoute('?speed=Infinity&pitch=999&p=-3');
 near(bounded.speed,38);near(bounded.pitch,26);near(bounded.progress,0);
});
test('3D force directions preserve the model vertical sum, horizontal balance and relative-air orientation',()=>{
 for(const speed of [0,25,38,60])for(const pitch of [0,12,26])for(const progress of [0,.4,1]){
  const s=flightSnapshot({speed,pitch},progress),v=worldForces(s),sum=Object.values(v).reduce((a,b)=>a.map((x,i)=>x+b[i]),[0,0,0]);
  near(sum[0],0);near(sum[1],s.netVertical);near(sum[2],0);
  near(v.lift[0]*(-speed)+v.lift[1]*s.verticalSpeed,0);
  if(s.airspeed>0)near(v.drag[0]*s.verticalSpeed+v.drag[1]*speed,0);
 }
});
test('whole-airframe pitch retains lowest tyre contact and deterministic clearance in both renderers',()=>{
 for(let pitch=0;pitch<=26;pitch+=.5)for(const progress of [0,.55,1]){
  const s=flightSnapshot({speed:38,pitch},progress),p=aircraftPose(s),d=diagramAircraftPose(s);
  const lowest=Math.min(...[AIRFRAME.mainGearX,AIRFRAME.noseGearX].map(x=>p.y+x*Math.sin(p.rotation)+AIRFRAME.wheelCenter*Math.cos(p.rotation)-AIRFRAME.wheelRadius));
  near(lowest,s.height);near(p.rotation,-pitch*Math.PI/180);
  const lower=Math.max(...[AIRFRAME.noseGearX*30,AIRFRAME.mainGearX*30].map(x=>d.y+x*Math.sin(d.angle)-AIRFRAME.wheelCenter*30*Math.cos(d.angle)+AIRFRAME.wheelRadius*30));
  near(lower,285-s.height*5);
  assert.deepEqual(aircraftPose(flightSnapshot({speed:38,pitch},progress)),p);
 }
});
