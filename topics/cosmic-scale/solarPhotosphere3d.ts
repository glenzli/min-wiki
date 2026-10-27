import * as THREE from 'three';
import {SOLAR_SURFACE_STYLE,SOLAR_SPOTS,SOLAR_SURFACE_GLSL,solarSurfacePhase} from './solarSurfaceModel.ts';
export {SOLAR_SURFACE_STYLE as SOLAR_PHOTOSPHERE_STYLE} from './solarSurfaceModel.ts';

/** The same display-space photosphere as 01. No exposure/tone-map washout,
 * light source, texture, geometry deformation or autonomous clock is added. */
export function createSolarPhotosphereMaterial(phase=0):THREE.ShaderMaterial {
 const material=new THREE.ShaderMaterial({name:'cosmic-solar-photosphere',transparent:false,depthWrite:true,depthTest:true,side:THREE.FrontSide,toneMapped:false,
  uniforms:{surfacePhase:{value:solarSurfacePhase(phase)},solarSpots:{value:SOLAR_SPOTS.map(spot=>new THREE.Vector4(...spot))}},
  vertexShader:`varying vec3 vLocalPosition;varying vec3 vViewNormal;varying vec3 vToEye;
   void main(){vLocalPosition=position;vViewNormal=normalMatrix*normal;vec4 p=modelViewMatrix*vec4(position,1.);vToEye=-p.xyz;gl_Position=projectionMatrix*p;}`,
  fragmentShader:`varying vec3 vLocalPosition;varying vec3 vViewNormal;varying vec3 vToEye;
   ${SOLAR_SURFACE_GLSL}
   void main(){vec3 p=normalize(vLocalPosition),eye=isOrthographic?vec3(0.,0.,1.):normalize(vToEye);
    float mu=clamp(dot(normalize(vViewNormal),eye),0.,1.);vec3 canonical=vec3(p.x,-p.y,p.z);
    gl_FragColor=vec4(solarSurface(canonical,mu,max(length(fwidth(p)),.000001)),1.);}`
 });
 material.userData.illustrativePhotosphere=true;material.userData.solarProfile=SOLAR_SURFACE_STYLE.revision;material.userData.maxNoiseHashesPerFragment=32;
 return material;
}
export function setSolarPhotospherePhase(material:THREE.ShaderMaterial,phase:number){material.uniforms.surfacePhase!.value=solarSurfacePhase(phase);}

/** View-facing, radius-relative soft glow. Its inner cutout leaves the original
 * sphere/diameter intact; the consumer owns this plane and its material. */
export function createSolarHalo(){
 const s=SOLAR_SURFACE_STYLE,colour=s.haloColour.map(value=>value/255),stops=s.haloStops;
 const material=new THREE.ShaderMaterial({name:'cosmic-solar-halo',transparent:true,depthWrite:false,depthTest:true,toneMapped:false,
  uniforms:{haloColour:{value:new THREE.Vector3(...colour)},innerRadius:{value:s.haloInner/s.haloOuter},middle:{value:stops[1]![0]},alphas:{value:new THREE.Vector2(stops[0]![1],stops[1]![1])}},
  vertexShader:`varying vec2 local;void main(){local=position.xy;vec4 center=modelViewMatrix*vec4(0.,0.,0.,1.);vec2 scale=vec2(length(modelViewMatrix[0].xyz),length(modelViewMatrix[1].xyz));gl_Position=projectionMatrix*(center+vec4(position.xy*scale,0.,0.));}`,
  fragmentShader:`varying vec2 local;uniform vec3 haloColour;uniform float innerRadius;uniform float middle;uniform vec2 alphas;
   void main(){float r=length(local);if(r<innerRadius||r>1.)discard;float t=(r-innerRadius)/(1.-innerRadius);float alpha=t<middle?mix(alphas.x,alphas.y,t/middle):mix(alphas.y,0.,(t-middle)/(1.-middle));gl_FragColor=vec4(haloColour,alpha);}`
 });
 material.userData.solarProfile=s.revision;const halo=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);halo.name='solar-soft-glow';halo.frustumCulled=false;return halo;
}
