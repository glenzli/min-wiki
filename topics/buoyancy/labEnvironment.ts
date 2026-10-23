import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type LabEnvironment = {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
  /** Retained lifecycle hook; all finishes are now available synchronously. */
  stopLoading: () => void;
  setLayout: (compact: boolean, comparison: boolean) => void;
};

type Surface = 'worktop' | 'wall' | 'polymer';
const surfaceFunctions = /* glsl */`
uniform sampler2D labGrain;
varying vec3 vLabPosition;
float labNoise(vec2 p) { return texture2D(labGrain, p / 128.).r; }
float labFine(vec2 p) {
  float footprint = max(length(dFdx(p)), length(dFdy(p)));
  return mix(labNoise(p), .5, smoothstep(.55, 1.7, footprint));
}
vec3 labBump(vec3 point, vec3 normal, float height, float face) {
  vec3 dx = dFdx(point), dy = dFdy(point);
  vec3 rx = cross(dy, normal), ry = cross(normal, dx);
  float determinant = dot(dx, rx) * face;
  vec3 gradient = sign(determinant) * (dFdx(height) * rx + dFdy(height) * ry);
  return normalize(max(abs(determinant), 1.e-10) * normal - gradient);
}
`;
const finishes: Record<Surface, string> = {
  worktop: /* glsl */`
    vec2 p = vLabPosition.xz;
    float grain = labFine(p * 181. + 31.);
    float mineral = labFine(p * 93. + 71.);
    float fleck = smoothstep(.86, .97, mineral);
    // Fine non-directional resin grain, without domestic wood fibres or knots.
    labColour = vec3(1.) * (.985 + (grain - .5) * .028 - fleck * .022);
    labRelief = (grain - .5) * .00016;
    labRoughness = .76 + grain * .09;
  `,
  wall: /* glsl */`
    vec2 p = vLabPosition.xy;
    float grain = labFine(p * 157. + 17.);
    // Large washable panels have shallow joints, rather than a dense tile grid.
    vec2 panel = (p + vec2(.37, .83)) / vec2(3.2, 1.58);
    vec2 edge = min(fract(panel), 1. - fract(panel));
    vec2 footprint = max(fwidth(panel), vec2(.00002));
    float joint = max(1. - smoothstep(.0008, .0016 + footprint.x, edge.x),
      1. - smoothstep(.0008, .0016 + footprint.y, edge.y));
    labColour = vec3(1.) * (.99 + (grain - .5) * .015 - joint * .035);
    labRelief = (grain - .5) * .00012 - joint * .00012;
    labRoughness = .9;
  `,
  polymer: /* glsl */`
    float grain = labFine(vLabPosition.xz * 211. + 47.);
    labColour = vec3(1.) * (.987 + (grain - .5) * .022);
    labRelief = (grain - .5) * .00012;
    labRoughness = .72 + grain * .08;
  `,
};

function createGrain() {
  const size = 128, data = new Uint8Array(size * size);
  let state = 0x5c297a13;
  for (let i = 0; i < data.length; i++) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    data[i] = (state >>> 0) & 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  texture.name = 'buoyancy-lab-fine-grain';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true;
  return texture;
}

/** Open-centred basin contact; no opaque rectangular plinth beneath glass. */
function createContactShade() {
  const width = 256, height = 128, data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const px = (x / (width - 1) - .5) * 6.2, pz = (y / (height - 1) - .5) * 3.3;
    const radius = Math.pow(Math.pow(Math.abs(px) / 2.5, 4) + Math.pow(Math.abs(pz) / 1.04, 4), .25);
    const contact = Math.exp(-Math.pow((radius - .98) / .11, 2)) * .062;
    const spread = Math.exp(-Math.pow(radius / .94, 4)) * .009;
    const offset = (y * width + x) * 4;
    data[offset] = 67; data[offset + 1] = 77; data[offset + 2] = 72;
    data[offset + 3] = Math.round((contact + spread) * 255);
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.name = 'buoyancy-lab-open-contact-shade'; texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true;
  return texture;
}

/** Glassware has a faint grounding cue, not an opaque glass shadow. */
function createGlasswareShade() {
  const size = 96, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = (x / (size - 1) - .5) * 2, py = (y / (size - 1) - .5) * 2;
    const offset = (y * size + x) * 4;
    data[offset] = 66; data[offset + 1] = 79; data[offset + 2] = 74;
    data[offset + 3] = Math.round(Math.exp(-(px * px + py * py) * 4.4) * 255 * .065);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = 'buoyancy-rear-glassware-contact-shade'; texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true;
  return texture;
}

function spoutRadius(angle: number, radius: number) {
  const difference = Math.atan2(Math.sin(angle + .82), Math.cos(angle + .82));
  return radius * (1 + .14 * Math.exp(-Math.pow(difference / .22, 2)));
}

