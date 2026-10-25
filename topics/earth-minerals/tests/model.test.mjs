import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STATE, EVIDENCE, MINERALS, QUARTZ_CLUSTER, parseState, serializeState, growthAt, quartzGrowthAt, evidenceResult, oreBudget, graphiteOffset } from '../model.ts';
import { diamondNetwork, graphiteSheet, parseCamera } from '../geometry.ts';
const near = (a,b,t=1e-9) => assert.ok(Math.abs(a-b)<t,`${a} differs from ${b}`);

test('route state accepts whole valid values, bounds quantities, rejects malformed options and camera records', () => {
  const parsed = parseState({ view:'growth', rate:'100', progress:'42.5', supply:'-2', shear:'1e2', grade:'999', specimen:'evil', evidence:'streak,streak,unknown,density', representation:'quartz', camera:'{"position":[5,4,11],"target":[0,0,0]}' });
  assert.equal(parsed.view,'growth');assert.equal(parsed.progress,42.5);assert.equal(parsed.rate,100);
  assert.equal(parsed.supply,DEFAULT_STATE.supply);assert.equal(parsed.shear,DEFAULT_STATE.shear);assert.equal(parsed.grade,5);assert.equal(parsed.specimen,'quartz');
  assert.deepEqual(parsed.evidence,['streak','density']);assert.ok(parsed.camera);
  assert.deepEqual(parseState(serializeState(parsed)),parsed);
  for(const value of ['NaN','Infinity','12junk',' 2','0x10','', '.5']) assert.equal(parseState({rate:value}).rate,DEFAULT_STATE.rate);
  for(const camera of ['{}','{"position":[5,4,null],"target":[0,0,0]}','{"position":[1,0,0],"target":[0,0,0]}','{"position":[4,3,7],"target":[4,0,0]}'])assert.equal(parseCamera(camera),undefined);
});

test('melt: changing cooling rate alters crystal size and the competing glass outcome', () => {
  const slow=growthAt({...DEFAULT_STATE,environment:'melt',rate:0,progress:100}), fast=growthAt({...DEFAULT_STATE,environment:'melt',rate:65,progress:100}), quench=growthAt({...DEFAULT_STATE,environment:'melt',rate:100,progress:100});
  assert.ok(slow.size>fast.size);assert.ok(slow.count<fast.count);near(slow.glass,0);assert.ok(quench.glass>90);assert.equal(quench.condition,'quenched');
  for(let progress=0;progress<=100;progress+=2)for(const rate of [0,30,80,100]){const g=growthAt({...DEFAULT_STATE,environment:'melt',progress,rate});near(g.crystal+g.glass+g.fluid,100);assert.ok(g.crystal>=0&&g.glass>=0&&g.fluid>=0);}
});

test('solutions can remain without crystals, conserve solute and distinguish cooling from water loss', () => {
  const dryLow=growthAt({...DEFAULT_STATE,environment:'hydrothermal',supply:0,progress:100});assert.equal(dryLow.condition,'undersaturated');near(dryLow.crystal,0);
  const cooling=growthAt({...DEFAULT_STATE,environment:'hydrothermal',progress:75});const evaporation=growthAt({...DEFAULT_STATE,environment:'evaporation',progress:75});
  near(cooling.waterFraction,1);assert.ok(evaporation.waterFraction<1);
  for(const environment of ['hydrothermal','evaporation']) for(const supply of [0,30,100])for(let progress=0;progress<=100;progress+=5){const s={...DEFAULT_STATE,environment,supply,progress},g=growthAt(s);near(g.crystal+g.fluid,g.supplied);assert.ok(g.crystal>=0&&g.fluid>=0&&g.capacity>0);assert.deepEqual(growthAt(s),g);}
});

test('snapshot scrubbing returns to the identical state rather than retaining hidden history', () => {
  const input={...DEFAULT_STATE,environment:'hydrothermal',progress:57,rate:67};const first=growthAt(input);growthAt({...input,progress:100});growthAt({...input,progress:0});assert.deepEqual(growthAt(input),first);
});

test('3D quartz keeps five attachment identities and consumes the same reversible solution budget', () => {
  const sample={...DEFAULT_STATE,environment:'hydrothermal',progress:63,rate:35,supply:80};
  const first=quartzGrowthAt(sample);
  assert.deepEqual(first.budget,growthAt(sample));assert.ok(first.share>0&&first.share<1);
  for(let progress=0;progress<=100;progress+=2){
    const frame=quartzGrowthAt({...sample,progress});
    assert.deepEqual(frame.crystals.map(c=>c.id),['A','B','C','D','E']);
    assert.deepEqual(frame.crystals.map(c=>c.base),QUARTZ_CLUSTER.map(c=>c.base));
    for(const crystal of frame.crystals){near(crystal.radiusScale**2*crystal.heightScale,frame.share);assert.equal(crystal.visible,frame.share>.00001);}
  }
  quartzGrowthAt({...sample,progress:100});quartzGrowthAt({...sample,progress:0});assert.deepEqual(quartzGrowthAt(sample),first);
  const low=quartzGrowthAt({...sample,supply:0,progress:100});assert.equal(low.share,0);assert.ok(low.crystals.every(c=>!c.visible));
  const rich=quartzGrowthAt({...sample,supply:100,progress:100});assert.ok(rich.share>first.share);
  for(const environment of ['melt','evaporation']){const frame=quartzGrowthAt({...sample,environment,progress:100});assert.equal(frame.enabled,false);assert.equal(frame.share,0);assert.ok(frame.crystals.every(c=>!c.visible));}
});

