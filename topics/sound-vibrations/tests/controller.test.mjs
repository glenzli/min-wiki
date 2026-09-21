import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import ts from 'typescript';
import {parseFragment} from 'parse5';

// Execute production controllers, scene geometry, models and composition. Only
// browser DOM, audio devices and animation scheduling are adapted here.
function harness(){
 class Target{listeners={};addEventListener(k,f){(this.listeners[k]??=[]).push(f);}dispatch(k,e={}){for(const f of this.listeners[k]??[])f({target:this,...e});}}
 class Element extends Target{
  children=[];attributes={};dataset={};value='';textContent='';hidden=false;style={};classList={toggle:()=>false};
  constructor(tag='div',attrs=[]){super();this.tag=tag;for(const a of attrs)this.setAttribute(a.name,a.value);this.value=this.attributes.value??'';}
  setAttribute(k,v){this.attributes[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5)]=String(v);}
  getAttribute(k){return this.attributes[k]??null;}append(e){this.children.push(e);}
  querySelectorAll(selector){const all=this.children.flatMap(e=>[e,...e.querySelectorAll('*')]);return all.filter(e=>selector==='*'||selector==='main'&&e.tag==='main'||selector[0]==='#'&&e.attributes.id===selector.slice(1)||/^\[/.test(selector)&&selector.slice(1,-1) in e.attributes);}
  querySelector(s){return this.querySelectorAll(s)[0]??null;}
  set innerHTML(html){this.children=[];register(parseFragment(html),this);}
  getTotalLength(){return 100;}getPointAtLength(n){return{x:n,y:n};}closest(){return null;}scrollIntoView(){}
 }
 function register(tree,parent){if(tree.tagName){const el=new Element(tree.tagName,tree.attrs);parent.append(el);parent=el;}for(const child of tree.childNodes??[])register(child,parent);}
 const document=new Target(),body=new Element();document.hidden=false;document.body=body;document.createElementNS=()=>new Element();document.querySelectorAll=s=>body.querySelectorAll(s);document.querySelector=s=>body.querySelector(s);document.getElementById=id=>body.querySelector('#'+id);
 const root=path.resolve('topics/sound-vibrations');register(parseFragment(fs.readFileSync(path.join(root,'index.html'),'utf8')),body);
 const window=new Target(),animations=[],frames=new Map();let frameId=0;const audio={created:0,stopped:0,disconnected:0,resume:[]};
 class AudioContext{currentTime=0;destination={};resume(){return new Promise(resolve=>audio.resume.push(resolve));}suspend(){}close(){}createOscillator(){audio.created++;return{frequency:{},connect(){},start(){},stop(){audio.stopped++;},disconnect(){audio.disconnected++;}};}createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}}
 const location=new URL('https://wiki.test/topics/sound-vibrations/?lang=en&keep=1');
 const host={document,window,AudioContext,URLSearchParams,location,history:{pushState(_a,_b,url){location.href=new URL(url,location).href;}},performance:{now:()=>0},requestAnimationFrame:f=>{frames.set(++frameId,f);return frameId;},cancelAnimationFrame:id=>frames.delete(id),t:(s,values={})=>s.replace(/\{\{(.*?)\}\}/g,(_,k)=>values[k]??''),earT:s=>s,translateDocument(){},mountTopicNavigation(){},mountReadingMode(){},languageHref:s=>s,animateValue(options){const a={...options,active:true};animations.push(a);options.onUpdate(options.from);return()=>a.active=false;}};
 function load(file,deps={}){const source=ts.createSourceFile(file,fs.readFileSync(path.resolve(root,file),'utf8'),ts.ScriptTarget.Latest,true);const module=ts.factory.updateSourceFile(source,source.statements.filter(n=>!ts.isImportDeclaration(n)));const js=ts.transpileModule(ts.createPrinter().printFile(module),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const exports={};vm.runInNewContext(js,{...host,...deps,exports},{filename:file});return exports;}
 const model=load('model.ts'),scene=load('scene.ts',model),source=load('sourceStudy.ts',{...model,...scene});
 const earModel=load('../hearing/model.ts'),earScene=load('../hearing/scene.ts',earModel),ear=load('../hearing/study.ts',{...earModel,...earScene});
 load('main.ts',{...source,...ear,...load('projectModel.ts'),sourcePanel:fs.readFileSync(path.join(root,'sourcePanel.html'),'utf8'),earPanel:fs.readFileSync(path.join(root,'../hearing/panel.html'),'utf8')});
 const get=id=>{const e=document.getElementById(id);assert.ok(e,`missing real DOM #${id}`);return e;};
 return{get,document,window,audio,frames,animations,location,chapter(name){body.querySelectorAll('[data-chapter]').find(b=>b.dataset.chapter===name).dispatch('click');},preset(name){body.querySelectorAll('[data-condition]').find(b=>b.dataset.condition===name).dispatch('click');},input(id,value){get(id).value=String(value);get(id).dispatch('input');},advance(fraction){const a=animations.at(-1);if(a.active){a.onUpdate(a.from+(a.to-a.from)*fraction);if(fraction===1){a.active=false;a.onComplete?.();}}}};
}
test('composed studies retain independent progress and suspend on chapter change',()=>{
 const h=harness();h.input('phase',740);h.get('play').dispatch('click');assert.equal(h.frames.size,1);h.chapter('ear');assert.equal(h.frames.size,0);h.input('h-progress',62);h.get('h-play').dispatch('click');h.advance(.2);const earProgress=h.get('h-progress').value;h.chapter('compare');assert.ok(h.animations.every(a=>!a.active));h.chapter('source');assert.equal(h.get('phase').value,'740');h.chapter('ear');assert.equal(h.get('h-progress').value,earProgress);assert.equal(h.location.searchParams.get('keep'),'1');
});
test('shared presets drive real source controls and ear geometry without moving pitch on amplitude change',()=>{
 const h=harness();h.chapter('ear');h.input('h-progress',62);h.preset('base');const before=h.get('place-circle').getAttribute('cx');h.preset('amplitude');assert.equal(h.get('amplitude').value,'50');assert.equal(h.get('place-circle').getAttribute('cx'),before);assert.equal(h.get('h-progress').value,'62');h.preset('pitch');assert.equal(h.get('tension').value,'4');assert.ok(Number(h.get('place-circle').getAttribute('cx'))<Number(before));assert.match(h.get('condition-summary').textContent,/392/);
});
test('leaving a chapter invalidates pending audio; only explicit listen creates a bounded tone',async()=>{
 const h=harness();assert.equal(h.audio.created,0);h.get('pluck').dispatch('click');h.chapter('ear');h.audio.resume.shift()();await new Promise(setImmediate);assert.equal(h.audio.created,0);h.chapter('source');h.get('pluck').dispatch('click');h.audio.resume.shift()();await new Promise(setImmediate);assert.equal(h.audio.created,1);h.document.hidden=true;h.document.dispatch('visibilitychange');assert.ok(h.audio.stopped>=1);assert.ok(h.audio.disconnected>=1);
});
test('ear lifecycle hides without continued motion and restored camera stays selected',()=>{
 const h=harness();h.chapter('ear');h.get('h-play').dispatch('click');h.advance(.3);const progress=h.get('h-progress').value;h.document.hidden=true;h.document.dispatch('visibilitychange');assert.ok(h.animations.every(a=>!a.active));h.window.dispatch('pagehide',{persisted:true});h.window.dispatch('pageshow',{persisted:true});assert.equal(h.get('h-progress').value,progress);assert.equal(h.get('h-pause').disabled,true);
});
