import test from 'node:test';
import assert from 'node:assert/strict';
import { MetamorphosisController, type FrameClock } from '../controller.ts';
import { metamorphosisDestination, readMetamorphosisRoute, frogObservation } from '../metamorphosisModel.ts';
import { growthState } from '../model.ts';

class Clock implements FrameClock {
  time=0;id=0;pending=new Map<number,(time:number)=>void>();
  request=(callback:(time:number)=>void)=>{const id=++this.id;this.pending.set(id,callback);return id;};
  cancel=(id:number)=>{this.pending.delete(id);};
  now=()=>this.time;
  tick(ms=100){this.time+=ms;const callbacks=[...this.pending.values()];this.pending.clear();for(const cb of callbacks)cb(this.time);}
  finish(){let steps=0;while(this.pending.size){this.tick();assert.ok(++steps<400,'playback must be finite');}}
}
function setup(search=''){const clock=new Clock(),controller=new MetamorphosisController(search,clock);return {clock,controller};}

test('full butterfly growth is finite and comparison playback preserves the other animal',()=>{
  const {controller:c,clock}=setup('?chapter=compare&growth=2.7');c.playGrowth('butterfly');clock.finish();
  assert.equal(c.read().butterfly.growth,4);assert.equal(c.read().butterfly.stage,3);assert.equal(c.read().butterfly.wing,1);assert.equal(c.read().frog.progress,2.7);assert.equal(c.read().playing,null);
  c.playGrowth('butterfly');assert.equal(c.read().butterfly.growth,0);clock.tick();const b=c.read().butterfly.growth;
  const stale=[...clock.pending.values()][0]!;c.playGrowth('frog');stale(90000);clock.tick();assert.equal(c.read().butterfly.growth,b);assert.equal(clock.pending.size,1);c.pause();
});
test('butterfly scrubbing and reverse review remain deterministic and cancel playback',()=>{
  const {controller:c,clock}=setup();c.playGrowth('butterfly');const stale=[...clock.pending.values()][0]!;
  c.setButterflyGrowth(3.45);stale(1000);assert.equal(c.read().butterfly.stage,3);assert.ok(Math.abs(c.read().butterfly.wing-.45)<1e-12);assert.equal(clock.pending.size,0);
  c.setButterflyGrowth(1.4);assert.equal(c.read().butterfly.stage,1);c.setButterflyGrowth(3.45);assert.equal(c.read().butterfly.growth,3.45);
  for(const value of [NaN,Infinity,-Infinity]){c.setButterflyGrowth(value);assert.equal(c.read().butterfly.growth,0);}
});
test('reduced-motion full growth advances a landmark without scheduling',()=>{
  const {controller:c,clock}=setup('?chapter=compare');c.setReducedMotion(true);c.playGrowth('butterfly');assert.equal(c.read().butterfly.growth,1);c.playGrowth('butterfly');assert.equal(c.read().butterfly.growth,2);assert.equal(c.read().frog.progress,0);assert.equal(clock.pending.size,0);
});

