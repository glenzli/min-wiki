import test from 'node:test';
import assert from 'node:assert/strict';
import { MessageJourney, TOTAL_STEPS, stationForPosition } from '../model.ts';
test('a sender without access keeps all parts local; seek never bypasses the missing first link', () => {
 const m = new MessageJourney(); m.configure({senderOnline:false}); m.seek(TOTAL_STEPS);
 assert.equal(m.state.completedSteps,0); assert.equal(m.status,'pending'); assert.equal(m.blockedAt,'sender');
 assert.deepEqual(m.state.parts.map(p=>[p.id,p.hop,p.station]),[[1,0,null],[2,0,null],[3,0,null]]);
 m.play(); for(let i=0;i<20;i++)m.tick(.1); assert.equal(m.state.completedSteps,0);
});
test('network and recipient gates stop parts before the unavailable edge; no direct-phone bypass', () => {
 for(const [change,stop,block] of [[{backboneOnline:false},1,'network'],[{receiverOnline:false},5,'receiver']] as const){
 const m=new MessageJourney();m.configure(change);m.seek(TOTAL_STEPS);assert.equal(m.state.completedSteps,stop);assert.equal(m.blockedAt,block);assert.equal(m.status,'travelling');assert.equal(m.markRead(),false);
 m.configure({backboneOnline:true,receiverOnline:true});m.seek(TOTAL_STEPS);assert.equal(m.status,'delivered');assert.ok(m.state.parts.every(p=>p.hop===6));
 }
});
test('all numbered parts traverse every edge and must arrive before complete message or read state', () => {
 const m=new MessageJourney();for(let i=0;i<TOTAL_STEPS;i++){assert.equal(m.state.completedSteps,i);assert.equal(m.markRead(),false);assert.equal(m.step(),true);const s=m.state;assert.equal(s.parts.reduce((n,p)=>n+p.hop,0),i+1);assert.deepEqual(s.parts.map(p=>p.id),[1,2,3]);assert.ok(s.parts.every(p=>p.hop>=0&&p.hop<=6));}
 assert.equal(m.status,'delivered');assert.equal(m.markRead(),true);assert.equal(m.status,'read');assert.equal(m.step(),false);
});
test('moving the sender changes only the route of parts not yet launched', () => {
 const m=new MessageJourney();m.step();assert.equal(m.state.parts[0]!.station,'a');m.configure({position:90});m.seek(7);assert.equal(m.state.parts[0]!.station,'a');assert.equal(m.state.parts[1]!.station,'b');assert.equal(m.state.parts[2]!.station,null);
 m.configure({senderOnline:false});m.seek(12);assert.equal(m.state.completedSteps,12);m.step();assert.equal(m.state.completedSteps,12);m.configure({senderOnline:true});m.seek(18);assert.equal(m.state.parts[2]!.station,'b');
});
test('rewind and replay retain identity and path; condition edits branch rather than rewrite completed hops', () => {
 const m=new MessageJourney();m.seek(11);const middle=m.state;m.seek(2);m.seek(11);assert.deepEqual(m.state,middle);m.seek(4);m.configure({backboneOnline:false});assert.equal(m.recordedSteps,4);m.seek(18);assert.equal(m.state.completedSteps,4);assert.equal(m.state.parts[0]!.station,'a');m.configure({backboneOnline:true});m.seek(11);assert.deepEqual(m.state,middle);
});
test('pause, reset and invalid/extreme inputs remain finite and deterministic', () => {
 const m=new MessageJourney();m.play();for(let i=0;i<10;i++)m.tick(.1);assert.equal(m.state.completedSteps,1);m.pause();const paused=m.state;for(let i=0;i<30;i++)m.tick(1);assert.deepEqual(m.state,paused);
 m.play();m.tick(100);assert.equal(m.state.completedSteps,1);m.seek(999);assert.equal(m.state.completedSteps,18);m.seek(NaN);assert.equal(m.state.completedSteps,0);m.seek(-9);assert.equal(m.state.completedSteps,0);m.reset();assert.equal(m.recordedSteps,0);assert.equal(m.status,'pending');assert.equal(m.playing,false);
 assert.equal(stationForPosition(-10),'a');assert.equal(stationForPosition(1000),'b');assert.equal(stationForPosition(NaN),'a');
});
test('replay restores recorded conditions, while editing an earlier frame creates a genuinely blocked new route',()=>{
 const m=new MessageJourney();m.seek(18);m.configure({receiverOnline:false,position:90});assert.equal(m.status,'delivered');m.seek(0);assert.equal(m.conditions.receiverOnline,true);assert.equal(m.conditions.position,10);m.seek(18);assert.equal(m.conditions.receiverOnline,false);assert.equal(m.conditions.position,90);
 m.seek(0);m.configure({receiverOnline:false});m.seek(18);assert.equal(m.state.completedSteps,5);assert.equal(m.status,'travelling');assert.equal(m.blockedAt,'receiver');
 const n=new MessageJourney();n.seek(18);n.seek(17);n.play();for(let i=0;i<10;i++)n.tick(.1);assert.equal(n.state.completedSteps,18);assert.equal(n.playing,false);
});
