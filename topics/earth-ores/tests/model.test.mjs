import test from 'node:test';import assert from 'node:assert/strict';
import {DEFAULT,PROCESSES,parseState,serializeState,progressFor,veinAt,bauxiteAt,placerAt,oreBudget,veinCenter,veinHalfWidth} from '../model.ts';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('bounded routes retain independent path progress and reject malformed numeric, option and camera values',()=>{
 const s=parseState({process:'placer',view:'process',veinProgress:'28',bauxiteProgress:'67.5',placerProgress:'100',flow:'strong',fluid:'poor',evidence:'texture,unknown,texture,analysis',cut:'999',camera:'[4,2,8]'});
 assert.equal(progressFor(s),100);assert.equal(s.veinProgress,28);assert.equal(s.bauxiteProgress,67.5);assert.equal(s.cut,100);assert.deepEqual(s.evidence,['texture','analysis']);assert.deepEqual(parseState(serializeState(s)),s);
 for(const bad of ['1e2','NaN','Infinity','2junk','0x10','-1',' 10'])assert.equal(parseState({cut:bad}).cut,DEFAULT.cut);
 assert.equal(parseState({camera:'[0,0,0]'}).camera,'');assert.equal(parseState({camera:'[99,0,0]'}).camera,'');assert.equal(parseState({process:'invented'}).process,'vein');
});
test('vein parcels conserve source identities; a sealed path transports nothing',()=>{
 const first=veinAt({...DEFAULT,veinProgress:0});
 for(const progress of [0,23,57,100]){const s=veinAt({...DEFAULT,veinProgress:progress});assert.equal(s.parcels.length,36);assert.deepEqual(s.parcels.map(p=>p.id),first.parcels.map(p=>p.id));assert.equal(s.parcels.filter(p=>p.kind==='metal').length,8);}
 const blocked=veinAt({...DEFAULT,veinProgress:100,fracture:'sealed'});assert.ok(blocked.parcels.every(p=>p.phase==='source'));near(blocked.quartz,0);near(blocked.sulfide,0);
});
test('quartz can form with a metal-poor supply without turning metal tags into silica',()=>{
 const rich=veinAt({...DEFAULT,veinProgress:100}),poor=veinAt({...DEFAULT,veinProgress:100,fluid:'poor'});
 near(rich.quartz,1);near(rich.sulfide,1);near(poor.quartz,1);near(poor.sulfide,0);assert.ok(poor.parcels.filter(p=>p.kind==='metal').every(p=>p.phase==='source'));
});
test('finite vein playback deposits bounded source-batch fractions continuously without changing identities or prerequisites',()=>{
 let previous=veinAt({...DEFAULT,veinProgress:0});const observed=new Set();
 for(let progress=0;progress<=100;progress+=.5){
  const next=veinAt({...DEFAULT,veinProgress:progress});observed.add(next.quartz.toFixed(4));
  near(next.quartz,next.parcels.filter(p=>p.kind==='silica').reduce((sum,p)=>sum+p.depositedFraction,0)/28);
  assert.ok(next.quartz>=previous.quartz&&next.sulfide>=previous.sulfide);
  for(let i=0;i<36;i++){const p=next.parcels[i];assert.equal(p.id,previous.parcels[i].id);assert.ok(p.depositedFraction>=0&&p.depositedFraction<=1);assert.ok(p.depositedFraction>=previous.parcels[i].depositedFraction);if(p.phase==='source')near(p.depositedFraction,0);if(p.phase==='deposit')near(p.depositedFraction,1);}
  near(next.parcels.reduce((sum,p)=>sum+p.depositedFraction+(1-p.depositedFraction),0),36);
  for(const condition of [{fracture:'sealed'},{fluid:'poor'}]){const other=veinAt({...DEFAULT,...condition,veinProgress:progress});near(other.sulfide,0);if(condition.fracture)near(other.quartz,0);}
  previous=next;
 }
 assert.ok(observed.size>30,'deposition must progress through intermediate states rather than only jumping at the endpoint');
 const a=veinAt({...DEFAULT,veinProgress:69}),b=veinAt({...DEFAULT,veinProgress:69.001});assert.ok(Math.abs(a.quartz-b.quartz)<.001);
});
test('residual concentration exports mobile tags instead of creating aluminum or discarding other retained components',()=>{
 const start=bauxiteAt({...DEFAULT,bauxiteProgress:0}),end=bauxiteAt({...DEFAULT,bauxiteProgress:100});
 assert.equal(start.al,12);assert.equal(end.al,12);assert.equal(end.exported,12);assert.equal(end.remaining,18);assert.ok(end.relativeShare>start.relativeShare);assert.equal(end.exported+end.remaining,30);
 assert.ok(end.tags.filter(t=>t.exported).every(t=>t.kind==='mobile'));assert.equal(end.tags.filter(t=>t.kind==='residual'&&!t.exported).length,6);
 assert.deepEqual(start.tags.map(p=>p.id),end.tags.map(p=>p.id));
});
test('weak reaction or restricted export does not produce the same residual result',()=>{
 for(const settings of [{weathering:'weak',drainage:'flushed'},{weathering:'intense',drainage:'closed'}]){const s=bauxiteAt({...DEFAULT,...settings,bauxiteProgress:100});assert.equal(s.exported,0);assert.equal(s.remaining,30);assert.equal(s.al,12);}
});
test('placer sorting needs liberation and produces distinct weak, selective and strong-flow outcomes',()=>{
 const locked=placerAt({...DEFAULT,placerProgress:100,liberation:'locked'});assert.ok(locked.grains.every(g=>g.status==='source'));
 const weak=placerAt({...DEFAULT,placerProgress:100,flow:'weak'}),sorted=placerAt({...DEFAULT,placerProgress:100,flow:'sorting'}),strong=placerAt({...DEFAULT,placerProgress:100,flow:'strong'});
 assert.equal(weak.trapped,0);assert.equal(weak.exported,0);assert.equal(sorted.trapped,6);assert.equal(sorted.heavyTrapped,6);assert.equal(sorted.exported,18);assert.equal(strong.trapped,0);assert.equal(strong.exported,24);
 for(const snapshot of [weak,sorted,strong,locked]){assert.equal(snapshot.grains.length,24);assert.equal(new Set(snapshot.grains.map(g=>g.id)).size,24);assert.equal(snapshot.grains.filter(g=>g.kind==='cassiterite').length,6);}
});
test('scrubbing any process backward and forward reproduces geometry and provenance',()=>{
 for(const process of PROCESSES){const fn=process==='vein'?veinAt:process==='bauxite'?bauxiteAt:placerAt,key=process==='vein'?'veinProgress':process==='bauxite'?'bauxiteProgress':'placerProgress';const s={...DEFAULT,[key]:54};const before=fn(s);fn({...s,[key]:100});fn({...s,[key]:0});assert.deepEqual(fn(s),before);}
});
test('ideal recovery budget is independent of geological teaching tags and exposes price versus material effects',()=>{
 const b=oreBudget(DEFAULT),rich=oreBudget({...DEFAULT,grade:2}),expensive=oreBudget({...DEFAULT,price:16});near(b.recovered+b.residue,1000);near(b.recovered,8);near(rich.recovered,16);near(expensive.recovered,b.recovered);assert.ok(b.balance<0);assert.ok(rich.balance>0);assert.ok(expensive.balance>b.balance);
});
test('fracture field remains deterministic, continuous and bounded across cut depths',()=>{
 for(let y=-1.3;y<=1.3;y+=.1)for(let z=-.7;z<=.9;z+=.1){assert.ok(Math.abs(veinCenter(y,z))<=.23);assert.ok(veinHalfWidth(y,z)>.09&&veinHalfWidth(y,z)<.17);assert.equal(veinCenter(y,z),veinCenter(y,z));assert.ok(Math.abs(veinCenter(y,z+.001)-veinCenter(y,z))<.001);}
});
