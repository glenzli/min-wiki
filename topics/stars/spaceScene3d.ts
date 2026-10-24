import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SPACE_PARTICLES, spaceRandom, stellarSpaceFrame, stellarObservationZoom, writeSpaceParticles, type SpaceInput} from './spaceModel.ts';
import {createStellarPortrait} from '../../src/visuals/stellarPortrait.ts';
import {createNebulaPortrait} from '../../src/visuals/nebulaPortrait.ts';
import {nebulaCloudAppearance} from './nebulaCloud.ts';
import {NEBULA_SKY_WIDTH,NEBULA_SKY_HEIGHT,writeNebulaEnvironment,nebulaEnvironmentPalette,nebulaEnvironmentStars} from './nebulaEnvironment.ts';
import {StellarMedium,SPACE_VOLUME_EXTENT} from './spaceVolume.ts';
import {FrameRender} from '../../src/visuals/frameRender.ts';

const particleVertex = `
attribute float aAlpha;
attribute float aSize;
uniform float uPointScale;
uniform float uSizeScale;
uniform float uCutaway;
uniform float uCutZ;
varying float vAlpha;
varying vec3 vLocal;
void main(){
 vLocal=position;
 vec4 mv=modelViewMatrix*vec4(position,1.0);
 gl_Position=projectionMatrix*mv;
 gl_PointSize=clamp(aSize*uPointScale*uSizeScale/max(1.0,-mv.z),1.0,52.0);
 vAlpha=aAlpha;
}`;
const particleFragment = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uDark;
uniform float uCutaway;
uniform float uCutZ;
varying float vAlpha;
varying vec3 vLocal;
void main(){
 if(uCutaway>.5&&vLocal.z>uCutZ)discard;
 float r=length(gl_PointCoord-.5)*2.0;
 if(r>1.0)discard;
 float soft=exp(-r*r*4.7)*(1.0-smoothstep(.6,1.0,r));
 vec3 color=mix(uColor*(.76+.24*soft),vec3(.005,.008,.014),uDark);
 gl_FragColor=vec4(color,soft*vAlpha*uOpacity);
}`;
const blackHoleVertex = `
varying vec3 vNormal;varying vec3 vView;
void main(){vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
const blackHoleFragment = `
uniform float opacity;varying vec3 vNormal;varying vec3 vView;
void main(){float mu=max(0.0,dot(normalize(vNormal),normalize(vView)));vec3 color=vec3(.004,.006,.01)+vec3(.055,.07,.09)*pow(1.0-mu,5.0);gl_FragColor=vec4(color,opacity);
#include <colorspace_fragment>
}`;
const shellVertex = `
varying vec3 vNormal;varying vec3 vView;varying vec3 vLocal;
void main(){vec3 p=position*(1.0+.025*sin(position.x*19.0+position.y*7.0)*sin(position.z*13.0));vLocal=p;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(p,1.0);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
const shellFragment = `
uniform vec3 uColor;uniform float uOpacity;uniform float uCutaway;
varying vec3 vNormal;varying vec3 vView;varying vec3 vLocal;
void main(){if(uCutaway>.5&&vLocal.z>.04)discard;float mu=abs(dot(normalize(vNormal),normalize(vView)));float rim=pow(1.0-mu,2.6);float filament=.5+.5*sin(vLocal.x*29.0+sin(vLocal.y*19.0)+vLocal.z*23.0);gl_FragColor=vec4(uColor,(.004+.14*rim)*(.65+.35*filament)*uOpacity);}`;
const filamentVertex='varying vec3 vLocal;void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const filamentFragment=`uniform vec3 uColor;uniform float uOpacity;uniform float uCutaway;varying vec3 vLocal;
void main(){
 if(uCutaway>.5&&vLocal.z>.04)discard;
 float detail=.5+.5*sin(vLocal.x*39.0+vLocal.y*21.0-vLocal.z*31.0);
 gl_FragColor=vec4(uColor*(1.12+.35*detail),uOpacity*(.68+.32*detail));
 #include <colorspace_fragment>
}`;

function shellFilaments(){
  const points:number[]=[];
  for(let strand=0;strand<26;strand++){
    const start=spaceRandom(strand+306)*Math.PI*2,length=.45+spaceRandom(strand+771)*1.65,latitude=(spaceRandom(strand+889)-.5)*2.2;
    const point=(t:number)=>{const a=start+t*length,lat=latitude+.13*Math.sin(a*6+strand)+.04*Math.sin(a*21+strand),radius=.91+.065*Math.sin(a*5+strand);return [Math.cos(a)*Math.cos(lat)*radius,Math.sin(lat)*radius,Math.sin(a)*Math.cos(lat)*radius];};
    let previous=point(0);for(let j=1;j<=30;j++){const next=point(j/30);points.push(...previous,...next);previous=next;}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));return geometry;
}

/** One retained WebGL world. It has no animation loop and never advances science
 * time: the topic supplies snapshots and its independent surface clock. */
export class StellarSpace3D {
  private renderer: THREE.WebGLRenderer;
  private world=new THREE.Scene();
  private camera=new THREE.PerspectiveCamera(36,1,.05,70);
  private controls:OrbitControls;
  private sphere=new THREE.SphereGeometry(1,56,32);
  private blackHoleMaterial=new THREE.ShaderMaterial({vertexShader:blackHoleVertex,fragmentShader:blackHoleFragment,transparent:true,uniforms:{opacity:{value:1}}});
  private blackHole=new THREE.Mesh(this.sphere,this.blackHoleMaterial);
  private photosphere=createStellarPortrait('sun',{energySection:false});
  private compactSurface=createStellarPortrait('white-dwarf',{energySection:false});
  private medium=new StellarMedium();
  private volume=createNebulaPortrait('nebula',{medium:this.medium.medium,steps:96,depthTest:false});
  private shellMaterial=new THREE.ShaderMaterial({vertexShader:shellVertex,fragmentShader:shellFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uColor:{value:new THREE.Color('#81b6c2')},uOpacity:{value:0},uCutaway:{value:0}}});
  private shell=new THREE.Mesh(this.sphere,this.shellMaterial);
  private positions=new Float32Array(SPACE_PARTICLES*3);
  private alphas=new Float32Array(SPACE_PARTICLES);
  private filamentMaterial=new THREE.ShaderMaterial({vertexShader:filamentVertex,fragmentShader:filamentFragment,transparent:true,depthWrite:false,uniforms:{uColor:{value:new THREE.Color()},uOpacity:{value:0},uCutaway:{value:0}}});
  private filaments=new THREE.LineSegments(shellFilaments(),this.filamentMaterial);
  private jets:THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;
  private background:THREE.Points<THREE.BufferGeometry,THREE.PointsMaterial>;
  private skyField?:THREE.DataTexture;
  private skyKey='';
  private skyStars=new THREE.Points(new THREE.BufferGeometry(),new THREE.ShaderMaterial({
    vertexShader:'attribute float aSize;attribute float aBrightness;attribute float aWarmth;uniform float uPixelRatio;varying float vBrightness;varying float vWarmth;void main(){vBrightness=aBrightness;vWarmth=aWarmth;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uPixelRatio;}',
    fragmentShader:`varying float vBrightness;varying float vWarmth;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float core=exp(-r*r*38.);float halo=exp(-r*r*5.)*.12*(1.-smoothstep(.65,1.,r));vec3 color=mix(vec3(.60,.78,1.),vec3(1.,.84,.62),vWarmth);gl_FragColor=vec4(color,(core+halo)*vBrightness);
    #include <colorspace_fragment>
    }`,transparent:true,depthWrite:false,uniforms:{uPixelRatio:{value:1}}}));
  private backdropMaterial=new THREE.ShaderMaterial({vertexShader:'varying vec3 vP;varying vec2 vUv;void main(){vP=position;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec3 vP;varying vec2 vUv;uniform vec3 uTop;uniform vec3 uBottom;uniform sampler2D uSkyField;uniform vec3 uWarm;uniform vec3 uCool;uniform float uStrength;
void main(){
 vec4 field=texture2D(uSkyField,vUv);float band=smoothstep(-.20,.20,normalize(vP).y);vec3 color=mix(uBottom,uTop,band)*(1.-field.b*.40)+mix(uWarm,uCool,field.a)*field.r*uStrength+uCool*field.g*.025;gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
}`,uniforms:{uTop:{value:new THREE.Color()},uBottom:{value:new THREE.Color()},uSkyField:{value:null},uWarm:{value:new THREE.Color()},uCool:{value:new THREE.Color()},uStrength:{value:0}},side:THREE.BackSide,depthWrite:false,depthTest:false});
  private backdrop=new THREE.Mesh(this.sphere,this.backdropMaterial);
  private resize:ResizeObserver;
  private key:(event:KeyboardEvent)=>void;
  private lost:(event:Event)=>void;
  private disposed=false;
  private geometryKey='';
  private input?:SpaceInput;
  private observing=false;
  private presentation=new FrameRender(()=>this.renderNow());
  private volumeSampling(){return this.input?.chapter==='nebulae'&&this.input.nebula==='nursery'?(this.observing?64:this.input.reference&&this.input.reference!=='orion'?96:80):48;}

  constructor(private canvas:HTMLCanvasElement,private onFailure:()=>void){
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
    this.renderer.setClearColor('#050a14');
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.controls=new OrbitControls(this.camera,canvas);
    this.controls.enableDamping=false;this.controls.enablePan=false;
    this.controls.minDistance=6;this.controls.maxDistance=19;
    this.controls.addEventListener('change',()=>this.render());
    this.controls.addEventListener('start',()=>{this.observing=true;this.volume.setAppearance({samplingSteps:this.volumeSampling()});});
    this.controls.addEventListener('end',()=>{this.observing=false;this.volume.setAppearance({samplingSteps:this.volumeSampling()});this.render();});
    const jetsGeometry=new THREE.BufferGeometry(),jetPositions=new Float32Array(220*3);
    for(let i=0;i<220;i++){const h=spaceRandom(i+241),a=spaceRandom(i+373)*Math.PI*2,r=(.02+h*.19)*spaceRandom(i+91);jetPositions.set([Math.cos(a)*r,(i%2?1:-1)*(.5+h*3),Math.sin(a)*r],i*3);}
    jetsGeometry.setAttribute('position',new THREE.BufferAttribute(jetPositions,3));
    jetsGeometry.setAttribute('aAlpha',new THREE.BufferAttribute(Float32Array.from({length:220},(_,i)=>.25+.5*spaceRandom(i+91)),1));
    jetsGeometry.setAttribute('aSize',new THREE.BufferAttribute(new Float32Array(220).fill(.28),1));
    this.jets=new THREE.Points(jetsGeometry,new THREE.ShaderMaterial({vertexShader:particleVertex,fragmentShader:particleFragment,transparent:true,depthWrite:false,uniforms:{uColor:{value:new THREE.Color('#a6d3e4')},uOpacity:{value:0},uPointScale:{value:420},uSizeScale:{value:1},uDark:{value:0},uCutaway:{value:0},uCutZ:{value:0}}}));
    const backgroundGeometry=new THREE.BufferGeometry(),bgPositions=new Float32Array(360*3);
    for(let i=0;i<360;i++){const a=spaceRandom(i+63)*Math.PI*2,z=spaceRandom(i+168)*2-1,r=Math.sqrt(1-z*z);bgPositions.set([Math.cos(a)*r*24,z*24,Math.sin(a)*r*24],i*3);}
    backgroundGeometry.setAttribute('position',new THREE.BufferAttribute(bgPositions,3));
    this.background=new THREE.Points(backgroundGeometry,new THREE.PointsMaterial({color:'#b9cce3',size:.035,sizeAttenuation:true,transparent:true,opacity:.55,depthWrite:false}));
    this.backdrop.scale.setScalar(27);this.backdrop.renderOrder=-2;this.backdrop.visible=false;
    this.skyStars.renderOrder=-1;this.skyStars.visible=false;
    this.volume.group.scale.setScalar(SPACE_VOLUME_EXTENT);
    this.volume.group.traverse(object=>{object.renderOrder=2;object.frustumCulled=false;});
    for(const portrait of [this.photosphere,this.compactSurface])portrait.group.traverse(object=>{object.renderOrder=1;});
    this.world.add(this.backdrop,this.background,this.skyStars,this.jets,this.shell,this.filaments,this.blackHole,this.photosphere.group,this.compactSurface.group,this.volume.group);
    this.blackHole.renderOrder=1;this.shell.renderOrder=3;
    this.key=event=>{if(!this.input||this.disposed)return;const delta=event.key==='ArrowLeft'?-.12:event.key==='ArrowRight'?.12:0,tilt=event.key==='ArrowUp'?-.1:event.key==='ArrowDown'?.1:0;
      if(!delta&&!tilt&&event.key!=='+'&&event.key!=='-'&&event.key!=='Home')return;event.preventDefault();if(event.key==='Home'){this.resetCamera();return;}
      const spherical=new THREE.Spherical().setFromVector3(this.camera.position);spherical.theta+=delta;spherical.phi=THREE.MathUtils.clamp(spherical.phi+tilt,.1,Math.PI-.1);if(event.key==='+'||event.key==='-')spherical.radius=THREE.MathUtils.clamp(spherical.radius*(event.key==='+'?.9:1.1),6,19);this.camera.position.setFromSpherical(spherical);this.controls.update();this.render();};
    canvas.addEventListener('keydown',this.key);
    this.lost=event=>{event.preventDefault();if(!this.disposed)this.onFailure();};canvas.addEventListener('webglcontextlost',this.lost);
    this.resize=new ResizeObserver(()=>this.resizeCanvas());this.resize.observe(canvas);
    this.resetCamera();this.resizeCanvas();
  }
  private frameCamera(){this.camera.zoom=this.input?stellarObservationZoom(this.input,this.camera.aspect):1;this.camera.updateProjectionMatrix();}
  private resizeCanvas(){if(this.disposed)return;const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75,Math.sqrt(2_000_000/(w*h))));this.renderer.setSize(w,h,false);this.skyStars.material.uniforms.uPixelRatio!.value=this.renderer.getPixelRatio();this.camera.aspect=w/h;this.frameCamera();const scale=Math.min(w,h)*1.15;this.jets.material.uniforms.uPointScale!.value=scale;this.render();}
  draw(input:SpaceInput,time:number,cutaway:boolean){
    if(this.disposed)return;this.input=input;const frame=stellarSpaceFrame(input);this.frameCamera();
    const key=input.chapter==='nebulae'?['nebulae',input.nebula,input.nebula==='nursery'?(input.reference??'orion'):''].join('|'):[input.chapter,input.track,input.progress].join('|');
    if(this.geometryKey!==key){this.geometryKey=key;writeSpaceParticles(frame,this.positions,this.alphas);this.medium.update(frame,this.positions,this.alphas);this.volume.updateMedium();}
    const sourceStar=input.chapter==='nebulae'&&input.nebula==='nursery';
    const cloud=sourceStar?nebulaCloudAppearance(input.reference??'orion'):undefined;
    this.blackHole.visible=frame.blackHole&&frame.starOpacity>0;this.blackHole.scale.setScalar(frame.starRadius);this.blackHoleMaterial.uniforms.opacity!.value=frame.starOpacity;
    const dark=input.chapter==='nebulae'&&input.nebula==='nursery'&&input.illumination==='dark',reflection=input.chapter==='nebulae'&&input.nebula==='nursery'&&input.illumination==='reflection';
    for(const [portrait,compact]of [[this.photosphere,false],[this.compactSurface,true]] as const){
      const surfaceOpacity=frame.starOpacity*(compact?frame.compactBlend:1-frame.compactBlend);
      portrait.group.visible=!sourceStar&&!frame.blackHole&&surfaceOpacity>0;
      portrait.group.position.set(0,0,0);portrait.group.scale.setScalar(frame.starRadius/.85);
      const profile=compact?'compact':frame.surfaceProfile==='compact'?(input.track==='low-mass'?'red-dwarf':'red-giant'):frame.surfaceProfile;
      portrait.setAppearance({color:frame.starColor,opacity:surfaceOpacity,time,profile,emission:frame.emission,
        activeRegions:input.track==='low-mass'?.8:input.track==='solar'?.8:.25,glare:frame.glare});
    }
    this.backdrop.visible=sourceStar;this.background.visible=!sourceStar;this.skyStars.visible=sourceStar;
    if(sourceStar){
      const reference=input.reference??'orion';
      if(!this.skyField){this.skyField=new THREE.DataTexture(new Uint8Array(NEBULA_SKY_WIDTH*NEBULA_SKY_HEIGHT*4),NEBULA_SKY_WIDTH,NEBULA_SKY_HEIGHT);this.skyField.minFilter=THREE.LinearFilter;this.skyField.magFilter=THREE.LinearFilter;this.skyField.wrapS=THREE.RepeatWrapping;this.backdropMaterial.uniforms.uSkyField!.value=this.skyField;}
      if(this.skyKey!==reference){
        this.skyKey=reference;writeNebulaEnvironment(reference,this.skyField.image.data as Uint8Array);this.skyField.needsUpdate=true;
        const stars=nebulaEnvironmentStars(reference),g=this.skyStars.geometry;
        // One current geometry. Refilling equal-sized attributes does not retain
        // another case or detach GPU buffers that need separate disposal.
        const attribute=(name:string,values:number[],size:number)=>{const old=g.getAttribute(name);if(old){(old.array as Float32Array).set(values);old.needsUpdate=true;}else g.setAttribute(name,new THREE.Float32BufferAttribute(values,size));};
        attribute('position',stars.flatMap(s=>[...s.position]),3);attribute('aSize',stars.map(s=>s.size),1);attribute('aBrightness',stars.map(s=>s.brightness),1);attribute('aWarmth',stars.map(s=>s.warmth),1);g.computeBoundingSphere();
      }
      const palette=nebulaEnvironmentPalette(reference,input.illumination),uniforms=this.backdropMaterial.uniforms;
      for(const [name,color]of [['uTop',palette.top],['uBottom',palette.bottom],['uWarm',palette.warm],['uCool',palette.cool]] as const)uniforms[name]!.value.set(color);
      uniforms.uStrength!.value=palette.strength;
    }
    // Evolution follows its numbered parcels; independent nursery references
    // use the topic's authored cloud fields. Both share one retained volume.
    const opened=cutaway&&frame.shellOpacity>.01;
    this.volume.group.visible=frame.cloudOpacity>.001||frame.shellOpacity>.001;
    this.volume.setAppearance({illumination:sourceStar?input.illumination:'emission',structure:frame.kind==='planetary'?'planetary':frame.kind==='supernova'?'remnant':'cloud',cutaway:opened,cutZ:.04*frame.shellRadius/SPACE_VOLUME_EXTENT,
      samplingSteps:this.volumeSampling(),
      densityDisplacement:cloud?.densityDisplacement??.045,emissionVariation:cloud?.emissionVariation??1,dustVariation:cloud?.dustVariation??1,
      dustLight:cloud?.dustLight??0,dustDetailTransform:cloud?.dustDetailTransform??[1.9,0,0,0,1.9,0,0,0,1.9],
      cool:reflection?'#87b5dc':cloud?.cool??(frame.kind==='planetary'?'#21d6d0':frame.kind==='supernova'?'#30bff3':'#32c8ec'),
      accent:reflection?'#a2b0ca':cloud?.accent??(frame.kind==='planetary'?'#7570ec':frame.kind==='supernova'?'#f14c78':'#bd3bda'),
      warm:cloud?.warm??(frame.kind==='planetary'?'#ff9858':frame.kind==='supernova'?'#ffa24b':'#ff4e7d'),
      gasExtinction:.52-.24*frame.shellBlend,dustExtinction:cloud?.dustExtinction??(dark?14:4.8-4*frame.shellBlend),
      luminosity:frame.kind==='planetary'?8.5:frame.kind==='supernova'?12:reflection?5.2:6.5,
      sources:cloud&&!dark?cloud.sources:[],lightPosition:cloud?.lightPosition??[1.8/SPACE_VOLUME_EXTENT,.3/SPACE_VOLUME_EXTENT,0]});
    this.shell.visible=frame.shellOpacity>.001;this.shell.scale.set(frame.shellRadius,frame.shellRadius*frame.shellFlattening,frame.shellRadius);
    this.shellMaterial.uniforms.uColor!.value.set(frame.kind==='planetary'?'#29c9d5':'#f78652');this.shellMaterial.uniforms.uOpacity!.value=frame.shellOpacity*.35;this.shellMaterial.uniforms.uCutaway!.value=Number(opened);
    this.filaments.visible=frame.kind==='supernova'&&frame.shellOpacity>.001;this.filaments.scale.copy(this.shell.scale);this.filamentMaterial.uniforms.uColor!.value.set('#ffb46e');this.filamentMaterial.uniforms.uOpacity!.value=frame.shellOpacity*.12;this.filamentMaterial.uniforms.uCutaway!.value=Number(opened);
    this.jets.visible=frame.jetOpacity>.001;this.jets.material.uniforms.uOpacity!.value=frame.jetOpacity*.65;
    this.render();
  }
  resetCamera(){this.camera.position.set(6.3,3.4,9.2);this.controls.target.set(0,0,0);this.controls.update();this.render();}
  private render(){this.presentation.request();}
  private renderNow(){if(!this.disposed&&!document.hidden&&this.canvas.isConnected&&!this.canvas.parentElement?.hidden){try{this.renderer.render(this.world,this.camera);}catch{this.onFailure();}}}
  dispose(){if(this.disposed)return;this.disposed=true;this.presentation.dispose();this.resize.disconnect();this.canvas.removeEventListener('keydown',this.key);this.canvas.removeEventListener('webglcontextlost',this.lost);this.controls.dispose();this.sphere.dispose();this.blackHoleMaterial.dispose();this.shellMaterial.dispose();this.backdropMaterial.dispose();this.skyField?.dispose();this.skyStars.geometry.dispose();this.skyStars.material.dispose();this.filaments.geometry.dispose();this.filamentMaterial.dispose();this.jets.geometry.dispose();this.jets.material.dispose();this.background.geometry.dispose();this.background.material.dispose();
    for(const portrait of [this.photosphere,this.compactSurface,this.volume]){portrait.dispose();portrait.group.traverse(object=>{const mesh=object as THREE.Mesh;mesh.geometry?.dispose();if(Array.isArray(mesh.material))for(const material of mesh.material)material.dispose();else mesh.material?.dispose();});}
    this.world.clear();this.renderer.renderLists.dispose();this.renderer.dispose();this.renderer.forceContextLoss();}
}
