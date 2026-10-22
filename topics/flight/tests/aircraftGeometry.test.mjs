import test from 'node:test';
import assert from 'node:assert/strict';
import { airfoilContour, airfoilPoint } from '../airfoil.ts';
import { createCamberedWing, createFuselage } from '../aircraftGeometry.ts';
import { aircraftPose } from '../journey.ts';
import { flightSnapshot } from '../model.ts';

function edgeCounts(geometry){
 const positions=geometry.getAttribute('position'),indices=geometry.index.array,edges=new Map();
 const point=i=>[positions.getX(i),positions.getY(i),positions.getZ(i)].map(x=>Number(x.toFixed(6))).join(',');
 for(let i=0;i<indices.length;i+=3)for(const [a,b] of [[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]){
  const key=[point(a),point(b)].sort().join('|');edges.set(key,(edges.get(key)??0)+1);
 }
 return [...edges.values()];
}
test('one finite cambered foil supplies both wing surfaces and their identifiable closed edges',()=>{
 const contour=airfoilContour();assert.equal(contour.length,64);
 for(const x of [0,.15,.4,.8,1]){
  const upper=airfoilPoint(x,true),lower=airfoilPoint(x,false);
  assert.ok(upper.every(Number.isFinite)&&lower.every(Number.isFinite));
  assert.ok(upper[1]>=lower[1]-1e-12);
 }
 assert.ok(airfoilPoint(.4,true)[1]>Math.abs(airfoilPoint(.4,false)[1]));
 for(const side of [-1,1]){
  const g=createCamberedWing(side),a=g.getAttribute('position');
  assert.ok([...a.array].every(Number.isFinite));assert.ok([...g.getAttribute('normal').array].every(Number.isFinite));
  assert.ok(edgeCounts(g).every(n=>n===2),'closed wing must have no exposed root, tip or trailing seam');
  contour.forEach(([x,y],i)=>{assert.ok(Math.abs(a.getX(i)-(x-.38)*2)<1e-6);assert.ok(Math.abs(a.getY(i)-y*2)<1e-6);});
  g.dispose();
 }
});
test('retained fuselage is closed and stays clear of the runway throughout the imposed attitude range',()=>{
 const geometry=createFuselage(),p=geometry.getAttribute('position');
 assert.ok(edgeCounts(geometry).every(n=>n===2));
 for(let pitch=0;pitch<=26;pitch+=.5){
  const pose=aircraftPose(flightSnapshot({speed:0,pitch},0));
  for(let i=0;i<p.count;i++){
   const y=pose.y+p.getX(i)*Math.sin(pose.rotation)+p.getY(i)*Math.cos(pose.rotation);
   assert.ok(y>0,'no nose, belly or tail vertex may intersect the runway');
  }
 }
 geometry.dispose();
});
