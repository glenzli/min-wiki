import * as THREE from 'three';

/** Shared spatial illustrations, not reconstructed or measured nebulae.
 * Gas emission and dust extinction share an object-bound density field. The
 * ray integral shows changing path length and occlusion when the reader turns
 * the object; it does not calculate ionization, dynamics or a spectrum.
 *
 * Morphology references: NASA's Hubble nebula overview (emission, reflection,
 * dark clouds and varied planetary shells), and NASA/ESA's Veil Nebula account
 * (ragged shocked filaments). The enhanced, spatially separated colour bands
 * follow the presentation of processed images, not a measured abundance map or
 * a prediction of naked-eye colour. The Bubble Nebula and Veil references show
 * how filtered exposures distinguish illuminated cavities and emission sheets.
 * https://science.nasa.gov/mission/hubble/science/universe-uncovered/hubble-nebulae/
 * https://science.nasa.gov/missions/hubble/hubble-revisits-the-veil-nebula/
 * https://science.nasa.gov/asset/hubble/mosaic-image-of-the-bubble-nebula/
 * https://esahubble.org/images/potw2508a/
 */
type NebulaKind = 'cloud' | 'planetary' | 'remnant';
export type NebulaMedium = { data: Uint8Array<ArrayBuffer>; resolution: number };
export type NebulaAppearance = {
  illumination?: 'emission' | 'reflection' | 'dark';
  structure?: NebulaKind;
  opacity?: number;
  cutaway?: boolean;
  /** Local coordinates in the retained [-1,1] medium. */
  cutZ?: number;
  cool?: THREE.ColorRepresentation;
  accent?: THREE.ColorRepresentation;
  warm?: THREE.ColorRepresentation;
  luminosity?: number;
  gasExtinction?: number;
  dustExtinction?: number;
  sources?: readonly (readonly [number, number, number])[];
  lightPosition?: readonly [number, number, number];
};
export type NebulaPortrait = {
  group: THREE.Group;
  setAppearance: (appearance: NebulaAppearance) => void;
  /** Upload the same topic-owned medium after its supplied geometry has changed. */
  updateMedium: () => void;
  dispose: () => void;
};
const RESOLUTION = 64;
const STEPS = 64;

function smooth(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function hash(x: number, y: number, z: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x: number, y: number, z: number) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = smooth(0, 1, x - ix), fy = smooth(0, 1, y - iy), fz = smooth(0, 1, z - iz);
  const a = hash(ix, iy, iz) * (1 - fx) + hash(ix + 1, iy, iz) * fx;
  const b = hash(ix, iy + 1, iz) * (1 - fx) + hash(ix + 1, iy + 1, iz) * fx;
  const c = hash(ix, iy, iz + 1) * (1 - fx) + hash(ix + 1, iy, iz + 1) * fx;
  const d = hash(ix, iy + 1, iz + 1) * (1 - fx) + hash(ix + 1, iy + 1, iz + 1) * fx;
  return (a * (1 - fy) + b * fy) * (1 - fz) + (c * (1 - fy) + d * fy) * fz;
}
function turbulence(x: number, y: number, z: number) {
  return noise(x, y, z) * .57 + noise(x * 2.13 + 8.4, y * 2.13 - 2.1, z * 2.13 + 3.2) * .29
    + noise(x * 4.31 - 4.7, y * 4.31 + 7.3, z * 4.31 - 5.9) * .14;
}
const gaussian = (x: number) => Math.exp(-x * x);

/** One retained RGBA field: gas, emission, absorbing dust, colour coordinate.
 * Sampling and upload happen once per portrait creation, never per frame.
 */
