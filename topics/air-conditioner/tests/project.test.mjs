import test from 'node:test';
import assert from 'node:assert/strict';
import {boundaryBalance,coolingHref,readChapter} from '../projectModel.ts';
test('moving the hot side changes room boundary, never cycle energy conservation',()=>{
 for(const work of [0,.1,1,2.6,3])for(const place of ['outside','same-room']){
  const b=boundaryBalance(work,place);
  assert.equal(b.hot,b.cold+b.work);
  assert.ok(Math.abs(b.roomNet-(place==='outside'?-b.cold:b.work))<1e-12);
 }
 assert.deepEqual(boundaryBalance(Infinity,'same-room'),boundaryBalance(1,'same-room'));
 assert.equal(boundaryBalance(-4,'outside').work,0);
});
test('legacy refrigerator route keeps language unknown params and hash, selects exact chapter',()=>{
 const href=coolingHref('fridge','?chapter=bad&lang=en&custom=a%20b','#energy-balance');
 const url=new URL(href,'https://wiki.test');
 assert.equal(url.searchParams.get('lang'),'en');assert.equal(url.searchParams.get('custom'),'a b');
 assert.equal(url.hash,'#energy-balance');assert.equal(readChapter(url.search),'fridge');
 assert.equal(readChapter('?chapter=bad'),'air');assert.equal(readChapter('?chapter=room'),'room');
});
