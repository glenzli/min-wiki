import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {readCatalog} from '../src/catalog/data.mjs';
import {narrationText,narrationStoryboard} from '../src/platform/learning/model.ts';
const wiki=JSON.parse(readFileSync(new URL('../wiki.json',import.meta.url),'utf8'));
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Reader categories carry bilingual names while editorial tools retain their Chinese projection',()=>{
 const catalog=readCatalog();
 assert.equal(catalog.categories.length,wiki.categories.length);
 for(const category of wiki.categories){
  for(const language of wiki.languages)assert.ok(category.name[language]?.trim(),category.id+' '+language);
  assert.equal(catalog.categories.find(item=>item.id===category.id).name,category.name.zh);
 }
 for(const entry of wiki.entries)assert.ok(wiki.categories.some(category=>category.id===entry.category),entry.id);
});
test('every published identity has a Reader source and no stand-alone page shell',()=>{
 const catalog=readCatalog();assert.equal(wiki.entries.length,catalog.topics.length);
 for(const entry of wiki.entries){
  assert.ok(entry.component||entry.document,entry.id);
  assert.ok(!existsSync(new URL(`../topics/${entry.id}/index.html`,import.meta.url)),entry.id);
  for(const path of Object.values(entry.pages))assert.ok(existsSync(new URL('../'+path,import.meta.url)));
  if(entry.document){const html=read(entry.document.template);assert.doesNotMatch(html,/<(?:html|head|body|script|iframe)\b|encyclopedia-nav/);assert.ok(existsSync(new URL('../'+entry.document.entry,import.meta.url)));}
 }
 assert.ok(!existsSync(new URL('../vite.config.ts',import.meta.url)));
 assert.ok(!existsSync(new URL('../index.html',import.meta.url)));
 assert.ok(!existsSync(new URL('../content/catalog.json',import.meta.url)));
 const scripts=JSON.parse(read('package.json')).scripts;for(const command of ['dev','preview','reader:build'])assert.match(scripts[command],/wiki-reader/);
});
test('reader manuscripts preserve every authored note, qualification, source and exact narration export',()=>{
 for(const entry of wiki.entries){
  const data=JSON.parse(read(entry.learning));
  for(const language of wiki.languages){
   const page=read(entry.pages[language]),content=data[language];
   for(const text of [content.question,content.observe,content.misconception,content.boundary,...content.academic.map(note=>note.body),...content.narration.flatMap(part=>[part.text,part.cue]),...data.references.map(source=>source.url)])assert.ok(page.includes(text),entry.id+' '+language);
   const folder=entry.pages[language].split('/').slice(0,-1).join('/');
   assert.equal(read(folder+`/narration.${language}.txt`),narrationText(content));
   assert.equal(read(folder+`/narration.${language}.storyboard.txt`),narrationStoryboard(content));
  }
 }
});
