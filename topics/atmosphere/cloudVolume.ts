import * as THREE from 'three';

const FIELD_WIDTH = 72;
const FIELD_HEIGHT = 52;
const FIELD_DEPTH = 40;

export interface CloudVolumeOptions {
  shape?: 'cumulus' | 'layered' | 'ice';
  dynamic?: boolean;
}

type Lobe = readonly [number, number, number, number, number, number];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function lattice(x: number, y: number, z: number, seed: number): number {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function noise3(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const u = smooth(0, 1, x - ix), v = smooth(0, 1, y - iy), w = smooth(0, 1, z - iz);
  const row = (dy: number, dz: number) => lerp(
    lattice(ix, iy + dy, iz + dz, seed),
    lattice(ix + 1, iy + dy, iz + dz, seed),
    u,
  );
  return lerp(lerp(row(0, 0), row(1, 0), v), lerp(row(0, 1), row(1, 1), v), w);
}

function smoothUnion(a: number, b: number): number {
  const width = 0.045;
  const h = Math.max(width - Math.abs(a - b), 0) / width;
  return Math.min(a, b) - h * h * width * 0.25;
}

/** Irregular cellular hollows give billows creases in all three directions;
 * the feature points are prepared once, rather than hashed for every voxel. */
function makeCellularField(seed: number): (x: number, y: number, z: number) => number {
  const count = 14, points = new Float32Array(count * count * count * 3);
  for (let z = 0; z < count; z++) for (let y = 0; y < count; y++) for (let x = 0; x < count; x++) {
    const i = (x + count * (y + count * z)) * 3;
    points[i] = x + 0.16 + lattice(x, y, z, seed) * 0.68;
    points[i + 1] = y + 0.16 + lattice(x, y, z, seed ^ 0x7f4a7c15) * 0.68;
    points[i + 2] = z + 0.16 + lattice(x, y, z, seed ^ 0x51e87bcd) * 0.68;
  }
  return (x, y, z) => {
    const px = x * 9 + 6.5, py = y * 9 + 6.5, pz = z * 9 + 6.5;
    const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
    let nearest = 3;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const i = (ix + dx + count * (iy + dy + count * (iz + dz))) * 3;
      const qx = px - points[i], qy = py - points[i + 1], qz = pz - points[i + 2];
      nearest = Math.min(nearest, qx * qx + qy * qy + qz * qz);
    }
    return Math.sqrt(nearest);
  };
}

/** Bake only density, not a lit billboard. The shader still integrates depth
 * and sunlight through this three-dimensional, deterministic teaching shape. */
