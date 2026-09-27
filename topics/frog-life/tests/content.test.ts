import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import copy from '../content.json';
import learning from '../learning.json';
import { ASPECTS } from '../metamorphosisModel.ts';

test('every visible stage has both languages and all four observation lenses',()=>{
  assert.equal(copy.frogStages.length,5);assert.equal(copy.butterflyStages.length,4);
  for(const animal of ['frog','butterfly'] as const){assert.equal(copy.kidsStages[animal].length,copy[`${animal}Stages`].length);assert.equal(copy.sceneCues[animal].length,copy[`${animal}Stages`].length);}
  for(const stage of [...copy.frogStages,...copy.butterflyStages])for(const key of ['title',...ASPECTS] as const){assert.ok(stage[key].zh.trim());assert.ok(stage[key].en.trim());}
  const visit=(value:unknown)=>{if(!value||typeof value!=='object')return;const item=value as Record<string,unknown>;if('zh'in item||'en'in item){assert.equal(typeof item.zh,'string');assert.equal(typeof item.en,'string');assert.ok((item.zh as string).trim());assert.ok((item.en as string).trim());}else Object.values(item).forEach(visit);};visit(copy);
});
test('combined learning retains the platform summary contract and published source links',()=>{
  for(const lang of ['zh','en'] as const){assert.equal(learning[lang].academic.length,3);assert.equal(learning[lang].narration.length,4);for(const note of learning[lang].academic)assert.ok(note.title&&note.body);for(const beat of learning[lang].narration)assert.ok(beat.label&&beat.text&&beat.cue);}
  for(const source of learning.references){assert.ok(source.title);assert.equal(new URL(source.url).protocol,'https:');}
});
test('retained SVG assets resolve every local paint and use reference',()=>{
  for(const path of ['../specimen.svg','../../butterfly-life/specimen.svg']){const source=readFileSync(new URL(path,import.meta.url),'utf8'),ids=new Set([...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));assert.ok(ids.has('scene'));for(const match of source.matchAll(/(?:url\(#|href="#)([^)"]+)/g))assert.ok(ids.has(match[1]),`missing SVG reference ${match[1]}`);}
});
