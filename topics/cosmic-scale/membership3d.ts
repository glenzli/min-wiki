import * as THREE from 'three';
import {GalaxyVolume} from './galaxy.ts';
import {CosmicWebVolume,type CosmicWebKind} from './cosmicWeb3d.ts';
import {createSolarPhotosphereMaterial,createSolarHalo,setSolarPhotospherePhase} from './solarPhotosphere3d.ts';
import {SOLAR_SURFACE_STYLE,solarSurfacePhase} from './solarSurfaceModel.ts';
import content from './comparisonContent.json';
import cosmicContent from './content.json';
import {membershipView,membershipPreset,turnMembershipView,membershipSolar,membershipSunRadius,membershipSolarAnchor,membershipGroup,membershipCloud,membershipFrame,placeMembershipLabels,MEMBERSHIP_CACHE_LIMIT,type MembershipPoint,type MembershipPreset} from './membershipModel.ts';
import mercuryMap from '../solar-system/assets/2k_mercury.webp';
import venusMap from '../solar-system/assets/2k_venus_atmosphere.webp';
import earthMap from '../solar-system/assets/2k_earth_daymap.webp';
import marsMap from '../solar-system/assets/2k_mars.webp';
import jupiterMap from '../solar-system/assets/2k_jupiter.webp';
import saturnMap from '../solar-system/assets/2k_saturn.webp';
import uranusMap from '../solar-system/assets/2k_uranus.webp';
import neptuneMap from '../solar-system/assets/2k_neptune.webp';

type Words=typeof content.zh;
type Label={id:string;text:string;owner:THREE.Object3D;point:MembershipPoint;priority:number;gold?:boolean};
type Entry={root:THREE.Group;labels:Label[];galaxies:{volume:GalaxyVolume;radius:number}[];web?:CosmicWebVolume;geometries:THREE.BufferGeometry[];materials:THREE.Material[];boundary?:THREE.Group};
const MAPS=[mercuryMap,venusMap,earthMap,marsMap,jupiterMap,saturnMap,uranusMap,neptuneMap];

