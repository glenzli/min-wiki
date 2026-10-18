import * as THREE from 'three';

const FIELD_WIDTH = 72;
const FIELD_HEIGHT = 52;
const FIELD_DEPTH = 40;

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
function makeDensityField(seed: number): THREE.Data3DTexture {
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

/** A unit, unrotated cloud volume for the topic's external orthographic view.
 * This is illustrative light transport, not a weather or droplet simulation. */
export function createCloudVolume(seed: number): {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.ShaderMaterial>;
  setOpacity(value: number): void;
  dispose(): void;
} {
  const density = makeDensityField(seed);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const rayDirection = new THREE.Vector3(0, 0, -1);
  const worldLightDirection = new THREE.Vector3(-0.538, 0.763, 0.359).normalize();
  const lightDirection = worldLightDirection.clone();
  const worldScale = new THREE.Vector3(1, 1, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uDensity: { value: density }, uOpacity: { value: 1 },
      uRayDirection: { value: rayDirection }, uLightDirection: { value: lightDirection },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.NormalBlending,
    premultipliedAlpha: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'illustrative-cumulus-volume';
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
    dispose() {
      if (disposed) return;
      disposed = true;
      geometry.dispose();
      material.dispose();
      density.dispose();
    },
  };
}
