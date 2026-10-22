import test from 'node:test';
import assert from 'node:assert/strict';
import { freshRunwayCanvas } from '../runwayView.ts';

// The fixture models the DOM identity boundary; it does not emulate WebGL or claim browser proof.
class CanvasFixture {
 constructor(attributes, slot) { this.attributes = new Map(attributes); this.slot = slot; this.context = Symbol('context-owner'); this.listeners = new Set(); }
 cloneNode(deep) { assert.equal(deep, false); return new CanvasFixture(this.attributes, undefined); }
 replaceWith(next) { assert.equal(this.slot.current, this); this.slot.current = next; next.slot = this.slot; this.slot = undefined; }
}
const attributes = [['id','runway-canvas'],['role','img'],['tabindex','0'],['aria-label','Same airplane and marked wing'],['aria-describedby','scene-caption'],['width','1238'],['height','390']];

test('recovery replaces the context owner in the same DOM slot and retains accessibility attributes',()=>{
 const slot = {}, old = new CanvasFixture(attributes, slot); slot.current = old;
 old.listeners.add('old-wing-pointer');
 const fresh = freshRunwayCanvas(old);
 assert.notEqual(fresh, old); assert.notEqual(fresh.context, old.context);
 assert.equal(slot.current, fresh); assert.equal(old.slot, undefined);
 assert.deepEqual(fresh.attributes, old.attributes); assert.equal(fresh.listeners.size, 0);
});
test('repeated retries retain one canvas slot without inheriting stale renderer or wing listeners',()=>{
 const slot = {}; let current = new CanvasFixture(attributes, slot); slot.current = current;
 const owners = new Set([current.context]);
 for(let i=0;i<4;i++){
  current.listeners.add('wing-pointer'); const next = freshRunwayCanvas(current);
  assert.equal(slot.current, next); assert.equal(next.listeners.size, 0);
  assert.equal(next.attributes.get('id'),'runway-canvas'); assert.equal(next.attributes.get('aria-describedby'),'scene-caption');
  owners.add(next.context); current = next;
 }
 assert.equal(owners.size,5);
});
