import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseFragment} from 'parse5';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function nodes(root){return [root,...(root.childNodes??[]).flatMap(nodes)];}
const attribute=(node,name)=>node.attrs?.find(item=>item.name===name)?.value;
const has=(node,name)=>node.attrs?.some(item=>item.name===name)??false;
const byId=(root,id)=>nodes(root).find(node=>attribute(node,'id')===id);
const ancestor=(node,predicate)=>{for(let current=node?.parentNode;current;current=current.parentNode)if(predicate(current))return current;};
const html=topic=>parseFragment(read(`topics/${topic}/reader.html`));

for(const topic of ['pain-signals','taste-smell','digestion','batteries']){
 test(`${topic}: the declared playback row retains its labelled scrub and original actions`,()=>{
  const root=html(topic),progress=byId(root,'progress');assert.ok(progress);
  const row=ancestor(progress,node=>has(node,'data-reader-transport'));assert.ok(row,'scrub must travel with essential playback');
  assert.ok(nodes(row).some(node=>node.tagName==='label'&&attribute(node,'for')==='progress'));
  assert.ok(nodes(row).some(node=>node.tagName==='button'),'actions and scrub share one declared row');
  assert.equal(nodes(root).filter(node=>attribute(node,'id')==='progress').length,1);
 });
}
test('programs: execution immediately follows the cart, before status and qualifications',()=>{
 const root=html('programs'),scene=byId(root,'program-scene'),step=byId(root,'step'),status=byId(root,'status');
 const column=ancestor(scene,node=>attribute(node,'class')==='stage-column');assert.ok(column);
 const children=column.childNodes.filter(node=>node.tagName),transport=ancestor(step,node=>has(node,'data-reader-transport'));
 assert.ok(children.indexOf(transport)<children.indexOf(status));
 assert.ok(children.indexOf(status)<children.findIndex(node=>has(node,'data-reader-caption')));
 const workspace=ancestor(scene,node=>attribute(node,'class')==='workspace');
 assert.ok(nodes(workspace).includes(byId(root,'instruction-cards')),'cards remain part of the observation, outside optional notes');
});
test('buoyancy: one retained scene explicitly opts into available space',()=>{
 const root=html('buoyancy'),host=byId(root,'shore-host'),stage=ancestor(host,node=>has(node,'data-reader-stage'));
 assert.equal(attribute(stage,'data-reader-fit'),'available');
 assert.equal(nodes(root).filter(node=>attribute(node,'id')==='shore-host').length,1);
 assert.ok(ancestor(byId(root,'journey-progress'),node=>has(node,'data-reader-transport')));
});
test('leaf: the conditional water observation moves as a whole hidden owner',()=>{
 const root=html('leaf-colors'),water=byId(root,'water-panel');
 assert.ok(has(water,'hidden'));assert.ok(has(water,'data-reader-essential'));
 assert.ok(nodes(water).includes(byId(root,'water-progress')));assert.ok(nodes(water).includes(byId(root,'water-map')));
 assert.ok(ancestor(byId(root,'season'),node=>has(node,'data-reader-essential')));
});
test('cactus: progress, initiating conditions and current result are declared essentials',()=>{
 const root=html('cactus-water');
 for(const id of ['rain','dry','play','exchange'])assert.ok(has(byId(root,id),'data-reader-essential'),id);
 assert.ok(ancestor(byId(root,'progress'),node=>has(node,'data-reader-essential')));
 assert.ok(has(byId(root,'result'),'data-reader-readout'));
});
test('tap water and sound retain each complete labelled timeline',()=>{
 const water=html('tap-water');assert.ok(ancestor(byId(water,'process'),node=>has(node,'data-reader-transport')));
 const source=parseFragment(read('topics/sound-vibrations/sourcePanel.html'));
 assert.ok(ancestor(byId(source,'phase'),node=>has(node,'data-reader-essential')));
 const ear=parseFragment(read('topics/hearing/panel.html'));
 assert.ok(ancestor(byId(ear,'h-progress'),node=>has(node,'data-reader-transport')));
});
test('natural AI examples keep their explicit flow choice',()=>{
 assert.equal(attribute(byId(html('ai'),'examples'),'data-reader-layout'),'flow');
});
test('viewport allocations remain separate declarations in the authored native styles',()=>{
 for(const topic of ['atmosphere','cosmic-scale','stars','mimosa','lightning-thunder','small-bodies']){
  const css=read(`topics/${topic}/style.css`);
  assert.doesNotMatch(css,/[\w%.)]height:var\(/,topic+' must not join a size declaration to a preceding value');
 }
});
test('program controls can collapse without removing instruction evidence or current results',()=>{
 const root=html('programs');
 for(const id of ['step','run','pause','reset'])assert.ok(ancestor(byId(root,id),node=>has(node,'data-reader-controls')),id);
 for(const id of ['instruction-cards','status'])assert.equal(ancestor(byId(root,id),node=>has(node,'data-reader-controls')||has(node,'data-reader-transport')),undefined,id);
 const captions=nodes(root).filter(node=>has(node,'data-reader-caption'));assert.equal(captions.length,2);
 for(const caption of captions)assert.equal(ancestor(caption,node=>has(node,'data-reader-controls')),undefined);
 assert.ok(has(byId(root,'pause'),'hidden'),'only the current playback action is initially exposed');
 const reset=byId(root,'reset'),label=nodes(reset).find(node=>attribute(node,'class')==='reset-label');assert.ok(label);
 assert.equal(attribute(reset,'title'),nodes(label).filter(node=>node.nodeName==='#text').map(node=>node.value).join(''),'compact reset keeps its full accessible label');
});
test('buoyancy keeps conditional quantities and pause qualification outside real controls',()=>{
 const root=html('buoyancy');
 for(const id of ['journey-balance','journey-cargo-count','journey-motion-note']){
  assert.equal(ancestor(byId(root,id),node=>has(node,'data-reader-controls')||has(node,'data-reader-transport')),undefined,id);
 }
 const cargo=byId(root,'journey-cargo');assert.ok(has(cargo,'hidden'));assert.ok(has(cargo,'data-reader-readout'));
 for(const id of ['journey-less','journey-more']){
  assert.ok(nodes(cargo).includes(byId(root,id)));assert.ok(ancestor(byId(root,id),node=>has(node,'data-reader-controls')));
 }
 for(const id of ['journey-play','journey-progress','journey-next'])assert.ok(ancestor(byId(root,id),node=>has(node,'data-reader-transport')),id);
});
test('history display-time qualification stays outside the collapsible timeline',()=>{
 const source=read('topics/earth/history/journeyStudy.ts');
 const markup=source.slice(source.indexOf('<div data-reader-controls data-reader-transport'),source.indexOf('<article class="history-journey-reading"'));
 const root=parseFragment(markup),scrub=nodes(root).find(node=>has(node,'data-journey-progress'));
 assert.ok(ancestor(scrub,node=>has(node,'data-reader-controls')));
 const note=nodes(root).find(node=>attribute(node,'class')==='history-journey-time-note');assert.ok(note);assert.ok(has(note,'data-reader-caption'));
 assert.equal(ancestor(note,node=>has(node,'data-reader-controls')||has(node,'data-reader-transport')),undefined);
});
