import * as THREE from 'three';

export type StellarPortrait = {
  group: THREE.Group;
  setEnergy: (enabled: boolean) => void;
  /** Supplied presentation state only; no clock or scientific evolution is owned here. */
  setAppearance: (appearance: StellarAppearance) => void;
  /** The scene owns geometry/material disposal; this releases only our generated maps. */
  dispose: () => void;
};

export type StellarAppearance = {
  color?: THREE.ColorRepresentation;
  opacity?: number;
  time?: number;
  activeRegions?: number;
  glare?: number;
  profile?: StellarProfile;
  /** Display radiance, independent of radius, opacity and the topic's science clock. */
  emission?: number;
};
export type StellarProfile = 'solar' | 'red-giant' | 'red-dwarf' | 'compact';
export type PhotosphereField = { data: Uint8Array<ArrayBuffer>; size: number };

const PROFILES = {
  solar: { granuleScale: 1.03, contrast: .25, limb: .36, activity: 1, glareWidth: .064, glareStrength: .60 },
  'red-giant': { granuleScale: .13, contrast: .34, limb: .28, activity: .16, glareWidth: .082, glareStrength: .72 },
  'red-dwarf': { granuleScale: .58, contrast: .42, limb: .34, activity: 1, glareWidth: .054, glareStrength: .68 },
  compact: { granuleScale: .72, contrast: 0, limb: .20, activity: 0, glareWidth: .029, glareStrength: .96 },
} as const;

/** The same morphology and radiance choices are used by the GPU and Canvas owners.
 * These enlarged features distinguish illustrations; none is a measured surface map. */
export function stellarProfileSettings(profile: StellarProfile) { return PROFILES[profile]; }

const COMPACT_DISPLAY_EXPONENT = .4;
/** Compress the illustrated cooling range while preserving zero, one and order.
 * This is display exposure, never a change to the supplied cooling or radius. */
export function stellarDisplayEmission(emission: number, profile: StellarProfile): number {
  const bounded = Math.max(0, Math.min(1, emission));
  return bounded ** (profile === 'compact' ? COMPACT_DISPLAY_EXPONENT : 1);
}

export function stellarSurfacePalette(color: THREE.ColorRepresentation, profile: StellarProfile) {
  const tint = new THREE.Color(color);
  if (profile === 'red-giant') tint.multiply(new THREE.Color().setRGB(1, .83, .67));
  if (profile === 'red-dwarf') tint.multiply(new THREE.Color().setRGB(1, .87, .73));
  const cool = tint.clone(), hot = tint.clone();
  if (profile === 'compact') { cool.multiplyScalar(.82); hot.multiplyScalar(1.08); }
  else {
    cool.multiply(profile === 'solar' ? new THREE.Color().setRGB(.84, .79, .72) : new THREE.Color().setRGB(.72, .62, .51));
    hot.multiplyScalar(1.08);
  }
  return { cool, hot, glow: tint };
}

type StellarKind = 'sun' | 'red-dwarf' | 'white-dwarf' | 'neutron-star';
const RADIUS = .85;
const MAP_SIZE = 256;
const CELL_COUNT = 43;
const PLANE_U = [.17, .53, .31] as const;
const PLANE_V = [.39, .11, .73] as const;

const surfaceVertex = `
varying vec3 vLocalPosition;
varying vec3 vViewNormal;
varying vec3 vToEye;
void main() {
  vLocalPosition = position;
  vViewNormal = normalMatrix * normal;
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vToEye = -viewPosition.xyz;
  gl_Position = projectionMatrix * viewPosition;
}`;

