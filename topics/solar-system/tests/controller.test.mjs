import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {parse} from 'parse5';
import * as model from '../explorer/model.ts';
import * as ringModel from '../explorer/ringsModel.ts';
import {PLANETS_DATA,SUN_DATA} from '../data/planetsData.ts';
import {INTERIORS} from '../../planet-surfaces/interior.ts';
const root=resolve(process.cwd(),'topics/solar-system');
const json=name=>JSON.parse(readFileSync(resolve(root,'explorer',name+'.json'),'utf8'));
const authored=Object.fromEntries(['bodies','ui','rings','motions','fidelity'].map(name=>[name,json(name)]));
authored.moonContent=json('moons');
function standalone(path){
  const source=readFileSync(path,'utf8'),parsed=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const statements=parsed.statements.filter(node=>!ts.isImportDeclaration(node));
  return ts.transpileModule(ts.createPrinter().printFile(ts.factory.updateSourceFile(parsed,statements)),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
}

// Execute the production controller and authored HTML/data. The renderer adapter
// records its state; layout, hit testing and WebGL appearance remain browser checks.
function harness(language='zh-CN',reduced=false){
  const ids=new Map(),elements=[],scenes=[];
  class Element{
    attributes={};dataset={};style={};children=[];value='';textContent='';hidden=false;
    classList={add(){},remove(){}};
    constructor(tag='div',attrs=[]){this.tag=tag;for(const {name,value} of attrs)this.setAttribute(name,value);this.value=this.attributes.value??'';}
    set id(value){this.setAttribute('id',value);ids.set(value,this);}
    get id(){return this.attributes.id??'';}
    setAttribute(name,value){this.attributes[name]=String(value);if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
    getAttribute(name){return this.attributes[name]??null;}
    append(...children){this.children.push(...children);}
    after(){}
    replaceChildren(...children){this.children=children;}
    cloneNode(){const e=new Element(this.tag);e.attributes={...this.attributes};e.dataset={...this.dataset};e.textContent=this.textContent;return e;}
    querySelectorAll(selector){assert.equal(selector,'button');return this.children.filter(e=>e.tag==='button');}
  }
  function register(node,parent){
    let next=parent;
    if(node.tagName){next=new Element(node.tagName,node.attrs);elements.push(next);parent?.append(next);if(next.attributes.id)ids.set(next.attributes.id,next);}
    for(const child of node.childNodes??[])register(child,next);
  }
  register(parse(readFileSync(resolve(root,'index.html'),'utf8')));
  const get=id=>{assert.ok(ids.has(id),'production markup must contain '+id);return ids.get(id);};
  const matches=(e,selector)=>selector==='.explorer-views'?e.attributes.class?.split(' ').includes('explorer-views'):selector==='[data-explore-view]'?'exploreView'in e.dataset:false;
  const document={hidden:false,body:new Element('body'),getElementById:get,
    createElement(tag){const e=new Element(tag);elements.push(e);return e;},
    querySelector:selector=>elements.find(e=>matches(e,selector)),querySelectorAll:selector=>elements.filter(e=>matches(e,selector))};
  const location=new URL('https://wiki.test/topics/solar-system/?reading=academic&custom=keep#world-comparison');
  const history={replaceState(_state,_title,url){location.href=new URL(url,location).href;}};
  class ExplorerScene{
    calls=[];disposed=false;
    constructor(){scenes.push(this);}
    set(...args){this.calls.push(args);}
    labels(){return[];}
    dispose(){this.disposed=true;}
  }
  const exports={};
  vm.runInNewContext(standalone(resolve(root,'explorer/controller.ts')),{...model,...ringModel,...authored,PLANETS_DATA,SUN_DATA,
    profileFor:id=>id==='sun'?json('sun-interior'):INTERIORS[model.worldFor(id).id],ExplorerScene,document,location,history,
    language,languageHref:value=>value,matchMedia:()=>({matches:reduced}),URL,URLSearchParams,exports});
  const controller=new exports.ExplorerController(()=>{});
  return{controller,get,document,location,scenes,
    view(view){elements.find(e=>e.dataset.exploreView===view).onclick();},
    progress(value){get('explorer-progress').value=String(value);get('explorer-progress').oninput({target:get('explorer-progress')});},
    site(value){controller.siteSelect.value=value;controller.siteSelect.onchange();},
    snapshot(){return scenes[0].calls.at(-1);},
  };
}

test('descent and section retain independent positions through repeated view, language-mode and body changes',()=>{
  for(const language of ['zh-CN','en']){
    const h=harness(language);h.controller.open('earth','descent');h.progress(430);
    h.view('section');assert.equal(h.get('explorer-progress').value,'0');h.progress(710);
    for(let i=0;i<12;i++){
      h.view('globe');h.controller.setAcademic(Boolean(i%2));h.view('descent');
      assert.equal(h.get('explorer-progress').value,'430');assert.equal(h.snapshot()[2],.43);
      h.view('section');assert.equal(h.get('explorer-progress').value,'710');assert.equal(h.snapshot()[2],.71);
    }
    h.get('descent-reset').onclick();assert.equal(h.get('explorer-progress').value,'0');
    h.view('descent');assert.equal(h.get('explorer-progress').value,'430');
    h.controller.open('mars','descent');assert.equal(h.get('explorer-progress').value,'0');h.progress(230);
    h.controller.open('earth','descent');assert.equal(h.get('explorer-progress').value,'430');
    h.controller.close();h.controller.open('earth','descent');assert.equal(h.get('explorer-progress').value,'430');
    assert.equal(h.scenes.length,1);assert.equal(h.location.searchParams.get('custom'),'keep');assert.equal(h.location.hash,'#world-comparison');
  }
});

test('view navigation stops travel without stopping independent activity or carrying progress into another view',()=>{
  const h=harness();h.controller.open('earth','descent');h.progress(500);h.get('descent-play').onclick();h.controller.tick(1);
  const progress=h.snapshot()[2],time=h.snapshot()[3];assert.ok(progress>.5);
  h.view('section');h.controller.tick(2);assert.equal(h.snapshot()[2],0);assert.ok(h.snapshot()[3]>time);
  h.view('descent');h.controller.tick(2);assert.equal(h.snapshot()[2],progress);
  h.get('activity-play').onclick();const frozenTime=h.snapshot()[3];h.controller.tick(2);assert.equal(h.snapshot()[3],frozenTime);
  h.get('descent-play').onclick();h.controller.tick(1);assert.ok(h.snapshot()[2]>progress);assert.equal(h.snapshot()[3],frozenTime);
  const at=h.snapshot()[2];h.controller.suspend(true);h.controller.tick(8);assert.equal(h.snapshot()[2],at);
  h.controller.suspend(false);h.document.hidden=true;h.controller.tick(8);assert.equal(h.snapshot()[2],at);
  h.document.hidden=false;h.controller.close();h.controller.tick(8);assert.equal(h.snapshot()[2],at);
  h.controller.open('earth','descent');h.controller.tick(1);assert.equal(h.snapshot()[2],at);
  h.controller.dispose();assert.equal(h.scenes[0].disposed,true);
});

test('Saturn ring subview survives fast excursions and a selected site resets only its descent',()=>{
  const h=harness('en',true);h.controller.open('saturn','rings');
  h.get('explorer-steps').children[3].onclick();assert.equal(h.snapshot()[2],1);
  h.view('section');h.progress(650);
  for(let i=0;i<12;i++){h.view('moons');h.view('rings');assert.equal(h.snapshot()[2],1);h.view('section');assert.equal(h.snapshot()[2],.65);}
  h.view('descent');h.progress(610);h.view('globe');
  const site=model.sitesFor('saturn').find(site=>site.id!==h.controller.siteKey);assert.ok(site);h.site(site.id);
  h.view('descent');assert.equal(h.snapshot()[2],0);h.view('section');assert.equal(h.snapshot()[2],.65);
  h.view('rings');assert.equal(h.snapshot()[2],1);const time=h.snapshot()[3];h.controller.tick(4);assert.equal(h.snapshot()[3],time);
});

test('endpoint replay, reverse scrubbing and reset affect only the currently observed journey',()=>{
  const h=harness();h.controller.open('earth','section');h.progress(820);
  h.view('descent');h.progress(1000);h.get('descent-play').onclick();assert.equal(h.snapshot()[2],0);
  h.controller.tick(40);assert.equal(h.snapshot()[2],1);h.controller.tick(2);assert.equal(h.snapshot()[2],1);
  h.progress(250);assert.equal(h.snapshot()[2],.25);h.controller.tick(2);assert.equal(h.snapshot()[2],.25);
  h.view('section');assert.equal(h.snapshot()[2],.82);h.get('descent-reset').onclick();
  h.view('descent');assert.equal(h.snapshot()[2],.25);
  h.view('section');assert.equal(h.snapshot()[2],0);
});

test('Space on a native disclosure or its child leaves disclosure activation to the browser',()=>{
  for(const topic of ['solar-system','earth-moon','lunar-craters']){
    const path=resolve(root,'..',topic,'main.ts'),parsed=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
    let callback;
    function find(node){
      if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(parsed)==='document'&&node.expression.name.text==='addEventListener'&&node.arguments[0]?.text==='keydown')callback=node.arguments[1];
      ts.forEachChild(node,find);
    }
    find(parsed);assert.ok(callback,topic+' keyboard handler');
    const code=ts.transpileModule('function bind(){return '+callback.getText(parsed)+';} handler=bind.call(owner);',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
    let toggles=0,prevented=0;const context={owner:{dialog:{open:false},explorer:{active:false},togglePlay:()=>toggles++},toggle:()=>toggles++};
    vm.runInNewContext(code,context);
    for(const ancestor of ['summary','button','input'])context.handler({code:'Space',repeat:false,target:{closest:selector=>selector.split(',').includes(ancestor)?{}:null},preventDefault:()=>prevented++});
    assert.equal(prevented,0,topic+' native action');assert.equal(toggles,0,topic+' playback');
    context.handler({code:'Space',repeat:false,target:{closest:()=>null},preventDefault:()=>prevented++});assert.equal(prevented,1);assert.equal(toggles,1);
    context.handler({code:'Space',repeat:true,target:{closest:()=>null},preventDefault:()=>prevented++});assert.equal(toggles,1);
  }
});
