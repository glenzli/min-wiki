import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface ThreeStageOptions {
  label: string;
  cameraPosition?: [number,number,number];
  target?: [number,number,number];
  minDistance?: number;
  maxDistance?: number;
  background?: string;
  onUnavailable?: (error:unknown) => void;
}
export interface ThreeStage {
  scene: THREE.Scene;
  group: THREE.Group;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  canvas: HTMLCanvasElement;
  requestRender: () => void;
  setPaused: (paused:boolean) => void;
  resetCamera: () => void;
  dispose: () => void;
}

/** Presentation only: galleries own all geometry, material meaning and scientific state. */
export function createThreeStage(host:HTMLElement,options:ThreeStageOptions):ThreeStage {
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  const coarse=matchMedia('(pointer: coarse)').matches || innerWidth<700;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,coarse?1.35:1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  const scene=new THREE.Scene();scene.background=new THREE.Color(options.background??'#0c202d');
  const group=new THREE.Group();scene.add(group);
  const camera=new THREE.PerspectiveCamera(34,1,.03,250);
  const initial=new THREE.Vector3(...(options.cameraPosition??[3,2.2,5]));camera.position.copy(initial);
  const target=new THREE.Vector3(...(options.target??[0,0,0]));
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',options.label);
  canvas.dataset.earthWebgl='true';canvas.dataset.dpr=String(renderer.getPixelRatio());
  canvas.style.touchAction='pan-y';
  host.classList.add('earth-three-host');host.append(canvas);
  const controls=new OrbitControls(camera,canvas);
  controls.target.copy(target);controls.enableDamping=false;controls.enablePan=false;
  controls.minDistance=options.minDistance??2.2;controls.maxDistance=options.maxDistance??12;
  controls.minPolarAngle=.08;controls.maxPolarAngle=Math.PI-.08;
  controls.rotateSpeed=.65;controls.zoomSpeed=.75;controls.update();
  scene.add(new THREE.HemisphereLight(0xd4e8f3,0x2c2930,2.2));
  const key=new THREE.DirectionalLight(0xffeed3,3.4);key.position.set(-3,5,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0x8bcbea,2);rim.position.set(4,2,-3);scene.add(rim);
  let disposed=false,paused=false,visible=true,lost=false,frame=0,dirty=true,frames=0;
  const events=new AbortController();
  function draw(){
    frame=0;if(disposed||paused||!visible||document.hidden||lost)return;
    try{
      renderer.render(scene,camera);dirty=false;
      canvas.dataset.frames=String(++frames);canvas.dataset.triangles=String(renderer.info.render.triangles);
      canvas.dataset.geometries=String(renderer.info.memory.geometries);canvas.dataset.textures=String(renderer.info.memory.textures);
      canvas.dataset.renderState='ready';
    }catch(error){lost=true;canvas.dataset.renderState='failed';options.onUnavailable?.(error);}
  }
  function requestRender(){dirty=true;if(!disposed&&!paused&&visible&&!document.hidden&&!lost&&!frame)frame=requestAnimationFrame(draw);}
  function size(){
    if(disposed)return;
    const box=host.getBoundingClientRect();
    const width=Math.max(1,Math.round(box.width)),height=Math.max(1,Math.round(box.height));
    if(width<2||height<2)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();requestRender();
  }
  const resize=new ResizeObserver(size);resize.observe(host);
  const observer=new IntersectionObserver(entries=>{
    visible=entries[0]?.isIntersecting??false;
    if(!visible){cancelAnimationFrame(frame);frame=0;}else if(dirty)requestRender();
  },{rootMargin:'60px'});observer.observe(host);
  controls.addEventListener('change',requestRender);
  canvas.addEventListener('pointerdown',()=>{paused=false;requestRender();},{signal:events.signal});
  canvas.addEventListener('wheel',()=>{paused=false;requestRender();},{signal:events.signal,passive:true});
  function resetCamera(){camera.position.copy(initial);controls.target.copy(target);controls.update();requestRender();}
  canvas.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(event.key))return;
    event.preventDefault();
    paused=false;
    if(event.key==='Home'){resetCamera();return;}
    const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);
    if(event.key==='ArrowLeft')s.theta-=.12;if(event.key==='ArrowRight')s.theta+=.12;
    if(event.key==='ArrowUp')s.phi=Math.max(.08,s.phi-.12);if(event.key==='ArrowDown')s.phi=Math.min(Math.PI-.08,s.phi+.12);
    if(event.key==='+'||event.key==='=')s.radius=Math.max(controls.minDistance,s.radius*.9);
    if(event.key==='-')s.radius=Math.min(controls.maxDistance,s.radius/ .9);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();requestRender();
  },{signal:events.signal});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(frame);frame=0;}else if(dirty)requestRender();
  },{signal:events.signal});
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;canvas.dataset.renderState='lost';options.onUnavailable?.(new Error('WebGL context lost'));
  },{signal:events.signal});
  function setPaused(value:boolean){paused=value;if(paused){cancelAnimationFrame(frame);frame=0;}else if(dirty)requestRender();}
  function dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(frame);frame=0;
    events.abort();resize.disconnect();observer.disconnect();controls.removeEventListener('change',requestRender);controls.dispose();
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
    scene.traverse(object=>{
      const mesh=object as THREE.Mesh;
      if(mesh.geometry)geometries.add(mesh.geometry);
      if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(material);
    });
    for(const material of materials){
      for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);
      const shader=material as THREE.ShaderMaterial;
      if(shader.uniforms)for(const uniform of Object.values(shader.uniforms))if(uniform.value instanceof THREE.Texture)textures.add(uniform.value);
      material.dispose();
    }
    textures.forEach(texture=>texture.dispose());geometries.forEach(geometry=>geometry.dispose());
    scene.clear();renderer.renderLists.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();
  }
  size();requestRender();
  return {scene,group,camera,renderer,controls,canvas,requestRender,setPaused,resetCamera,dispose};
}