const photosphereFragment = `
uniform sampler2D photosphere;
uniform vec3 coolColor;
uniform vec3 hotColor;
uniform vec4 starSpots[8];
uniform float granuleScale;
uniform float limbStrength;
uniform float granuleContrast;
uniform float spotStrength;
uniform float emissionStrength;
uniform float displayExponent;
uniform float compactSurface;
uniform float energy;
uniform float opacity;
uniform float surfaceTime;
uniform float activeRegions;
varying vec3 vLocalPosition;
varying vec3 vViewNormal;
varying vec3 vToEye;

// A solid-angle field, without longitude seams, polar pinching or moving screen noise.
vec3 surfaceField(vec3 p) {
  p = normalize(p + vec3(.012 * (sin(surfaceTime * .23 + p.y * 4.0) - sin(p.y * 4.0)),
    .009 * (sin(surfaceTime * .17 + p.z * 5.0) - sin(p.z * 5.0)), 0.0));
  vec3 weights = pow(abs(p), vec3(4.0));
  weights /= max(dot(weights, vec3(1.0)), .0001);
  vec3 x = texture2D(photosphere, p.yz * granuleScale + vec2(.17, .39)).rgb;
  vec3 y = texture2D(photosphere, p.zx * granuleScale + vec2(.53, .11)).rgb;
  vec3 z = texture2D(photosphere, p.xy * granuleScale + vec2(.31, .73)).rgb;
  return x * weights.x + y * weights.y + z * weights.z;
}

void main() {
  if (energy > .5 && vLocalPosition.x > 0.0 && vLocalPosition.z > 0.0) discard;
  vec3 p = normalize(vLocalPosition);
  float angle = surfaceTime * .055;
  p = vec3(p.x * cos(angle) + p.z * sin(angle), p.y, p.z * cos(angle) - p.x * sin(angle));
  vec3 field = surfaceField(p);
  float mu = clamp(dot(normalize(vViewNormal), normalize(vToEye)), 0.0, 1.0);
  // Fine hot upwellings and soft dark gaps are emission contrast, never relief.
  float grain = field.r;
  float heat = smoothstep(.24, .80, grain);
  float brightness = (1.025 + granuleContrast * (heat - .5) + (field.b - .5) * .035) * (.97 + .06 * field.g);
  vec3 emission = mix(coolColor, hotColor, heat);

  float penumbra = 0.0;
  float umbra = 0.0;
  float activeSurround = 0.0;
  for (int i = 0; i < 8; i++) {
    float radius = max(starSpots[i].w, .00001);
    vec3 delta = p - starSpots[i].xyz;
    float a = atan(delta.y, delta.x + delta.z * .37);
    float aspect = 1.0 + .18 * sin(float(i) * 2.3);
    float distanceToSpot = length(delta * vec3(aspect, 1.0 / aspect, 1.0)) / radius;
    distanceToSpot /= .94 + .10 * sin(a * 5.0 + float(i) * 1.7) + .065 * sin(a * 9.0 - float(i) * 2.1)
      + .12 * (field.g - .5) + .08 * (field.b - .5);
    penumbra = max(penumbra, (1.0 - smoothstep(.44, 1.28, distanceToSpot)) * (.96 + .04 * sin(a * 24.0 + distanceToSpot * 18.0)));
    umbra = max(umbra, 1.0 - smoothstep(.14, .59, distanceToSpot));
    activeSurround = max(activeSurround, 1.0 - smoothstep(1.0, 2.5, distanceToSpot));
  }
  brightness *= 1.0 - activeRegions * spotStrength * (.31 * penumbra + .53 * umbra);
  // Facular contrast is modest and most apparent toward the limb.
  brightness += activeRegions * spotStrength * max(0.0, activeSurround - penumbra) * pow(1.0 - mu, 1.7) * (.15 + .12 * field.b);
  float limb = 1.0 - limbStrength * (1.0 - pow(mu, .63));
  if (compactSurface > .5) {
    emission = mix(coolColor, hotColor, .30 + .70 * pow(mu, .42));
    brightness = 1.0;
    limb = 1.0 - limbStrength * (1.0 - pow(mu, .58));
  }
  gl_FragColor = vec4(emission * brightness * limb * pow(emissionStrength, displayExponent), opacity);
  #include <colorspace_fragment>
}`;

