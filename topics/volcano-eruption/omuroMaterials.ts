import * as THREE from 'three';
import { OMURO_FIELD_SIZE, OMURO_GROUND_RADIUS, OMURO_RADIUS } from './omuroGeometry.ts';
import { seed } from './magmaGeometry.ts';

const NOISE = /* glsl */`
float omuroHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float omuroNoise(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(omuroHash(i),omuroHash(i+vec3(1,0,0)),f.x),mix(omuroHash(i+vec3(0,1,0)),omuroHash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(omuroHash(i+vec3(0,0,1)),omuroHash(i+vec3(1,0,1)),f.x),mix(omuroHash(i+vec3(0,1,1)),omuroHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float omuroFbm(vec3 p){return .58*omuroNoise(p)+.27*omuroNoise(p*2.03+4.1)+.15*omuroNoise(p*4.09+8.7);}
`;

export function omuroTextures() {
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const value = Math.round(72 + seed(i + 884) * 155);
    data.set([value, value, value, 255], i * 4);
  }
  const grain = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.minFilter = THREE.LinearMipmapLinearFilter; grain.magFilter = THREE.LinearFilter;
  grain.generateMipmaps = true; grain.needsUpdate = true;
  const field = new THREE.DataTexture(new Uint8Array(OMURO_FIELD_SIZE * OMURO_FIELD_SIZE * 4), OMURO_FIELD_SIZE, OMURO_FIELD_SIZE, THREE.RGBAFormat);
  field.minFilter = field.magFilter = THREE.LinearFilter; field.needsUpdate = true;
  return { grain, field };
}

/** Soil and grass come only from the site raster. Noise gives roughness and
 * blade-scale detail, rather than inventing a second ecological distribution. */
export function omuroGroundMaterial(grain: THREE.Texture, field: THREE.Texture, section = false) {
  const cooling = { value: 1 }, burial = { value: 0 }, footprint = { value: 1 };
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .95,
    bumpMap: grain, bumpScale: section ? .012 : .009,
    side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    shader.uniforms.uOmuroField = { value: field };
    shader.uniforms.uOmuroCooling = cooling; shader.uniforms.uOmuroBurial = burial;
    shader.uniforms.uOmuroFootprint = footprint;
    shader.uniforms.uOmuroRock = { value: new THREE.Color('#5e493b') };
    shader.uniforms.uOmuroSoil = { value: new THREE.Color('#6a533a') };
    shader.uniforms.uOmuroGrass = { value: new THREE.Color('#5f7741') };
    shader.uniforms.uOmuroStraw = { value: new THREE.Color('#878361') };
    shader.uniforms.uOmuroMeadow = { value: new THREE.Color('#747853') };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOmuro;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOmuro=position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vOmuro;uniform sampler2D uOmuroField;uniform float uOmuroCooling;uniform float uOmuroBurial;uniform float uOmuroFootprint;
      uniform vec3 uOmuroRock;uniform vec3 uOmuroSoil;uniform vec3 uOmuroGrass;uniform vec3 uOmuroStraw;uniform vec3 uOmuroMeadow;
      ${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 soilField=texture2D(uOmuroField,vOmuro.xz/${(OMURO_GROUND_RADIUS * 2).toFixed(3)}+.5).rg;
        float coarse=omuroFbm(vOmuro*3.1);
        float grit=omuroNoise(vOmuro*106.);
        vec2 sward=vec2(vOmuro.x*.91+vOmuro.z*.41,-vOmuro.x*.41+vOmuro.z*.91);
        float grassGrain=omuroNoise(vec3(sward.x*164.,vOmuro.y*13.,sward.y*31.));
        vec3 scoria=uOmuroRock*(.66+.58*coarse+.22*grit);
        ${section ? `
          float beds=omuroNoise(vec3(vOmuro.x*.8,vOmuro.y*16.+sin(vOmuro.x*.7)*.38,0.));
          scoria*=.71+.57*beds;
          diffuseColor.rgb=scoria;
        ` : `
          vec3 soil=mix(scoria,uOmuroSoil*(.74+.42*coarse),soilField.g*.85);
          vec3 grass=mix(uOmuroGrass,uOmuroStraw,omuroNoise(vOmuro*8.4)*.23);
          grass*=.83+.16*coarse+.08*grassGrain;
          diffuseColor.rgb=mix(soil,grass,soilField.r);
          vec3 ash=vec3(.30,.275,.235)*(.74+.35*coarse+.12*grit);
          diffuseColor.rgb=mix(diffuseColor.rgb,ash,uOmuroBurial*.89);
          float radius=length(vOmuro.xz)/uOmuroFootprint;
          // A mild bowl ambient-occlusion cue accompanies the real geometry
          // and shadows. It changes no height, establishment or time state.
          float bowlAO=1.-.17*(1.-smoothstep(.38,1.30,radius));
          diffuseColor.rgb*=bowlAO;
          // Existing surrounding meadow is separate from colonization of new
          // deposits. The same field/material crosses the outer mesh boundary.
          float irregularRadius=radius/(.97+.07*omuroFbm(vOmuro*.8));
          float surroundings=smoothstep(${(OMURO_RADIUS * 1.04).toFixed(3)},${(OMURO_RADIUS * 1.39).toFixed(3)},irregularRadius);
          vec3 meadow=mix(uOmuroMeadow,uOmuroGrass,.18+.16*coarse)*(.80+.24*coarse+.06*grassGrain);
          diffuseColor.rgb=mix(diffuseColor.rgb,meadow,surroundings);
        `}
      `);
  };
  material.customProgramCacheKey = () => section ? 'omuro-scoria-cut-v3' : 'omuro-site-grass-v3';
  return { material, cooling, burial, footprint };
}

/** Only the finite airborne parcels carry heat. Their landing material turns
 * dark locally, while the entire deposited slope remains non-emissive. */
export function omuroClastMaterial() {
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .94,
    vertexColors: true, emissive: '#a12c13', emissiveIntensity: .7 });
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float aOmuroHeat;varying float vOmuroHeat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOmuroHeat=aOmuroHeat;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vOmuroHeat;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance*=vOmuroHeat;');
  };
  material.customProgramCacheKey = () => 'omuro-local-clast-heat-v1';
  return material;
}

export function omuroGrassMaterial() {
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .94,
    side: THREE.DoubleSide, vertexColors: true });
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vOmuroBlade;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOmuroBlade=position.y;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vOmuroBlade;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb*=mix(vec3(.51,.60,.41),vec3(1.12,1.08,.83),vOmuroBlade);');
  };
  material.customProgramCacheKey = () => 'omuro-grass-blade-v1';
  return material;
}

export function omuroSkyMaterial() {
  return new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#a3bfd0') }, horizon: { value: new THREE.Color('#e0e1cb') } },
    vertexShader: 'varying vec3 vOmuroSky;void main(){vOmuroSky=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 top;uniform vec3 horizon;varying vec3 vOmuroSky;void main(){float h=pow(max(0.,normalize(vOmuroSky).y),.55);gl_FragColor=vec4(mix(horizon,top,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
}
