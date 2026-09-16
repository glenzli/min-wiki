import test from 'node:test';import assert from 'node:assert/strict';
import {initialState,advance,makeTimeline,sampleTimeline,refrigerantState,AIR_CAPACITY,FOOD_CAPACITY} from '../model.ts';
test('inside energy and rejected heat conserve energy through door events and cycling',()=>{
 for(const plan of ['closed','visit']){
  const frames=makeTimeline(plan),initial=frames[0];
  for(const s of frames){
   assert.ok(Math.abs(s.roomGain-s.removed-s.work)<1e-6);
   const delta=AIR_CAPACITY*(s.air-initial.air)+FOOD_CAPACITY*(s.food-initial.food);
   assert.ok(Math.abs(delta-(s.leaked-s.removed))<1e-6);
   assert.ok(s.air>0&&s.air<=24&&s.food>0&&s.food<=24);
  }
 }
});
test('closed cabinet approaches a cool band and thermostat both starts and stops',()=>{
 const frames=makeTimeline('closed'),end=frames.at(-1);
 assert.ok(end.food<5);assert.ok(frames.some(s=>!s.on));
 assert.ok(frames.slice(-100).every(s=>s.air>1.9&&s.air<4.1));
 assert.ok(frames.some((s,i)=>i>0&&s.on&&!frames[i-1].on));
 assert.ok(Math.abs(end.food-frames.at(-61).food)<.6);
});
test('opening raises heat load continuously and closing permits recovery',()=>{
 const closed=makeTimeline('closed'),visit=makeTimeline('visit');
 const open=sampleTimeline(visit,.54),reference=sampleTimeline(closed,.54),end=visit.at(-1);
 assert.ok(open.air>reference.air+10);assert.ok(open.food>reference.food+5);
 assert.ok(end.food<open.food);assert.ok(end.work>closed.at(-1).work);
 for(let i=1;i<visit.length;i++)assert.ok(Math.abs(visit[i].air-visit[i-1].air)<1);
 assert.ok(end.roomGain-end.leaked>0);
});
test('zero elapsed time does not change temperatures; added electrical work heats the combined system',()=>{
 assert.deepEqual(advance(initialState(),0,'visit'),initialState());
 const s=makeTimeline('visit').at(-1),a=initialState();
 const stored=AIR_CAPACITY*(s.air-a.air)+FOOD_CAPACITY*(s.food-a.food);
 assert.ok(Math.abs(stored+s.roomGain-s.leaked-s.work)<1e-6);
});
test('refrigerant phase description closes the loop without consuming fluid',()=>{
 assert.equal(refrigerantState(0).vapor,refrigerantState(1).vapor);
 assert.equal(refrigerantState(0).highPressure,refrigerantState(1).highPressure);
 for(let i=0;i<=1000;i++){
  const s=refrigerantState(i/1000);assert.ok(s.vapor>=0&&s.vapor<=1);assert.ok(s.highPressure>=0&&s.highPressure<=1);
 }
 assert.equal(refrigerantState(.4).vapor,1);assert.equal(refrigerantState(.75).vapor,0);
});

test('the drawn circuit closes continuously without doubled-back pipe sections',async()=>{
 const {refrigerantPaths,parcelPosition}=await import('../model.ts');
 assert.deepEqual(parcelPosition(0),parcelPosition(1));
 for(const p of [.25,.5,.75]){const a=parcelPosition(p-1e-8),b=parcelPosition(p+1e-8);assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<.001);}
 const edges=refrigerantPaths.flatMap(points=>points.slice(1).map((b,i)=>[points[i],b]));
 for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
  const [[ax,ay],[bx,by]]=edges[i],[[cx,cy],[dx,dy]]=edges[j];
  if(ay===by&&cy===dy&&ay===cy)assert.ok(Math.min(Math.max(ax,bx),Math.max(cx,dx))<=Math.max(Math.min(ax,bx),Math.min(cx,dx)));
  if(ax===bx&&cx===dx&&ax===cx)assert.ok(Math.min(Math.max(ay,by),Math.max(cy,dy))<=Math.max(Math.min(ay,by),Math.min(cy,dy)));
 }
});

test('food heat direction reverses when open-door air becomes warmer than food',async()=>{
 const {foodHeatFlow}=await import('../model.ts');
 assert.ok(foodHeatFlow(initialState())>0);
 const warmAir=sampleTimeline(makeTimeline('visit'),.44);
 assert.ok(warmAir.air>warmAir.food);assert.ok(foodHeatFlow(warmAir)<0);
 assert.ok(advance(warmAir,1,'visit').food>warmAir.food);
 assert.equal(foodHeatFlow({air:12,food:12}),0);
 const coolAir=sampleTimeline(makeTimeline('closed'),.44);assert.ok(foodHeatFlow(coolAir)>0);
});
