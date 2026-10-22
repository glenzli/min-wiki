import * as THREE from 'three';
import { watershedState, type Settings, type View } from './watershedModel.ts';
import { anchors, cameraFrames, channelAt, coastline, DOMAIN, glacierCourse, GROUND, LAKE, onTerrain, outletCourse, parcelPosition, POOL_COLOR, riverCourse, runoffCourse, SEA_LEVEL, stableNoise, terrainHeight, type CameraFrame, type XYZ } from './watershedGeography.ts';
import { riverGrain } from '../river-paths/model.ts';

export interface BasinFrame { progress:number;settings:Settings;iceProgress:number;tracer:number;labels:boolean;view:View;camera?:CameraFrame }
type Projection={id:string;x:number;y:number;visible:boolean};
const vector=(p:XYZ)=>new THREE.Vector3(...p);
const terrainColor=(x:number,z:number,h:number)=>{
 const shore=coastline(z)-x,water=channelAt(x,z);
 const color=new THREE.Color(h>3.15?'#e5e8dd':h>2.6?'#92998c':h>2.1?'#8f9382':shore<.5?'#bcb894':water.distance<.34?'#a1a47d':'#82916b');
 return color.multiplyScalar(.93+.1*stableNoise(x*19.4+z*17));
};
/** Bounded static mesh; all water contact comes from the topic geography. */
export function makeTerrainGeometry(nx=176,nz=104){
 const positions:number[]=[],colors:number[]=[],indices:number[]=[];
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const x=DOMAIN.left+(DOMAIN.right-DOMAIN.left)*i/nx,z=DOMAIN.back+(DOMAIN.front-DOMAIN.back)*j/nz,h=terrainHeight(x,z),color=terrainColor(x,z,h);
  positions.push(x,h,z);colors.push(color.r,color.g,color.b);
 }
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
export function makeWatershedRibbon(course:(q:number)=>XYZ,width:(q:number)=>number,steps:number,lift=0,ground=false){
 const positions:number[]=[],indices:number[]=[];
 for(let i=0;i<=steps;i++){
  const q=i/steps,p=course(q),a=course(Math.max(0,q-.002)),b=course(Math.min(1,q+.002)),dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz)||1,w=width(q);
  for(const side of [-1,1]){const x=p[0]-dz/len*w*side,z=p[2]+dx/len*w*side;positions.push(x,ground?terrainHeight(x,z)+lift:p[1]+lift,z);}
  if(i<steps){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function lakeGeometry(){
 const positions:number[]=[LAKE.x,LAKE.y,LAKE.z],indices:number[]=[];
 for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;positions.push(LAKE.x+Math.cos(a)*LAKE.rx,LAKE.y,LAKE.z+Math.sin(a)*LAKE.rz);if(i<96)indices.push(0,i+2,i+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function oceanGeometry(){
 const positions:number[]=[],indices:number[]=[];
 for(let j=0;j<=80;j++){const z=DOMAIN.back+(DOMAIN.front-DOMAIN.back)*j/80;positions.push(coastline(z)-.06,SEA_LEVEL,z,DOMAIN.right,SEA_LEVEL,z);if(j<80){const a=j*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
const cloudVertex=`varying vec3 localPoint; void main(){localPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const cloudFragment=`precision highp float;
varying vec3 localPoint;uniform vec3 rayDirection;uniform float fullness;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float density(vec3 p){
 if(any(greaterThan(abs(p),vec3(1.0))))return 0.0;
 float shape=0.0;
 for(int i=0;i<7;i++){float f=float(i);vec3 c=vec3(-.75+f*.25,.08+sin(f*1.7)*.2,sin(f*2.6)*.22);shape=max(shape,1.0-length((p-c)/vec3(.32,.59+sin(f)*.12,.62)));}
 float detail=noise(p*7.0)*.19+noise(p*15.0)*.07;
 return max(0.0,shape-detail+.03)*fullness;
}
void main(){vec3 p=localPoint+rayDirection*.006;vec4 sum=vec4(0.0);for(int i=0;i<44;i++){
 float d=density(p);float above=density(p+vec3(-.11,.18,-.07));float light=clamp(.76+(d-above)*1.25,.43,1.0);
 float alpha=1.0-exp(-d*.48);vec3 color=mix(vec3(.56,.66,.69),vec3(1.0,.99,.95),light);
 sum.rgb+=(1.0-sum.a)*color*alpha;sum.a+=(1.0-sum.a)*alpha;p+=rayDirection*.06;if(sum.a>.97)break;
 }if(sum.a<.006)discard;gl_FragColor=vec4(sum.rgb/max(sum.a,.001),sum.a);}`;

/** One retained GPU scene. It owns no clock or animation loop: every visible
 * change samples the controller's progress, including ripples and cloud growth. */
export class Watershed3D {
 private renderer?:THREE.WebGLRenderer;
 private readonly world=new THREE.Scene();
 private readonly camera=new THREE.OrthographicCamera();
 private readonly group=new THREE.Group();
 private readonly droplets:THREE.InstancedMesh;
 private readonly sediment:THREE.InstancedMesh;
 private readonly ring:THREE.Mesh;
 private readonly trace:THREE.Line;
 private readonly cloud:THREE.Mesh<THREE.BoxGeometry,THREE.ShaderMaterial>;
 private readonly patch:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
 private readonly ripples=new THREE.Group();
 private readonly matrix=new THREE.Object3D();
 private readonly observer:ResizeObserver;
 private readonly abort=new AbortController();
 private state?:BasinFrame;
 private disposed=false;private lost=false;private failed=false;private yaw=.2;private pitchDelta=0;private zoom=1;private pointer:{x:number;y:number}|null=null;
 private currentView:View='basin';private target=vector(cameraFrames.basin.target);private span=cameraFrames.basin.span;private pitch=cameraFrames.basin.pitch;
 private readonly labels:HTMLElement[];
 private renderCount=0;
 constructor(private canvas:HTMLCanvasElement,private labelHost:HTMLElement,private onFailure:(failed:boolean)=>void){
  this.world.background=new THREE.Color('#dbe7e3');this.world.fog=new THREE.Fog('#dbe7e3',29,65);
  this.world.add(this.group,new THREE.HemisphereLight('#f1f4e9','#6b7360',2.7));
  const sun=new THREE.DirectionalLight('#fff4da',3.1);sun.position.set(-8,14,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=9;sun.shadow.camera.bottom=-9;sun.shadow.normalBias=.06;this.world.add(sun);
  const terrain=new THREE.Mesh(makeTerrainGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.93}));terrain.receiveShadow=true;this.group.add(terrain);
  this.makeEdges();
  const water=new THREE.MeshStandardMaterial({color:'#388d9d',roughness:.28,metalness:.04});
  for(const geometry of [makeWatershedRibbon(riverCourse,q=>.13+.065*q,180,.008),makeWatershedRibbon(outletCourse,q=>.15+.055*q,100,.009),makeWatershedRibbon(runoffCourse,()=>.034,80,.008),lakeGeometry(),oceanGeometry()]){const mesh=new THREE.Mesh(geometry,water);mesh.receiveShadow=true;this.group.add(mesh);}
  const glacier=new THREE.Mesh(makeWatershedRibbon(glacierCourse,q=>.13+.055*Math.sin(q*Math.PI),90,.095,true),new THREE.MeshStandardMaterial({color:'#d6e9e5',roughness:.39}));glacier.receiveShadow=true;this.group.add(glacier);
  const iceLines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#75a6b0',transparent:true,opacity:.55}));const crevasses:number[]=[];
  for(let i=1;i<15;i++){const p=glacierCourse(i/16);for(const dz of [-.12,.12])crevasses.push(p[0]-.045,terrainHeight(p[0]-.045,p[2]+dz)+.103,p[2]+dz);}
  iceLines.geometry.setAttribute('position',new THREE.Float32BufferAttribute(crevasses,3));this.group.add(iceLines);
  this.makeVegetation();
  this.patch=new THREE.Mesh(this.patchGeometry(),new THREE.MeshStandardMaterial({color:'#bcaf8c',roughness:1}));this.patch.receiveShadow=true;this.group.add(this.patch);
  this.cloud=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.ShaderMaterial({vertexShader:cloudVertex,fragmentShader:cloudFragment,transparent:true,depthWrite:false,uniforms:{rayDirection:{value:new THREE.Vector3()},fullness:{value:1}}}));this.cloud.position.set(-1.7,5.3,.35);this.cloud.scale.set(3.1,.72,1.15);this.cloud.renderOrder=2;this.group.add(this.cloud);
  this.droplets=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),new THREE.MeshBasicMaterial({color:'#76cce6'}),100);this.droplets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.droplets.frustumCulled=false;this.droplets.renderOrder=3;this.group.add(this.droplets);
  this.sediment=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.033,0),new THREE.MeshStandardMaterial({color:'#bb985c',roughness:1}),16);this.sediment.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.sediment.frustumCulled=false;this.group.add(this.sediment);
  this.ring=new THREE.Mesh(new THREE.RingGeometry(.1,.14,32),new THREE.MeshBasicMaterial({color:'#ffe9a8',side:THREE.DoubleSide,depthTest:false}));this.ring.renderOrder=5;this.group.add(this.ring);
  this.trace=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#e4bf6e',dashSize:.09,gapSize:.055,transparent:true,opacity:.8}));this.trace.frustumCulled=false;this.group.add(this.trace);
  for(let i=0;i<12;i++){
   const points=Array.from({length:34},(_,j)=>new THREE.Vector3(5.1+stableNoise(i+15)*2.3+j*.027,SEA_LEVEL+.013,-3.6+i*.66+.025*Math.sin(j*.24+i)));
   this.ripples.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#c3d9d4',transparent:true,opacity:.37})));
  }
  this.group.add(this.ripples);
  this.labels=Object.keys(anchors).map((id,i)=>{const marker=document.createElement('span');marker.className='basin-marker';marker.dataset.anchor=id;marker.textContent=String(i+1);marker.setAttribute('aria-hidden','true');labelHost.append(marker);return marker;});
  const signal=this.abort.signal;
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;this.pointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);},{signal});
  canvas.addEventListener('pointermove',e=>{if(!this.pointer)return;this.yaw=Math.max(-.65,Math.min(.8,this.yaw+(e.clientX-this.pointer.x)*.006));this.pitchDelta=Math.max(-.25,Math.min(.22,this.pitchDelta+(e.clientY-this.pointer.y)*.004));this.pointer={x:e.clientX,y:e.clientY};this.render();},{signal});
  for(const name of ['pointerup','pointercancel'] as const)canvas.addEventListener(name,()=>{this.pointer=null;},{signal});
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')this.resetCamera();else{if(e.key==='ArrowLeft'||e.key==='ArrowRight')this.yaw=Math.max(-.65,Math.min(.8,this.yaw+(e.key==='ArrowLeft'?-.1:.1)));else if(e.key==='ArrowUp'||e.key==='ArrowDown')this.pitchDelta=Math.max(-.25,Math.min(.22,this.pitchDelta+(e.key==='ArrowUp'?-.05:.05)));else this.zoom=Math.max(.7,Math.min(1.5,this.zoom*(e.key==='-'?1.08:.92)));this.render();}},{signal});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;onFailure(true);},{signal});
  canvas.addEventListener('webglcontextrestored',()=>{
   // Three.js restores its internal renderer in a later listener on this event.
   // Keep the current fallback until those listeners have run, and never treat
   // a canvas without a renderer as a recovered scene.
   queueMicrotask(()=>{if(this.disposed)return;if(!this.renderer){this.failed=true;onFailure(true);return;}this.lost=false;this.failed=false;onFailure(false);this.render();});
  },{signal});
  this.observer=new ResizeObserver(()=>this.render());this.observer.observe(canvas);
  this.createRenderer();
 }
 private createRenderer(){try{this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.failed=false;this.onFailure(false);}catch{this.failed=true;this.onFailure(true);}}
 private makeEdges(){
  const points:number[]=[],indices:number[]=[];
  const edge:XYZ[]=[];for(let i=0;i<=80;i++){const x=DOMAIN.right-(DOMAIN.right-DOMAIN.left)*i/80;edge.push([x,terrainHeight(x,DOMAIN.front),DOMAIN.front]);}
  for(let j=0;j<=60;j++){const z=DOMAIN.front-(DOMAIN.front-DOMAIN.back)*j/60;edge.push([DOMAIN.left,terrainHeight(DOMAIN.left,z),z]);}
  edge.forEach((p,i)=>{points.push(...p,p[0],-.6,p[2]);if(i<edge.length-1){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();this.group.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#9b927b',roughness:1,side:THREE.DoubleSide})));
 }
 private makeVegetation(){
  // A varied, sparse canopy leaves the experiment patch and water course visible.
  // Tree positions are scenery, not vegetation or rainfall model outputs.
  const candidates=Array.from({length:480},(_,i)=>{const x=-6.7+stableNoise(i+110)*10.8,z=-3.9+stableNoise(i+190)*7.9,h=terrainHeight(x,z);return {x,z,h,id:i};}).filter(p=>p.h>.4&&p.h<2.25&&channelAt(p.x,p.z).distance>.48&&Math.hypot((p.x-LAKE.x)/LAKE.rx,(p.z-LAKE.z)/LAKE.rz)>1.28&&Math.hypot(p.x-GROUND[0],p.z-GROUND[2])>1.25).slice(0,122);
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.018,.035,.42,8),new THREE.MeshStandardMaterial({color:'#78644a',roughness:1}),candidates.length);
  const pines=candidates.filter(p=>p.h>1.5||stableNoise(p.id+91)>.55),broadleaves=candidates.filter(p=>!pines.includes(p));
  const needles=new THREE.InstancedMesh(new THREE.ConeGeometry(.19,.42,14),new THREE.MeshStandardMaterial({color:'#88a180',roughness:1}),pines.length*4);
  const leaves=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshStandardMaterial({color:'#a9b784',roughness:1}),broadleaves.length*4);
  const helper=new THREE.Object3D();
  candidates.forEach((p,i)=>{const s=.72+stableNoise(p.id+722)*.62;helper.position.set(p.x,p.h+.21*s,p.z);helper.scale.setScalar(s);helper.rotation.set(0,0,0);helper.updateMatrix();trunks.setMatrixAt(i,helper.matrix);});
  pines.forEach((p,i)=>{const s=.72+stableNoise(p.id+722)*.62;for(let k=0;k<4;k++){const taper=1-k*.19;helper.position.set(p.x,p.h+(.32+k*.11)*s,p.z);helper.rotation.set(0,stableNoise(p.id+k)*Math.PI,0);helper.scale.set(s*taper,s*(.82-k*.08),s*taper);helper.updateMatrix();needles.setMatrixAt(i*4+k,helper.matrix);needles.setColorAt(i*4+k,new THREE.Color('#83997a').multiplyScalar(.86+stableNoise(p.id+50)*.26+k*.025));}});
  broadleaves.forEach((p,i)=>{const s=.72+stableNoise(p.id+722)*.62;for(let k=0;k<4;k++){const a=k*2.4+p.id,spread=k===3?0:.11;helper.position.set(p.x+Math.cos(a)*spread*s,p.h+(.47+(k===3?.13:0))*s,p.z+Math.sin(a)*spread*s);helper.rotation.set(0,a,.08*Math.sin(a));helper.scale.set(.17*s,.20*s,.16*s);helper.updateMatrix();leaves.setMatrixAt(i*4+k,helper.matrix);leaves.setColorAt(i*4+k,new THREE.Color('#a6b589').multiplyScalar(.84+stableNoise(p.id+50)*.22+k*.025));}});
  for(const mesh of [trunks,needles,leaves]){mesh.castShadow=true;mesh.receiveShadow=true;this.group.add(mesh);}
 }
 private patchGeometry(){
  const p:number[]=[],indices:number[]=[];for(let j=0;j<=12;j++)for(let i=0;i<=16;i++){const x=GROUND[0]+(i/16-.5)*1.1,z=GROUND[2]+(j/12-.5)*.85;p.push(...onTerrain(x,z,.017));if(j<12&&i<16){const a=j*17+i;indices.push(a,a+17,a+1,a+1,a+17,a+18);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 draw(state:BasinFrame){
  if(this.disposed)return;this.state=state;
  if(state.view!==this.currentView){this.currentView=state.view;this.zoom=1;}
  const camera=state.camera??cameraFrames[state.view];this.target.copy(vector(camera.target));this.span=camera.span;this.pitch=camera.pitch;
  this.patch.material.color.set(state.settings.surface==='paved'?'#8c9695':state.settings.surface==='clay'?'#af9079':'#bcaf8c');
  const summary=watershedState(state.progress,state.settings,state.iceProgress);
  for(const parcel of summary.parcels){const d=parcelPosition(state.progress,parcel.id,state.settings,state.iceProgress);this.matrix.position.copy(vector(d.position));const size=d.pool==='vapor'?.032:d.pool==='ice'?.044:.04;this.matrix.scale.setScalar(size);this.matrix.updateMatrix();this.droplets.setMatrixAt(d.id,this.matrix.matrix);this.droplets.setColorAt(d.id,new THREE.Color(POOL_COLOR[d.pool]));}
  this.droplets.instanceMatrix.needsUpdate=true;if(this.droplets.instanceColor)this.droplets.instanceColor.needsUpdate=true;
  for(let id=0;id<16;id++){
   const grain=riverGrain(Math.max(0,(state.progress-.65)/.35),id,0),q=.24+id*.004+.22*grain.fraction,p=riverCourse(q),a=riverCourse(q-.004),b=riverCourse(q+.004),dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz),offset=(.14-.27*grain.fraction);
   const x=p[0]-dz/len*offset,z=p[2]+dx/len*offset;this.matrix.position.set(x,Math.max(p[1]+.024,terrainHeight(x,z)+.025),z);this.matrix.scale.setScalar(1);this.matrix.updateMatrix();this.sediment.setMatrixAt(id,this.matrix.matrix);
  }
  this.sediment.instanceMatrix.needsUpdate=true;
  const selected=parcelPosition(state.progress,state.tracer,state.settings,state.iceProgress);this.ring.position.copy(vector(selected.position));this.ring.visible=selected.pool!=='soil';
  const points=Array.from({length:181},(_,i)=>vector(parcelPosition(state.progress*i/180,state.tracer,state.settings,state.iceProgress).position));
  this.trace.geometry.setFromPoints(points);this.trace.computeLineDistances();
  this.cloud.material.uniforms.fullness.value=.48+.52*Math.min(1,state.progress/.22);
  this.ripples.position.x=.025*Math.sin(state.progress*Math.PI*10);
  this.render();
 }
 resetCamera(){this.yaw=.2;this.pitchDelta=0;this.zoom=1;this.render();}
 zoomBy(factor:number){this.zoom=Math.max(.7,Math.min(1.5,this.zoom*factor));this.render();}
 projectAnchors():Projection[]{return Object.entries(anchors).map(([id,p])=>{const n=vector(p).project(this.camera);return {id,x:(n.x+1)*50,y:(1-n.y)*50,visible:Math.abs(n.x)<.98&&Math.abs(n.y)<.94&&n.z>-1&&n.z<1};});}
 private render(){
  if(this.disposed||this.failed||this.lost||!this.renderer||!this.state||document.hidden)return;
  const width=this.canvas.clientWidth,height=this.canvas.clientHeight;if(width<1||height<1)return;
  const ratio=width/height,vertical=Math.max(this.span/Math.max(.35,ratio),this.span*.56)*this.zoom;
  this.camera.left=-vertical*ratio/2;this.camera.right=vertical*ratio/2;this.camera.top=vertical/2;this.camera.bottom=-vertical/2;this.camera.near=.1;this.camera.far=90;
  const pitch=this.pitch+this.pitchDelta,distance=(this.state.camera??cameraFrames[this.currentView]).distance;
  this.camera.position.set(this.target.x+Math.sin(this.yaw)*distance*Math.cos(pitch),this.target.y+Math.sin(pitch)*distance,this.target.z+Math.cos(this.yaw)*distance*Math.cos(pitch));this.camera.lookAt(this.target);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  const direction=this.camera.getWorldDirection(new THREE.Vector3()).divide(this.cloud.scale).normalize();this.cloud.material.uniforms.rayDirection.value.copy(direction);this.ring.quaternion.copy(this.camera.quaternion);
  const max=1.5;this.renderer.setPixelRatio(Math.min(max,devicePixelRatio||1,1920/width,1200/height));this.renderer.setSize(width,height,false);
  try{this.renderer.render(this.world,this.camera);this.renderCount++;this.canvas.dataset.renders=String(this.renderCount);this.canvas.dataset.view=this.currentView;
   for(const [i,projected] of this.projectAnchors().entries()){const node=this.labels[i];node.hidden=!this.state.labels||!projected.visible;node.style.left=`${projected.x}%`;node.style.top=`${projected.y}%`;}
  }catch{this.failed=true;this.onFailure(true);}
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.abort.abort();this.observer.disconnect();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();this.world.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.renderer?.dispose();this.renderer?.forceContextLoss();this.renderer=undefined;this.labels.forEach(n=>n.remove());}
}
