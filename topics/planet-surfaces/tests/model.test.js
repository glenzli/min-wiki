import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS, encounter } from '../model.ts';
test('all selected terrestrial worlds reach solid ground; giants never do', () => {
 for (const w of WORLDS) {
  const layers=Array.from({length:101},(_,i)=>encounter(w,i/100));
  if(w.surface) assert.ok(['ground','seabed'].includes(layers.at(-1)));
  else { assert.ok(!layers.includes('ground')); assert.ok(!layers.includes('seabed')); assert.equal(layers.at(-1),'dense-fluid'); }
 }
});
test('Earth ocean has distinct air water and rocky seabed, and remains a rocky planet', () => {
 const earth=WORLDS.find(w=>w.id==='earth'); assert.equal(earth.kind,'rock');
 assert.equal(encounter(earth,0),'air'); assert.equal(encounter(earth,.5),'water'); assert.equal(encounter(earth,1),'seabed');
 assert.equal(encounter(earth,-4),encounter(earth,0)); assert.equal(encounter(earth,5),encounter(earth,1));
});
