import * as THREE from 'three';
import { COASTLINE_SAMPLES, COASTLINE_SURF_LIFT, createCoastlineSample, sampleCoastline } from './coastline.ts';
import { RADIUS, WATER_Y, type OceanGeometryFrame } from './geometry3d.ts';
import type { OceanUniforms } from './materials3d.ts';

/** One finite, horizontal surf skin. The scene lends its noise and clocks;
 * this owner retains only its own geometry, material and contour slots. */
export class OceanCoastline3D {
  readonly group = new THREE.Group();
  readonly state = createCoastlineSample();
  private ribbon: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private lastP = Number.NaN;
  private lastEnvironment = '';
  private lastSupply = '';
  private cutaway?: THREE.Plane;
  private disposed = false;

  constructor(noise: THREE.Data3DTexture, ocean: OceanUniforms) {
    const count = (COASTLINE_SAMPLES + 1) * 2;
    const geometry = new THREE.BufferGeometry(), uvs = new Float32Array(count * 2);
    for (let i = 0; i <= COASTLINE_SAMPLES; i++) for (let side = 0; side < 2; side++) {
      const index = i * 2 + side; uvs[index * 2] = i / COASTLINE_SAMPLES; uvs[index * 2 + 1] = side;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(COASTLINE_SAMPLES * 6), 1).setUsage(THREE.DynamicDrawUsage));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, WATER_Y + COASTLINE_SURF_LIFT, 0), RADIUS + .13);
    const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, clipping: true,
      uniforms: { uStone: { value: noise }, uClock: ocean.clock, uSeaPhase: ocean.seaPhase },
      vertexShader: /* glsl */`
        varying vec3 vCoastWorld;varying float vAcross;
        #include <clipping_planes_pars_vertex>
        void main(){
          vCoastWorld=(modelMatrix*vec4(position,1.)).xyz;vAcross=uv.y;
          vec4 mvPosition=modelViewMatrix*vec4(position,1.);
          gl_Position=projectionMatrix*mvPosition;
          #include <clipping_planes_vertex>
        }`,
      fragmentShader: /* glsl */`
        uniform highp sampler3D uStone;uniform float uClock;uniform float uSeaPhase;
        varying vec3 vCoastWorld;varying float vAcross;
        #include <clipping_planes_pars_fragment>
        void main(){
          #include <clipping_planes_fragment>
          vec2 p=vCoastWorld.xz;
          vec2 drift=vec2(sin(uSeaPhase),cos(uSeaPhase));
          float phase=uClock*3.+uSeaPhase;
          float coarse=texture(uStone,vec3(p*7.1+drift*.8,uClock*2.)*.03125).r;
          float fine=texture(uStone,vec3(p*24.3+9.+drift*2.,uClock*3.)*.03125).r;
          float broken=smoothstep(.44,.64,coarse+.15*sin(p.x*6.7-p.y*8.3+phase));
          float surge=sin(uSeaPhase+p.x*.48+p.y*.37+coarse*1.4);
          float packet=smoothstep(.48,.93,surge);
          float crest=.49-.23*cos(uSeaPhase+p.x*.48+p.y*.37+coarse*1.4)+.12*(fine-.5);
          float foam=exp(-pow((vAcross-crest)/(.10+.14*fine),2.));
          float edge=smoothstep(0.,.15,vAcross)*(1.-smoothstep(.56,1.,vAcross));
          float alpha=(.025+(.12+.45*packet)*foam)*edge*broken;
          if(alpha<.004)discard;
          gl_FragColor=vec4(mix(vec3(.31,.43,.43),vec3(.63,.72,.69),foam*packet),alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.ribbon = new THREE.Mesh(geometry, material);
    this.ribbon.name = 'ocean-shoreline-surf'; this.ribbon.renderOrder = 6;
    this.group.add(this.ribbon); this.group.visible = false;
  }

  draw(frame: OceanGeometryFrame) {
    if (this.disposed) return;
    if (frame.p === this.lastP && frame.environment === this.lastEnvironment && frame.supply === this.lastSupply) return;
    this.lastP = frame.p; this.lastEnvironment = frame.environment; this.lastSupply = frame.supply;
    sampleCoastline(frame, this.state); this.group.visible = this.state.active;
    if (!this.state.active) return;
    const geometry = this.ribbon.geometry, position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const index = geometry.getIndex()!;
    for (let i = 0; i <= COASTLINE_SAMPLES; i++) {
      const point = this.state.points[i % COASTLINE_SAMPLES], scale = point.radius ? (point.radius + point.width) / point.radius : 1;
      position.setXYZ(i * 2, point.x, WATER_Y + COASTLINE_SURF_LIFT, point.z);
      position.setXYZ(i * 2 + 1, point.x * scale, WATER_Y + COASTLINE_SURF_LIFT, point.z * scale);
      if (i === COASTLINE_SAMPLES) continue;
      const next = this.state.points[(i + 1) % COASTLINE_SAMPLES], a = i * 2;
      if (point.active && next.active) {
        index.setX(i * 6, a); index.setX(i * 6 + 1, a + 2); index.setX(i * 6 + 2, a + 1);
        index.setX(i * 6 + 3, a + 1); index.setX(i * 6 + 4, a + 2); index.setX(i * 6 + 5, a + 3);
      } else for (let corner = 0; corner < 6; corner++) index.setX(i * 6 + corner, a);
    }
    position.needsUpdate = index.needsUpdate = true;
  }

  setCutaway(plane?: THREE.Plane) {
    if (this.disposed || plane === this.cutaway) return;
    this.cutaway = plane; this.ribbon.material.clippingPlanes = plane ? [plane] : [];
    this.ribbon.material.needsUpdate = true;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.group.visible = false;
    this.ribbon.geometry.dispose(); this.ribbon.material.dispose(); this.group.clear();
  }
}
