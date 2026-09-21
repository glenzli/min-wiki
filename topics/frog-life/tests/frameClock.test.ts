import test from 'node:test';
import assert from 'node:assert/strict';
import { browserFrameClock, type AnimationHost } from '../frameClock.ts';
import { MetamorphosisController } from '../controller.ts';

test('production browser adapter retains strict Window and Performance receivers for every callback',()=>{
  let next=0,time=0;
  const pending=new Map<number,(time:number)=>void>();
  const performance={now(){assert.equal(this,performance);return time;}};
  const host:AnimationHost={
    performance,
    requestAnimationFrame(callback){assert.equal(this,host);pending.set(++next,callback);return next;},
    cancelAnimationFrame(id){assert.equal(this,host);pending.delete(id);},
  };
  const controller=new MetamorphosisController('',browserFrameClock(host));
  // The actual click paths that failed in a browser first call cancellation.
  controller.setChapter('butterfly');controller.setButterflyStage(3);controller.play();
  assert.equal(pending.size,1);time=50;const callback=[...pending.values()][0]!;pending.clear();callback(time);
  assert.ok(controller.read().butterfly.wing>0);controller.setChapter('frog');assert.equal(pending.size,0);
  controller.play();assert.equal(pending.size,1);controller.pause();assert.equal(pending.size,0);
  controller.play();controller.dispose();assert.equal(pending.size,0);
});
