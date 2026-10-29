import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import {familyPose,familyReferences,familyWords,ellipticalPoint,stellarFamilyCases} from '../stellarFamilies.ts';
import {createStellarPortrait} from '../../../src/visuals/stellarPortrait.ts';
import {BlackHoleOptics} from '../../../src/visuals/blackHoleOptics.ts';

test('observed family examples preserve the specified barycentre, ellipse and known-planet distinction',()=>{
 for(const selected of stellarFamilyCases){const data=familyReferences[selected];for(let i=0;i<80;i++){const pose=familyPose(selected,data.duration*i/79);for(let axis=0;axis<3;axis++)assert.ok(Math.abs(pose.a[axis]!*data.massA+pose.b[axis]!*data.massB)<1e-12);assert.equal(!!pose.planet,selected==='kepler-16');assert.ok([...pose.a,...pose.b,...(pose.planet??[])].every(Number.isFinite));}
  assert.equal(familyPose(selected,-10).time,0);assert.equal(familyPose(selected,Infinity).time,0);assert.equal(familyPose(selected,1e9).time,data.duration);
 }
 const k=familyReferences['kepler-16'];assert.ok(Math.abs(ellipticalPoint(k.a,k.e,k.period,0)[0]-k.a*(1-k.e))<1e-12);assert.ok(Math.abs(ellipticalPoint(k.a,k.e,k.period,k.period/2)[0]+k.a*(1+k.e))<1e-12);
 const c=familyReferences['cygnus-x1'];assert.ok(Math.abs(c.a**3/(c.period/365.256)**2-(c.massA+c.massB))<1e-10);
});

