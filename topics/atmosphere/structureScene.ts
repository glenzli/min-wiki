import * as THREE from 'three';
import type { World } from './model.ts';
import type { MechanismFrame } from './layerMechanism.ts';
import { createCloudVolume } from './cloudVolume.ts';
import { displayHeight, expandedAltitude, expandedAltitudeGLSL, expandedHeight, referenceTicks, structureNoise, structureProfiles } from './structureModel.ts';
import { earthCompositionCue } from './compositionModel.ts';
import { StructureGround3D } from './structureGround3d.ts';
import { StructurePhenomena } from './phenomena3d.ts';
import { cloudExamples, cloudSample, defaultPhenomena, type CloudExample, type CloudSample, type PhenomenonOptions } from './phenomenaModel.ts';

const vertex=`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const skyFragment=`varying vec3 vP;uniform vec3 uLow;uniform float uNight;uniform float uHeight;void main(){float fade=smoothstep(.1,uHeight,vP.y);vec3 color=mix(uLow,vec3(.0025,.006,.011),fade);color=mix(color,vec3(.0018,.0032,.009),uNight);gl_FragColor=vec4(color,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const airFragment=`varying vec3 vP;uniform vec3 uRay;uniform vec3 uTint;uniform vec3 uBoxHalf;uniform vec3 uBoxCenter;uniform float uHeight;uniform float uAir;uniform float uWorld;uniform vec2 uSelected;uniform float uPhase;uniform float uDust;
#ifdef EARTH_COMPOSITION
uniform sampler2D uCompositionProfile;uniform float uComposition;
#endif
void main(){
 vec3 rd=normalize(uRay),p=vP+rd*.002;vec3 farT=(sign(rd)*uBoxHalf+uBoxCenter-p)/rd;
 float dist=max(0.,min(farT.x,min(farT.y,farT.z))),stepSize=dist/40.,trans=1.;vec3 sum=vec3(0);
 for(int i=0;i<40;i++){
  vec3 q=p+rd*(float(i)+.5)*stepSize;
  float y=q.y+.024*q.x*q.x+.014*q.z*q.z;
  if(y<0.||y>uHeight)continue;
  float h=expandedAltitudeAt(y);
  float rho=uAir*(exp(-h/25.)*.65+exp(-h/200.)*.016);
  // Optical teaching envelopes, not mass density or retrieved optical depth.
  // Venus has dense low air below an extended acid deck. Titan's photochemical
  // haze is a broad, advected volume distinct from its local methane clouds.
  if(uWorld>.5&&uWorld<1.5)rho=uAir*(exp(-h/18.)*.88+exp(-h/62.)*.065);
  if(uWorld>1.5&&uWorld<2.5)rho=uAir*(exp(-h/14.)*.45+exp(-h/90.)*.012)+uDust*exp(-h/5.)*.10;
  if(uWorld>2.5&&uWorld<3.5)rho+=uAir*exp(-pow((h-170.)/150.,2.))*.38*(.82+.18*sin((q.x-uPhase*.045)*1.4+q.z*2.1+y*1.3));
  float edge=smoothstep(0.,.35,4.2-abs(q.x))*smoothstep(0.,.28,2.1-abs(q.z));
  float detail=.86+.14*sin(q.x*2.7+q.z*3.1-uPhase*.1)*sin(q.y*2.3-q.z*1.8);
  float selected=smoothstep(uSelected.x-.08,uSelected.x+.08,y)*(1.-smoothstep(uSelected.y-.08,uSelected.y+.08,y));
  vec3 color=uTint*(.65+.35*smoothstep(-4.,3.,-q.x+q.y));
  float density=rho*detail+selected*.012;
  #ifdef EARTH_COMPOSITION
  if(uComposition>.5){
  vec2 cue=texture2D(uCompositionProfile,vec2(y/uHeight,.5)).rg*uComposition;
  // False-colour volume fades continuously; it is not a physical gas shell.
  float water=cue.r*.28,ozone=cue.g*.32;
  color=(color*density+vec3(.12,.66,.70)*water+vec3(.67,.30,.83)*ozone)/max(.0001,density+water+ozone);
  density+=water+ozone;
  }
  #endif
  float a=(1.-exp(-density*stepSize))*edge;
  sum+=trans*a*color;trans*=1.-a;
 }
 float alpha=1.-trans;if(alpha<.002)discard;
 gl_FragColor=vec4(sum/max(alpha,.0001),alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;


const worldIndex:Record<World,number>={earth:0,venus:1,mars:2,titan:3,moon:4,mercury:5};
/** Composition of one retained world's ground, continuous gas, clouds and
 * layer phenomena. No DOM, renderer, timer, route state or foreign layer map. */
export class AtmosphereStructureWorld {
 readonly scene=new THREE.Scene();
 private ownedGeometry=new Set<THREE.BufferGeometry>();
 private ownedMaterials=new Set<THREE.Material>();
 private ground:StructureGround3D;
 private phenomena:StructurePhenomena;
 private clouds:Array<{volume:ReturnType<typeof createCloudVolume>;example:CloudExample;sample:CloudSample}>=[];
 private cloudPayloadBytes=0;
 private sunlight:THREE.DirectionalLight;
 private skylight:THREE.HemisphereLight;
 private air?:THREE.Mesh<THREE.BoxGeometry,THREE.ShaderMaterial>;
 private sky?:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
 private selectedLines?:THREE.Line<THREE.BufferGeometry,THREE.LineBasicMaterial>;
 private thermalGuides?:THREE.LineSegments<THREE.BufferGeometry,THREE.LineBasicMaterial>;
 private observer?:THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>;
 private sparse?:THREE.Points<THREE.BufferGeometry,THREE.PointsMaterial>;
 private sparseSource?:Float32Array;
 private compositionProfile?:THREE.DataTexture;
 private disposed=false;
 constructor(readonly world:World){
  const profile=structureProfiles[world],height=displayHeight(world);this.scene.background=new THREE.Color('#08131d');
  this.skylight=new THREE.HemisphereLight('#d1e6ed','#47413a',1.8);this.skylight.name='world-sky-light';this.scene.add(this.skylight);
  this.sunlight=new THREE.DirectionalLight('#fff0d9',2.4);this.sunlight.name='world-sunlight';this.sunlight.position.set(-6,9,7);this.scene.add(this.sunlight);
  this.ground=new StructureGround3D(world);this.scene.add(this.ground.group);
  this.phenomena=new StructurePhenomena(world);this.scene.add(this.phenomena.group);
  if(profile.air>0){
   const skyGeometry=new THREE.PlaneGeometry(60,30);skyGeometry.translate(0,7,-5);
   const low=world==='earth'?new THREE.Vector3(.14,.25,.34):world==='venus'?new THREE.Vector3(.26,.19,.11):world==='mars'?new THREE.Vector3(.14,.075,.045):new THREE.Vector3(.24,.14,.055);
   this.sky=new THREE.Mesh(skyGeometry,new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:skyFragment,uniforms:{uLow:{value:low},uNight:{value:0},uHeight:{value:height}},depthWrite:false}));this.sky.name='layer-sky-backdrop';this.add(this.sky);
  }
  if(profile.air>0){
   const center=height/2-.15,half=(height+1)/2;
   if(world==='earth'){
    const data=new Uint8Array(256*4);
    for(let i=0;i<256;i++){const cue=earthCompositionCue(expandedAltitude('earth',i/255*height));data.set([Math.round(cue.water*255),Math.round(cue.ozone*255),0,255],i*4);}
    this.compositionProfile=new THREE.DataTexture(data,256,1,THREE.RGBAFormat);this.compositionProfile.minFilter=this.compositionProfile.magFilter=THREE.LinearFilter;this.compositionProfile.generateMipmaps=false;this.compositionProfile.needsUpdate=true;this.compositionProfile.name='earth-qualitative-composition-profile';
   }
   const airMat=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:expandedAltitudeGLSL(world)+'\n'+airFragment,uniforms:{uRay:{value:new THREE.Vector3(0,0,-1)},uTint:{value:new THREE.Vector3(...profile.tint)},uBoxHalf:{value:new THREE.Vector3(4.28,half,2.18)},uBoxCenter:{value:new THREE.Vector3(0,center,0)},uHeight:{value:height},uAir:{value:profile.air*(world==='earth'?.27:world==='mars'?.6:1)},uWorld:{value:worldIndex[world]},uSelected:{value:new THREE.Vector2(-10,-9)},uPhase:{value:0},uDust:{value:0}},transparent:true,depthWrite:false,side:THREE.FrontSide});
   if(this.compositionProfile){airMat.defines.EARTH_COMPOSITION=1;airMat.uniforms.uCompositionProfile={value:this.compositionProfile};airMat.uniforms.uComposition={value:0};}
   const box=new THREE.BoxGeometry(8.56,half*2,4.36);box.translate(0,center,0);this.air=new THREE.Mesh(box,airMat);this.air.renderOrder=8;this.add(this.air);
  }
  for(const example of cloudExamples[world])this.cloud(example);
  const count=profile.air===0?24:world==='earth'?35:world==='mars'?50:18;
  const particles=new Float32Array(count*3);
  for(let i=0;i<count;i++){
   const h=profile.air===0?Math.expm1(structureNoise(i+313)*Math.log(501)):world==='mars'?structureNoise(i+313)*7:150+structureNoise(i+313)*(profile.top-150);
   particles.set([(structureNoise(i+301)-.5)*7.8,expandedHeight(world,h),(structureNoise(i+331)-.5)*3.8],i*3);
  }
  const pointsGeo=new THREE.BufferGeometry();pointsGeo.setAttribute('position',new THREE.BufferAttribute(particles,3));this.sparseSource=particles.slice();
  this.sparse=new THREE.Points(pointsGeo,new THREE.PointsMaterial({color:world==='mars'?'#d7a47b':'#d1dce3',size:profile.air===0?.043:world==='mars'?.021:.025,transparent:true,opacity:profile.air===0?.72:.35,depthWrite:false}));this.sparse.name=world==='mars'?'wind-carried-martian-dust':'enlarged-sparse-gas-markers';this.sparse.frustumCulled=false;this.add(this.sparse);
  const lineGeo=new THREE.BufferGeometry().setFromPoints(Array.from({length:81},(_,i)=>new THREE.Vector3(-4+i*.1,0,2.16)));
  this.selectedLines=new THREE.Line(lineGeo,new THREE.LineBasicMaterial({color:'#d4e5ef',transparent:true,opacity:.34}));this.add(this.selectedLines);this.selectedLines.visible=false;
  if(world==='earth'){
   const marks:THREE.Vector3[]=[];
   for(const km of referenceTicks(world).filter(km=>km<profile.top))for(let i=0;i<40;i++)for(const x of [-4+i*.2,-4+i*.2+.095])marks.push(new THREE.Vector3(x,expandedHeight(world,km)-.024*x*x,.42));
   this.thermalGuides=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(marks),new THREE.LineBasicMaterial({color:'#b9c6ce',transparent:true,opacity:.13,depthWrite:false}));this.thermalGuides.name='earth-thermal-reference-guides';this.add(this.thermalGuides);
  }
  if(world==='earth'){this.observer=new THREE.Mesh(new THREE.SphereGeometry(.04,12,8),new THREE.MeshBasicMaterial({color:'#f3d3a1'}));this.add(this.observer);this.observer.visible=false;}
 }
 private add(object:THREE.Mesh|THREE.Points|THREE.Line){this.scene.add(object);this.ownedGeometry.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])this.ownedMaterials.add(material);}
 private cloud(example:CloudExample){
  const volume=createCloudVolume(example.seed,{shape:example.shape,dynamic:true}),sample=cloudSample(this.world,this.clouds.length,0);
  volume.mesh.position.set(sample.x,sample.y,sample.z);volume.mesh.scale.set(...example.scale);volume.mesh.renderOrder=4;volume.setOpacity(example.opacity);
  volume.mesh.userData.cloudMaterial=example.material;
  for(const attribute of Object.values(volume.mesh.geometry.attributes))this.cloudPayloadBytes+=attribute.array.byteLength;
  this.cloudPayloadBytes+=volume.mesh.geometry.index?.array.byteLength??0;
  this.cloudPayloadBytes+=volume.mesh.material.uniforms.uDensity.value.image.data.byteLength;
  this.scene.add(volume.mesh);this.clouds.push({volume,example,sample});
 }
 update(selected:string|null,seconds:number,mechanism:MechanismFrame|null,observerHeight:number|null,options:PhenomenonOptions=defaultPhenomena){
  if(this.disposed)return;
  const feature=structureProfiles[this.world].features.find(f=>f.id===selected);
  const polarNight=this.world==='earth'&&selected==='aurora',martianTwilight=this.world==='mars'&&selected==='co2-ice';
  if(this.sky)this.sky.material.uniforms.uNight.value=polarNight?1:martianTwilight?.94:0;
  // CO2 twilight clouds remain sunlit after the low sky and ground darken.
  // Their independent volume lighting is not an all-day bright-cloud claim.
  this.sunlight.intensity=martianTwilight?.12:2.4;this.skylight.intensity=martianTwilight?.24:1.8;
  this.ground.update(seconds);this.phenomena.update(selected,seconds,mechanism,options);
  if(this.air&&this.compositionProfile)this.air.material.uniforms.uComposition.value=options.composition?1:0;
  // The close weather view observes the cloud nearby. Avoid laying the full
  // expanded-column haze and selection wash over its internal light/shadow.
  const nearbyCloud=this.world==='earth'&&options.detail&&selected==='weather',methaneClose=this.world==='titan'&&options.detail&&selected==='methane-cloud';
  if(this.air){this.air.material.uniforms.uPhase.value=seconds%4096;this.air.material.uniforms.uDust.value=this.world==='mars'&&selected==='dust'?1:0;this.air.material.uniforms.uAir.value=structureProfiles[this.world].air*(this.world==='earth'?(polarNight?.025:nearbyCloud?.11:.27):this.world==='mars'?(martianTwilight?.22:.6):methaneClose?.65:1);const range=polarNight||nearbyCloud||martianTwilight?undefined:feature?.range;this.air.material.uniforms.uSelected.value.set(range?expandedHeight(this.world,range[0]):-10,range?expandedHeight(this.world,range[1]):-9);}
  if(this.selectedLines){this.selectedLines.visible=!!feature&&options.clues&&!options.detail;const p=this.selectedLines.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i);p.setY(i,expandedHeight(this.world,feature?.height??0)-.024*x*x);}p.needsUpdate=true;}
  if(this.thermalGuides)this.thermalGuides.visible=options.clues&&!options.detail;
  if(this.observer){this.observer.visible=observerHeight!==null&&options.clues;this.observer.position.set(0,expandedHeight('earth',observerHeight??0),2.19);}
  for(let i=0;i<this.clouds.length;i++){
   const c=this.clouds[i],sample=cloudSample(this.world,i,seconds,c.sample);
   c.volume.mesh.position.set(sample.x,sample.y,sample.z);c.volume.setTime(seconds*c.example.evolutionRate);
   // Shape evolves inside retained coordinates; the cloud does not inflate
   // or rock as one rigid object. Each world's transport has its own rate.
   let opacity=c.example.opacity*sample.opacity;
   if(this.world==='earth'){
    if(options.weather==='dry'||options.detail&&selected!=='weather')opacity=0;
    else if(i===2)opacity=mechanism?.layer===0&&mechanism.step===2?opacity*mechanism.progress:0;
    else if(i===0&&options.weather==='rain')opacity=Math.min(1,opacity*1.04);
   }
   // These Martian cases are alternatives, not two compulsory simultaneous
   // cloud decks. Different height-level wind directions are one example.
   if(this.world==='mars'&&!(selected==='water-ice'&&i===0||selected==='co2-ice'&&i===1))opacity=0;
   if(this.world==='titan'&&options.detail&&selected!=='methane-cloud')opacity=0;
   c.volume.mesh.visible=opacity>.001;c.volume.setOpacity(opacity);
  }
  if(this.sparse&&this.sparseSource){
   const dust=this.world==='mars'&&selected==='dust';
   this.sparse.visible=dust||options.clues&&(this.world==='moon'||this.world==='mercury'||selected==='escape'||selected==='titan-upper'||selected==='mars-upper'||selected==='venus-upper');
   const p=this.sparse.geometry.getAttribute('position') as THREE.BufferAttribute;
   for(let i=0;i<p.count;i++){
    const x=this.sparseSource[i*3],y=this.sparseSource[i*3+1],z=this.sparseSource[i*3+2];
    if(dust)p.setXYZ(i,((x+4.2+seconds*(.13+structureNoise(i+7)*.05))%8.4)-4.2,y*.25+Math.sin(seconds*.3+i)*.025,z);
    else p.setXYZ(i,x+Math.sin(seconds*.07+i)*.08,y+Math.sin(seconds*.11+i*.7)*.035,z);
   }p.needsUpdate=true;
  }
 }
 beforeRender(camera:THREE.Camera){if(this.air)camera.getWorldDirection(this.air.material.uniforms.uRay.value);}
 /** Retained typed-array payload, including cloud density/boxes and the CPU
  * sparse-position copy. Excludes JS objects, shared lookup tables, compiled
  * shaders, driver overhead and render targets; this is not total GPU memory. */
 get resourceBytes(){let bytes=this.ground.resourceBytes+this.phenomena.resourceBytes+this.cloudPayloadBytes+(this.sparseSource?.byteLength??0)+(this.compositionProfile?.image.data.byteLength??0);for(const geo of this.ownedGeometry){for(const attribute of Object.values(geo.attributes))bytes+=attribute.array.byteLength;bytes+=geo.index?.array.byteLength??0;}return bytes;}
 dispose(){if(this.disposed)return;this.disposed=true;this.ground.dispose();this.phenomena.dispose();this.compositionProfile?.dispose();for(const c of this.clouds)c.volume.dispose();for(const geo of this.ownedGeometry)geo.dispose();for(const material of this.ownedMaterials)material.dispose();this.scene.clear();}
}
