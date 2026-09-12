import test from 'node:test';
import assert from 'node:assert/strict';
import { DebrisEmission } from '../emission.ts';
test('emission follows local debris without filling empty azimuths and seeking is reproducible',()=>{
 const map=new DebrisEmission();
 const sample=(x,weight=1)=>{map.update(new Float32Array([x,0,0]),new Float32Array([weight]));return Uint8Array.from(map.texture.image.data);};
 const first=sample(.5);
 assert.ok(first.some(v=>v>0));assert.ok(first.filter(v=>v>0).length<40);
 assert.equal(first[48*96+24],0);
 const next=sample(.5001);assert.ok(first.reduce((n,v,i)=>n+Math.abs(v-next[i]),0)<15);
 assert.ok(sample(.5,0).every(v=>v===0));
 sample(-.5);assert.deepEqual(sample(.5),first);
 map.dispose();
});
