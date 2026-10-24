import test from 'node:test';
import assert from 'node:assert/strict';
import { binaryState,tripleState,massCenter,distanceAU,solarObservation,readState,diameterRatio } from '../model.ts';
import {ORBIT_CASES,orbitSystemState} from '../orbitSystems.ts';
import {formationVisual} from '../formationScene.ts';
import {NEBULA_REFERENCES,nebulaReferenceFrom} from '../nebulaModel.ts';
import {nebulaStudy} from '../nebulaStudy.ts';
import { stellarDestination } from '../../sun-star/migration.ts';
import { readFileSync } from 'node:fs';
test('binary center of mass stays fixed for all supported ratios and phases',()=>{for(const q of [.25,.5,1,2,4])for(const phase of [0,.125,.5,.9,22.2]){const p=binaryState(phase,q),center=massCenter(p);assert.ok(Math.hypot(center.x,center.y)<1e-12);assert.ok(Math.abs(Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)-1)<1e-12);}});
test('hierarchical triple preserves identity, inner separation and barycenter',()=>{for(const time of [0,.1,3,12,40]){const p=tripleState(time);assert.equal(p.length,3);assert.ok(Math.hypot(...Object.values(massCenter(p)))<1e-12);assert.ok(Math.abs(Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)-1)<1e-12);assert.deepEqual(tripleState(time),p);}});
test('observer distance keeps physical dimensions independent from angular size',()=>{assert.equal(distanceAU(0),1);assert.equal(distanceAU(1),1000);assert.equal(distanceAU(NaN),1);assert.ok(Math.abs(solarObservation(1).lightTravelSeconds-499)<1);assert.equal(solarObservation(2).relativeIrradiance,.25);assert.equal(diameterRatio(800,1),800);});
test('invalid URL inputs stay finite and legacy Sun route preserves language and hash',()=>{const state=readState('?chapter=missing&distance=Infinity&type=NaN&evolution=Infinity&focus=20');assert.equal(state.chapter,'evolution');assert.equal(state.distance,0);assert.equal(state.type,0);assert.equal(state.evolutionProgress,0);assert.equal(state.anatomyFocus,5);assert.equal(readState('?chapter=sun').chapter,'sun');assert.equal(readState('?chapter=evolution&evolution=0.33333').evolutionProgress,2/6);assert.equal(stellarDestination('?lang=en&distance=0.5','#notes'),'/topics/stars/?lang=en&distance=0.5&chapter=sun#notes');});
test('classic cloud routes restore references and keep legacy defaults bounded',()=>{
 assert.deepEqual(NEBULA_REFERENCES,['orion','pillars','horsehead']);
 for(const value of [null,'','missing','Orion','planetary'])assert.equal(nebulaReferenceFrom(value),'orion');
 for(const search of ['', '?chapter=nebulae', '?chapter=nebulae&nebula=nursery&light=reflection', '?cloud=missing'])assert.equal(readState(search).nebulaReference,'orion');
 for(const reference of NEBULA_REFERENCES){
  assert.equal(nebulaReferenceFrom(reference),reference);
  for(const language of ['zh','en'])for(const chapter of ['nebulae','evolution','anatomy']){
   const restored=readState(`?lang=${language}&chapter=${chapter}&nebula=nursery&cloud=${reference}&light=dark&view=comparison&evolution=0.4&cutaway=1`);
   assert.equal(restored.chapter,chapter);assert.equal(restored.nebulaReference,reference);assert.equal(restored.illumination,'dark');assert.equal(restored.spaceView,false);assert.equal(restored.evolutionProgress,.4);assert.equal(restored.cutaway,true);
  }
 }
});
test('classic references remain independent of illumination and later-life mechanism cases',()=>{
 for(const reference of NEBULA_REFERENCES)for(const nebula of ['nursery','planetary','supernova'])for(const light of ['emission','reflection','dark']){
  const restored=readState(`?chapter=nebulae&nebula=${nebula}&cloud=${reference}&light=${light}`);
  assert.equal(restored.nebulaKind,nebula);assert.equal(restored.nebulaReference,reference);assert.equal(restored.illumination,light);
 }
});
test('classic cloud explanations pair each object with its official image and preserve bilingual limits',()=>{
 const expectedSources={orion:'https://esahubble.org/images/heic0601a/',pillars:'https://esahubble.org/images/heic1501a/',horsehead:'https://esahubble.org/images/heic0105a/'};
 const titles=new Set();
 for(const reference of NEBULA_REFERENCES){
  const study=nebulaStudy('nursery','emission',reference);titles.add(study.title.en);
  assert.equal(study.sources[0].url,expectedSources[reference]);
  assert.match(study.limits.zh,/不是观测得到的三维重建/);assert.match(study.limits.en,/not an observed 3D reconstruction/);
  assert.match(study.limits.zh,/不按真实比例/);assert.match(study.limits.en,/actual-scale/);
  assert.match(study.limits.zh,/不同对象/);assert.match(study.limits.en,/separate objects/);
  assert.match(study.limits.zh,/色彩经过增强/);assert.match(study.limits.en,/enhanced colors/);
  assert.deepEqual(nebulaStudy('planetary','reflection',reference),nebulaStudy('planetary','reflection'));
  assert.deepEqual(nebulaStudy('supernova','dark',reference),nebulaStudy('supernova','dark'));
 }
 assert.equal(titles.size,3);
 const horsehead=nebulaStudy('nursery','dark','horsehead');assert.match(horsehead.evidence.zh,/可见光与近红外/);assert.match(horsehead.evidence.en,/visible and near-infrared/);
});
test('stellar presets and bilingual learning express their model boundaries',()=>{const data=JSON.parse(readFileSync(new URL('../content.json',import.meta.url)));assert.equal(data.types.length,5);assert.equal(data.types[2].mass,data.types[1].mass);assert.ok(data.types[2].radius>data.types[1].radius);assert.ok(data.types[4].temp>data.types[1].temp);assert.ok(data.types[4].radius<data.types[2].radius);assert.ok(data.ui.orbitBoundary.en.includes('not a free three-body'));const l=JSON.parse(readFileSync(new URL('../learning.json',import.meta.url)));for(const language of ['zh','en']){assert.equal(l[language].academic.length,3);assert.equal(l[language].narration.length,4);for(const n of l[language].academic)assert.ok(n.body.length>55);}});
test('curated systems keep their barycenters, star identities and planet hosts while moving',()=>{
 assert.deepEqual(ORBIT_CASES,['circumbinary','circumprimary','hierarchical']);
 for(const kind of ORBIT_CASES)for(const time of [0,.18,1.2,8,39]){
  const system=orbitSystemState(kind,time),center=massCenter(system.stars);
  assert.ok(Math.hypot(center.x,center.y)<1e-11,`${kind} barycenter`);
  assert.deepEqual(system.stars.map(star=>star.id),kind==='hierarchical'?['A','B','C']:['A','B']);
  assert.equal(system.planets.length,kind==='circumbinary'?3:1);
  assert.ok(system.stars[0].mass>system.stars[1].mass);
  if(kind==='circumbinary')assert.ok(system.planets.every(planet=>planet.around==='AB'&&Math.hypot(planet.x,planet.y)>2));
  else {const a=system.stars[0],planet=system.planets[0];assert.equal(planet.around,'A');assert.ok(Math.abs(Math.hypot(planet.x-a.x,planet.y-a.y)-(kind==='hierarchical'?.12:.78))<1e-10);}
  if(kind==='hierarchical'){
   const [a,b,c]=system.stars,inner={x:(a.x*a.mass+b.x*b.mass)/(a.mass+b.mass),y:(a.y*a.mass+b.y*b.mass)/(a.mass+b.mass)};
   assert.ok(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-1)<1e-10);
   assert.ok(Math.abs(Math.hypot(c.x-inner.x,c.y-inner.y)-12)<1e-10);
   assert.ok(a.mass>b.mass&&b.mass>c.mass);
  }
 }
 assert.equal(readState('?chapter=orbits&system=triple').orbitCase,'hierarchical');
 assert.equal(readState('?chapter=orbits&orbit=circumprimary').orbitCase,'circumprimary');
});
test('cloud, disk, outflow and stellar surface overlap continuously at formation handoffs',()=>{
 for(const boundary of [.17,.28,.5,1.03,1.25,1.38,2.04,2.06,2.12]){
  const before=formationVisual(boundary-1e-4),after=formationVisual(boundary+1e-4);
  for(const key of ['compression','core','disk','cloud','jet','surface'])assert.ok(Math.abs(after[key]-before[key])<.01,`${key} at ${boundary}`);
 }
 assert.equal(formationVisual(0).surface,0);
 assert.ok(formationVisual(1).disk>0&&formationVisual(1).core>0);
 assert.equal(formationVisual(2.12).disk,0);
 assert.equal(formationVisual(2.12).surface,1);
});
