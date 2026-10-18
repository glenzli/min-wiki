import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFragment } from 'parse5';
import { createScene, setCameras } from '../scene.ts';
import { wholeBox, focusBox, mixBox } from '../model.ts';
import { renderCell } from '../../body-cells/scene.ts';
import { renderBlood } from '../../blood-cells/scene.ts';

function nodes(markup){
  const result=[];
  const visit=node=>{result.push(node);node.childNodes?.forEach(visit);};
  visit(parseFragment(`<svg>${markup}</svg>`));return result;
}
const attr=(node,key)=>node.attrs?.find(a=>a.name===key)?.value;
function referencesResolve(markup){
  const tree=nodes(markup),ids=tree.map(node=>attr(node,'id')).filter(Boolean);
  assert.equal(new Set(ids).size,ids.length,'SVG definitions have distinct IDs');
  for(const node of tree)for(const {name,value} of node.attrs??[]){
    const targets=[...value.matchAll(/url\(#([^)]*)\)/g)].map(match=>match[1]);
    if(name==='href'&&value.startsWith('#'))targets.push(value.slice(1));
    for(const id of targets)assert.ok(ids.includes(id),`${name} resolves #${id}`);
  }
  assert.doesNotMatch(markup,/NaN|Infinity|undefined/);
}

// These sinks run production scene construction and camera updates. Actual
// letterboxing, focus, colours and responsive layout are checked in the browser.
function sceneFixture(){
  const ids=new Map(),created=[];
  const make=()=>({style:{},attributes:new Map(),markup:'',
    setAttribute(key,value){this.attributes.set(key,String(value));},
    getAttribute(key){return this.attributes.get(key);},
    closest(){return null;},append(node){created.push(node);},
    set innerHTML(markup){this.markup=markup;for(const node of nodes(markup)){
      const id=attr(node,'id');if(!id)continue;
      const sink=make();for(const {name,value} of node.attrs??[])sink.setAttribute(name,value);ids.set(id,sink);
    }},get innerHTML(){return this.markup;},
  });
  for(const id of ['cell-scene','detail-scene','behavior-scene'])ids.set(id,make());
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  globalThis.document={getElementById:id=>ids.get(id),createElementNS:make,body:make()};
  return {ids,created,restore(){if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}};
}

test('all structural viewports clip the same world rectangle as their live cameras, including transitions',t=>{
  const f=sceneFixture();t.after(f.restore);createScene();
  referencesResolve(f.created.map(node=>node.innerHTML).join('')+['cell-scene','detail-scene','behavior-scene'].map(id=>f.ids.get(id).innerHTML).join(''));
  for(const cell of ['animal','plant','bacterium'])for(const part of ['membrane','dna','nucleus','chloroplast','mitochondrion','vacuole'])for(const blend of [0,.25,.5,.75,1]){
    const whole=mixBox(wholeBox('animal'),wholeBox(cell),blend);
    const detail=mixBox(focusBox('animal','membrane'),focusBox(cell,part),blend);
    setCameras(whole,detail);
    for(const [view,id] of [['whole','cell-scene'],['detail','detail-scene'],['behavior','behavior-scene']]){
      const clip=f.ids.get(`${view}-clip`);assert.ok(clip,'physical letterbox space cannot expose adjacent specimens');
      const values=['x','y','width','height'].map(key=>clip.getAttribute(key)).join(' ');
      assert.equal(values,f.ids.get(id).getAttribute('viewBox'));
      assert.ok(f.ids.get(id).innerHTML.includes(`clip-path="url(#${view}-viewport)"`));
    }
  }
});

test('every tissue illustration resolves its gradients, masks and clips throughout the scrub range',()=>{
  for(const kind of ['barrier','muscle','neuron','oxygen','defence','repair'])for(const progress of [0,.25,.5,.75,1]){
    const markup=['barrier','muscle','neuron'].includes(kind)?renderCell(kind,progress,s=>s):renderBlood(kind,progress,s=>s);
    referencesResolve(markup);
  }
});
