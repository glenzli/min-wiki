import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Settings } from './model.ts';

export type TankGeometry={water:number;bottom:number;width:number;height:number;cup:number};
type Frame={state:Settings;geometry:TankGeometry;form:number;flooded:boolean;displaced:number;ripple:number};
const noise=(x:number,y:number)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
const unit=.01,floor=.08;

/** Nonmetric material maps, generated once. No downloaded photographs or clock. */
function materialTexture(kind:'wood'|'end'|'clay'|'stone'){
 const size=kind==='wood'||kind==='end'?512:256;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const c=canvas.getContext('2d')!,pixels=c.createImageData(size,size),d=pixels.data;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,n=noise(x,y),i=(y*size+x)*4;
  let shade:number,base:number[];
  if(kind==='wood'){
   const bend=.012*Math.sin(u*5)+.008*Math.sin(u*13)+.018*Math.exp(-(((u-.67)/.22)**2))*Math.sin(v*9);
   const grain=Math.sin((v+bend)*197+1.4*Math.sin(u*3));
   shade=grain*4+Math.sin((v+bend)*613)*1.6+(n-.5)*5+Math.sin(v*13+u*3)*5;
   if(n>.986)shade-=9;
   base=[126,94,61];
  }else if(kind==='end'){
   const r=Math.hypot((u+.4)*.75,v-.5)+.012*Math.sin(v*19)+.009*Math.sin(u*17);
   shade=Math.sin(r*155)*6+(n-.5)*9;base=[110,83,53];
  }else{
   shade=(n-.5)*(kind==='clay'?8:28)+Math.sin(u*19+v*11)*1.5;
   base=kind==='clay'?[190,139,111]:[143,150,141];
  }
  for(let k=0;k<3;k++)d[i+k]=base[k]+shade;
  d[i+3]=255;
 }
 c.putImageData(pixels,0,0);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;
 return texture;
}

/** Owns the fixed-camera lab's GPU objects, materials, projection and disposal.
 * Settled mass/displacement/forces and finite transition time remain in scene.ts. */
