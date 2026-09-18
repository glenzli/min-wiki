import test from 'node:test';
import assert from 'node:assert/strict';
import { StellarGas } from '../rendering/stellarGas.ts';

function fixture() {
  const gas = new StellarGas(1);
  gas.model = {count:1,bound:new Uint8Array([1])};
  const sample = (x=8, alive=1, released=1, heat=1) => {
    gas.updateEmission(new Float32Array([x,0,0]),new Float32Array([x,-.1,0]),new Float32Array([released,alive]),new Float32Array([heat]));
    return Uint8Array.from(gas.emission.image.data);
  };
  return {gas,sample};
}
test('emission stays local to surviving released bound gas; empty azimuth stays dark',()=>{
  const {gas,sample}=fixture(); const map=sample();
  assert.ok(map.some(x=>x>0));
  assert.ok(map.filter(x=>x>0).length<40);
  assert.equal(map[48*96+28],0);
  assert.ok(sample(8,0).every(x=>x===0));
  assert.ok(sample(8,1,0).every(x=>x===0));
  assert.ok(sample(8,1,1,0).every(x=>x===0), "unheated first-pass gas does not light a disk");
  gas.model.bound[0]=0;
  assert.ok(sample().every(x=>x===0));
});
test('small gas motion changes emission smoothly and scrubbing reproduces the same map',()=>{
  const {sample}=fixture(); const a=sample(8), b=sample(8.01);
  assert.ok(a.reduce((total,x,i)=>total+Math.abs(x-b[i]),0)<12);
  sample(-8);
  assert.deepEqual(sample(8),a);
});
