/** Actual topic controllers/renderers on a deterministic DOM/RAF adapter.
 * This checks organ identity and experiment lifetime, not browser layout. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseFragment} from 'parse5';
import * as beanGeometry from '../growthGeometry.ts';
import * as lifecycle from '../lifecycleModel.ts';
import * as cherryModel from '../../flower-fruit/model.ts';
import {beeMotion} from '../../flower-fruit/beeMotion.ts';

function study(kind='bean',initial={progress:0}){
 let now=0,frameId=0;const frames=new Map(),updates=[];
 class Element{
  children=[];dataset={};attributes={};listeners=new Map();value='';textContent='';disabled=false;htmlWrites=0;
  classList={toggle(){}};
  constructor(tag='div',attrs=[]){this.tagName=tag;for(const {name,value}of attrs)this.setAttribute(name,value);this.value=this.attributes.value??'';}
  setAttribute(name,value){this.attributes[name]=String(value);if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  set innerHTML(html){this.htmlWrites++;this.children=[];const parsed=parseFragment(this.tagName==='svg'?`<svg>${html}</svg>`:html);const nodes=this.tagName==='svg'?parsed.childNodes[0].childNodes:parsed.childNodes;for(const node of nodes??[])this.append(from(node));}
  querySelectorAll(selector){const found=[];const match=e=>selector[0]==='#'?e.attributes.id===selector.slice(1):selector==='[data-part]'?'part'in e.dataset:e.tagName.toLowerCase()===selector.toLowerCase();const walk=e=>{for(const c of e.children){if(match(c))found.push(c);walk(c);}};walk(this);return found;}
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
  addEventListener(type,fn){this.listeners.set(type,[...(this.listeners.get(type)??[]),fn]);}
  dispatch(type){for(const fn of this.listeners.get(type)??[])fn({type,target:this});}
 }
 function from(node){const e=new Element(node.tagName??'#text',node.attrs??[]);e.textContent=node.value??'';for(const c of node.childNodes??[])e.append(from(c));if(e.tagName==='select')e.value=e.children.find(c=>c.tagName==='option')?.getAttribute('value')??'';return e;}
 const root=new Element();root.innerHTML=readFileSync(new URL(kind==='bean'?'../study.html':'../../flower-fruit/study.html',import.meta.url),'utf8');
 const media={matches:false},document={createElementNS:(_ns,tag)=>new Element(tag)};
 const host={console,document,window:{matchMedia:()=>media},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),t:s=>s,
  animateValue:({from,onUpdate})=>{let live=true;onUpdate(from);return()=>live=false;}};
 function load(relative,deps={}){
  const source=readFileSync(new URL(relative,import.meta.url),'utf8'),ast=ts.createSourceFile(relative,source,ts.ScriptTarget.Latest,true);
  const standalone=ts.factory.updateSourceFile(ast,ast.statements.filter(s=>!ts.isImportDeclaration(s)));
  const output=ts.transpileModule(ts.createPrinter().printFile(standalone),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,exports={};
  vm.runInNewContext(output,{...host,...deps,exports},{filename:relative});return exports;
 }
 const playback=load('../growthPlayback.ts');
 const renderer=kind==='bean'?load('../growthScene.ts',beanGeometry):load('../../flower-fruit/growthScene.ts',{...cherryModel,beeMotion});
 const controller=load(kind==='bean'?'../study.ts':'../../flower-fruit/study.ts',{...lifecycle,...playback,...renderer});
 const mounted=controller.mountStudy(root,initial,state=>updates.push({...state})),get=id=>root.querySelector('#'+id);
 return {root,media,frames,updates,mounted,get,
  click(id){get(id).dispatch('click');},input(id,value,type='input'){get(id).value=String(value);get(id).dispatch(type);},
  tick(ms=50){now+=ms;const work=[...frames.values()];frames.clear();for(const fn of work)fn(now);}};
}

test('real bean scene keeps the same root, cotyledons and leaf nodes through play and review',()=>{
 const h=study(),svg=h.get('scene'),parts=svg.querySelectorAll('[data-part]');assert.equal(h.frames.size,0);assert.equal(svg.htmlWrites,1);
 for(const p of [1.25,2.2,3,.7,2.9]){h.input('stage',p);assert.equal(h.mounted.read().progress,p);assert.deepEqual(svg.querySelectorAll('[data-part]'),parts);assert.equal(svg.htmlWrites,1);}
 const stem=svg.querySelectorAll('linearGradient').find(n=>n.getAttribute('id')==='stem');assert.equal(stem.getAttribute('gradientUnits'),'userSpaceOnUse','a vertical stroke must not use a zero-width bounding box');
 h.click('growth-play');h.tick();h.tick();h.mounted.pause();const paused=h.mounted.read().progress;assert.equal(h.frames.size,0);h.tick(50000);assert.equal(h.mounted.read().progress,paused);
});
test('actual bean reset removes previous growth history even with blocking conditions',()=>{
 const h=study('bean',{progress:2.4});h.input('water','dry');h.click('reset');assert.equal(h.mounted.read().progress,0);h.input('stage',3);assert.equal(h.mounted.read().progress,0);h.click('growth-play');assert.equal(h.frames.size,0);
 h.input('water','damp');assert.equal(h.frames.size,0);h.click('growth-play');for(let i=0;i<45;i++)h.tick();const observed=h.mounted.read().progress;assert.ok(observed>0&&observed<1);
 h.input('air','no');assert.equal(h.frames.size,0);h.input('stage',3);assert.equal(h.mounted.read().progress,observed);h.mounted.dispose();assert.equal(h.frames.size,0);assert.equal(h.root.children.length,0);
});
test('actual cherry renderer preserves organ nodes and independent incompatible history',()=>{
 const h=study('cherry'),svg=h.get('scene'),parts=svg.querySelectorAll('[data-part]');
 h.input('journey',2500);assert.equal(h.mounted.read().progress,2.5);assert.equal(svg.htmlWrites,1);
 h.input('pollen','incompatible','change');assert.equal(h.mounted.read().progress,0);h.input('journey',3000);
 const body=svg.querySelectorAll('[data-part]').find(n=>n.dataset.part==='ovary-body');assert.equal(body.getAttribute('transform'),'translate(273.22 273.71) scale(0.13)');assert.match(h.get('result').textContent,/不会形成种子和果实/);
 h.input('pollen','compatible','change');assert.equal(h.mounted.read().progress,2.5);assert.deepEqual(svg.querySelectorAll('[data-part]'),parts);assert.equal(svg.htmlWrites,1);
 h.click('journey-play');h.tick();h.tick();h.mounted.pause();const p=h.mounted.read().progress;h.tick(10000);assert.equal(h.mounted.read().progress,p);assert.equal(h.frames.size,0);
 h.mounted.dispose();assert.equal(h.root.children.length,0);
});
test('reduced-motion controllers keep explicit stages without autoplay or hidden seek completion',()=>{
 for(const kind of ['bean','cherry']){const h=study(kind);h.media.matches=true;h.click(kind==='bean'?'growth-play':'journey-play');assert.equal(h.mounted.read().progress,1);assert.equal(h.frames.size,0);h.click('next');assert.equal(h.mounted.read().progress,2);assert.equal(h.frames.size,0);}
});

test('articulated bee wings share the process clock, freeze on pause and replay the same pose',()=>{
 const h=study('cherry'),svg=h.get('scene'),part=name=>svg.querySelectorAll('[data-part]').find(n=>n.dataset.part===name);
 const wing=part('bee-wing-near'),far=part('bee-wing-far');
 assert.equal(h.frames.size,0);const initial=wing.getAttribute('transform');
 h.click('journey-play');h.tick();h.tick(50);assert.notEqual(wing.getAttribute('transform'),initial);assert.notEqual(far.getAttribute('transform'),wing.getAttribute('transform'));assert.equal(h.frames.size,1);
 h.mounted.pause();const paused=wing.getAttribute('transform');h.tick(10000);assert.equal(wing.getAttribute('transform'),paused);assert.equal(h.frames.size,0);
 const pose=()=>['bee','bee-wing-near','bee-wing-far','bee-antenna-near','bee-leg-near-0','pollen'].map(name=>({...part(name).attributes}));
 h.input('journey',200);const before=pose();h.input('journey',1100);h.input('journey',200);assert.deepEqual(pose(),before);assert.equal(svg.htmlWrites,1);
 h.input('journey',500);assert.equal(part('bee-wing-envelope').getAttribute('opacity'),'0');
 h.input('journey',900);assert.ok(Number(part('bee-wing-envelope').getAttribute('opacity'))>0);
 h.media.matches=true;h.input('journey',200);assert.equal(part('bee-wing-envelope').getAttribute('opacity'),'0');assert.equal(h.frames.size,0);
 h.mounted.dispose();assert.equal(h.frames.size,0);
});
