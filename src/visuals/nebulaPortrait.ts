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
/** Optional resolved optical interface. RGBA then carries diffuse-gas amplitude,
 * emitting-front amplitude, interior dust amplitude, and front colour. The
 * caller supplies the distance and optical widths; no named geometry lives here. */
export type NebulaOpticalFront = {
  distance: Uint8Array<ArrayBuffer>;
  range: number;
  width: number;
  offset: number;
  densityWidth: number;
  haloWidth: number;
  haloOffset: number;
  diffuseRatio: number;
  gasRatio: number;
};
export type NebulaMedium = { data: Uint8Array<ArrayBuffer>; resolution: number; front?: NebulaOpticalFront };
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
  /** Requested quadrature, bounded by this portrait's compiled step budget. */
  samplingSteps?: number;
  /** Object-space sampling displacement and independent optical detail gains.
   * Resolved dust fronts need less displacement than diffuse molecular clouds. */
  densityDisplacement?: number;
  emissionVariation?: number;
  dustVariation?: number;
  dustLight?: number;
  /** Weak incident starlight scattered by neutral gas/dust, independent of
   * ionized emission. Zero preserves existing portrait appearances. */
  scatteredLight?: number;
  /** Column-major transform into an object-bound dust-detail frame. */
  dustDetailTransform?: readonly number[];
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
const MAX_STEPS = 96;

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
      const cavityRadius = Math.hypot((x + .19) / .29, (y - .18) / .31, (z - .04) / .50);
      const cavity = smooth(.52, 1.12, cavityRadius);
      gas = envelope * (.025 + .86 * wisps * (.82 + .18 * detail)) * cavity;
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
      emission = gas * illumination * nearSide * (1 - dust * .92) * (.82 + .18 * detail);
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

/** Isotropic, periodic value noise. Smooth correlated cells, rather than raw
 * random voxels or a stretched near-isosurface, keep gas softly volumetric. */
function detailField() {
  const size = 64, data = new Uint8Array(size ** 3);
  const periodic=(x:number,y:number,z:number,period:number)=>{
    const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),a=smooth(0,1,x-ix),b=smooth(0,1,y-iy),c=smooth(0,1,z-iz);
    const h=(dx:number,dy:number,dz:number)=>hash((ix+dx)%period,(iy+dy)%period,(iz+dz)%period);
    const row=(dy:number,dz:number)=>h(0,dy,dz)*(1-a)+h(1,dy,dz)*a;
    return (row(0,0)*(1-b)+row(1,0)*b)*(1-c)+(row(0,1)*(1-b)+row(1,1)*b)*c;
  };
  let i = 0;
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) data[i++] = Math.round(255*(.58*periodic(x/2,y/2,z/2,32)+.28*periodic(x,y,z,64)+.14*periodic(x/4,y/4,z/4,16)));
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