function makeLegacyDensityField(seed: number): THREE.Data3DTexture {
  const seedBits = Number.isFinite(seed) ? Math.floor(seed) | 0 : 0;
  let randomState = seedBits ^ 0x6d2b79f5;
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) | 0;
    return (randomState >>> 0) / 4294967296;
  };
  const template: Lobe[] = [
    [0, -0.17, 0, 0.44, 0.15, 0.29],
    [-0.24, -0.04, -0.04, 0.205, 0.245, 0.245],
    [-0.08, 0.06, -0.035, 0.19, 0.28, 0.25],
    [0.155, 0.025, -0.05, 0.205, 0.27, 0.235],
    [0.32, -0.075, -0.02, 0.14, 0.19, 0.18],
    [-0.29, -0.105, 0.16, 0.155, 0.15, 0.15],
    [-0.1, -0.065, 0.17, 0.19, 0.185, 0.18],
    [0.21, -0.085, 0.17, 0.19, 0.175, 0.17],
    [-0.02, -0.055, -0.22, 0.29, 0.215, 0.155],
  ];
  const lobes: Lobe[] = template.map(([x, y, z, rx, ry, rz]) => [
    x + (random() - 0.5) * 0.035,
    y + (random() - 0.5) * 0.025,
    z + (random() - 0.5) * 0.035,
    rx * (0.94 + random() * 0.1),
    ry * (0.94 + random() * 0.1),
    rz * (0.94 + random() * 0.1),
  ]);
  const cellular = makeCellularField(seedBits ^ 0x467b32df);
  const data = new Uint8Array(FIELD_WIDTH * FIELD_HEIGHT * FIELD_DEPTH);
  let index = 0;
  for (let iz = 0; iz < FIELD_DEPTH; iz++) {
    const z = iz / (FIELD_DEPTH - 1) - 0.5;
    for (let iy = 0; iy < FIELD_HEIGHT; iy++) {
      const y = iy / (FIELD_HEIGHT - 1) - 0.5;
      for (let ix = 0; ix < FIELD_WIDTH; ix++, index++) {
        const x = ix / (FIELD_WIDTH - 1) - 0.5;
        if (y < -0.33) continue;
        let distance = 1;
        for (const [cx, cy, cz, rx, ry, rz] of lobes) {
          const dx = (x - cx) / rx, dy = (y - cy) / ry, dz = (z - cz) / rz;
          const d = (Math.sqrt(dx * dx + dy * dy + dz * dz) - 1) * Math.min(rx, ry, rz);
          distance = smoothUnion(distance, d);
        }
        // The largest possible noise displacement and feather cannot reach
        // this empty region; skip its noise work when preparing the field.
        if (distance > 0.13) continue;
        // Three spatial frequencies and cellular erosion break the merged
        // contour, including the front-facing billows and their inner creases.
        const broad = noise3(x * 5.6 + 11.7, y * 6.5 + 33.1, z * 5.6 - 13.3, seedBits);
        const billow = noise3(x * 13 + 41, y * 14 - 6, z * 13 - 3, seedBits ^ 0x68bc21eb);
        const fine = noise3(x * 29.5 - 9, y * 28 + 5, z * 29.5 + 17, seedBits ^ 0x02e5be93);
        const cell = cellular(x, y, z);
        distance += (broad - 0.5) * 0.065 + (billow - 0.5) * 0.035
          + (cell - 0.5) * 0.1 + (fine - 0.5) * 0.015;
        const body = 1 - smooth(-0.013, 0.018, distance);
        // A gently uneven condensation base; not a collection of round bottoms.
        const baseHeight = -0.296 + (broad - 0.5) * 0.035 + (billow - 0.5) * 0.014;
        const base = smooth(baseHeight - 0.012, baseHeight + 0.018, y);
        const border = smooth(0, 0.035, Math.min(0.5 - Math.abs(x), 0.5 - Math.abs(y), 0.5 - Math.abs(z)));
        const pockets = 0.4 + 0.6 * smooth(0.1, 0.87, 1 - cell);
        const density = body * base * border * pockets * (0.7 + billow * 0.3);
        data[index] = Math.round(Math.max(0, Math.min(1, density)) * 255);
      }
    }
  }
  return densityTexture(data);
}

