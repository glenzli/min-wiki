import * as THREE from 'three';
import { animateValue } from '../../src/visuals/transition.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { organization, airParcel, circulationDirection, smooth, type Settings } from './model.ts';
import { relief, eyewalls, eyeRadius, type StormStructure } from './cloudField.ts';
import { CloudEvolution } from './evolution.ts';
export type SceneView='natural'|'flow'|'section';
export type CameraView='oblique'|'top'|'side';
export interface SceneState { progress:number; circulation:number; settings:Settings; view:SceneView; structure:StormStructure; replacement:number; feature:string }
const vertex=`varying vec3 worldPoint;void main(){vec4 p=modelMatrix*vec4(position,1.);worldPoint=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`;
const fragment=`
precision highp float;
precision highp sampler3D;
varying vec3 worldPoint;
uniform sampler2D field, convection;
uniform sampler3D grain;
uniform float organized, phase, direction, coverage, replacementMode, exchange, cutaway, shear;
vec2 spin(vec2 v,float a){return mat2(cos(a),sin(a),-sin(a),cos(a))*v;}
float rise(float a,float b,float x){return smoothstep(a,b,x);}
float density(vec3 p){
  if(p.y<3.||p.y>168.||abs(p.x)>255.||abs(p.z)>255.)return 0.;
  float r=length(p.xz);
  // The same transported cloud field is used throughout genesis. Mature motion is
  // a bounded continuation; no second whole-storm density is cross-faded in.
  vec2 drift=vec2(5.*sin(phase*.018),3.*sin(phase*.013))*(1.-organized);
  vec2 domain=spin(p.xz-drift-vec2(shear*p.y*.09*(1.-organized),0.),-direction*phase*.015*organized);
  if(direction>0.)domain.x=-domain.x;
  vec2 uv=domain/520.+.5;
  vec4 f=texture2D(field,uv);
  vec3 cell=texture2D(convection,uv).rgb;
  float n=texture(grain,vec3(spin(p.xz,-direction*phase*.044)*.0035,p.y*.0045)).r;
  float fine=texture(grain,p.xzy*.014).r;
  float tilt=p.y*.075*rise(.48,.92,organized);
  float tiltedR=r-tilt+(f.g-.5)*8.+1.6*sin(atan(p.z,p.x)*5.);
  float developed=rise(.45,.94,organized);
  float inner=1.-replacementMode*rise(.36,.82,exchange);
  float outer=replacementMode*rise(.02,.34,exchange);
  float outerR=96.-54.*rise(.48,1.,exchange);
  float wallA=exp(-pow((tiltedR-36.)/10.,2.))*inner;
  float outerRelief=(f.g-.5)*12.+4.*sin(atan(p.z,p.x)*3.+.4);
  float wallB=exp(-pow((tiltedR-outerR-outerRelief)/13.,2.))*outer;
  float walls=max(wallA,wallB)*developed*mix(1.,.18,coverage);
  float hole=rise(20.,31.,tiltedR);
  float outerHole=mix(23.,outerR-13.,rise(.68,.98,exchange));
  hole=mix(hole,rise(outerHole,outerHole+10.,tiltedR),replacementMode);
  hole=mix(1.,hole,rise(.61,.98,organized)*(1.-coverage));
  float gap=rise(48.,58.,r)*(1.-rise(outerR-20.,outerR-10.,r));
  float moat=1.-gap*outer*inner*.92;
  // Local replacement-wall growth and local subsidence act on the evolving field.
  float oldWallLoss=1.-replacementMode*rise(.36,.82,exchange)*exp(-pow((tiltedR-36.)/18.,2.))*.96;
  float cover=cell.r*oldWallLoss+wallB*(.34+.28*f.g)*developed;
  float base=cell.b*32.,top=base+(cell.g*128.-base)*(.48+.52*cell.r)+12.*(n-.5)+walls*22.;
  top=max(top,wallB*developed*(83.+28.*f.g+10.*n));
  float envelope=rise(.075,.62,cover+.13*(n-.5));
  float vertical=rise(base-4.,base+6.,p.y)*(1.-rise(top-11.,top+6.,p.y));
  float billows=rise(.32,.83,n*.78+f.g*.25+fine*.2);
  float cloud=envelope*vertical*(.13+billows*1.85)*hole*moat;
  // Thin anvil outflow grows with deep convection, remaining translucent.
  float cirrus=rise(.3,.92,organized)*(1.-rise(130.,240.,r))*rise(48.,87.,r)*rise(102.,117.,p.y)*(1.-rise(126.,143.,p.y))*rise(.57,.79,f.b)*.16;
  float slice=1.-rise(mix(265.,0.,cutaway),mix(269.,3.,cutaway),p.z);
  return max(0.,cloud+cirrus)*slice;
}
void main(){
  vec3 origin=cameraPosition,ray=normalize(worldPoint-origin);
  vec3 inv=1./ray;
  vec3 aa=(vec3(-260.,0.,-260.)-origin)*inv,bb=(vec3(260.,174.,260.)-origin)*inv;
  vec3 lo=min(aa,bb),hi=max(aa,bb);
  float start=max(max(lo.x,lo.y),max(lo.z,0.)),end=min(min(hi.x,hi.y),hi.z);
  if(end<=start)discard;
  float stepSize=(end-start)/112.;
  vec4 accum=vec4(0.);
  vec3 sun=normalize(vec3(-.55,.83,.38));
  for(int i=0;i<112;i++){
    float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
    vec3 p=origin+ray*(start+(float(i)+.45+jitter*.1)*stepSize);
    float d=density(p);
    if(d>.012){
      float shade=exp(-density(p+sun*9.)*1.55);
      float topLight=.55+.45*rise(13.,124.,p.y);
      vec3 color=mix(vec3(.36,.49,.56),vec3(1.,.987,.929),shade*.72+topLight*.28);
      float alpha=1.-exp(-d*stepSize*.088);
      accum.rgb+=(1.-accum.a)*alpha*color;
      accum.a+=(1.-accum.a)*alpha;
      if(accum.a>.986)break;
    }
  }
  if(accum.a<.012)discard;
  gl_FragColor=vec4(accum.rgb/max(accum.a,.001),accum.a);
}`;
function fieldTexture(){
  const size=256,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const p=relief((x+.5)/size*520-260,(y+.5)/size*520-260),i=(y*size+x)*4;
    data[i]=p.bands*255;data[i+1]=p.detail*255;data[i+2]=(p.detail*.6+p.bands*.4)*255;data[i+3]=p.scatter*255;
  }
  const make=(pixels:Uint8Array<ArrayBuffer>)=>{const texture=new THREE.DataTexture(pixels,size,size);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;};
  return make(data);
}
function grainTexture(){
  const size=32,data=new Uint8Array(size**3);let seed=91731;
  for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed>>>24;}
  const texture=new THREE.Data3DTexture(data,size,size,size);texture.format=THREE.RedFormat;texture.type=THREE.UnsignedByteType;
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.wrapS=texture.wrapT=texture.wrapR=THREE.RepeatWrapping;texture.unpackAlignment=1;texture.needsUpdate=true;return texture;
}
export class TopicScene {
  private renderer:THREE.WebGLRenderer;
  private world=new THREE.Scene();private camera=new THREE.PerspectiveCamera(39,1,1,2400);
  private controls:OrbitControls;private observer:ResizeObserver;private field=fieldTexture();private grain=grainTexture();
  private evolution=new CloudEvolution();private cloudPixels=new Uint8Array(this.evolution.size**2*4);
  private convection=new THREE.DataTexture(this.cloudPixels,this.evolution.size,this.evolution.size);private cloudProgress=-1;
  private material:THREE.ShaderMaterial;private cloud:THREE.Mesh;private points:THREE.Points;private pointPositions=new Float32Array(144*3);private pointColors=new Float32Array(144*3);private pointAlpha=new Float32Array(144);
  private highlight:THREE.Mesh;private outerHighlight:THREE.Mesh;private guides=new THREE.Group();private disposed=false;private cancelCamera=()=>{};private cancelStructure=()=>{};private cancelSlice=()=>{};private structure:StormStructure='eye';private sliced=false;private guideKey='';
  constructor(private canvas:HTMLCanvasElement){
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setClearColor('#b5c9ce');this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.world.fog=new THREE.Fog('#b5c9ce',650,1450);
    this.camera.position.set(280,490,365);this.controls=new OrbitControls(this.camera,canvas);this.controls.target.set(0,47,0);
    this.controls.enableDamping=false;this.controls.enablePan=false;this.controls.enableZoom=false;
    this.controls.minPolarAngle=.025;this.controls.maxPolarAngle=Math.PI*.49;this.controls.rotateSpeed=.6;this.controls.update();
    this.controls.addEventListener('change',this.render);this.controls.addEventListener('start',()=>this.cancelCamera());
    const ocean=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),new THREE.MeshBasicMaterial({color:'#397789',fog:true}));ocean.rotation.x=-Math.PI/2;this.world.add(ocean);
    // Sparse wave glints provide depth without becoming a scale grid.
    const wavePoints=[];for(let i=0;i<480;i++){const x=Math.sin(i*127.1)*830,z=Math.cos(i*313.9)*830;wavePoints.push(x,.2,z,x+4+(i%11),.2,z+1);}
    const waveGeo=new THREE.BufferGeometry();waveGeo.setAttribute('position',new THREE.Float32BufferAttribute(wavePoints,3));
    this.world.add(new THREE.LineSegments(waveGeo,new THREE.LineBasicMaterial({color:'#a9c7c8',transparent:true,opacity:.12})));
    this.convection.minFilter=this.convection.magFilter=THREE.LinearFilter;
    this.evolution.write(1,this.cloudPixels);this.convection.needsUpdate=true;this.cloudProgress=1;
    this.material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{field:{value:this.field},convection:{value:this.convection},grain:{value:this.grain},organized:{value:1},phase:{value:0},direction:{value:-1},coverage:{value:0},replacementMode:{value:0},exchange:{value:0},cutaway:{value:0},shear:{value:5}},side:THREE.BackSide,transparent:true,depthWrite:false,depthTest:false});
    this.cloud=new THREE.Mesh(new THREE.BoxGeometry(520,174,520),this.material);this.cloud.position.y=87;this.cloud.renderOrder=2;this.world.add(this.cloud);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.pointPositions,3));geo.setAttribute('color',new THREE.BufferAttribute(this.pointColors,3));geo.setAttribute('opacity',new THREE.BufferAttribute(this.pointAlpha,1));
    this.points=new THREE.Points(geo,new THREE.ShaderMaterial({vertexShader:`attribute vec3 color;attribute float opacity;varying vec3 tint;varying float visibility;void main(){tint=color;visibility=opacity;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(4300./-p.z,4.,8.);}`,fragmentShader:`varying vec3 tint;varying float visibility;void main(){float a=(1.-smoothstep(.3,.5,length(gl_PointCoord-.5)))*visibility;if(a<.02)discard;gl_FragColor=vec4(mix(tint*.32,tint,1.-smoothstep(.29,.43,length(gl_PointCoord-.5))),a);
#include <colorspace_fragment>
}`,transparent:true,depthTest:false,depthWrite:false}));this.points.renderOrder=4;this.world.add(this.points);
    this.highlight=new THREE.Mesh(new THREE.TorusGeometry(1,.028,8,140),new THREE.MeshBasicMaterial({color:'#e9bf71',transparent:true,opacity:.8,depthTest:false}));
    this.highlight.rotation.x=Math.PI/2;this.highlight.renderOrder=5;this.world.add(this.highlight);this.outerHighlight=this.highlight.clone();this.outerHighlight.material=(this.highlight.material as THREE.Material).clone();this.world.add(this.outerHighlight);
    this.makeGuides();this.world.add(this.guides);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();
  }
  private makeGuides(){
    for(let i=0;i<5;i++){
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(71*3),3));
      const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:i===4?'#78cce3':'#b27624',transparent:true,opacity:.88,depthTest:false}));line.renderOrder=4;this.guides.add(line);
    }
  }
  private updateGuides(structure:StormStructure,replacement:number){
    const key=structure+replacement.toFixed(3);if(key===this.guideKey)return;this.guideKey=key;
    const walls=eyewalls(structure,replacement);
    for(let i=0;i<5;i++){
      const line=this.guides.children[i] as THREE.Line<THREE.BufferGeometry,THREE.LineBasicMaterial>,outer=i>=2&&i<4;
      const radius=outer?walls.outerRadius:walls.innerRadius,strength=outer?walls.outerStrength:walls.innerStrength,sign=i%2===0?-1:1;
      const p=i===4?[new THREE.Vector3(0,124,2),new THREE.Vector3(2,69,2),new THREE.Vector3(0,22,2)]:[
        new THREE.Vector3(sign*230,6,2),new THREE.Vector3(sign*(radius+35),8,2),new THREE.Vector3(sign*radius,28,2),
        new THREE.Vector3(sign*(radius+5),100,2),new THREE.Vector3(sign*(radius+25),139,2),new THREE.Vector3(sign*237,143,2)];
      const positions=line.geometry.attributes.position as THREE.BufferAttribute;
      new THREE.CatmullRomCurve3(p).getPoints(70).forEach((v,j)=>positions.setXYZ(j,v.x,v.y,v.z));positions.needsUpdate=true;line.geometry.computeBoundingSphere();
      line.visible=structure!=='covered'&&(i===4||strength>.01);line.material.opacity=i===4?.9:strength*.88;
    }
  }
  private transitionStructure(structure:StormStructure){
    if(structure===this.structure)return;this.structure=structure;this.cancelStructure();
    const u=this.material.uniforms,from=[u.coverage.value,u.replacementMode.value],to=[structure==='covered'?1:0,structure==='replacement'?1:0];
    this.cancelStructure=animateValue({from:0,to:1,duration:800,onUpdate:p=>{u.coverage.value=from[0]+(to[0]-from[0])*p;u.replacementMode.value=from[1]+(to[1]-from[1])*p;this.render();}});
  }
  private resize(){if(this.disposed)return;const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/Math.max(1,h);this.camera.zoom=Math.min(1,this.camera.aspect/1.3);this.camera.updateProjectionMatrix();this.render();}
  readonly render=()=>{if(!this.disposed)this.renderer.render(this.world,this.camera);};
  setCamera(view:CameraView){
    const distance=this.canvas.clientWidth<500?740:680;
    const positions={top:[0,distance,.1],oblique:[distance*.4,distance*.72,distance*.53],side:[0,distance*.21,distance]};
    this.cancelCamera();const from=this.camera.position.clone(),fromTarget=this.controls.target.clone(),to=new THREE.Vector3(...positions[view] as [number,number,number]),toTarget=new THREE.Vector3(0,view==='top'?0:53,0);
    this.cancelCamera=animateValue({from:0,to:1,duration:650,onUpdate:p=>{this.camera.position.lerpVectors(from,to,p);this.controls.target.lerpVectors(fromTarget,toTarget,p);this.controls.update();this.render();}});
  }
  draw(state:SceneState){
    const {settings,structure,replacement}=state,org=organization(state.progress,settings),u=this.material.uniforms;
    if(org!==this.cloudProgress){this.evolution.write(org,this.cloudPixels);this.convection.needsUpdate=true;this.cloudProgress=org;}
    u.organized.value=org;u.phase.value=state.circulation;u.direction.value=circulationDirection(settings.hemisphere);
    this.transitionStructure(structure);u.exchange.value=replacement;u.shear.value=settings.shear;
    const sliced=state.view==='section';if(sliced!==this.sliced){this.sliced=sliced;this.cancelSlice();this.cancelSlice=animateValue({from:u.cutaway.value,to:sliced?1:0,duration:650,onUpdate:p=>{u.cutaway.value=p;this.render();}});}
    this.points.visible=state.view!=='natural'&&org>.05;this.guides.visible=sliced&&org>.65;this.updateGuides(structure,replacement);
    const walls=eyewalls(structure,replacement),strength=org;
    for(let i=0;i<144;i++){
      const outer=structure==='replacement'&&i%2===1,wallRadius=structure==='covered'?8+(i%13)*7:outer?walls.outerRadius:walls.innerRadius;
      const weight=structure==='replacement'?(outer?walls.outerStrength:walls.innerStrength):1;
      const q=airParcel(i,state.circulation,settings.hemisphere,wallRadius),isDown=i>=120;
      const downPhase=(state.circulation*.05+i*.618)%1;
      const x=isDown?Math.sin(i*2.4)*10:q.x,y=isDown?130-downPhase*111:q.y,z=isDown?Math.cos(i*2.4)*10:q.z;
      this.pointPositions.set([x,y,z],i*3);
      const color=new THREE.Color(isDown?'#97d9ed':q.phase<.48?'#a0d2d0':q.phase<.72?'#f6c179':'#d2c5ed');
      this.pointAlpha[i]=isDown?(structure==='covered'?0:org*.8*smooth(0,.09,downPhase)*(1-smooth(.9,1,downPhase))):q.opacity*strength*weight;this.pointColors.set([color.r,color.g,color.b],i*3);
    }
    this.points.geometry.attributes.opacity.needsUpdate=true;this.points.geometry.attributes.position.needsUpdate=true;this.points.geometry.attributes.color.needsUpdate=true;
    this.highlight.visible=state.feature!=='none'&&org>.65&&(structure!=='covered'||state.feature==='bands');
    const radius=state.feature==='eye'?eyeRadius(structure,replacement)*.72:state.feature==='wall'?walls.innerRadius:155;
    (this.highlight.material as THREE.MeshBasicMaterial).opacity=state.feature==='wall'?walls.innerStrength*.8:.8;
    this.outerHighlight.visible=this.highlight.visible&&state.feature==='wall'&&walls.outerStrength>.01;this.outerHighlight.scale.setScalar(walls.outerRadius);this.outerHighlight.position.y=108;(this.outerHighlight.material as THREE.MeshBasicMaterial).opacity=walls.outerStrength*.8;
    this.highlight.scale.setScalar(radius);this.highlight.position.y=state.feature==='wall'?115:state.feature==='eye'?6:50;
    this.render();
  }
  dispose(){this.cancelCamera();this.cancelStructure();this.cancelSlice();this.disposed=true;this.observer.disconnect();this.controls.removeEventListener('change',this.render);this.controls.dispose();this.world.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.geometry)mesh.geometry.dispose();if(mesh.material){for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();}});this.evolution.dispose();this.field.dispose();this.convection.dispose();this.grain.dispose();this.renderer.dispose();}
}
