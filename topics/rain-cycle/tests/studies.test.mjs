import test from 'node:test';
import assert from 'node:assert/strict';
import { StudySlot } from '../studies.ts';
function deferred() { let resolve, reject; const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}; }
function fixture() { const activity=[];let disposed=0;return {activity,get disposed(){return disposed},study:{setActive:v=>activity.push(v),dispose:()=>disposed++}}; }
test('late imports do not mount in an inactive window; returning mounts once', async () => {
  const job=deferred(), f=fixture();let mounts=0,loads=0;const states=[];
  const slot=new StudySlot(()=>{loads++;return job.promise},s=>states.push(s));
  const first=slot.setActive(true);void slot.setActive(true);await slot.setActive(false);
  job.resolve(()=>{mounts++;return f.study});await first;assert.equal(mounts,0);assert.equal(loads,1);
  await slot.setActive(true);await slot.setActive(true);assert.equal(mounts,1);assert.equal(loads,2);
  await slot.setActive(false);await slot.setActive(true);assert.deepEqual(f.activity,[true,false,true]);
  assert.equal(mounts,1);assert.equal(states.at(-1),'ready');slot.dispose();slot.dispose();assert.equal(f.disposed,1);
});
test('departure rejects late mount and subsequent activation', async () => {
  const job=deferred();let mounts=0;const states=[];const slot=new StudySlot(()=>job.promise,s=>states.push(s));
  const pending=slot.setActive(true);slot.dispose();job.resolve(()=>{mounts++;return fixture().study});await pending;
  await slot.setActive(true);assert.equal(mounts,0);assert.deepEqual(states,['loading']);
});
test('failure is visible, sticky across draws and explicitly retryable', async () => {
  let attempts=0;const f=fixture(),states=[];
  const slot=new StudySlot(async()=>{if(++attempts===1)throw Error('offline');return ()=>f.study},s=>states.push(s));
  await slot.setActive(true);await slot.setActive(true);assert.equal(attempts,1);assert.equal(states.at(-1),'error');
  await slot.retry();assert.equal(attempts,2);assert.deepEqual(states,['loading','error','loading','ready']);slot.dispose();
});
test('a synchronous mounting failure follows the same retry policy', async () => {
  let attempts=0;const states=[],f=fixture();const slot=new StudySlot(async()=>()=>{if(++attempts===1)throw Error('canvas unavailable');return f.study},s=>states.push(s));
  await slot.setActive(true);assert.equal(states.at(-1),'error');await slot.retry();assert.equal(states.at(-1),'ready');slot.dispose();
});
test('a synchronously throwing loader can still be retried', async () => {
  let attempts=0;const f=fixture(),states=[];
  const slot=new StudySlot(()=>{if(++attempts===1)throw Error('loader unavailable');return Promise.resolve(()=>f.study)},s=>states.push(s));
  await slot.setActive(true);await slot.retry();assert.equal(attempts,2);assert.equal(states.at(-1),'ready');slot.dispose();
});
test('a mounted study that fails activation is disposed before retry', async () => {
  const f=fixture(),states=[];let disposed=0,attempts=0;
  const slot=new StudySlot(async()=>()=>++attempts===1?{setActive(){throw Error('activation failed')},dispose(){disposed++}}:f.study,s=>states.push(s));
  await slot.setActive(true);assert.equal(disposed,1);assert.equal(states.at(-1),'error');
  await slot.retry();assert.equal(states.at(-1),'ready');assert.deepEqual(f.activity,[true]);slot.dispose();
});
