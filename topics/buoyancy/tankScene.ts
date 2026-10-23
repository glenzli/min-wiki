import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Settings } from './model.ts';
import { frameLab, orientLab, projectInViewport, labHeight, LAB_VERTICAL_UNIT } from './framing.ts';
import { createSpecimenMaterials } from './specimenMaterials.ts';
import { createWaterOptics } from './waterOptics.ts';
import { basinContour, basinPoint, createBasinBase, createBasinWater, updateBasinWater, createVesselWall, createWoodShape, createPebbleShape, createMetalShape, createClayShape, createMeniscusGeometry, updateMeniscusGeometry } from './labGeometry.ts';
import { LabNavigation } from './labNavigation.ts';
import { createLabEnvironment, type LabEnvironment } from './labEnvironment.ts';
import { createWaterContactSampler, type WaterContactSampler } from './waterContact.ts';

export type TankGeometry={water:number;bottom:number;width:number;height:number;cup:number};
type Frame={state:Settings;geometry:TankGeometry;form:number;flooded:boolean;displaced:number;ripple:number};
const unit=.01,floor=.08;

/** One retained production hull topology, also used for visibility checks. */
export function createClayHullGeometry() {
 const geometry=new THREE.BufferGeometry(),rows=96,columns=96;
 const positions=new Float32Array((rows+1)*(columns+1)*3),colors=new Float32Array(positions.length),uv=new Float32Array((rows+1)*(columns+1)*2),indices:number[]=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){const n=j*(columns+1)+i;uv[n*2]=i/columns*3;uv[n*2+1]=j/rows*2;if(j<rows&&i<columns){const a=n,b=n+columns+1;indices.push(a,a+1,b,b,a+1,b+1);}}
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setIndex(indices);
 return geometry;
}

/** Owns the spatial lab's GPU objects, materials, projection and disposal.
 * Settled mass/displacement/forces and finite transition time remain in scene.ts. */
