/** Real source controllers + rendered HTML against a deterministic DOM/animation adapter.
 * Browser layout, pointer hit testing and packaged loading remain integration checks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {parse,parseFragment} from 'parse5';
const root=resolve(process.cwd(),'topics/friction');
function harness(search=''){
 const ids=new Map(),elements=[],rafs=new Map(),animations=[];
 let frameId=0,now=100;
 class Target{
  listeners=new Map();
  addEventListener(type,fn){this.listeners.set(type,[...(this.listeners.get(type)??[]),fn]);}
  removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)??[]).filter(f=>f!==fn));}
  dispatch(type){for(const fn of this.listeners.get(type)??[])fn({type,target:this});}
 }
 class Element extends Target{
  attributes={};dataset={};style={};value='';textContent='';hidden=false;disabled=false;children=[];
  constructor(attrs=[]){super();for(const {name,value} of attrs)this.setAttribute(name,value);this.value=this.attributes.value??'';}
  setAttribute(name,value){this.attributes[name]=String(value);if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  set innerHTML(html){register(parseFragment(html));}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
 }
 function register(node){
  if(node.tagName){const e=new Element(node.attrs);elements.push(e);if(e.attributes.id)ids.set(e.attributes.id,e);
   if(node.tagName==='select')e.value=node.childNodes.find(n=>n.tagName==='option')?.attrs.find(a=>a.name==='value')?.value??'';
  }
  for(const child of node.childNodes??[])register(child);
 }
 register(parse(readFileSync(resolve(root,'index.html'),'utf8')));
 const document=new Target();document.hidden=false;
 document.getElementById=id=>{assert.ok(ids.has(id),'real markup must contain '+id);return ids.get(id);};
 document.querySelectorAll=selector=>{const m=/^\[([\w-]+)\]$/.exec(selector);assert.ok(m,'unexpected selector '+selector);return elements.filter(e=>m[1] in e.attributes);};
 document.createElement=()=>new Element();document.createElementNS=()=>new Element();
 const window=new Target(),media=new Target();media.matches=false;window.matchMedia=()=>media;
 const location=new URL('https://wiki.test/topics/friction/'+search);
 const history={pushState(_state,_unused,url){location.href=new URL(url,location).href;}};
 const requestAnimationFrame=fn=>{rafs.set(++frameId,fn);return frameId;},cancelAnimationFrame=id=>rafs.delete(id);
 function animateValue(options){const h={...options,active:true};animations.push(h);options.onUpdate(options.from);return()=>h.active=false;}
 const t=(s,values={})=>s.replace(/\{\{(\w+)\}\}/g,(_,key)=>String(values[key]??key));
 // Presentation DOM is exercised in browser checks; this adapter isolates experiment lifetimes.
 const host={mountPresentationFrame(){},foldPresentationContext(){},document,window,location,history,URLSearchParams,matchMedia:()=>media,requestAnimationFrame,cancelAnimationFrame,performance:{now:()=>now},animateValue,t,carT:t,console,translateDocument:()=>{},mountTopicNavigation:()=>{},mountReadingMode:()=>{}};
 function load(name,dependencies={}){
  const source=readFileSync(resolve(root,name),'utf8'),parsed=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const standalone=ts.factory.updateSourceFile(parsed,parsed.statements.filter(s=>!ts.isImportDeclaration(s)));
  const output=ts.transpileModule(ts.createPrinter().printFile(standalone),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,exports={};
  vm.runInNewContext(output,{...host,...dependencies,exports},{filename:name});return exports;
 }
 const model=load('model.ts'),project=load('projectModel.ts'),carModel=load('../car-safety/model.ts');
 const slider=load('slidingStudy.ts',model),contact=load('contactStudy.ts',project),car=load('../car-safety/study.ts',carModel);
 load('main.ts',{...slider,...contact,...car,...project,
  carPanel:readFileSync(resolve(root,'../car-safety/panel.html'),'utf8'),carContact:readFileSync(resolve(root,'../car-safety/contact.html'),'utf8'),languageHref:v=>v});
 const get=id=>document.getElementById(id);
 const click=(attr,value)=>document.querySelectorAll('['+attr+']').find(b=>b.getAttribute(attr)===value).dispatch('click');
 return {get,document,window,media,location,rafs,animations,
  input(id,value,type='input'){get(id).value=String(value);get(id).dispatch(type);},
  chapter(value){click('data-motion-chapter',value);},click,
  tick(ms=100){now+=ms;const pending=[...rafs.values()];rafs.clear();for(const fn of pending)fn(now);},
  advance(h,fraction){if(!h.active)return;h.onUpdate(h.from+(h.to-h.from)*fraction);if(fraction===1){h.active=false;h.onComplete?.();}},
 };
}
test('sliding playback starts only on request, scrubs backward, and preserves progress between chapters',()=>{
 const h=harness();assert.equal(h.rafs.size,0);
 h.get('finish').dispatch('click');h.tick(700);const time=h.get('time').value;assert.ok(Number(time)>0);
 h.chapter('contact');assert.equal(h.rafs.size,0);
 h.input('contact-progress',57);assert.ok(Math.abs(Number(h.get('contact-progress').value)-57)<1e-10);
 h.chapter('slide');assert.equal(h.get('time').value,time);
 h.input('time',.2);assert.equal(h.get('time').value,'0.2');
 h.input('contact-lane',1,'change');assert.equal(h.get('time').value,'0.2');
 h.input('speed',3);assert.equal(h.get('time').value,'0');
});
test('car controls retain dry/wet, speed and progress; restraints persist without hidden animation',()=>{
 const h=harness('?chapter=braking&lang=en');
 h.input('car-speed',60);h.click('data-road','wet');h.input('car-progress',55);
 assert.equal(h.get('car-total-value').textContent,'63.0 米');
 const location=h.get('car-car').getAttribute('transform');
 h.chapter('restraints');h.click('data-fit','lap');const belt=h.animations.at(-1);h.advance(belt,.4);
 h.click('data-seat','booster');const title=h.get('car-seat-title').textContent;
 h.chapter('slide');assert.equal(belt.active,false);assert.equal(h.get('car-belt-highlight').getAttribute('cy'),'282');
 h.chapter('restraints');assert.equal(h.get('car-seat-title').textContent,title);
 h.chapter('braking');assert.equal(h.get('car-progress').value,'55');assert.equal(h.get('car-car').getAttribute('transform'),location);
 assert.equal(h.get('car-speed').value,'60');
});
test('the road position marker stays aligned with the same car while time is scrubbed both ways',()=>{
 const h=harness('?chapter=braking');const marker=h.get('car-ruler').children.at(-1);
 const aligned=()=>{
  const carX=Number(h.get('car-car').getAttribute('transform').match(/translate\(([-\d.]+)/)[1])+175;
  const markerX=Number(marker.getAttribute('transform').match(/translate\(([-\d.]+)/)[1]);
  assert.ok(Math.abs(carX-markerX)<1e-8);
 };
 aligned();h.input('car-progress',72);aligned();h.input('car-progress',18);aligned();
 h.input('car-progress',100);aligned();assert.equal(marker.children[1].getAttribute('fill'),'#405750');
});
test('shared energy follows real block and car state; reaction is not braking',()=>{
 const h=harness();h.input('time',4);assert.equal(h.get('motion-k-value').textContent,'0%');
 assert.equal(h.get('motion-t-value').textContent,'100%');
 h.chapter('braking');h.input('car-progress',0);assert.equal(h.get('motion-k-value').textContent,'100%');
 h.input('car-progress',70);assert.ok(parseInt(h.get('motion-k-value').textContent)<100);
 h.input('car-progress',100);assert.equal(h.get('motion-k-value').textContent,'0%');
 h.input('car-progress',0);assert.equal(h.get('motion-k-value').textContent,'100%');
});
test('rolling and locked contact preserve the mark, pause on chapter change, and honor history',()=>{
 const h=harness('?custom=keep#unknown');h.chapter('contact');h.input('contact-progress',40);
 assert.notEqual(h.get('contact-mark').getAttribute('cx'),'220');
 h.click('data-contact-mode','sliding');h.input('contact-progress',40);
 assert.equal(h.get('contact-mark').getAttribute('cx'),'220');
 assert.equal(h.get('contact-mark').getAttribute('cy'),'185');
 h.get('contact-play').dispatch('click');const animation=h.animations.at(-1);h.advance(animation,.2);
 const progress=h.get('contact-progress').value;h.chapter('braking');assert.equal(animation.active,false);
 h.location.search='?chapter=contact';h.window.dispatch('popstate');assert.equal(h.get('contact-progress').value,progress);
 assert.equal(h.get('contact-panel').hidden,false);
});
test('hidden and pagehide stop car, slider and belt work; reduced motion keeps controls usable',()=>{
 const h=harness('?chapter=braking');h.get('car-play').dispatch('click');h.tick();h.tick();
 const progress=h.get('car-progress').value;h.document.hidden=true;h.document.dispatch('visibilitychange');
 assert.equal(h.rafs.size,0);h.tick();assert.equal(h.get('car-progress').value,progress);
 h.media.matches=true;h.get('car-play').dispatch('click');assert.equal(h.get('car-progress').value,'100');
 h.chapter('slide');h.get('finish').dispatch('click');assert.equal(h.get('time').value,'4');assert.equal(h.rafs.size,0);
 h.input('time',.4);assert.equal(h.get('time').value,'0.4');
 h.window.dispatch('pagehide');assert.equal(h.rafs.size,0);
});
