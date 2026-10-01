import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as three from 'three';
import * as model from '../model.ts';
import {teachingDistanceScale,updateTeachingLens} from '../../../src/visuals/teachingCamera.ts';

// Run the production draw path with real Three geometry/material/camera objects.
// Only browser/GPU boundaries are adapted; shader appearance still needs WebGL.
function harness(reduced=false){
  let now=1000,removed=0,disconnected=false;
  const media={matches:reduced},renderers=[];
  class Renderer{
    renders=0;disposed=false;ratio=1;
    constructor(){renderers.push(this);}
    setClearColor(){}setSize(){}
    setPixelRatio(ratio){this.ratio=ratio;}getPixelRatio(){return this.ratio;}
    render(){this.renders++;}dispose(){this.disposed=true;}
  }
  class Controls{
    target=new three.Vector3();disposed=false;listeners={};
    addEventListener(event,fn){this.listeners[event]=fn;}
    update(){}dispose(){this.disposed=true;}
  }
  class BlackHoleOptics extends three.Group{setAccretion(time,power){this.time=time;this.power=power;}}
  class ResizeObserver{observe(){}disconnect(){disconnected=true;}}
  const canvas={parentElement:{append(){}},getBoundingClientRect:()=>({width:960,height:540})};
  const document={createElement:()=>({style:{},hidden:false,textContent:'',remove(){removed++;}})};
  const path=resolve(process.cwd(),'topics/galactic-center/scene.ts'),source=readFileSync(path,'utf8');
  const parsed=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const standalone=ts.factory.updateSourceFile(parsed,parsed.statements.filter(node=>!ts.isImportDeclaration(node)));
  const output=ts.transpileModule(ts.createPrinter().printFile(standalone),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,exports={};
  vm.runInNewContext(output,{...model,THREE:{...three,WebGLRenderer:Renderer},OrbitControls:Controls,BlackHoleOptics,ResizeObserver,
    teachingDistanceScale,updateTeachingLens,t:value=>value,document,devicePixelRatio:1,
    window:{matchMedia:()=>media},performance:{now:()=>now},exports});
  const scene=new exports.CompanionScene(canvas),renderer=renderers[0];
  return{scene,renderer,renderers,media,
    advance(ms){now+=ms;},
    draw(progress=.4,scenario='overflow',view='overview',orbit=false){scene.draw(progress,scenario,true,view,orbit);},
    snapshot(){return{surface:scene.star.material.uniforms.uTime.value,disk:scene.hole.time,
      positions:[...scene.gas.geometry.attributes.position.array],alphas:[...scene.gas.geometry.attributes.alpha.array]};},
    disposed(){return{removed,disconnected};},
  };
}

test('pause freezes photosphere with the gas/disk timeline and idle frames stop rendering',()=>{
  const h=harness();h.draw(.4);const frozen=h.snapshot(),renders=h.renderer.renders;
  assert.equal(frozen.surface,12.8);assert.equal(frozen.disk,12.8);
  for(let i=0;i<20;i++){h.advance(1000);h.draw(.4);}
  assert.equal(h.renderer.renders,renders);assert.deepEqual(h.snapshot(),frozen);
  h.draw(.7);assert.notDeepEqual(h.snapshot().positions,frozen.positions);assert.equal(h.snapshot().surface,22.4);
  h.draw(.4);assert.deepEqual(h.snapshot(),frozen);
  // The surface's phase survives scene re-creation at the same saved progress.
  const next=harness();next.advance(98765);next.draw(.4);assert.deepEqual(next.snapshot(),frozen);
});

test('requested camera changes finish while paused without advancing any surface state',()=>{
  const h=harness();h.draw(.35);h.draw(.35,'overflow','close');const initial=h.scene.camera.position.clone();
  h.advance(450);h.draw(.35,'overflow','close');assert.ok(h.scene.camera.position.distanceTo(initial)>0);
  h.advance(450);h.draw(.35,'overflow','close');const final=h.scene.camera.position.clone(),renders=h.renderer.renders;
  h.advance(5000);h.draw(.35,'overflow','close');assert.equal(h.renderer.renders,renders);assert.equal(h.scene.camera.position.distanceTo(final),0);
  assert.equal(h.snapshot().surface,.35*32);
});

test('reduced motion keeps surface static, snaps views and responds to live preference changes',()=>{
  const h=harness(true);h.draw(.4);assert.equal(h.snapshot().surface,0);
  h.draw(.6,'wind','top');assert.equal(h.snapshot().surface,0);assert.equal(h.scene.camera.position.y,0);
  assert.equal(h.scene.cameraStarted,-Infinity);const renders=h.renderer.renders;
  h.advance(12000);h.draw(.6,'wind','top');assert.equal(h.renderer.renders,renders);
  h.media.matches=false;h.draw(.6,'wind','top');assert.equal(h.snapshot().surface,.6*32);
  h.media.matches=true;h.draw(.6,'wind','top');assert.equal(h.snapshot().surface,0);
});

test('rapid scenario/view/orbit switches reuse the renderer and disposal retires scene resources',()=>{
  const h=harness();
  for(let i=0;i<30;i++){
    h.draw((i%7)/7,['detached','overflow','wind'][i%3],['overview','close','top','free'][i%4],Boolean(i%2));
    h.advance(40);
  }
  h.draw(.4);h.advance(1000);h.draw(.4);const saved=h.snapshot();
  h.draw(.9,'wind','free',true);h.draw(.4);assert.deepEqual(h.snapshot(),saved);assert.equal(h.renderers.length,1);
  let geometries=0;h.scene.scene.traverse(object=>object.geometry?.addEventListener('dispose',()=>geometries++));
  h.scene.dispose();assert.ok(geometries>=7);assert.equal(h.renderer.disposed,true);assert.equal(h.scene.controls.disposed,true);
  assert.deepEqual(h.disposed(),{removed:3,disconnected:true});
});
