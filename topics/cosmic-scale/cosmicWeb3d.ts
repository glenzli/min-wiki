import * as THREE from 'three';
import { cosmicWebPopulation, type CosmicWebKind } from './cosmicWebModel.ts';
export type { CosmicWebKind } from './cosmicWebModel.ts';

/** Shared style numbers are deliberately modest: no gas/mist pass, bloom,
 * line mesh, boundary surface, timer, camera or renderer belongs to this owner. */
export const COSMIC_WEB_STYLE = Object.freeze({ brightness: 1.2, pointScale: 1.8, minPointPixels: 1, maxPointPixels: 4 });

export class CosmicWebVolume {
  readonly root = new THREE.Group();
  private points?: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private disposed = false;
  constructor(readonly kind: CosmicWebKind) {
    const population = cosmicWebPopulation(kind), geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(population.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(population.colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(population.sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(population.opacities, 1));
    geometry.computeBoundingSphere();
    const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: true, vertexColors: true, blending: THREE.AdditiveBlending,
      uniforms: { pixelScale: { value: 1 }, dpr: { value: 1 }, opacity: { value: 0 } },
      vertexShader: `attribute float aSize;attribute float aAlpha;uniform float pixelScale;uniform float dpr;varying vec3 tint;varying float strength;
        void main(){tint=color;strength=aAlpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(aSize*pixelScale*${COSMIC_WEB_STYLE.pointScale.toFixed(2)},${COSMIC_WEB_STYLE.minPointPixels.toFixed(2)},${COSMIC_WEB_STYLE.maxPointPixels.toFixed(2)})*dpr;}`,
      fragmentShader: `uniform float opacity;varying vec3 tint;varying float strength;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>=1.)discard;
        float point=exp(-r*r*4.8)*(1.-smoothstep(.65,1.,r));gl_FragColor=vec4(tint,point*strength*opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
    this.points = new THREE.Points(geometry, material); this.points.name = `cosmic-web-${kind}-population`; this.points.renderOrder = 1;
    this.root.name = `statistical-cosmic-web-${kind}`; this.root.userData.statisticalReconstruction = true; this.root.userData.representativeCount = population.count;
    this.root.add(this.points); this.root.visible = false;
  }
  update(radiusPixels: number, dpr: number, opacity: number): void {
    if (this.disposed || !this.points) return;
    const radius = Number.isFinite(radiusPixels) ? Math.max(0, radiusPixels) : 0;
    const density = Number.isFinite(dpr) ? Math.max(.5, Math.min(2, dpr)) : 1;
    const alpha = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 0;
    this.root.visible = radius > .25 && alpha > .0001;
    this.points.material.uniforms.pixelScale!.value = Math.max(.58, Math.min(1.65, Math.sqrt(radius / 280)));
    this.points.material.uniforms.dpr!.value = density;
    this.points.material.uniforms.opacity!.value = alpha * COSMIC_WEB_STYLE.brightness;
  }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.points?.geometry.dispose(); this.points?.material.dispose(); this.root.clear(); this.root.visible = false; this.points = undefined;
  }
}
