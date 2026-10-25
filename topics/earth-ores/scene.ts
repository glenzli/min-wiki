import * as THREE from 'three';
import { createThreeStage } from '../earth/threeStage.ts';
import { parseCamera, veinAt, veinCenter, type OreState } from './model.ts';
export interface OreScene{update(state:OreState):void;pause():void;resetCamera():void;dispose():void;}
/** One authored geological solid. Its material field remains fixed as a new face is exposed. */
export function createOreScene(host:HTMLElement,options:{label:string;camera:string;onCamera:(s:string)=>void;onUnavailable:()=>void}):OreScene{
 const restored=parseCamera(options.camera);
 const stage=createThreeStage(host,{label:options.label,cameraPosition:restored??[3.4,1.9,5.9],minDistance:3,maxDistance:15,background:'#14252d',onUnavailable:options.onUnavailable});
 const {scene,group,renderer}=stage;renderer.toneMappingExposure=.95;
 scene.children.forEach(object=>{if(object instanceof THREE.HemisphereLight)object.intensity=.85;else if(object instanceof THREE.DirectionalLight)object.intensity*=.7;});
 const studio=new THREE.Scene();studio.background=new THREE.Color('#101316');
 for(const [x,y,z,w,h,power]of[[-4,1,4,2,6,4],[4,-.5,1,.6,6,6],[1,4,-3,4,2,3]]){const mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});mat.color.setScalar(power);const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);card.position.set(x,y,z);card.lookAt(0,0,0);studio.add(card);}
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.025);pmrem.dispose();studio.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});studio.clear();scene.environment=environment.texture;
 const detail=innerWidth>=700&&!matchMedia('(pointer:coarse)').matches;
 const sectors=detail?96:64,rings=detail?22:14,count=(rings+1)*(sectors+1);
 const positions:number[]=[],indices:number[]=[],originalFront:number[]=[],xy:number[]=[];
 function relief(x:number,y:number){return .07*Math.sin(x*7.1+y*4.3)+.035*Math.sin(y*17.2-x*10.8)+.022*Math.cos(x*31+y*13);}
 for(let back=0;back<2;back++)for(let r=0;r<=rings;r++)for(let j=0;j<=sectors;j++){
  const a=j/sectors*Math.PI*2,f=r/rings,outline=1+.075*Math.sin(3*a+.6)+.045*Math.cos(7*a-.3);
  const x=Math.cos(a)*1.6*f*outline,y=Math.sin(a)*1.3*f*outline;
  const front=.73-.15*f*f+relief(x,y),z=back?-.69+.07*f+relief(x,y)*.5:front;
  positions.push(x,y,z);if(!back){originalFront.push(front);xy.push(x,y);}
  if(r<rings&&j<sectors){const a0=back*count+r*(sectors+1)+j,b0=a0+sectors+1;if(back)indices.push(a0,b0,a0+1,a0+1,b0,b0+1);else indices.push(a0,a0+1,b0,a0+1,b0+1,b0);}
 }
 for(let j=0;j<sectors;j++){const a=rings*(sectors+1)+j,b=a+count;indices.push(a,b,a+1,a+1,b,b+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const uniforms={quartz:{value:1},sulfide:{value:1},open:{value:1},transit:{value:0},progress:{value:1}};
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.7,metalness:.1,side:THREE.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.uniforms.oreQuartz=uniforms.quartz;shader.uniforms.oreSulfide=uniforms.sulfide;shader.uniforms.oreOpen=uniforms.open;shader.uniforms.oreTransit=uniforms.transit;shader.uniforms.oreProgress=uniforms.progress;
  shader.vertexShader='varying vec3 vOrePosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOrePosition=position;');
  shader.fragmentShader=`varying vec3 vOrePosition; uniform float oreQuartz; uniform float oreSulfide; uniform float oreOpen; uniform float oreTransit; uniform float oreProgress;
  float ohash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float onoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(ohash(i),ohash(i+vec3(1,0,0)),f.x),mix(ohash(i+vec3(0,1,0)),ohash(i+vec3(1,1,0)),f.x),f.y),mix(mix(ohash(i+vec3(0,0,1)),ohash(i+vec3(1,0,1)),f.x),mix(ohash(i+vec3(0,1,1)),ohash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 p=vOrePosition;float center=.14*sin(p.y*1.8)+.085*sin(p.z*2.1+p.y*.8);
   float width=.13+.035*sin(p.y*2.7+p.z*3.1);float mainVein=1.0-smoothstep(width-.008,width+.008,abs(p.x-center));
   float branchCenter=center+.45*(p.y+.16);float branch=(1.0-smoothstep(.035,.065,abs(p.x-branchCenter)))*smoothstep(-.8,-.2,p.y)*(1.0-smoothstep(.6,1.1,p.y));
   float fine=onoise(p*78.0),medium=onoise(p*14.0),broad=onoise(p*3.3);
   // A fixed field orders the authored fill reveal. It is not a measured growth
   // direction, a phase-equilibrium calculation or a pore-flow solution.
   float fillOrder=.12+.7*clamp((p.y+1.5)/3.0,0.0,1.0)+.16*onoise(p*4.1);
   float fill=oreQuartz>=.9999?1.0:smoothstep(fillOrder-.08,fillOrder+.08,oreQuartz);
   float veinMask=max(mainVein,branch)*fill;
   vec3 host=mix(vec3(.12,.145,.15),vec3(.31,.34,.31),broad)*(.73+.34*fine);host+=vec3(.11,.065,.015)*smoothstep(.58,.8,medium);
   float bands=.5+.5*sin((p.x-center)*90.0+onoise(p*21.0)*2.0);
   vec3 quartz=mix(vec3(.62,.66,.62),vec3(.9,.91,.84),.45*medium+.4*bands+.15*fine);
   vec3 cell=floor(p*6.0);vec3 jitter=vec3(ohash(cell),ohash(cell+11.0),ohash(cell+29.0))*.5+.25;
   float grain=length(fract(p*6.0)-jitter);float metalReveal=smoothstep(.08+ohash(cell+17.0)*.8,.18+ohash(cell+17.0)*.8,oreSulfide);
   float metalPatch=(1.0-smoothstep(.38,.49,grain))*step(.57,ohash(cell+43.0))*veinMask*metalReveal;
   vec3 metal=mix(vec3(.43,.28,.065),vec3(.82,.63,.22),fine*.5+medium*.5);
   float voidMask=max(mainVein,branch)*oreOpen*(1.0-fill);
   float fluidY=mix(-1.6,1.5,clamp(oreProgress/.83,0.0,1.0));
   float fluidBand=exp(-pow((p.y-fluidY)/.42,2.0))*oreTransit;
   vec3 unfilled=mix(vec3(.035,.05,.055),vec3(.1,.27,.31),fluidBand*.8);
   diffuseColor.rgb=mix(mix(mix(host,unfilled,voidMask),quartz,veinMask),metal,metalPatch);
   `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(mix(.89,.26,veinMask),.16,metalPatch);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(.025,.76,metalPatch);');
  // Fine spatial relief is independent of camera, progress and cutting depth.
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+vec3(dFdx(fine)*.15,dFdy(fine)*.15,0.0)*(1.0-veinMask*.75));');
 };
 material.customProgramCacheKey=()=> 'authored-ore-vein-solid-v2';
 const specimen=new THREE.Mesh(geometry,material);specimen.rotation.set(.02,-.1,-.16);group.add(specimen);
 const mount=new THREE.Mesh(new THREE.CylinderGeometry(1.85,1.9,.12,64),new THREE.MeshStandardMaterial({color:'#20363e',roughness:.7,metalness:.1}));mount.rotation.x=Math.PI/2;mount.position.z=-.84;group.add(mount);
 const marker=new THREE.Mesh(new THREE.TorusGeometry(.13,.015,6,32),new THREE.MeshBasicMaterial({color:'#edbd66',transparent:true,opacity:.92,depthTest:false}));marker.renderOrder=6;specimen.add(marker);
 let disposed=false,lastCut=-1;
 const saveCamera=()=>{if(!disposed)options.onCamera(JSON.stringify(stage.camera.position.toArray().map(v=>Math.round(v*1e4)/1e4)));};
 stage.controls.addEventListener('end',saveCamera);stage.canvas.addEventListener('keyup',saveCamera);
 function update(state:OreState){
  if(disposed)return;const snapshot=veinAt(state);uniforms.quartz.value=snapshot.quartz;uniforms.sulfide.value=snapshot.sulfide;uniforms.open.value=snapshot.open?1:0;uniforms.transit.value=snapshot.inTransit;uniforms.progress.value=state.veinProgress/100;
  if(lastCut!==state.cut){lastCut=state.cut;const plane=.96-state.cut/100*1.15,attribute=geometry.getAttribute('position');for(let i=0;i<count;i++)attribute.setZ(i,Math.min(originalFront[i],plane));attribute.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();const z=Math.min(originalFront[0],plane);marker.position.set(veinCenter(0,z),0,z+.008);}
  stage.canvas.dataset.oreCut=String(state.cut);stage.canvas.dataset.oreQuartz=String(snapshot.quartz);stage.canvas.dataset.oreSulfide=String(snapshot.sulfide);stage.setPaused(false);stage.requestRender();
 }
 return{update,pause(){stage.setPaused(true);},resetCamera(){stage.resetCamera();saveCamera();},dispose(){if(disposed)return;disposed=true;stage.controls.removeEventListener('end',saveCamera);stage.canvas.removeEventListener('keyup',saveCamera);environment.dispose();stage.dispose();}};
}