test('adding evidence cannot add candidates; density retains quartz and calcite uncertainty overlap', () => {
  for(const m of MINERALS){let previous=6;for(let count=0;count<=EVIDENCE.length;count++){const rows=evidenceResult(m.id,EVIDENCE.slice(0,count)),remaining=rows.filter(r=>!r.contradictions.length);assert.ok(remaining.length<=previous);assert.ok(remaining.some(r=>r.mineral.id===m.id));previous=remaining.length;}}
  const candidates=evidenceResult('quartz',['density']).filter(r=>!r.contradictions.length).map(r=>r.mineral.id);assert.ok(candidates.includes('quartz'));assert.ok(candidates.includes('calcite'));
  const hematite=evidenceResult('hematite',['streak']).filter(r=>!r.contradictions.length);assert.deepEqual(hematite.map(r=>r.mineral.id),['hematite']);
});

test('ore budget retains feed mass and independently exposes grade, recovery and price assumptions', () => {
  const b=oreBudget(DEFAULT_STATE);near(b.recovered,8);near(b.recovered+b.residue,b.feed);near(b.unrecovered+b.recovered,b.metalInFeed);assert.ok(b.balance<0);
  const rich=oreBudget({...DEFAULT_STATE,grade:2});assert.ok(rich.balance>0);near(rich.recovered,2*b.recovered);
  const value=oreBudget({...DEFAULT_STATE,price:16});near(value.recovered,b.recovered);assert.ok(value.balance>b.balance);
  near(graphiteOffset(100,0),-34);near(graphiteOffset(100,2),34);near(graphiteOffset(0,2),0);
});

test('diamond fragment uses the cubic basis and exactly tetrahedral nearest-neighbor bonds', () => {
  const g=diamondNetwork(),degrees=g.points.map((_,i)=>g.edges.filter(e=>e.includes(i)).length);
  assert.equal(g.points.length,64);assert.equal(Math.max(...degrees),4);assert.ok(degrees.filter(d=>d===4).length>15);
  for(const [a,b] of g.edges)near(g.points[a].reduce((s,x,i)=>s+(x-g.points[b][i])**2,0),3);
  const center=degrees.findIndex(d=>d===4);const vectors=g.edges.filter(e=>e.includes(center)).map(e=>g.points[e[0]===center?e[1]:e[0]].map((v,i)=>v-g.points[center][i]));
  for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)near(vectors[a].reduce((s,x,i)=>s+x*vectors[b][i],0)/3,-1/3);
});

test('graphite sheet is a planar honeycomb with three interior neighbors and no duplicate bonds', () => {
  const g=graphiteSheet(),degrees=g.points.map((_,i)=>g.edges.filter(e=>e.includes(i)).length);
  assert.equal(Math.max(...degrees),3);assert.ok(degrees.includes(3));assert.ok(g.points.every(p=>p[1]===0));
  assert.equal(new Set(g.edges.map(e=>e.join(','))).size,g.edges.length);
  for(const [a,b] of g.edges)near(Math.hypot(...g.points[a].map((v,i)=>v-g.points[b][i])),1,1e-6);
});

test('exposure is a reversible display mask that retains the cluster anchor and scale', async () => {
  const { exposureAt }=await import('../model.ts');
  const natural=exposureAt(0),half=exposureAt(50),display=exposureAt(100);
  assert.ok(natural.surroundOpacity>half.surroundOpacity);assert.ok(half.surroundOpacity>display.surroundOpacity);assert.ok(natural.surroundOpacity<1);assert.equal(display.surroundOpacity,0);
  assert.deepEqual(natural.anchor,display.anchor);assert.equal(natural.crystalScale,display.crystalScale);
  assert.deepEqual(exposureAt(50),half);assert.equal(exposureAt(-20).opened,0);assert.equal(exposureAt(150).opened,1);
  const state=parseState({occurrence:'grain',exposure:'43',finish:'cut'});assert.equal(state.occurrence,'grain');assert.equal(state.exposure,43);assert.equal(state.finish,'cut');assert.deepEqual(parseState(serializeState(state)),state);
});

test('cavity crystals attach to the wall and point into the cavity rather than through host rock', async () => {
  const { cavityLining }=await import('../model.ts');
  const cx=193,cy=148,rx=92,ry=66;
  for(const p of cavityLining(13,cx,cy,rx,ry)){
    near(((p.x-cx)/rx)**2+((p.y-cy)/ry)**2,1);
    const a=p.rotation*Math.PI/180,tip=[Math.sin(a),-Math.cos(a)];
    assert.ok(tip[0]*(cx-p.x)+tip[1]*(cy-p.y)>0,'tip must face the interior');
    near(tip[0]*(cy-p.y)-tip[1]*(cx-p.x),0,1e-8);
  }
});
