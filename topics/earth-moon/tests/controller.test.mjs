import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {parse} from 'parse5';
import * as model from '../model.ts';

const root=resolve(process.cwd(),'topics/earth-moon');
function standalone(path){
  const parsed=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  return ts.transpileModule(ts.createPrinter().printFile(ts.factory.updateSourceFile(parsed,parsed.statements.filter(node=>!ts.isImportDeclaration(node)))),
    {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
}

// Production HTML, controller, authored explanations and finite transition.
// GPU projection/layout are separate browser acceptance, not adapter claims.
function harness(language='zh-CN',reduced=false){
  let now=1000,nextFrame=0;const frames=new Map(),ids=new Map(),elements=[],scenes=[];
  class Target{
    listeners={};
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
    removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]??[]).filter(other=>other!==fn);}
    emit(type,event={}){for(const fn of [...(this.listeners[type]??[])])fn(event);}
  }
  class Element extends Target{
    attributes={};dataset={};children=[];value='';checked=false;textContent='';hidden=false;disabled=false;
    constructor(tag,attrs=[]){super();this.tag=tag;for(const {name,value} of attrs)this.setAttribute(name,value);this.value=this.attributes.value??'';this.checked='checked'in this.attributes;}
    setAttribute(name,value){this.attributes[name]=String(value);if(name.startsWith('data-'))this.dataset[name.slice(5)]=String(value);}
    getAttribute(name){return this.attributes[name]??null;}
    append(child){this.children.push(child);}
    replaceChildren(...children){this.children=children;}
    querySelectorAll(selector){assert.equal(selector,'button');return this.children.filter(e=>e.tag==='button');}
    closest(selector){return selector.split(',').includes(this.tag)?this:null;}
  }
  function register(node,parent){
    let next=parent;
    if(node.tagName){next=new Element(node.tagName,node.attrs);elements.push(next);parent?.append(next);if(next.attributes.id)ids.set(next.attributes.id,next);}
    for(const child of node.childNodes??[])register(child,next);
    if(next?.tag==='select')next.value=(next.children.find(e=>'selected'in e.attributes)??next.children[0])?.value??'';
  }
  register(parse(readFileSync(resolve(root,'index.html'),'utf8')));
  const get=id=>{assert.ok(ids.has(id),'authored HTML contains '+id);return ids.get(id);};
  const document=new Target();document.hidden=false;document.body=new Element('body');document.getElementById=get;
  document.createElement=tag=>new Element(tag);document.querySelectorAll=selector=>{assert.equal(selector,'[data-mode]');return elements.filter(e=>'mode'in e.dataset);};
  const window=new Target(),media=new Target();media.matches=reduced;window.matchMedia=()=>media;
  const english=JSON.parse(readFileSync(resolve(root,'locales/en.json'),'utf8'));
  const t=(key,values={})=>(language==='en'?english[key]??key:key).replace(/{{(\w+)}}/g,(_,key)=>String(values[key]));
  class TopicScene{
    calls=[];disposed=false;
    constructor(){scenes.push(this);}draw(...args){this.calls.push(args);}dispose(){this.disposed=true;}
  }
  const context={...model,t,document,window,matchMedia:()=>media,TopicScene,console,
    performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),
    mountTopicNavigation(){},translateDocument(){}};
  function load(path){const moduleContext={...context,exports:{}};vm.runInNewContext(standalone(path),moduleContext,{filename:path});return moduleContext.exports;}
  Object.assign(context,load(resolve(root,'science.ts')),load(resolve(root,'content.ts')),load(resolve(root,'phases.ts')),
    load(resolve(root,'../../src/visuals/transition.ts')));
  vm.runInNewContext(standalone(resolve(root,'main.ts')),{...context,exports:{}},{filename:'earth-moon/main.ts'});
  function dispatch(element,type){if(element.disabled)return;const event={target:element};document.emit(type,event);element.emit(type,event);}
  return{get,document,window,media,scenes,frames,
    view(value){get('view').value=value;dispatch(get('view'),'input');},
    progress(value){get('progress').value=String(value);dispatch(get('progress'),'input');},
    mode(mode){dispatch(elements.find(e=>e.dataset.mode===mode),'click');},
    click(id){dispatch(get(id),'click');},
    step(index){dispatch(get('steps').children[index],'click');},
    space(){document.emit('keydown',{code:'Space',repeat:false,target:get('scene'),preventDefault(){}});},
    flush(ms){now+=ms;const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn(now);},
    frameAt(timestamp){const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn(timestamp);},
    snapshot(){return scenes[0].calls.at(-1);},
    theory(){return Object.fromEntries(['story-title','story','academic-brief-title','academic-brief-formula','science-formula','science-terms','science-live','science-caution','observe'].map(id=>[id,get(id).textContent]));},
  };
}

