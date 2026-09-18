import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import {parse,parseFragment} from 'parse5';

const topic=fileURLToPath(new URL('../',import.meta.url));
function harness(){
 const ids=new Map(),elements=[],animations=[];
 class Target{listeners=new Map();addEventListener(type,fn){const list=this.listeners.get(type)??[];list.push(fn);this.listeners.set(type,list);}dispatch(type){for(const fn of this.listeners.get(type)??[])fn({type,target:this});}}
 class Element extends Target{
  attrs={};dataset={};value='';textContent='';disabled=false;
  constructor(attrs=[]){super();for(const {name,value}of attrs)this.setAttribute(name,value);this.value=this.attrs.value??'';}
  get id(){return this.attrs.id;}
  setAttribute(k,v){this.attrs[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5)]=String(v);}
  getAttribute(k){return this.attrs[k];}
  set innerHTML(s){register(parseFragment(s));}
  insertAdjacentHTML(_where,s){register(parseFragment('<svg>'+s+'</svg>'));}
  querySelectorAll(s){return select(s);}
 }
 function register(n){if(n.tagName){const e=new Element(n.attrs);elements.push(e);if(e.id)ids.set(e.id,e);}for(const c of n.childNodes??[])register(c);}
 const select=s=>elements.filter(e=>s==='[id]'?e.id:s==='[data-view]'?'data-view' in e.attrs:false);
 register(parse(readFileSync(topic+'index.html','utf8')));ids.get('host').value='compatible';
 const document=new Target(),window=new Target();document.getElementById=id=>{assert.ok(ids.has(id),id);return ids.get(id);};document.querySelectorAll=select;
 const animateValue=options=>{const a={...options,active:true};animations.push(a);options.onUpdate(options.from);return()=>a.active=false;};
 const noop=()=>{};const globals={document,window,animateValue,t:s=>s,translateDocument:noop,mountTopicNavigation:noop,mountReadingMode:noop,console};
 function load(name,deps={}){const ast=ts.createSourceFile(name,readFileSync(topic+name,'utf8'),ts.ScriptTarget.Latest,true);const bare=ts.factory.updateSourceFile(ast,ast.statements.filter(n=>!ts.isImportDeclaration(n)));const code=ts.transpileModule(ts.createPrinter().printFile(bare),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const exports={};vm.runInNewContext(code,{...globals,...deps,exports});return exports;}
 const model=load('model.ts'),scene=load('scene.ts',model);load('main.ts',{...model,...scene});
 const get=id=>ids.get(id),advance=(a,f)=>{if(a.active){a.onUpdate(a.from+(a.to-a.from)*f);if(f===1){a.active=false;a.onComplete?.();}}};
 return{get,advance,animations,click:id=>{get(id).dispatch('click');return animations.at(-1);},scrub:p=>{get('progress').value=String(p);get('progress').dispatch('input');},view:v=>{select('[data-view]').find(b=>b.dataset.view===v).dispatch('click');return animations.at(-1);},host:h=>{get('host').value=h;get('host').dispatch('change');},restore:()=>{window.dispatch('pagehide');window.dispatch('pageshow');}};
}

test('camera changes retain progress and every rendered molecule position',()=>{
 const h=harness();h.scrub(167);const dna=h.get('v-template').getAttribute('d'),parent=h.get('v-original').getAttribute('transform'),start=h.get('virus-diagram').getAttribute('viewBox');
 const a=h.view('attachment');h.advance(a,.5);const middle=h.get('virus-diagram').getAttribute('viewBox');h.advance(a,1);
 assert.equal(h.get('progress').value,'167');assert.equal(h.get('v-template').getAttribute('d'),dna);assert.equal(h.get('v-original').getAttribute('transform'),parent);
 assert.notEqual(middle,start);assert.notEqual(middle,h.get('virus-diagram').getAttribute('viewBox'));
});

test('scrubbing cancels old transitions and restoration settles the current target consistently',()=>{
 const h=harness();const first=h.click('play');h.advance(first,.33);h.scrub(350);const frame=h.get('v-template').getAttribute('d');h.advance(first,1);assert.equal(h.get('progress').value,'350');assert.equal(h.get('v-template').getAttribute('d'),frame);
 const camera=h.view('inside');h.advance(camera,.4);const step=h.click('next');h.advance(step,.4);h.restore();
 assert.equal(h.get('progress').value,'400');assert.equal(h.get('play').textContent,'连续看一遍');assert.ok(h.animations.every(a=>!a.active));assert.equal(h.get('v-child-head-0').getAttribute('opacity'),'1');
});

test('host changes stop running transitions and both failed infections have no offspring',()=>{
 const h=harness();const a=h.click('play');h.advance(a,.8);h.host('mismatch');h.advance(a,1);assert.equal(h.get('progress').value,'0');
 let next=h.click('play');h.advance(next,1);assert.equal(h.get('progress').value,'100');assert.equal(h.get('next').disabled,true);assert.match(h.get('step-title').textContent,/不能附着/);assert.equal(h.get('v-child-head-0').getAttribute('opacity'),'0');
 h.host('defended');next=h.click('play');h.advance(next,1);assert.equal(h.get('progress').value,'200');assert.equal(h.get('v-defense').getAttribute('opacity'),'1');assert.equal(h.get('v-child-head-0').getAttribute('opacity'),'0');assert.match(h.get('step-text').textContent,/没有产生新病毒/);
});
