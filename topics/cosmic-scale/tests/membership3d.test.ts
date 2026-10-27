import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import * as model from '../membershipModel.ts';
import {galacticObjects,SOLAR_POSITION} from '../galacticModel.ts';
import {GalaxyVolume} from '../galaxy.ts';
import {createSolarPhotosphereMaterial,createSolarHalo,setSolarPhotospherePhase} from '../solarPhotosphere3d.ts';
import {SOLAR_SURFACE_STYLE,solarSurfacePhase} from '../solarSurfaceModel.ts';
import content from '../comparisonContent.json';
import cosmicContent from '../content.json';

test('recognition spheres preserve identity and rank while structure coordinates remain independent of distances',()=>{
 assert.equal(model.membershipSolar.length,8);assert.equal(model.membershipSolarAnchor,SOLAR_POSITION);
 assert.ok(model.membershipSunRadius>Math.max(...model.membershipSolar.map(body=>body.radius)));
 const rank=[...model.membershipSolar].sort((a,b)=>b.radius-a.radius).map(body=>body.id);assert.deepEqual(rank,[4,5,6,7,2,1,3,0]);
 const group=model.membershipGroup(),canonical=galacticObjects('local-group');assert.deepEqual(group.map(object=>object.id),canonical.map(object=>object.id));group.forEach((object,index)=>{assert.equal(object.center[0],canonical[index]!.center[0]*model.MEMBERSHIP_GROUP_LAYOUT.x);assert.equal(object.center[1],canonical[index]!.center[1]*model.MEMBERSHIP_GROUP_LAYOUT.y);assert.equal(object.center[2],canonical[index]!.center[2]);});
 const a=model.membershipCloud(200,7,.4),b=model.membershipCloud(200,7,.4);assert.deepEqual(a,b);assert.ok(a.positions.every(Number.isFinite));assert.ok(Math.max(...a.positions.filter((_,i)=>i%3===2).map(Math.abs))>.3);
});

test('manual views are bounded and resettable without changing any structure samples',()=>{
 let view=model.membershipView();const before=model.membershipGroup();for(let i=0;i<1000;i++)view=model.turnMembershipView(view,.1,-.1);assert.ok(view.yaw>=-Math.PI&&view.yaw<=Math.PI);assert.equal(view.pitch,0);assert.deepEqual(model.membershipGroup(),before);
 assert.equal(model.turnMembershipView(view,0,100).pitch,Math.PI/2);
 const fullTurn=model.turnMembershipView(model.membershipView(),2*Math.PI,0);assert.ok(Math.abs(fullTurn.yaw-model.membershipView().yaw)<1e-12);
 assert.deepEqual(model.turnMembershipView(view,NaN,NaN),view);
 for(const width of [342,1000])for(const height of [280,450])for(let home=0;home<7;home++){const frame=model.membershipFrame(home,width,height);assert.ok(frame.halfX>0&&frame.halfY>0);assert.ok(Math.abs(frame.halfX/frame.halfY-width/height)<1e-12);}
});

test('top and edge-on presets reach the actual orbital plane and keep its unchanged bodies in frame',()=>{
 for(const preset of ['top','edge'] as const){
  const view=model.membershipPreset(preset),matrix=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(view.pitch,view.yaw,0));
  const orbit=Array.from({length:129},(_,i)=>new THREE.Vector3(Math.cos(i/128*Math.PI*2),Math.sin(i/128*Math.PI*2),0).applyMatrix4(matrix));
  const height=Math.max(...orbit.map(point=>point.y))-Math.min(...orbit.map(point=>point.y));
  if(preset==='edge')assert.ok(height<1e-12,'orbital plane must project to a horizontal line');else assert.ok(Math.abs(height-2)<1e-12,'top view must retain its circular orbit');
  for(const [width,height] of [[342,300],[1240,460]]){
   const frame=model.membershipFrame(0,width!,height!,view);
   for(const body of model.membershipSolar){const point=new THREE.Vector3(...body.center).applyMatrix4(matrix);assert.ok(Math.abs(point.x)+body.radius<frame.halfX);assert.ok(Math.abs(point.y)+body.radius<frame.halfY);}
   for(const point of orbit){assert.ok(Math.abs(point.x)*1.23<frame.halfX);assert.ok(Math.abs(point.y)*1.23<frame.halfY);}
  }
 }
});