function validateFront(medium: NebulaMedium) {
  const front=medium.front;
  if(!front)return;
  if(front.distance.length!==medium.resolution**3||!Number.isFinite(front.range)||front.range<=0
    ||!Number.isFinite(front.width)||front.width<=0||!Number.isFinite(front.offset)
    ||!Number.isFinite(front.densityWidth)||front.densityWidth<=0
    ||!Number.isFinite(front.haloWidth)||front.haloWidth<=0||!Number.isFinite(front.haloOffset)
    ||!Number.isFinite(front.diffuseRatio)||front.diffuseRatio<0||!Number.isFinite(front.gasRatio)||front.gasRatio<0)throw new RangeError('Nebula optical front must match the medium with finite positive widths');
}
function suppliedFront(medium: NebulaMedium) {
  validateFront(medium);
  const front=medium.front;
  if(!front)return undefined;
  const texture=new THREE.Data3DTexture(front.distance,medium.resolution,medium.resolution,medium.resolution);
  texture.format=THREE.RedFormat;texture.type=THREE.UnsignedByteType;
  texture.minFilter=texture.magFilter=THREE.LinearFilter;
  texture.wrapS=texture.wrapT=texture.wrapR=THREE.ClampToEdgeWrapping;
  texture.unpackAlignment=1;texture.generateMipmaps=false;texture.needsUpdate=true;
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
uniform sampler3D frontField;
uniform float frontEnabled;
uniform vec4 frontShape;
uniform vec2 frontRadiation;
uniform vec2 frontHalo;
uniform vec3 fineStretch;
uniform vec3 localDirection;
uniform vec3 localEye;
uniform float orthographic;
uniform float sampleCount;
uniform float densityDisplacement;
uniform float emissionVariation;
uniform float dustVariation;
uniform float dustLight;
uniform float scatteredLight;
uniform mat3 dustDetailTransform;
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

float frontPrimitive(float s,float width){
  float x=clamp(s/width,-1.,1.);
  return width*(x-x*x*x/3.);
}

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
  float stride = distance / sampleCount;

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
  float previousFront=0.;
  if(frontEnabled>.5)previousFront=(texture(frontField,(start-ray*stride*.5)*.5+.5).r*2.-1.)*frontShape.x;
  for (int i = 0; i < STEPS; i++) {
    if (float(i) >= sampleCount) break;
    float along = (float(i) + .5) * stride;
    vec3 p = start + ray * along;
    if (cutaway > .5 && p.z > cutZ) continue;
    // Features come from the caller's full three-dimensional gas and dust.
    // No thin noise sheet, directional stretching or repeated bright contours:
    // those produce feather barbs when integrated from an oblique viewpoint.
    float broad = texture(fineField, p * .18 + vec3(.63, .11, .37)).r;
    float fine = texture(fineField, p * fineStretch + vec3(.17, .31, .43) + (broad-.5)*.20).r;
    float grain = texture(fineField, dustDetailTransform*p + vec3(.47,.73,.29) + (fine-.5)*.05).r;
    float edge = 1.-smoothstep(.80,.96,max(max(abs(p.x),abs(p.y)),abs(p.z)));
    vec3 sampleP=p+(structure<.5?1.:0.)*edge*densityDisplacement*vec3(fine-.5,grain-.5,broad-.5);
    vec4 medium = texture(field, sampleP * .5 + .5);
    float ambientDust=0.;
    if(frontEnabled>.5){
      // Interpolate distance, then reconstruct the narrow front. Interpolating
      // a pre-blurred bright skin would erase it at the density-grid resolution.
      float signedDistance=(texture(frontField,sampleP*.5+.5).r*2.-1.)*frontShape.x;
      signedDistance+=(fine-.5)*.045+(grain-.5)*.010;
      float halfStep=max(.0005,abs(signedDistance-previousFront)*.5);
      previousFront=signedDistance;
      float a=signedDistance-halfStep-frontShape.z,b=signedDistance+halfStep-frontShape.z;
      // Integrate a compact parabolic profile across this ray segment rather
      // than missing a sub-step skin or widening it to a foggy Gaussian band.
      float skin=max(0.,(frontPrimitive(b,frontShape.y)-frontPrimitive(a,frontShape.y))/(2.*halfStep));
      float ha=signedDistance-halfStep-frontHalo.y,hb=signedDistance+halfStep-frontHalo.y;
      float halo=max(0.,(frontPrimitive(hb,frontHalo.x)-frontPrimitive(ha,frontHalo.x))/(2.*halfStep));
      float inside=1.-smoothstep(-frontShape.w-halfStep,frontShape.w+halfStep,signedDistance);
      float background=medium.r*frontRadiation.x*halo,edgeLight=medium.g*skin;
      float support=min(1.,(medium.g+medium.b)*4.);
      medium.r=medium.r*halo+skin*frontRadiation.y*support;
      medium.g=background+edgeLight;
      medium.b*=inside;
      ambientDust=medium.b*exp(min(0.,signedDistance)*18.)*(.035+6.*pow(grain,3.))*(.3+1.4*smoothstep(.30,.70,fine))*dustLight;
      medium.a=mix(.04,medium.a,edgeLight/max(.00001,medium.g));
    }
    float lightStructure = mix(1.,(.12 + 2.8 * pow(smoothstep(.18,.80,fine),1.8)) * (.38 + 1.24*grain),emissionVariation);
    float dustStructure = mix(1.,.16 + 2.8 * pow(smoothstep(.24,.76,.72*fine+.28*grain),1.6),dustVariation);
    float extinction = (medium.r * (.45 + 1.10 * fine) * gasExtinction + medium.b * dustExtinction * dustStructure) * opacity;
    float segmentTransmission = exp(-extinction * stride);
    float path = extinction > .0001 ? (1. - segmentTransmission) / extinction : stride;
    float sourceLight = .12 + .88 * exp(-dot(p - lightPosition, p - lightPosition) * 2.2);
    // Passing through a saturated middle band keeps cyan/pink boundaries from
    // averaging into a grey complementary-colour wash. This is display colour,
    // not an assignment of elemental abundance or gas temperature.
    vec3 palette = mix(mix(cool, accent, smoothstep(.04, .52, medium.a)),
      warm, smoothstep(.48, .96, medium.a));
    vec3 emission = palette * medium.g;
    // A bounded single-scattering contribution from diffuse incident nebular
    // light reveals folds in neutral dust; this is not dust self-emission.
    if(illumination<.5){
      emission+=mix(accent,warm,.12)*ambientDust;
      emission+=mix(cool,accent,.13*broad)*(medium.r*.24+medium.b*.35)*sourceLight*scatteredLight;
    }
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
  let field = options.medium ? suppliedField(options.medium) : volumeField(kind);
  let frontField:THREE.Data3DTexture|undefined;
  try{frontField=options.medium?suppliedFront(options.medium):undefined;}catch(error){field.dispose();throw error;}
  const fineField = detailField();
  const steps = Number.isFinite(options.steps) ? Math.max(16, Math.min(MAX_STEPS, Math.round(options.steps!))) : STEPS;
  const sourcePositions = kind === 'cloud' ? [[-.22, .16, .04], [-.10, .28, -.17], [.08, .10, -.10]] : [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const material = new THREE.ShaderMaterial({
    name: `Nebula-${kind}`,
    defines: { STEPS: steps }, vertexShader, fragmentShader,
    transparent: true, premultipliedAlpha: true,
    side: THREE.BackSide, depthWrite: false, depthTest: options.depthTest ?? true,
    uniforms: {
      field: { value: field }, fineField: { value: fineField },
      frontField:{value:frontField??field},frontEnabled:{value:Number(!!frontField)},
      frontShape:{value:new THREE.Vector4()},frontRadiation:{value:new THREE.Vector2()},frontHalo:{value:new THREE.Vector2()},
      fineStretch: { value: new THREE.Vector3(.72,.72,.72) },
      localDirection: { value: new THREE.Vector3(0, 0, -1) },
      localEye: { value: new THREE.Vector3(0, 0, 10) }, orthographic: { value: 1 },
      sampleCount: { value: steps },
      densityDisplacement: { value: .045 }, emissionVariation: { value: 1 }, dustVariation: { value: 1 },
      dustLight:{value:0},scatteredLight:{value:0},dustDetailTransform:{value:new THREE.Matrix3().set(1.9,0,0,0,1.9,0,0,0,1.9)},
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
  const updateFront=()=>{
    const front=options.medium?.front;
    if(front){
      if(!frontField||frontField.image.width!==options.medium!.resolution||frontField.image.data!==front.distance){const next=suppliedFront(options.medium!);frontField?.dispose();frontField=next;}
      else frontField.needsUpdate=true;
      material.uniforms.frontShape.value.set(front.range,front.width,front.offset,front.densityWidth);
      material.uniforms.frontRadiation.value.set(front.diffuseRatio,front.gasRatio);
      material.uniforms.frontHalo.value.set(front.haloWidth,front.haloOffset);
    }else{frontField?.dispose();frontField=undefined;}
    material.uniforms.frontEnabled.value=Number(!!frontField);material.uniforms.frontField.value=frontField??field;
  };
  updateFront();
  let disposed = false;
  return {
    group,
    setAppearance(appearance) {
      if (disposed) return;
      const uniforms = material.uniforms;
      if (appearance.illumination !== undefined) uniforms.illumination!.value = appearance.illumination === 'dark' ? 2 : appearance.illumination === 'reflection' ? 1 : 0;
      if (appearance.structure !== undefined) uniforms.structure!.value = appearance.structure === 'cloud' ? 0 : appearance.structure === 'planetary' ? 1 : 2;
      if (appearance.samplingSteps !== undefined && Number.isFinite(appearance.samplingSteps)) uniforms.sampleCount!.value = Math.max(16,Math.min(steps,Math.round(appearance.samplingSteps)));
      if (appearance.densityDisplacement !== undefined && Number.isFinite(appearance.densityDisplacement)) uniforms.densityDisplacement!.value = Math.max(0,Math.min(.08,appearance.densityDisplacement));
      for(const key of ['emissionVariation','dustVariation'] as const)if(appearance[key]!==undefined&&Number.isFinite(appearance[key]))uniforms[key]!.value=Math.max(0,Math.min(1,appearance[key]!));
      if(appearance.dustLight!==undefined&&Number.isFinite(appearance.dustLight))uniforms.dustLight!.value=Math.max(0,Math.min(1,appearance.dustLight));
      if(appearance.scatteredLight!==undefined&&Number.isFinite(appearance.scatteredLight))uniforms.scatteredLight!.value=Math.max(0,Math.min(1,appearance.scatteredLight));
      if(appearance.dustDetailTransform?.length===9&&appearance.dustDetailTransform.every(Number.isFinite))uniforms.dustDetailTransform!.value.fromArray(appearance.dustDetailTransform);
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
    updateMedium() {
      if(disposed)return;
      if(options.medium)validateFront(options.medium);
      if(options.medium&&(field.image.width!==options.medium.resolution||field.image.data!==options.medium.data)){
        // Resize only on material-quality transitions; never retain a texture
        // for each case. Release the old upload before replacing its binding.
        const next=suppliedField(options.medium);field.dispose();field=next;material.uniforms.field.value=field;
      }else field.needsUpdate=true;
      updateFront();
    },
    dispose() { if (!disposed) { disposed = true; field.dispose(); fineField.dispose(); frontField?.dispose(); } },
  };
}
