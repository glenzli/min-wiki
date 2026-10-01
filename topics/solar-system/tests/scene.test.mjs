import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as three from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import * as model from '../explorer/model.ts';
import {noise,earthField} from '../explorer/materialFields.ts';
import {RegionalAtmosphere} from '../explorer/regionalAtmosphere.ts';
import {InteriorActivity} from '../explorer/interiorActivity.ts';
import {SaturnRings} from '../explorer/ringsScene.ts';
import {ringView} from '../explorer/ringsModel.ts';
import {INTERIORS} from '../../planet-surfaces/interior.ts';
import {smooth} from '../../planet-surfaces/model.ts';
import {palette} from '../../planet-surfaces/surfacePainter.ts';
import {PLANETS_DATA} from '../data/planetsData.ts';
const root=resolve(process.cwd(),'topics/solar-system/explorer');
function production(name,host){
  const path=resolve(root,name),parsed=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const source=ts.factory.updateSourceFile(parsed,parsed.statements.filter(node=>!ts.isImportDeclaration(node)));
  const output=ts.transpileModule(ts.createPrinter().printFile(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,exports={};
  vm.runInNewContext(output,{...host,exports},{filename:name});return exports;
}

// Production scene + ActivityBody, real Three geometry/shaders/camera and real
// OrbitControls. Adapters cover GPU submission, DOM, image completion and the
// browser-painted terrain map. This checks draws, not software-GPU frame cost.
function harness(){
  const images=[],renderers=[],observers=[];
  class Target{
    listeners=new Map();
    addEventListener(type,callback){this.listeners.set(type,[...(this.listeners.get(type)??[]),callback]);}
    removeEventListener(type,callback){this.listeners.set(type,(this.listeners.get(type)??[]).filter(fn=>fn!==callback));}
    dispatch(type,event={}){for(const fn of this.listeners.get(type)??[])fn(event);}
  }
  const document=new Target(),canvas=new Target();
  Object.assign(canvas,{style:{},dataset:{},clientWidth:960,clientHeight:540,getRootNode:()=>document});
  class Renderer{
    renders=0;sizes=[];disposed=false;failNext=false;
    constructor(){renderers.push(this);}
    setPixelRatio(){}setSize(w,h){this.sizes.push([w,h]);}
    render(scene,camera){if(this.failNext){this.failNext=false;throw Error('test GPU submission failure');}scene.updateMatrixWorld();camera.updateMatrixWorld();this.renders++;}
    dispose(){this.disposed=true;}
  }
  class TextureLoader{
    load(url,onLoad){
      const texture=new three.Texture();images.push({url,texture,complete(){texture.image={width:2,height:2};texture.needsUpdate=true;onLoad(texture);}});return texture;
    }
  }
  class ResizeObserver{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
  class TerrainPatch{
    group=new three.Group();
    constructor(){this.group.add(new three.Mesh(new three.PlaneGeometry(1,1),new three.MeshStandardMaterial()));}
    animate(){}
    dispose(){this.group.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});}
  }
  const THREE={...three,WebGLRenderer:Renderer,TextureLoader};
  const {ActivityBody}=production('activity.ts',{THREE,noise,earthField,PLANETS_DATA,
    mercury:'mercury',venus:'venus',earth:'earth',mars:'mars',moon:'moon',clouds:'clouds',rings:'rings'});
  const {ExplorerScene}=production('scene.ts',{THREE,OrbitControls,RegionalAtmosphere,InteriorActivity,SaturnRings,ActivityBody,TerrainPatch,
    ...model,ringView,INTERIORS,smooth,palette,sunInterior:JSON.parse(readFileSync(resolve(root,'sun-interior.json'),'utf8')),ResizeObserver,devicePixelRatio:1});
  const scene=new ExplorerScene(canvas),renderer=renderers[0];
  return{scene,renderer,images,canvas,observers,
    set(body='earth',view='descent',progress=.43,time=0,site){scene.set(body,view,progress,time,site);},
    finishImages(){for(const image of images)image.complete();},
  };
}

test('paused Earth approach reuses the same drawn cloud frame and state changes submit exactly one new frame',()=>{
  const h=harness();try{
    h.set();const frames=h.renderer.renders,shader=h.scene.cloudVolume.mesh.material.fragmentShader;
    const cloudTime=h.scene.cloudVolume.mesh.material.uniforms.time.value,opacity=h.scene.cloudVolume.mesh.material.uniforms.opacity.value;
    assert.equal(h.scene.cloudVolume.mesh.visible,true);assert.equal(frames,1);
    for(let i=0;i<60;i++)h.set();assert.equal(h.renderer.renders,frames);
    assert.equal(h.scene.cloudVolume.mesh.material.fragmentShader,shader);
    assert.equal(h.scene.cloudVolume.mesh.material.uniforms.time.value,cloudTime);assert.equal(h.scene.cloudVolume.mesh.material.uniforms.opacity.value,opacity);
    h.set('earth','descent',.44);assert.equal(h.renderer.renders,frames+1);
    h.set('earth','descent',.44,.2);assert.equal(h.renderer.renders,frames+2);
    h.set('earth','descent',.44,.2);assert.equal(h.renderer.renders,frames+2);
  }finally{h.scene.dispose();}
});

test('resize invalidates a paused frame without changing its observed progress',()=>{
  const h=harness();try{
    h.set();const frames=h.renderer.renders;h.canvas.clientWidth=390;h.canvas.clientHeight=260;h.observers[0].callback();
    h.set();assert.equal(h.renderer.renders,frames+1);assert.deepEqual(h.renderer.sizes.at(-1),[390,260]);
    assert.equal(h.scene.camera.aspect,1.5);assert.equal(h.canvas.dataset.progress,'0.4300');
    h.set();assert.equal(h.renderer.renders,frames+1);
  }finally{h.scene.dispose();}
});

test('paused camera responds to keyboard and real OrbitControls damping until the camera settles',()=>{
  const h=harness();try{
    h.set('mars','globe',0);let frames=h.renderer.renders;const before=h.scene.camera.position.clone();let prevented=false;
    h.canvas.dispatch('keydown',{key:'+',preventDefault(){prevented=true;}});
    h.set('mars','globe',0);assert.equal(prevented,true);assert.ok(h.scene.camera.position.distanceTo(before)>.01);assert.equal(h.renderer.renders,frames+1);
    h.set('mars','globe',0);assert.equal(h.renderer.renders,frames+1);
    h.scene.controls._rotateLeft(.4);h.scene.controls.update();frames=h.renderer.renders;
    const rotating=h.scene.camera.position.clone();
    for(let i=0;i<12;i++)h.set('mars','globe',0);
    assert.ok(h.renderer.renders>frames);assert.ok(h.scene.camera.position.distanceTo(rotating)>.01);
    for(let i=0;i<400;i++)h.set('mars','globe',0);frames=h.renderer.renders;
    for(let i=0;i<20;i++)h.set('mars','globe',0);assert.equal(h.renderer.renders,frames);
  }finally{h.scene.dispose();}
});

test('surface and borrowed cloud textures completing during pause invalidate the production scene',()=>{
  const h=harness();try{
    h.set();const frames=h.renderer.renders;assert.equal(h.images.length,2);
    assert.equal(h.scene.cloudVolume.mesh.material.uniforms.uCloud.value,h.scene.activity.cloudTexture);
    h.images[0].complete();h.set();assert.equal(h.renderer.renders,frames+1);h.set();assert.equal(h.renderer.renders,frames+1);
    h.images[1].complete();h.set();assert.equal(h.renderer.renders,frames+2);h.set();assert.equal(h.renderer.renders,frames+2);
    assert.equal(h.scene.activity.cloudTexture.version,1);
  }finally{h.scene.dispose();}
});

test('obsolete image completion is retired without invalidating the current world',()=>{
  const h=harness();try{
    h.set();const obsolete=h.images[0];h.set('mars','globe',0);const frames=h.renderer.renders;let disposed=0;
    obsolete.texture.addEventListener('dispose',()=>disposed++);obsolete.complete();
    h.set('mars','globe',0);assert.equal(disposed,1);assert.equal(h.renderer.renders,frames);
  }finally{h.scene.dispose();}
});

test('view, body, site and ring selections all invalidate cached paused frames',()=>{
  const h=harness();try{
    h.set();let frames=h.renderer.renders;
    for(const args of [['earth','section',.71],['mars','globe',0],['saturn','rings',0],['saturn','rings',1]]){
      h.set(...args);assert.equal(h.renderer.renders,++frames);h.set(...args);assert.equal(h.renderer.renders,frames);
    }
    h.set('earth','descent',.43);frames=h.renderer.renders;
    const site=model.sitesFor('earth').find(site=>site.id!==h.scene.site.id);assert.ok(site);
    h.set('earth','descent',.43,0,site.id);assert.equal(h.renderer.renders,frames+1);assert.equal(h.canvas.dataset.site,site.id);
    h.set('earth','descent',.43,0,site.id);assert.equal(h.renderer.renders,frames+1);
  }finally{h.scene.dispose();}
});

test('a failed GPU submission keeps invalidation pending for a successful retry',()=>{
  const h=harness();try{
    h.set();const frames=h.renderer.renders;h.images[0].complete();h.renderer.failNext=true;
    assert.throws(()=>h.set(),/GPU submission failure/);assert.equal(h.renderer.renders,frames);
    h.set();assert.equal(h.renderer.renders,frames+1);h.set();assert.equal(h.renderer.renders,frames+1);
  }finally{h.scene.dispose();}
});