export class TankScene {
 readonly canvas:HTMLCanvasElement;
 private readonly world=new THREE.Scene();
 private readonly camera=new THREE.OrthographicCamera(-4.7,4.7,4.7*540/850,-4.7*540/850,.1,70);
 private readonly geometries=new Set<THREE.BufferGeometry>();
 private readonly materials=new Set<THREE.Material>();
 private readonly textures=new Set<THREE.Texture>();
 private readonly observer:ResizeObserver;
 private readonly environment:THREE.WebGLRenderTarget;
 private readonly wood:THREE.Mesh;
 private readonly stone:THREE.Mesh;
 private readonly immersion:THREE.Mesh;
 private readonly steel:THREE.Mesh;
 private readonly clay:THREE.Mesh;
 private readonly hull:THREE.Mesh<THREE.BufferGeometry>;
 private readonly hullRim:THREE.Mesh;
 private readonly contact:THREE.LineLoop;
 private readonly ripple:THREE.LineLoop;
 private readonly waterSides:THREE.Mesh;
 private readonly waterTop:THREE.Mesh<THREE.ShapeGeometry>;
 private readonly cupWater:THREE.Mesh;
 private readonly cupSurface:THREE.Mesh;
 private readonly cupMeniscus:THREE.Mesh;
 private readonly cargo:THREE.Mesh[]=[];
 private readonly support=new THREE.Group();
 private readonly cord:THREE.Mesh;
 private readonly eye:THREE.Mesh;
 private readonly profile=new THREE.CatmullRomCurve3([],false,'centripetal');
 private holeKey='';
 private disposed=false;
 private lost=false;
 get available(){return !this.disposed&&!this.lost;}
 static create(svg:SVGSVGElement,onUnavailable:()=>void){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  try{return new TankScene(renderer,svg,onUnavailable);}catch(error){renderer.dispose();renderer.forceContextLoss();throw error;}
 }
 private geometry<T extends THREE.BufferGeometry>(geometry:T):T{this.geometries.add(geometry);return geometry;}
 private material<T extends THREE.Material>(material:T):T{this.materials.add(material);return material;}
 private mesh(geometry:THREE.BufferGeometry,material:THREE.Material|THREE.Material[],parent:THREE.Object3D=this.world){
  const mesh=new THREE.Mesh(geometry,material);parent.add(mesh);return mesh;
 }
 private constructor(private readonly renderer:THREE.WebGLRenderer,svg:SVGSVGElement,onUnavailable:()=>void){
  this.canvas=renderer.domElement;this.canvas.setAttribute('aria-hidden','true');
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  this.world.background=new THREE.Color('#edf1f1');this.world.fog=new THREE.Fog('#edf1f1',17,35);
  this.camera.position.set(4.2,10.8,11);this.camera.lookAt(.25,1.85,0);this.camera.updateMatrixWorld();
  const environmentScene=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  this.environment=pmrem.fromScene(environmentScene,.03);this.world.environment=this.environment.texture;this.world.environmentIntensity=.35;
  environmentScene.dispose();pmrem.dispose();
  this.world.add(new THREE.HemisphereLight('#f4f9ff','#a9a99d',.7));
  const key=new THREE.DirectionalLight('#fff9ef',2);key.position.set(-3.5,8,5);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;
  key.shadow.camera.top=5;key.shadow.camera.bottom=-4;key.shadow.normalBias=.025;key.shadow.bias=-.0002;
  key.shadow.radius=4;key.shadow.intensity=.36;this.world.add(key);
  const fill=new THREE.DirectionalLight('#d5e9ff',.4);fill.position.set(5,4,-3);this.world.add(fill);
  const standard=(options:THREE.MeshStandardMaterialParameters)=>this.material(new THREE.MeshStandardMaterial(options));
  const physical=(options:THREE.MeshPhysicalMaterialParameters)=>this.material(new THREE.MeshPhysicalMaterial(options));
  const box=this.geometry(new THREE.BoxGeometry(1,1,1));
  const rounded=this.geometry(new RoundedBoxGeometry(1,1,1,3,.025));
  const table=this.mesh(this.geometry(new THREE.PlaneGeometry(120,120)),standard({color:'#ecf0ef',roughness:.9}));
  table.rotation.x=-Math.PI/2;table.position.y=-.025;table.receiveShadow=true;
  const glass=physical({color:'#a8c4d1',metalness:0,roughness:.1,transparent:true,opacity:.045,depthWrite:false,side:THREE.FrontSide,envMapIntensity:.45,specularIntensity:.5});
  const glassBase=physical({color:'#b9cdd4',roughness:.12,transparent:true,opacity:.35,depthWrite:false,envMapIntensity:.8});
  const edge=this.material(new THREE.MeshBasicMaterial({color:'#7794a3',transparent:true,opacity:.46}));
  const panel=(x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material=glass)=>{const m=this.mesh(box,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.renderOrder=5;return m;};
  panel(-.19,.04,0,5.4,.08,2.12,glassBase);
  panel(-2.87,1.84,0,.045,3.6,2.1);panel(2.49,1.84,0,.045,3.6,2.1);
  panel(-.19,1.84,-1.04,5.4,3.6,.04);panel(-.19,1.84,1.04,5.4,3.6,.04);
  for(const x of [-2.87,2.49])for(const z of [-1.04,1.04])panel(x,1.84,z,.019,3.62,.019,edge);
  for(const z of [-1.04,1.04]){panel(-.19,3.65,z,5.4,.022,.028,edge);panel(-.19,.09,z,5.4,.018,.022,edge);}
  for(const x of [-2.87,2.49])panel(x,3.65,0,.025,.023,2.1,edge);
  const glint=this.material(new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.5,depthWrite:false}));
  const seal=standard({color:'#8e9da0',roughness:.6,transparent:true,opacity:.22,depthWrite:false});
  for(const z of [-1.04,1.04]){
   panel(-.19,.025,z,5.43,.035,.055,seal);
   panel(-.19,3.667,z,5.4,.009,.013,glint);
  }
  for(const x of [-2.886,2.474])panel(x,1.84,1.063,.008,3.57,.008,glint);
  // Small glass feet and the thicker base give the transparent vessel a contact plane.
  for(const x of [-2.58,2.19])for(const z of [-.81,.81]){
   const foot=this.mesh(rounded,glassBase);foot.position.set(x,.006,z);foot.scale.set(.22,.06,.19);
  }
  const datum=this.geometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.83,2.03,-1.012),new THREE.Vector3(2.45,2.03,-1.012)]));
  const datumLine=new THREE.Line(datum,this.material(new THREE.LineDashedMaterial({color:'#6b8d9d',dashSize:.055,gapSize:.055,transparent:true,opacity:.6})));
  datumLine.computeLineDistances();this.world.add(datumLine);
  const waterSide=standard({color:'#3184a0',roughness:.35,transparent:true,opacity:.15,depthWrite:false,envMapIntensity:.15,side:THREE.FrontSide});
  const noSurface=this.material(new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
  this.waterSides=this.mesh(box,[waterSide,waterSide,noSurface,waterSide,waterSide,waterSide]);this.waterSides.position.x=-.19;this.waterSides.renderOrder=3;
  const waterTop=physical({color:'#6aa9ba',roughness:.3,metalness:.03,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:.3,specularIntensity:.45});
  this.waterTop=new THREE.Mesh(new THREE.ShapeGeometry(),waterTop);this.waterTop.rotation.x=-Math.PI/2;this.waterTop.renderOrder=4;this.world.add(this.waterTop);
  const contactGeometry=this.geometry(new THREE.BufferGeometry());contactGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(128*3),3));
  this.contact=new THREE.LineLoop(contactGeometry,this.material(new THREE.LineBasicMaterial({color:'#527d88',transparent:true,opacity:.54,depthWrite:false})));this.contact.renderOrder=8;this.world.add(this.contact);
  this.ripple=new THREE.LineLoop(this.geometry(contactGeometry.clone()),this.material(new THREE.LineBasicMaterial({color:'#86b5c2',transparent:true,opacity:0,depthWrite:false})));this.ripple.renderOrder=8;this.world.add(this.ripple);
  const waterEdge=new THREE.LineLoop(this.geometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.83,0,-1.01),new THREE.Vector3(2.45,0,-1.01),new THREE.Vector3(2.45,0,1.01),new THREE.Vector3(-2.83,0,1.01)])),this.material(new THREE.LineBasicMaterial({color:'#759da8',transparent:true,opacity:.5,depthWrite:false})));
  this.waterTop.add(waterEdge);waterEdge.rotation.x=Math.PI/2;
  const woodMap=materialTexture('wood'),endMap=materialTexture('end'),clayMap=materialTexture('clay'),stoneMap=materialTexture('stone');
  for(const texture of [woodMap,endMap,clayMap,stoneMap])this.textures.add(texture);
  const woodMaterial=standard({map:woodMap,bumpMap:woodMap,bumpScale:.0035,roughness:.62,envMapIntensity:.4});
  const endMaterial=standard({map:endMap,bumpMap:endMap,bumpScale:.003,roughness:.72,envMapIntensity:.35});
  this.wood=this.mesh(rounded,[endMaterial,endMaterial,woodMaterial,woodMaterial,woodMaterial,woodMaterial]);
  const rockSource=new THREE.IcosahedronGeometry(.5,3);rockSource.deleteAttribute('normal');
  const rock=this.geometry(mergeVertices(rockSource));rockSource.dispose();const rp=rock.getAttribute('position');
  for(let i=0;i<rp.count;i++){const v=new THREE.Vector3().fromBufferAttribute(rp,i);v.multiplyScalar(.94+.08*noise(v.x*31+v.z*17,v.y*27));rp.setXYZ(i,v.x,v.y,v.z);}rock.computeVertexNormals();rock.computeBoundingBox();
  const rockCenter=rock.boundingBox!.getCenter(new THREE.Vector3()),rockSize=rock.boundingBox!.getSize(new THREE.Vector3());rock.translate(-rockCenter.x,-rockCenter.y,-rockCenter.z);rock.scale(1/rockSize.x,1/rockSize.y,1/rockSize.z);
  const stoneMaterial=standard({map:stoneMap,bumpMap:stoneMap,bumpScale:.007,roughness:.87});
  this.stone=this.mesh(rock,stoneMaterial);this.immersion=this.mesh(rounded,stoneMaterial);
  const metal=standard({color:'#aabcc6',metalness:.88,roughness:.24,envMapIntensity:1.1});
  this.steel=this.mesh(rounded,metal);
  const clayMaterial=standard({map:clayMap,bumpMap:clayMap,bumpScale:.0015,roughness:.5,envMapIntensity:.45});
  this.clay=this.mesh(this.geometry(new THREE.SphereGeometry(.5,48,32)),clayMaterial);
  const hullGeometry=this.geometry(new THREE.BufferGeometry()),rows=64,columns=72,positions=new Float32Array((rows+1)*(columns+1)*3),uv=new Float32Array((rows+1)*(columns+1)*2),indices:number[]=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){const n=j*(columns+1)+i;uv[n*2]=i/columns*3;uv[n*2+1]=j/rows*2;if(j<rows&&i<columns){const a=n,b=n+columns+1;indices.push(a,a+1,b,b,a+1,b+1);}}
  hullGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));hullGeometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));hullGeometry.setIndex(indices);
  this.hull=new THREE.Mesh(hullGeometry,clayMaterial);this.world.add(this.hull);
  this.hullRim=this.mesh(this.geometry(new THREE.TorusGeometry(1,.016,10,96)),clayMaterial);this.hullRim.rotation.x=Math.PI/2;this.hullRim.castShadow=true;
  for(const object of [this.wood,this.stone,this.immersion,this.steel,this.clay,this.hull]){object.visible=false;object.castShadow=true;object.receiveShadow=true;}
  const cargoMaterial=standard({color:'#9d9b8e',roughness:.46,metalness:.26});
  const stampCanvas=document.createElement('canvas');stampCanvas.width=256;stampCanvas.height=128;
  const stampContext=stampCanvas.getContext('2d')!;stampContext.fillStyle='#263c44';stampContext.font='500 46px sans-serif';stampContext.textAlign='center';stampContext.textBaseline='middle';stampContext.fillText('100 g',128,64);
  const stamp=new THREE.CanvasTexture(stampCanvas);stamp.colorSpace=THREE.SRGBColorSpace;this.textures.add(stamp);
  const stampGeometry=this.geometry(new THREE.PlaneGeometry(.86,.43)),stampMaterial=this.material(new THREE.MeshBasicMaterial({map:stamp,transparent:true,depthWrite:false}));
  for(let i=0;i<12;i++){
   const cargo=this.mesh(rounded,cargoMaterial);cargo.scale.set(.27,.27,.18);cargo.visible=false;cargo.castShadow=cargo.receiveShadow=true;this.cargo.push(cargo);
   const marking=this.mesh(stampGeometry,stampMaterial,cargo);marking.rotation.x=-Math.PI/2;marking.position.y=.502;
  }
  const cupProfile=[[0,0],[.5,0],[.57,.04],[.57,2.45],[.53,2.45],[.53,.12],[0,.12]].map(([x,y])=>new THREE.Vector2(x,y));
  const cup=this.mesh(this.geometry(new THREE.LatheGeometry(cupProfile,96)),physical({color:'#b9d0db',roughness:.08,transparent:true,opacity:.14,depthWrite:false,side:THREE.FrontSide,envMapIntensity:.6,specularIntensity:.5}));
  cup.position.set(3.6,.025,0);cup.renderOrder=6;
  const rimGeometry=this.geometry(new THREE.TorusGeometry(.55,.012,8,96));
  for(const y of [.08,2.475]){const rim=this.mesh(rimGeometry,this.material(new THREE.MeshBasicMaterial({color:'#8da8b5',transparent:true,opacity:.55})));rim.rotation.x=Math.PI/2;rim.position.set(3.6,y,0);rim.renderOrder=7;}
  const cupBottom=this.mesh(this.geometry(new THREE.CylinderGeometry(.53,.53,.065,96)),glassBase);cupBottom.position.set(3.6,.075,0);cupBottom.renderOrder=6;
  const cupHighlight=this.mesh(this.geometry(new THREE.CylinderGeometry(.575,.575,2.33,16,1,true,-.57,.024)),glint);cupHighlight.position.set(3.6,1.31,0);cupHighlight.renderOrder=7;
  const cupHighlightFine=this.mesh(this.geometry(new THREE.CylinderGeometry(.575,.575,2.17,12,1,true,1.25,.012)),glint);cupHighlightFine.position.set(3.6,1.29,0);cupHighlightFine.renderOrder=7;
  this.cupWater=this.mesh(this.geometry(new THREE.CylinderGeometry(.515,.515,1,72,1,true)),physical({color:'#76adbd',roughness:.2,transparent:true,opacity:.31,depthWrite:false,envMapIntensity:.6}));this.cupWater.renderOrder=3;
  this.cupSurface=this.mesh(this.geometry(new THREE.CircleGeometry(.515,72)),waterTop);this.cupSurface.rotation.x=-Math.PI/2;this.cupSurface.renderOrder=4;
  this.cupMeniscus=this.mesh(this.geometry(new THREE.TorusGeometry(.512,.005,6,72)),this.material(new THREE.MeshBasicMaterial({color:'#6c99a8',transparent:true,opacity:.6,depthWrite:false})));this.cupMeniscus.rotation.x=Math.PI/2;this.cupMeniscus.renderOrder=7;
  // The collection scale uses one linear diagram mapping (900 mL / world unit).
  const scaleCanvas=document.createElement('canvas');scaleCanvas.width=256;scaleCanvas.height=1024;const scaleContext=scaleCanvas.getContext('2d')!;
  scaleContext.strokeStyle=scaleContext.fillStyle='#46606c';scaleContext.lineWidth=2;scaleContext.font='28px sans-serif';scaleContext.textBaseline='middle';
  for(let volume=0;volume<=2000;volume+=100){const y=1024-volume/2000*1024,long=volume%500===0;scaleContext.beginPath();scaleContext.moveTo(24,y);scaleContext.lineTo(long?108:70,y);scaleContext.stroke();scaleContext.textBaseline=volume===2000?'top':volume===0?'bottom':'middle';if(long)scaleContext.fillText(String(volume),123,y);}
  const scaleMap=new THREE.CanvasTexture(scaleCanvas);scaleMap.colorSpace=THREE.SRGBColorSpace;this.textures.add(scaleMap);
  const graduations=this.mesh(this.geometry(new THREE.CylinderGeometry(.579,.579,2000/900,48,1,true,.08,1.02)),this.material(new THREE.MeshBasicMaterial({map:scaleMap,transparent:true,depthWrite:false,side:THREE.DoubleSide})));
  graduations.position.set(3.6,.12+1000/900,0);graduations.renderOrder=8;
  this.world.add(this.support);
  const cylinder=this.geometry(new THREE.CylinderGeometry(1,1,1,16));
  const rod=(x:number,y:number,z:number,rx:number,ry:number,rz:number)=>{const m=this.mesh(cylinder,metal,this.support);m.position.set(x,y,z);m.scale.set(rx,ry,rz);return m;};
  const standBase=this.mesh(rounded,metal,this.support);standBase.position.set(-3.16,.06,-.85);standBase.scale.set(.52,.1,.62);
  rod(-3.16,1.99,-.85,.022,3.88,.022);rod(-1.58,3.93,-.85,.023,3.16,.023).rotation.z=Math.PI/2;rod(0,3.93,-.425,.023,.85,.023).rotation.x=Math.PI/2;
  this.cord=this.mesh(cylinder,standard({color:'#72716a',roughness:.95}),this.support);
  this.eye=this.mesh(this.geometry(new THREE.TorusGeometry(.035,.009,8,24)),metal,this.support);
  const holder=document.createElement('div');holder.className='buoyancy-stage';svg.before(holder);holder.append(this.canvas,svg);
  this.canvas.addEventListener('webglcontextlost',event=>{if(this.disposed)return;event.preventDefault();this.lost=true;this.canvas.hidden=true;onUnavailable();});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(holder);this.resize();
 }
 private resize(){
  if(!this.available)return;
  const rect=this.canvas.parentElement!.getBoundingClientRect();
  if(rect.width<1||rect.height<1)return;
  this.renderer.setSize(rect.width,rect.height,false);this.render();
 }
 project(x:number,y:number,z=0):[number,number]{
  const point=new THREE.Vector3((x-365)*unit,floor+(440-y)*unit,z).project(this.camera);
  return [(point.x+1)*425,(1-point.y)*270];
 }
 private setWaterHole(rx:number,rz:number){
  const key=`${rx.toFixed(3)}:${rz.toFixed(3)}`;if(key===this.holeKey)return;this.holeKey=key;
  const surface=new THREE.Shape();surface.moveTo(-2.83,-1.01);surface.lineTo(2.45,-1.01);surface.lineTo(2.45,1.01);surface.lineTo(-2.83,1.01);surface.closePath();
  if(rx>0&&rz>0){const hole=new THREE.Path();hole.absellipse(0,0,rx,rz,0,Math.PI*2,true);surface.holes.push(hole);}
  this.waterTop.geometry.dispose();this.waterTop.geometry=new THREE.ShapeGeometry(surface,64);
 }
 draw(frame:Frame){
  if(!this.available)return;
  const {state:s,geometry:g,form,flooded,displaced}=frame,w=g.width*unit,h=g.height*unit,bottom=floor+(440-g.bottom)*unit,water=floor+(440-g.water)*unit;
  const boat=s.experiment==='boat',held=s.experiment==='depth',kind=held?'stone':s.object;
  this.wood.visible=!boat&&!held&&kind==='wood';this.stone.visible=!boat&&!held&&kind==='stone';this.immersion.visible=held;this.steel.visible=!boat&&!held&&kind==='steel';this.clay.visible=!boat&&kind==='clay';this.hull.visible=boat;
  for(const object of [this.wood,this.stone,this.immersion,this.steel,this.clay]){object.position.set(0,bottom+h/2,0);object.scale.set(w,h,kind==='wood'?.72:held?.95:w*.8);}
  const depth=(1-form)*w+form*.95,thickness=(20*260/g.width)*unit;
  let intersectionRadius=0;
  if(boat){
   const inside=Math.max(.25,.784-1.4*thickness/w);
   this.profile.points=[[0,thickness],[inside*.7,thickness],[inside,thickness],[Math.max(.5,1-1.5*thickness/w),h-.025],[1,h-.018],[.99,h-.06],[.784,.12],[.616,0],[.1,0],[0,0]].map(([r,y])=>new THREE.Vector3(r,y,0));
   const p=this.hull.geometry.getAttribute('position') as THREE.BufferAttribute;
   let previousRadius=0,previousHeight=0;
   for(let j=0;j<=64;j++){
    const u=j/64,v=this.profile.getPoint(u),radius=(1-form)*Math.sin(Math.PI*u)+form*Math.max(0,Math.min(1,v.x)),height=(1-form)*h*(1+Math.cos(Math.PI*u))/2+form*Math.max(0,Math.min(h,v.y));
    if(j>0&&Math.min(previousHeight,height)<=water-bottom&&Math.max(previousHeight,height)>=water-bottom&&Math.abs(height-previousHeight)>.00001){const t=(water-bottom-previousHeight)/(height-previousHeight);intersectionRadius=Math.max(intersectionRadius,previousRadius+(radius-previousRadius)*t);}
    previousRadius=radius;previousHeight=height;
    for(let i=0;i<=72;i++){const angle=i/72*Math.PI*2;p.setXYZ(j*73+i,radius*w/2*Math.cos(angle),bottom+height,radius*depth/2*Math.sin(angle));}
   }
   p.needsUpdate=true;this.hull.geometry.computeVertexNormals();this.hull.geometry.computeBoundingSphere();
  }
  this.hullRim.visible=boat&&form>.97;
  this.hullRim.position.set(0,bottom+h-.018,0);this.hullRim.scale.set(w/2,depth/2,1);
  this.cargo.forEach((object,i)=>{object.visible=boat&&form>.999&&i<s.cargo;if(object.visible){const layer=Math.floor(i/2)%3,row=Math.floor(i/6);object.position.set((i%2-.5)*.29,bottom+thickness+.135+layer*.275,(row-.5)*.20);}});
  this.waterSides.scale.set(5.28,water-floor,2.02);this.waterSides.position.y=(water+floor)/2;
  this.waterTop.position.y=water;
  const dryOpening=boat&&form>.999&&!flooded&&bottom<water&&bottom+h>water;
  this.setWaterHole(dryOpening?w/2*intersectionRadius:0,dryOpening?depth/2*intersectionRadius:0);
  this.contact.visible=bottom<water&&bottom+h>water;
  this.ripple.visible=this.contact.visible&&frame.ripple>0;
  if(this.contact.visible){
   const ellipsoid=boat||kind==='clay'||kind==='stone'&&!held,level=(water-bottom)/h;
   const radius=boat?intersectionRadius:ellipsoid?Math.sqrt(Math.max(0,1-(2*level-1)**2)):1;
   const rx=w/2*radius,rz=(boat?depth:kind==='wood'?.72:held?.95:w*.8)/2*radius;
   const contactPoints=this.contact.geometry.getAttribute('position') as THREE.BufferAttribute,ripplePoints=this.ripple.geometry.getAttribute('position') as THREE.BufferAttribute;
   for(let i=0;i<128;i++){
    const angle=i/128*Math.PI*2,c=Math.cos(angle),sine=Math.sin(angle),x=ellipsoid?c:Math.sign(c)*Math.abs(c)**.15,z=ellipsoid?sine:Math.sign(sine)*Math.abs(sine)**.15;
    contactPoints.setXYZ(i,x*(rx+.006),water+.007,z*(rz+.006));
    const spread=.025+.16*(1-frame.ripple);ripplePoints.setXYZ(i,x*(rx+spread),water+.004,z*(rz+spread));
   }
   contactPoints.needsUpdate=ripplePoints.needsUpdate=true;this.contact.geometry.computeBoundingSphere();this.ripple.geometry.computeBoundingSphere();
   (this.ripple.material as THREE.LineBasicMaterial).opacity=frame.ripple*.4;
  }
  const cupHeight=Math.max(0,(438-g.cup)*unit);this.cupWater.visible=this.cupSurface.visible=displaced>0;
  this.cupWater.scale.set(1,Math.max(.001,cupHeight),1);this.cupWater.position.set(3.6,.12+cupHeight/2,0);this.cupSurface.position.set(3.6,.12+cupHeight,0);
  this.cupMeniscus.visible=displaced>0;this.cupMeniscus.position.set(3.6,.123+cupHeight,0);
  this.support.visible=held;
  const top=bottom+h,length=Math.max(.015,3.93-top);
  this.cord.scale.set(.007,length,.007);this.cord.position.set(0,top+length/2,0);this.eye.position.set(0,top+.025,0);
  this.render();
 }
 private render(){if(this.available)this.renderer.render(this.world,this.camera);}
 dispose(){
  if(this.disposed)return;this.disposed=true;this.observer.disconnect();
  this.waterTop.geometry.dispose();for(const geometry of this.geometries)geometry.dispose();for(const material of this.materials)material.dispose();
  for(const texture of this.textures){const image=texture.image as HTMLCanvasElement;texture.dispose();if(image instanceof HTMLCanvasElement)image.width=image.height=0;}
  this.environment.dispose();this.world.clear();this.renderer.dispose();this.renderer.forceContextLoss();this.canvas.remove();
 }
}
