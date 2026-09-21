import test from 'node:test';
import assert from 'node:assert/strict';
import { halfWidthKm, progressFor, viewPoint, viewTilt, LIGHT_YEAR_KM as LY, stops } from '../model.ts';
import { ScaleFlight } from '../flight.ts';
import { galaxyPopulation, GalaxyVolume } from '../galaxy.ts';

test('orthographic 3D projection preserves the ruler and distances after rotation',()=>{
  for(const p of [0,.35,.6,.8,1])for(const tilt of [0,.5,1]){
    const h=halfWidthKm(p),a=viewPoint(0,0,0,p,tilt),b=viewPoint(h,h*.2,h*.3,p,tilt);
    assert.ok(Math.abs(b[0]-a[0]-1)<1e-10);
    assert.ok(Math.abs(Math.hypot(...b.map((v,i)=>v-a[i]!))-Math.hypot(1,.2,.3))<1e-10);
  }
});
test('Earth anchor stays on screen through center shift; no hard tilt switch',()=>{
  for(let i=0;i<=1000;i++)for(const tilt of [0,1]){const p=viewPoint(0,0,0,i/1000,tilt);assert.ok(p.every(Number.isFinite));assert.ok(Math.abs(p[0])<1);}
  const p=progressFor(1500*LY);assert.ok(Math.abs(viewTilt(p-1e-7,1)-viewTilt(p+1e-7,1))<1e-4);
});
test('finite camera flight starts continuously, moves monotonically and lands exactly',()=>{
  const f=new ScaleFlight(0);f.go(stops[3]!);assert.equal(f.progress,0);let previous=0;
  for(let i=0;i<1000&&f.running;i++){f.step(.016);assert.ok(f.progress>=previous);previous=f.progress;}
  assert.equal(f.progress,stops[3]);assert.equal(f.running,false);
});
test('rapid retarget, manual scrub, reduced motion and hidden-time deltas are bounded',()=>{
  const f=new ScaleFlight(.4);f.go(1);for(let i=0;i<20;i++)f.step(.016);
  const at=f.progress;f.go(0);assert.equal(f.progress,at);f.step(.016);assert.ok(f.progress<at);
  f.seek(.6);assert.equal(f.step(500),.6);assert.equal(f.running,false);
  f.go(.9,true);assert.equal(f.progress,.9);assert.equal(f.running,false);
  f.go(0);const g=new ScaleFlight(.9);g.go(0);assert.equal(f.step(500),g.step(.08));
  f.stop();assert.equal(f.running,false);
});
test('galactic populations remain deterministic, finite and volumetric',()=>{
  for(const layer of ['disk','dust','bulge','halo'] as const){const a=galaxyPopulation(layer,400,1),b=galaxyPopulation(layer,400,1);assert.deepEqual(a,b);assert.equal(a.positions.length,1200);assert.ok(a.positions.every(Number.isFinite));assert.ok(a.colors.every(v=>v>=0&&v<=1));}
  const z=(layer:'disk'|'bulge'|'halo')=>Math.max(...galaxyPopulation(layer,400).positions.filter((_,i)=>i%3===2).map(Math.abs));
  assert.ok(z('disk')<.009);assert.ok(z('bulge')>.04);assert.ok(z('halo')>.5);
});
test('GPU layers toggle independently and release all five geometries',()=>{
  const g=new GalaxyVolume();assert.equal(g.root.children.length,5);let disposed=0;
  g.root.children.forEach(p=>(p as any).geometry.addEventListener('dispose',()=>disposed++));
  g.update(300,2,1,{disk:false,bulge:true,halo:false});assert.deepEqual(g.root.children.map(p=>p.visible),[false,false,false,true,false]);
  g.dispose();assert.equal(disposed,5);assert.equal(g.root.children.length,0);
});
