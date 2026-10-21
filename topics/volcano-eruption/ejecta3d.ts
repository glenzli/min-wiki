import * as THREE from 'three';
import { CLAST_BUDGET, eruptionAppearance, smooth, type Settings } from './model.ts';
import { fragmentAt, surfaceHeight, type Fragment } from './eruptionGeometry.ts';
import { seed } from './magmaGeometry.ts';

export const EJECTA_LIMITS = Object.freeze({ fragments: CLAST_BUDGET, families: 2, geometries: 2, materials: 2, textures: 0 });
export interface EjectaUpdate {
  fragments: readonly Fragment[];
  clock: number;
  settings: Settings;
  connected: boolean;
  cutaway?: boolean;
}
type Appearance = ReturnType<typeof eruptionAppearance>;
export type EjectaShape = 'drop' | 'spindle' | 'rope' | 'block';
const UP = new THREE.Vector3(0, 1, 0);

/** Morphology and cooling are explanatory, not sizes, temperatures or a cooling
 * calculation. NPS distinguishes molten/partly molten rounded bombs from solid
 * angular blocks; most bombs solidify in flight, some land partly plastic:
 * https://home.nps.gov/subjects/volcanoes/pyroclasts.htm
 * The seeded mixture below is not a measured lithic/juvenile proportion. */
export function ejectaSample(fragment: Fragment, index: number, clock: number, settings: Settings, appearance: Appearance = eruptionAppearance(settings)) {
  const p = Number.isFinite(clock) ? clock : 0;
  const sample = fragmentAt(fragment, p);
  const elapsed = Math.max(0, (p - fragment.birth) * 24);
  const flightAge = elapsed / Math.max(.001, fragment.trajectory.impactTime);
  const hard = appearance.ash > .62 || seed(index + 4807) < .13 + appearance.ash * .32;
  const choice = seed(index + 1409);
  const shape: EjectaShape = hard ? 'block' : choice < .38 ? 'drop' : choice < .79 ? 'spindle' : 'rope';
  const plasticLanding = !hard && seed(index + 8127) > .76;
  const coolEnd = plasticLanding ? 1.5 + seed(index + 5241) * .34 : .62 + seed(index + 5241) * .28;
  const heat = hard ? 0 : 1 - smooth(.08, coolEnd, flightAge);
  const skin = hard ? 1 : .13 + .87 * smooth(.025, .74, flightAge);
  const spread = plasticLanding && sample.landed ? smooth(0, .28, sample.afterImpact) * (.55 + seed(index + 732) * .3) : 0;
  const stretch = shape === 'drop' ? 1.12 + choice * .55 : shape === 'spindle' ? 1.6 + choice * .5 : shape === 'rope' ? 2.05 + choice * .4 : 1;
  const phase = seed(index + 2011) * Math.PI * 2;
  const rotation = new THREE.Quaternion();
  if (sample.landed) {
    const [x, , z] = sample.position, d = .014, kind = settings.landform ?? 'scoria';
    const normal = new THREE.Vector3(
      -(surfaceHeight(x + d, z, kind) - surfaceHeight(x - d, z, kind)) / (2 * d), 1,
      -(surfaceHeight(x, z + d, kind) - surfaceHeight(x, z - d, kind)) / (2 * d)).normalize();
    rotation.setFromUnitVectors(UP, normal);
    rotation.multiply(new THREE.Quaternion().setFromAxisAngle(UP, phase));
  } else {
    const time = Math.min(elapsed, fragment.trajectory.impactTime);
    const velocity = new THREE.Vector3(fragment.dx * fragment.trajectory.vx,
      -(fragment.trajectory.vy + fragment.trajectory.gravity * time), fragment.dz * fragment.trajectory.vx).normalize();
    rotation.setFromUnitVectors(UP, velocity.lengthSq() > .5 ? velocity : UP);
    rotation.multiply(new THREE.Quaternion().setFromAxisAngle(UP, phase + time * (.6 + seed(index + 81) * 1.1)));
  }
  return { ...sample, index, shape, hard, heat, skin, spread, plasticLanding,
    radius: fragment.radius, stretch, phase, taper: .13 + seed(index + 2603) * .23,
    rotation: rotation.toArray() as [number, number, number, number] };
}

