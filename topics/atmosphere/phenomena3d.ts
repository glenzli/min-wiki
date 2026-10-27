import * as THREE from 'three';
import type { World } from './model.ts';
import type { MechanismFrame } from './layerMechanism.ts';
import { expandedAltitudeGLSL, expandedHeight, structureNoise } from './structureModel.ts';
import { FamiliarAtmosphereReferences } from './familiarReferences3d.ts';
import { auroraPoint, defaultPhenomena, energyMechanismSample, makeRainSample, meteorPoint, meteorSample, rainSample, weatherMechanismSample, windSample, type PhenomenonOptions } from './phenomenaModel.ts';

const lineVertex=`attribute float aOpacity;varying float vOpacity;void main(){vOpacity=aOpacity;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const lineFragment=`uniform vec3 uColor;varying float vOpacity;void main(){gl_FragColor=vec4(uColor,vOpacity);#include <tonemapping_fragment>
#include <colorspace_fragment>
}`.replace(';#include',';\n#include');
const guideVertex=`attribute float aOpacity;attribute float aAcross;varying float vOpacity;varying float vAcross;void main(){vOpacity=aOpacity;vAcross=aAcross;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const guideFragment=`uniform vec3 uColor;varying float vOpacity;varying float vAcross;void main(){float edge=smoothstep(.58,.92,abs(vAcross));gl_FragColor=vec4(mix(uColor,vec3(.025,.045,.065),edge*.92),vOpacity);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
type GuideBands=THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
const UV_SEGMENTS=8,SOLAR_SEGMENTS=12;
const splashVertex=`attribute float aOpacity;varying float vOpacity;void main(){vOpacity=aOpacity;gl_PointSize=3.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const splashFragment=`uniform vec3 uColor;varying float vOpacity;void main(){float r=length(gl_PointCoord-.5);if(r>.5||vOpacity<.001)discard;gl_FragColor=vec4(uColor,vOpacity*(1.-smoothstep(.1,.5,r)));
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const trailVertex=`attribute float aPath;varying float vPath;void main(){vPath=aPath;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const trailFragment=`uniform float uProgress;uniform float uLight;varying float vPath;
void main(){float age=uProgress-vPath;if(age<0.||age>.42)discard;float a=exp(-age*10.)*uLight;gl_FragColor=vec4(mix(vec3(.55,.38,.28),vec3(1.,.91,.76),exp(-age*18.)),a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const auroraVertex=expandedAltitudeGLSL('earth')+`\nvarying vec2 vUv;varying float vHeight;void main(){vUv=uv;vHeight=expandedAltitudeAt(position.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const auroraFragment=`uniform float uTime;uniform float uStrength;varying vec2 vUv;varying float vHeight;
float hash(float n){return fract(sin(n*127.1+19.19)*43758.5453);}
float noise(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(hash(i),hash(i+1.),f);}
void main(){float u=vUv.x,v=vUv.y,t=uTime;
float drift=u+.018*sin(u*8.7+t*.16)+.007*sin(u*23.-t*.11);
// Uneven emission bundles have different widths, heights and lifetimes.
// The fine rays share one folded arc; there is no equally spaced carrier.
float bundle=noise(drift*32.-t*.12),fine=noise(drift*179.+noise(drift*43.)*2.4-t*.07);
float rays=pow(smoothstep(.23,.88,bundle*.65+fine*.35),1.8);
float emissionPatch=smoothstep(.16,.68,noise(u*7.3-t*.055))*(.72+.28*noise(u*17.2+t*.1));
float rayTop=.42+.53*noise(drift*27.+2.1);
float heightFade=1.-smoothstep(rayTop-.20,rayTop+.08,v);
float lower=exp(-pow((v-.075)/.085,2.));
float edge=smoothstep(0.,.025,v)*(1.-smoothstep(.72,1.,v))*smoothstep(0.,.07,u)*(1.-smoothstep(.91,1.,u));
float emission=(.08+.67*rays)*heightFade*exp(-v*1.3)+lower*.21;
float a=edge*emissionPatch*emission*uStrength;
vec3 green=mix(vec3(.12,.68,.29),vec3(.36,1.,.53),lower*.55);
vec3 color=mix(green,vec3(.55,.11,.19),smoothstep(300.,385.,vHeight)*.73);
gl_FragColor=vec4(color,a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

/** Finite, retained visual phenomena and enlarged explanatory cues. This owner
 * has no clock, DOM or renderer. Its time and mechanism sample come from the
 * view, so hiding, pausing, seeking and disposal have one composition owner. */
export class StructurePhenomena {
  readonly group = new THREE.Group();
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private textures = new Set<THREE.Texture>();
  private disposed = false;
  private wind?: THREE.LineSegments<THREE.BufferGeometry,THREE.ShaderMaterial>;
  private rain?: THREE.LineSegments<THREE.BufferGeometry,THREE.ShaderMaterial>;
  private splash?: THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;
  private rainScratch=makeRainSample();
  private windScratch={x:0,y:0,z:0,alpha:0};
  private auroraScratch={x:0,y:0,z:0};
  private parcelCooling=new THREE.Color('#a8cfdb');
  private meteor?: THREE.Group;
  private meteorHead?: THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>;
  private meteorGlow?: THREE.Sprite;
  private meteorTrail?: THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
  private fragments: THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>[] = [];
  private curtains: THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>[] = [];
  private references?: FamiliarAtmosphereReferences;
  private referenceAirplane?: THREE.Object3D;
  private referenceSatellite?: THREE.Object3D;
  private parcels: THREE.Mesh<THREE.SphereGeometry,THREE.MeshStandardMaterial>[] = [];
  private ultraviolet = new THREE.Group();
  private ultravioletRays: GuideBands[] = [];
  private ultravioletHeads?:GuideBands;
  private ozoneHeat?: GuideBands;
  private stratosphereTransport?:GuideBands;
  private solarRays?: GuideBands;
  private thermalTrails?: GuideBands;
  private thermalParticles:THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>[]=[];
  private magnetic = new THREE.Group();
  private electrons: Array<{particle:THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>;curve:THREE.QuadraticBezierCurve3}> = [];
  private exosphere = new THREE.Group();
  private exosphereParticles: THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>[] = [];
  private retainedCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-1.2,expandedHeight('earth',650),.7),new THREE.Vector3(-.4,expandedHeight('earth',1000)+.15,.7),new THREE.Vector3(.45,expandedHeight('earth',720),.7));
  private escapeCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(.7,expandedHeight('earth',700),.5),new THREE.Vector3(1.4,expandedHeight('earth',900),.5),new THREE.Vector3(2.3,expandedHeight('earth',1000)+.5,.5));

  constructor(readonly world: World) {
    this.group.name='layer-phenomena-and-explanation';
    if(world==='earth'){
      this.wind=this.lines(28,'#aacbd3','enlarged-wind-tracers');
      this.makeRain();this.makeMeteor();this.makeAurora();this.makeExplanation();
      this.references=new FamiliarAtmosphereReferences();this.group.add(this.references.group);
      this.referenceAirplane=this.references.group.getObjectByName('enlarged-cruise-airplane');
      this.referenceSatellite=this.references.group.getObjectByName('enlarged-low-orbit-satellite');
    }else if(world==='titan')this.makeRain();
    else if(world==='venus'||world==='mars')this.wind=this.lines(18,world==='mars'?'#d7ac84':'#ddceaf','enlarged-world-wind-tracers');
  }
  private keep<T extends THREE.Object3D>(object:T):T {
    if(object instanceof THREE.Mesh||object instanceof THREE.Line||object instanceof THREE.Points){
      this.geometries.add(object.geometry);
      for(const material of Array.isArray(object.material)?object.material:[object.material])this.materials.add(material);
    }else if(object instanceof THREE.Sprite)this.materials.add(object.material);
    return object;
  }
  private lines(count:number,color:string,name:string){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*6),3));geometry.setAttribute('aOpacity',new THREE.BufferAttribute(new Float32Array(count*2),1));
    const material=new THREE.ShaderMaterial({vertexShader:lineVertex,fragmentShader:lineFragment,uniforms:{uColor:{value:new THREE.Color(color)}},transparent:true,depthWrite:false});
    const object=this.keep(new THREE.LineSegments(geometry,material));object.name=name;object.frustumCulled=false;object.renderOrder=6;this.group.add(object);return object;
  }
  /** Width-bearing interpretation marks, not luminous matter. A narrow dark
   * edge keeps them legible on pale gas; order 12 places them after air (8).
   * Depth testing still respects solid ground. No screen-space glow is used. */
  private bands(count:number,color:string,name:string):GuideBands{
    const geometry=new THREE.BufferGeometry(),across=new Float32Array(count*4),indices=new Uint16Array(count*6);
    for(let i=0;i<count;i++){across.set([-1,1,-1,1],i*4);const n=i*4;indices.set([n,n+1,n+2,n+1,n+3,n+2],i*6);}
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*12),3));geometry.setAttribute('aOpacity',new THREE.BufferAttribute(new Float32Array(count*4),1));geometry.setAttribute('aAcross',new THREE.BufferAttribute(across,1));geometry.setIndex(new THREE.BufferAttribute(indices,1));
    const material=new THREE.ShaderMaterial({vertexShader:guideVertex,fragmentShader:guideFragment,uniforms:{uColor:{value:new THREE.Color(color)}},transparent:true,side:THREE.DoubleSide,depthWrite:false});
    const object=this.keep(new THREE.Mesh(geometry,material));object.name=name;object.frustumCulled=false;object.renderOrder=12;object.userData.explanatoryGuide=true;this.group.add(object);return object;
  }
  private band(object:GuideBands,index:number,ax:number,ay:number,az:number,bx:number,by:number,bz:number,a=0,b=a,width=.030){
    const dx=bx-ax,dy=by-ay,length=Math.max(.00001,Math.hypot(dx,dy)),nx=-dy/length*width*.5,ny=dx/length*width*.5;
    const p=object.geometry.getAttribute('position'),alpha=object.geometry.getAttribute('aOpacity'),n=index*4;
    p.setXYZ(n,ax+nx,ay+ny,az);p.setXYZ(n+1,ax-nx,ay-ny,az);p.setXYZ(n+2,bx+nx,by+ny,bz);p.setXYZ(n+3,bx-nx,by-ny,bz);
    alpha.setX(n,a);alpha.setX(n+1,a);alpha.setX(n+2,b);alpha.setX(n+3,b);
  }
  private makeRain(){
    this.rain=this.lines(216,'#d4e3ea',this.world==='titan'?'occasional-methane-rain':'cloud-grown-rain');
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(36*3),3));geometry.setAttribute('aOpacity',new THREE.BufferAttribute(new Float32Array(36),1));
    this.splash=this.keep(new THREE.Points(geometry,new THREE.ShaderMaterial({vertexShader:splashVertex,fragmentShader:splashFragment,uniforms:{uColor:{value:new THREE.Color('#dce9e8')}},transparent:true,depthWrite:false})));this.splash.name='rain-contact-splashes';this.splash.frustumCulled=false;this.group.add(this.splash);
  }
  private glow(){
    const size=32,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const d=Math.hypot((x+.5)/size-.5,(y+.5)/size-.5)*2,a=Math.max(0,1-d);const i=(x+size*y)*4;data.set([255,247,224,Math.round(a*a*a*255)],i);}
    const texture=new THREE.DataTexture(data,size,size);texture.needsUpdate=true;texture.colorSpace=THREE.SRGBColorSpace;this.textures.add(texture);return texture;
  }
  private makeMeteor(){
    const group=new THREE.Group();group.name='reference-meteoroid-path';this.group.add(group);this.meteor=group;
    const positions:number[]=[],paths:number[]=[],indices:number[]=[];
    for(let i=0;i<=48;i++){const p=i/48,q=meteorPoint(p),width=.009+.020*Math.sin(p*Math.PI);positions.push(q.x,q.y-width,q.z,q.x,q.y+width,q.z);paths.push(p,p);if(i<48){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aPath',new THREE.Float32BufferAttribute(paths,1));geometry.setIndex(indices);
    const material=new THREE.ShaderMaterial({vertexShader:trailVertex,fragmentShader:trailFragment,uniforms:{uProgress:{value:.4},uLight:{value:1}},transparent:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});
    this.meteorTrail=this.keep(new THREE.Mesh(geometry,material));this.meteorTrail.name='meteor-emission-trail';this.meteorTrail.renderOrder=7;group.add(this.meteorTrail);
    this.meteorHead=this.keep(new THREE.Mesh(new THREE.SphereGeometry(.023,12,8),new THREE.MeshBasicMaterial({color:'#fff8e8',transparent:true})));this.meteorHead.name='retained-meteoroid';group.add(this.meteorHead);
    this.meteorGlow=this.keep(new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow(),color:'#ffedce',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})));this.meteorGlow.scale.set(.22,.22,1);group.add(this.meteorGlow);
    const fragmentGeometry=new THREE.SphereGeometry(.012,8,6);
    for(let i=0;i<4;i++){const part=this.keep(new THREE.Mesh(fragmentGeometry,new THREE.MeshBasicMaterial({color:i%2?'#df9c65':'#ffe4ae',transparent:true,opacity:0})));part.name='retained-entry-fragment-'+i;group.add(part);this.fragments.push(part);}
  }
  private makeAurora(){
    for(let curtain=0;curtain<2;curtain++){
      const p:number[]=[],uv:number[]=[],indices:number[]=[];
      for(let i=0;i<=96;i++)for(let j=0;j<=16;j++){const u=i/96,v=j/16,q=auroraPoint(u,v,0,curtain);p.push(q.x,q.y,q.z);uv.push(u,v);if(i<96&&j<16){const n=i*17+j;indices.push(n,n+1,n+17,n+1,n+18,n+17);}}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
      const material=new THREE.ShaderMaterial({vertexShader:auroraVertex,fragmentShader:auroraFragment,uniforms:{uTime:{value:0},uStrength:{value:curtain?.48:1.25}},transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
      const mesh=this.keep(new THREE.Mesh(geometry,material));mesh.name='folded-polar-aurora-'+curtain;mesh.renderOrder=7;mesh.frustumCulled=false;this.curtains.push(mesh);this.group.add(mesh);
    }
  }
  private bead(radius:number,color:string){return this.keep(new THREE.Mesh(new THREE.SphereGeometry(radius,10,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false})));}
  private makeExplanation(){
    for(let i=0;i<2;i++){
      const parcel=this.keep(new THREE.Mesh(new THREE.SphereGeometry(.075,16,10),new THREE.MeshStandardMaterial({color:i?'#9dbec9':'#eccb96',roughness:.8,transparent:true,opacity:.35,wireframe:true,depthWrite:false})));parcel.name=i?'reference-drier-parcel':'reference-moist-parcel';this.parcels.push(parcel);this.group.add(parcel);
    }
    this.ultraviolet.name='ozone-absorption-rays';this.group.add(this.ultraviolet);
    // Invisible UV is an optional explanation: continuous downward rays lose
    // opacity through the absorbing region, never an expanding luminous ball.
    for(let i=0;i<5;i++){
      const x=-1.7+i*.79,end=expandedHeight('earth',22+structureNoise(i+41)*10),start=expandedHeight('earth',48);
      const line=this.bands(UV_SEGMENTS,'#e6cbff','attenuating-uv-ray-'+i);
      for(let j=0;j<UV_SEGMENTS;j++){const a=j/UV_SEGMENTS,b=(j+1)/UV_SEGMENTS;this.band(line,j,x+.25*(1-a),start+(end-start)*a,.88,x+.25*(1-b),start+(end-start)*b,.88);}
      this.ultraviolet.add(line);this.ultravioletRays.push(line);
    }
    this.ultravioletHeads=this.bands(10,'#e6cbff','incoming-uv-direction-guides');this.ultraviolet.add(this.ultravioletHeads);
    // Short non-directed marks encode local energy transfer, not warm gas
    // rising through the stable stratosphere. All buffers are retained.
    this.ozoneHeat=this.bands(15,'#ffd28a','ozone-local-energy-transfer');
    const marks=[[-.14,.02,-.015,.075],[.035,-.085,.17,-.055],[-.005,.16,.045,.265]];
    for(let i=0;i<5;i++)for(let j=0;j<3;j++){
      const x=-1.7+i*.79,y=expandedHeight('earth',22+structureNoise(i+41)*10),[ax,ay,bx,by]=marks[j];
      this.band(this.ozoneHeat,i*3+j,x+ax,y+ay,.88,x+bx,y+by,.88,0,0,.036);
    }
    this.stratosphereTransport=this.bands(12,'#d1effb','stratosphere-horizontal-transport');
    this.solarRays=this.bands(3*SOLAR_SEGMENTS,'#ffe0a0','thermosphere-solar-energy-guide');
    for(let i=0;i<3;i++)for(let j=0;j<SOLAR_SEGMENTS;j++){
      const a=j/SOLAR_SEGMENTS,b=(j+1)/SOLAR_SEGMENTS;this.band(this.solarRays,i*SOLAR_SEGMENTS+j,-1.6+i*1.6+.40*(1-a),expandedHeight('earth',550-280*a),.20,-1.6+i*1.6+.40*(1-b),expandedHeight('earth',550-280*b),.20);
    }
    this.thermalTrails=this.bands(6,'#def2fa','thermosphere-particle-energy-guide');
    for(let i=0;i<6;i++){const particle=this.bead(.045,'#e6f4f6');particle.material.opacity=.95;particle.renderOrder=13;particle.name='thermal-motion-example-'+i;this.thermalParticles.push(particle);this.group.add(particle);}
    this.magnetic.name='enlarged-magnetic-particle-paths';this.group.add(this.magnetic);
    for(let i=0;i<5;i++){
      const x=-2.25+i*1.12,curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(x+.7,expandedHeight('earth',600),-.25),new THREE.Vector3(x-.25,expandedHeight('earth',280),-.45),new THREE.Vector3(x,expandedHeight('earth',135),-.55));
      const line=this.keep(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(32)),new THREE.LineDashedMaterial({color:'#c7deed',dashSize:.075,gapSize:.065,transparent:true,opacity:.65,depthWrite:false})));line.renderOrder=12;line.computeLineDistances();this.magnetic.add(line);const particle=this.bead(.038,'#deedf5');particle.renderOrder=13;this.magnetic.add(particle);this.electrons.push({particle,curve});
    }
    this.exosphere.name='enlarged-bound-and-escape-paths';this.group.add(this.exosphere);
    for(const [i,curve]of [this.retainedCurve,this.escapeCurve].entries()){
      const line=this.keep(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),new THREE.LineDashedMaterial({color:i?'#edc792':'#b2cad9',dashSize:.07,gapSize:.07,transparent:true,opacity:.40,depthWrite:false})));line.computeLineDistances();this.exosphere.add(line);
      const particle=this.bead(.045,i?'#f3d49e':'#d7e5ef');particle.name=i?'illustrative-escaping-particle':'illustrative-retained-particle';this.exosphereParticles.push(particle);this.exosphere.add(particle);
    }
  }
  update(selected:string|null,seconds:number,mechanism:MechanismFrame|null,options:PhenomenonOptions=defaultPhenomena){
    if(this.disposed)return;
    this.references?.update(seconds);
    // Close views isolate the chosen question. The overview still relates
    // the retained phenomena in one continuous column of air; this is framing,
    // not a claim that a phenomenon cannot cross a thermal reference boundary.
    const overview=!options.detail;
    const ozone=energyMechanismSample(options.clues?mechanism:null,1),thermal=energyMechanismSample(options.clues?mechanism:null,3);
    if(this.referenceAirplane)this.referenceAirplane.visible=overview||selected==='ozone';
    if(this.referenceSatellite)this.referenceSatellite.visible=overview||selected==='escape';
    if(this.meteor)this.meteor.visible=overview||selected==='meteor';
    if(this.wind){
      const upper=this.world==='earth'&&selected==='ozone',show=this.world==='earth'?selected==='weather':this.world==='mars'?selected==='dust':selected==='acid-cloud';this.wind.visible=options.clues&&show;
      const p=this.wind.geometry.getAttribute('position') as THREE.BufferAttribute,a=this.wind.geometry.getAttribute('aOpacity') as THREE.BufferAttribute;
      if(this.wind.visible){for(let i=0;i<p.count/2;i++){const q=windSample(i,seconds,upper,this.windScratch);let y=q.y;if(this.world==='venus')y=expandedHeight(this.world,57)+(q.y-.6)*.12;if(this.world==='mars')y=q.y*.45;const len=.13*q.alpha,strength=upper?ozone.transport:1;p.setXYZ(i*2,q.x,y,q.z);p.setXYZ(i*2+1,q.x+len,y+.008,q.z);a.setX(i*2,q.alpha*.10*strength);a.setX(i*2+1,q.alpha*.65*strength);}p.needsUpdate=a.needsUpdate=true;}
    }
    if(this.rain&&this.splash){
      const on=this.world==='earth'?options.weather==='rain'&&(overview||selected==='weather'):selected==='methane-cloud'&&options.weather==='rain';this.rain.visible=this.splash.visible=on;
      if(on){const p=this.rain.geometry.getAttribute('position') as THREE.BufferAttribute,a=this.rain.geometry.getAttribute('aOpacity') as THREE.BufferAttribute;
        const sp=this.splash.geometry.getAttribute('position') as THREE.BufferAttribute,sa=this.splash.geometry.getAttribute('aOpacity') as THREE.BufferAttribute;
        for(let i=0;i<p.count/2;i++){
          const q=rainSample(this.world,i,seconds,this.rainScratch);
          p.setXYZ(i*2,q.x,q.y,q.z);p.setXYZ(i*2+1,q.tailX,q.tail,q.z);a.setX(i*2,q.opacity);a.setX(i*2+1,q.tailOpacity);
          // Contact marks belong to this same drop and appear only after its
          // fall ends. Its landing coordinate then stays fixed for the mark.
          if(i%6===0){const n=i/6;sp.setXYZ(n,q.x,q.ground+q.splash*.025,q.z);sa.setX(n,q.splash*.6);}
        }p.needsUpdate=a.needsUpdate=sp.needsUpdate=sa.needsUpdate=true;
      }
    }
    if(this.meteor&&this.meteorHead&&this.meteorGlow&&this.meteorTrail){
      const sample=meteorSample(seconds),manual=mechanism?.layer===2;
      const progress=manual?mechanism.step===0?0:mechanism.step===1?mechanism.progress:1:sample.progress;
      const light=manual?mechanism.step===0?.08:mechanism.step===2?1-mechanism.progress:1:sample.light;
      const point=meteorPoint(progress);this.meteorHead.position.set(point.x,point.y,point.z);this.meteorGlow.position.copy(this.meteorHead.position);this.meteorHead.material.opacity=light;this.meteorGlow.material.opacity=light*.8;this.meteorGlow.scale.setScalar(.12+light*.13);
      this.meteorTrail.material.uniforms.uProgress.value=progress;this.meteorTrail.material.uniforms.uLight.value=light*.9;this.meteorTrail.geometry.setDrawRange(0,Math.floor(progress*48)*6);
      for(const [i,fragment]of this.fragments.entries()){const split=Math.max(0,(progress-.60)/.4),offset=(i-1.5)*.075*split;fragment.visible=options.meteorOutcome==='fragment'&&split>0;fragment.position.set(point.x+offset,point.y-split*(.08+i*.05),point.z+offset*.4);fragment.material.opacity=Math.sin(split*Math.PI)*.8;}
    }
    for(const [curtain,mesh]of this.curtains.entries()){
      const strength=selected==='aurora'?thermal.aurora:1;
      mesh.visible=options.aurora&&strength>.001&&(overview||selected==='aurora');mesh.material.uniforms.uTime.value=seconds%4096;mesh.material.uniforms.uStrength.value=(curtain?.48:1.25)*strength;
      if(!mesh.visible)continue;
      const p=mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      for(let i=0;i<=96;i++)for(let j=0;j<=16;j++){const q=auroraPoint(i/96,j/16,seconds,curtain,this.auroraScratch);p.setXYZ(i*17+j,q.x,q.y,q.z);}p.needsUpdate=true;
    }
    const weather=weatherMechanismSample(mechanism);
    for(const [i,parcel]of this.parcels.entries()){
      parcel.visible=options.clues&&weather.active&&selected==='weather'&&(i===1||options.weather!=='dry');
      parcel.position.set(weather.x+(i?1.95:0),expandedHeight('earth',weather.km),i?.65:weather.z);parcel.scale.setScalar(1+weather.rise*.6);parcel.material.color.set(i?'#9cb9c1':'#e4c292').lerp(this.parcelCooling,weather.rise);
    }
    this.ultraviolet.visible=selected==='ozone'&&options.clues;
    if(this.ultraviolet.visible)for(const [i,ray]of this.ultravioletRays.entries()){
      const a=ray.geometry.getAttribute('aOpacity') as THREE.BufferAttribute;
      for(let j=0;j<a.count;j++){const t=(Math.floor(j/4)+(j%4>=2?1:0))/UV_SEGMENTS,fade=1-THREE.MathUtils.smoothstep(t,.25,1)*ozone.uvAbsorption,front=1-THREE.MathUtils.smoothstep(t,ozone.uvFront,ozone.uvFront+.035),flow=.94+.06*Math.sin(t*18-seconds*2.4+i*.7);a.setX(j,.94*fade*flow*front);}
      a.needsUpdate=true;
    }
    if(this.ultravioletHeads){
      this.ultravioletHeads.visible=this.ultraviolet.visible&&ozone.uvFront>.02&&ozone.uvAbsorption<.98;
      for(let i=0;i<5;i++){const end=expandedHeight('earth',22+structureNoise(i+41)*10),start=expandedHeight('earth',48),t=ozone.uvFront,x=-1.7+i*.79+.25*(1-t),y=start+(end-start)*t,alpha=.94*(1-ozone.uvAbsorption);
        this.band(this.ultravioletHeads,i*2,x-.065,y+.13,.88,x,y,.88,alpha,alpha);this.band(this.ultravioletHeads,i*2+1,x+.095,y+.10,.88,x,y,.88,alpha,alpha);
      }this.ultravioletHeads.geometry.getAttribute('position').needsUpdate=true;this.ultravioletHeads.geometry.getAttribute('aOpacity').needsUpdate=true;
    }
    if(this.ozoneHeat){this.ozoneHeat.visible=selected==='ozone'&&options.clues&&ozone.ozoneHeat>.001;const a=this.ozoneHeat.geometry.getAttribute('aOpacity');for(let i=0;i<a.count;i++)a.setX(i,ozone.ozoneHeat*.94);a.needsUpdate=true;}
    if(this.stratosphereTransport){
      this.stratosphereTransport.visible=selected==='ozone'&&options.clues&&ozone.transport>.001;
      for(let i=0;i<4;i++){
        const f=(seconds*.035+i*.25+.1)%1,x=-3.3+f*6.1,y=expandedHeight('earth',24)+(i%2?-.10:.09),alpha=ozone.transport*.92*Math.min(1,f/.06,(1-f)/.06),tip=x+.50;
        this.band(this.stratosphereTransport,i*3,x,y,.90,tip,y,.90,alpha,alpha);
        this.band(this.stratosphereTransport,i*3+1,tip-.12,y+.075,.90,tip,y,.90,alpha,alpha);
        this.band(this.stratosphereTransport,i*3+2,tip-.12,y-.075,.90,tip,y,.90,alpha,alpha);
      }this.stratosphereTransport.geometry.getAttribute('position').needsUpdate=true;this.stratosphereTransport.geometry.getAttribute('aOpacity').needsUpdate=true;
    }
    if(this.solarRays){this.solarRays.visible=selected==='aurora'&&options.clues&&thermal.active&&thermal.solarFront>0;const a=this.solarRays.geometry.getAttribute('aOpacity');for(let i=0;i<a.count;i++){const t=(Math.floor(i/4)%SOLAR_SEGMENTS+(i%4>=2?1:0))/SOLAR_SEGMENTS;a.setX(i,.94*(1-THREE.MathUtils.smoothstep(t,thermal.solarFront,thermal.solarFront+.035)));}a.needsUpdate=true;}
    if(this.thermalTrails){
      this.thermalTrails.visible=selected==='aurora'&&options.clues&&thermal.active&&thermal.thermalMotion>.001;
      const p=this.thermalTrails.geometry.getAttribute('position'),a=this.thermalTrails.geometry.getAttribute('aOpacity');
      for(const [i,particle]of this.thermalParticles.entries()){
        const x=-1.9+i*.76,y=expandedHeight('earth',225+i%3*42),dx=(i%2?1:-1)*.28*thermal.thermalMotion,dy=(i%3-1)*.12*thermal.thermalMotion;
        this.band(this.thermalTrails,i,x,y,.24,x+dx,y+dy,.24,.22,.94);
        particle.visible=this.thermalTrails.visible;particle.position.set(x+dx,y+dy,.24);
      }p.needsUpdate=a.needsUpdate=true;
    }
    this.magnetic.visible=selected==='aurora'&&options.clues&&options.aurora&&(!thermal.active||thermal.particleArrival>0);
    if(this.magnetic.visible)for(const [i,e]of this.electrons.entries())e.curve.getPoint(thermal.active?thermal.particleArrival:(seconds*.3+i*.17)%1,e.particle.position);
    this.exosphere.visible=selected==='escape'&&options.clues;
    if(this.exosphere.visible&&this.exosphereParticles.length){const manual=mechanism?.layer===4,step=mechanism?.step??0,p=mechanism?.progress??0;this.retainedCurve.getPoint(manual?step===0?0:step===1?p:1:(seconds*.16)%1,this.exosphereParticles[0].position);this.exosphereParticles[1].visible=!manual||step===2;this.escapeCurve.getPoint(manual?step===2?p:0:(seconds*.12+.2)%1,this.exosphereParticles[1].position);}
  }
  get resourceBytes(){let bytes=this.references?.resourceBytes??0;for(const geometry of this.geometries){for(const attribute of Object.values(geometry.attributes))bytes+=attribute.array.byteLength;bytes+=geometry.index?.array.byteLength??0;}for(const texture of this.textures){const data=texture.image?.data;if(data&&'byteLength'in data)bytes+=data.byteLength;}return bytes;}
  dispose(){if(this.disposed)return;this.disposed=true;this.references?.dispose();for(const geometry of this.geometries)geometry.dispose();for(const material of this.materials)material.dispose();for(const texture of this.textures)texture.dispose();this.group.clear();}
}