test('the production family clock stops when hidden, preserves independent poses and releases its renderer',()=>{
 const source=readFileSync(new URL('../stellarFamilyStudy.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export class StellarFamilyStudy','class StellarFamilyStudy');
 const code=ts.transpileModule(source+'\nglobalThis.Study=StellarFamilyStudy;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 let renders=0,released=0,disconnected=0,clock=0;const frames=new Map<number,Function>(),events=new Map<string,Function>();let id=0;
 const makeDrawing=()=>{const data:any={texts:[],paths:[],circles:[],current:[],fillStyle:'',measureText:(text:string)=>({width:text.length*7}),clearRect(){this.texts=[];this.paths=[];},beginPath(){this.current=[];},moveTo(x:number,y:number){this.current.push([x,y]);},lineTo(x:number,y:number){this.current.push([x,y]);},stroke(){this.paths.push(this.current);},fillText(text:string,x:number,y:number){this.texts.push({text,x,y});},arc(x:number,y:number,r:number){this.circles.push({x,y,r,color:this.fillStyle});}};return new Proxy<any>(data,{get:(target,key)=>target[key]??(()=>{})});};
 class Node{hidden=false;style={};dataset={};clientWidth=900;clientHeight=540;listeners=new Map<string,Function>();drawing=makeDrawing();append(){}setAttribute(){}getContext(){return this.drawing;}addEventListener(name:string,listener:Function){this.listeners.set(name,listener);}removeEventListener(name:string){this.listeners.delete(name);}replaceWith(){}remove(){}}
 class Renderer{setClearColor(){}setPixelRatio(){}setSize(){}render(){renders++;}dispose(){released++;}forceContextLoss(){}}
 const reduced={matches:false,addEventListener(name:string,listener:Function){events.set(name,listener);},removeEventListener(name:string){events.delete(name);}};
 const document={hidden:false,createElement:()=>new Node()},changes:any[]=[];
 const context=vm.createContext({THREE:{...THREE,WebGLRenderer:Renderer,TextureLoader:class{load(){return new THREE.Texture();}}},familyPose,familyReferences,familyWords,createStellarPortrait,BlackHoleOptics,saturnMap:'saturn.webp',document,devicePixelRatio:2,matchMedia:()=>reduced,ResizeObserver:class{observe(){}disconnect(){disconnected++;}},performance:{now:()=>clock},requestAnimationFrame:(callback:Function)=>{frames.set(++id,callback);return id;},cancelAnimationFrame:(frame:number)=>frames.delete(frame)});
 vm.runInContext(code,context);const study=new (context as any).Study(new Node(),'en',(...args:any[])=>changes.push(args));
 const step=(now:number)=>{clock=now;const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(now));};
 study.show(true,'kepler-16',5,.2,.7,1);const a=study.aSurface.group.getObjectByName('emitting-visible-surface'),map=a.material.uniforms.photosphere.value;let mapReleased=0,bodyReleased=0;map.addEventListener('dispose',()=>mapReleased++);a.geometry.addEventListener('dispose',()=>bodyReleased++);
 const position=study.a.position.toArray();step(150);assert.ok(study.surfaceTime>0);assert.equal(study.time,5,'ambient photosphere motion never advances orbital days');assert.deepEqual(study.a.position.toArray(),position);assert.equal(changes.length,0,'surface-only frames do not rewrite URL/scientific state');
 study.play.onclick();step(166);assert.ok(changes.at(-1)[1]>5);assert.ok(study.playing);
 study.hide();const stopped=study.time,before=renders;study.tick(2000);study.surfaceTick(2000);study.draw();assert.equal(study.time,stopped);assert.equal(renders,before);assert.equal(study.playing,false);assert.equal(frames.size,0);
 study.show(true,'cygnus-x1',2,.2,.7,1);assert.equal(study.time,2);assert.equal(study.planet.visible,false);assert.ok(study.disk instanceof BlackHoleOptics);assert.equal(study.disk.visible,true);assert.equal(study.b.visible,false);assert.ok(study.orbits.every((line:THREE.Line)=>!(line.material as THREE.Material).depthWrite),'reference orbits cannot cut holes into the optical shadow');assert.equal(a.material.uniforms.spotStrength.value,0,'the hot donor is not a blue copy of solar spotting');assert.equal(study.aSurface.group.getObjectByName('emitting-visible-surface'),a);
 const depth=()=>study.disk.getWorldPosition(new THREE.Vector3()).z-study.a.getWorldPosition(new THREE.Vector3()).z,period=familyReferences['cygnus-x1'].period;
 study.show(true,'cygnus-x1',period/4,0,1.45,1);assert.ok(depth()>0,'the hole is in front at one conjunction');assert.ok(study.overlay.drawing.texts.some((item:any)=>item.text===familyWords.en.blackHole));
 study.show(true,'cygnus-x1',period*3/4,0,1.45,1);assert.ok(depth()<0,'half an orbit later the hole is behind');assert.ok(a.material.depthWrite&&study.disk.children[0].material.depthTest,'the opaque star can occlude the optical plane');
 const projected=study.a.getWorldPosition(new THREE.Vector3()).project(study.camera),cx=(projected.x+1)*450,cy=(1-projected.y)*270,radius=.095*900/(study.camera.right-study.camera.left);
 assert.ok(study.overlay.drawing.texts.some((item:any)=>item.text===familyWords.en.blackHoleBehind));assert.ok(!study.overlay.drawing.texts.some((item:any)=>item.text===familyWords.en.gas));
 assert.ok(study.overlay.drawing.paths.flat().every(([x,y]:number[])=>Math.hypot(x!-cx,y!-cy)>radius),'hidden anchors cannot leave foreground leaders across the star');
 study.lost({preventDefault(){}});assert.equal(study.fallback.drawing.circles.at(-1).color,'#e5dfc7','the simplified projection also draws the nearer donor last');study.retry();
 study.show(true,'cygnus-x1',2,.2,.7,1);study.play.onclick();reduced.matches=true;events.get('change')!();assert.equal(study.playing,false);assert.equal(frames.size,0);
 study.lost({preventDefault(){}});assert.equal(study.failed,true);study.retry();assert.equal(study.failed,false);assert.equal(study.time,2);
 study.show(true,'kepler-16',stopped,.2,.7,1);assert.equal(study.planet.visible,true);assert.equal(study.disk.visible,false);assert.equal(study.time,stopped);
 study.dispose();study.dispose();assert.equal(released,3);assert.equal(disconnected,1);assert.equal(events.size,0);assert.equal(mapReleased,1);assert.equal(bodyReleased,1);
});