function volumeField(kind: NebulaKind) {
  const data = new Uint8Array(RESOLUTION ** 3 * 4);
  let offset = 0;
  for (let iz = 0; iz < RESOLUTION; iz++) for (let iy = 0; iy < RESOLUTION; iy++) for (let ix = 0; ix < RESOLUTION; ix++) {
    const x = ix / (RESOLUTION - 1) * 2 - 1, y = iy / (RESOLUTION - 1) * 2 - 1, z = iz / (RESOLUTION - 1) * 2 - 1;
    const edge = 1 - smooth(.88, .985, Math.max(Math.abs(x), Math.abs(y), Math.abs(z)));
    if (edge === 0) { offset += 4; continue; }
    let gas: number, emission: number, dust: number, colour: number;
    if (kind === 'cloud') {
      // Unequal overlapping lobes, an illuminated cavity and branched foreground
      // dust trunks. They are continuous volumes, not opaque billboard sprites.
      const wx = x + .12 * Math.sin(y * 4.1 + z * 3.2), wy = y + .10 * Math.sin(z * 3.8 - x * 2.7);
      const lobe = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) =>
        Math.exp(-2.3 * (((wx - cx) / sx) ** 2 + ((wy - cy) / sy) ** 2 + ((z - cz) / sz) ** 2));
      const envelope = smooth(.025, .24, Math.max(lobe(-.36, .08, -.12, .60, .49, .62),
        lobe(.28, -.13, .05, .62, .42, .55), lobe(-.06, .40, -.18, .39, .45, .39),
        lobe(.50, .28, -.09, .30, .34, .36), lobe(-.52, -.30, .13, .39, .34, .38)));
      if (envelope < .001) { offset += 4; continue; }
      const broad = turbulence(x * 3.5 + 13.2, y * 3.5 + 4.3, z * 3.5 - 5.2);
      const detail = noise(x * 18 + 4.3, y * 18 - 3.9, z * 18 + 2.1);
      const wisps = smooth(.37, .65, broad) * (.62 + .38 * detail);
      const ridge = 1 - smooth(.025, .135, Math.abs(noise(x * 9.1 + 5, y * 9.1 - 4, z * 9.1 + 1) - .5));
      const cavityRadius = Math.hypot((x + .19) / .29, (y - .18) / .31, (z - .04) / .50);
      const cavity = smooth(.52, 1.12, cavityRadius);
      const foldedSheet = gaussian((y + .17 + .20 * Math.sin(x * 4.3) + .10 * Math.sin(z * 6.1)) / .065);
      gas = envelope * (.014 + .68 * wisps + .21 * ridge * wisps + .19 * foldedSheet * wisps) * cavity;
      const trunkX = -.02 + .15 * Math.sin(y * 4.3 + z * 1.5), trunkZ = .34 + .11 * Math.sin(y * 5.4);
      const trunk = gaussian((x - trunkX) / (.095 + .045 * broad)) * gaussian((z - trunkZ) / .19)
        * (1 - smooth(.45, .76, Math.abs(y + .08)));
      const branch = gaussian((y + .22 + .62 * x + .05 * Math.sin(x * 11)) / .075)
        * gaussian((z - .27 - .17 * x) / .16) * (1 - smooth(.35, .78, Math.abs(x + .15)));
      dust = envelope * Math.max(trunk, branch * .78) * (.60 + .40 * detail);
      const sourceDistance = Math.hypot(x + .19, y - .17, (z - .04) * .9);
      const cavityWall = gaussian((cavityRadius - 1.12) / .19);
      const illumination = (.28 + .72 * gaussian(sourceDistance / .66)) * (1 + .75 * cavityWall);
      // Most bright gas lies behind the foreground trunks in the initial view.
      // Turning the same field reveals the opposite side, without billboard dust.
      const nearSide = 1 - .52 * smooth(.15, .47, z);
      emission = gas * illumination * nearSide * (1 - dust * .92) * (.58 + .42 * ridge);
      // Cooler scattered-light region near the young sources; warm diffuse gas.
      colour = smooth(.39, .76, sourceDistance) * .86 + .08 * broad;
    } else {
      const qx = x / .96, qy = y / (kind === 'planetary' ? .85 : .82), qz = z / .87;
      const r = Math.hypot(qx, qy, qz), inv = 1 / Math.max(r, .001);
      if (r < .35 || r > 1.07) { offset += 4; continue; }
      const broad = turbulence(x * 3.5 + 13.2, y * 3.5 + 4.3, z * 3.5 - 5.2);
      const detail = noise(x * 18 + 4.3, y * 18 - 3.9, z * 18 + 2.1);
      const dx = qx * inv, dy = qy * inv, dz = qz * inv;
      const angular = noise(dx * 4 + 6, dy * 4 + 11, dz * 4 - 3);
      if (kind === 'planetary') {
        // A representative open barrel, viewed initially through its hollow
        // axis. The far wall must not fill that opening with a glowing sphere.
        // Its flared ends and side walls remain the same volume when rotated.
        const cylindrical = Math.hypot(qx, qy);
        const shellRadius = .69 + .13 * (qz / .82) ** 2 + .030 * (angular - .5);
        const ends = 1 - smooth(.43, .80, Math.abs(qz));
        const shell = gaussian((cylindrical - shellRadius) / .059) * ends;
        const skin = gaussian((cylindrical - shellRadius) / .028) * ends;
        const halo = gaussian((r - .93) / .048) * .075 * (1 - smooth(.42, .72, Math.abs(dz)));
        const equator = .64 + .36 * gaussian(dy / .54);
        const knots = .56 + .44 * smooth(.31, .67, broad + .14 * detail);
        const filaments = 1 - smooth(.035, .18, Math.abs(noise(x * 13 + 1, y * 13 + 8, z * 13 - 2) - .5));
        gas = (shell * .28 + skin * (.36 + .44 * filaments)) * equator * knots + halo;
        emission = gas * (.72 + .28 * detail);
        dust = shell * smooth(.71, .89, detail) * .12;
        colour = smooth(shellRadius - .025, shellRadius + .055, cylindrical) * .85;
      } else {
        // Broken shock sheets and adjoining tangled filaments. No compulsory
        // central neutron star: a compact remnant is not universal or always seen.
        const shellRadius = .76 + .16 * (angular - .5) + .043 * Math.sin(dx * 9 + dy * 5 - dz * 7);
        const shell = gaussian((r - shellRadius) / (.045 + .025 * broad));
        const broken = smooth(.27, .53, noise(dx * 6.1 - 7, dy * 6.1 + 2, dz * 6.1 + 5));
        const ridge = 1 - smooth(.025, .14, Math.abs(noise(x * 11 - 2, y * 11 + 3, z * 11 + 9) - .5));
        const filaments = .12 + .88 * ridge;
        const innerThreads = gaussian((r - shellRadius * .77) / .12) * ridge * .13;
        const shock = gaussian((r - shellRadius - .092) / .027) * .13 * broken;
        gas = shell * broken * filaments * .83 + innerThreads + shock;
        emission = gas * (.69 + .31 * detail);
        dust = shell * ridge * smooth(.65, .88, broad) * .14;
        colour = smooth(.27, .70, angular + .14 * detail);
      }
    }
    const byte = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
    data[offset++] = byte(gas * edge);
    data[offset++] = byte(emission * edge);
    data[offset++] = byte(dust * edge);
    data[offset++] = gas * edge > .002 ? byte(colour) : 0;
  }
  const texture = new THREE.Data3DTexture(data, RESOLUTION, RESOLUTION, RESOLUTION);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.unpackAlignment = 1;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** A small repeating object-space field adds connected fine sheets between the
 * main grid samples. Its trilinear, stretched ridges stay fixed during rotation;
 * they modulate existing gas rather than adding isolated luminous particles.
 */
