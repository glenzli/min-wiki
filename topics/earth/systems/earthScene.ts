import * as THREE from 'three';
import { createThreeStage } from '../threeStage.ts';
import { defaults, skyCameraPosition, cameraStateFromPosition, skyFrame, type SkyCameraState, type SystemsState } from './model.ts';

export interface EarthView {
  update: (state: SystemsState) => void;
  pause: () => void;
  resetCamera: () => void;
  dispose: () => void;
}
interface EarthViewContext {
  label: string;
  onCamera: (state: SkyCameraState) => void;
  onReady: () => void;
  onUnavailable: () => void;
}

/** A manually positioned Earth. Sun direction and site are the same as skyFrame.
 * Atmosphere rim and surface marker are explanatory geometry, not measured layer thickness.
 */
export function mountEarthView(host: HTMLElement, initial: SystemsState, context: EarthViewContext): EarthView {
  const stage = createThreeStage(host,{
    label: context.label, cameraPosition: skyCameraPosition(defaults), minDistance: 2.6,
    maxDistance: 8, background:'#06121e', onUnavailable: () => context.onUnavailable(),
  });
  let disposed = false, ready = false;
  const events = new AbortController();
  try {
  // The shared stage's exhibition lights must not illuminate the night hemisphere.
  for (const object of [...stage.scene.children]) if (object instanceof THREE.Light) stage.scene.remove(object);
  const sun = new THREE.DirectionalLight(0xfff4df,3.3); sun.position.set(-8,0,0); stage.scene.add(sun);
  stage.scene.add(new THREE.AmbientLight(0x7fabc5,.025));
  stage.renderer.toneMappingExposure = 1.06;
  stage.controls.minPolarAngle = Math.PI/18;
  stage.controls.maxPolarAngle = Math.PI*17/18;
  stage.camera.position.set(...skyCameraPosition(initial));stage.controls.update();

  const earth = new THREE.Group(); stage.group.add(earth);
  const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
  const sphere = new THREE.SphereGeometry(1,coarse?96:128,coarse?48:64);
  const material = new THREE.MeshPhongMaterial({color:0xffffff,shininess:9,specular:new THREE.Color('#1d2930')});
  const globe = new THREE.Mesh(sphere,material); earth.add(globe);
  const cloudMaterial = new THREE.MeshPhongMaterial({color:0xf6fcff,transparent:true,opacity:.7,depthWrite:false,shininess:0});
  const clouds = new THREE.Mesh(sphere,cloudMaterial); clouds.scale.setScalar(1.005); earth.add(clouds);
  clouds.visible = false;

  const atmosphereMaterial = new THREE.ShaderMaterial({
    transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{sunDirection:{value:new THREE.Vector3(-1,0,0)}},
    vertexShader:`varying vec3 worldNormal; varying vec3 worldPosition;
      void main(){worldNormal=normalize(mat3(modelMatrix)*normal);vec4 p=modelMatrix*vec4(position,1.0);worldPosition=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`uniform vec3 sunDirection; varying vec3 worldNormal; varying vec3 worldPosition;
      void main(){vec3 n=normalize(worldNormal);vec3 v=normalize(cameraPosition-worldPosition);float rim=pow(1.0-abs(dot(n,v)),3.0);float daylight=smoothstep(-0.15,0.5,dot(n,sunDirection));vec3 color=mix(vec3(.08,.19,.45),vec3(.23,.62,.86),daylight);gl_FragColor=vec4(color,rim*(.035+.40*daylight));}`,
  });
  const atmosphere = new THREE.Mesh(sphere,atmosphereMaterial); atmosphere.scale.setScalar(1.022); stage.group.add(atmosphere);

  // A retained equatorial site at longitude 0. SphereGeometry puts map u=0.5 at local +X.
  const marker = new THREE.Group(); marker.position.set(1.027,0,0); earth.add(marker);
  const markerMesh = new THREE.Mesh(new THREE.SphereGeometry(.014,16,10),new THREE.MeshBasicMaterial({color:0xffc05c})); marker.add(markerMesh);
  const markerRing = new THREE.Mesh(new THREE.TorusGeometry(.025,.003,8,32),new THREE.MeshBasicMaterial({color:0xffe1a0})); markerRing.rotation.y=Math.PI/2; marker.add(markerRing);
  const equatorPoints=Array.from({length:129},(_,i)=>new THREE.Vector3(Math.cos(i*Math.PI/64)*1.002,0,-Math.sin(i*Math.PI/64)*1.002));
  earth.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(equatorPoints),new THREE.LineBasicMaterial({color:0x8ed3da,transparent:true,opacity:.16})));
  // A world-fixed arrow indicates the incoming sunlight without inventing a miniature Sun.
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(-1.85,.18,.12),.54,0xe7bd6c,.09,.055); stage.group.add(arrow);

  const loader = new THREE.TextureLoader();
  const dayTexture = loader.load(new URL('../../earth-moon/assets/2k_earth_daymap.webp',import.meta.url).href,texture=>{
    if(disposed){texture.dispose();return;}
    ready=true; stage.canvas.style.visibility='visible'; context.onReady(); stage.requestRender();
  },undefined,()=>{if(!disposed)context.onUnavailable();});
  dayTexture.colorSpace=THREE.SRGBColorSpace;
  dayTexture.anisotropy=Math.min(4,stage.renderer.capabilities.getMaxAnisotropy());
  material.map=dayTexture; material.needsUpdate=true;
  const cloudTexture=loader.load(new URL('../../earth-moon/assets/2k_earth_clouds.webp',import.meta.url).href,texture=>{
    if(disposed){texture.dispose();return;}
    clouds.visible=true; stage.requestRender();
  },undefined,()=>{if(!disposed){clouds.visible=false;stage.requestRender();}});
  cloudMaterial.alphaMap=cloudTexture; cloudMaterial.needsUpdate=true;
  // Keep the accessible polar view available during texture preparation and failures.
  stage.canvas.style.visibility='hidden';

  const saveCamera=()=>{
    if(disposed)return;
    const p=stage.camera.position.clone().sub(stage.controls.target);
    context.onCamera(cameraStateFromPosition(p.x,p.y,p.z));
  };
  stage.controls.addEventListener('end',saveCamera);
  stage.canvas.addEventListener('pointerdown',()=>stage.setPaused(false),{signal:events.signal});
  stage.canvas.addEventListener('keydown',()=>{stage.setPaused(false);saveCamera();},{signal:events.signal});

  function update(state: SystemsState) {
    if(disposed)return;
    earth.rotation.y=skyFrame(state.skyHour).rotationRadians;
    stage.setPaused(false);stage.requestRender();
  }
  update(initial);
  return {
    update,
    pause(){stage.setPaused(true);},
    resetCamera(){stage.resetCamera();saveCamera();},
    dispose(){
      if(disposed)return;disposed=true;events.abort();stage.controls.removeEventListener('end',saveCamera);
      // Both textures are attached to scene materials, including while their requests are pending.
      stage.dispose();
      if(!ready)dayTexture.dispose();
      cloudTexture.dispose();
    },
  };
  } catch(error) {
    disposed=true;events.abort();
    stage.dispose();
    throw error;
  }
}
