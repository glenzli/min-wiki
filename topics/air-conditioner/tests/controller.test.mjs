/**
 * Run from the mini-wiki repository root:
 *   node --test topics/air-conditioner/tests/controller.test.mjs
 *
 * Executes the current model.ts, scene.ts and main.ts, with a small DOM adapter
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

function harness(controllerSource) {
 const ids=new Map(),elements=[];
 class Target {
  listeners=new Map();
  addEventListener(type,fn){const list=this.listeners.get(type)??[];list.push(fn);this.listeners.set(type,list);}
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
 const host={document,window,console,t:value=>value,translateDocument:noop,mountTopicNavigation:noop,mountReadingMode:noop,animateValue};
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
 load('main.ts',{...model,...scene},controllerSource);
 const get=id=>document.getElementById(id);
 const mode=target=>document.querySelectorAll('[data-cooling]').find(button=>button.dataset.cooling===String(target));
 return {
  get,animations,advance,
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
