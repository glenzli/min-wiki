import test from 'node:test';import assert from 'node:assert/strict';import {partition} from '../model.ts';
test('all illustrative rainfall is conserved across infiltration runoff and storage',()=>{for(let s=0;s<3;s++)for(let n=0;n<=100;n++){const r=partition(n,s);assert.equal(r.soaked+r.flowed+r.stored,n);assert.ok(r.stored>=0);}});
test('selected soil comparison changes infiltration while retaining the same rain input',()=>{const a=partition(100,0),b=partition(100,1),c=partition(100,2);assert.ok(a.soaked>b.soaked&&b.soaked>c.soaked);assert.equal(a.total,c.total);});
