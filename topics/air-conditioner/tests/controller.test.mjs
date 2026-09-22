/**
 * Run from the mini-wiki repository root:
 *   node --test topics/air-conditioner/tests/controller.test.mjs
 *
 * Executes the real device models/renderers/studies and composed main entry, with a small DOM adapter
 * and a manually advanced animation scheduler. No production state transition
 * or energy formula is reimplemented here. This is controller-level lifecycle
 * evidence, not proof of a particular browser's BFCache eligibility.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const root=resolve(process.env.WIKI_REPO ?? process.cwd());
const require=createRequire(resolve(root,'package.json'));
const ts=require('typescript');
const {parse,parseFragment}=await import(require.resolve('parse5'));
const topic=resolve(root,'topics/air-conditioner');
const html=readFileSync(resolve(topic,'index.html'),'utf8');

function harness(controllerSource,{project=false,search=''}={}) {
 const ids=new Map(),elements=[];
 class Target {
  listeners=new Map();
  addEventListener(type,fn){const list=this.listeners.get(type)??[];list.push(fn);this.listeners.set(type,list);}
  removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)??[]).filter(item=>item!==fn));}
  dispatch(type,details={}){for(const fn of this.listeners.get(type)??[])fn({type,target:this,...details});}
 }
 class Element extends Target {
  style={};textContent='';value='';disabled=false;dataset={};attributes={};
  constructor(attributes=[]) {
   super();
   for(const {name,value} of attributes)this.setAttribute(name,value);
   this.value=this.attributes.value??'';
   this.disabled='disabled' in this.attributes;
  }
  setAttribute(name,value){
   this.attributes[name]=String(value);
   if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);
  }
  getAttribute(name){return this.attributes[name]??null;}
  set innerHTML(markup){register(parseFragment(markup));}
 }
 function register(tree) {
  if(tree.tagName){const element=new Element(tree.attrs);elements.push(element);if(element.attributes.id)ids.set(element.attributes.id,element);}
  for(const child of tree.childNodes??[])register(child);
 }
 register(parse(html));
 const document=new Target(); document.hidden=false;
 document.getElementById=id=>{assert.ok(ids.has(id),`Real HTML/SVG must contain #${id}`);return ids.get(id);};
 document.querySelectorAll=selector=>{
  const match=/^\[([\w-]+)\]$/.exec(selector);
  assert.ok(match,`Unexpected selector: ${selector}`);
  return elements.filter(element=>match[1] in element.attributes);
 };
 const window=new Target(),animations=[];
 function animateValue(options) {
  const handle={...options,active:true};animations.push(handle);options.onUpdate(options.from);
  return ()=>{handle.active=false;};
 }
 function advance(handle,fraction) {
  if(!handle.active)return;
  handle.onUpdate(handle.from+(handle.to-handle.from)*fraction);
  if(fraction===1){handle.active=false;handle.onComplete?.();}
 }
 const noop=()=>{};
 const location=new URL('https://wiki.test/topics/air-conditioner/'+search);
 const history={pushState(_state,_unused,href){const next=new URL(href,location);location.href=next.href;}};
 // Presentation DOM is exercised in browser checks; this adapter isolates experiment lifetimes.
 const host={mountPresentationFrame(){},foldPresentationContext(){},document,window,location,history,URLSearchParams,console,t:value=>value,translateDocument:noop,mountTopicNavigation:noop,mountReadingMode:noop,animateValue};
 function load(name,dependencies={},override) {
  const source=override??readFileSync(resolve(topic,name),'utf8');
  const parsed=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  // Remove only module imports, then reparse through the compiler. Each module
  // retains its actual declarations; imported dependencies are explicitly injected.
  const standalone=ts.factory.updateSourceFile(parsed,parsed.statements.filter(statement=>!ts.isImportDeclaration(statement)));
  const printed=ts.createPrinter().printFile(standalone);
  const output=ts.transpileModule(printed,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={};
  vm.runInNewContext(output,{...host,...dependencies,exports},{filename:resolve(topic,name)});
  return exports;
 }
 const model=load('model.ts');
 const scene=load('scene.ts',model);
 const {mountAirStudy}=load('airStudy.ts',{...model,...scene},controllerSource);
 let study;
 if(project){
  const refrigeratorModel=load('../refrigerator/model.ts');
  const refrigeratorScene=load('../refrigerator/scene.ts',{...refrigeratorModel,paths:refrigeratorModel.refrigerantPaths});
  const {mountRefrigeratorStudy}=load('../refrigerator/study.ts',{...refrigeratorModel,...refrigeratorScene});
  const projectModel=load('projectModel.ts');
  load('main.ts',{mountAirStudy,mountRefrigeratorStudy,...refrigeratorModel,...projectModel,
   languageHref:value=>value,refrigeratorPanel:readFileSync(resolve(topic,'../refrigerator/panel.html'),'utf8')});
 }else study=mountAirStudy();
 const get=id=>document.getElementById(id);
 const mode=target=>document.querySelectorAll('[data-cooling]').find(button=>button.dataset.cooling===String(target));
 return {
  get,animations,advance,study,document,window,location,
  selectChapter(chapter){document.querySelectorAll('[data-chapter]').find(b=>b.dataset.chapter===chapter).dispatch('click');},
  input(id,value,event='input'){get(id).value=String(value);get(id).dispatch(event);},
  clickMode(target){mode(target).dispatch('click');return animations.at(-1);},
  setProgress(percent){get('progress').value=String(percent);get('progress').dispatch('input');},
  restore(){window.dispatch('pagehide',{persisted:true});window.dispatch('pageshow',{persisted:true});},
  assertMode(target,progress){
   assert.equal(mode(target).getAttribute('aria-pressed'),'true');
   assert.equal(mode(1-target).getAttribute('aria-pressed'),'false');
   assert.equal(Number(get('progress').value),progress,'changing/restoring mode must preserve progress');
   const energy=['cold','work','hot'].map(id=>Number(get(`${id}-value`).textContent));
   assert.deepEqual(energy,target?[3,1,4]:[0,0,0]);
   assert.equal(get('heat').getAttribute('opacity'),String(target),'heat arrows agree with mode');
   assert.equal(get('outdoor-air').getAttribute('opacity'),String(target),'outdoor heat plume agrees with mode');
   assert.equal(get('parcels').getAttribute('opacity'),String(target),'refrigerant motion indicators agree with mode');
   if(target){
    assert.equal(get('phase-title').textContent,'室外放热');
    assert.match(get('mode-note').textContent,/室内盘管吸热，室外盘管放热/);
    assert.match(get('energy-note').textContent,/3 份热.*1 份功.*4 份热/);
   } else {
    assert.equal(get('phase-title').textContent,'风扇让空气流动');
    assert.equal(get('phase-state').textContent,'没有制冷循环');
    assert.match(get('mode-note').textContent,/只送风.*没有这个循环送来的热量/);
    assert.match(get('phase-text').textContent,/冷媒循环没有开启/);
    assert.match(get('energy-note').textContent,/只送风时它们为零/);
   }
  },
 };
}

test('leaving during cooling → fan-only restores selected mode, zero cycle heat and explanations',()=>{
 const h=harness();h.setProgress(63);
 const modeTransition=h.clickMode(0);h.advance(modeTransition,.2);
 assert.equal(h.get('hot-value').textContent,'3.2','exercise an actual intermediate cooling state');
 h.restore();h.assertMode(0,63);
 const stoppedFan=h.get('fan').getAttribute('transform');
 h.setProgress(73);
 assert.equal(h.get('fan').getAttribute('transform'),stoppedFan,'outdoor fan stays stopped when progress is scrubbed in fan-only mode');
 assert.equal(modeTransition.active,false,'pagehide cancels the old transition');
});

test('leaving during fan-only → cooling restores the complete cooling cycle',()=>{
 const h=harness();h.setProgress(63);
 h.advance(h.clickMode(0),1);
 const modeTransition=h.clickMode(1);h.advance(modeTransition,.2);
 assert.equal(h.get('hot-value').textContent,'0.8');
 h.restore();h.assertMode(1,63);
 assert.equal(modeTransition.active,false);
});

test('rapid reversals restore the latest selected mode without stale animation updates',()=>{
 const h=harness();h.setProgress(63);
 const first=h.clickMode(0);h.advance(first,.35);
 const second=h.clickMode(1);h.advance(second,.3);
 const third=h.clickMode(0);h.advance(third,.5);
 assert.equal(first.active,false);assert.equal(second.active,false);
 h.restore();h.assertMode(0,63);
 assert.equal(third.active,false);
 h.advance(first,1);h.advance(second,1);h.advance(third,1);
 h.assertMode(0,63);
});

test('composed entry preserves both devices while chapter changes stop every animation',()=>{
 const h=harness(undefined,{project:true});
 h.setProgress(63);h.get('play').dispatch('click');h.advance(h.animations.at(-1),.1);
 const airProgress=h.get('progress').value;
 h.selectChapter('fridge');
 assert.ok(h.animations.every(a=>!a.active));assert.equal(h.get('air-panel').hidden,true);
 h.input('fr-plan','visit','change');h.input('fr-progress',450);
 h.get('fr-play').dispatch('click');h.advance(h.animations.at(-1),.1);
 const food=h.get('fr-food-value').textContent,fridgeProgress=h.get('fr-progress').value;
 h.selectChapter('room');assert.ok(h.animations.every(a=>!a.active));
 h.selectChapter('air');assert.equal(h.get('progress').value,airProgress);
 h.selectChapter('fridge');assert.equal(h.get('fr-progress').value,fridgeProgress);
 assert.equal(h.get('fr-food-value').textContent,food);assert.equal(h.get('fr-plan').value,'visit');
 assert.equal(h.get('fridge-panel').hidden,false);assert.equal(h.get('room-panel').hidden,true);
 assert.match(h.get('shared-cold').textContent,/kJ$/);
});

test('actual entry supports direct fridge route, history, and live room work projection',()=>{
 const h=harness(undefined,{project:true,search:'?chapter=fridge&lang=en&custom=keep#anchor'});
 assert.equal(h.get('fridge-panel').hidden,false);
 h.selectChapter('room');assert.equal(h.location.searchParams.get('custom'),'keep');assert.equal(h.location.hash,'#anchor');
 h.input('boundary-work',2);assert.match(h.get('shared-cold').textContent,/^6.0 /);assert.match(h.get('shared-hot').textContent,/^8.0 /);
 h.input('heat-placement','same-room','change');
 assert.equal(h.get('shared-hot-place').textContent,'热端：同一房间');
 h.location.search='?chapter=fridge';h.window.dispatch('popstate');
 assert.equal(h.get('fridge-panel').hidden,false);assert.equal(h.get('room-panel').hidden,true);
});

test('chapter suspension commits selected AC mode and hidden documents halt fridge work',()=>{
 const h=harness(undefined,{project:true});
 h.setProgress(63);const mode=h.clickMode(0);h.advance(mode,.2);
 h.selectChapter('fridge');h.selectChapter('air');h.assertMode(0,63);
 h.selectChapter('fridge');h.get('fr-play').dispatch('click');h.advance(h.animations.at(-1),.2);
 const p=h.get('fr-progress').value;
 h.document.hidden=true;h.document.dispatch('visibilitychange');
 assert.ok(h.animations.every(a=>!a.active));assert.equal(h.get('fr-progress').value,p);
});