/** Closed wall and base, open mouth. Empty decorative glass carries no readings. */
function createBeaker(radius: number, height: number) {
  const profile = [[0, 0], [radius * .85, 0], [radius * .95, .016],
    [radius * .984, height * .86], [radius, height], [radius - .013, height],
    [radius * .984 - .014, height * .86], [radius * .95 - .018, .032], [0, .032]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const geometry = new THREE.LatheGeometry(profile, 64), position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i), r = Math.hypot(x, z);
    if (r < .0001 || y < height * .75) continue;
    const blend = THREE.MathUtils.smoothstep(y, height * .75, height);
    const factor = 1 + (spoutRadius(Math.atan2(x, z), r) / r - 1) * blend;
    position.setXYZ(i, x * factor, y, z * factor);
  }
  geometry.computeVertexNormals(); return geometry;
}
function createBeakerLip(radius: number, height: number) {
  const points = Array.from({ length: 64 }, (_, i) => {
    const angle = i / 64 * Math.PI * 2, r = spoutRadius(angle, radius);
    return new THREE.Vector3(Math.sin(angle) * r, height, Math.cos(angle) * r);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 96, .0045, 5, true);
}

/** Static laboratory backdrop. The caller owns camera fitting and every returned
 * GPU resource. No images, clock or experiment state are introduced. */
export function createLabEnvironment(_onReady: () => void): LabEnvironment {
  const group = new THREE.Group(); group.name = 'buoyancy-laboratory-backdrop';
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [], textures: THREE.Texture[] = [];
  let disposed = false;
  const stopLoading = () => { disposed = true; };
  const geometry = <T extends THREE.BufferGeometry>(value: T) => { geometries.push(value); return value; };
  const material = <T extends THREE.Material>(value: T) => {
    materials.push(value); value.addEventListener('dispose', stopLoading); return value;
  };
  const texture = <T extends THREE.Texture>(value: T) => {
    textures.push(value); value.addEventListener('dispose', stopLoading); return value;
  };
  const mesh = (shape: THREE.BufferGeometry, finish: THREE.Material, parent: THREE.Object3D = group) => {
    const object = new THREE.Mesh(shape, finish); object.castShadow = object.receiveShadow = true; parent.add(object); return object;
  };
  const grain = texture(createGrain());
  const surface = (kind: Surface, options: THREE.MeshStandardMaterialParameters) => {
    const finish = material(new THREE.MeshStandardMaterial(options)); finish.name = `buoyancy-lab-${kind}`;
    finish.onBeforeCompile = shader => {
      shader.uniforms.labGrain = { value: grain };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vLabPosition;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\nvLabPosition = position;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${surfaceFunctions}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 labColour = vec3(1.); float labRelief = 0.; float labRoughness = roughness;
          ${finishes[kind]}
          diffuseColor.rgb *= labColour;`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = labRoughness;`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\nnormal = labBump(-vViewPosition, normal, labRelief, faceDirection);`);
    };
    finish.customProgramCacheKey = () => `buoyancy-laboratory-${kind}-v2`; return finish;
  };

  const worktop = surface('worktop', { color: '#d9deda', roughness: .8, envMapIntensity: .27 });
  const table = mesh(geometry(new RoundedBoxGeometry(32, .24, 28, 3, .055)), worktop);
  table.name = 'matte-laboratory-worktop'; table.position.set(0, -.142, 8.65); table.castShadow = false;
  const contact = mesh(geometry(new THREE.PlaneGeometry(6.2, 3.3)), material(new THREE.MeshBasicMaterial({
    map: texture(createContactShade()), transparent: true, depthWrite: false, toneMapped: false,
  })));
  contact.name = 'glass-contact-shade'; contact.rotation.x = -Math.PI / 2; contact.position.y = -.020;
  contact.castShadow = contact.receiveShadow = false;

  // The low upstand defines a real rear edge. The single-sided wall cannot
  // mask the experiment when orbiting behind it; it never casts a broad shadow.
  const rear = new THREE.Group(); rear.name = 'laboratory-rear-edge'; rear.position.z = -1.8; group.add(rear);
  const upstand = mesh(geometry(new RoundedBoxGeometry(32, .08, .105, 3, .018)), worktop, rear);
  upstand.name = 'low-bench-upstand'; upstand.position.set(0, .018, -3.565); upstand.castShadow = false;
  const wall = mesh(geometry(new THREE.PlaneGeometry(32, 4)),
    surface('wall', { color: '#e8ebe5', roughness: .9, envMapIntensity: .13, side: THREE.FrontSide }), rear);
  wall.name = 'pale-laboratory-wall'; wall.position.set(0, 1.958, -3.65); wall.castShadow = false;
  const seal = mesh(geometry(new THREE.BoxGeometry(32, .012, .012)), material(new THREE.MeshStandardMaterial({
    color: '#cfd5d0', roughness: .93, envMapIntensity: .1,
  })), rear);
  seal.name = 'quiet-bench-wall-joint'; seal.position.set(0, -.009, -3.513); seal.castShadow = false;

  const glassware = new THREE.Group(); glassware.name = 'rear-laboratory-glassware';
  glassware.position.set(-3.20, -.022, -3.40); glassware.rotation.y = .08; group.add(glassware);
  const trayMaterial = surface('polymer', { color: '#cbd3cd', roughness: .77, envMapIntensity: .25 });
  const tray = mesh(geometry(new RoundedBoxGeometry(1.42, .035, .70, 3, .016)), trayMaterial, glassware);
  tray.name = 'low-glassware-tray'; tray.position.y = .024;
  const rimGeometry = geometry(new RoundedBoxGeometry(1.42, .025, .032, 3, .01));
  for (const z of [-.338, .338]) { const edge = mesh(rimGeometry, trayMaterial, glassware); edge.position.set(0, .052, z); }
  const endGeometry = geometry(new RoundedBoxGeometry(.032, .025, .65, 3, .01));
  for (const x of [-.694, .694]) { const edge = mesh(endGeometry, trayMaterial, glassware); edge.position.set(x, .052, 0); }

  const glass = material(new THREE.MeshPhysicalMaterial({
    color: '#edf5f0', roughness: .085, transparent: true, depthWrite: false,
    envMapIntensity: .54, specularIntensity: .55, side: THREE.DoubleSide,
  }));
  glass.name = 'quiet-background-glass';
  glass.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float labFresnel = pow(1. - abs(dot(normal, geometryViewDir)), 5.);
      vec3 labReflection = vec3(.17, .21, .19);
      #ifdef USE_ENVMAP
        labReflection = getIBLRadiance(geometryViewDir, normal, material.roughness);
      #endif
      outgoingLight = labReflection * .72 + totalSpecular * .12;
      diffuseColor.a = .018 + .34 * labFresnel;
      #include <opaque_fragment>`);
  };
  glass.customProgramCacheKey = () => 'buoyancy-quiet-background-glass-v1';
  const rimMaterial = material(new THREE.MeshBasicMaterial({ color: '#91aaa1', transparent: true, opacity: .29, depthWrite: false }));
  const beaker = mesh(geometry(createBeaker(.285, .56)), glass, glassware);
  beaker.name = 'empty-rear-beaker'; beaker.position.set(-.26, .043, .015); beaker.castShadow = false; beaker.renderOrder = 1;
  const beakerLip = mesh(geometry(createBeakerLip(.279, .56)), rimMaterial, beaker); beakerLip.castShadow = false;

  const cylinder = new THREE.Group(); cylinder.name = 'empty-rear-graduated-cylinder';
  cylinder.position.set(.35, .043, -.035); glassware.add(cylinder);
  const foot = mesh(geometry(new THREE.CylinderGeometry(.214, .22, .028, 48)), glass, cylinder);
  foot.position.y = .014; foot.castShadow = false; foot.renderOrder = 1;
  const cylinderProfile = [[0, .019], [.118, .019], [.128, .041], [.128, .88], [.139, .896],
    [.137, .908], [.119, .908], [.112, .884], [.112, .048], [0, .048]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const tube = mesh(geometry(new THREE.LatheGeometry(cylinderProfile, 48)), glass, cylinder);
  tube.castShadow = false; tube.renderOrder = 1;
  const lip = mesh(geometry(new THREE.TorusGeometry(.128, .004, 5, 48)), rimMaterial, cylinder);
  lip.rotation.x = Math.PI / 2; lip.position.y = .902; lip.castShadow = false;
  const ticks: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const y = .17 + i * .11, a = -.075, b = i % 2 ? -.012 : .017;
    ticks.push(new THREE.Vector3(a, y, Math.sqrt(.130 ** 2 - a ** 2)),
      new THREE.Vector3(b, y, Math.sqrt(.130 ** 2 - b ** 2)));
  }
  const graduations = new THREE.LineSegments(geometry(new THREE.BufferGeometry().setFromPoints(ticks)),
    material(new THREE.LineBasicMaterial({ color: '#94aaa1', transparent: true, opacity: .32, depthWrite: false })));
  graduations.name = 'unlabelled-background-graduations'; cylinder.add(graduations);

  const shade = mesh(geometry(new THREE.PlaneGeometry(1.95, 1.08)), material(new THREE.MeshBasicMaterial({
    map: texture(createGlasswareShade()), transparent: true, depthWrite: false, toneMapped: false,
  })), glassware);
  shade.name = 'rear-glassware-soft-contact'; shade.rotation.x = -Math.PI / 2; shade.position.set(.13, .004, -.13);
  shade.castShadow = shade.receiveShadow = false;

  return {
    group, geometries, materials, textures, stopLoading,
    setLayout: (compact, comparison) => {
      if (disposed) return;
      // The room remains continuous; omit tiny equipment on mobile/comparison.
      glassware.visible = !compact && !comparison;
    },
  };
}
