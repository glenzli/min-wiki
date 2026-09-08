import test from 'node:test';
import assert from 'node:assert/strict';
import {orbitalState,eccentricAnomaly} from '../physics/orbits.ts';
import {PLANETS_DATA} from '../data/planetsData.ts';
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('elliptic trajectories conserve focus geometry, areal velocity and period',()=>{
 for(const p of PLANETS_DATA) {
  let crossLength;
  for(let j=0;j<30;j++) {
   const t=j*p.orbitalPeriodYears/30, s=orbitalState(p,t), repeat=orbitalState(p,t+p.orbitalPeriodYears);
   const a=p.semiMajorAxisAU,e=p.eccentricity;
   near(((s.x+a*e)/a)**2+(s.y*s.y+s.z*s.z)/(a*a*(1-e*e)),1);
   near(Math.hypot(s.x,s.y,s.z),s.radius);
   for(const c of ['x','y','z'])near(s[c],repeat[c]);
   const h=Math.hypot(s.y*s.vz-s.z*s.vy,s.z*s.vx-s.x*s.vz,s.x*s.vy-s.y*s.vx);
   if(crossLength!==undefined)near(h,crossLength); crossLength=h;
  }
 }
});
test('eccentric orbit speeds up at perihelion and solves Kepler equation',()=>{
 const p={index:1,semiMajorAxisAU:2,eccentricity:.4,orbitalPeriodYears:3,inclinationDeg:0};
 const peri=orbitalState(p,0),aph=orbitalState(p,1.5);
 near(peri.radius,1.2); near(aph.radius,2.8);
 near(Math.hypot(peri.vx,peri.vz)/Math.hypot(aph.vx,aph.vz),2.8/1.2);
 for(const M of [-3,-1,0,.4,2,3]) for(const e of [0,.2,.9,.99]) {
  const E=eccentricAnomaly(M,e); near(E-e*Math.sin(E),M);
 }
});
