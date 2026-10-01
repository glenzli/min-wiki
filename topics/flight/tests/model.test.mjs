import test from 'node:test';
import assert from 'node:assert/strict';
import { FLIGHT, coefficients, forces, flightSnapshot } from '../model.ts';
import { flowRoute } from '../flowGeometry.ts';
const near = (a,b,tolerance=1e-7) => assert.ok(Math.abs(a-b)<tolerance, `${a} != ${b}`);
test('a stationary wing has no aerodynamic lift or drag and the ground carries its weight',()=>{
 for(const pitch of [0,8,15,26]) {const s=flightSnapshot({speed:0,pitch},1);near(s.lift,0);near(s.drag,0);near(s.height,0);near(s.support,s.weight);near(s.netVertical,0);}
});
test('doubling relative airspeed quadruples lift for unchanged initial wing conditions',()=>{
 near(forces({speed:40,pitch:8}).lift,4*forces({speed:20,pitch:8}).lift);
});
test('excessive angle reduces lift coefficient, increases drag and can remain on the runway',()=>{
 assert.ok(coefficients(26).cl<coefficients(15).cl);assert.ok(coefficients(26).cd>coefficients(15).cd);
 assert.equal(coefficients(26).stalled,true);assert.equal(coefficients(8).stalled,false);
 assert.ok(flightSnapshot({speed:38,pitch:12},1).height>0);
 near(flightSnapshot({speed:38,pitch:26},1).height,0);
});
test('lift direction follows relative motion and all displayed forces sum consistently',()=>{
 for(const speed of [0,25,38,60])for(const pitch of [0,8,15,26])for(const p of [0,.25,.6,1]){
 const s=flightSnapshot({speed,pitch},p);near(s.thrust-s.liftX-s.dragX,0);
 near(s.netVertical,s.liftY+s.dragY+s.support-s.weight);assert.ok(s.height>=0);assert.ok(s.support>=0);
 near(s.liftX*Math.cos(s.pathAngle)-s.liftY*Math.sin(s.pathAngle),0);
 if(s.height>0)near(s.support,0);
 }
});
test('changing path direction changes angle of attack while wing pitch remains fixed',()=>{
 const s=flightSnapshot({speed:50,pitch:12},1);assert.ok(s.height>0);assert.ok(s.verticalSpeed>0);
 assert.ok(s.angleOfAttack<12);near(s.pitch,12);assert.ok(s.pathAngle>0);
});
test('seeking is reproducible and inputs are bounded without inventing a crash branch',()=>{
 const a=flightSnapshot({speed:45,pitch:8},.55);flightSnapshot({speed:45,pitch:8},1);
 assert.deepEqual(flightSnapshot({speed:45,pitch:8},.55),a);
 assert.deepEqual(flightSnapshot({speed:Infinity,pitch:NaN},2),flightSnapshot({speed:0,pitch:0},1));
 near(flightSnapshot({speed:60,pitch:26},1).time,FLIGHT.duration);
});
test('drawn far-flow tangents follow incoming motion then turn down for positive lift, including ascent',()=>{
 for(const speed of [10,38,60])for(const pitch of [0,8,12,20,26])for(const progress of [0,.5,1]){
  const s=flightSnapshot({speed,pitch},progress);
  for(const side of [-1,1])for(const offset of [12,42,77]){
   const r=flowRoute(s,side,offset);
   const incoming=Math.atan2(r.upstreamControl[1]-r.start[1],r.upstreamControl[0]-r.start[0]);
   const outgoing=Math.atan2(r.exit[1]-r.exitControl[1],r.exit[0]-r.exitControl[0]);
   near(incoming,s.pathAngle);near(outgoing,s.pathAngle+Math.atan(.18*s.cl));
   if(s.cl>0)assert.ok(outgoing>incoming,'positive lift must turn air down relative to incoming flow');
  }
 }
 const s=flightSnapshot({speed:60,pitch:20},1);
 assert.ok(s.pathAngle>15*Math.PI/180);
 const r=flowRoute(s,-1,12);
 assert.ok(Math.atan2(r.exit[1]-r.exitControl[1],r.exit[0]-r.exitControl[0])>s.pathAngle);
});