export class TankScene {
 readonly canvas:HTMLCanvasElement;
 private readonly world=new THREE.Scene();
 private readonly camera=new THREE.OrthographicCamera(-4.7,4.7,3,-3,.1,70);
 private readonly geometries=new Set<THREE.BufferGeometry>();
 private readonly materials=new Set<THREE.Material>();
 private readonly textures=new Set<THREE.Texture>();
 private readonly observer:ResizeObserver;
 private readonly navigation:LabNavigation;
 private readonly environment:THREE.WebGLRenderTarget;
 private readonly surroundings:LabEnvironment;
 private readonly contactSamplers=new Map<THREE.Mesh,WaterContactSampler>();
 private readonly wood:THREE.Mesh;
 private readonly stone:THREE.Mesh;
 private readonly immersion:THREE.Mesh;
 private readonly steel:THREE.Mesh;
 private readonly clay:THREE.Mesh;
 private readonly hull:THREE.Mesh<THREE.BufferGeometry>;
 private readonly contact:THREE.LineLoop;
 private readonly contactSurface:THREE.Mesh;
 private readonly wallMeniscus:THREE.Mesh;
 private readonly ripple:THREE.LineLoop;
 private readonly waterSides:THREE.Mesh;
 private readonly waterTop:THREE.Mesh<THREE.ShapeGeometry>;
 private readonly waterEdge:THREE.LineLoop;
 private readonly cupWater:THREE.Mesh;
 private readonly cupSurface:THREE.Mesh;
 private readonly cupMeniscus:THREE.Mesh;
 private readonly cargo:THREE.Mesh[]=[];
 private readonly support=new THREE.Group();
 private readonly comparison=new THREE.Group();
 private readonly cord:THREE.Mesh;
 private readonly eye:THREE.Mesh;
 private readonly profile=new THREE.CatmullRomCurve3([],false,'centripetal');
 private readonly waterLevel={value:0};
 private readonly waterMotion={value:0};
 private holeKey='';
 private view:'tank'|'displacement'='tank';
 private held=false;
 private opening=0;
 private visible=true;
 private viewport={width:850,height:540};
 private disposed=false;
 private lost=false;
 get available(){return !this.disposed&&!this.lost;}
 static create(svg:SVGSVGElement,onUnavailable:()=>void,onProjectionChange:()=>void){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  try{return new TankScene(renderer,svg,onUnavailable,onProjectionChange);}catch(error){renderer.dispose();renderer.forceContextLoss();throw error;}
 }
 private geometry<T extends THREE.BufferGeometry>(geometry:T):T{this.geometries.add(geometry);return geometry;}
 private material<T extends THREE.Material>(material:T):T{this.materials.add(material);return material;}
 private mesh(geometry:THREE.BufferGeometry,material:THREE.Material|THREE.Material[],parent:THREE.Object3D=this.world){
  const mesh=new THREE.Mesh(geometry,material);parent.add(mesh);return mesh;
 }
 private constructor(private readonly renderer:THREE.WebGLRenderer,private readonly svg:SVGSVGElement,onUnavailable:()=>void,private readonly onProjectionChange:()=>void){
  this.canvas=renderer.domElement;this.canvas.setAttribute('aria-hidden','true');
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
  this.world.background=new THREE.Color('#ede8de');
  orientLab(this.camera);
  // Broad studio windows give glass and metal readable reflections. They are
  // lighting geometry only, not additional objects in the experiment.
  const environmentScene=new THREE.Scene();environmentScene.background=new THREE.Color('#3d474d');
  const panels:THREE.Mesh[]=[];
  const softbox=(w:number,h:number,position:[number,number,number],brightness:number)=>{
   const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color('#fffaf0').multiplyScalar(brightness),side:THREE.DoubleSide}));
   panel.position.set(...position);panel.lookAt(0,1,0);environmentScene.add(panel);panels.push(panel);
  };
  softbox(5,7,[-4,7,5],4);softbox(2,6,[7,3,-2],1.2);softbox(8,1.2,[0,7,-5],3);softbox(1.4,4,[-2,-2.5,6],2.2);
  // The visible pale tabletop also belongs in reflective materials' world.
  // Without this lower hemisphere, steel reflects a fictitious dark void.
  softbox(30,30,[0,-5,0],.75);
  const pmrem=new THREE.PMREMGenerator(renderer);
  this.environment=pmrem.fromScene(environmentScene,.01);this.world.environment=this.environment.texture;this.world.environmentIntensity=.65;
  for(const panel of panels){panel.geometry.dispose();(panel.material as THREE.Material).dispose();}pmrem.dispose();
  this.world.add(new THREE.HemisphereLight('#eef5ff','#79766e',.38));
  const key=new THREE.DirectionalLight('#fff8ef',2.5);key.position.set(-3.5,8,5);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;
  key.shadow.camera.top=5;key.shadow.camera.bottom=-4;key.shadow.normalBias=.02;key.shadow.bias=-.0001;
  key.shadow.radius=5;key.shadow.blurSamples=8;key.shadow.intensity=.38;this.world.add(key);
  const fill=new THREE.DirectionalLight('#d4edff',.38);fill.position.set(5,4,-3);this.world.add(fill);
  const standard=(options:THREE.MeshStandardMaterialParameters)=>this.material(new THREE.MeshStandardMaterial(options));
  const physical=(options:THREE.MeshPhysicalMaterialParameters)=>this.material(new THREE.MeshPhysicalMaterial(options));
  const rounded=this.geometry(new RoundedBoxGeometry(1,1,1,5,.045));
  this.surroundings=createLabEnvironment(()=>this.render());
  this.world.add(this.surroundings.group);
  this.surroundings.geometries.forEach(value=>this.geometries.add(value));
  this.surroundings.materials.forEach(value=>this.materials.add(value));
  this.surroundings.textures.forEach(value=>this.textures.add(value));
  // A thin, clear coat is composited after the water. Its reflections sample
  // the same studio as the specimens; it does not paint diffuse white over
  // the contents or pretend to solve nested glass/water ray transmission.
  const glass=physical({color:'#ffffff',roughness:.035,metalness:0,transparent:true,depthWrite:false,envMapIntensity:1,specularIntensity:1});
  glass.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   float edgeReflection=pow(1.0-abs(dot(normal,geometryViewDir)),5.0);
   vec3 glassReflection=vec3(.14,.18,.19);
   #ifdef USE_ENVMAP
    glassReflection=getIBLRadiance(geometryViewDir,normal,material.roughness);
   #endif
   outgoingLight=glassReflection+totalSpecular*.16;
   diffuseColor.a=.025+.68*edgeReflection;
   #include <opaque_fragment>`);};
  glass.customProgramCacheKey=()=> 'buoyancy-vessel-reflection-v3';
  const glassBase=physical({color:'#ffffff',roughness:.035,transmission:1,depthWrite:false,thickness:.08,ior:1.46,attenuationColor:new THREE.Color('#e4eeeb'),attenuationDistance:4,envMapIntensity:1});
  this.mesh(this.geometry(createVesselWall()),glass).renderOrder=5;
  this.mesh(this.geometry(createVesselWall(true)),glass).renderOrder=6;
  this.mesh(this.geometry(createBasinBase(.005,.075,-.005)),glassBase);
  const glint=this.material(new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.4,depthWrite:false}));
  const datumHeight=labHeight(245);
  const datumPoints=Array.from({length:65},(_,i)=>{const p=basinPoint(Math.PI+i/64*Math.PI,datumHeight,.071);return new THREE.Vector3(p.x,datumHeight,p.y);});
  const datum=new THREE.Line(this.geometry(new THREE.BufferGeometry().setFromPoints(datumPoints)),this.material(new THREE.LineDashedMaterial({color:'#5a8993',dashSize:.045,gapSize:.045,transparent:true,opacity:.3,depthWrite:false})));
  datum.computeLineDistances();datum.renderOrder=6;this.world.add(datum);
  const optics=createWaterOptics(this.waterLevel,this.waterMotion);
  optics.materials.forEach(material=>this.materials.add(material));
  const waterSide=optics.side,waterTop=optics.surface;
  this.waterSides=this.mesh(this.geometry(createBasinWater()),waterSide);this.waterSides.renderOrder=3;
  this.waterTop=new THREE.Mesh(new THREE.ShapeGeometry(),waterTop);this.waterTop.rotation.x=-Math.PI/2;this.waterTop.renderOrder=4;this.world.add(this.waterTop);
  const caustics=this.mesh(this.geometry(new THREE.ShapeGeometry(basinContour(floor,.08))),optics.floorLight);caustics.rotation.x=-Math.PI/2;caustics.position.y=floor+.003;caustics.renderOrder=2;
  const contactGeometry=this.geometry(new THREE.BufferGeometry());contactGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(128*3),3));
  this.contact=new THREE.LineLoop(contactGeometry,this.material(new THREE.LineBasicMaterial({color:'#33464a',transparent:true,opacity:.28,depthWrite:false})));this.contact.renderOrder=8;this.world.add(this.contact);
  const contactMaterial=physical({color:'#ffffff',roughness:.035,transparent:true,depthWrite:false,envMapIntensity:1});
  contactMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   float contactFresnel=.025+.7*pow(1.0-abs(dot(normal,geometryViewDir)),5.0);
   vec3 contactReflection=vec3(.14,.18,.19);
   #ifdef USE_ENVMAP
    contactReflection=getIBLRadiance(geometryViewDir,normal,material.roughness);
   #endif
   outgoingLight=contactReflection+totalSpecular*.15;
   diffuseColor.a=contactFresnel;
   #include <opaque_fragment>`);};
  contactMaterial.customProgramCacheKey=()=> 'buoyancy-contact-surface-v1';
  this.contactSurface=this.mesh(this.geometry(createMeniscusGeometry()),contactMaterial);this.contactSurface.renderOrder=7;
  this.wallMeniscus=this.mesh(this.geometry(createMeniscusGeometry(true)),contactMaterial);this.wallMeniscus.renderOrder=7;
  this.ripple=new THREE.LineLoop(this.geometry(contactGeometry.clone()),this.material(new THREE.LineBasicMaterial({color:'#def5f4',transparent:true,opacity:0,depthWrite:false})));this.ripple.renderOrder=8;this.world.add(this.ripple);
  const waterEdgeGeometry=this.geometry(new THREE.BufferGeometry());waterEdgeGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(129*3),3));
  this.waterEdge=new THREE.LineLoop(waterEdgeGeometry,this.material(new THREE.LineBasicMaterial({color:'#b4e5e1',transparent:true,opacity:.65,depthWrite:false})));
  this.waterTop.add(this.waterEdge);this.waterEdge.rotation.x=Math.PI/2;
  const specimens=createSpecimenMaterials(this.waterLevel,()=>this.render());
  specimens.materials.forEach(material=>this.materials.add(material));specimens.textures.forEach(texture=>this.textures.add(texture));
  this.wood=this.mesh(this.geometry(createWoodShape()),specimens.wood);
  const rock=this.geometry(createPebbleShape());
  this.stone=this.mesh(rock,specimens.stone);this.immersion=this.mesh(rounded,specimens.stone);
  const metal=specimens.metal;
  this.steel=this.mesh(this.geometry(createMetalShape()),metal);
  this.clay=this.mesh(this.geometry(createClayShape()),specimens.clay);
  for(const object of [this.wood,this.stone,this.immersion,this.steel,this.clay])this.contactSamplers.set(object,createWaterContactSampler(object.geometry));
  const hullGeometry=this.geometry(createClayHullGeometry());
  this.hull=new THREE.Mesh(hullGeometry,specimens.hull);this.world.add(this.hull);
  for(const object of [this.wood,this.stone,this.immersion,this.steel,this.clay,this.hull]){object.visible=false;object.castShadow=true;object.receiveShadow=true;}
  const cargoMaterial=specimens.cargo;
  const stampCanvas=document.createElement('canvas');stampCanvas.width=256;stampCanvas.height=128;
  const stampContext=stampCanvas.getContext('2d')!;stampContext.fillStyle='#263c44';stampContext.font='500 46px sans-serif';stampContext.textAlign='center';stampContext.textBaseline='middle';stampContext.fillText('100 g',128,64);
  const stamp=new THREE.CanvasTexture(stampCanvas);stamp.colorSpace=THREE.SRGBColorSpace;this.textures.add(stamp);
  const stampGeometry=this.geometry(new THREE.PlaneGeometry(.86,.43)),stampMaterial=this.material(new THREE.MeshBasicMaterial({map:stamp,transparent:true,depthWrite:false}));
  for(let i=0;i<12;i++){
   const cargo=this.mesh(rounded,cargoMaterial);cargo.scale.set(.29,.23,.25);cargo.visible=false;cargo.castShadow=cargo.receiveShadow=true;this.cargo.push(cargo);
   const marking=this.mesh(stampGeometry,stampMaterial,cargo);marking.rotation.x=-Math.PI/2;marking.position.y=.502;
  }
  const cupStart=this.world.children.length;
  const cupProfile=[[0,0],[.5,0],[.57,.04],[.57,2.45],[.53,2.45],[.53,.12],[0,.12]].map(([x,y])=>new THREE.Vector2(x,y));
  const cup=this.mesh(this.geometry(new THREE.LatheGeometry(cupProfile,96)),glass);
  cup.position.set(3.6,.025,0);cup.renderOrder=6;
  const rimGeometry=this.geometry(new THREE.TorusGeometry(.55,.012,8,96));
  for(const y of [.08,2.475]){const rim=this.mesh(rimGeometry,this.material(new THREE.MeshBasicMaterial({color:'#8da8b5',transparent:true,opacity:.55})));rim.rotation.x=Math.PI/2;rim.position.set(3.6,y,0);rim.renderOrder=7;}
  const cupBottom=this.mesh(this.geometry(new THREE.CylinderGeometry(.53,.53,.065,96)),glassBase);cupBottom.position.set(3.6,.075,0);cupBottom.renderOrder=6;
  const cupHighlight=this.mesh(this.geometry(new THREE.CylinderGeometry(.575,.575,2.33,16,1,true,-.57,.024)),glint);cupHighlight.position.set(3.6,1.31,0);cupHighlight.renderOrder=7;
  const cupHighlightFine=this.mesh(this.geometry(new THREE.CylinderGeometry(.575,.575,2.17,12,1,true,1.25,.012)),glint);cupHighlightFine.position.set(3.6,1.29,0);cupHighlightFine.renderOrder=7;
  this.cupWater=this.mesh(this.geometry(new THREE.CylinderGeometry(.515,.515,1,72,1,true)),waterSide);this.cupWater.renderOrder=3;
  this.cupSurface=this.mesh(this.geometry(new THREE.CircleGeometry(.515,72)),waterTop);this.cupSurface.rotation.x=-Math.PI/2;this.cupSurface.renderOrder=4;
  this.cupMeniscus=this.mesh(this.geometry(new THREE.TorusGeometry(.512,.005,6,72)),this.material(new THREE.MeshBasicMaterial({color:'#6c99a8',transparent:true,opacity:.6,depthWrite:false})));this.cupMeniscus.rotation.x=Math.PI/2;this.cupMeniscus.renderOrder=7;
  // The collection scale uses one linear diagram mapping (900 mL / world unit).
  const scaleCanvas=document.createElement('canvas');scaleCanvas.width=256;scaleCanvas.height=1024;const scaleContext=scaleCanvas.getContext('2d')!;
  scaleContext.strokeStyle=scaleContext.fillStyle='#46606c';scaleContext.lineWidth=2;scaleContext.font='28px sans-serif';scaleContext.textBaseline='middle';
  for(let volume=0;volume<=2000;volume+=100){const y=1024-volume/2000*1024,long=volume%500===0;scaleContext.beginPath();scaleContext.moveTo(24,y);scaleContext.lineTo(long?108:70,y);scaleContext.stroke();scaleContext.textBaseline=volume===2000?'top':volume===0?'bottom':'middle';if(long)scaleContext.fillText(String(volume),123,y);}
  const scaleMap=new THREE.CanvasTexture(scaleCanvas);scaleMap.colorSpace=THREE.SRGBColorSpace;this.textures.add(scaleMap);
  const graduations=this.mesh(this.geometry(new THREE.CylinderGeometry(.579,.579,2000/900,48,1,true,.08,1.02)),this.material(new THREE.MeshBasicMaterial({map:scaleMap,transparent:true,depthWrite:false,side:THREE.DoubleSide})));
  graduations.position.set(3.6,.12+1000/900,0);graduations.renderOrder=8;
  this.comparison.add(...this.world.children.slice(cupStart));this.world.add(this.comparison);this.comparison.visible=false;
  this.world.add(this.support);
  const cylinder=this.geometry(new THREE.CylinderGeometry(1,1,1,16));
  const rod=(x:number,y:number,z:number,rx:number,ry:number,rz:number)=>{const m=this.mesh(cylinder,metal,this.support);m.position.set(x,y,z);m.scale.set(rx,ry,rz);return m;};
  const standBase=this.mesh(rounded,metal,this.support);standBase.position.set(-3.16,.06,-.85);standBase.scale.set(.52,.1,.62);
  rod(-3.16,1.65,-.85,.022,3.2,.022);rod(-1.58,3.25,-.85,.023,3.16,.023).rotation.z=Math.PI/2;rod(0,3.25,-.425,.023,.85,.023).rotation.x=Math.PI/2;
  this.cord=this.mesh(cylinder,standard({color:'#72716a',roughness:.95}),this.support);
  this.eye=this.mesh(this.geometry(new THREE.TorusGeometry(.035,.009,8,24)),metal,this.support);
  const holder=svg.parentElement!.classList.contains('buoyancy-stage')?svg.parentElement!:document.createElement('div');holder.className='buoyancy-stage';
  if(!holder.parentElement)svg.before(holder);holder.append(this.canvas,svg);
  this.canvas.addEventListener('webglcontextlost',event=>{if(this.disposed)return;event.preventDefault();this.lost=true;this.canvas.hidden=true;this.navigation.setVisible(false);onUnavailable();});
  this.navigation=new LabNavigation(this.camera,this.canvas,holder,()=>{
   if(!this.navigation.manual){orientLab(this.camera,this.opening);this.navigation.sync();}
   frameLab(this.camera,this.viewport.width,this.viewport.height,this.view==='displacement',this.held);
   this.render();this.onProjectionChange();
  });
  holder.after(holder.querySelector('.lab-navigation')!);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(holder);this.resize();
 }
 private resize(){
  if(!this.available)return;
  const rect=this.canvas.parentElement!.getBoundingClientRect();
  if(rect.width<1||rect.height<1)return;
  this.viewport={width:rect.width,height:rect.height};
  this.surroundings.setLayout(rect.width<600,this.view==='displacement');
  frameLab(this.camera,rect.width,rect.height,this.view==='displacement',this.held);
  this.renderer.setSize(rect.width,rect.height,false);
  if(this.visible){this.svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);this.svg.setAttribute('preserveAspectRatio','none');}
  this.render();this.onProjectionChange();
 }
 get size(){return this.viewport;}
 setView(view:'tank'|'displacement',visible:boolean){
  this.view=view;this.visible=visible;this.comparison.visible=view==='displacement';this.canvas.hidden=!visible||!this.available;this.navigation.setVisible(visible&&this.available);this.resize();
 }
 project(x:number,y:number,z=0):[number,number]{
  return projectInViewport(this.camera,new THREE.Vector3((x-365)*unit,x>650?floor+(440-y)*unit:labHeight(y),z),this.viewport.width,this.viewport.height);
 }
 private setWaterHole(rx:number,rz:number,water:number){
  const key=`${rx.toFixed(3)}:${rz.toFixed(3)}:${water.toFixed(3)}`;if(key===this.holeKey)return;this.holeKey=key;
  const surface=basinContour(water,.075);
  if(rx>0&&rz>0){const hole=new THREE.Path();hole.absellipse(0,0,rx,rz,0,Math.PI*2,true);surface.holes.push(hole);}
  this.waterTop.geometry.dispose();this.waterTop.geometry=new THREE.ShapeGeometry(surface,64);
  const points=this.waterEdge.geometry.getAttribute('position') as THREE.BufferAttribute;
  for(let i=0;i<129;i++){const p=basinPoint(i/128*Math.PI*2,water,.075);points.setXYZ(i,p.x,0,p.y);}points.needsUpdate=true;this.waterEdge.geometry.computeBoundingSphere();
 }
 draw(frame:Frame){
  if(!this.available)return;
  const {state:s,geometry:g,form,flooded,displaced}=frame,w=g.width*unit,h=g.height*LAB_VERTICAL_UNIT,bottom=labHeight(g.bottom),water=labHeight(g.water);
  const boat=s.experiment==='boat',held=s.experiment==='depth',kind=held?'stone':s.object;
  const opening=boat?form:0;
  if(this.held!==held||this.opening!==opening){this.held=held;this.opening=opening;if(!this.navigation.manual){orientLab(this.camera,opening);this.navigation.sync();}frameLab(this.camera,this.viewport.width,this.viewport.height,this.view==='displacement',held);}
  this.wood.visible=!boat&&!held&&kind==='wood';this.stone.visible=!boat&&!held&&kind==='stone';this.immersion.visible=held;this.steel.visible=!boat&&!held&&kind==='steel';this.clay.visible=!boat&&kind==='clay';this.hull.visible=boat;
  this.waterLevel.value=water;this.waterMotion.value=frame.ripple;
  for(const object of [this.wood,this.stone,this.immersion,this.steel,this.clay]){
   object.position.set(0,bottom+h/2,0);object.scale.set(w,h,kind==='wood'?.82:held?.95:kind==='clay'?w:w*.8);
   const isWood=object===this.wood;
   object.rotation.set(isWood?.015*frame.ripple:0,isWood?-.16:object===this.stone?.25:object===this.clay?-.2:0,isWood?Math.sin(frame.ripple*9)*frame.ripple*.10:0);
  }
  const depth=(1-form)*w+form*1.30,thickness=(20*260/g.width)*LAB_VERTICAL_UNIT;
  let intersectionRadius=0;
  if(boat){
   const inside=Math.max(.25,.784-1.4*thickness/w);
   const rimInside=Math.max(.78,1-1.2*thickness/w);
   this.profile.points=[[0,thickness],[inside*.65,thickness],[inside,thickness+.012],[rimInside*.96,h*.69],[rimInside,h-.038],[(rimInside+1)/2,h-.007],[1,h-.025],[.994,h-.075],[.97,h*.67],[.9,h*.32],[.8,h*.13],[.65,h*.035],[.4,0],[0,0]].map(([r,y])=>new THREE.Vector3(r,y,0));
   const p=this.hull.geometry.getAttribute('position') as THREE.BufferAttribute,colors=this.hull.geometry.getAttribute('color') as THREE.BufferAttribute;
   let previousRadius=0,previousHeight=0;
   for(let j=0;j<=96;j++){
    const u=j/96,v=this.profile.getPoint(u),radius=(1-form)*Math.sin(Math.PI*u)+form*Math.max(0,Math.min(1,v.x)),height=(1-form)*h*(1+Math.cos(Math.PI*u))/2+form*Math.max(0,Math.min(h,v.y));
    if(j>0&&Math.min(previousHeight,height)<=water-bottom&&Math.max(previousHeight,height)>=water-bottom&&Math.abs(height-previousHeight)>.00001){const t=(water-bottom-previousHeight)/(height-previousHeight);intersectionRadius=Math.max(intersectionRadius,previousRadius+(radius-previousRadius)*t);}
    previousRadius=radius;previousHeight=height;
    const interior=1-form*(u<.42?.18*(1-u/.42):0);
    for(let i=0;i<=96;i++){
     const angle=i/96*Math.PI*2,hand=1+form*(.003*Math.sin(angle*3+.7)+.0015*Math.sin(angle*7+1.9))*Math.sin(Math.PI*u)**2;
     const lip=.003*form*radius**3*Math.sin(angle*3+.7)*Math.min(1,height/.1);
     p.setXYZ(j*97+i,radius*hand*w/2*Math.cos(angle),bottom+height+lip,radius*hand*depth/2*Math.sin(angle));
     colors.setXYZ(j*97+i,interior,interior,interior);
    }
   }
   p.needsUpdate=colors.needsUpdate=true;this.hull.geometry.computeVertexNormals();
   const normals=this.hull.geometry.getAttribute('normal') as THREE.BufferAttribute,average=new THREE.Vector3();
   for(let j=0;j<=96;j++){const a=j*97,b=a+96;average.set(normals.getX(a)+normals.getX(b),normals.getY(a)+normals.getY(b),normals.getZ(a)+normals.getZ(b)).normalize();normals.setXYZ(a,average.x,average.y,average.z);normals.setXYZ(b,average.x,average.y,average.z);}
   normals.needsUpdate=true;this.hull.geometry.computeBoundingSphere();
  }
  this.cargo.forEach((object,i)=>{object.visible=boat&&form>.999&&i<s.cargo;if(object.visible){const layer=Math.floor(i/4),row=Math.floor(i/2)%2;object.position.set((i%2-.5)*.32,bottom+thickness+.115+layer*.235,(row-.5)*.29);}});
  updateBasinWater(this.waterSides.geometry,water);this.waterSides.scale.set(1,water-floor,1);this.waterSides.position.y=(water+floor)/2;
  this.waterTop.position.y=water;
  updateMeniscusGeometry(this.wallMeniscus.geometry,water,(angle,offset)=>basinPoint(angle,water,.075+offset));
  const dryOpening=boat&&form>.999&&!flooded&&bottom<water&&bottom+h>water;
  this.setWaterHole(dryOpening?w/2*intersectionRadius:0,dryOpening?depth/2*intersectionRadius:0,water);
  const activeObject=held?this.immersion:kind==='wood'?this.wood:kind==='stone'?this.stone:kind==='steel'?this.steel:this.clay;
  const sampledContact=boat?null:this.contactSamplers.get(activeObject)?.sample(activeObject,water);
  this.contact.visible=boat?bottom<water&&bottom+h>water:!!sampledContact;
  this.contactSurface.visible=this.contact.visible;
  this.ripple.visible=this.contact.visible&&frame.ripple>0;
  if(this.contact.visible){
   const ellipsoid=boat||kind==='clay'||kind==='stone'&&!held,level=(water-bottom)/h;
   const radius=boat?intersectionRadius:ellipsoid?Math.sqrt(Math.max(0,1-(2*level-1)**2)):1;
   const rx=w/2*radius,rz=(boat?depth:kind==='wood'?.82:held?.95:kind==='clay'?w:w*.8)/2*radius;
   const boundary=(angle:number,offset:number)=>{
    if(sampledContact){
     const index=angle/(Math.PI*2)*128,low=Math.floor(index)%128,high=(low+1)%128,blend=index-Math.floor(index),p=sampledContact.points;
     const x=THREE.MathUtils.lerp(p[low*3],p[high*3],blend),z=THREE.MathUtils.lerp(p[low*3+2],p[high*3+2],blend);
     const dx=x-sampledContact.center.x,dz=z-sampledContact.center.y,length=Math.hypot(dx,dz)||1;
     return new THREE.Vector2(x+dx/length*offset,z+dz/length*offset);
    }
    const c=Math.cos(angle),sine=Math.sin(angle),x=ellipsoid?c:Math.sign(c)*Math.abs(c)**.15,z=ellipsoid?sine:Math.sign(sine)*Math.abs(sine)**.15;
    return new THREE.Vector2(x*(rx+.002+offset),z*(rz+.002+offset));
   };
   updateMeniscusGeometry(this.contactSurface.geometry,water,boundary);
   const contactPoints=this.contact.geometry.getAttribute('position') as THREE.BufferAttribute,ripplePoints=this.ripple.geometry.getAttribute('position') as THREE.BufferAttribute;
   for(let i=0;i<128;i++){
    const angle=i/128*Math.PI*2,point=boundary(angle,.004),spread=.025+.16*(1-frame.ripple),wave=boundary(angle,spread);
    contactPoints.setXYZ(i,point.x,water+.007,point.y);
    ripplePoints.setXYZ(i,wave.x,water+.004,wave.y);
   }
   contactPoints.needsUpdate=ripplePoints.needsUpdate=true;this.contact.geometry.computeBoundingSphere();this.ripple.geometry.computeBoundingSphere();
   (this.ripple.material as THREE.LineBasicMaterial).opacity=frame.ripple*.4;
  }
  const cupHeight=Math.max(0,(438-g.cup)*unit);this.cupWater.visible=this.cupSurface.visible=displaced>0;
  this.cupWater.scale.set(1,Math.max(.001,cupHeight),1);this.cupWater.position.set(3.6,.12+cupHeight/2,0);this.cupSurface.position.set(3.6,.12+cupHeight,0);
  this.cupMeniscus.visible=displaced>0;this.cupMeniscus.position.set(3.6,.123+cupHeight,0);
  this.support.visible=held;
  const top=bottom+h,length=Math.max(.015,3.25-top);
  this.cord.scale.set(.007,length,.007);this.cord.position.set(0,top+length/2,0);this.eye.position.set(0,top+.025,0);
  this.render();
 }
 private render(){if(this.available)this.renderer.render(this.world,this.camera);}
 dispose(){
  if(this.disposed)return;this.disposed=true;this.observer.disconnect();this.navigation.dispose();this.surroundings.stopLoading();this.contactSamplers.clear();
  this.waterTop.geometry.dispose();for(const geometry of this.geometries)geometry.dispose();for(const material of this.materials)material.dispose();
  for(const texture of this.textures){const image=texture.image as HTMLCanvasElement;texture.dispose();if(image instanceof HTMLCanvasElement)image.width=image.height=0;}
  this.environment.dispose();this.world.clear();this.renderer.dispose();this.renderer.forceContextLoss();this.canvas.remove();
 }
}