test('all three Local Group disks remain recognisable in the default desktop and phone framing',()=>{
 const view=model.membershipView(),observer=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(view.pitch,view.yaw,0));
 for(const [width,height] of [[1240,460],[342,300]]){
  const frame=model.membershipFrame(2,width,height),unit=width/(2*frame.halfX);
  for(const object of model.membershipGroup().filter(object=>!object.points)){
   const matrix=observer.clone().multiply(new THREE.Matrix4().makeRotationX(object.inclination)),points=Array.from({length:101},(_,i)=>new THREE.Vector3(Math.cos(i/100*Math.PI*2)*object.scale,Math.sin(i/100*Math.PI*2)*object.scale,0).applyMatrix4(matrix));
   const spanX=(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*unit,spanY=(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*unit;
   assert.ok(Math.min(spanX,spanY)>(width<400?30:100),`${width} ${object.id}: ${spanX}/${spanY}`);
  }
 }
});

test('small-screen solar and galaxy labels keep independent object anchors and do not overlap',()=>{
 for(const [width,height] of [[342,280],[390,360],[1000,420]])for(const language of ['zh','en'] as const){
  const {halfX,halfY}=model.membershipFrame(0,width,height),view=model.membershipView(),rotation=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(view.pitch,view.yaw,0));
  const labels=[{id:'sun',point:[0,0,0],text:content[language].names[2]!,radius:model.membershipSunRadius},...model.membershipSolar.map(body=>({id:String(body.id),point:body.center,text:cosmicContent.planets[body.id]![language],radius:body.radius}))].map(label=>{const p=new THREE.Vector3(...label.point as [number,number,number]).applyMatrix4(rotation);return {id:label.id,x:(p.x/halfX+1)*width/2,y:(1-p.y/halfY)*height/2,width:label.text.length*(language==='zh'?13:7)+12,height:24,priority:label.id==='sun'?12:4,clearance:label.radius*width/(2*halfX)+5};});
  const boxes=model.placeMembershipLabels(labels,width,height);assert.equal(boxes.length,9);
  for(const box of boxes){const source=labels.find(label=>label.id===box.id)!;assert.equal(box.x,source.x);assert.equal(box.y,source.y);assert.ok(box.left>=0&&box.top>=0&&box.left+box.width<=width&&box.top+box.height<=height);}
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i]!,b=boxes[j]!;assert.ok(a.left+a.width<=b.left||b.left+b.width<=a.left||a.top+a.height<=b.top||b.top+b.height<=a.top,`${width} ${language}: ${a.id}/${b.id}`);}
  for(const box of boxes)for(const source of labels)assert.ok(!(source.x>box.left&&source.x<box.left+box.width&&source.y>box.top&&source.y<box.top+box.height),'label covers a body centre');
 }
});