const NOISE = /* glsl */`
float ejHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float ejNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(ejHash(i),ejHash(i+vec3(1,0,0)),f.x),mix(ejHash(i+vec3(0,1,0)),ejHash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(ejHash(i+vec3(0,0,1)),ejHash(i+vec3(1,0,1)),f.x),mix(ejHash(i+vec3(0,1,1)),ejHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float ejFbm(vec3 p){return .62*ejNoise(p)+.27*ejNoise(p*2.07+5.7)+.11*ejNoise(p*4.13+2.3);}
`;
const WARP = /* glsl */`
vec3 ejWarp(vec3 p,vec4 form,vec4 state){
 float y=p.y;
 float spindle=step(.5,form.x);
 float rope=step(1.5,form.x);
 float taper=(1.-form.z*y)*mix(1.,.62+.38*pow(max(0.,1.-y*y),.3),spindle);
 p.xz*=taper/sqrt(form.y);
 p.y*=form.y;
 float belly=max(0.,1.-y*y);
 p.x+=rope*sin(y*3.7+form.w)*.17*belly;
 p.z+=rope*cos(y*4.4+form.w)*.11*belly;
 p*=1.+.035*sin(y*7.+form.w)+.026*cos(p.x*5.+p.z*4.+form.w);
 if(state.z>.5){
   // A landed spindle lies across the slope; the pivot remains the upstream
   // impact. Only the seeded still-plastic subset undergoes modest flattening.
   p=vec3(p.y,p.x*.72,p.z);
   p.y*=1.-state.w*.45;p.xz*=1.+state.w*.18;
   p.y+=.40;
 }
 return p;
}
`;

function clastMaterial(hard: boolean) {
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: hard ? .96 : .7,
    emissive: '#ffffff', emissiveIntensity: 1, flatShading: hard });
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      attribute vec4 aEjectaForm;attribute vec4 aEjectaState;
      varying vec3 vEjectaLocal;varying vec4 vEjectaState;varying float vEjectaSeed;
      ${hard ? '' : WARP}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vEjectaLocal=position;vEjectaState=aEjectaState;vEjectaSeed=aEjectaForm.w;
        ${hard ? `transformed*=vec3(1.12,.86,.97)*(1.+.08*sin(position.y*5.+aEjectaForm.w));
          if(aEjectaState.z>.5)transformed.y+=.38;` : 'transformed=ejWarp(position,aEjectaForm,aEjectaState);'}`);
    if (!hard) shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
      vec3 ejN=normalize(normal),ejT=normalize(cross(ejN,abs(ejN.y)<.9?vec3(0,1,0):vec3(1,0,0))),ejB=cross(ejN,ejT);
      vec3 ejP=ejWarp(position,aEjectaForm,aEjectaState);
      vec3 ejDT=ejWarp(normalize(position+ejT*.006),aEjectaForm,aEjectaState)-ejP;
      vec3 ejDB=ejWarp(normalize(position+ejB*.006),aEjectaForm,aEjectaState)-ejP;
      objectNormal=normalize(cross(ejDT,ejDB));`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vEjectaLocal;varying vec4 vEjectaState;varying float vEjectaSeed;${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float ejGrain=ejFbm(vEjectaLocal*4.6+vEjectaSeed);
        float ejSeam=1.-smoothstep(.06,.19,abs(ejNoise(vEjectaLocal*5.1+vEjectaSeed)-.49));
        float ejWindow=mix(.62+.30*ejGrain,ejSeam*.78+.035,vEjectaState.y);
        float ejGlow=vEjectaState.x*ejWindow;
        vec3 ejCrust=vec3(.048,.034,.027)*(.72+.65*ejGrain);
        ${hard ? 'diffuseColor.rgb=vec3(.13,.112,.086)*(.65+.65*ejGrain);' : 'diffuseColor.rgb=mix(ejCrust,vec3(.48,.073,.012),ejGlow*.62);'}
      `)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor=${hard ? '.96' : 'mix(.52,.96,vEjectaState.y)'};`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance=${hard ? 'vec3(0.)' : 'vec3(1.,.18,.025)*ejGlow*1.65'};`);
  };
  material.customProgramCacheKey = () => hard ? 'ejecta-solid-block-v1' : 'ejecta-soft-bomb-v1';
  return material;
}

/** Optional shared molten-jet skin. Root geometry keeps its original centreline
 * and size. Supplied phase is presentation only; this owner schedules nothing. */
export function fountainMaterial() {
  const heat = { value: 1 }, phase = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .57,
    emissive: '#ffffff', emissiveIntensity: 1 });
  material.onBeforeCompile = shader => {
    shader.uniforms.uFountainHeat = heat; shader.uniforms.uFountainPhase = phase;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      uniform float uFountainHeat;uniform float uFountainPhase;varying vec2 vFountainUV;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vFountainUV=uv;
        float ejNeck=sin(uv.x*21.-uFountainPhase+sin(uv.y*6.283))*pow(sin(clamp(uv.x,0.,1.)*3.14159),2.);
        transformed+=objectNormal*ejNeck*.0025*clamp(uFountainHeat,0.,1.);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uFountainHeat;uniform float uFountainPhase;varying vec2 vFountainUV;${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float ejAngle=vFountainUV.x*18.84955592153876-uFountainPhase;
        vec3 ejUV=vec3(cos(ejAngle)*1.7,sin(ejAngle)*1.7,vFountainUV.y*4.);
        float ejFilm=ejFbm(ejUV),ejSpot=smoothstep(.41,.69,ejFilm);
        float ejHot=clamp(uFountainHeat,0.,1.)*(.12+.88*ejSpot);
        diffuseColor.rgb=mix(vec3(.055,.026,.019),vec3(.57,.085,.014),ejHot*.65);
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance=vec3(1.,.20,.027)*ejHot*1.8;`);
  };
  material.customProgramCacheKey = () => 'ejecta-fountain-skin-v2';
  return { material, heat, phase };
}

