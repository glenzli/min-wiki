import test from 'node:test';
import assert from 'node:assert/strict';
import { BODY_IDS, readSelection, descentState, canView, parentOf, SATELLITES, moonPosition, worldFor } from '../explorer/model.ts';
import { INTERIORS } from '../../planet-surfaces/interior.ts';
import bodies from '../explorer/bodies.json' with {type:'json'};
import moons from '../explorer/moons.json' with {type:'json'};

test('deep links reject stale input and preserve valid parent-child exploration',()=>{
  assert.deepEqual(readSelection('?body=earth&view=descent'),{body:'earth',view:'descent'});
  assert.deepEqual(readSelection('?body=__proto__&view=bad'),{body:null,view:'globe'});
  assert.equal(readSelection('?body=sun&view=moons').view,'globe');
  assert.equal(parentOf('moon'),'earth');assert.equal(parentOf('titan'),'saturn');assert.equal(canView('moon','moons'),false);
});
test('every body has bilingual descent stages, and every planet or selected moon reaches an interior center',()=>{
  assert.deepEqual(Object.keys(bodies).sort(),[...BODY_IDS].sort());
  for(const id of BODY_IDS){assert.equal(bodies[id].stages.length,4);for(const stage of bodies[id].stages){assert.ok(stage.title.zh&&stage.title.en&&stage.text.zh&&stage.text.en);}
    if(id!=='sun'){const world=worldFor(id);assert.ok(world);assert.equal(INTERIORS[world.id].layers.at(-1).inner,0);}
  }
});
test('descent is continuous, reversible, finite and never goes below a solid surface',()=>{
  for(const id of BODY_IDS){let previous=Infinity;for(let i=0;i<=1000;i++){const p=i/1000,s=descentState(id,p);assert.ok(s.altitude>0&&s.altitude<=previous);if(i)assert.ok(previous-s.altitude<.023);assert.ok(s.stage>=0&&s.stage<=3);assert.deepEqual(s,descentState(id,p));previous=s.altitude;}
    for(const p of [NaN,Infinity,-Infinity,-3,4])assert.ok(Number.isFinite(descentState(id,p).altitude));
  }
  for(const id of ['jupiter','saturn','uranus','neptune','sun'])assert.equal(descentState(id,1).solid,false);
  for(const id of ['mercury','moon'])assert.equal(descentState(id,1).haze,0);
});
test('satellite motion closes after each physical period and retrograde travel reverses direction',()=>{
  for(const list of Object.values(SATELLITES))for(const [i,moon] of list.entries()){
    assert.ok(moons[moon.id]);const a=moonPosition(moon,i,0),b=moonPosition(moon,i,moon.period);a.forEach((v,k)=>assert.ok(Math.abs(v-b[k])<1e-12));
  }
  const triton=SATELLITES.neptune[0];assert.ok(moonPosition(triton,0,.1)[2]<0);assert.ok(moonPosition(SATELLITES.earth[0],0,.1)[2]>0);
  assert.equal(SATELLITES.mercury,undefined);assert.equal(SATELLITES.venus,undefined);
});

import { siteFor, sitesFor, siteNormal, interiorMotion, interiorParcel } from '../explorer/model.ts';
import { terrainHeight, TerrainPatch } from '../../planet-surfaces/terrain3d.ts';
import * as THREE from 'three';

