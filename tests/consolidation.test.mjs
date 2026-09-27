import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { findTopics, validateCatalog } from '../src/catalog/model.ts';
import { plantDestination, readPlantRoute } from '../topics/seed-sprouting/lifecycleModel.ts';
import { microbialHref, readWorkspace } from '../topics/microbes-everywhere/workspaceModel.ts';
import { coolingHref, readChapter } from '../topics/air-conditioner/projectModel.ts';

const catalog=JSON.parse(readFileSync(new URL('../content/catalog.json',import.meta.url),'utf8'));
const english=JSON.parse(readFileSync(new URL('../src/platform/locales/en.json',import.meta.url),'utf8'));
const absorbed={bacteria:'microbes-everywhere',viruses:'microbes-everywhere','seed-travel':'seed-sprouting','flower-fruit':'seed-sprouting',refrigerator:'air-conditioner'};
test('consolidation removes only duplicate discovery entries, not published compatibility routes',()=>{
  validateCatalog(catalog);
  const visible=findTopics(catalog).map(t=>t.id);
  for(const [id,parent]of Object.entries(absorbed)){
    const topic=catalog.topics.find(t=>t.id===id);
    assert.equal(topic.parentTopic,parent);assert.equal(topic.status,'published');
    assert.ok(!visible.includes(id));assert.ok(visible.includes(parent));
    assert.ok(existsSync(new URL(`../topics/${id}/index.html`,import.meta.url)));
    assert.ok(findTopics(catalog,{query:topic.title}).some(t=>t.id===parent));
  }
  const previous=structuredClone(catalog);for(const topic of previous.topics)if(topic.id in absorbed)delete topic.parentTopic;
  assert.equal(findTopics(previous).length-visible.length,5);
});
test('English discovery resolves each old title to the same new owner',()=>{
  const localized=structuredClone(catalog),tr=s=>english[s]??s;
  for(const category of localized.categories)category.name=tr(category.name);
  for(const topic of localized.topics){topic.title=tr(topic.title);topic.summary=tr(topic.summary);topic.tags=[...topic.tags,...topic.tags.map(tr)];}
  for(const [id,parent]of Object.entries(absorbed)){
    const title=localized.topics.find(t=>t.id===id).title;
    assert.ok(findTopics(localized,{query:title}).some(t=>t.id===parent));
  }
});
test('old parent questions remain searchable and independent simple experiments are retained',()=>{
  for(const [title,parent]of [['一粒豆子怎样发芽？','seed-sprouting'],['微生物为什么几乎无处不在？','microbes-everywhere'],['空调怎样让房间凉下来？','air-conditioner']])
    assert.ok(findTopics(catalog,{query:title}).some(t=>t.id===parent));
  const visible=findTopics(catalog).map(t=>t.id);
  for(const id of ['shadows','magnets','friction','leaf-colors','cells','water-states','handwashing','batteries'])assert.ok(visible.includes(id));
});
test('plant legacy routes force the intended chapter while preserving applicable parameters and deployment base',()=>{
  const flower=new URL(plantDestination('reproduction','?lang=en&chapter=dispersal&journey=1.2&pollen=incompatible','#narration','/wiki/'),'https://example.test');
  assert.equal(flower.pathname,'/wiki/topics/seed-sprouting/');assert.equal(flower.searchParams.get('lang'),'en');assert.equal(flower.hash,'#narration');
  assert.deepEqual(readPlantRoute(flower.search).flower,{progress:1.2,compatible:false});assert.equal(readPlantRoute(flower.search).chapter,'reproduction');
  const travel=new URL(plantDestination('dispersal','?lang=zh&kind=fur&wind=2&progress=.7','#narration','/wiki/'),'https://example.test');
  assert.deepEqual(readPlantRoute(travel.search).travel,{progress:.7,kind:'fur',wind:2});
});
test('microbial legacy entries retain valid host and cell observations without cross-chapter hijacking',()=>{
  const virus=new URL(microbialHref('viruses','?chapter=bacteria&host=defended&view=inside&p=3&lang=en','/wiki/','#narration'),'https://example.test');
  assert.equal(virus.pathname,'/wiki/topics/microbes-everywhere/');assert.equal(virus.hash,'#narration');assert.equal(virus.searchParams.get('lang'),'en');
  const state=readWorkspace(virus.search);assert.equal(state.chapter,'viruses');assert.equal(state.host,'defended');assert.equal(state.view,'inside');assert.ok(state.viruses.defended<3);
  const bacteria=readWorkspace(new URL(microbialHref('bacteria','?part=dna&process=division&bp=.5','/'),'https://example.test').search);
  assert.equal(bacteria.chapter,'bacteria');assert.equal(bacteria.part,'dna');assert.equal(bacteria.bacteria.ready.division,.5);
});
test('refrigerator compatibility points to the cooling journey and retains language and anchors',()=>{
  const url=new URL(coolingHref('fridge','?lang=en&chapter=room','#narration'),'https://example.test');
  assert.equal(url.pathname,'/topics/air-conditioner/');assert.equal(url.searchParams.get('lang'),'en');assert.equal(url.hash,'#narration');assert.equal(readChapter(url.search),'fridge');
});