/** Two reusable finite-volume families. Packed slots may change, but each
 * fragment's morphology seed and world pivot remain tied to its schedule index.
 * No RAF, texture, per-frame geometry/material allocation or extra clock. */
export class Ejecta3D {
  readonly group = new THREE.Group();
  readonly limits = EJECTA_LIMITS;
  private meshes: [THREE.InstancedMesh, THREE.InstancedMesh];
  private form: [THREE.InstancedBufferAttribute, THREE.InstancedBufferAttribute];
  private state: [THREE.InstancedBufferAttribute, THREE.InstancedBufferAttribute];
  private dummy = new THREE.Object3D();
  private disposed = false;
  constructor() {
    const geometries = [new THREE.SphereGeometry(1, 16, 10), new THREE.IcosahedronGeometry(1, 1)];
    this.form = geometries.map(() => new THREE.InstancedBufferAttribute(new Float32Array(CLAST_BUDGET * 4), 4).setUsage(THREE.DynamicDrawUsage)) as typeof this.form;
    this.state = geometries.map(() => new THREE.InstancedBufferAttribute(new Float32Array(CLAST_BUDGET * 4), 4).setUsage(THREE.DynamicDrawUsage)) as typeof this.state;
    const meshFor = (geometry: THREE.BufferGeometry, family: 0 | 1): THREE.InstancedMesh => {
      geometry.setAttribute('aEjectaForm', this.form[family]); geometry.setAttribute('aEjectaState', this.state[family]);
      const mesh = new THREE.InstancedMesh(geometry, clastMaterial(family === 1), CLAST_BUDGET);
      mesh.count = 0; mesh.frustumCulled = false; mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.group.add(mesh); return mesh;
    };
    this.meshes = [meshFor(geometries[0], 0), meshFor(geometries[1], 1)];
  }
  update({ fragments, clock, settings, connected, cutaway = false }: EjectaUpdate) {
    if (this.disposed) return;
    if (fragments.length > CLAST_BUDGET) throw new RangeError('Ejecta input exceeds the upstream fragment budget');
    const appearance = eruptionAppearance(settings), counts = [0, 0];
    this.group.visible = connected;
    if (connected) for (let index = 0; index < fragments.length; index++) {
      const sample = ejectaSample(fragments[index], index, clock, settings, appearance);
      if (!sample.visible || cutaway && sample.landed && sample.position[2] > .02) continue;
      const family = sample.hard ? 1 : 0, slot = counts[family]++;
      this.dummy.position.set(...sample.position); this.dummy.quaternion.set(...sample.rotation);
      this.dummy.scale.setScalar(sample.radius); this.dummy.updateMatrix(); this.meshes[family].setMatrixAt(slot, this.dummy.matrix);
      this.form[family].setXYZW(slot, sample.shape === 'rope' ? 2 : sample.shape === 'spindle' ? 1 : 0, sample.stretch, sample.taper, sample.phase);
      this.state[family].setXYZW(slot, sample.heat, sample.skin, sample.landed ? 1 : 0, sample.spread);
    }
    this.meshes.forEach((mesh, family) => {
      mesh.count = counts[family]; mesh.instanceMatrix.needsUpdate = true;
      this.form[family].needsUpdate = this.state[family].needsUpdate = true;
    });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const mesh of this.meshes) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); mesh.dispose(); }
    this.group.removeFromParent(); this.group.clear();
  }
}