function densityTexture(data: Uint8Array<ArrayBuffer>): THREE.Data3DTexture {
  const texture = new THREE.Data3DTexture(data, FIELD_WIDTH, FIELD_HEIGHT, FIELD_DEPTH);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

/** Unequal rising billows and smaller shoulder buds form a three-dimensional
 * body, rather than a footprint extruded between one floor and one cap.
 * Rotated turbulence hollows its joins; no horizontal tubes are added as wisps. */
function makeCumulusDensityField(seedBits: number): THREE.Data3DTexture {
  const random=(n:number)=>lattice(n,n*7,n*13,seedBits ^ 0x5b38c27d);
  // These overlapping updrafts occupy different depths and lean differently;
  // their shoulders do not sit in a few repeated horizontal rows.
  const template:Lobe[]=[
    [-.27,-.115,-.055,.16,.19,.17],[-.12,.025,-.055,.19,.28,.185],
    [.13,-.085,-.065,.225,.205,.195],[.29,-.12,.075,.12,.15,.125],
    [-.205,-.055,.175,.135,.205,.125],[.045,.085,.135,.15,.245,.14],
    [.085,.13,-.145,.145,.235,.14],[-.045,-.16,-.215,.175,.16,.125],
  ];
  const lobes:Lobe[]=template.map(([x,y,z,rx,ry,rz],i)=>[
    x+(random(i*13+2)-.5)*.06,y+(random(i*13+3)-.5)*.09,z+(random(i*13+4)-.5)*.06,
    rx*(.87+random(i*13+5)*.25),ry*(.88+random(i*13+6)*.25),rz*(.88+random(i*13+7)*.23),
  ]);
  for(let i=0;i<template.length;i++) {
    const [x,y,z,rx,ry,rz]=lobes[i],angle=random(i*17+8)*Math.PI*2,vertical=random(i*17+10)*1.25-.42;
    const radius=.048+random(i*17+9)*.052;
    lobes.push([x+Math.cos(angle)*rx*.73,y+ry*vertical,z+Math.sin(angle)*rz*.72,
      radius*(.82+random(i*17+11)*.4),radius*(.75+random(i*17+12)*.65),radius]);
  }
  const top=Math.max(...lobes.map(lobe=>lobe[1]+lobe[4])),verticalScale=.66/(top+.28);
  for(let i=0;i<lobes.length;i++) {
    const [x,y,z,rx,ry,rz]=lobes[i];lobes[i]=[x,(y+.28)*verticalScale-.28,z,rx,ry*verticalScale,rz];
  }
  lobes.push([-.12,-.205,-.035,.26,.16,.28],[.13,-.19,.04,.255,.17,.27]);
  const parameters=new Float64Array(lobes.length*9),bases=new Float64Array(FIELD_WIDTH*FIELD_DEPTH);
  for(const [i,[x,y,z,rx,ry,rz]]of lobes.entries()) {
    parameters.set([x,y,z,1/rx,1/ry,1/rz,Math.min(rx,ry,rz),(random(i*19+5)-.5)*.85,(random(i*19+6)-.5)*.65],i*9);
  }
  for(let iz=0;iz<FIELD_DEPTH;iz++)for(let ix=0;ix<FIELD_WIDTH;ix++) {
    const x=ix/(FIELD_WIDTH-1)-.5,z=iz/(FIELD_DEPTH-1)-.5;
    bases[ix+FIELD_WIDTH*iz]=-.305+(noise3(x*6.1+3,17,z*5.7-9,seedBits)-.5)*.018;
  }
  const cellular=makeCellularField(seedBits ^ 0x467b32df),data=new Uint8Array(FIELD_WIDTH*FIELD_HEIGHT*FIELD_DEPTH);
  let index=0;
  for(let iz=0;iz<FIELD_DEPTH;iz++)for(let iy=0;iy<FIELD_HEIGHT;iy++)for(let ix=0;ix<FIELD_WIDTH;ix++,index++) {
    const x=ix/(FIELD_WIDTH-1)-.5,y=iy/(FIELD_HEIGHT-1)-.5,z=iz/(FIELD_DEPTH-1)-.5;
    const border=smooth(0,.055,Math.min(.5-Math.abs(x),.5-Math.abs(y),.5-Math.abs(z)));
    if(border===0||y<-.34)continue;
    const broad=noise3(x*4.8+y*1.2+13,y*4.2-z*1.1-4,z*4.6+x+7,seedBits);
    const billow=noise3(x*12+y*3-7,y*11-z*2+11,z*10+x*2+2,seedBits ^ 0x68bc21eb);
    const cross=noise3(x*4.1-z*1.3+9,y*4.5+x-5,z*4.3+y*1.1+19,seedBits ^ 0x15bf3a7d);
    const wx=x+(cross-.5)*.07+y*z*.1,wy=y+(broad-.5)*.05+x*z*.12,wz=z+(billow-.5)*.065-x*y*.12;
    let distance=1;
    for(let i=0;i<parameters.length;i+=9) {
      const dy=wy-parameters[i+1],dx=(wx-parameters[i]-dy*parameters[i+7])*parameters[i+3],dz=(wz-parameters[i+2]-dy*parameters[i+8])*parameters[i+5];
      distance=smoothUnion(distance,(Math.sqrt(dx*dx+(dy*parameters[i+4])**2+dz*dz)-1)*parameters[i+6]);
    }
    if(distance>.12)continue;
    const fine=noise3(wx*25+wy*4+3,wy*21-wz*3-17,wz*17+wx*3+9,seedBits ^ 0x02e5be93);
    const cell=cellular(wx*.87+wy*.24-wz*.13,wy*.91-wx*.20+wz*.27,wz*.88+wx*.21-wy*.14);
    // Erosion varies with the broad turbulent region and depth in the body;
    // equal-width shells would turn overlapping billows into cotton bands.
    const exposed=smooth(-.10,.025,distance),erosion=.042+exposed*(.035+cross*.035);
    distance+=(broad-.5)*.046+(billow-.5)*.032+(cell-.39)*erosion+(fine-.5)*.012;
    const feather=.004+.026*smooth(.27,.76,cross*.6+broad*.4),body=1-smooth(-feather*.55,feather,distance);
    const base=bases[ix+FIELD_WIDTH*iz],condensation=smooth(base-.012,base+.032,y);
    const porous=smooth(.22,.75,billow*.68+cross*.32),pockets=.42+.58*porous;
    let density=body*pockets*(.80+fine*.20);
    // Keep the shared rain origins inside the lower cloud even while local
    // erosion opens optically thin pockets elsewhere. This sets no upper cap.
    const rainFootprint=1-smooth(.60,1.,Math.hypot(x/.33,z/.28));
    const lower=1-smooth(-.24,-.17,y);
    density=Math.max(density,rainFootprint*lower*.65);
    data[index]=Math.round(Math.max(0,Math.min(1,density*condensation*border))*255);
  }
  return densityTexture(data);
}

/** An envelope with embedded turbulence, rather than a handful of inflated
 * spheres. Layered and ice forms occupy depth as well as height; their frayed
 * edges remain a finite teaching shape, not a retrieved cloud microstructure. */
function makeNaturalDensityField(seed: number, shape: NonNullable<CloudVolumeOptions['shape']>): THREE.Data3DTexture {
  const seedBits = Number.isFinite(seed) ? Math.floor(seed) | 0 : 0;
  if(shape==='cumulus')return makeCumulusDensityField(seedBits);
  const cellular = shape === 'ice' ? undefined : makeCellularField(seedBits ^ 0x467b32df);
  const random = (n: number) => lattice(n, n*7, n*13, seedBits ^ 0x5b38c27d);
  const phase = random(1)*Math.PI*2;
  const ribbons = Array.from({length: shape === 'ice' ? 12 : 7}, (_,i) => ({
    start: shape === 'ice' ? -.46+random(i*11+5)*.16 : .02+random(i*11+5)*.19,
    end: .29+random(i*11+6)*.18,
    y: (random(i*11+7)-.5)*(shape === 'ice' ? .36 : .48),
    z: (random(i*11+8)-.5)*(shape === 'ice' ? .65 : .56),
    radius: .021+random(i*11+9)*.023,
    phase: random(i*11+10)*Math.PI*2,
    tilt: (random(i*11+11)-.5)*.28,
  }));
  const data = new Uint8Array(FIELD_WIDTH*FIELD_HEIGHT*FIELD_DEPTH);
  let index = 0;
  for(let iz=0;iz<FIELD_DEPTH;iz++) {
    const z=iz/(FIELD_DEPTH-1)-.5;
    for(let iy=0;iy<FIELD_HEIGHT;iy++) {
      const y=iy/(FIELD_HEIGHT-1)-.5;
      for(let ix=0;ix<FIELD_WIDTH;ix++,index++) {
        const x=ix/(FIELD_WIDTH-1)-.5;
        const border=smooth(0,.055,Math.min(.5-Math.abs(x),.5-Math.abs(y),.5-Math.abs(z)));
        if(border===0||Math.abs(y)>.43)continue;
        const broad=noise3(x*5.2+13,y*5.1-4,z*5.6+7,seedBits);
        const billow=noise3(x*13.1-7,y*13.7+11,z*14.1+2,seedBits ^ 0x68bc21eb);
        const fine=noise3(x*31.5+3,y*30.1-17,z*32.4+9,seedBits ^ 0x02e5be93);
        let density=0;
        if(shape==='ice') {
          for(const ribbon of ribbons) {
            const along=smooth(ribbon.start,ribbon.start+.07,x)*(1-smooth(ribbon.end-.12,ribbon.end,x));
            if(along===0)continue;
            const cy=ribbon.y+x*ribbon.tilt+Math.sin(x*7+ribbon.phase)*.035;
            const cz=ribbon.z+x*.09+Math.sin(x*5+ribbon.phase)*.045;
            const dy=(y-cy)/ribbon.radius,dz=(z-cz)/(ribbon.radius*1.8);
            const cross=Math.exp(-(dy*dy+dz*dz)*1.25);
            const fibers=.24+.76*smooth(.22,.76,fine+billow*.16);
            density=Math.max(density,along*cross*fibers*.65);
          }
        } else {
          const wx=x+(noise3(x*4.1+9,y*4.5+13,z*4.3-7,seedBits ^ 0x15bf3a7d)-.5)*.065;
          const wz=z+(noise3(x*4.4-2,y*4.2-5,z*4.1+19,seedBits ^ 0x6d8a27f1)-.5)*.065;
          const footprint=Math.hypot(wx/.46,wz/.38);
          const cell=cellular!(wx,y,wz);
          const center=-.018+Math.sin(wx*4.2+wz*3.1+phase)*.055+(broad-.5)*.065;
          const thickness=.105+billow*.068+broad*.035;
          let distance=Math.max((footprint-1)*.15,(Math.abs(y-center)-thickness)*.85);
          distance+=(cell-.50)*.044+(fine-.5)*.014+(billow-.5)*.022;
          const body=1-smooth(-.024,.026,distance);
          density=body*(.32+.68*smooth(.10,.66,broad))*(.50+billow*.26);
        }
        data[index]=Math.round(Math.max(0,Math.min(1,density*border))*255);
      }
    }
  }
  return densityTexture(data);
}

const vertexShader = /* glsl */`
varying vec3 vLocalPosition;
void main() {
  vLocalPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */`
uniform highp sampler3D uDensity;
uniform float uOpacity;
uniform vec3 uRayDirection;
uniform vec3 uLightDirection;
varying vec3 vLocalPosition;

float densityAt(vec3 p) {
  // Zero border texels also make clamped samples outside the volume empty.
  return texture(uDensity, p + 0.5).r;
}

vec2 sunTransport(vec3 p, vec3 lightDirection) {
  // Sparse, widening steps approximate a secondary light ray. No costly
  // procedural noise or nested full raymarch is evaluated per fragment.
  float ahead = densityAt(p + lightDirection * 0.04);
  float path = ahead * 0.08;
  path += densityAt(p + lightDirection * 0.14) * 0.13;
  path += densityAt(p + lightDirection * 0.29) * 0.2;
  path += densityAt(p + lightDirection * 0.5) * 0.25;
  return vec2(path * 10.5, ahead);
}

void main() {
  if (uOpacity <= 0.001) discard;
  const int STEPS = 56;
  // FrontSide supplies the actual entering face, including under a small
  // orthographic camera pitch. March only as far as the next box boundary.
  vec3 rayDirection = normalize(uRayDirection);
  vec3 lightDirection = normalize(uLightDirection);
  vec3 entry = vLocalPosition;
  vec3 directionSigns = step(vec3(0.0), rayDirection) * 2.0 - 1.0;
  vec3 safeDirection = directionSigns * max(abs(rayDirection), vec3(0.00001));
  vec3 exitBoundary = directionSigns * 0.5;
  vec3 exitDistances = (exitBoundary - entry) / safeDirection;
  float rayLength = max(0.0, min(exitDistances.x, min(exitDistances.y, exitDistances.z)));
  float stepLength = rayLength / float(STEPS);
  const vec3 sunlight = vec3(1.0, 0.95, 0.84);
  float cosTheta = dot(-lightDirection, -rayDirection);
  const float g = 0.3;
  float phase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosTheta, 1.5);
  float phaseGain = 0.91 + 0.09 * phase;
  vec3 radiance = vec3(0.0);
  float transmission = 1.0;
  for (int i = 0; i < STEPS; i++) {
    vec3 p = entry + rayDirection * ((float(i) + 0.5) * stepLength);
    float density = densityAt(p);
    if (density < 0.008) continue;
    vec2 lighting = sunTransport(p, lightDirection);
    float opticalDepth = lighting.x;
    float facing = clamp(0.55 + (density - lighting.y) * 2.5, 0.15, 1.0);
    // The broad, weaker term approximates light that has scattered more than
    // once. It keeps a cool luminous interior rather than an opaque grey fill.
    float directLight = 0.7 * exp(-opticalDepth) * (0.45 + 0.55 * facing)
      + 0.11 * exp(-opticalDepth * 0.22);
    float skyAccess = smoothstep(-0.28, 0.37, p.y);
    vec3 skylight = mix(vec3(0.21, 0.30, 0.42), vec3(0.40, 0.47, 0.55), skyAccess) * 0.5;
    vec3 sampleColor = skylight + sunlight * directLight * phaseGain;
    float sampleAlpha = 1.0 - exp(-density * 11.5 * stepLength);
    radiance += transmission * sampleAlpha * sampleColor;
    transmission *= 1.0 - sampleAlpha;
    if (transmission < 0.015) break;
  }
  float alpha = 1.0 - transmission;
  if (alpha < 0.003) discard;
  // Integration accumulates premultiplied linear radiance. Unmultiply before
  // output conversion, then premultiply exactly once for Three NormalBlending.
  gl_FragColor = vec4(radiance / max(alpha, 0.0001), alpha * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <premultiplied_alpha_fragment>
}
`;

const naturalFragmentShader = /* glsl */`
uniform highp sampler3D uDensity;
uniform float uOpacity;
uniform float uDynamic;
uniform float uShape;
uniform vec4 uEvolution;
uniform vec3 uRayDirection;
uniform vec3 uLightDirection;
varying vec3 vLocalPosition;

float densityAt(vec3 p) {
  float border = min(.5-abs(p.x),min(.5-abs(p.y),.5-abs(p.z)));
  if (border <= 0.) return 0.;
  vec3 q = p;
  float gain = 1.;
  if (uDynamic > .5) {
    // Time coefficients are prepared once in setTime, not with hundreds of
    // repeated trigonometric evaluations along each primary/secondary ray.
    // Cross terms deform different interior regions in different directions.
    if (uShape < .5) {
      // Two localized eddies deform separate parts of the retained field.
      // Rational falloffs avoid per-sample procedural noise and new lookups.
      vec3 a = p-vec3(-.16,.035,.04), b = p-vec3(.17,-.015,-.095);
      vec3 curlA = cross(vec3(.35,.8,.25),a)/(1.+18.*dot(a,a));
      vec3 curlB = cross(vec3(-.4,.3,.85),b)/(1.+24.*dot(b,b));
      float anchor = smoothstep(-.31,-.19,p.y);
      q += anchor*(curlA*(uEvolution.x*.48+uEvolution.w*.18)
        + curlB*(uEvolution.y*.46-uEvolution.z*.15));
      gain += anchor*dot(vec4(p.x*p.y*2.,p.y*p.z*2.,p.x*p.z*2.,p.y*p.y-p.x*p.x),uEvolution)*.32;
    } else {
      vec3 warp = vec3(
        (p.y*.8+p.z*p.y*1.8+.13)*uEvolution.x+(p.z*p.z-.07)*uEvolution.w,
        (p.x*p.z*1.7+p.x*.35-.07)*uEvolution.y+(p.x*p.x-.08)*uEvolution.w,
        (p.x*.7-p.y*p.x*1.6+.11)*uEvolution.z);
      q += warp*(uShape < 1.5 ? .015 : .011);
      gain += dot(vec4(p.x*p.y,p.y*p.z,p.x*p.z,.12),uEvolution)*.15;
    }
  }
  // The unwarped border stays empty even while internal wisps deform. No
  // clamped sample can turn the volume's enclosing faces into a hard plate.
  return texture(uDensity,q+.5).r * gain * smoothstep(0.,.035,border);
}

vec2 sunTransport(vec3 p, vec3 lightDirection, float jitter) {
  if (uShape < .5) {
    // Integrate the actual remaining light path with four Gaussian nodes.
    // Fixed absolute probe distances create repeated horizontal shadow shells.
    vec3 signs = step(vec3(0.),lightDirection)*2.-1.;
    vec3 lengths = (.5-signs*p)/max(abs(lightDirection),vec3(.00001));
    float lightLength = max(0.,min(lengths.x,min(lengths.y,lengths.z)));
    float shift = (jitter-.5)*.025;
    float a = densityAt(p+lightDirection*lightLength*(.0694318+shift));
    float b = densityAt(p+lightDirection*lightLength*(.3300095-shift));
    float c = densityAt(p+lightDirection*lightLength*(.6699905+shift));
    float d = densityAt(p+lightDirection*lightLength*(.9305682-shift));
    return vec2((a*.1739274+b*.3260726+c*.3260726+d*.1739274)*lightLength*12.5,a);
  }
  float ahead = densityAt(p+lightDirection*.04);
  float path = ahead*.08;
  path += densityAt(p+lightDirection*.14)*.13;
  path += densityAt(p+lightDirection*.29)*.20;
  path += densityAt(p+lightDirection*.50)*.25;
  return vec2(path*10.5,ahead);
}

void main() {
  if (uOpacity <= .001) discard;
  const int STEPS = 56;
  vec3 rayDirection = normalize(uRayDirection);
  vec3 lightDirection = normalize(uLightDirection);
  vec3 entry = vLocalPosition;
  vec3 directionSigns = step(vec3(0.),rayDirection)*2.-1.;
  vec3 safeDirection = directionSigns*max(abs(rayDirection),vec3(.00001));
  vec3 exitDistances = (directionSigns*.5-entry)/safeDirection;
  float rayLength = max(0.,min(exitDistances.x,min(exitDistances.y,exitDistances.z)));
  float stepLength = rayLength/float(STEPS);
  const vec3 sunlight = vec3(1.,.965,.89);
  float cosTheta = dot(-lightDirection,-rayDirection);
  const float g = .35;
  float phase = (1.-g*g)/pow(1.+g*g-2.*g*cosTheta,1.5);
  float phaseGain = .89+.11*phase;
  float extinction = uShape < .5 ? 13.0 : (uShape < 1.5 ? 9.5 : 7.5);
  float jitter = fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
  float sampleOffset = uShape < .5 ? .35+jitter*.3 : .5;
  vec3 radiance = vec3(0.);
  float transmission = 1.;
  for (int i=0;i<STEPS;i++) {
    vec3 p = entry+rayDirection*((float(i)+sampleOffset)*stepLength);
    float density = densityAt(p);
    if (density < .006) continue;
    float lightJitter = .5+(fract(jitter+float(i)*.61803398875)-.5)*.65;
    vec2 lighting = sunTransport(p,lightDirection,lightJitter);
    vec3 sampleColor;
    if (uShape < .5) {
      // Integrated self-shadow, rather than a density-difference pseudo
      // normal, separates lit caps, overlapping shoulders and the grey base.
      float directLight = .92*exp(-lighting.x);
      float multipleLight = .18*(1.-exp(-density*2.5))*exp(-lighting.x*.24);
      float skyAccess = smoothstep(-.26,.34,p.y);
      vec3 skylight = mix(vec3(.065,.082,.105),vec3(.18,.22,.275),skyAccess);
      skylight *= .65+.35*smoothstep(.08,.7,density);
      sampleColor = skylight+sunlight*(directLight*phaseGain+multipleLight);
    } else {
      float facing = clamp(.55+(density-lighting.y)*2.5,.15,1.);
      float directLight = .76*exp(-lighting.x)*(.45+.55*facing)+.13*exp(-lighting.x*.22);
      float skyAccess = smoothstep(-.29,.34,p.y);
      vec3 skylight = mix(vec3(.17,.235,.33),vec3(.42,.48,.57),skyAccess)*.48;
      float edgeLight = (1.-smoothstep(.04,.42,density))*exp(-lighting.x*.6)*.075;
      sampleColor = skylight+sunlight*(directLight*phaseGain+edgeLight);
    }
    float sampleAlpha = 1.-exp(-density*extinction*stepLength);
    radiance += transmission*sampleAlpha*sampleColor;
    transmission *= 1.-sampleAlpha;
    if (transmission < .015) break;
  }
  float alpha = 1.-transmission;
  if (alpha < .003) discard;
  gl_FragColor = vec4(radiance/max(alpha,.0001),alpha*uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <premultiplied_alpha_fragment>
}
`;

/** A unit, unrotated cloud volume for the topic's external orthographic view.
 * No options (including {}) preserves the legacy static field and lighting.
 * Explicit shape/dynamic options opt into natural forms; only dynamic clouds
 * consume setTime. This is illustrative transport, not cloud microphysics. */
export function createCloudVolume(seed: number, options?: CloudVolumeOptions): {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.ShaderMaterial>;
  setOpacity(value: number): void;
  setTime(seconds: number): void;
  dispose(): void;
} {
  const natural = options?.shape !== undefined || options?.dynamic === true;
  const shape = options?.shape === 'layered' ? 'layered' : options?.shape === 'ice' ? 'ice' : 'cumulus';
  const dynamic = options?.dynamic === true;
  const density = natural ? makeNaturalDensityField(seed,shape) : makeLegacyDensityField(seed);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const rayDirection = new THREE.Vector3(0, 0, -1);
  // Explicit cumulus uses a high, slightly rearward sun so the front billows
  // are shaded by their own depth. Legacy/stratified consumers keep their sun.
  const worldLightDirection = natural&&shape==='cumulus'
    ? new THREE.Vector3(-.60,.77,-.22).normalize()
    : new THREE.Vector3(-0.538,0.763,0.359).normalize();
  const lightDirection = worldLightDirection.clone();
  const worldScale = new THREE.Vector3(1, 1, 1);
  const seedBits=Number.isFinite(seed)?Math.floor(seed)|0:0;
  const seedPhase=lattice(3,7,11,seedBits)*Math.PI*2;
  const evolution=new THREE.Vector4(0,0,0,0);
  const rolling=natural&&shape==='cumulus';
  const flow=(seconds:number,lane:number)=>{
    const rate=lane===0?.095:lane===1?.073:lane===2?.127:.051;
    const coordinate=seconds*rate+seedPhase*1.3+lane*2.7,cell=Math.floor(coordinate),t=coordinate-cell;
    const blend=t*t*t*(t*(t*6-15)+10);
    return lerp(lattice(cell,lane*17,11,seedBits),lattice(cell+1,lane*17,11,seedBits),blend);
  };
  const initialX=rolling?flow(0,0):Math.sin(seedPhase),initialY=rolling?flow(0,1):Math.sin(seedPhase+1.7);
  const initialZ=rolling?flow(0,2):Math.sin(seedPhase+.6),initialW=rolling?flow(0,3):Math.sin(seedPhase+2.4);
  const uniforms: Record<string,THREE.IUniform> = {
    uDensity: { value: density }, uOpacity: { value: 1 },
    uRayDirection: { value: rayDirection }, uLightDirection: { value: lightDirection },
  };
  if(natural) {
    uniforms.uDynamic={value:dynamic?1:0};
    uniforms.uShape={value:shape==='cumulus'?0:shape==='layered'?1:2};
    uniforms.uEvolution={value:evolution};
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader: natural ? naturalFragmentShader : fragmentShader,
    transparent: true,
    blending: THREE.NormalBlending,
    premultipliedAlpha: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'illustrative-cumulus-volume';
  mesh.userData.cloudShape=natural?shape:'legacy-cumulus';
  let disposed = false;
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    if (disposed) return;
    // The topic translates and positively scales this volume without rotation.
    // Undo that scale so one world-space ray remains straight in local space.
    mesh.getWorldScale(worldScale);
    worldScale.set(
      Math.max(Math.abs(worldScale.x), 0.00001),
      Math.max(Math.abs(worldScale.y), 0.00001),
      Math.max(Math.abs(worldScale.z), 0.00001),
    );
    camera.getWorldDirection(rayDirection).divide(worldScale).normalize();
    lightDirection.copy(worldLightDirection).divide(worldScale).normalize();
    material.uniformsNeedUpdate = true;
  };
  return {
    mesh,
    setOpacity(value) {
      if (!disposed) material.uniforms.uOpacity.value = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    },
    setTime(seconds) {
      if (disposed || !natural || !dynamic) return;
      const time=Number.isFinite(seconds)?seconds:0;
      if(rolling) {
        const bounded=Math.max(-1e8,Math.min(1e8,time));
        evolution.set((flow(bounded,0)-initialX)*2.,(flow(bounded,1)-initialY)*2.,
          (flow(bounded,2)-initialZ)*2.,(flow(bounded,3)-initialW)*2.);
      } else {
        evolution.set(Math.sin(seedPhase+time*.113)-initialX,Math.sin(seedPhase+1.7-time*.087)-initialY,
          Math.sin(seedPhase+.6+time*.097)-initialZ,Math.sin(seedPhase+2.4-time*.071)-initialW);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometry.dispose();
      material.dispose();
      density.dispose();
    },
  };
}
