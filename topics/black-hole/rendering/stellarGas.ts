import type { StellarDisruption } from '../physics/stellarDisruption.ts';
import * as THREE from 'three';
import { CORE_RELEASE_END } from '../physics/stellarDisruption.ts';

// A continuous volume of overlapping, soft parcels. The same samples render
// the luminous star, peeling envelope, curved streams, and dissipating disk.
export class StellarGas {
  points!: THREE.Points<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.ShaderMaterial, THREE.Object3DEventMap>;
  model!: StellarDisruption;

  constructor(pixelRatio: number) {
    const count = 12000;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('previous', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('state', new THREE.BufferAttribute(new Float32Array(count * 2), 2).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('origin', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('variation', new THREE.BufferAttribute(new Float32Array(count), 1));
    geometry.setAttribute('bound', new THREE.BufferAttribute(new Float32Array(count), 1));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uHeight: { value: 400 },
      },
      vertexShader: `
        attribute vec3 previous; attribute vec3 origin; attribute vec2 state;
        attribute float variation; attribute float bound;
        uniform float uProgress; uniform float uPixelRatio; uniform float uHeight;
        varying vec3 vColor; varying float vAlpha;
        varying vec2 vDirection; varying float vAspect;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec4 clip = projectionMatrix * mv;
          vec4 prevClip = projectionMatrix * modelViewMatrix * vec4(previous, 1.0);
          vec2 motion = clip.xy / clip.w - prevClip.xy / prevClip.w;
          vDirection = length(motion) > 0.000001 ? normalize(motion) : vec2(1.0, 0.0);
          float dispersed = smoothstep(0.28, 0.44, uProgress) * state.x;
          float width = (0.18 + variation * 0.12 + dispersed * 0.25)
            * uHeight * projectionMatrix[1][1] / max(1.0, -mv.z);
          float stretch = 1.0 + dispersed * min(2.0, length(motion) * 80.0);
          vAspect = stretch;
          gl_PointSize = clamp(width * stretch, 1.25, 16.0) * uPixelRatio;
          gl_Position = clip;
          vec3 outward = normalize(mat3(modelViewMatrix) * origin);
          float limb = 0.62 + 0.38 * max(0.0, outward.z);
          float grain = 0.5 + 0.5 * sin(origin.x*17.0 + sin(origin.y*19.0) + origin.z*11.0);
          vec3 stellar = mix(vec3(1.0,0.26,0.025),vec3(1.0,0.68,0.19),grain) * limb;
          float core = (1.0-smoothstep(0.0,1.8,length(origin))) * (1.0-state.x);
          stellar = mix(stellar,vec3(2.0,1.25,0.45),core);
          vec3 stream = mix(vec3(0.86,0.20,0.025),vec3(1.0,0.49,0.13),variation);
          vColor = mix(stellar,stream,dispersed);
          vAlpha = mix(0.38,0.12,dispersed) * state.y;
          vAlpha *= 1.0-smoothstep(95.0,135.0,length(position));
          if (length(position)<3.65) vAlpha=0.0;
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vAlpha;
        varying vec2 vDirection; varying float vAspect;
        void main(){
          vec2 p=(gl_PointCoord-0.5)*2.0;
          vec2 d=vec2(vDirection.x,-vDirection.y);
          float along=dot(p,d);
          float across=dot(p,vec2(-d.y,d.x))*vAspect;
          float r2=along*along+across*across;
          if(r2>1.0||vAlpha<0.001)discard;
          float density=(exp(-r2*3.0)-exp(-3.0))/(1.0-exp(-3.0));
          gl_FragColor=vec4(vColor,density*vAlpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
  }

  setModel(model: StellarDisruption) {
    this.model = model;
    const attributes = this.points.geometry.attributes;
    for (const [attribute, data] of [['origin', model.initial], ['variation', model.variation], ['bound', model.bound]] as const) {
      attributes[attribute].array.set(data);
      attributes[attribute].needsUpdate = true;
    }
  }

  update(progress: number) {
    const attributes = this.points.geometry.attributes;
    const focus = this.model.sample(progress, attributes.position.array as Float32Array, attributes.previous.array as Float32Array, attributes.state.array as Float32Array);
    attributes.position.needsUpdate = true;
    attributes.previous.needsUpdate = true;
    attributes.state.needsUpdate = true;
    this.points.material.uniforms.uProgress.value = progress;
    return { ...focus, starVisible: progress < CORE_RELEASE_END && focus.remaining > 0.025 };
  }
}
