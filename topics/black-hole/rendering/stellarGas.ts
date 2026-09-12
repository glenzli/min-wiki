import type { StellarDisruption } from '../physics/stellarDisruption.ts';
import * as THREE from 'three';
import { smooth } from '../physics/encounter.ts';
import { CORE_RELEASE_END } from '../physics/stellarDisruption.ts';

// A continuous volume of overlapping, soft parcels. The same samples render
// the luminous star, peeling envelope, curved streams, and dissipating disk.
export class StellarGas {
  points!: THREE.Points<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.ShaderMaterial, THREE.Object3DEventMap>;
  model!: StellarDisruption;
  // Topic-owned emission: the lens samples the same live parcels as the points.
  readonly emissionExtent = 20;
  readonly emissionSize = 96;
  private emissionDensity = new Float32Array(this.emissionSize ** 2);
  readonly emission = new THREE.DataTexture(new Uint8Array(this.emissionSize ** 2), this.emissionSize, this.emissionSize, THREE.RedFormat);


  constructor(pixelRatio: number) {
    this.emission.minFilter = this.emission.magFilter = THREE.LinearFilter;
    this.emission.unpackAlignment = 1;
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
          motion.x *= projectionMatrix[1][1] / projectionMatrix[0][0];
          vDirection = length(motion) > 0.000001 ? normalize(motion) : vec2(1.0, 0.0);
          float dispersed = smoothstep(0.28, 0.44, uProgress) * state.x;
          float width = mix(0.18 + variation * 0.12, 0.105 + variation * 0.075, dispersed)
            * uHeight * projectionMatrix[1][1] / max(1.0, -mv.z);
          float stretch = 1.0 + dispersed * min(0.8, length(motion) * 28.0);
          vAspect = stretch;
          gl_PointSize = clamp(width * stretch, 1.15, 8.0) * uPixelRatio;
          gl_Position = clip;
          vec3 outward = normalize(mat3(modelViewMatrix) * origin);
          float limb = 0.62 + 0.38 * max(0.0, outward.z);
          float grain = 0.5 + 0.5 * sin(origin.x*17.0 + sin(origin.y*19.0) + origin.z*11.0);
          vec3 stellar = mix(vec3(1.0,0.26,0.025),vec3(1.0,0.68,0.19),grain) * limb;
          float core = (1.0-smoothstep(0.0,1.8,length(origin))) * (1.0-state.x);
          stellar = mix(stellar,vec3(2.0,1.25,0.45),core);
          float heat = 1.0 - smoothstep(4.0, 28.0, length(position));
          vec3 stream = mix(vec3(0.78,0.21,0.045),vec3(1.35,0.62,0.20),variation);
          stream = mix(stream,vec3(1.8,1.30,0.72),heat*0.65);
          vColor = mix(stellar,stream,dispersed);
          vAlpha = mix(0.38,0.24,dispersed) * state.y;
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
          float halo=(exp(-r2*3.0)-exp(-3.0))/(1.0-exp(-3.0));
          float density=0.62*exp(-r2*10.0)+0.38*halo;
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
    this.updateEmission(attributes.position.array as Float32Array, attributes.previous.array as Float32Array, attributes.state.array as Float32Array);
    attributes.position.needsUpdate = true;
    attributes.previous.needsUpdate = true;
    attributes.state.needsUpdate = true;
    this.points.material.uniforms.uProgress.value = progress;
    return { ...focus, starVisible: progress < CORE_RELEASE_END && focus.remaining > 0.025 };
  }
  private updateEmission(positions: Float32Array, previous: Float32Array, state: Float32Array) {
    const size = this.emissionSize, scale = size / (2 * this.emissionExtent);
    this.emissionDensity.fill(0);
    for (let i = 0; i < this.model.count; i++) {
      const j = i * 3, x = positions[j], y = positions[j + 1], z = positions[j + 2];
      const r = Math.hypot(x, y);
      if (r < 3.6 || r > 18) continue;
      const dx = x - previous[j], dy = y - previous[j + 1];
      const radialFraction = Math.abs(x * dx + y * dy) / Math.max(1e-8, r * Math.hypot(dx, dy));
      // Released, surviving bound gas near the plane lights up as its motion
      // becomes orbital. No global timeline fade or prescribed circular disk.
      const weight = state[i * 2] * state[i * 2 + 1] * this.model.bound[i]
        * (1 - smooth(0.3, 0.85, radialFraction)) * (1 - smooth(0.6, 2.5, Math.abs(z)));
      if (weight <= 0) continue;
      const px = (x + this.emissionExtent) * scale - 0.5;
      const py = (y + this.emissionExtent) * scale - 0.5;
      for (let iy = Math.max(0, Math.ceil(py - 3)); iy <= Math.min(size - 1, Math.floor(py + 3)); iy++) {
        for (let ix = Math.max(0, Math.ceil(px - 3)); ix <= Math.min(size - 1, Math.floor(px + 3)); ix++) {
          const d2 = (ix - px) ** 2 + (iy - py) ** 2;
          if (d2 < 9) this.emissionDensity[iy * size + ix] += weight * (Math.exp(-d2 / 2) - Math.exp(-4.5));
        }
      }
    }
    const pixels = this.emission.image.data;
    for (let i = 0; i < pixels.length; i++) pixels[i] = Math.round(255 * (1 - Math.exp(-this.emissionDensity[i] * 0.055)));
    this.emission.needsUpdate = true;
  }

}
