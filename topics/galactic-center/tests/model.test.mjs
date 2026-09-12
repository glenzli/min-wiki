import test from 'node:test';
import assert from 'node:assert/strict';
import {binaryAt,DONOR_MASS,BLACK_HOLE_MASS,SEPARATION,DONOR_X,HOLE_X,donorRadius,rocheLobe,transferPath,streamParcel} from '../model.ts';
test('both bodies orbit their common barycenter at constant separation',()=>{
 for(let i=0;i<=100;i++){
  const {star,hole}=binaryAt(i/100);
  assert.ok(Math.abs(star.x*DONOR_MASS+hole.x*BLACK_HOLE_MASS)<1e-10);
  assert.ok(Math.abs(star.y*DONOR_MASS+hole.y*BLACK_HOLE_MASS)<1e-10);
  assert.ok(Math.abs(Math.hypot(star.x-hole.x,star.y-hole.y)-SEPARATION)<1e-10);
 }
});
test('Roche radius is bounded and detached donor remains smaller than overflow donor',()=>{
 assert.ok(Math.abs(rocheLobe(1)-.37892)<.0001);
 assert.ok(donorRadius('detached')<donorRadius('overflow'));
});
test('gas path starts at the donor and joins the disk continuously',()=>{
 for(const scenario of ['overflow','wind']){
  const p=transferPath(0,scenario);assert.ok(Math.abs(p.x-(DONOR_X+donorRadius(scenario)*1.1))<1e-12);
  const a=transferPath(.4-1e-7,scenario),b=transferPath(.4+1e-7,scenario);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-5);
  const end=transferPath(1,scenario);assert.ok(Math.abs(Math.hypot(end.x-HOLE_X,end.y)-.075)<1e-9);
  for(let i=0;i<100;i++){const p=streamParcel(i,12,scenario);assert.ok(p.alpha>=0&&p.alpha<=1);assert.ok(Number.isFinite(p.x+p.y+p.z));assert.deepEqual(p,streamParcel(i,12,scenario));}
 }
});
