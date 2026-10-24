import test from 'node:test';
import assert from 'node:assert/strict';
import {FrameRender} from '../frameRender.ts';
function frames(){let next=0;const pending=new Map(),cancelled=[];return {pending,cancelled,request(fn){pending.set(++next,fn);return next;},cancel(id){cancelled.push(id);pending.delete(id);},flush(){const batch=[...pending.values()];pending.clear();batch.forEach(fn=>fn(0));}};}
test('camera and model bursts present once using the newest retained state, then stay idle',()=>{
  const clock=frames(),drawn=[];let state=0;const render=new FrameRender(()=>drawn.push(state),clock);
  for(let i=0;i<50;i++){state=i;render.request();}assert.equal(clock.pending.size,1);assert.deepEqual(drawn,[]);
  clock.flush();assert.deepEqual(drawn,[49]);assert.equal(clock.pending.size,0);clock.flush();assert.equal(drawn.length,1);
  state=60;render.request();clock.flush();assert.deepEqual(drawn,[49,60]);render.dispose();
});
test('an invalidation during presentation schedules the following frame without being lost',()=>{
  const clock=frames();let count=0;const render=new FrameRender(()=>{if(++count===1)render.request();},clock);
  render.request();clock.flush();assert.equal(count,1);assert.equal(clock.pending.size,1);clock.flush();assert.equal(count,2);render.dispose();
});
test('teardown cancels pending GPU use and rejects an already delivered stale callback',()=>{
  const clock=frames();let count=0;const render=new FrameRender(()=>count++,clock);render.request();const stale=[...clock.pending.values()][0];
  render.dispose();render.dispose();stale(0);render.request();assert.equal(count,0);assert.equal(clock.pending.size,0);assert.equal(clock.cancelled.length,1);
});
