import test from 'node:test';
import assert from 'node:assert/strict';
import { mountSpecialization } from '../specialization.ts';
import { muscleState, MUSCLE_APPARATUS } from '../../body-cells/model.ts';
import { parseFragment } from 'parse5';
import { muscleExplanation } from '../../body-cells/content.ts';

// Run the actual controller and its event handlers against finite DOM sinks.
// SVG markup comes from the production renderer. This does not test layout,
// focus rendering, SVG rasterisation or a browser's event/accessibility tree.
function fixture(reduced=true){
  const ids=new Map(),all=[],frames=new Map();let frameId=0;
  class Element {
    dataset={};attributes=new Map();listeners=new Map();children=[];textContent='';innerHTML='';value='';hidden=false;
    set id(value){this._id=value;ids.set(value,this);}get id(){return this._id;}
    setAttribute(name,value){this.attributes.set(name,String(value));}getAttribute(name){return this.attributes.get(name);}
    append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=[...nodes];}
    after(){}
    addEventListener(name,handler){const list=this.listeners.get(name)??[];list.push(handler);this.listeners.set(name,list);}
    removeEventListener(name,handler){this.listeners.set(name,(this.listeners.get(name)??[]).filter(h=>h!==handler));}
    emit(name){for(const handler of [...(this.listeners.get(name)??[])])handler({target:this});}
  }
  const create=(tag='div')=>{const node=new Element();node.tagName=tag.toUpperCase();all.push(node);return node;};
  for(const id of ['work-scene','work-subject','work-observe','work-phase','work-story','work-progress','work-percent','work-play','work-zoom','work-bridge','work-science-content','work-options','work-reset','work-labels']){const node=create();node.id=id;}
  ids.get('work-scene').dataset.labels='false';
  const document=Object.assign(create(),{
    hidden:false,createElement:create,getElementById:id=>ids.get(id),
    querySelectorAll:selector=>selector==='[data-specialism]'?all.filter(n=>n.dataset.specialism):[],
  });
  const preference=Object.assign(create(),{matches:reduced});
  const window=Object.assign(create(),{matchMedia:()=>preference});
  const previous=Object.fromEntries(['document','window','requestAnimationFrame','cancelAnimationFrame'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  Object.assign(globalThis,{document,window,requestAnimationFrame:callback=>{
    const id=++frameId;frames.set(id,time=>{frames.delete(id);callback(time);});return id;
  },cancelAnimationFrame:id=>frames.delete(id)});
  const controller=mountSpecialization('muscle',()=>{});
  const button=mode=>all.find(n=>n.tagName==='BUTTON'&&n.dataset.muscleMode===mode);
  const scene=ids.get('work-scene');
  const projected=()=>Number(scene.innerHTML.match(/data-muscle-tension="([^"]+)"/)?.[1]);
  return {ids,scene,document,window,frames,controller,button,projected,
    seek(p){ids.get('work-progress').value=String(p*1000);ids.get('work-progress').emit('input');},
    load(u){ids.get('muscle-load').value=String(u*100);ids.get('muscle-load').emit('input');},
    restore(){for(const [key,descriptor] of Object.entries(previous))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];},
  };
}
test('integrated muscle controls change actual geometry/forces and preserve progress across case and camera changes',t=>{
  const f=fixture();t.after(f.restore);
  f.seek(.5);f.load(0);
  const soft=muscleState(.5,{mode:'shortening',load:0});
  assert.equal(f.projected(),soft.tension);assert.equal(f.scene.dataset.progress,'0.5000');
  f.load(1);const stiff=muscleState(.5,{mode:'shortening',load:1});
  assert.equal(f.projected(),stiff.tension);assert.ok(stiff.shortening<soft.shortening);
  assert.ok(f.scene.innerHTML.includes(`M${stiff.junction} 241`));
  f.button('isometric').emit('click');const locked=muscleState(.5,{mode:'isometric',load:1});
  assert.equal(f.projected(),locked.tension);assert.ok(f.scene.innerHTML.includes('data-endpoint-clamp="true"'));
  assert.equal(f.ids.get('work-phase').textContent,muscleExplanation(.5,{mode:'isometric',load:1}).title);
  assert.ok(f.ids.get('work-progress').getAttribute('aria-valuetext').startsWith(f.ids.get('work-phase').textContent));
  f.ids.get('work-zoom').emit('click');assert.equal(f.projected(),locked.tension);
  f.ids.get('work-labels').emit('click');assert.equal(f.projected(),locked.tension);
  f.controller.select('neuron');assert.equal(f.ids.get('muscle-study').hidden,true);f.seek(.27);
  f.controller.select('muscle');assert.equal(f.ids.get('muscle-study').hidden,false);
  assert.equal(f.scene.dataset.progress,'0.5000');assert.equal(f.projected(),locked.tension);
  assert.equal(f.ids.get('muscle-load').value,'100');assert.equal(f.button('isometric').getAttribute('aria-pressed'),'true');
  f.controller.select('neuron');assert.equal(f.scene.dataset.progress,'0.2700');
});
test('reduced-motion playback exposes peak tension before relaxation, including the fixed-length case',t=>{
  const f=fixture();t.after(f.restore);f.button('isometric').emit('click');
  f.ids.get('work-play').emit('click');
  assert.equal(f.scene.dataset.progress,'0.5000');assert.equal(f.frames.size,0);
  const peak=f.projected();f.ids.get('work-play').emit('click');
  assert.equal(f.scene.dataset.progress,'1.0000');assert.ok(f.projected()<peak);
  assert.equal(f.ids.get('work-play').getAttribute('aria-pressed'),'false');
});
test('changing stiffness cancels active playback so an old frame cannot overwrite the selected state',t=>{
  const f=fixture(false);t.after(f.restore);
  f.ids.get('work-play').emit('click');assert.equal(f.frames.size,1);
  const callback=[...f.frames.values()][0];callback(performance.now()+2100);
  const progress=Number(f.scene.dataset.progress);assert.ok(progress>0&&progress<1);
  f.load(1);assert.equal(f.ids.get('work-play').getAttribute('aria-pressed'),'false');assert.equal(f.frames.size,0);
  const result=f.projected();callback(performance.now()+8000);
  assert.equal(f.scene.dataset.progress,progress.toFixed(4));assert.equal(f.projected(),result);
  f.button('isometric').emit('click');
  f.document.hidden=true;f.document.emit('visibilitychange');
  assert.equal(f.scene.dataset.progress,progress.toFixed(4));assert.equal(f.ids.get('work-play').getAttribute('aria-pressed'),'false');
});
test('connection camera contains the production tendon, fixed anchor and every force endpoint while retaining experiment state',t=>{
  const f=fixture();t.after(f.restore);
  const lens=f.ids.get('muscle-forces'),overview='0 0 980 550';
  lens.emit('click');assert.equal(lens.getAttribute('aria-pressed'),'true');
  for(const mode of ['shortening','isometric'])for(const load of [0,.5,1])for(const progress of [0,.25,.5,.75,1]){
    f.button(mode).emit('click');f.load(load);f.seek(progress);
    const [x,y,width,height]=f.scene.getAttribute('viewBox').split(' ').map(Number);
    const contains=(px,py)=>{assert.ok(px>=x&&px<=x+width,`x ${px} inside ${x}..${x+width}`);assert.ok(py>=y&&py<=y+height,`y ${py} inside ${y}..${y+height}`);};
    const s=muscleState(progress,{mode,load}),nodes=[];
    function visit(node){nodes.push(node);node.childNodes?.forEach(visit);}
    visit(parseFragment(`<svg>${f.scene.innerHTML}</svg>`));
    const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
    const find=(name,value)=>nodes.find(node=>attr(node,name)===value);
    const joint=find('data-force-junction','true');contains(Number(attr(joint,'cx')),Number(attr(joint,'cy')));
    contains(s.right,174);contains(s.right,315);contains(MUSCLE_APPARATUS.springAnchor,203);contains(MUSCLE_APPARATUS.springAnchor,279);
    for(const id of ['muscle','spring','clamp']){
      const group=find('data-force',id),path=group.childNodes.find(node=>node.tagName==='path');
      const [,start,py,end]=attr(path,'d').match(/^M([\d.e+-]+) ([\d.e+-]+)H([\d.e+-]+)$/);
      contains(Number(start),Number(py));contains(Number(end),Number(py)-5);contains(Number(end),Number(py)+5);
    }
    if(mode==='isometric'){contains(s.junction-29,346);contains(s.junction+29,346);}
    assert.equal(f.projected(),s.tension);assert.equal(f.scene.dataset.progress,progress.toFixed(4));
    assert.equal(f.ids.get('work-zoom').getAttribute('aria-pressed'),'false');
  }
  f.controller.select('neuron');assert.equal(lens.hidden,true);
  f.controller.select('muscle');assert.equal(lens.hidden,false);assert.equal(lens.getAttribute('aria-pressed'),'true');
  assert.equal(f.scene.dataset.progress,'1.0000');assert.equal(f.ids.get('muscle-load').value,'100');
  lens.emit('click');assert.equal(lens.getAttribute('aria-pressed'),'false');assert.equal(f.scene.getAttribute('viewBox'),overview);
  f.ids.get('work-zoom').emit('click');assert.equal(f.ids.get('work-zoom').getAttribute('aria-pressed'),'true');
  lens.emit('click');assert.equal(f.ids.get('work-zoom').getAttribute('aria-pressed'),'false');assert.equal(lens.getAttribute('aria-pressed'),'true');
  lens.emit('click');assert.equal(f.scene.getAttribute('viewBox'),overview);assert.equal(f.scene.dataset.progress,'1.0000');
});