test('observation sites cover each body, validate stale URLs and retain regional narration',()=>{
  for(const body of BODY_IDS){
    const sites=sitesFor(body);assert.ok(sites.length);assert.equal(new Set(sites.map(s=>s.id)).size,sites.length);
    assert.equal(siteFor(body,'__proto__'),sites[0]);
    for(const site of sites){
      assert.ok(Math.abs(site.latitude)<=90&&Number.isFinite(site.longitude));
      assert.ok(site.name.zh&&site.name.en&&site.description.zh&&site.description.en);
      assert.equal(site.stages.length,4);assert.ok(site.stages.every(s=>s.text.zh&&s.text.en));
      assert.equal(siteFor(body,site.id),site);
    }
  }
  const polar=siteFor('mars','south-cap'),canyon=siteFor('mars','marineris');
  assert.ok(polar.latitude<-80);assert.equal(polar.terrain,'polar');assert.equal(canyon.terrain,'canyon');
  assert.match(polar.stages[3].title.en,/ice|sublimation/i);
  assert.doesNotMatch(siteFor('earth','greenland').stages[3].text.en,/coast/i);
});
test('site coordinates match Three sphere UVs including both poles and longitude wrap',()=>{
  const geometry=new THREE.SphereGeometry(1,32,16),pos=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  for(let i=0;i<pos.count;i++){
    const [x,y,z]=siteNormal((uv.getY(i)-.5)*180,(uv.getX(i)-.5)*360);
    assert.ok(Math.hypot(x-pos.getX(i),y-pos.getY(i),z-pos.getZ(i))<2e-6);
  }
  for(const lat of [-90,90])assert.ok(Math.hypot(...siteNormal(lat,0).map((v,i)=>v-siteNormal(lat,179)[i]))<1e-12);
  geometry.dispose();
});
test('polar ice and canyon relief differ; regional Earth ice and desert never acquire a water plane',()=>{
  const mars=worldFor('mars');
  assert.ok(terrainHeight(mars,0,0,'polar')<terrainHeight(mars,6,0,'polar'));
  assert.ok(terrainHeight(mars,0,0,'canyon')<terrainHeight(mars,9,0,'canyon'));
  assert.notEqual(terrainHeight(mars,4,3,'polar'),terrainHeight(mars,4,3,'canyon'));
  for(const region of ['ice','desert']){
    const patch=new TerrainPatch(worldFor('earth'),region);
    assert.equal(patch.group.children.some(o=>o.material?.userData.liquid),false);
    patch.dispose();
  }
});
test('interior circulation stays inside its layer, with solid and uncertain interiors excluded',()=>{
  assert.equal(interiorMotion('earth',{id:'upper-mantle'}),'mantle');
  assert.equal(interiorMotion('earth',{id:'inner-core'}),'solid');
  assert.equal(interiorMotion('earth',{id:'outer-core'}),'fluid');
  assert.equal(interiorMotion('sun',{id:'radiative'}),'radiation');
  assert.equal(interiorMotion('uranus',{id:'mixture',uncertain:true}),'uncertain');
  for(const [inner,outer] of [[0,.25],[.25,.7],[.7,.96]])for(let cell=0;cell<7;cell++)for(let t=0;t<=100;t++){
    const p=interiorParcel(inner,outer,cell,7,t/100),r=Math.hypot(...p);
    assert.ok(r>inner&&r<outer);const repeat=interiorParcel(inner,outer,cell,7,t/100+1);
    assert.ok(Math.hypot(...p.map((v,i)=>v-repeat[i]))<1e-12);
  }
});