const compactFragment = `
uniform vec3 edgeColor;
uniform vec3 centerColor;
uniform float neutron;
uniform float energy;
uniform float opacity;
uniform float emissionStrength;
uniform float displayExponent;
uniform float limbStrength;
varying vec3 vLocalPosition;
varying vec3 vViewNormal;
varying vec3 vToEye;

float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
void main() {
  if (energy > .5 && vLocalPosition.x > 0.0 && vLocalPosition.z > 0.0) discard;
  vec3 p = normalize(vLocalPosition);
  float mu = clamp(dot(normalize(vViewNormal), normalize(vToEye)), 0.0, 1.0);
  // Deliberately restrained: no invented craters, crustal map or solar granulation.
  float variation = 1.0 + .014 * (noise(p * 21.0) - .5) + .018 * (noise(p * 5.0) - .5);
  float pole = pow(max(0.0, abs(dot(p, normalize(vec3(.29, .84, .46))))), 12.0);
  float limb = 1.0 - limbStrength * (1.0 - pow(mu, .58));
  vec3 emission = mix(edgeColor, centerColor, .30 + .70 * pow(mu, .42));
  gl_FragColor = vec4(emission * limb * variation * (1.0 + neutron * pole * .05) * pow(emissionStrength, displayExponent), opacity);
  #include <colorspace_fragment>
}`;

const glareVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float scale = length(modelViewMatrix[0].xyz);
  // At a close perspective camera the apparent sphere limb extends beyond its
  // center-plane radius. Match that projection so depth testing cannot hide the halo.
  float ratio = .85 * scale / max(length(center.xyz), .85 * scale + .001);
  float apparent = 1.0 / sqrt(max(.08, 1.0 - ratio * ratio));
  gl_Position = projectionMatrix * (center + vec4(position.xy * scale * apparent, 0.0, 0.0));
}`;

const glareFragment = `
uniform vec3 glowColor;
uniform float width;
uniform float strength;
varying vec2 vUv;
void main() {
  vec2 point = vUv * 2.0 - 1.0;
  float radius = length(point) * 1.15;
  float angle = atan(point.y, point.x);
  if (radius < .79 || radius > 1.15) discard;
  float distanceFromLimb = max(0.0, radius - .85);
  float lobe = .72 + .18 * sin(angle * 3.0 + .7) + .10 * sin(angle * 7.0 - .4);
  float localWidth = width * (.82 + .27 * lobe);
  float closeGlow = exp(-distanceFromLimb / localWidth);
  float faintGlare = exp(-distanceFromLimb / (localWidth * 2.9)) * .12;
  float falloff = (1.0 - smoothstep(1.0, 1.15, radius)) * smoothstep(.79, .85, radius);
  float alpha = (closeGlow + faintGlare) * strength * lobe * falloff;
  gl_FragColor = vec4(glowColor, alpha);
  #include <colorspace_fragment>
}`;

const sectionFragment = `
uniform float storedHeat;
uniform vec3 outerColor;
varying vec3 vLocalPosition;
void main() {
  float r = clamp(length(vLocalPosition) / .85, 0.0, 1.0);
  // This is an energy-source key, not a measured temperature/layer profile.
  float fusionRegion = exp(-pow(r / .34, 4.0));
  vec3 fusion = mix(outerColor * .54, vec3(1.0, .93, .68), fusionRegion);
  vec3 retainedHeat = mix(vec3(1.0, .78, .53), vec3(.72, .84, 1.0), .32 + .25 * r);
  gl_FragColor = vec4(mix(fusion, retainedHeat, storedHeat), 1.0);
  #include <colorspace_fragment>
}`;

function hash2(x: number, y: number, seed: number): number {
  let value = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function periodicNoise(x: number, y: number, cells: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const tx = fx * fx * (3 - 2 * fx), ty = fy * fy * (3 - 2 * fy);
  const wrapped = (a: number) => (a % cells + cells) % cells;
  const a = hash2(wrapped(ix), wrapped(iy), seed);
  const b = hash2(wrapped(ix + 1), wrapped(iy), seed);
  const c = hash2(wrapped(ix), wrapped(iy + 1), seed);
  const d = hash2(wrapped(ix + 1), wrapped(iy + 1), seed);
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

/** One small periodic field, sampled in three object-space planes. No bitmap or DOM dependency. */
export function createPhotosphereField(seed = 11293): PhotosphereField {
  const pixels = new Uint8Array(MAP_SIZE * MAP_SIZE * 4);
  const centers = Array.from({ length: CELL_COUNT * CELL_COUNT }, (_, index) => {
    const x = index % CELL_COUNT, y = Math.floor(index / CELL_COUNT);
    const angle = hash2(x, y, seed + 211) * Math.PI * 2;
    return [.08 + .84 * hash2(x, y, seed), .08 + .84 * hash2(x, y, seed + 101),
      .38 + .28 * hash2(x, y, seed + 137), .35 + .27 * hash2(x, y, seed + 149),
      Math.cos(angle), Math.sin(angle), .55 + .45 * hash2(x, y, seed + 181)];
  });
  for (let y = 0; y < MAP_SIZE; y++) for (let x = 0; x < MAP_SIZE; x++) {
    const u = (x + .5) / MAP_SIZE, v = (y + .5) / MAP_SIZE;
    const broad = periodicNoise(u * 5, v * 5, 5, seed + 31) * .6 + periodicNoise(u * 13, v * 13, 13, seed + 37) * .4;
    const fine = periodicNoise(u * 103, v * 103, 103, seed + 71) * .58 + periodicNoise(u * 67, v * 67, 67, seed + 73) * .42;
    // Warp an unequal collection of overlapping hot patches, rather than
    // outlining the nearest-cell polygons. Soft irregular gaps remain between
    // them; finer bright structure breaks up the patches without a rigid shell.
    const px = u * CELL_COUNT + .70 * (periodicNoise(u * 9, v * 9, 9, seed + 41) - .5)
      + .23 * (periodicNoise(u * 29, v * 29, 29, seed + 43) - .5);
    const py = v * CELL_COUNT + .65 * (periodicNoise(u * 11, v * 11, 11, seed + 47) - .5)
      + .23 * (periodicNoise(u * 31, v * 31, 31, seed + 53) - .5);
    const ix = Math.floor(px), iy = Math.floor(py);
    let hot = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const cx = ix + ox, cy = iy + oy;
      const feature = centers[((cy + CELL_COUNT) % CELL_COUNT) * CELL_COUNT + (cx + CELL_COUNT) % CELL_COUNT]!;
      const dx = cx + feature[0]! - px, dy = cy + feature[1]! - py;
      const along = (dx * feature[4]! + dy * feature[5]!) / feature[2]!, across = (dy * feature[4]! - dx * feature[5]!) / feature[3]!;
      hot += Math.exp(-(along * along + across * across) * 1.55) * feature[6]!;
    }
    const grain = .22 + .66 * (1 - Math.exp(-hot * 1.9)) + .09 * (fine - .5) + .05 * (broad - .5);
    const offset = (y * MAP_SIZE + x) * 4;
    pixels[offset] = Math.round(Math.max(0, Math.min(1, grain)) * 255);
    pixels[offset + 1] = Math.round(broad * 255);
    pixels[offset + 2] = Math.round(fine * 255);
    pixels[offset + 3] = 255;
  }
  return { data: pixels, size: MAP_SIZE };
}

/** The Canvas and GPU projections sample the same periodic, object-bound field. */
export function samplePhotosphere(field: PhotosphereField, x: number, y: number, z: number, target: Float64Array, scale = 1.25, time = 0): Float64Array {
  const { data, size } = field;
  const originalY = y;
  x += .012 * (Math.sin(time * .23 + originalY * 4) - Math.sin(originalY * 4));
  y += .009 * (Math.sin(time * .17 + z * 5) - Math.sin(z * 5));
  const length = Math.hypot(x, y, z);
  x /= length; y /= length; z /= length;
  const wx = x ** 4, wy = y ** 4, wz = z ** 4, weight = Math.max(.0001, wx + wy + wz);
  target.fill(0);
  for (let plane = 0; plane < 3; plane++) {
    const u = (plane === 0 ? y : plane === 1 ? z : x) * scale + PLANE_U[plane]!;
    const v = (plane === 0 ? z : plane === 1 ? x : y) * scale + PLANE_V[plane]!;
    const px = u * size - .5, py = v * size - .5, ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
    const wrap = (value: number) => (value % size + size) % size;
    const a = (wrap(iy) * size + wrap(ix)) * 4, b = (wrap(iy) * size + wrap(ix + 1)) * 4;
    const c = (wrap(iy + 1) * size + wrap(ix)) * 4, d = (wrap(iy + 1) * size + wrap(ix + 1)) * 4;
    const blend = (plane === 0 ? wx : plane === 1 ? wy : wz) / weight / 255;
    for (let channel = 0; channel < 3; channel++) target[channel] += ((data[a + channel]! * (1 - fx) + data[b + channel]! * fx) * (1 - fy)
      + (data[c + channel]! * (1 - fx) + data[d + channel]! * fx) * fy) * blend;
  }
  return target;
}

function createPhotosphereMap(seed: number): THREE.DataTexture {
  const field = createPhotosphereField(seed);
  const texture = new THREE.DataTexture(field.data, field.size, field.size, THREE.RGBAFormat);
  texture.name = 'stable-photospheric-field';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function spot(x: number, y: number, z: number, radius: number): THREE.Vector4 {
  const direction = new THREE.Vector3(x, y, z).normalize();
  return new THREE.Vector4(direction.x, direction.y, direction.z, radius);
}

function spotsFor(profile: StellarProfile): THREE.Vector4[] {
  const spots = profile === 'red-dwarf'
    ? [spot(-.36, .24, .90, .17), spot(-.18, .34, .93, .10), spot(.48, -.27, .83, .12),
      spot(.37, -.36, .85, .075), spot(.82, .37, -.44, .15), spot(-.72, -.49, -.50, .14),
      spot(.13, .82, -.56, .12), spot(-.51, -.24, .83, .075)]
    : [spot(-.35, .19, .92, .074), spot(-.27, .15, .95, .043), spot(.47, -.24, .85, .048),
      spot(.52, -.20, .83, .029), spot(.69, .31, -.65, .053), spot(-.61, -.24, -.76, .044)];
  while (spots.length < 8) spots.push(spot(0, 0, -1, 0));
  return spots;
}

const SOLAR_SPOTS = spotsFor('solar').map(value => value.toArray() as [number, number, number, number]);
const DWARF_SPOTS = spotsFor('red-dwarf').map(value => value.toArray() as [number, number, number, number]);
export function stellarSpotDirections(profile: StellarProfile): readonly (readonly [number, number, number, number])[] {
  return profile === 'red-dwarf' ? DWARF_SPOTS : SOLAR_SPOTS;
}

function createEnergySection(kind: StellarKind): THREE.Group {
  const section = new THREE.Group();
  section.name = kind === 'white-dwarf' ? 'stored-heat-key' : 'core-fusion-key';
  section.visible = false;
  const material = new THREE.ShaderMaterial({
    name: 'stellar-energy-section', vertexShader: surfaceVertex, fragmentShader: sectionFragment,
    uniforms: { storedHeat: { value: kind === 'white-dwarf' ? 1 : 0 }, outerColor: { value: new THREE.Color(kind === 'red-dwarf' ? '#ed8c4c' : '#f9c76b') } },
    side: THREE.DoubleSide, toneMapped: false,
  });
  // Closed radial faces belong to the optional explanatory quarter-section only.
  for (const axis of ['z', 'x']) {
    const geometry = new THREE.CircleGeometry(RADIUS * .999, 64, -Math.PI / 2, Math.PI);
    const face = new THREE.Mesh(geometry, material.clone());
    if (axis === 'x') face.rotation.y = -Math.PI / 2;
    section.add(face);
  }
  material.dispose();
  for (let index = 0; index < 5; index++) {
    const direction = new THREE.Vector3(.82, (index - 2) * .51, .92).normalize();
    const start = kind === 'white-dwarf' ? .52 : .34;
    const arrow = new THREE.ArrowHelper(direction, direction.clone().multiplyScalar(start), .93 - start, '#fff0be', .085, .038);
    arrow.name = 'fixed-outward-energy-transfer';
    section.add(arrow);
  }
  return section;
}

/**
 * Enlarged identification illustrations, with compressed brightness and exaggerated detail.
 * The glare is a display cue, not a measured corona. No feature map or resolved image is claimed.
 * NASA: solarscience.msfc.nasa.gov/surface.shtml; science.nasa.gov/universe/stars/types/.
 */
export function createStellarPortrait(id: string, options: { energySection?: boolean } = {}): StellarPortrait {
  if (!['sun', 'red-dwarf', 'white-dwarf', 'neutron-star'].includes(id)) throw new RangeError(`Unsupported stellar portrait: ${id}`);
  const kind = id as StellarKind;
  const group = new THREE.Group();
  group.name = `stellar-portrait-${kind}`;
  const fusion = kind === 'sun' || kind === 'red-dwarf';
  let profile: StellarProfile = kind === 'sun' ? 'solar' : kind === 'red-dwarf' ? 'red-dwarf' : 'compact';
  let settings = stellarProfileSettings(profile);
  const tint = new THREE.Color(kind === 'sun' ? '#fff0cf' : kind === 'red-dwarf' ? '#efaf85' : kind === 'white-dwarf' ? '#dbeaff' : '#c4e1ff');
  const initialPalette = stellarSurfacePalette(tint, profile);
  const textures: THREE.Texture[] = [];
  let material: THREE.ShaderMaterial;
  if (fusion) {
    const texture = createPhotosphereMap(kind === 'sun' ? 11293 : 77149);
    textures.push(texture);
    material = new THREE.ShaderMaterial({
      name: 'stellar-photosphere', vertexShader: surfaceVertex, fragmentShader: photosphereFragment,
      uniforms: {
        photosphere: { value: texture }, starSpots: { value: spotsFor(profile) }, energy: { value: 0 },
        opacity: { value: 1 }, surfaceTime: { value: 0 }, activeRegions: { value: 1 },
        coolColor: { value: initialPalette.cool }, hotColor: { value: initialPalette.hot },
        granuleScale: { value: settings.granuleScale }, limbStrength: { value: settings.limb },
        granuleContrast: { value: settings.contrast }, spotStrength: { value: settings.activity },
        compactSurface: { value: 0 }, emissionStrength: { value: 1 }, displayExponent: { value: 1 },
      }, toneMapped: false,
    });
  } else {
    material = new THREE.ShaderMaterial({
      name: 'stellar-compact-emission', vertexShader: surfaceVertex, fragmentShader: compactFragment,
      uniforms: {
        edgeColor: { value: initialPalette.cool }, centerColor: { value: initialPalette.hot },
        neutron: { value: kind === 'neutron-star' ? 1 : 0 }, energy: { value: 0 }, opacity: { value: 1 },
        emissionStrength: { value: 1 }, displayExponent: { value: COMPACT_DISPLAY_EXPONENT }, limbStrength: { value: settings.limb },
      }, toneMapped: false,
    });
  }
  const body = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 80, 56), material);
  body.name = 'emitting-visible-surface';
  group.add(body);
  const glare = new THREE.Mesh(new THREE.CircleGeometry(1.15, 96), new THREE.ShaderMaterial({
    name: 'stellar-display-glare', vertexShader: glareVertex, fragmentShader: glareFragment,
    uniforms: {
      glowColor: { value: initialPalette.glow },
      width: { value: settings.glareWidth }, strength: { value: settings.glareStrength },
    }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  glare.name = 'bounded-emission-glare';
  glare.frustumCulled = false;
  group.add(glare);

  const section = kind === 'neutron-star' || options.energySection === false ? undefined : createEnergySection(kind);
  if (section) group.add(section);
  let disposed = false;
  const glareMaterial = glare.material as THREE.ShaderMaterial;
  const suppliedTint = new THREE.Color();
  let opacity = 1, glareStrength = 1, emissionStrength = 1;
  return {
    group,
    setEnergy(enabled) {
      if (disposed) return;
      const visible = enabled && Boolean(section);
      material.uniforms.energy!.value = visible ? 1 : 0;
      if (section) section.visible = visible;
    },
    setAppearance(appearance) {
      if (disposed) return;
      let paletteChanged = false;
      if (appearance.profile !== undefined && appearance.profile !== profile) {
        profile = appearance.profile;
        settings = stellarProfileSettings(profile);
        material.uniforms.limbStrength!.value = settings.limb;
        material.uniforms.displayExponent!.value = profile === 'compact' ? COMPACT_DISPLAY_EXPONENT : 1;
        if (fusion) {
          material.uniforms.granuleScale!.value = settings.granuleScale;
          material.uniforms.granuleContrast!.value = settings.contrast;
          material.uniforms.spotStrength!.value = settings.activity;
          material.uniforms.compactSurface!.value = Number(profile === 'compact');
          stellarSpotDirections(profile).forEach((value, index) => material.uniforms.starSpots!.value[index].set(...value));
        }
        paletteChanged = true;
      }
      if (appearance.color !== undefined) {
        suppliedTint.set(appearance.color);
        if (!suppliedTint.equals(tint)) { tint.copy(suppliedTint); paletteChanged = true; }
      }
      if (paletteChanged) {
        const palette = stellarSurfacePalette(tint, profile);
        if (fusion) {
          material.uniforms.coolColor!.value.copy(palette.cool);
          material.uniforms.hotColor!.value.copy(palette.hot);
        } else {
          material.uniforms.edgeColor!.value.copy(palette.cool);
          material.uniforms.centerColor!.value.copy(palette.hot);
        }
        glareMaterial.uniforms.glowColor!.value.copy(palette.glow);
      }
      if (appearance.opacity !== undefined && Number.isFinite(appearance.opacity)) {
        opacity = Math.max(0, Math.min(1, appearance.opacity));
        material.uniforms.opacity!.value = opacity;
        material.transparent = opacity < 1;
        material.depthWrite = opacity === 1;
      }
      if (fusion && appearance.time !== undefined && Number.isFinite(appearance.time)) material.uniforms.surfaceTime!.value = appearance.time;
      if (fusion && appearance.activeRegions !== undefined && Number.isFinite(appearance.activeRegions)) material.uniforms.activeRegions!.value = Math.max(0, Math.min(1, appearance.activeRegions));
      if (appearance.glare !== undefined && Number.isFinite(appearance.glare)) glareStrength = Math.max(0, Math.min(1, appearance.glare));
      if (appearance.emission !== undefined && Number.isFinite(appearance.emission)) {
        emissionStrength = Math.max(0, Math.min(1, appearance.emission));
        material.uniforms.emissionStrength!.value = emissionStrength;
      }
      glareMaterial.uniforms.width!.value = settings.glareWidth * (.42 + .58 * Math.sqrt(emissionStrength));
      glareMaterial.uniforms.strength!.value = settings.glareStrength * glareStrength * opacity * emissionStrength ** .7;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const texture of textures) texture.dispose();
    },
  };
}
