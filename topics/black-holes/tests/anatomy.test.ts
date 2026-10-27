import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import {BlackHoleOptics} from '../../../src/visuals/blackHoleOptics.ts';
import {anatomyGuideState,lightPathFigure} from '../anatomyGuide.ts';
import {ANATOMY_PARTS,readAnatomyPart,chapterHref} from '../routes.ts';

test('anatomy part links select only supported structures and preserve chapter routing',()=>{
 for(const part of ANATOMY_PARTS)assert.equal(readAnatomyPart(`?chapter=anatomy&part=${part}`),part);
 assert.equal(readAnatomyPart('?part=wrong'),'overview');assert.equal(readAnatomyPart(''),'overview');
 assert.match(chapterHref('anatomy','?lang=en&part=lensing'),/part=lensing/);
});

class Element {
 clientWidth=800;clientHeight=450;hidden=false;style:Record<string,string>={};children:Element[]=[];textContent='';innerHTML='';className='';
 classList={add(){},remove(){},toggle(){}};attributes=new Map<string,string>();
 append(...nodes:Element[]){this.children.push(...nodes);}setAttribute(name:string,value:string){this.attributes.set(name,value);}getAttribute(name:string){return this.attributes.get(name)??null;}
}

test('the qualitative side section identifies one source, observer, and same-colour apparent images',()=>{
 const previous=globalThis.document;
 Object.assign(globalThis,{document:{createElement:()=>new Element(),createElementNS:()=>new Element()}});
 try{const figure=lightPathFigure({title:'2D · not to scale',geometry:'Flat disk',image:'Images',source:'Emitter A',observer:'Observer',description:'One source and bent paths',note:'Independent side section'});
  const svg=(figure as unknown as Element).children[1]!;assert.equal(figure.hidden,true);assert.equal(svg.attributes.get('role'),'img');assert.equal(svg.attributes.get('aria-label'),'One source and bent paths');
  assert.match(svg.innerHTML,/Emitter A/);assert.match(svg.innerHTML,/Observer/);assert.equal((svg.innerHTML.match(/>A′</g)??[]).length,2);assert.match(svg.innerHTML,/marker-end/);assert.match(svg.innerHTML,/#ffe2a0/);
 }finally{Object.assign(globalThis,{document:previous});}
});

test('production anatomy selections expose distinct geometry without replacing optics or resetting time',()=>{
 const source=readFileSync(new URL('../chapters/anatomy.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('anatomy.ts',source,ts.ScriptTarget.Latest,true);
 const declaration=ast.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='AnatomyScene');assert.ok(declaration);
 const code=ts.transpileModule(declaration.getText(ast)+'\nglobalThis.AnatomyScene=AnatomyScene;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 let disposed=0,disconnected=0,released=0;
 class Renderer {toneMapping=0;setClearColor(){}setPixelRatio(){}setSize(){}render(){}dispose(){disposed++;}}
 class Controls {enabled=false;minDistance=0;maxDistance=0;constructor(..._args:unknown[]){}enablePan=false;addEventListener(){}update(){}dispose(){}}
 const context=vm.createContext({THREE:{...THREE,WebGLRenderer:Renderer},OrbitControls:Controls,BlackHoleOptics,anatomyGuideState,lightPathFigure:()=>new Element(),
  t:(text:string)=>text,document:{createElement:()=>new Element()},createCanvas:(host:Element)=>{const canvas=new Element();host.append(canvas);return canvas;},releaseCanvas:(host:Element)=>{host.children=[];released++;},
  performance:{now:()=>1000},devicePixelRatio:1,matchMedia:()=>({matches:true}),ResizeObserver:class {observe(){}disconnect(){disconnected++;}}});
 vm.runInContext(code,context);const scene=new (context as any).AnatomyScene(new Element()),hole=scene.hole,state={progress:.37,part:'overview'},options={view:'overview',guides:true,annotations:true};
 for(const part of ['horizon','shadow','disk','lensing']){
  scene.draw({...state,part},options);const expected=anatomyGuideState(part,true);
  assert.equal(scene.hole,hole);assert.equal(scene.geometryView.visible,expected.geometry);assert.equal(scene.hole.visible,!expected.geometry);assert.equal(scene.shadowRing.visible,expected.shadow);assert.equal(scene.diskGuide.visible,expected.disk);assert.equal(scene.sourcePoint.visible,expected.source);assert.equal(scene.lightPath.hidden,!expected.path);
  assert.equal(scene.hole.children[0].material.uniforms.uTime.value,state.progress*32);
 }
 const point=scene.sourcePoint.position.clone();scene.draw({...state,part:'lensing'},{...options,view:'top'});assert.deepEqual(scene.sourcePoint.position.toArray(),point.toArray());
 scene.draw({...state,part:'lensing'},{...options,guides:false});assert.equal(scene.diskGuide.visible,false);assert.equal(scene.sourcePoint.visible,false);assert.equal(scene.lightPath.hidden,false);
 scene.dispose();assert.equal(disposed,1);assert.equal(disconnected,1);assert.equal(released,1);
});