/** One lazy, demand-rendered context for the non-metric structural-address chapter. */
export class Membership3D {
 private world=new THREE.Scene();private camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,80);
 private layer=document.createElement('div');private canvas=document.createElement('canvas');private overlay=document.createElement('canvas');private context:CanvasRenderingContext2D;
 private renderer?:THREE.WebGLRenderer;private observer:ResizeObserver;private sphere=new THREE.SphereGeometry(1,40,28);private textures=new Map<number,THREE.Texture>();
 private entries=new Map<number,Entry>();private views=Array.from({length:7},membershipView);private home=0;private active=false;private lost=false;private disposed=false;private frame=0;private drag?:{id:number;x:number;y:number};
 private solarPhase=0;
 constructor(private host:HTMLElement,private words:Words,private language:string,private failure:(failed:boolean)=>void){
  this.layer.className='membership-layer';this.layer.hidden=true;this.layer.setAttribute('aria-hidden','true');this.canvas.className='membership-gpu';this.overlay.className='membership-labels';this.layer.append(this.canvas,this.overlay);host.append(this.layer);this.context=this.overlay.getContext('2d')!;
  this.camera.position.z=8;const light=new THREE.DirectionalLight('#fff0dc',2.1);light.position.set(-3,2,5);this.world.add(light,new THREE.AmbientLight('#8ba3bd',.6));
  this.prepareRenderer();this.observer=new ResizeObserver(()=>this.requestDraw());this.observer.observe(host);
  host.addEventListener('pointerdown',this.pointerDown);host.addEventListener('pointermove',this.pointerMove);host.addEventListener('pointerup',this.pointerEnd);host.addEventListener('pointercancel',this.pointerEnd);host.addEventListener('lostpointercapture',this.pointerEnd);host.addEventListener('keydown',this.keyDown);
 }
 get ready(){return !!this.renderer&&!this.lost&&!this.disposed;}
 private prepareRenderer(){
  this.canvas.addEventListener('webglcontextlost',this.contextLost);this.canvas.addEventListener('webglcontextrestored',this.contextRestored);
  try{this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'low-power'});this.renderer.setClearColor('#030812');this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.lost=false;this.failure(false);}
  catch{this.renderer=undefined;this.lost=true;this.layer.hidden=true;this.failure(true);}
 }
 private contextLost=(event:Event)=>{event.preventDefault();this.lost=true;this.layer.hidden=true;this.cancel();this.failure(true);};
 private contextRestored=()=>{if(this.disposed)return;this.lost=false;this.failure(false);this.requestDraw();};
 private cancel(){cancelAnimationFrame(this.frame);this.frame=0;}
 private requestDraw(){if(this.frame||!this.active||!this.ready||document.hidden)return;this.frame=requestAnimationFrame(()=>{this.frame=0;this.draw();});}
 private releaseDrag(){if(this.drag&&this.host.hasPointerCapture(this.drag.id))this.host.releasePointerCapture(this.drag.id);this.drag=undefined;}
 setActive(active:boolean){this.active=active;if(!active){this.cancel();this.releaseDrag();this.layer.hidden=true;return;}this.requestDraw();}
 show(home:number){const changed=this.home!==home;if(changed)this.releaseDrag();this.home=home;if(changed||!this.entries.has(home))this.requestDraw();}
 reset(){this.views[this.home]=membershipView();this.requestDraw();}
 setView(preset:MembershipPreset){this.releaseDrag();this.views[this.home]=membershipPreset(preset);this.requestDraw();}
 setSolarPhase(value:number){const phase=solarSurfacePhase(value);if(phase===this.solarPhase)return;this.solarPhase=phase;for(const entry of this.entries.values())for(const material of entry.materials)if(material instanceof THREE.ShaderMaterial&&material.userData.illustrativePhotosphere)setSolarPhotospherePhase(material,phase);this.requestDraw();}
 private pointerDown=(event:PointerEvent)=>{if(!this.active||!this.ready||event.button!==0||(event.target as HTMLElement)?.closest?.('button'))return;event.preventDefault();this.drag={id:event.pointerId,x:event.clientX,y:event.clientY};this.host.setPointerCapture(event.pointerId);};
 private pointerMove=(event:PointerEvent)=>{if(!this.drag||this.drag.id!==event.pointerId||!this.active)return;this.views[this.home]=turnMembershipView(this.views[this.home]!, (event.clientX-this.drag.x)*.004,(event.clientY-this.drag.y)*.004);this.drag.x=event.clientX;this.drag.y=event.clientY;this.requestDraw();};
 private pointerEnd=(event:PointerEvent)=>{if(this.drag?.id!==event.pointerId)return;this.drag=undefined;if(this.host.hasPointerCapture(event.pointerId))this.host.releasePointerCapture(event.pointerId);};
 private keyDown=(event:KeyboardEvent)=>{const delta:Record<string,[number,number]>={ArrowLeft:[-.05,0],ArrowRight:[.05,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]},step=delta[event.key];if(!step||!this.active||!this.ready||event.target!==this.host)return;event.preventDefault();this.views[this.home]=turnMembershipView(this.views[this.home]!,...step);this.requestDraw();};
 private texture(index:number){
  const cached=this.textures.get(index);if(cached)return cached;
  const texture=new THREE.TextureLoader().load(MAPS[index]!,loaded=>{if(this.disposed)loaded.dispose();else this.requestDraw();});texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,this.renderer?.capabilities.getMaxAnisotropy()??1);this.textures.set(index,texture);return texture;
 }
 private galaxy(entry:Entry,center:MembershipPoint,radius:number,seed:number,inclination=0){const volume=new GalaxyVolume(seed);volume.root.position.set(...center);volume.root.scale.setScalar(radius);volume.root.rotation.x=inclination;entry.root.add(volume.root);entry.galaxies.push({volume,radius});return volume.root;}
 private cloud(entry:Entry,center:MembershipPoint,count:number,seed:number,radius:number,mist=false){
  const samples=membershipCloud(count,seed,radius,mist?.7:1),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(samples.positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(samples.colors,3));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,uniforms:{pointSize:{value:mist?34:2.3},opacity:{value:mist?.018:.7}},vertexShader:'uniform float pointSize;varying vec3 tint;void main(){tint=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=pointSize;}',fragmentShader:'uniform float opacity;varying vec3 tint;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(tint,exp(-r*r*5.)*(1.-smoothstep(.65,1.,r))*opacity);}'});
  const points=new THREE.Points(geometry,material);points.position.set(...center);entry.root.add(points);entry.geometries.push(geometry);entry.materials.push(material);return points;
 }
 private label(entry:Entry,id:string,text:string,owner:THREE.Object3D,point:MembershipPoint=[0,0,0],priority=1,gold=false){entry.labels.push({id,text,owner,point,priority,gold});}
 private makeEntry(home:number){
  const entry:Entry={root:new THREE.Group(),labels:[],galaxies:[],geometries:[],materials:[]},w=this.words;
  if(home===0){
   const sunMaterial=createSolarPhotosphereMaterial(this.solarPhase);entry.materials.push(sunMaterial);
   const sun=new THREE.Mesh(this.sphere,sunMaterial);sun.scale.setScalar(membershipSunRadius);entry.root.add(sun);this.label(entry,'sun',w.names[2]!,sun,[0,0,0],12,true);
   const glow=createSolarHalo();glow.scale.setScalar(membershipSunRadius*SOLAR_SURFACE_STYLE.haloOuter);entry.root.add(glow);entry.geometries.push(glow.geometry);entry.materials.push(glow.material);
   for(const body of membershipSolar){
    const material=new THREE.MeshStandardMaterial({map:this.texture(body.id),color:'#ffffff',roughness:1});entry.materials.push(material);const planet=new THREE.Mesh(this.sphere,material);planet.position.set(...body.center);planet.scale.setScalar(body.radius);planet.rotation.set(.1,body.id*.34,.08);entry.root.add(planet);
    const geometry=new THREE.BufferGeometry().setFromPoints(Array.from({length:129},(_,i)=>new THREE.Vector3(Math.cos(i/128*Math.PI*2)*body.orbit,Math.sin(i/128*Math.PI*2)*body.orbit,0))),orbitMaterial=new THREE.LineBasicMaterial({color:body.id===2?'#87b9ca':'#536f87',transparent:true,opacity:.5,depthWrite:false});entry.geometries.push(geometry);entry.materials.push(orbitMaterial);entry.root.add(new THREE.LineLoop(geometry,orbitMaterial));
    if(body.id===5){const ringGeometry=new THREE.RingGeometry(body.radius*1.35,body.radius*2.1,64),ringMaterial=new THREE.MeshStandardMaterial({color:'#baa987',transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false,roughness:1}),ring=new THREE.Mesh(ringGeometry,ringMaterial);ring.position.copy(planet.position);ring.rotation.x=.28;entry.root.add(ring);entry.geometries.push(ringGeometry);entry.materials.push(ringMaterial);}
    const name=cosmicContent.planets[body.id]!;this.label(entry,`planet-${body.id}`,this.language==='en'?name.en:name.zh,planet,[0,0,0],body.id===2?11:4,body.id===2);
   }
  }else if(home===1){const galaxy=this.galaxy(entry,[0,0,0],1,1);this.label(entry,'solar-location',w.homeNames[0]!,galaxy,membershipSolarAnchor,12,true);}
  else if(home===2){
   for(const [index,object] of membershipGroup().entries()){
    if(object.points){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(object.points,3));const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{pointSize:{value:3.5},opacity:{value:.8}},vertexShader:'uniform float pointSize;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=pointSize;}',fragmentShader:'uniform float opacity;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(.70,.83,1.,exp(-r*r*4.)*(1.-smoothstep(.55,1.,r))*opacity);}'});const dwarfs=new THREE.Points(geometry,material);dwarfs.userData.dwarfMarkers=true;entry.root.add(dwarfs);entry.geometries.push(geometry);entry.materials.push(material);this.label(entry,'dwarfs',w.dwarfGalaxies,dwarfs,[object.points[0]!,object.points[1]!,object.points[2]!],2);}
    else{const galaxy=this.galaxy(entry,object.center,object.scale,[1,5,11][index]!,object.inclination);this.label(entry,object.id,[w.homeNames[1]!,w.andromeda,w.triangulum][index]!,galaxy,[0,0,0],10-index,index===0);}
   }
  }else if(home===3){
   const local=this.cloud(entry,[-.67,0,-.12],18,33,.32);this.galaxy(entry,[-.67,0,-.12],.18,1);this.label(entry,'local',w.homeNames[2]!,local,[0,0,0],12,true);
   const cluster=this.cloud(entry,[.65,0,.15],95,78,.40),gas=this.cloud(entry,[.65,0,.15],650,79,.46,true);this.galaxy(entry,[.54,.10,.12],.12,5,.4);this.galaxy(entry,[.78,-.13,.17],.085,11,.65);this.label(entry,'virgo',w.virgoCluster,cluster,[0,0,0],10);this.label(entry,'gas',w.clusterGas,gas,[.20,.18,.12],2);
  }else{
   const kind:CosmicWebKind=home===4?'near':home===5?'middle':'observable';entry.web=new CosmicWebVolume(kind);entry.root.add(entry.web.root);
   if(home===4||home===5){const center:MembershipPoint=home===4?[-.65,.12,-.12]:[-.47,.08,-.12],local=this.cloud(entry,center,13,41,.055);this.label(entry,'local',w.homeNames[2]!,local,[0,0,0],12,true);
    if(home===4){const virgo=this.cloud(entry,[.32,-.28,.16],28,44,.07);this.label(entry,'virgo',w.virgoCluster,virgo,[0,0,0],8);const geometry=new THREE.BufferGeometry().setFromPoints(Array.from({length:129},(_,i)=>{const a=i/128*Math.PI*2,r=.94+.12*Math.sin(a*3);return new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*.7,.14*Math.sin(a*2));})),material=new THREE.LineDashedMaterial({color:'#aec5a4',transparent:true,opacity:.4,dashSize:.045,gapSize:.035,depthWrite:false}),line=new THREE.LineLoop(geometry,material);line.computeLineDistances();entry.root.add(line);entry.geometries.push(geometry);entry.materials.push(material);}
    else{const point=this.sparseAnchor(entry.web.root);this.label(entry,'void',w.cosmicVoid,entry.web.root,point,3);}
   }else{
    const marker=new THREE.Object3D();entry.root.add(marker);this.label(entry,'observer',w.observer,marker,[0,0,0],12,true);
    const boundary=new THREE.Group(),geometry=new THREE.BufferGeometry().setFromPoints(Array.from({length:161},(_,i)=>new THREE.Vector3(Math.cos(i/160*Math.PI*2)*1.05,Math.sin(i/160*Math.PI*2)*1.05,0))),material=new THREE.LineDashedMaterial({color:'#e9d39a',transparent:true,opacity:.75,dashSize:.025,gapSize:.035,depthWrite:false}),ring=new THREE.LineLoop(geometry,material);ring.computeLineDistances();boundary.add(ring);entry.root.add(boundary);entry.boundary=boundary;entry.geometries.push(geometry);entry.materials.push(material);this.label(entry,'horizon',w.horizon,boundary,[.72,-.76,0],3);
   }
  }
  this.world.add(entry.root);return entry;
 }
 /** Locate a comparatively empty patch in the actual supplied illustrative point volume. */
 private sparseAnchor(root:THREE.Group):MembershipPoint{
  root.updateMatrixWorld(true);const samples:THREE.Vector3[]=[],inverse=root.matrixWorld.clone().invert();root.traverse(object=>{if(!(object instanceof THREE.Points))return;const positions=object.geometry.getAttribute('position');if(!positions)return;const stride=Math.max(1,Math.ceil(positions.count/400));for(let i=0;i<positions.count;i+=stride)samples.push(new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld).applyMatrix4(inverse));});
  let best:MembershipPoint=[.45,-.3,.15],minimum=Infinity;for(const x of [-.6,-.2,.2,.6])for(const y of [-.6,-.2,.2,.6])for(const z of [-.25,.25]){if(Math.hypot(x,y)>.8)continue;const density=samples.reduce((sum,p)=>sum+Math.exp(-((p.x-x)**2+(p.y-y)**2+(p.z-z)**2)/.055),0);if(density<minimum){minimum=density;best=[x,y,z];}}return best;
 }
 private entry(home:number){const cached=this.entries.get(home);if(cached){this.entries.delete(home);this.entries.set(home,cached);return cached;}while(this.entries.size>=MEMBERSHIP_CACHE_LIMIT){const key=this.entries.keys().next().value!;this.release(this.entries.get(key)!);this.entries.delete(key);}const entry=this.makeEntry(home);this.entries.set(home,entry);return entry;}
 private draw(){
  if(!this.active||!this.ready||document.hidden)return;const width=this.host.clientWidth,height=this.host.clientHeight;if(!width||!height)return;
  const dpr=Math.min(2,devicePixelRatio||1),view=this.views[this.home]!,frame=membershipFrame(this.home,width,height,view),entry=this.entry(this.home);
  this.camera.left=-frame.halfX;this.camera.right=frame.halfX;this.camera.top=frame.halfY;this.camera.bottom=-frame.halfY;this.camera.updateProjectionMatrix();
  for(const current of this.entries.values())current.root.visible=current===entry;entry.root.rotation.set(view.pitch,view.yaw,0);if(entry.boundary)entry.boundary.quaternion.copy(entry.root.quaternion).invert();
  // Reference orbits are not luminous objects. Fade their collapsed strokes
  // near edge-on, so overlapping guides do not draw a line through the Sun.
  if(this.home===0){const aperture=Math.abs(Math.cos(view.pitch)*Math.cos(view.yaw)),alpha=.5*THREE.MathUtils.smoothstep(aperture,.015,.12);for(const object of entry.root.children)if(object instanceof THREE.LineLoop&&(object.material instanceof THREE.LineBasicMaterial))object.material.opacity=alpha;}
  for(const galaxy of entry.galaxies)galaxy.volume.update(galaxy.radius*width/(2*frame.halfX),dpr,this.home===2?1.18:1,{disk:true,bulge:true,halo:this.home===1});entry.web?.update(width/(2*frame.halfX),dpr,.9);
  for(const object of entry.root.children)if(object instanceof THREE.Points){const material=object.material;if(material instanceof THREE.ShaderMaterial)material.uniforms.pointSize!.value=(object.userData.dwarfMarkers?3.5:material.uniforms.opacity!.value<.1?34:2.3)*dpr;}
  this.world.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);this.renderer!.setPixelRatio(dpr);this.renderer!.setSize(width,height,false);
  try{this.renderer!.render(this.world,this.camera);}catch{this.lost=true;this.layer.hidden=true;this.failure(true);return;}
  this.layer.hidden=false;if(this.overlay.width!==Math.round(width*dpr)||this.overlay.height!==Math.round(height*dpr)){this.overlay.width=Math.round(width*dpr);this.overlay.height=Math.round(height*dpr);}this.drawLabels(entry,width,height,dpr);
 }
 private drawLabels(entry:Entry,width:number,height:number,dpr:number){
  const c=this.context;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);c.font='13px system-ui';
  const unit=width/(this.camera.right-this.camera.left),labels=entry.labels.map(label=>{const p=new THREE.Vector3(...label.point).applyMatrix4(label.owner.matrixWorld).project(this.camera),x=(p.x+1)*width/2,y=(1-p.y)*height/2,maxWidth=Math.min(170,width*.47),words=label.text.includes(' ')?label.text.split(' '):[...label.text],lines:string[]=[];let line='';for(const word of words){const candidate=line+(line&&label.text.includes(' ')?' ':'')+word;if(c.measureText(candidate).width>maxWidth&&line){lines.push(line);line=word;}else line=candidate;}if(line)lines.push(line);const galaxy=entry.galaxies.find(galaxy=>galaxy.volume.root===label.owner),clearance=galaxy?galaxy.radius*unit*.4+8:label.owner instanceof THREE.Mesh&&label.owner.geometry===this.sphere?label.owner.scale.x*unit+5:14;return {...label,x,y,lines,clearance,width:Math.min(maxWidth,Math.max(...lines.map(text=>c.measureText(text).width)))+12,height:lines.length*16+8};}).filter(label=>label.x>=-10&&label.x<=width+10&&label.y>=-10&&label.y<=height+10);
  const boxes=placeMembershipLabels(labels,width,height);for(const box of boxes){const label=labels.find(label=>label.id===box.id)!;c.strokeStyle=label.gold?'#ffe1a0b0':'#abc4d080';c.lineWidth=1;c.beginPath();c.moveTo(label.x,label.y);c.lineTo(box.left+box.width/2,box.top+box.height/2);c.stroke();if(label.gold){c.beginPath();c.arc(label.x,label.y,6,0,Math.PI*2);c.stroke();}c.fillStyle='#07111ee8';c.fillRect(box.left,box.top,box.width,box.height);c.fillStyle=label.gold?'#ffe1a0':'#dae7ee';c.textAlign='left';label.lines.forEach((text,index)=>c.fillText(text,box.left+6,box.top+16+index*16));}
  c.fillStyle='#e6d2a6';c.textAlign='center';c.font='12px system-ui';c.fillText(this.words.homeAnchor[this.home]!,width/2,height-12,width-16);
 }
 retry(){if(this.disposed)return;this.cancel();this.canvas.removeEventListener('webglcontextlost',this.contextLost);this.canvas.removeEventListener('webglcontextrestored',this.contextRestored);this.renderer?.dispose();this.renderer?.forceContextLoss();const next=document.createElement('canvas');next.className='membership-gpu';this.canvas.replaceWith(next);this.canvas=next;this.prepareRenderer();this.requestDraw();}
 private release(entry:Entry){this.world.remove(entry.root);entry.galaxies.forEach(galaxy=>galaxy.volume.dispose());entry.web?.dispose();entry.geometries.forEach(geometry=>geometry.dispose());entry.materials.forEach(material=>material.dispose());entry.root.clear();}
 dispose(){if(this.disposed)return;this.disposed=true;this.cancel();this.releaseDrag();this.observer.disconnect();this.host.removeEventListener('pointerdown',this.pointerDown);this.host.removeEventListener('pointermove',this.pointerMove);this.host.removeEventListener('pointerup',this.pointerEnd);this.host.removeEventListener('pointercancel',this.pointerEnd);this.host.removeEventListener('lostpointercapture',this.pointerEnd);this.host.removeEventListener('keydown',this.keyDown);this.canvas.removeEventListener('webglcontextlost',this.contextLost);this.canvas.removeEventListener('webglcontextrestored',this.contextRestored);for(const entry of this.entries.values())this.release(entry);this.entries.clear();this.textures.forEach(texture=>texture.dispose());this.textures.clear();this.sphere.dispose();this.renderer?.dispose();this.renderer?.forceContextLoss();this.layer.remove();}
}
