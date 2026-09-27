import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {findTopics,validateCatalog} from '../src/catalog/model.ts';
import {soundHref,readSoundChapter} from '../topics/sound-vibrations/projectModel.ts';
import {motionHref,readMotionChapter,legacyCarChapter} from '../topics/friction/projectModel.ts';
import {metamorphosisDestination,readMetamorphosisRoute} from '../topics/frog-life/metamorphosisModel.ts';
import {languageHref} from '../src/platform/i18n.ts';
import {parseFragment} from 'parse5';
const catalog=JSON.parse(readFileSync(new URL('../content/catalog.json',import.meta.url),'utf8'));
const english=JSON.parse(readFileSync(new URL('../src/platform/locales/en.json',import.meta.url),'utf8'));
const absorbed={'butterfly-life':'frog-life','car-safety':'friction',hearing:'sound-vibrations'};
test('depth round removes duplicate cards, retaining all published compatibility entries and searchable old titles',()=>{
 validateCatalog(catalog);const visible=findTopics(catalog);
 for(const [id,parent]of Object.entries(absorbed)){const item=catalog.topics.find(t=>t.id===id),owner=catalog.topics.find(t=>t.id===parent);assert.equal(item.parentTopic,parent);assert.equal(item.status,'published');assert.equal(item.category,owner.category);assert.ok(!visible.some(t=>t.id===id));assert.ok(findTopics(catalog,{query:item.title}).some(t=>t.id===parent));assert.ok(existsSync(new URL(`../topics/${id}/index.html`,import.meta.url)));}
 const prior=structuredClone(catalog);for(const t of prior.topics)if(t.id in absorbed)delete t.parentTopic;assert.equal(findTopics(prior).length-visible.length,3);
 const localized=structuredClone(catalog);for(const t of localized.topics){t.title=english[t.title]??t.title;t.summary=english[t.summary]??t.summary;t.tags=[...t.tags,...t.tags.map(v=>english[v]??v)];}
 for(const [id,parent]of Object.entries(absorbed))assert.ok(findTopics(localized,{query:localized.topics.find(t=>t.id===id).title}).some(t=>t.id===parent));
});
test('short but meaningful independent experiments remain listed when their mechanism is clear',()=>{
 const visible=findTopics(catalog).map(t=>t.id);for(const id of ['ant-trails','shadows','magnets','duck-feet','handwashing'])assert.ok(visible.includes(id));
});
test('all four primary entries retain the navigation host and theme initialization shell',()=>{
 for(const id of ['ant-trails','frog-life','friction','sound-vibrations']){const html=readFileSync(new URL(`../topics/${id}/index.html`,import.meta.url),'utf8');assert.match(html,/id="encyclopedia-nav"/);assert.match(html,/src="\/src\/platform\/theme\.ts"/);assert.match(html,/data-content-theme="light"/);}
});
test('composed sound fragments keep bilingual prose beyond the fixed learning summary schema',()=>{
 const translations={...english,...JSON.parse(readFileSync(new URL('../topics/sound-vibrations/locales/en.json',import.meta.url),'utf8')),...JSON.parse(readFileSync(new URL('../topics/hearing/locales/en.json',import.meta.url),'utf8'))};
 for(const file of ['sound-vibrations/sourcePanel.html','hearing/panel.html']){
  const tree=parseFragment(readFileSync(new URL('../topics/'+file,import.meta.url),'utf8'));
  function walk(node){const messages=[];if(node.nodeName==='#text')messages.push(node.value.trim());for(const a of node.attrs??[])if(['aria-label','title','placeholder'].includes(a.name))messages.push(a.value);for(const s of messages)if(/[\u3400-\u9fff]/.test(s))assert.ok(translations[s],`${file}: ${s}`);for(const child of node.childNodes??[])walk(child);}
  walk(tree);
 }
});
test('the three old URLs select exact chapters and preserve locale, mount base, parameters and anchors',()=>{
 const sound=new URL(languageHref(soundHref('ear','?lang=en&keep=1&chapter=source','#ear-scene'),'en','/wiki/'),'https://test.invalid');assert.equal(sound.pathname,'/wiki/topics/sound-vibrations/');assert.equal(sound.searchParams.get('keep'),'1');assert.equal(sound.hash,'#ear-scene');assert.equal(readSoundChapter(sound.search),'ear');
 const car=new URL(languageHref(motionHref(legacyCarChapter('#seat-symbol'),'?lang=en&keep=1','#seat-symbol'),'en','/wiki/'),'https://test.invalid');assert.equal(car.pathname,'/wiki/topics/friction/');assert.equal(readMotionChapter(car.search),'restraints');assert.equal(car.hash,'#seat-symbol');assert.equal(car.searchParams.get('lang'),'en');
 const butterfly=new URL(metamorphosisDestination('butterfly','?lang=en&stage=2&wing=.4&keep=1','#narration','/wiki/'),'https://test.invalid');assert.equal(butterfly.pathname,'/wiki/topics/frog-life/');assert.equal(readMetamorphosisRoute(butterfly.search).chapter,'butterfly');assert.equal(butterfly.searchParams.get('keep'),'1');assert.equal(butterfly.hash,'#narration');
});
