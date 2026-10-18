import * as THREE from 'three';
import { EARTH_RADIUS, type Settings } from './model.ts';
import type { MechanismFrame } from './layerMechanism.ts';
import { blend, coastWeight, reliefHeight, surfaceBasis, surfacePoint, surfaceUV, surfaceViewFrame } from './surfaceModel.ts';
import { createCloudVolume } from './cloudVolume.ts';

const vertex=`
 varying vec3 vPoint; varying vec3 vNormal;
 void main(){vPoint=position;vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
const globalCloudFragment=`
 uniform sampler2D uCloud;uniform mat3 uBasis;uniform float uOpacity;
 varying vec3 vPoint;varying vec3 vNormal;
 void main(){
  vec3 dir=normalize(uBasis*normalize(vPoint));
  vec2 uv=vec2(atan(dir.y,dir.x)/6.28318530718+.5,asin(clamp(dir.z,-1.,1.))/3.14159265359+.5);
  float alpha=texture2D(uCloud,uv).g*uOpacity;
  float light=.45+.55*max(dot(normalize(vNormal),normalize(vec3(-.538,.763,.359))),0.);
  gl_FragColor=vec4(vec3(.82,.87,.85)*light,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
`;
const fragment=`
 uniform sampler2D uDay;uniform mat3 uBasis;uniform float uDetail;
 varying vec3 vPoint;varying vec3 vNormal;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){
  vec3 dir=normalize(uBasis*normalize(vPoint));
  vec2 uv=vec2(atan(dir.y,dir.x)/6.28318530718+.5,asin(clamp(dir.z,-1.,1.))/3.14159265359+.5);
  vec3 source=texture2D(uDay,uv).rgb;
  // Water/land classification uses the same sampled map throughout the zoom.
  // Convert to display-like RGB for this authored classification only.
  vec3 rgb=pow(max(source,vec3(0.)),vec3(1./2.2))*255.;
  float land=1.-smoothstep(6.,22.,rgb.b-max(rgb.r,rgb.g)*1.05);
  float rough=noise(vPoint.xz*.095),fine=noise(vPoint.xz*.43),alt=max(0.,length(vPoint)-6371.);
  vec3 grass=mix(vec3(.052,.105,.059),vec3(.13,.185,.105),rough);
  vec3 rock=mix(vec3(.12,.14,.129),vec3(.24,.255,.23),fine);
  vec3 localLand=mix(grass,rock,smoothstep(.45,1.35,alt)*.8);
  localLand*=.92+fine*.16;
  vec3 ocean=mix(vec3(.018,.071,.105),vec3(.065,.18,.21),smoothstep(.05,.65,land));
  vec3 local=mix(ocean,localLand,smoothstep(.38,.82,land));
  vec3 base=mix(source,local,uDetail*.9);
  vec3 n=normalize(vNormal),light=normalize(vec3(-.538,.763,.359));
  float water=1.-smoothstep(.35,.7,land);
  vec3 wave=vec3(sin(vPoint.x*1.1+vPoint.z*.65)*.025,0.,cos(vPoint.z*1.4-vPoint.x*.45)*.025);
  n=normalize(n+wave*water*uDetail);
  float diffuse=max(dot(n,light),0.);
  float shade=.36+.64*diffuse;
  // Static illustrative cloud shadows stay at their world-space locations.
  vec2 q=vPoint.xz-vec2(-7.,18.);
  float cloudShadow=exp(-dot(q/vec2(8.,5.),q/vec2(8.,5.)))*.17*uDetail;
  shade*=1.-cloudShadow;
  float spec=pow(max(dot(reflect(-light,n),vec3(0,0,1)),0.),70.);
  float fresnel=pow(1.-max(dot(n,vec3(0,0,1)),0.),5.);
  vec3 color=base*shade+vec3(.55,.65,.66)*spec*.15*water;
  color=mix(color,vec3(.13,.235,.29),fresnel*water*uDetail*.28);
  float wavePhase=vPoint.x*4.8+vPoint.z*.9+noise(vPoint.xz*.3)*5.;
  float ripple=pow(max(sin(wavePhase),0.),14.)*(1.-smoothstep(.2,1.2,fwidth(wavePhase)));
  color+=vec3(.035,.055,.06)*ripple*water*uDetail*(.3+.7*fresnel);
  // The shallow viewing angle softens distant ridges without whitening the sea.
  float haze=smoothstep(160.,850.,vPoint.z)*uDetail*.15;
  color=mix(color,vec3(.18,.29,.34),haze);
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
`;

/** Topic-owned GPU surface. One camera projects the globe, mapped coastal patch
 * and cloud volumes; Canvas annotations use the exact same orthographic scale.
 * No animation loop or scientific atmosphere state is owned here. */
export class AtmosphereSurface {
 private readonly renderer:THREE.WebGLRenderer;
 private readonly world=new THREE.Scene();
 private readonly camera=new THREE.OrthographicCamera();
 private readonly material:THREE.ShaderMaterial;
 private readonly globe:THREE.Mesh<THREE.SphereGeometry,THREE.ShaderMaterial>;
 private terrain?:THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
 private texture?:THREE.Texture;
 private cloudTexture?:THREE.Texture;
 private mapCloud?:THREE.Mesh<THREE.SphereGeometry,THREE.ShaderMaterial>;
 private readonly clouds=[createCloudVolume(11),createCloudVolume(29),createCloudVolume(47)];
 private disposed=false;private lost=false;private available=false;private key='';
 private width=0;private height=0;
 private readonly lostContext=(event:Event)=>{event.preventDefault();this.lost=true;this.changed();};
 private readonly restored=()=>{this.lost=false;this.key='';this.changed();};
 constructor(private changed:()=>void){
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
  this.renderer.setClearColor(0,0);this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.debug.onShaderError=()=>{this.available=false;console.warn('Atmosphere surface shader unavailable; using Canvas artwork.');};
  this.renderer.domElement.addEventListener('webglcontextlost',this.lostContext);
  this.renderer.domElement.addEventListener('webglcontextrestored',this.restored);
  const b=surfaceBasis,basis=new THREE.Matrix3().set(b.right[0],b.up[0],b.eye[0],b.right[1],b.up[1],b.eye[1],b.right[2],b.up[2],b.eye[2]);
  this.material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{uDay:{value:null},uBasis:{value:basis},uDetail:{value:0}}});
  this.globe=new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS,256,192),this.material);this.world.add(this.globe);
  for(const cloud of this.clouds)this.world.add(cloud.mesh);
  // Centers remain at reference radial altitudes; their shapes are enlarged.
  for(const [i,x,h,z,w,t,d]of [[0,-9,3,20,14,8,9],[1,14,2,28,8,4,5],[2,-2,5,24,9,5.5,6]]){
   this.clouds[i].mesh.position.set(x,Math.sqrt((EARTH_RADIUS+h)**2-x*x-z*z),z);
   this.clouds[i].mesh.scale.set(w,t,d);this.clouds[i].mesh.renderOrder=3+i;
  }
 }
 get ready(){return this.available&&!this.disposed&&!this.lost;}
 setMaps(day:HTMLImageElement,clouds:HTMLImageElement){
  if(this.disposed)return;
  this.texture=new THREE.Texture(day);this.texture.colorSpace=THREE.SRGBColorSpace;this.texture.needsUpdate=true;
  this.texture.wrapS=THREE.RepeatWrapping;this.texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
  this.material.uniforms.uDay.value=this.texture;
  const source=document.createElement('canvas');source.width=day.naturalWidth;source.height=day.naturalHeight;
  const c=source.getContext('2d',{willReadFrequently:true})!;c.drawImage(day,0,0);
  const data=c.getImageData(0,0,source.width,source.height).data,w=source.width,h=source.height;
  const sample=(x:number,z:number)=>{
   const p=surfacePoint(x,z),uv=surfaceUV(p.x,p.y,p.z),u=uv.u*w-.5,v=uv.v*h-.5,ix=Math.floor(u),iy=Math.floor(v),fx=u-ix,fy=v-iy;
   const color=[0,0,0];
   for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
    const offset=(Math.min(h-1,Math.max(0,iy+dy))*w+((ix+dx+w)%w))*4,weight=(dx?fx:1-fx)*(dy?fy:1-fy);
    for(let k=0;k<3;k++)color[k]+=data[offset+k]*weight;
   }return coastWeight(color[0],color[1],color[2]);
  };
  const nx=257,nz=321,positions=new Float32Array(nx*nz*3),indices:number[]=[];
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
   const tx=i/(nx-1)*2-1,tz=j/(nz-1)*2-1,x=Math.sign(tx)*880*tx*tx,z=tz<0?-295*tz*tz:1380*tz*tz;
   const p=surfacePoint(x,z,reliefHeight(x,z,sample(x,z))),offset=(j*nx+i)*3;positions.set([p.x,p.y,p.z],offset);
   if(i<nx-1&&j<nz-1){const a=j*nx+i,b=a+1,d=a+nx,e=d+1;indices.push(a,d,b,b,d,e);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  this.terrain=new THREE.Mesh(geometry,this.material);this.world.add(this.terrain);source.width=source.height=0;
  // The licensed cloud map keeps its global identity and dissolves as close
  // clouds become resolvable. It does not become a time-varying weather field.
  this.cloudTexture=new THREE.Texture(clouds);this.cloudTexture.needsUpdate=true;
  this.cloudTexture.wrapS=THREE.RepeatWrapping;
  const cloudMaterial=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:globalCloudFragment,transparent:true,depthWrite:false,uniforms:{
   uCloud:{value:this.cloudTexture},uBasis:{value:this.material.uniforms.uBasis.value},uOpacity:{value:.48},
  }});
  this.mapCloud=new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS+4,192,128),cloudMaterial);
  // Project per fragment so no triangle interpolates across the map's seam.
  this.world.add(this.mapCloud);this.available=true;this.key='';
 }
 draw(state:Settings,mechanism:MechanismFrame|null,width:number,height:number){
  if(!this.ready)return null;
  const view=surfaceViewFrame(state.journey,width,height),f=view.frame,scale=view.scale,detail=blend(.1,1.3,scale);
  const wet=mechanism?.layer===0&&mechanism.step===2?blend(0,.65,mechanism.progress):0;
  const key=[width,height,state.journey,wet].join(':');
  if(key!==this.key){
   this.key=key;
   if(width!==this.width||height!==this.height){this.width=width;this.height=height;this.renderer.setSize(width,height,false);}
   this.camera.left=-width/(2*scale);this.camera.right=width/(2*scale);this.camera.top=height/(2*scale);this.camera.bottom=-height/(2*scale);
   this.camera.near=.1;this.camera.far=40000;this.camera.position.set(0,-f.centerY+20000*view.sin,20000*view.cos);this.camera.lookAt(0,-f.centerY,0);this.camera.updateProjectionMatrix();
   this.material.uniforms.uDetail.value=detail;
   if(this.mapCloud)this.mapCloud.material.uniforms.uOpacity.value=.48*(1-blend(.08,.65,scale));
   this.clouds[0].setOpacity(blend(.1,1.3,scale)*.9);this.clouds[1].setOpacity(blend(.1,1.3,scale)*.7);this.clouds[2].setOpacity(wet);
   try{this.renderer.render(this.world,this.camera);}catch{this.available=false;return null;}
  }
  return this.ready?this.renderer.domElement:null;
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;
  this.renderer.domElement.removeEventListener('webglcontextlost',this.lostContext);this.renderer.domElement.removeEventListener('webglcontextrestored',this.restored);
  for(const cloud of this.clouds)cloud.dispose();this.globe.geometry.dispose();this.terrain?.geometry.dispose();this.mapCloud?.geometry.dispose();this.mapCloud?.material.dispose();
  this.texture?.dispose();this.cloudTexture?.dispose();this.material.dispose();this.renderer.dispose();this.renderer.forceContextLoss();
 }
}