test('real controller keeps independent observation histories through all chapters',()=>{
  const {controller:c}=setup();c.setFrogProgress(2.73);c.setView('frog','detail');c.setChapter('butterfly');c.setButterflyStage(3);c.setWingProgress(.53);c.setPeek(true);c.setView('butterfly','detail');
  const before=c.read();c.setChapter('compare');c.setAspect('breathing');c.setChapter('frog');
  assert.deepEqual(c.read().frog,before.frog);assert.deepEqual(c.read().butterfly,before.butterfly);
  c.setChapter('butterfly');c.setButterflyStage(1);c.setButterflyStage(3);assert.equal(c.read().butterfly.wing,.53);assert.equal(c.read().butterfly.peek,true);
});
test('reading lens and camera changes never restart the actual clock',()=>{
  const {controller:c,clock}=setup('?growth=2');c.play();clock.tick();const p=c.read().frog.progress;c.setAspect('food');c.setView('frog','detail');assert.equal(c.read().frog.progress,p);assert.equal(c.read().playing,'frog');assert.equal(clock.pending.size,1);clock.tick();assert.ok(c.read().frog.progress>p);c.dispose();
});
test('finite frog playback reaches its endpoint and replay starts only on user action',()=>{
  const {controller:c,clock}=setup();assert.equal(clock.pending.size,0);c.play();clock.finish();assert.equal(c.read().frog.progress,4);assert.equal(c.read().playing,null);assert.equal(clock.pending.size,0);clock.tick(60000);assert.equal(c.read().frog.progress,4);c.play();assert.equal(c.read().frog.progress,0);assert.equal(c.read().playing,'frog');c.pause();
});
test('chapter change cancels scheduled work; even a captured stale callback cannot write',()=>{
  const {controller:c,clock}=setup();c.play();const stale=[...clock.pending.values()][0]!;c.setChapter('butterfly');const after=c.read();assert.equal(clock.pending.size,0);stale(12000);assert.deepEqual(c.read(),after);assert.equal(clock.pending.size,0);
});
test('scrubbing cancels the old generation without overwriting the new position',()=>{
  const {controller:c,clock}=setup('?growth=1');c.play();const stale=[...clock.pending.values()][0]!;c.setFrogProgress(3.14);stale(4000);assert.equal(c.read().frog.progress,3.14);assert.equal(c.read().playing,null);assert.equal(clock.pending.size,0);
});
test('pause for hidden page preserves state and resuming does not catch up hidden time',()=>{
  const {controller:c,clock}=setup('?chapter=butterfly&stage=3&wing=.2');c.play();clock.tick();c.pause();const p=c.read().butterfly.wing;clock.tick(60000);assert.equal(c.read().butterfly.wing,p);c.play();clock.tick();assert.ok(c.read().butterfly.wing-p<.01);c.pause();
});
test('wing playback is finite and unavailable in egg, larva, pupa and comparison chapters',()=>{
  const {controller:c,clock}=setup('?chapter=butterfly');for(const stage of [0,1,2]){c.setButterflyStage(stage);c.play();assert.equal(clock.pending.size,0);}c.setButterflyStage(3);c.play();clock.finish();assert.equal(c.read().butterfly.wing,1);assert.equal(c.read().playing,null);c.setWingProgress(.4);c.setChapter('compare');c.play();assert.equal(c.read().butterfly.wing,.4);assert.equal(clock.pending.size,0);
});
test('reduced motion uses discrete observations with no outstanding frame',()=>{
  const {controller:c,clock}=setup();c.setReducedMotion(true);c.play();assert.equal(c.read().frog.progress,1);c.stepFrog(1);assert.equal(c.read().frog.progress,2);c.setChapter('butterfly');c.setButterflyStage(3);c.play();assert.equal(c.read().butterfly.wing,.25);assert.equal(clock.pending.size,0);c.setReducedMotion(false);c.play();assert.equal(clock.pending.size,1);c.setReducedMotion(true);assert.equal(clock.pending.size,0);assert.equal(c.read().playing,null);
});
test('comparison presets change observations explicitly without resetting wing and peek history',()=>{
  const {controller:c,clock}=setup('?chapter=butterfly&stage=3&wing=.7&peek=1');c.play();c.comparePair('remodeling');assert.equal(c.read().chapter,'compare');assert.equal(c.read().frog.progress,2.8);assert.equal(c.read().butterfly.stage,2);assert.equal(c.read().butterfly.wing,.7);assert.equal(c.read().butterfly.peek,true);assert.equal(clock.pending.size,0);c.comparePair('after');assert.equal(c.read().frog.progress,4);assert.equal(c.read().butterfly.stage,3);
});
test('dispose cancels real scheduling and rejects stale callbacks and further actions',()=>{
  const {controller:c,clock}=setup();let updates=0;c.subscribe(()=>updates++);c.play();const stale=[...clock.pending.values()][0]!;c.dispose();const state=c.read(),count=updates;c.setFrogProgress(3);c.setChapter('compare');c.play();stale(9999);assert.deepEqual(c.read(),state);assert.equal(updates,count);assert.equal(clock.pending.size,0);
});
test('snapshots are detached; invalid numeric observations remain finite and bounded',()=>{
  const {controller:c}=setup();const view=c.read();view.frog.progress=99;assert.equal(c.read().frog.progress,0);for(const invalid of [NaN,Infinity,-Infinity]){c.setFrogProgress(invalid);c.setWingProgress(invalid);c.setButterflyStage(invalid);assert.equal(c.read().frog.progress,0);assert.equal(c.read().butterfly.wing,0);assert.equal(c.read().butterfly.stage,0);assert.equal(growthState(invalid).tail,0);}c.setFrogProgress(8);assert.equal(c.read().frog.progress,4);c.setWingProgress(-5);assert.equal(c.read().butterfly.wing,0);assert.equal(frogObservation(3.999),3);
});
test('legacy butterfly route precisely targets its chapter, retaining valid observations and base/lang/hash',()=>{
  const destination=metamorphosisDestination('butterfly','?chapter=frog&stage=2&wing=.73&peek=1&view=detail&aspect=breathing&lang=en&growth=3&bad=x','#pupa','/wiki/');
  const url=new URL(destination,'https://example.test');assert.equal(url.pathname,'/wiki/topics/frog-life/');assert.equal(url.hash,'#pupa');assert.equal(url.searchParams.get('chapter'),'butterfly');assert.equal(url.searchParams.get('lang'),'en');assert.equal(url.searchParams.get('stage'),'2');assert.equal(url.searchParams.get('wing'),'0.73');assert.equal(url.searchParams.get('peek'),'1');assert.equal(url.searchParams.get('view'),'detail');assert.equal(url.searchParams.get('aspect'),'breathing');assert.equal(url.searchParams.get('growth'),'3');assert.equal(url.searchParams.get('bad'),'x');
});
test('route defaults reject unknown chapters, lenses and non-finite progress',()=>{
  const route=readMetamorphosisRoute('?chapter=bogus&aspect=bogus&growth=Infinity&stage=-4&wing=NaN&view=bogus');assert.equal(route.chapter,'frog');assert.equal(route.aspect,'structure');assert.equal(route.growth,0);assert.equal(route.stage,0);assert.equal(route.wing,0);assert.equal(route.view,'whole');assert.equal(readMetamorphosisRoute('?stage=9&growth=12&wing=4').stage,3);
});
