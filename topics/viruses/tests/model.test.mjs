import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleCycle, cameraFor, PHAGE_SCALE } from '../model.ts';
import { sceneMarkup, drawCycle } from '../scene.ts';

const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const points = s => [s.phage,...s.genome,...s.offspring.flatMap(c=>[c,...c.genome])];

test('host barriers prevent entry or replication instead of merely hiding successful offspring',()=>{
 for(let p=0;p<=7;p+=.05){
  const mismatch=sampleCycle(p,'mismatch'), defended=sampleCycle(p,'defended');
  assert.ok(mismatch.progress<=1);assert.equal(mismatch.entry,0);assert.equal(mismatch.contraction,0);
  assert.ok(mismatch.genome.every(v=>v.y<270));
  assert.ok(defended.progress<=2);
  for(const s of [mismatch,defended]){assert.equal(s.opening,0);assert.ok(s.offspring.every(c=>c.birth===0&&c.release===0));}
 }
 const end=sampleCycle(2,'defended');assert.equal(end.entry,1);assert.equal(end.defense,1);assert.ok(end.genome.every(p=>p.y>=325));
});

test('one strand moves out of the original head and through the tail, without a phase-boundary jump',()=>{
 const initial=sampleCycle(0,'compatible'), end=sampleCycle(2,'compatible');
 assert.equal(initial.genome.length,96);assert.equal(end.genome.length,96);
 assert.ok(initial.genome.every(p=>p.y<=initial.phage.y+51*PHAGE_SCALE));
 assert.ok(end.genome.every(p=>p.y>=325));
 const mid=sampleCycle(1.65,'compatible');
 assert.ok(mid.genome.some(p=>p.y<mid.phage.y+40*PHAGE_SCALE));
 assert.ok(mid.genome.some(p=>p.y>290));
 for(const p of [0,1,1.32,1.34,2,2.85,3,3.08,3.1,3.67,3.7,4,4.04,4.3,4.35,4.8,5]){
  const before=points(sampleCycle(p-1e-5,'compatible')),after=points(sampleCycle(p+1e-5,'compatible'));
  assert.equal(before.length,after.length);
  assert.ok(before.every((v,i)=>dist(v,after[i])<.15),`all existing geometry stays continuous around ${p}`);
 }
});

test('assembled offspring fit inside the intact cell and release only through the open region',()=>{
 const geometry=[[0,-61],[35,-40],[35,25],[0,49],[-35,25],[-35,-40],[-67,145],[67,145],[-36,148],[36,148]];
 for(let p=2.8;p<=4.001;p+=.05)for(const c of sampleCycle(p,'compatible').offspring)for(const [i,vertex]of geometry.entries()){
  let [x,y]=vertex;if(i>=6){x+=(c.id%2?1:-1)*58*(1-c.join);y-=12*(1-c.join);}
  const a=c.angle*Math.PI/180,px=c.x+PHAGE_SCALE*(x*Math.cos(a)-y*Math.sin(a)),py=c.y+PHAGE_SCALE*(x*Math.sin(a)+y*Math.cos(a));
  assert.ok(Math.hypot(px-Math.max(295,Math.min(685,px)),py-395)<=107.5,`${p}: child ${c.id} part stays inside membrane`);
 }
 for(let p=4;p<=5;p+=.002){const s=sampleCycle(p,'compatible');for(const child of s.offspring){
  if(child.release>0)assert.equal(s.opening,1);
  if(child.y>=268&&child.y<=294&&child.release>0)assert.ok(child.x>400&&child.x<625,'exit passes through opened top envelope');
  for(const [x,y] of geometry){
   const a=child.angle*Math.PI/180,px=child.x+PHAGE_SCALE*(x*Math.cos(a)-y*Math.sin(a)),py=child.y+PHAGE_SCALE*(x*Math.sin(a)+y*Math.cos(a));
   if(py>=271&&py<=294&&px>=295&&px<=685)assert.ok(px>=392&&px<=629,'head and tail endpoints also avoid intact envelope');
  }
 }}
 assert.ok(sampleCycle(4,'compatible').offspring.every(c=>c.join===1&&c.packaging===1&&c.birth===1));
 assert.ok(sampleCycle(5,'compatible').offspring.every(c=>c.release===1));
});

test('SVG frames address stable structural nodes and never generate non-finite attributes',()=>{
 const ids=new Set([...sceneMarkup().matchAll(/id="([^"]+)"/g)].map(m=>m[1]));ids.add('virus-diagram');
 for(const host of ['compatible','mismatch','defended'])for(let p=0;p<=5;p+=.025){
  const s=sampleCycle(p,host);for(const view of ['whole','attachment','inside'])drawCycle(s,cameraFor(view,s),(id,attrs)=>{
   assert.ok(ids.has(id),id);assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(attrs)),`${host}:${p}:${id}`);
  });
 }
});
