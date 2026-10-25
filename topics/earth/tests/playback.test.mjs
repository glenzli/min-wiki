import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinitePlayback} from '../finitePlayback.ts';
import {createRoutePersistence} from '../routePersistence.ts';

function environment() {
  const names=['document','window','history','Element','IntersectionObserver','matchMedia','requestAnimationFrame','cancelAnimationFrame','performance','clearTimeout','innerWidth','innerHeight','getComputedStyle'];
  const originals=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  let now=0,id=0,reduced=false;const frames=new Map(),timers=new Map(),observers=[];
  class Element extends EventTarget {dataset={};top=0;closest(){return null;}getBoundingClientRect(){return {width:600,height:300,top:this.top,bottom:this.top+300,left:0,right:600};}}
  class Document extends EventTarget {hidden=false;}
  const document=new Document(),window=new EventTarget(),writes=[];
  window.setTimeout=(fn,delay)=>{const next=++id;timers.set(next,{fn,at:now+delay});return next;};
  const values={document,window,Element,history:{replaceState(_a,_b,url){writes.push({type:'replace',url:String(url)});},pushState(_a,_b,url){writes.push({type:'push',url:String(url)});}},
    IntersectionObserver:class {constructor(callback){this.callback=callback;this.connected=true;observers.push(this);}observe(){}disconnect(){this.connected=false;}},
    matchMedia:()=>({get matches(){return reduced;}}),performance:{now:()=>now},innerWidth:1000,innerHeight:1000,getComputedStyle:()=>({visibility:'visible'}),
    requestAnimationFrame:fn=>{const next=++id;frames.set(next,fn);return next;},cancelAnimationFrame:key=>frames.delete(key),clearTimeout:key=>timers.delete(key)};
  for(const [name,value] of Object.entries(values))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
  function advance(ms) {
    now+=ms;const queued=[...frames.values()];frames.clear();queued.forEach(fn=>fn(now));
    for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.fn();}
  }
  return {Element,document,window,writes,frames,timers,observers,advance,setReduced:value=>{reduced=value;},restore(){for(const [name,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}};
}

test('finite playback preserves a partial observation, pauses without elapsed-time catch-up and ends with zero callbacks',()=>{
  const env=environment();try{
    let progress=.25;const snapshots=[],changes=[];const element=new env.Element();
    const player=createFinitePlayback({element,id:'test',durationMs:1000,readProgress:()=>progress,writeProgress:p=>{progress=p;snapshots.push(p);},onPlayingChange:value=>changes.push({value,state:element.dataset.playbackState})});
    assert.equal(env.frames.size,0);player.play();env.advance(200);assert.equal(progress,.45);
    player.pause();assert.equal(env.frames.size,0);env.advance(2000);assert.equal(progress,.45);
    player.play();env.advance(300);assert.equal(progress,.75);env.advance(250);
    assert.equal(progress,1);assert.equal(player.isPlaying(),false);assert.equal(env.frames.size,0);
    assert.equal(element.dataset.playbackState,'complete');assert.deepEqual(changes.map(c=>c.value),[true,false,true,false]);
    assert.ok(changes.filter(c=>!c.value).every(c=>c.state!=='playing'));
    player.play();assert.equal(progress,0);env.advance(100);assert.equal(progress,.1);
    player.dispose();assert.equal(env.frames.size,0);const count=snapshots.length;player.play();env.advance(2000);assert.equal(snapshots.length,count);
  }finally{env.restore();}
});

test('reduced motion visits only explicit teaching stages; manual scrub and reset remain available',()=>{
  const env=environment();try{
    env.setReduced(true);let progress=0;const snapshots=[];
    const player=createFinitePlayback({element:new env.Element(),id:'filters',durationMs:900,readProgress:()=>progress,writeProgress:p=>{progress=p;snapshots.push(p);},reducedMotionSteps:3});
    player.play();for(let i=0;i<9;i++)env.advance(100);
    assert.deepEqual(snapshots,[1/3,2/3,1]);assert.equal(env.frames.size,0);
    player.setProgress(.52);assert.equal(progress,.52);assert.equal(player.isPlaying(),false);
    player.reset();assert.equal(progress,0);player.dispose();
  }finally{env.restore();}
});

test('hidden/offscreen playback stops and disposal removes lifetime listeners',()=>{
  const env=environment();try{
    let progress=0;const element=new env.Element();
    const player=createFinitePlayback({element,id:'visible',durationMs:1000,readProgress:()=>progress,writeProgress:p=>{progress=p;}});
    player.play();env.advance(100);env.document.hidden=true;env.document.dispatchEvent(new Event('visibilitychange'));
    const saved=progress;env.advance(500);assert.equal(progress,saved);assert.equal(env.frames.size,0);
    env.document.hidden=false;player.play();env.observers[0].callback([{isIntersecting:false}]);assert.equal(player.isPlaying(),false);
    element.top=1400;player.play();assert.equal(player.isPlaying(),false);assert.equal(env.frames.size,0);
    player.dispose();assert.equal(env.observers[0].connected,false);env.document.dispatchEvent(new Event('visibilitychange'));assert.equal(env.frames.size,0);
  }finally{env.restore();}
});

test('animation URL writes are coalesced while retaining the latest memory snapshot and final paused state',()=>{
  const env=environment();try{
    let state=0,playing=true,links=0;
    const persist=createRoutePersistence({url:()=>new URL(`https://local.test/?stage=${state}`),isPlaying:()=>playing,afterWrite:()=>links++});
    persist.write();
    for(let i=1;i<=4;i++){env.advance(50);state=i;persist.write();}
    assert.equal(env.writes.length,1);assert.equal(env.timers.size,1);
    env.advance(300);assert.equal(env.writes.length,2);assert.equal(env.writes.at(-1).url,'https://local.test/?stage=4');
    state=5;persist.write();playing=false;persist.write();assert.equal(env.writes.at(-1).url,'https://local.test/?stage=5');assert.equal(env.timers.size,0);
    playing=true;state=6;persist.write();persist.cancel();env.advance(1000);assert.equal(env.writes.length,3);
    persist.write(true);assert.equal(env.writes.at(-1).type,'push');assert.equal(links,4);
    persist.dispose();persist.write();assert.equal(env.writes.length,4);
  }finally{env.restore();}
});

test('native navigation and page hiding flush the live animation snapshot before their destination is resolved',()=>{
  const env=environment();try{
    let state=1;const persist=createRoutePersistence({url:()=>new URL(`https://local.test/?stage=${state}`),isPlaying:()=>true,afterWrite(){}});
    persist.write();env.advance(50);state=2;persist.write();assert.equal(env.writes.length,1);
    const anchor=new env.Element();anchor.closest=selector=>selector==='a[href]'?anchor:null;
    const click=new Event('click');Object.defineProperty(click,'target',{value:anchor});env.window.dispatchEvent(click);
    assert.equal(env.writes.at(-1).url,'https://local.test/?stage=2');assert.equal(env.timers.size,0);
    env.advance(50);state=3;persist.write();env.document.hidden=true;env.document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(env.writes.at(-1).url,'https://local.test/?stage=3');assert.equal(env.timers.size,0);
    state=4;persist.write();persist.dispose();const count=env.writes.length;env.window.dispatchEvent(click);env.advance(1000);assert.equal(env.writes.length,count);
  }finally{env.restore();}
});
