import * as THREE from 'three';
import {createThreeStage} from '../earth/threeStage';
import {ICE_EDGE_GLSL,REGION_A,regionSnapshot} from './journeyModel';
import {globeTextures} from './journeyTexture';

/** Original idealized globe. No basemap, reconstructed continent, or measured ice-sheet boundary is loaded. */
export function mountIceEdge3D(host:HTMLElement,label:string,onUnavailable:()=>void) {
  const stage=createThreeStage(host,{label,cameraPosition:[6.7,3.6,7.5],target:[0,0,0],minDistance:4.8,maxDistance:15,background:'#162f3b',onUnavailable});
  const small=matchMedia('(pointer: coarse)').matches||innerWidth<700;
  stage.renderer.toneMappingExposure=.98;
  const cover={value:.6},[surfaceMap,iceMap]=globeTextures();
  const geometry=new THREE.SphereGeometry(2.55,small?96:160,small?64:96);
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.65,metalness:.04});
  material.onBeforeCompile=shader=>{
    shader.uniforms.iceFraction=cover;shader.uniforms.climateSurface={value:surfaceMap};shader.uniforms.climateIce={value:iceMap};
    const common=`uniform float iceFraction;uniform sampler2D climateSurface;uniform sampler2D climateIce;varying vec3 vClimateUnit;${ICE_EDGE_GLSL}vec2 climateUV(vec3 n){return vec2(atan(n.z,n.x)/6.28318530718+.5,asin(clamp(n.y,-1.0,1.0))/3.14159265359+.5);}`;
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\n${common}`).replace('#include <begin_vertex>',`
      vec3 n=normalize(position);vClimateUnit=n;
      vec2 uv=climateUV(n);float land=texture2D(climateSurface,uv).a,ice=frozen(n,iceFraction);
      float ridge=texture2D(climateIce,uv).a;
      vec3 transformed=position+n*(land*.035*ridge+ice*(.016+.032*ridge));
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\n${common}`).replace('#include <color_fragment>',`#include <color_fragment>
      vec3 n=normalize(vClimateUnit);vec2 uv=climateUV(n);
      vec4 ground=texture2D(climateSurface,uv),frost=texture2D(climateIce,uv);float land=ground.a,ice=frozen(n,iceFraction);
      diffuseColor.rgb*=mix(ground.rgb,frost.rgb,ice);
    `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=mix(mix(.58,.93,land),.76,ice);`);
  };
  stage.group.add(new THREE.Mesh(geometry,material));
  const latitude=REGION_A.latitude*Math.PI/180,longitude=REGION_A.longitude*Math.PI/180;
  const site=new THREE.Vector3(Math.cos(latitude)*Math.cos(longitude),Math.sin(latitude),Math.cos(latitude)*Math.sin(longitude));
  const marker=new THREE.Mesh(new THREE.SphereGeometry(.048,16,10),new THREE.MeshStandardMaterial({color:'#f9c468',emissive:'#a86618',emissiveIntensity:.35,roughness:.4}));
  marker.position.copy(site).multiplyScalar(2.66);stage.group.add(marker);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.115,.012,6,40),new THREE.MeshBasicMaterial({color:'#ffe0a0'}));
  ring.position.copy(site).multiplyScalar(2.66);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),site);stage.group.add(ring);
  const latitudePoints=Array.from({length:161},(_,i)=>{const a=i/160*Math.PI*2;return new THREE.Vector3(Math.cos(latitude)*Math.cos(a),Math.sin(latitude),Math.cos(latitude)*Math.sin(a)).multiplyScalar(2.59);});
  const guide=new THREE.Line(new THREE.BufferGeometry().setFromPoints(latitudePoints),new THREE.LineBasicMaterial({color:'#ebc786',transparent:true,opacity:.23}));stage.group.add(guide);
  const badge=document.createElement('span');badge.className='climate-site-badge';badge.textContent='A';badge.setAttribute('aria-hidden','true');host.append(badge);
  const point=new THREE.Vector3();let disposed=false,resizeFrame=0;
  const locate=()=>{if(disposed)return;stage.camera.updateMatrixWorld();stage.group.updateMatrixWorld(true);marker.getWorldPosition(point);point.project(stage.camera);badge.style.left=`${(point.x*.5+.5)*100}%`;badge.style.top=`${(-point.y*.5+.5)*100}%`;badge.hidden=site.dot(stage.camera.position)<=2.60;};
  stage.controls.addEventListener('change',locate);
  const observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(locate);});observer.observe(host);
  const events=new AbortController();
  for(const name of ['pointerdown','wheel','keydown'])stage.canvas.addEventListener(name,()=>{if(!document.hidden)stage.setPaused(false);},{signal:events.signal});
  function update(iceCover:number){
    if(disposed)return;const snapshot=regionSnapshot(iceCover,80);cover.value=snapshot.iceCover/100;
    stage.canvas.dataset.iceCover=String(snapshot.iceCover);stage.canvas.dataset.regionA=snapshot.inside?'inside':'outside';stage.canvas.dataset.triangleTier=small?'small':'detailed';
    locate();stage.requestRender();
  }
  update(60);
  return {update,pause(){stage.setPaused(true);},resume(){stage.setPaused(false);locate();},dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(resizeFrame);observer.disconnect();events.abort();surfaceMap.dispose();iceMap.dispose();stage.controls.removeEventListener('change',locate);badge.remove();stage.dispose();}};
}
