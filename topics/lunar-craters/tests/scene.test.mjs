import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as three from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import * as model from '../model.ts';

// Run production draw with real Three meshes, lights, raycasts and controls.
// The adapter replaces only the GPU, resize observer and browser event target.
function harness(){
  class Target extends three.EventDispatcher{
    style={};clientWidth=960;clientHeight=540;
    getRootNode(){return this;}
    getBoundingClientRect(){return{width:960,height:540};}
  }
  class Renderer{
    renders=0;disposed=false;
    setPixelRatio(){}setSize(){}
    render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);this.renders++;}
    dispose(){this.disposed=true;}
  }
  let disconnected=false;
  class ResizeObserver{observe(){}disconnect(){disconnected=true;}}
  const path=resolve(process.cwd(),'topics/lunar-craters/scene.ts');
  const parsed=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const standalone=ts.factory.updateSourceFile(parsed,parsed.statements.filter(node=>!ts.isImportDeclaration(node)));
  const output=ts.transpileModule(ts.createPrinter().printFile(standalone),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={};
  vm.runInNewContext(output,{...model,THREE:{...three,WebGLRenderer:Renderer},OrbitControls,ResizeObserver,devicePixelRatio:1,exports});
  const scene=new exports.TopicScene(new Target());
  return{scene,get disconnected(){return disconnected;}};
}

function lowerVertexClearances(scene){
  const position=scene.meteor.geometry.attributes.position,vertices=[];
  for(let i=0;i<position.count;i++)vertices.push(new three.Vector3().fromBufferAttribute(position,i).applyMatrix4(scene.meteor.matrixWorld));
  const lowest=Math.min(...vertices.map(v=>v.y));
  const ray=new three.Raycaster(new three.Vector3(),new three.Vector3(0,-1,0),0,30);
  // Relief is < .11: no higher vertex can be the first contact point.
  return vertices.filter(v=>v.y<lowest+.23).map(v=>{
    ray.ray.origin.set(v.x,10,v.z);
    const hit=ray.intersectObject(scene.terrainMesh,false)[0];
    assert.ok(hit,'rock vertex projects onto the actual terrain mesh');
    return v.y-hit.point.y;
  });
}

test('vertical rock arrives at rendered terrain at one shared contact instant across size and speed extremes',()=>{
  const {scene}=harness();
  for(const diameter of [50,100,500])for(const speed of [10,20,40]){
    const settings={diameter,speed};
    for(const progress of [0,.2,model.IMPACT_PROGRESS-1e-4]){
      scene.draw(progress,settings);
      assert.equal(scene.meteor.position.x,0);assert.equal(scene.meteor.position.z,0);
      assert.equal(scene.meteor.visible,true);
      assert.ok(Math.min(...lowerVertexClearances(scene))>0,'no early penetration');
      assert.equal(scene.flash.visible,false);assert.equal(scene.flashLight.intensity,0);
    }
    scene.draw(model.IMPACT_PROGRESS,settings);
    const clearances=lowerVertexClearances(scene);
    assert.ok(Math.min(...clearances)>=-1e-7);
    assert.ok(Math.abs(Math.min(...clearances))<1e-7,'actual mesh support touches the rendered triangle');
    assert.equal(scene.meteor.visible,false);assert.equal(scene.flash.visible,true);
    assert.equal(scene.flashLight.intensity,24);assert.equal(scene.shockwave.visible,false);
  }
  scene.dispose();
});

test('flash and excavation are reversible and camera changes preserve the causal state',()=>{
  const h=harness(),{scene}=h,settings={diameter:100,speed:20};
  const snapshot=()=>({terrain:[...scene.terrainGeometry.attributes.position.array],meteor:scene.meteor.position.toArray(),
    flash:scene.flash.visible,light:scene.flashLight.intensity,ejecta:[...scene.ejecta.geometry.attributes.position.array]});
  scene.draw(.34,settings);const before=snapshot();
  scene.draw(.39,settings);assert.equal(scene.flash.visible,true);assert.ok(scene.flashLight.intensity>0);assert.equal(scene.shockwave.visible,true);
  scene.draw(.7,settings);assert.equal(scene.flash.visible,false);assert.equal(scene.flashLight.intensity,0);
  assert.ok(scene.terrainGeometry.attributes.position.getY(36*113+56)<-.1);
  scene.draw(.34,settings);assert.deepEqual(snapshot(),before);
  const camera=scene.camera.position.clone();scene.controls._rotateLeft(.4);scene.controls.update();
  assert.ok(scene.camera.position.distanceTo(camera)>0);assert.deepEqual(snapshot(),before);
  scene.draw(.39,settings);const after=snapshot();scene.draw(1,settings);scene.draw(.39,settings);assert.deepEqual(snapshot(),after);
  scene.dispose();assert.equal(h.disconnected,true);assert.equal(scene.renderer.disposed,true);
});