import { RING_BANDS, SATURN_RADIUS_KM, ringPeriodHours, ringPosition, ringView, localRingParticle, legacySaturnMoonTarget } from '../explorer/ringsModel.ts';
test('rings are Saturn-only and legacy satellite routes preserve language',()=>{
  assert.equal(readSelection('?body=saturn&view=rings').view,'rings');
  for(const body of BODY_IDS.filter(id=>id!=='saturn'))assert.equal(canView(body,'rings'),false);
  for(const lang of ['zh','en'])assert.deepEqual(readSelection(legacySaturnMoonTarget('?lang='+lang).split('?')[1]),{body:'saturn',view:'moons'});
  assert.match(legacySaturnMoonTarget('?lang=en&body=jupiter&view=section'),/lang=en/);
  assert.match(legacySaturnMoonTarget('?lang=unknown'),/lang=zh/);
});
test('ring regions are ordered above the planet and the Cassini Division retains material',()=>{
  let end=SATURN_RADIUS_KM;
  for(const b of RING_BANDS){assert.ok(b.inner>=end&&b.outer>b.inner);end=b.outer;}
  const gap=RING_BANDS.find(b=>b.id==='cassini');assert.ok(gap.opacity>0&&gap.opacity<RING_BANDS.find(b=>b.id==='b').opacity);
  assert.deepEqual([0,1/3,2/3,1].map(ringView),['bands','gap','particles','motion']);
  assert.equal(ringView(NaN),'bands');assert.equal(ringView(5),'motion');
});
test('ring tracers share physical periods; inner orbit gains phase and closes sooner',()=>{
  const inner=95000,outer=130000;
  assert.ok(ringPeriodHours(inner)<ringPeriodHours(outer));
  assert.ok(Math.abs(ringPeriodHours(outer)/ringPeriodHours(inner)-(outer/inner)**1.5)<1e-12);
  for(const r of [inner,outer]){const a=ringPosition(r,0),b=ringPosition(r,ringPeriodHours(r));assert.ok(Math.hypot(...a.map((v,i)=>v-b[i]))<1e-12);}
  assert.ok(Math.atan2(ringPosition(inner,.1)[2],ringPosition(inner,.1)[0])>Math.atan2(ringPosition(outer,.1)[2],ringPosition(outer,.1)[0]));
  for(let i=0;i<460;i++){const a=localRingParticle(i,0),b=localRingParticle(i,1e6);assert.equal(a[0],b[0]);assert.equal(a[1],b[1]);assert.ok(Math.abs(b[2])<=3.5);}
});

import { interiorVelocity } from '../explorer/model.ts';
import { InteriorActivity } from '../explorer/interiorActivity.ts';
import fidelity from '../explorer/fidelity.json' with {type:'json'};
test('material transport is confined and does not invent convection in solid or unresolved regions',()=>{
  for(const [inner,outer] of [[.19,.55],[.55,.86],[.86,.97]])for(let i=0;i<80;i++){
    const a=i/80*Math.PI*2;
    for(const r of [inner,outer]){const v=interiorVelocity(inner,outer,r*Math.cos(a),r*Math.sin(a),7);assert.ok(Math.hypot(...v)<1e-10);}
    const r=(inner+outer)/2,v=interiorVelocity(inner,outer,r*Math.cos(a),r*Math.sin(a),7);assert.ok(v.every(Number.isFinite));
  }
  assert.equal(interiorMotion('mars',{id:'inner-core',uncertain:true}),'uncertain');
  assert.equal(interiorMotion('mercury',{id:'outer-core'}),'fluid');
  assert.equal(interiorMotion('uranus',{id:'mixture',uncertain:true}),'uncertain');
  assert.equal(interiorMotion('uranus',{id:'atmosphere',uncertain:true}),'convection');
  const scene=new InteriorActivity('earth',INTERIORS.earth.layers);
  assert.equal(scene.group.children.some(o=>o.isLine||o.isPoints),false);
  const outer=scene.group.children.find(o=>o.material.userData.layer==='outer-core'),inner=scene.group.children.find(o=>o.material.userData.layer==='inner-core');
  assert.equal(outer.material.uniforms.kind.value,2);assert.equal(inner.material.uniforms.kind.value,0);
  scene.update(42,'outer-core');assert.equal(outer.material.uniforms.time.value,42);assert.equal(outer.material.uniforms.selected.value,1);scene.dispose();
});
test('all explored worlds expose bilingual fidelity notes and primary source links',()=>{
  for(const body of BODY_IDS){assert.ok(fidelity[body].note.zh&&fidelity[body].note.en);assert.match(fidelity[body].source,/^https:\/\//);}
  assert.match(fidelity.neptune.note.en,/recalibrated/);
  assert.match(fidelity.earth.note.en,/not live weather/);
});
