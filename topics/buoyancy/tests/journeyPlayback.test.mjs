import test from 'node:test';
import assert from 'node:assert/strict';
import { JourneyPlayback } from '../journeyPlayback.ts';

function rig() {
  let now = 0, id = 0;
  const jobs = new Map(), frames = [];
  const clock = { now: () => now, request: callback => { jobs.set(++id, callback); return id; }, cancel: key => jobs.delete(key) };
  const player = new JourneyPlayback((progress, playing) => frames.push({ progress, playing }), clock);
  return { player, jobs, frames, advance(ms) { now += ms; const callbacks = [...jobs.values()]; jobs.clear(); callbacks.forEach(f => f(now)); } };
}

test('pause, seek, and chapter selection cancel the admitted finite observation', () => {
  const r = rig(); r.player.select(.2, 10); r.player.play(); r.player.play();
  assert.equal(r.jobs.size, 1);
  r.advance(2000); assert.equal(r.player.progress, .4);
  r.player.pause(); assert.equal(r.jobs.size, 0);
  r.advance(5000); assert.equal(r.player.progress, .4);
  r.player.play(); r.advance(1000); assert.equal(r.player.progress, .5);
  r.player.select(.1, 20); assert.equal(r.jobs.size, 0); assert.equal(r.player.playing, false);
  r.player.play(); r.advance(2000); assert.equal(r.player.progress, .2);
  r.player.seek(.8); assert.equal(r.jobs.size, 0); assert.equal(r.player.progress, .8);
});

test('completion and disposal leave no background frame and replay starts at zero', () => {
  const r = rig(); r.player.select(.9, 1); r.player.play(); r.advance(200);
  assert.equal(r.player.progress, 1); assert.equal(r.player.playing, false); assert.equal(r.jobs.size, 0);
  r.player.play(); assert.equal(r.player.progress, 0); assert.equal(r.jobs.size, 1);
  r.player.dispose(); assert.equal(r.jobs.size, 0);
  r.player.play(); assert.equal(r.jobs.size, 0);
});
