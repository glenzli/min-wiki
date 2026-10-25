import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {legacyGalleryURL} from '../guideRoute.ts';
import {CHAPTERS,GALLERY_IDS} from '../journey.ts';

test('old chapter links preserve the selected study, base, locale, static mode and detailed state',()=>{
  for(const chapter of CHAPTERS){
    const from=new URL(`https://example.test/custom/topics/earth/?lang=en&static=1&chapter=${chapter}&earth.${chapter}.phase=0.37&earth.interior.depth=15#narration`);
    const to=legacyGalleryURL(from.href);
    assert.equal(to.pathname,`/custom/topics/${GALLERY_IDS[chapter]}/`);
    assert.equal(to.search,from.search);assert.equal(to.hash,from.hash);
  }
});
test('the plain guide and unrelated or invalid paths never trigger a chapter redirect',()=>{
  for(const path of ['earth/?lang=zh','earth/?chapter=unknown','earth-rocks/?chapter=climate'])assert.equal(legacyGalleryURL('https://local.test/topics/'+path),undefined);
});
test('Earth questions are independently discoverable drafts rather than inherited complete galleries',()=>{
  const wiki=JSON.parse(readFileSync(new URL('../../../wiki.json',import.meta.url)));
  for(const id of ['earth',...Object.values(GALLERY_IDS)]){
    const entry=wiki.entries.find(e=>e.id===id);assert.ok(entry);
    assert.equal(entry.parentTopic,undefined);assert.equal(entry.review.inherits,undefined);assert.equal(entry.review.status,'draft');
  }
});
