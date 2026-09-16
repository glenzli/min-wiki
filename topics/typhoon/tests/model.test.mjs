import test from 'node:test';
import assert from 'node:assert/strict';
import { coriolis, favorability, organization } from '../model.ts';
const favorable = { temperature: 29, shear: 5, hemisphere: 'north' };
test('Coriolis changes sign between hemispheres and vanishes at the equator', () => { assert.equal(coriolis(0), 0); assert.ok(coriolis(15) > 0); assert.equal(coriolis(-15), -coriolis(15)); });
test('warm water alone does not overcome strong shear or an equatorial position', () => {
  assert.equal(favorability(favorable), 1); assert.equal(favorability({ ...favorable, shear: 30 }), 0); assert.equal(favorability({ ...favorable, hemisphere: 'equator' }), 0); assert.ok(favorability({ ...favorable, temperature: 24 }) < .1);
});
test('storm organization develops continuously but only under the selected conditions', () => { assert.equal(organization(0, favorable), 0); assert.equal(organization(1, favorable), 1); assert.equal(organization(1, { ...favorable, shear: 30 }), 0); });

test('southern bands mirror northern geometry as well as reversing motion', async () => {
  const { spiralAngle } = await import('../model.ts');
  for (const radius of [35, 100, 180]) for (const p of [0, .5, 1]) {
    assert.ok(Math.abs(spiralAngle(radius, p, 0, 'north') + spiralAngle(radius, p, 0, 'south')) < 1e-12);
  }
  assert.ok(spiralAngle(100, .6, 0, 'north') < spiralAngle(100, .5, 0, 'north'));
});

test('mature observation stays mature while circulation advances, and pause freezes both clocks',async()=>{
  const {advance}=await import('../model.ts');
  let state={formation:.99,circulation:0,playing:true};
  for(let i=0;i<6000;i++)state=advance(state,.1);
  assert.equal(state.formation,1);assert.ok(state.circulation>599);
  const paused={...state,playing:false};assert.equal(advance(paused,100),paused);
  assert.equal(advance({...state,formation:0},9).formation,.12/26);
});
test('airflow routes join continuously, rise at the eyewall, and move outward aloft',async()=>{
  const {airParcel}=await import('../model.ts');
  for(const phase of [.48,.72]){const a=airParcel(0,(phase-1e-7)/.038,'north'),b=airParcel(0,(phase+1e-7)/.038,'north');assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.001);}
  const low=airParcel(0,.4/.038,'north'),rising=airParcel(0,.65/.038,'north'),upper=airParcel(0,.9/.038,'north');
  assert.ok(low.y<10);assert.ok(rising.y>90);assert.ok(upper.y>130);assert.ok(Math.hypot(upper.x,upper.z)>Math.hypot(rising.x,rising.z));
  const a=airParcel(0,.1/.038,'north'),b=airParcel(0,.1/.038,'south');assert.ok(Math.abs(a.x-b.x)<1e-10);assert.ok(Math.abs(a.z+b.z)<1e-10);
});
test('replacement shows two eyewalls before the inner fades and the outer contracts',async()=>{
  const {eyewalls}=await import('../cloudField.ts');
  const start=eyewalls('replacement',0),double=eyewalls('replacement',.4),end=eyewalls('replacement',1);
  assert.equal(start.innerStrength,1);assert.equal(start.outerStrength,0);
  assert.ok(double.innerStrength>.8&&double.outerStrength>.9);assert.ok(double.outerRadius>double.innerRadius*2);
  assert.equal(end.innerStrength,0);assert.equal(end.outerStrength,1);assert.ok(end.outerRadius<double.outerRadius);
  assert.equal(eyewalls('covered',.5).innerStrength,0);
});
test('cloud relief is seeded, bounded and continuous across texture samples',async()=>{
  const {relief}=await import('../cloudField.ts');
  for(let x=-250;x<=250;x+=13)for(let y=-250;y<=250;y+=13){const a=relief(x,y),b=relief(x+1e-5,y);assert.deepEqual(a,relief(x,y));for(const k of ['bands','detail','scatter']){assert.ok(a[k]>=0&&a[k]<=1);assert.ok(Math.abs(a[k]-b[k])<.001);}}
});

test('replacement airflow follows either active wall and the moat is not mislabeled as the eye',async()=>{
  const {airParcel}=await import('../model.ts');const {eyewalls,eyeRadius}=await import('../cloudField.ts');
  for(const p of [0,.25,.48,.72,1]){
    const walls=eyewalls('replacement',p);
    for(const radius of [walls.innerRadius,walls.outerRadius]){
      const base=airParcel(0,.48/.038,'north',radius);assert.ok(Math.abs(Math.hypot(base.x,base.z)-radius)<1e-8);
      for(const phase of [.48,.72]){const a=airParcel(0,(phase-1e-7)/.038,'north',radius),b=airParcel(0,(phase+1e-7)/.038,'north',radius);assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.001);}
    }
  }
  assert.ok(eyeRadius('replacement',.48)<eyewalls('replacement',.48).innerRadius);
  assert.equal(eyeRadius('covered',1),0);
});

test('formation transports a cloud patch cyclonically and inward instead of changing only its opacity',async()=>{
  const {genesisWind,sampleCloud}=await import('../evolution.ts');
  const size=41,field=new Float32Array(size*size),spacing=10;
  // A compact cloud east of the circulation center, away from all boundaries.
  for(let z=0;z<size;z++)for(let x=0;x<size;x++)field[z*size+x]=Math.exp(-((x-30)**2+(z-20)**2)/5);
  let mass=0,cx=0,cz=0;
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
    const wind=genesisWind((x-20)*spacing,(z-20)*spacing,.7);
    const q=sampleCloud(field,size,x-wind.x/spacing,z-wind.z/spacing);mass+=q;cx+=x*q;cz+=z*q;
  }
  assert.ok(cx/mass<30,'inward transport');assert.ok(cz/mass<19.5,'cyclonic transport');
  const center=genesisWind(0,0,.7);assert.equal(Math.hypot(center.x,center.z),0);
  assert.equal(sampleCloud(field,size,-1,20),0);
});

test('one cloud evolution is deterministic when scrubbing and stays continuous between integration frames',async()=>{
  const {CloudEvolution}=await import('../evolution.ts');const clouds=new CloudEvolution();
  const frame=p=>{const out=new Uint8Array(clouds.size**2*4);clouds.write(p,out);return out;};
  const mid=frame(.5),end=frame(1),again=frame(.5),start=frame(0),near=frame(.5001);
  assert.deepEqual(mid,again,'rewinding reproduces exactly the same evolved state');
  let maxDelta=0,nonlinear=0,change=0;
  for(let i=0;i<mid.length;i+=4){maxDelta=Math.max(maxDelta,Math.abs(mid[i]-near[i]));nonlinear+=Math.abs(mid[i]-(start[i]+end[i])/2);change+=Math.abs(start[i]-end[i]);}
  assert.ok(maxDelta<=2,'neighboring instants have no whole-field switch');
  assert.ok(nonlinear/(mid.length/4)>12,'the middle is not a linear blend of initial and mature images');
  assert.ok(change/(mid.length/4)>20,'formation changes spatial organization');clouds.dispose();
});