test('standalone scale explanations and readouts remain independent of saved phase in both languages',()=>{
  for(const language of ['zh-CN','en']){
    const h=harness(language);h.mode('academic');
    for(const progress of [120,370,620,910]){
      h.view('orbit');h.progress(progress);const phase=h.theory();
      h.view('scale');const scale=h.theory();
      if(language==='en')assert.equal(scale['story-title'],'One ruler for size and distance');
      assert.equal(h.snapshot()[0],progress/1000);assert.equal(h.snapshot()[2],'scale');
      assert.equal(scale['science-live'].split('\n').length,4);
      assert.ok(scale['science-live'].includes('384,400 km'));assert.ok(scale['science-live'].includes('0.273'));
      assert.ok(scale['science-live'].includes('30.2'));assert.ok(scale['science-live'].includes('29.5'));
      assert.ok(!scale['science-live'].includes('α'));assert.notEqual(scale['story'],phase['story']);
      for(let i=0;i<12;i++){
        h.mode(i%2?'kids':'academic');h.view('earth');assert.deepEqual(h.theory(),phase);
        h.view('scale');assert.deepEqual(h.theory(),scale);assert.equal(h.snapshot()[0],progress/1000);
      }
      h.view('orbit');assert.deepEqual(h.theory(),phase);assert.equal(h.get('progress').value,String(progress));
      assert.equal(h.get('play').disabled,false);assert.equal(h.get('steps').children[0].disabled,false);
    }
    assert.equal(h.scenes.length,1);
  }
});

test('a first RAF timestamp earlier than the play click cannot produce negative phase or a missing explanation',()=>{
  for(const language of ['zh-CN','en']){
    const h=harness(language);h.click('play');
    assert.doesNotThrow(()=>h.frameAt(992)); // click-time performance.now() is 1000.
    assert.equal(h.snapshot()[0],0);assert.equal(h.get('progress').value,'0');
    assert.ok(h.get('story').textContent.length>0);assert.equal(h.frames.size,1);
    assert.doesNotThrow(()=>h.frameAt(996));assert.equal(h.snapshot()[0],0);
    h.frameAt(1010);assert.ok(Math.abs(h.snapshot()[0]-.01/28)<1e-12);
    const forward=h.snapshot()[0];h.frameAt(1008);assert.equal(h.snapshot()[0],forward);
    h.frameAt(1020);assert.ok(Math.abs(h.snapshot()[0]-.02/28)<1e-12);
    h.click('play');assert.equal(h.frames.size,0);assert.ok(h.get('story').textContent.length>0);
    h.click('play');const resumed=h.snapshot()[0];h.frameAt(998);assert.equal(h.snapshot()[0],resumed);
    h.frameAt(1030);assert.ok(h.snapshot()[0]>resumed);
  }
});

test('entering a static scale study stops playback and cancels old seeks without losing phase progress',()=>{
  const h=harness('en');h.progress(430);h.click('play');h.flush(100);const saved=h.snapshot()[0];assert.ok(saved>.43);
  h.view('scale');assert.equal(h.frames.size,0);h.flush(2000);assert.equal(h.snapshot()[0],saved);
  h.space();h.flush(2000);assert.equal(h.frames.size,0);assert.equal(h.snapshot()[0],saved);
  for(const id of ['play','reset','rate','progress'])assert.equal(h.get(id).disabled,true);
  assert.ok(h.get('steps').children.every(button=>button.disabled));assert.ok(h.get('elapsed').textContent.includes('saved'));
  h.view('orbit');h.step(6);h.flush(400);const duringSeek=h.snapshot()[0];assert.ok(duringSeek>saved);
  h.view('scale');h.flush(2000);assert.equal(h.snapshot()[0],duringSeek);
  h.view('earth');assert.equal(h.snapshot()[0],duringSeek);assert.equal(h.get('play').disabled,false);
  h.window.emit('pagehide',{persisted:false});assert.equal(h.scenes[0].disposed,true);assert.equal(h.frames.size,0);
});

test('reduced-motion phase steps work again after leaving scale and do not advance static scale',()=>{
  const h=harness('en',true);h.progress(250);h.view('scale');h.click('play');h.step(4);h.space();assert.equal(h.snapshot()[0],.25);
  h.view('orbit');h.click('play');assert.equal(h.snapshot()[0],.375);assert.equal(h.frames.size,0);
  h.step(4);assert.equal(h.snapshot()[0],.5);h.view('scale');h.view('earth');assert.equal(h.snapshot()[0],.5);
});