function detailField() {
  const size = 32, data = new Uint8Array(size ** 3);
  let i = 0;
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) data[i++] = Math.round(hash(x + 37, y - 19, z + 11) * 255);
  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.unpackAlignment = 1;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function suppliedField(medium: NebulaMedium) {
  const size = medium.resolution;
  if (!Number.isInteger(size) || size < 16 || size > RESOLUTION || medium.data.length !== size ** 3 * 4) throw new RangeError('Nebula medium must be a 16–64 cubed RGBA field');
  const texture = new THREE.Data3DTexture(medium.data, size, size, size);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.unpackAlignment = 1;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

const vertexShader = `
varying vec3 vLocal;
void main() {
  vLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
precision highp sampler3D;
uniform sampler3D field;
uniform sampler3D fineField;
uniform vec3 fineStretch;
uniform vec3 localDirection;
uniform vec3 localEye;
uniform float orthographic;
uniform vec3 cool;
uniform vec3 accent;
uniform vec3 warm;
uniform float gasExtinction;
uniform float dustExtinction;
uniform float luminosity;
uniform vec3 sources[3];
uniform float sourceCount;
uniform float illumination;
uniform float structure;
uniform float opacity;
uniform float cutaway;
uniform float cutZ;
uniform vec3 lightPosition;
varying vec3 vLocal;

void main() {
  // Back faces provide the far end of each ray, so each pixel is integrated once.
  // A directional ray is essential for an orthographic camera at any distance.
  vec3 ray = orthographic > .5 ? normalize(localDirection) : normalize(vLocal - localEye);
  vec3 safeRay = sign(ray + vec3(.0000001)) * max(abs(ray), vec3(.000001));
  vec3 t0 = (-vec3(1.) - vLocal) / safeRay;
  vec3 t1 = ( vec3(1.) - vLocal) / safeRay;
  vec3 nearAxis = min(t0, t1), farAxis = max(t0, t1);
  float entry = max(max(nearAxis.x, nearAxis.y), nearAxis.z);
  float exit = min(min(farAxis.x, farAxis.y), farAxis.z);
  float distance = max(0., exit - entry);
  if (distance < .0001) discard;
  vec3 start = vLocal + ray * entry;
  float stride = distance / float(STEPS);

  // Small embedded sources are intersected analytically. Their front-to-back
  // transmission uses the same dust integral, without extra transparent meshes.
  vec3 sourceT, sourceProfile, sourceHalo;
  for (int j = 0; j < 3; j++) {
    vec3 delta = sources[j] - start;
    sourceT[j] = dot(delta, ray);
    float lateral2 = max(0., dot(delta, delta) - sourceT[j] * sourceT[j]);
    sourceProfile[j] = exp(-lateral2 / .00010);
    sourceHalo[j] = .20 * exp(-lateral2 / .0018);
  }
  vec3 radiance = vec3(0.);
  float transmission = 1.;
  for (int i = 0; i < STEPS; i++) {
    float along = (float(i) + .5) * stride;
    vec3 p = start + ray * along;
    if (cutaway > .5 && p.z > cutZ) continue;
    vec4 medium = texture(field, p * .5 + .5);
    // Soft, connected scales stay in object space. A narrow constant-density
    // contour would cover the cloud with equally bright corrugated cell walls;
    // broad mottling and sparse high-density wisps retain luminous open regions.
    float broad = texture(fineField, p * fineStretch * .21 + vec3(.63, .11, .37)).r;
    vec3 warped = p * fineStretch + vec3(.17, .31, .43) + (broad - .5) * vec3(.33, -.27, .19);
    float fine = texture(fineField, warped).r;
    float wisps = smoothstep(.60, .82, fine) * (.55 + .45 * broad);
    float lightStructure = .72 + .45 * broad + .32 * wisps;
    float dustStructure = 1.;
    if (structure < .5) {
      // The same retained noise is concentrated into two softly warped depth
      // regions. This prevents fine irregular billows from being averaged away
      // through the whole cloud. No mathematical path or independent mesh is
      // added; both layers require the caller's emitting gas or absorbing dust.
      float ragged = texture(fineField, warped * 2.17 + vec3(.43, .71, .09)).r;
      float mottle = smoothstep(.40, .63, .68 * fine + .32 * ragged);
      float emittingLayer = exp(-pow((p.z - .035 - .32 * (broad - .5)) / .045, 2.));
      float absorbingLayer = exp(-pow((p.z - .17 - .23 * (broad - .5)) / .040, 2.));
      float cavity = 1. - smoothstep(.12, .29, length(p - lightPosition));
      lightStructure = mix(.30 + .18 * broad, .72, cavity * .8)
        + emittingLayer * (.08 + 8. * mottle * mottle);
      // Absorbing features require dust in the caller's B channel. Turning the
      // cloud changes their overlap with emission; lighting never moves them.
      float dustMottle = smoothstep(.40, .69, .62 * (1. - fine) + .38 * ragged);
      dustStructure = .55 + 34. * absorbingLayer * pow(dustMottle, 1.4);
    }
    float extinction = (medium.r * (.90 + .20 * fine) * gasExtinction + medium.b * dustExtinction * dustStructure) * opacity;
    float segmentTransmission = exp(-extinction * stride);
    float path = extinction > .0001 ? (1. - segmentTransmission) / extinction : stride;
    float sourceLight = .12 + .88 * exp(-dot(p - lightPosition, p - lightPosition) * 2.2);
    // Passing through a saturated middle band keeps cyan/pink boundaries from
    // averaging into a grey complementary-colour wash. This is display colour,
    // not an assignment of elemental abundance or gas temperature.
    vec3 palette = mix(mix(cool, accent, smoothstep(.04, .52, medium.a)),
      warm, smoothstep(.48, .96, medium.a));
    vec3 emission = palette * medium.g;
    // A bounded single-scattering illustration, with the same dust and source.
    // It is not a spectral/ionization solve or an inversion of an observation.
    if (illumination > 1.5) emission = vec3(0.);
    else if (illumination > .5) emission = mix(cool, accent, .13 * broad) * (medium.r * .24 + medium.b * .35) * sourceLight;
    emission *= lightStructure * luminosity * opacity;
    radiance += transmission * emission * path;
    transmission *= segmentTransmission;
    for (int j = 0; j < 3; j++) {
      if (float(j) < sourceCount && sourceT[j] >= float(i) * stride && sourceT[j] < float(i + 1) * stride) {
        radiance += transmission * vec3(.82, .90, 1.) * (sourceProfile[j] + sourceHalo[j]);
        transmission *= 1. - sourceProfile[j];
      }
    }
    if (transmission < .015) break;
  }
  float alpha = 1. - transmission;
  if (alpha < .003 && max(max(radiance.r, radiance.g), radiance.b) < .003) discard;
  // Compress the integrated highlight by one common gain. Independent channel
  // clipping turns bright coloured clouds white and erases their inner folds.
  // A common gain bounds the display peak while retaining linear RGB ratios.
  float peak = max(max(radiance.r, radiance.g), radiance.b);
  radiance *= (1. - exp(-peak)) / max(peak, .00001);
  // radiance is already the integrated premultiplied source term. Multiplying
  // it by alpha again would hide optically thin luminous filaments. The ONE /
  // ONE_MINUS_SRC_ALPHA blend combines emitted light with transmitted sky light.
  gl_FragColor = vec4(radiance, alpha);
  #include <colorspace_fragment>
}`;

/** Caller owns the returned group's geometry/material lifetime; dispose owns the
 * retained 3D textures only and is idempotent. No DOM, renderer, cache or clock.
 * The bounding cube is [-1,1], with every face fading to an empty density field.
 */
export function createNebulaPortrait(id: string, options: { medium?: NebulaMedium; steps?: number; depthTest?: boolean } = {}): NebulaPortrait {
  const kind: NebulaKind = id === 'planetary-nebula' ? 'planetary'
    : id === 'remnant' || id === 'supernova-remnant' ? 'remnant' : 'cloud';
  const field = options.medium ? suppliedField(options.medium) : volumeField(kind), fineField = detailField();
  const steps = Number.isFinite(options.steps) ? Math.max(16, Math.min(STEPS, Math.round(options.steps!))) : STEPS;
  const sourcePositions = kind === 'cloud' ? [[-.22, .16, .04], [-.10, .28, -.17], [.08, .10, -.10]] : [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const material = new THREE.ShaderMaterial({
    name: `Nebula-${kind}`,
    defines: { STEPS: steps }, vertexShader, fragmentShader,
    transparent: true, premultipliedAlpha: true,
    side: THREE.BackSide, depthWrite: false, depthTest: options.depthTest ?? true,
    uniforms: {
      field: { value: field }, fineField: { value: fineField },
      fineStretch: { value: kind === 'cloud' ? new THREE.Vector3(1.1, .98, .45) : kind === 'planetary' ? new THREE.Vector3(.65, .65, .48) : new THREE.Vector3(.82, .64, .78) },
      localDirection: { value: new THREE.Vector3(0, 0, -1) },
      localEye: { value: new THREE.Vector3(0, 0, 10) }, orthographic: { value: 1 },
      cool: { value: new THREE.Color(kind === 'cloud' ? '#36c6ed' : kind === 'planetary' ? '#27d6d0' : '#35c2f2') },
      accent: { value: new THREE.Color(kind === 'cloud' ? '#bb42da' : kind === 'planetary' ? '#6c68ea' : '#ed527b') },
      warm: { value: new THREE.Color(kind === 'cloud' ? '#ff537e' : kind === 'planetary' ? '#ff9059' : '#ffa24b') },
      gasExtinction: { value: kind === 'cloud' ? 1.45 : .78 },
      dustExtinction: { value: kind === 'cloud' ? 10.2 : .9 },
      luminosity: { value: kind === 'cloud' ? 2.25 : kind === 'planetary' ? 5.8 : 9.5 },
      sources: { value: sourcePositions.map(p => new THREE.Vector3(...p)) },
      sourceCount: { value: kind === 'cloud' ? 3 : kind === 'planetary' ? 1 : 0 },
      illumination: { value: 0 }, structure: { value: kind === 'cloud' ? 0 : kind === 'planetary' ? 1 : 2 },
      opacity: { value: 1 }, cutaway: { value: 0 }, cutZ: { value: 0 },
      lightPosition: { value: new THREE.Vector3(-.19, .17, .04) },
    },
  });
  const group = new THREE.Group(); group.name = `nebula-${kind}`;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material);
  mesh.name = 'emitting-and-obscuring-volume';
  const inverse = new THREE.Matrix4(), worldDirection = new THREE.Vector3();
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    inverse.copy(mesh.matrixWorld).invert();
    camera.getWorldDirection(worldDirection);
    material.uniforms.localDirection.value.copy(worldDirection).transformDirection(inverse);
    material.uniforms.localEye.value.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inverse);
    material.uniforms.orthographic.value = (camera as THREE.OrthographicCamera).isOrthographicCamera ? 1 : 0;
  };
  group.add(mesh);
  let disposed = false;
  return {
    group,
    setAppearance(appearance) {
      if (disposed) return;
      const uniforms = material.uniforms;
      if (appearance.illumination !== undefined) uniforms.illumination!.value = appearance.illumination === 'dark' ? 2 : appearance.illumination === 'reflection' ? 1 : 0;
      if (appearance.structure !== undefined) uniforms.structure!.value = appearance.structure === 'cloud' ? 0 : appearance.structure === 'planetary' ? 1 : 2;
      if (appearance.opacity !== undefined && Number.isFinite(appearance.opacity)) uniforms.opacity!.value = Math.max(0, Math.min(1, appearance.opacity));
      if (appearance.cutaway !== undefined) uniforms.cutaway!.value = Number(appearance.cutaway);
      if (appearance.cutZ !== undefined && Number.isFinite(appearance.cutZ)) uniforms.cutZ!.value = appearance.cutZ;
      if (appearance.cool !== undefined) uniforms.cool!.value.set(appearance.cool);
      if (appearance.accent !== undefined) uniforms.accent!.value.set(appearance.accent);
      if (appearance.warm !== undefined) uniforms.warm!.value.set(appearance.warm);
      for (const key of ['luminosity', 'gasExtinction', 'dustExtinction'] as const) if (appearance[key] !== undefined && Number.isFinite(appearance[key])) uniforms[key]!.value = Math.max(0, appearance[key]!);
      if (appearance.sources !== undefined) {
        const sources = uniforms.sources!.value as THREE.Vector3[];
        for (let index = 0; index < 3; index++) sources[index]!.set(...(appearance.sources[index] ?? [0, 0, 0]));
        uniforms.sourceCount!.value = Math.min(3, appearance.sources.length);
      }
      if (appearance.lightPosition !== undefined) uniforms.lightPosition!.value.set(...appearance.lightPosition);
    },
    updateMedium() { if (!disposed) field.needsUpdate = true; },
    dispose() { if (!disposed) { disposed = true; field.dispose(); fineField.dispose(); } },
  };
}