test('production membership scene shares volume owners and has bounded cache, demand rendering, retry and complete disposal',()=>{
 const source=readFileSync(new URL('../membership3d.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('membership3d.ts',source,ts.ScriptTarget.Latest,true),declaration=ast.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='Membership3D');assert.ok(declaration);
 const code=ts.transpileModule(declaration.getText(ast).replace('export class Membership3D','class Membership3D')+'\nglobalThis.Membership3D=Membership3D;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 let rendered=0,created=0,disposed=0,lost=0,disconnected=0,webDisposed=0,nextFrame=1;
 const frames=new Map<number,()=>void>(),drawing=new Proxy<Record<string,unknown>>({measureText:(text:string)=>({width:text.length*6.5})},{get:(target,key:string)=>target[key]??(()=>{})});
 class Element {clientWidth=342;clientHeight=300;hidden=false;width=0;height=0;className='';children:Element[]=[];listeners=new Map<string,Function>();captures=new Set<number>();append(...children:Element[]){this.children.push(...children);}setAttribute(){}getContext(){return drawing;}addEventListener(name:string,listener:Function){this.listeners.set(name,listener);}removeEventListener(name:string){this.listeners.delete(name);}setPointerCapture(id:number){this.captures.add(id);}hasPointerCapture(id:number){return this.captures.has(id);}releasePointerCapture(id:number){this.captures.delete(id);}replaceWith(){}remove(){}closest(){return null;}}
 class Renderer {outputColorSpace='';toneMapping=0;toneMappingExposure=0;capabilities={getMaxAnisotropy:()=>1};constructor(){created++;}setClearColor(){}setPixelRatio(){}setSize(){}render(){rendered++;}dispose(){disposed++;}forceContextLoss(){lost++;}}
 const textureCallbacks:((texture:THREE.Texture)=>void)[]=[];class Loader {load(_url:string,loaded:(texture:THREE.Texture)=>void){textureCallbacks.push(loaded);return new THREE.Texture();}}
 class Web {root=new THREE.Group();constructor(public kind:string){const samples=model.membershipCloud(400,12,1),geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(samples.positions,3));this.root.add(new THREE.Points(geometry,new THREE.PointsMaterial()));}update(){}dispose(){webDisposed++;this.root.traverse(object=>{if(object instanceof THREE.Points){object.geometry.dispose();(object.material as THREE.Material).dispose();}});this.root.clear();}}
 const document={hidden:false,createElement:()=>new Element()},failures:boolean[]=[];
 const context=vm.createContext({...model,THREE:{...THREE,WebGLRenderer:Renderer,TextureLoader:Loader},GalaxyVolume,createSolarPhotosphereMaterial,createSolarHalo,setSolarPhotospherePhase,SOLAR_SURFACE_STYLE,solarSurfacePhase,CosmicWebVolume:Web,cosmicContent,MAPS:Array(8).fill('map'),document,devicePixelRatio:2,
  requestAnimationFrame:(callback:()=>void)=>{const id=nextFrame++;frames.set(id,callback);return id;},cancelAnimationFrame:(id:number)=>frames.delete(id),ResizeObserver:class {observe(){}disconnect(){disconnected++;}}});
 const flush=()=>{for(const [id,callback] of [...frames]){frames.delete(id);callback();}};
 vm.runInContext(code,context);const host=new Element(),scene=new (context as any).Membership3D(host,content.en,'en',(failed:boolean)=>failures.push(failed));
 assert.equal(created,1);assert.equal(frames.size,0);scene.show(2);assert.equal(frames.size,0);scene.setActive(true);assert.equal(frames.size,1);flush();assert.equal(rendered,1);assert.equal(frames.size,0);
 const entry=scene.entries.get(2);assert.ok(entry.galaxies.every((galaxy:any)=>galaxy.volume instanceof GalaxyVolume));assert.equal(entry.galaxies.length,3);const matrices=entry.galaxies.map((galaxy:any)=>galaxy.volume.root.position.toArray());
 const dwarfs=entry.root.children.find((child:any)=>child.userData.dwarfMarkers);assert.ok(dwarfs.material instanceof THREE.ShaderMaterial);assert.match(dwarfs.material.fragmentShader,/gl_PointCoord/);
 scene.keyDown({key:'ArrowRight',target:host,preventDefault(){}});assert.equal(frames.size,1);flush();assert.deepEqual(entry.galaxies.map((galaxy:any)=>galaxy.volume.root.position.toArray()),matrices);
 assert.equal(entry.root.rotation.y,scene.views[2].yaw);assert.equal(entry.root.rotation.z,0);
 const angle=scene.views[2].yaw;scene.setSolarPhase(12.49);scene.show(0);flush();assert.equal(scene.entries.get(0).root.children.filter((child:any)=>child instanceof THREE.Mesh&&child.geometry===scene.sphere).length,9);
 const solar=scene.entries.get(0),sunMaterial=solar.materials.find((material:any)=>material.userData.illustrativePhotosphere);assert.equal(sunMaterial.uniforms.surfacePhase.value,solarSurfacePhase(12.49));scene.setSolarPhase(20.1);assert.equal(sunMaterial.uniforms.surfacePhase.value,solarSurfacePhase(20.1));const radii=solar.root.children.filter((child:any)=>child instanceof THREE.Mesh&&child.geometry===scene.sphere).map((child:any)=>child.scale.x);scene.setView('edge');flush();assert.equal(solar.root.rotation.x,Math.PI/2);assert.equal(solar.root.rotation.y,0);
 const orbit=solar.root.children.find((child:any)=>child instanceof THREE.LineLoop);const projected=Array.from({length:orbit.geometry.getAttribute('position').count},(_,i)=>new THREE.Vector3().fromBufferAttribute(orbit.geometry.getAttribute('position'),i).applyMatrix4(orbit.matrixWorld));assert.ok(Math.max(...projected.map(point=>point.y))-Math.min(...projected.map(point=>point.y))<1e-12);assert.equal(orbit.material.opacity,0);
 scene.setView('top');flush();assert.equal(solar.root.rotation.x,0);assert.equal(orbit.material.opacity,.5);assert.deepEqual(solar.root.children.filter((child:any)=>child instanceof THREE.Mesh&&child.geometry===scene.sphere).map((child:any)=>child.scale.x),radii);scene.show(2);flush();assert.equal(scene.views[2].yaw,angle);
 for(let home=0;home<7;home++){scene.show(home);flush();assert.ok(scene.entries.size<=model.MEMBERSHIP_CACHE_LIMIT);if(home>=4)assert.equal(scene.entries.get(home).web.kind,['near','middle','observable'][home-4]);}
 const before=rendered;document.hidden=true;scene.reset();assert.equal(frames.size,0);scene.setActive(false);assert.equal(scene.layer.hidden,true);scene.show(1);assert.equal(rendered,before);document.hidden=false;scene.setActive(true);assert.equal(frames.size,1);scene.setActive(false);assert.equal(frames.size,0);
 scene.setActive(true);flush();scene.contextLost({preventDefault(){}});assert.equal(failures.at(-1),true);assert.equal(scene.layer.hidden,true);assert.equal(frames.size,0);scene.retry();flush();assert.equal(created,2);assert.equal(disposed,1);assert.equal(lost,1);assert.equal(failures.at(-1),false);
 scene.dispose();scene.dispose();assert.equal(disposed,2);assert.equal(lost,2);assert.equal(disconnected,1);assert.equal(scene.entries.size,0);assert.equal(host.listeners.size,0);assert.equal(frames.size,0);assert.ok(webDisposed>=1);
 const atEnd=rendered;textureCallbacks.forEach(callback=>callback(new THREE.Texture()));flush();assert.equal(rendered,atEnd);
});

test('comparison composition creates no membership context until its active chapter requests one',()=>{
 const source=readFileSync(new URL('../comparison.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('comparison.ts',source,ts.ScriptTarget.Latest,true),declaration=ast.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='ComparisonJourney');assert.ok(declaration&&ts.isClassDeclaration(declaration));const method=declaration.members.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(ast)==='ensureMembership');assert.ok(method);
 const code=ts.transpileModule('class Harness{'+method.getText(ast)+'}\nglobalThis.Harness=Harness;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 let created=0,active=0;class Scene {ready=true;constructor(){created++;}setSolarPhase(){}setActive(value:boolean){if(value)active++;}show(){}}
 const document={hidden:false},context=vm.createContext({document,content});vm.runInContext(code,context);const harness=new (context as any).Harness();Object.assign(harness,{chapter:'compare',membershipModule:{Membership3D:Scene},words:content.en,visual:{},paint(){}});
 harness.ensureMembership();assert.equal(created,0);harness.chapter='homes';document.hidden=true;harness.ensureMembership();assert.equal(created,0);document.hidden=false;harness.ensureMembership();harness.ensureMembership();assert.equal(created,1);assert.equal(active,1);
});
