import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HISTORY_OBSERVATION_HOLD, type JourneyFrame } from './journeyModel';

export type HistoryJourneyLens = 'globe' | 'local' | 'evidence';
export type HistoryCues = JourneyFrame['cues'];
export const HISTORY_PLANET_RADIUS = 1.35;
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, n: number) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
const color = (hex: string) => new THREE.Color(hex);
const rockColor = color('#5d554b'), oceanColor = color('#1f596b'), shoreColor = color('#897c61');
const plantColor = color('#486b42'), iceColor = color('#d0e0df'), meltColor = color('#e26824');

const fract = (n: number) => n - Math.floor(n);
function hash3(x: number, y: number, z: number): number {
  x = fract(x * .1031); y = fract(y * .1031); z = fract(z * .1031);
  const d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
  return fract((x + y + 2 * d) * (z + d));
}
export function historyNoise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const tx = smooth(0, 1, x - ix), ty = smooth(0, 1, y - iy), tz = smooth(0, 1, z - iz);
  const plane = (dz: number) => mix(mix(hash3(ix, iy, iz + dz), hash3(ix + 1, iy, iz + dz), tx), mix(hash3(ix, iy + 1, iz + dz), hash3(ix + 1, iy + 1, iz + dz), tx), ty);
  return mix(plane(0), plane(1), tz);
}
function fbm(x: number, y: number, z: number): number {
  let value = 0, weight = .5;
  for (let i = 0; i < 4; i++) { value += historyNoise3(x, y, z) * weight; x = x * 2.03 + 13.1; y = y * 2.03 - 7.7; z = z * 2.03 + 3.9; weight *= .5; }
  return value / .9375;
}
/** Seamless, domain-warped display geography. It has no longitude seam or measured ancient coordinates. */
export function historySurfaceField(x: number, y: number, z: number): number {
  const px = x * 3.7, py = y * 3.7, pz = z * 3.7;
  const wx = historyNoise3(px + 19.2, py - 3.7, pz + 8.6) - .5;
  const wy = historyNoise3(px - 7.3, py + 29.4, pz - 17.1) - .5;
  const wz = historyNoise3(px + 11.8, py + 5.1, pz + 37.3) - .5;
  return (fbm(px + wx * .72, py + wy * .72, pz + wz * .72) - .5) * 1.8;
}
/** Authored cooled rafts and exposed melt, fixed to the body rather than a drifting color map.
 * Their sizes, boundaries and hot fractions are drawing choices, not early plate tectonics. */
export function historyThermalField(x: number, y: number, z: number): number {
  const qx = x * 6.8, qy = y * 6.8, qz = z * 6.8;
  const wx = qx + (historyNoise3(qx * 1.7 + 19.2, qy * 1.7, qz * 1.7) - .5) * 1.16;
  const wy = qy + (historyNoise3(qx * 1.7, qy * 1.7 + 29.4, qz * 1.7) - .5) * 1.16;
  const wz = qz + (historyNoise3(qx * 1.7, qy * 1.7, qz * 1.7 + 37.3) - .5) * 1.16;
  let nearest = 10, next = 10;
  const ix = Math.floor(wx), iy = Math.floor(wy), iz = Math.floor(wz);
  for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = ix + i, cy = iy + j, cz = iz + k;
    const dx = cx + hash3(cx + 13.1, cy, cz) - wx;
    const dy = cy + hash3(cx, cy + 47.3, cz) - wy;
    const dz = cz + hash3(cx, cy, cz + 71.8) - wz;
    const distance = dx * dx + dy * dy + dz * dz;
    if (distance < nearest) { next = nearest; nearest = distance; } else if (distance < next) next = distance;
  }
  const width = .042 + historyNoise3(x * 12 + 4, y * 12, z * 12) * .09;
  const channel = 1 - smooth(width * .22, width, Math.sqrt(next) - Math.sqrt(nearest));
  const basin = smooth(.5, .69, fbm(x * 4.2 + 7.7, y * 4.2 - 3.6, z * 4.2 + 17.3));
  // Interrupted margins avoid a uniform grouted-cell network.
  const broken = smooth(.28, .67, historyNoise3(x * 12, y * 12 + 13, z * 12));
  return clamp(Math.max(channel * broken, basin));
}

/** Relief and thermal boundaries share the same field. Hot pools sit below rough cooled margins. */
export function historyEarlyRelief(x: number, y: number, z: number): number {
  const heat = historyThermalField(x, y, z), raft = 1 - smooth(.18, .8, heat);
  return historySurfaceField(x * 1.8, y * 1.8, z * 1.8) * .022
    + raft * (.01 + fbm(x * 35, y * 35, z * 35) * .05) - heat * .014;
}
const IMPACT_START = new THREE.Vector3(-2.7, .6, 1.5), IMPACT_END = new THREE.Vector3(-.45, .08, .25);
/** Visible contact gates the illustrative ejecta; the path is not an impact-dynamics solution. */
export function historyLunarImpact(motion: number) {
  const t = clamp(motion / .72), position = IMPACT_START.clone().lerp(IMPACT_END, t);
  const path = IMPACT_END.clone().sub(IMPACT_START), radius = HISTORY_PLANET_RADIUS + .4 + .018;
  const a = path.lengthSq(), b = 2 * IMPACT_START.dot(path), c = IMPACT_START.lengthSq() - radius * radius;
  const contact = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a) * .72;
  const aftermath = smooth(contact, .79, motion);
  return { position, contact, aftermath, normal: IMPACT_START.clone().lerp(IMPACT_END, contact / .72).normalize() };
}
const PERTURB_GLSL = `
  vec3 hPerturb(vec3 eye,vec3 n,float height,float facing) {
    vec3 sx=dFdx(eye),sy=dFdy(eye);
    vec3 a=cross(sy,n),b=cross(n,sx); float det=dot(sx,a)*facing;
    return normalize(abs(det)*n-sign(det)*(dFdx(height)*a+dFdy(height)*b));
  }
`;
/** Original spherical fields are baked once; scrubbing changes uniforms, never rebakes a texture. */
export function createHistoryFieldTextures(compact: boolean, resolution = compact ? 128 : 192) {
  const width = resolution, height = width / 2, fieldData = new Uint8Array(width * height * 4), detailData = new Uint8Array(fieldData.length);
  const byte = (n: number) => Math.round(clamp(n) * 255);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const phi = x / (width - 1) * Math.PI * 2, theta = (1 - y / (height - 1)) * Math.PI;
    const px = -Math.cos(phi) * Math.sin(theta), py = Math.cos(theta), pz = Math.sin(phi) * Math.sin(theta);
    const field = historySurfaceField(px, py, pz), grain = fbm(px * 73, py * 73, pz * 73);
    const hot = historyThermalField(px, py, pz);
    const i = (y * width + x) * 4;
    fieldData[i] = byte(field / 1.8 + .5); fieldData[i + 1] = byte(grain); fieldData[i + 2] = byte(hot); fieldData[i + 3] = byte(fbm(px * 35, py * 35, pz * 35));
    detailData[i] = byte(1 - smooth(.018, .06, Math.abs(historyNoise3(px * 52, py * 52, pz * 52) - .5)));
    detailData[i + 1] = byte(historyNoise3(px * 340, py * 340, pz * 340)); detailData[i + 2] = byte(historyNoise3(px * 31, py * 31, pz * 31)); detailData[i + 3] = byte(fbm(px * 22, py * 12, pz * 22));
  }
  const make = (data: Uint8Array<ArrayBuffer>, name: string) => { const texture = new THREE.DataTexture(data, width, height); texture.name = name; texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping; texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.anisotropy = 2; texture.needsUpdate = true; return texture; };
  return { field: make(fieldData, 'history-authored-spherical-fields'), detail: make(detailData, 'history-authored-spherical-finish') };
}
type FinishKind = 'rock' | 'wood' | 'ice' | 'water' | 'metal';
/** Small retained periodic data textures: local detail avoids a heavy per-pixel procedural program. */
function materialGrain(material: THREE.MeshStandardMaterial, kind: FinishKind, cache: Map<FinishKind, THREE.DataTexture>) {
  let texture = cache.get(kind);
  if (!texture) {
    const size = 256, data = new Uint8Array(size * size * 4), seed = { rock: 3.7, wood: 17.9, ice: 31.1, water: 47.3, metal: 59.7 }[kind];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
      const px = (3 + Math.cos(v) * 1.2) * Math.cos(u), py = (3 + Math.cos(v) * 1.2) * Math.sin(u), pz = Math.sin(v) * 1.2;
      const broad = historyNoise3(px * 3 + seed, py * 3, pz * 3), fine = historyNoise3(px * 29, py * 29 + seed, pz * 29);
      let h = .65 + broad * .25 + (fine - .5) * .14;
      if (kind === 'wood') h = .62 + historyNoise3(px * 12, py * 12, pz * .8 + seed) * .3 + (fine - .5) * .07;
      if (kind === 'ice') h = .72 + broad * .2 - (1 - smooth(.02, .065, Math.abs(fine - .5))) * .16;
      if (kind === 'water') h = .87 + (broad - .5) * .11 + (fine - .5) * .025;
      if (kind === 'metal') h = .85 + (fine - .5) * .13;
      const n = Math.round(clamp(h) * 255), i = (y * size + x) * 4; data[i] = data[i + 1] = data[i + 2] = n; data[i + 3] = 255;
    }
    texture = new THREE.DataTexture(data, size, size); texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.anisotropy = 2; texture.needsUpdate = true;
    texture.name = `history-retained-${kind}-finish`; cache.set(kind, texture);
  }
  material.map = texture; material.bumpMap = texture; material.roughnessMap = texture;
  material.bumpScale = { rock: .008, wood: .002, ice: .01, water: .0006, metal: .0005 }[kind];
}

/** A spherical local example. x/y are display coordinates, not a mapped ancient location. */
export function historyLocalBed(x: number, y: number): number {
  return .085 + Math.tanh((x + .13) * 4.5) * .045 + Math.sin(y * 6.4 + x * 2.3) * .008
    + Math.sin(x * 15.1 - y * 11.2) * .003
    + .032 * Math.exp(-((x - .72) ** 2 / .035 + (y + .42) ** 2 / .07))
    + .022 * Math.exp(-((x - .44) ** 2 / .08 + (y - .52) ** 2 / .028));
}
export const HISTORY_LOCAL_WATER = .068;
export const HISTORY_LOCAL_EXTENT = 2.3;
const LOCAL_PLANET_SCALE = 1.8, LOCAL_SITE_MAGNIFICATION = 3.4;
export function historyLocalPoint(x: number, y: number, altitude = historyLocalBed(x, y)): THREE.Vector3 {
  return new THREE.Vector3(x * .67, y * .67, 1).normalize().multiplyScalar(HISTORY_PLANET_RADIUS + altitude);
}
/** The illustration window magnifies this same contact, rather than inventing a mapped site. */
export function historyLocalFocusTarget(): THREE.Vector3 {
  const point = historyLocalPoint(-.22, 0).multiplyScalar(LOCAL_PLANET_SCALE);
  return new THREE.Vector3(point.x, point.z, -point.y);
}
type SitePoint = { x: number; y: number; h: number };
/** Clip a bed triangle to the same water contact, rather than placing a water rectangle above land. */
export function floodedHistoryTriangle(points: SitePoint[], level = HISTORY_LOCAL_WATER): SitePoint[] {
  const result: SitePoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length], da = a.h - level, db = b.h - level;
    if (da <= 0) result.push({ ...a });
    if ((da < 0) !== (db < 0)) {
      const t = da / (da - db); result.push({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), h: level });
    }
  }
  return result.filter((point, index) => !result.slice(0, index).some(other => Math.hypot(point.x - other.x, point.y - other.y) < 1e-9));
}

function geometryFromTriangles(triangles: THREE.Vector3[][], colors?: THREE.Color[][]) {
  const positions: number[] = [], rgb: number[] = [];
  triangles.forEach((triangle, i) => triangle.forEach((p, j) => { positions.push(p.x, p.y, p.z); if (colors) rgb.push(colors[i][j].r, colors[i][j].g, colors[i][j].b); }));
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(rgb, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(triangles.flatMap(triangle => triangle.flatMap(p => [p.x * 3.5, p.y * 3.5])), 2));
  geometry.computeVertexNormals(); return geometry;
}
function upwardTriangle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
  return b.clone().sub(a).cross(c.clone().sub(a)).dot(a.clone().add(b).add(c)) >= 0 ? [a, b, c] : [a, c, b];
}
/** Complete local bed and water geometries meet along identical interpolated shoreline points. */
export function createHistoryCoastGeometry(compact = false) {
  const n = compact ? 64 : 96, triangles: THREE.Vector3[][] = [], waterTriangles: THREE.Vector3[][] = [], samples: SitePoint[] = [];
  const edges: [SitePoint, SitePoint][] = [];
  const point = (i: number, j: number): SitePoint => { const x = (-1 + i * 2 / n) * HISTORY_LOCAL_EXTENT, y = (-.76 + j * 1.52 / n) * HISTORY_LOCAL_EXTENT; return { x, y, h: historyLocalBed(x, y) }; };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = point(i, j), b = point(i + 1, j), c = point(i + 1, j + 1), d = point(i, j + 1);
    for (const vertices of [[a, b, c], [a, c, d]]) {
      const tri = upwardTriangle(...vertices.map(p => historyLocalPoint(p.x, p.y, p.h)) as [THREE.Vector3, THREE.Vector3, THREE.Vector3]);
      triangles.push(tri); samples.push(...vertices);
      const flooded = floodedHistoryTriangle(vertices);
      for (let k = 1; k < flooded.length - 1; k++) waterTriangles.push(upwardTriangle(...[flooded[0], flooded[k], flooded[k + 1]].map(p => historyLocalPoint(p.x, p.y, HISTORY_LOCAL_WATER)) as [THREE.Vector3, THREE.Vector3, THREE.Vector3]));
    }
    if (j === 0) edges.push([a, b]); if (i === n - 1) edges.push([b, c]); if (j === n - 1) edges.push([c, d]); if (i === 0) edges.push([d, a]);
  }
  const skirts = edges.flatMap(([a, b]) => {
    const topA = historyLocalPoint(a.x, a.y, a.h), topB = historyLocalPoint(b.x, b.y, b.h);
    const lowA = historyLocalPoint(a.x, a.y, -.025), lowB = historyLocalPoint(b.x, b.y, -.025);
    return [[topA, lowA, topB], [topB, lowA, lowB]];
  });
  const bed = geometryFromTriangles(triangles), skirt = geometryFromTriangles(skirts), water = geometryFromTriangles(waterTriangles);
  const colors = new Float32Array(bed.getAttribute('position').count * 3); bed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return { bed, skirt, water, samples };
}

function historyGroundDisk(cx: number, cy: number, radius: number, altitude = .003, irregular = false): THREE.BufferGeometry {
  const point = (angle: number) => { const r = radius * (irregular ? .88 + .1 * Math.sin(angle * 3 + cx * 7) + .06 * Math.cos(angle * 7 + cy) : 1); const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r; return historyLocalPoint(x, y, historyLocalBed(x, y) + altitude); };
  const center = historyLocalPoint(cx, cy, historyLocalBed(cx, cy) + altitude), triangles: THREE.Vector3[][] = [];
  for (let i = 0; i < 36; i++) triangles.push(upwardTriangle(center, point(i * Math.PI / 18), point((i + 1) * Math.PI / 18)));
  const geometry = geometryFromTriangles(triangles), p = geometry.getAttribute('position'), uv: number[] = [];
  for (let i = 0; i < p.count; i++) uv.push((p.getX(i) / p.getZ(i) / .67 - cx) / (radius * 2) + .5, (p.getY(i) / p.getZ(i) / .67 - cy) / (radius * 2) + .5);
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return geometry;
}

export function historyCutFaceGeometry(inner: number, outer: number, azimuth: number, segments: number): THREE.BufferGeometry {
  const positions: number[] = [], indices: number[] = [], uv: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = -Math.PI / 2 + Math.PI * i / segments;
    for (const radius of [inner, outer]) {
      positions.push(-Math.cos(azimuth) * Math.cos(theta) * radius, Math.sin(theta) * radius, Math.sin(azimuth) * Math.cos(theta) * radius);
      uv.push(.5 + Math.cos(theta) * radius * .31, .5 + Math.sin(theta) * radius * .31);
    }
    if (i < segments) { const a = i * 2; indices.push(a, a + 1, a + 3); if (inner > 0) indices.push(a, a + 3, a + 2); }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

/** All objects and allocations are retained; only supplied frame cues change their presentation. */
export function createHistoryJourneyGeometry(compact = false) {
  const group = new THREE.Group(); group.name = 'history-retained-planet';
  const planet = new THREE.Group(); planet.name = 'history-one-earth'; group.add(planet);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), finishTextures = new Map<FinishKind, THREE.DataTexture>();
  const finish = (material: THREE.MeshStandardMaterial, kind: FinishKind) => materialGrain(material, kind, finishTextures);
  const keepG = <T extends THREE.BufferGeometry>(g: T): T => { geometries.add(g); return g; };
  const keepM = <T extends THREE.Material>(m: T): T => { materials.add(m); return m; };
  const standard = (hex: string, roughness = .9, metalness = 0) => keepM(new THREE.MeshStandardMaterial({ color: hex, roughness, metalness }));
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, name: string, parent: THREE.Object3D = planet) => { const object = new THREE.Mesh(keepG(g), m); object.name = name; parent.add(object); return object; };
  const globeGeometry = keepG(new THREE.SphereGeometry(HISTORY_PLANET_RADIUS, compact ? 64 : 96, compact ? 40 : 64));
  const roughGeometry = keepG(new THREE.SphereGeometry(HISTORY_PLANET_RADIUS, compact ? 96 : 144, compact ? 64 : 96)), roughPosition = roughGeometry.getAttribute('position');
  for (let i = 0; i < roughPosition.count; i++) {
    const x = roughPosition.getX(i), y = roughPosition.getY(i), z = roughPosition.getZ(i), r = Math.hypot(x, y, z), nx = x / r, ny = y / r, nz = z / r;
    const relief = historyEarlyRelief(nx, ny, nz);
    roughPosition.setXYZ(i, nx * (r + relief), ny * (r + relief), nz * (r + relief));
  }
  roughGeometry.computeVertexNormals();
  const cutGeometry = keepG(new THREE.SphereGeometry(HISTORY_PLANET_RADIUS, compact ? 64 : 96, compact ? 40 : 64, Math.PI / 2, Math.PI * 1.5));
  const cutUv = cutGeometry.getAttribute('uv'); for (let i = 0; i < cutUv.count; i++) cutUv.setX(i, .25 + cutUv.getX(i) * .75);
  for (const g of [globeGeometry, roughGeometry, cutGeometry]) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 3).fill(1), 3));
  const fieldTextures = createHistoryFieldTextures(compact);
  const planetMaterial = keepM(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .79, metalness: .04 }));
  const surfaceUniforms = {
    historyFieldMap: { value: fieldTextures.field as THREE.Texture }, historyDetailMap: { value: fieldTextures.detail as THREE.Texture },
    historyChannels: { value: new THREE.Vector4() }, historyVegetation: { value: 0 }, historyUseMap: { value: 0 },
    historyEarly: { value: new THREE.Vector4() },
    historyImpactNormal: { value: historyLunarImpact(0).normal },
    historyRock: { value: rockColor }, historyOcean: { value: oceanColor }, historyShore: { value: shoreColor },
    historyPlant: { value: plantColor }, historyIce: { value: iceColor }, historyMelt: { value: meltColor },
  };
  // The packed fields keep the lit surface detailed without an expensive per-fragment noise program.
  planetMaterial.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, surfaceUniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHistoryPoint;varying vec2 vHistorySurfaceUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHistoryPoint=normalize(position);vHistorySurfaceUv=uv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vHistoryPoint; varying vec2 vHistorySurfaceUv;
      uniform sampler2D historyFieldMap,historyDetailMap;
      uniform vec4 historyChannels,historyEarly;
      uniform float historyVegetation,historyUseMap;
      uniform vec3 historyRock,historyOcean,historyShore,historyPlant,historyIce,historyMelt,historyImpactNormal;
      ${PERTURB_GLSL}
    `).replace('#include <color_fragment>', `#include <color_fragment>
      vec3 hp=normalize(vHistoryPoint);vec4 hf=texture2D(historyFieldMap,vHistorySurfaceUv),hd=texture2D(historyDetailMap,vHistorySurfaceUv);
      float continental=hf.r,field=(continental-.5)*1.8,grain=hf.g,fine=hd.g;
      float historyLava=0.0,historyIceMask=0.0,historyLand=0.0,historyWater=0.0,historyHeight=0.0;
      if(historyUseMap<.5){
        historyLand=smoothstep(.17-historyChannels.z*.34,.21-historyChannels.z*.34,field);
        historyWater=historyChannels.y*(1.0-historyLand);historyLava=hf.b*historyChannels.x;
        vec3 pigment=historyRock*(.58+.45*continental+.12*grain);
        pigment=mix(pigment,historyOcean*(.66+.38*continental),historyWater);
        pigment=mix(pigment,historyShore*(.72+.25*grain),historyChannels.y*historyLand*.72);
        pigment=mix(pigment,historyPlant*(.69+.42*grain),historyVegetation*historyLand*(1.0-historyChannels.x));
        pigment*=1.0-smoothstep(.04,.32,hf.b)*(1.0-smoothstep(.35,.7,hf.b))*historyChannels.x*.3;
        vec3 incandescent=mix(historyMelt*.75,vec3(1.35,.62,.13),pow(hf.b,2.7));
        pigment=mix(pigment,incandescent,historyLava*.96);
        if(historyEarly.x>.01){
          // Cooled margins remain object-bound. Only material inside exposed melt advects.
          vec2 flowUv=vHistorySurfaceUv+vec2(historyEarly.y*.055*sin(acos(clamp(hp.y,-1.0,1.0))),historyEarly.y*.013);
          vec4 flow=texture2D(historyDetailMap,flowUv);
          float ropy=pow(.5+.5*sin(flow.a*30.0+flow.b*11.0-historyEarly.y*9.0),3.0);
          float pool=smoothstep(.28,.86,hf.b),edge=smoothstep(.05,.27,hf.b)*(1.0-smoothstep(.25,.7,hf.b));
          float skin=smoothstep(.55,.77,flow.a+flow.b*.14+hd.b*.08);
          float overturn=.75+.25*sin(historyEarly.y*12.0+hd.b*17.0);
          float impactHeat=historyEarly.w*pow(max(0.0,dot(hp,historyImpactNormal)),28.0);
          historyLava=clamp((hf.b+impactHeat*.7)*historyChannels.x,0.0,1.0);
          historyLava*=1.0-pool*clamp(skin*.84+ropy*.32,0.0,.93);
          vec3 basalt=mix(vec3(.024,.022,.020),vec3(.12,.105,.088),.35+.55*grain);
          basalt*=.5+.5*hd.a;basalt*=1.0-edge*.55;
          vec3 cooling=mix(vec3(.32,.022,.003),vec3(.82,.12,.008),hf.b);
          vec3 molten=mix(vec3(1.0,.17,.009),vec3(1.5,.55,.07),pool*(.6+.4*flow.b));
          molten=mix(molten,cooling,clamp(ropy*.5+skin*.85,0.0,1.0)*pool);
          pigment=mix(basalt,molten,smoothstep(.04,.68,historyLava));
          pigment=mix(pigment,vec3(.28,.065,.012),edge*.2);
          historyHeight+=(1.0-smoothstep(.18,.8,hf.b))*(.014+hf.a*.023+fine*.0015)-hf.b*.008;
          historyHeight+=pool*(flow.a*.0008+ropy*.0005);
          // Incandescence is strongest in hot windows; dark rafts still carry lit relief.
          historyLava*=.78+.22*overturn;
        }
        float iceEdge=abs(hp.y)+field*.22+(hd.b-.5)*.055;
        historyIceMask=smoothstep(.93-historyChannels.w*.77,.98-historyChannels.w*.77,iceEdge)*historyChannels.w*(1.0-historyChannels.x);
        vec3 glacier=mix(vec3(.24,.36,.4),historyIce,.42+.53*hd.a);
        float exposed=(1.0-smoothstep(.025,.14,iceEdge-(.93-historyChannels.w*.77)))*(.45+.55*hd.b);
        glacier=mix(glacier,vec3(.19,.32,.38),exposed*.42)*(1.0-hd.r*.13);
        pigment=mix(pigment,glacier,historyIceMask);diffuseColor.rgb=pigment*(.96+.07*fine);
        historyHeight+=(grain*.006+fine*.00045)*historyLand*(1.0-historyWater);
        historyHeight+=historyIceMask*(hf.a*.011-hd.r*.0024)+historyWater*.00015*fine-historyLava*.0017;
      }else{
        historyWater=clamp((diffuseColor.b-diffuseColor.r)*5.0,0.0,1.0);historyLand=1.0-historyWater;
        historyIceMask=smoothstep(.48,.82,diffuseColor.r)*smoothstep(.6,.86,abs(hp.y));historyHeight=(grain*.0009+fine*.00012)*historyLand;
      }
    `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor=mix(.86+.1*grain,.21+.06*fine,historyWater);roughnessFactor=mix(roughnessFactor,.56+.18*grain,historyIceMask);roughnessFactor=mix(roughnessFactor,.34+.12*grain,historyLava);
    `).replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal=hPerturb(-vViewPosition,normal,historyHeight,faceDirection);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance*=pow(historyLava,1.55);
        if(historyEarly.x>.01)totalEmissiveRadiance*=mix(vec3(2.7,.55,.06),vec3(4.3,1.65,.32),smoothstep(.35,.87,historyLava));
      `);
  };
  planetMaterial.customProgramCacheKey = () => 'history-baked-object-surface-5';
  const earth = mesh(globeGeometry, planetMaterial, 'history-earth-surface');
  const cutaway = new THREE.Group(); cutaway.name = 'history-explicit-differentiation-cut'; planet.add(cutaway);
  const coreMaterial = standard('#a5885b', .43, .58), mantleMaterial = standard('#996347', .86), crustMaterial = standard('#51473b');
  for (const material of [coreMaterial, mantleMaterial, crustMaterial]) material.side = THREE.DoubleSide;
  finish(coreMaterial, 'metal'); finish(mantleMaterial, 'rock'); finish(crustMaterial, 'rock');
  mantleMaterial.onBeforeCompile = shader => {
    shader.uniforms.historyDetailMap = surfaceUniforms.historyDetailMap;
    shader.uniforms.historyEarly = surfaceUniforms.historyEarly;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vSectionUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSectionUv=uv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vSectionUv;uniform sampler2D historyDetailMap;uniform vec4 historyEarly;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec4 section=texture2D(historyDetailMap,vSectionUv);
        diffuseColor.rgb*=.55+section.b*.8;
        float warm=smoothstep(.5,.76,section.a+.08*sin(historyEarly.y*4.0+section.b*9.0));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.48,.14,.043),warm*.4);
      `).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.2,.022,.002)*warm;');
  };
  mantleMaterial.customProgramCacheKey = () => 'history-qualified-early-silicate-section-1';
  const coreGroup = new THREE.Group(); coreGroup.name = 'history-growing-metal-rich-region'; cutaway.add(coreGroup);
  coreMaterial.polygonOffset = true; coreMaterial.polygonOffsetFactor = -2; coreMaterial.polygonOffsetUnits = -2;
  for (const [inner, outer, material] of [[0, 1.25, mantleMaterial], [1.25, HISTORY_PLANET_RADIUS, crustMaterial], [0, .61, coreMaterial]] as const) {
    const parent = material === coreMaterial ? coreGroup : cutaway;
    for (const angle of [0, Math.PI / 2]) mesh(historyCutFaceGeometry(inner, outer, angle, compact ? 42 : 64), material, `history-cut-${inner}-${angle}`, parent);
    if (material === coreMaterial) mesh(new THREE.SphereGeometry(outer, compact ? 40 : 64, compact ? 24 : 40, Math.PI / 2, Math.PI * 1.5), material, 'history-metal-rich-interior', parent);
  }
  const dropGeometry = keepG(new THREE.SphereGeometry(.04, 16, 10));
  const metalDrops = Array.from({ length: 34 }, (_, i) => mesh(dropGeometry, coreMaterial, `history-inward-metal-${i}`, cutaway));
  const rimMaterial = keepM(new THREE.MeshBasicMaterial({ color: '#729298', transparent: true, opacity: .035, side: THREE.BackSide, depthWrite: false }));
  const atmosphere = mesh(new THREE.SphereGeometry(HISTORY_PLANET_RADIUS * 1.028, compact ? 48 : 72, compact ? 28 : 44), rimMaterial, 'history-general-atmosphere-context');
  const orbital = new THREE.Group(); orbital.name = 'history-illustrative-orbital-material'; group.add(orbital);
  const rubbleMaterial = keepM(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96 })); finish(rubbleMaterial, 'rock');
  function rubble(radius: number, seed: number) {
    const g = new THREE.IcosahedronGeometry(radius, compact ? 1 : 2), p = g.getAttribute('position'), values: number[] = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = historySurfaceField(x * 7 + seed, y * 7, z * 7);
      p.setXYZ(i, x * (1 + f * .24), y * (1 + f * .24), z * (1 + f * .24));
      const c = rockColor.clone().multiplyScalar(.82 + f * .4); values.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(values, 3)); g.deleteAttribute('normal'); const smoothGeometry = mergeVertices(g, .00001); g.dispose(); smoothGeometry.computeVertexNormals(); return smoothGeometry;
  }
  const rocks = new THREE.InstancedMesh(keepG(rubble(.075, 73)), rubbleMaterial, 48); rocks.name = 'history-48-retained-planetesimals'; orbital.add(rocks);
  const dustMaterial = standard('#b0a18b', .94), dust = new THREE.InstancedMesh(keepG(new THREE.TetrahedronGeometry(.012)), dustMaterial, 128); dust.name = 'history-128-retained-fine-grains'; orbital.add(dust);
  rocks.frustumCulled = dust.frustumCulled = false;
  const instancePose = new THREE.Object3D();
  for (let i = 0; i < 48; i++) rocks.setColorAt(i, new THREE.Color().setHSL(.09 + i % 5 * .007, .1, .63 + i % 4 * .04));
  const collider = mesh(rubble(.4, 51), rubbleMaterial, 'history-hypothetical-impact-body', orbital);
  const moonMaterial = standard('#99978e', .95); finish(moonMaterial, 'rock'); const moon = mesh(rubble(.285, 13), moonMaterial, 'history-retained-moon', orbital);
  const discMaterial = keepM(new THREE.MeshStandardMaterial({ color: '#b08051', roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: .48, depthWrite: false }));
  discMaterial.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vDebrisPoint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvDebrisPoint=position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vDebrisPoint;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float r=length(vDebrisPoint.xy),a=atan(vDebrisPoint.y,vDebrisPoint.x);
        float stream=.5+.5*sin(a*4.0-r*14.0+sin(a*7.0)*.7);
        float density=smoothstep(1.4,1.68,r)*(1.0-smoothstep(1.92,2.22,r));
        diffuseColor.a*=density*(.14+.86*pow(stream,2.0));
      `);
  };
  const debris = mesh(new THREE.RingGeometry(1.4, 2.22, compact ? 80 : 128, 8, .15, Math.PI * 1.78), discMaterial, 'history-hypothesized-debris-disc', orbital); debris.rotation.set(-1.12, -.14, .1);
  const ejectaMaterial = standard('#4d3a2c', .89); ejectaMaterial.emissive.set('#a43e12');
  const ejecta = new THREE.InstancedMesh(keepG(new THREE.IcosahedronGeometry(.035, 0)), ejectaMaterial, 64);
  ejecta.name = 'history-post-contact-spatial-ejecta'; ejecta.frustumCulled = false; orbital.add(ejecta);

  const site = new THREE.Group(); site.name = 'history-attached-local-example'; planet.add(site);
  const coast = createHistoryCoastGeometry(compact); [coast.bed, coast.skirt, coast.water].forEach(keepG);
  const bedMaterial = keepM(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: THREE.DoubleSide }));
  finish(bedMaterial, 'rock'); const bed = mesh(coast.bed, bedMaterial, 'history-contact-bed', site);
  const edgeMaterial = standard('#675947'); finish(edgeMaterial, 'rock');
  const cutEdge = mesh(coast.skirt, edgeMaterial, 'history-bed-cut-edge', site); cutEdge.visible = false;
  const siteAnchor = historyLocalPoint(-.22, 0);
  const bedPosition = coast.bed.getAttribute('position'), bedBasis = new Float32Array(bedPosition.count * 3), bedGreen = new Float32Array(bedPosition.count);
  for (let i = 0; i < bedPosition.count; i++) {
    const x = bedPosition.getX(i), y = bedPosition.getY(i), z = bedPosition.getZ(i), u = x / Math.max(.1, z) / .67;
    const c = shoreColor.clone().multiplyScalar(.86 + historySurfaceField(x * 7, y * 7, z * 7) * .2);
    bedBasis.set([c.r, c.g, c.b], i * 3); bedGreen[i] = smooth(.04, .45, u);
  }
  const waterMaterial = keepM(new THREE.MeshPhysicalMaterial({ color: '#478b97', roughness: .22, metalness: .04, transparent: true, opacity: .8, depthWrite: false, clearcoat: .45, side: THREE.DoubleSide }));
  finish(waterMaterial, 'water'); const water = mesh(coast.water, waterMaterial, 'history-water-meets-bed', site);
  const orient = (object: THREE.Object3D, x: number, y: number, altitude = historyLocalBed(x, y), axis = new THREE.Vector3(0, 1, 0)) => {
    object.position.copy(historyLocalPoint(x, y, altitude)); object.quaternion.setFromUnitVectors(axis, object.position.clone().normalize());
  };
  // Small static contact darkening follows the same curved bed; it is an inspection aid.
  const contactMaterial = keepM(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vContact;void main(){vContact=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vContact;void main(){float a=(1.0-smoothstep(.06,.5,length(vContact-.5)))*.24;gl_FragColor=vec4(.018,.027,.02,a);}',
  }));
  const contactShadow = (x: number, y: number, radius: number, name: string, parent: THREE.Object3D) => mesh(historyGroundDisk(x, y, radius, .0024), contactMaterial, name, parent);
  const shoreRockGeometry = keepG(rubble(.095, 119)), shoreRockMaterial = standard('#68665a', .96); finish(shoreRockMaterial, 'rock');
  const shoreSites = [[-.12, .44], [.12, .58], [.32, .39], [.12, -.18], [.38, -.42], [.64, .06]];
  for (let i = 0; i < shoreSites.length; i++) {
    const [x, y] = shoreSites[i], scale = .65 + i % 3 * .21;
    const outcrop = mesh(shoreRockGeometry, shoreRockMaterial, `history-water-rock-contact-${i}`, site);
    outcrop.scale.set(scale, scale * .7, scale); orient(outcrop, x, y, historyLocalBed(x, y) + .015 * scale); contactShadow(x, y, .075 * scale, `history-rock-contact-shadow-${i}`, site);
  }
  const mats = new THREE.Group(); mats.name = 'history-mat-and-laminated-domes'; site.add(mats);
  const matMaterial = standard('#68734e', .96), domeMaterial = keepM(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 }));
  const domeGeometry = new THREE.SphereGeometry(.082, compact ? 16 : 24, compact ? 8 : 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const dp = domeGeometry.getAttribute('position'), domeColors: number[] = [];
  for (let i = 0; i < dp.count; i++) { const c = color(Math.sin(dp.getY(i) * 380) > -.3 ? '#9c9970' : '#5d6c48'); domeColors.push(c.r, c.g, c.b); }
  domeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(domeColors, 3)); keepG(domeGeometry);
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / 4), x = -.35 + (i % 4) * .12 + row % 2 * .028, y = -.42 + row * .11 + Math.sin(i * 1.7) * .009;
    const dome = mesh(domeGeometry, domeMaterial, `history-laminated-dome-${i}`, mats); dome.scale.set(.84 + i % 3 * .08, .42 + i % 3 * .08, .86 + i % 2 * .11); orient(dome, x, y, historyLocalBed(x, y) - .008);
  }
  for (let i = 0; i < 5; i++) {
    const cx = -.18 + i * .085, cy = -.28 + i % 2 * .15, radius = .105 + i % 2 * .016;
    const center = historyLocalPoint(cx, cy, historyLocalBed(cx, cy) + .002), triangles: THREE.Vector3[][] = [];
    for (let j = 0; j < 24; j++) {
      const a = j * Math.PI / 12, b = (j + 1) * Math.PI / 12;
      const x1 = cx + Math.cos(a) * radius, y1 = cy + Math.sin(a) * radius;
      const x2 = cx + Math.cos(b) * radius, y2 = cy + Math.sin(b) * radius;
      triangles.push(upwardTriangle(center, historyLocalPoint(x1, y1, historyLocalBed(x1, y1) + .002), historyLocalPoint(x2, y2, historyLocalBed(x2, y2) + .002)));
    }
    mesh(geometryFromTriangles(triangles), matMaterial, `history-thin-mat-${i}`, mats);
  }
  const iron = new THREE.Group(); iron.name = 'history-one-iron-deposition-site'; site.add(iron);
  const ironMaterial = standard('#9f5e39', .97);
  for (let i = 0; i < 18; i++) { const x = -.63 + i % 6 * .065, y = -.03 + Math.floor(i / 6) * .075; const grain = mesh(rubble(.025 + i % 3 * .006, i + 24), ironMaterial, `history-iron-aggregate-${i}`, iron); orient(grain, x, y, historyLocalBed(x, y) + .006); grain.scale.y = .5; }

  const roots = new THREE.Group(); roots.name = 'history-root-network-local-evidence'; site.add(roots);
  const woodMaterial = standard('#665039', .94), barkMaterial = standard('#4d4c35', .96); finish(woodMaterial, 'rock'); finish(barkMaterial, 'wood');
  for (const [treeIndex, [cx, cy, height]] of [[0, [.52, -.31, .43]], [1, [.79, .2, .3]]] as [number, [number, number, number]][]) {
    contactShadow(cx, cy, .19, `history-root-contact-shadow-${treeIndex}`, roots);
    const trunkGeometry = new THREE.CylinderGeometry(.032, .049, height, compact ? 20 : 32, 14);
    const tp = trunkGeometry.getAttribute('position');
    for (let k = 0; k < tp.count; k++) { const x = tp.getX(k), y = tp.getY(k), z = tp.getZ(k), t = (y + height / 2) / height; const grain = 1 + .065 * Math.sin(Math.atan2(z, x) * 7 + t * 3.8) + .035 * historyNoise3(x * 120, y * 15, z * 120); tp.setXYZ(k, x * grain + .01 * Math.sin(t * Math.PI), y, z * grain + .007 * Math.sin(t * Math.PI * 2)); }
    trunkGeometry.computeVertexNormals(); const trunk = mesh(trunkGeometry, barkMaterial, `history-rooted-trunk-${treeIndex}`, roots); orient(trunk, cx, cy, historyLocalBed(cx, cy) + height / 2 - .006);
    const cut = mesh(new THREE.CircleGeometry(.032, 24), woodMaterial, `history-cut-trunk-top-${treeIndex}`, roots); orient(cut, cx, cy, historyLocalBed(cx, cy) + height - .004, new THREE.Vector3(0, 0, 1));
    for (let j = 0; j < 6; j++) {
      const angle = j * Math.PI / 3 + treeIndex * .4, length = .21 + j % 3 * .038;
      const points = Array.from({ length: 9 }, (_, k) => { const t = k / 8, x = cx + Math.cos(angle + Math.sin(t * 3) * .1) * length * t, y = cy + Math.sin(angle) * length * t; return historyLocalPoint(x, y, historyLocalBed(x, y) + .008 + (1 - t) * .012); });
      const curve = new THREE.CatmullRomCurve3(points), rootGeometry = new THREE.TubeGeometry(curve, compact ? 14 : 22, .014 - j % 2 * .002, 9, false), rp = rootGeometry.getAttribute('position'), ru = rootGeometry.getAttribute('uv');
      for (let k = 0; k < rp.count; k++) { const t = ru.getX(k), center = curve.getPointAt(t), point = new THREE.Vector3(rp.getX(k), rp.getY(k), rp.getZ(k)).sub(center).multiplyScalar(1 - t * .76).add(center); rp.setXYZ(k, point.x, point.y, point.z); }
      rootGeometry.computeVertexNormals(); mesh(rootGeometry, barkMaterial, `history-contact-root-${treeIndex}-${j}`, roots);
    }
  }
  const seabed = new THREE.Group(); seabed.name = 'history-shallow-seabed-context'; site.add(seabed);
  const spongeMaterial = standard('#9f9673', .98);
  for (let i = 0; i < 5; i++) {
    const x = -.68 + i * .105, y = .2 + i % 2 * .14, height = .09 + i % 3 * .03;
    const sponge = mesh(new THREE.CylinderGeometry(.022, .039, height, 14, 5, true), spongeMaterial, `history-attached-sponge-${i}`, seabed); orient(sponge, x, y, historyLocalBed(x, y) + height / 2 - .004);
    const rim = mesh(new THREE.TorusGeometry(.022, .005, 7, 16), spongeMaterial, `history-sponge-opening-${i}`, seabed); orient(rim, x, y, historyLocalBed(x, y) + height - .003, new THREE.Vector3(0, 0, 1));
  }
  const ice = new THREE.Group(); ice.name = 'history-ice-meets-local-bed'; site.add(ice);
  const iceTriangles: THREE.Vector3[][] = [], iceSide: THREE.Vector3[][] = [], grid = compact ? 22 : 34;
  function icePoint(i: number, j: number, base = false) { const x = -.035 + i / grid * 1.01, y = -.7 + j / grid * 1.4, thickness = .014 + smooth(0, .3, i / grid) * (.058 + .045 * (1 - Math.pow(y / .76, 2))); return historyLocalPoint(x, y, historyLocalBed(x, y) + (base ? .001 : thickness)); }
  for (let j = 0; j < grid; j++) for (let i = 0; i < grid; i++) {
    const a = icePoint(i, j), b = icePoint(i + 1, j), c = icePoint(i + 1, j + 1), d = icePoint(i, j + 1); iceTriangles.push(upwardTriangle(a, b, c), upwardTriangle(a, c, d));
    if (i === 0) iceSide.push([a, icePoint(i, j, true), d], [d, icePoint(i, j, true), icePoint(i, j + 1, true)]);
    if (i === grid - 1) iceSide.push([b, c, icePoint(i + 1, j, true)], [c, icePoint(i + 1, j + 1, true), icePoint(i + 1, j, true)]);
    if (j === 0) iceSide.push([a, b, icePoint(i, j, true)], [b, icePoint(i + 1, j, true), icePoint(i, j, true)]);
    if (j === grid - 1) iceSide.push([d, icePoint(i, j + 1, true), c], [c, icePoint(i, j + 1, true), icePoint(i + 1, j + 1, true)]);
  }
  const iceTopMaterial = standard('#cbdcdb', .53), iceSideMaterial = standard('#72989f', .62); finish(iceTopMaterial, 'ice'); finish(iceSideMaterial, 'ice');
  mesh(geometryFromTriangles(iceTriangles), iceTopMaterial, 'history-ice-surface', ice);
  mesh(geometryFromTriangles(iceSide), iceSideMaterial, 'history-ice-contact-face', ice);
  const crisis = new THREE.Group(); crisis.name = 'history-local-crisis-proxies'; site.add(crisis);
  const volcanoes = new THREE.Group(); volcanoes.name = 'history-volcanic-proxy'; crisis.add(volcanoes);
  const basaltMaterial = standard('#49453e', .96), fissureMaterial = standard('#ae5930', .7); finish(basaltMaterial, 'rock');
  fissureMaterial.emissive.set('#ab3b14'); fissureMaterial.emissiveIntensity = .45;
  // Low fissures and broad basalt contacts are a generic volcanic mechanism, not mapped Traps cones.
  for (let i = 0; i < 3; i++) {
    const cx = .28 + i * .2, cy = .34 - i % 2 * .09;
    mesh(historyGroundDisk(cx, cy, .145, .005, true), basaltMaterial, `history-basalt-contact-${i}`, volcanoes);
    const points = Array.from({ length: 11 }, (_, j) => { const t = j / 10, x = cx - .085 + t * .17, y = cy + Math.sin(t * 4 + i) * .018; return historyLocalPoint(x, y, historyLocalBed(x, y) + .009); });
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, .006, 7, false), fissureMaterial, `history-volcanic-fissure-${i}`, volcanoes);
  }
  const crater = new THREE.Group(); crater.name = 'history-impact-site-proxy'; crisis.add(crater);
  const impactStone = mesh(rubble(.072, 106), rubbleMaterial, 'history-local-impact-body', crater);
  const craterFloor = mesh(new THREE.CircleGeometry(.145, 36), standard('#544c41'), 'history-impact-basin', crater); orient(craterFloor, .52, .24, historyLocalBed(.52, .24) + .004, new THREE.Vector3(0, 0, 1));
  const craterRim = mesh(new THREE.TorusGeometry(.147, .023, 10, 48), standard('#93806a'), 'history-impact-contact-rim', crater); orient(craterRim, .52, .24, historyLocalBed(.52, .24) + .013, new THREE.Vector3(0, 0, 1));
  const ownedTextures = new Set<THREE.Texture>([...finishTextures.values(), fieldTextures.field, fieldTextures.detail]);
  let disposed = false, fieldsAdopted = false, modernTexture: THREE.Texture | null = null;
  function update(frame: JourneyFrame, lens: HistoryJourneyLens) {
    if (disposed) return;
    const cues = frame.cues, phase = clamp(frame.progress), motion = clamp(phase / HISTORY_OBSERVATION_HOLD), local = lens === 'local', cut = local && frame.mode === 'differentiation';
    const atEvent = (id: JourneyFrame['eventId'], age: number) => frame.eventId === id && Math.abs(frame.ageMa - age) < .0005;
    const moonExample = atEvent('moon', 4500), permianExample = atEvent('permian', 252), kpgExample = atEvent('cretaceous', 66);
    const early = ['accretion', 'differentiation', 'impact'].includes(frame.mode), surfaceCues = early ? cues : { ...cues, melt: 0 };
    const growing = frame.mode === 'accretion' ? .9 + smooth(0, 1, motion) * .1 : 1;
    const localSite = local && !early;
    group.visible = lens !== 'evidence'; planet.scale.setScalar((local ? (early ? 1.22 : LOCAL_PLANET_SCALE) : 1) * growing);
    earth.geometry = cut ? cutGeometry : early ? roughGeometry : globeGeometry; earth.visible = !localSite;
    cutaway.visible = cut; planet.rotation.x = localSite ? -Math.PI / 2 : 0; site.visible = localSite;
    // A close illustration window: the same contact and attached objects enlarge together.
    // The retained globe is hidden here so its silhouette cannot turn the environment into a tile.
    site.scale.setScalar(localSite ? LOCAL_SITE_MAGNIFICATION : 1);
    site.position.copy(siteAnchor).multiplyScalar(localSite ? 1 - LOCAL_SITE_MAGNIFICATION : 0);
    coreGroup.scale.setScalar(.42 + .58 * smooth(0, .94, motion));
    metalDrops.forEach((drop, i) => {
      const angle = i % 2 ? Math.PI / 2 : 0, theta = -1.22 + hash3(i + 31, 6, 12) * 2.44;
      const travel = smooth(i < 10 ? 0 : hash3(i, 7, 19) * .26, .92, motion);
      const radius = mix(.64 + hash3(i + 17, 29, 7) * .52, .18 + hash3(i, 5, 3) * .22, travel);
      drop.position.set(-Math.cos(angle) * Math.cos(theta) * radius - (i % 2 ? .018 : 0), Math.sin(theta) * radius, Math.sin(angle) * Math.cos(theta) * radius + (i % 2 ? 0 : .018));
      const scale = (i < 10 ? .8 + i % 3 * .23 : .28 + i % 4 * .11) * (1 - smooth(.68, .95, travel) * .94);
      drop.scale.set(scale, scale * (1.45 + Math.sin(i * 1.9) * .32), scale * .75);
      drop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), drop.position.clone().normalize());
    });
    atmosphere.visible = !cut && !localSite; rimMaterial.opacity = .025 + clamp(cues.ocean) * .045;
    const present = frame.mode === 'present', map = present ? modernTexture : null, vertexColors = !present || !modernTexture;
    if (planetMaterial.map !== map || planetMaterial.vertexColors !== vertexColors) { planetMaterial.map = map; planetMaterial.vertexColors = vertexColors; planetMaterial.needsUpdate = true; }
    planetMaterial.color.set('#ffffff');
    surfaceUniforms.historyChannels.value.set(clamp(surfaceCues.melt), clamp(cues.ocean), clamp(cues.land), clamp(cues.ice));
    surfaceUniforms.historyVegetation.value = clamp(cues.vegetation); surfaceUniforms.historyUseMap.value = map ? 1 : 0;
    const impactFrame = historyLunarImpact(motion);
    const impactHeat = moonExample ? smooth(impactFrame.contact, impactFrame.contact + .12, motion) * (1 - smooth(.78, 1, motion)) : 0;
    surfaceUniforms.historyEarly.value.set(early ? 1 : 0, motion, frame.mode === 'accretion' ? 0 : frame.mode === 'differentiation' ? 1 : 2, impactHeat);
    planetMaterial.emissive.set(early ? '#ffb55f' : '#8e2b0d'); planetMaterial.emissiveIntensity = clamp(surfaceCues.melt) * .7;
    planetMaterial.roughness = mix(.93, .52, clamp(cues.ocean));
    orbital.visible = lens === 'globe' || (local && frame.mode === 'impact');
    orbital.scale.copy(planet.scale);
    rocks.visible = dust.visible = lens === 'globe' && frame.mode === 'accretion';
    if (frame.mode === 'accretion' && lens === 'globe') {
      for (let i = 0; i < 48; i++) {
        const travel = smooth(hash3(i + 3, 17, 9) * .66, .3 + hash3(i + 3, 17, 9) * .66, motion);
        const angle = i * 2.399963 + motion * (.18 + i % 5 * .025), radius = mix(1.98 + i % 9 * .1, 1.24, travel);
        instancePose.position.set(Math.cos(angle), Math.sin(i * 1.7) * .37, Math.sin(angle)).normalize().multiplyScalar(radius);
        instancePose.rotation.set(i * .71 + motion, i * .34 + motion * .8, i * .43); instancePose.scale.setScalar((.36 + i % 5 * .13) * (1 - smooth(.85, 1, travel))); instancePose.updateMatrix(); rocks.setMatrixAt(i, instancePose.matrix);
      }
      for (let i = 0; i < 128; i++) {
        const travel = smooth(hash3(i + 53, 7, 3) * .7, .28 + hash3(i + 53, 7, 3) * .7, motion);
        const angle = i * 2.399963 + motion * (.35 + i % 7 * .025), radius = mix(1.9 + i % 17 * .065, 1.22, travel);
        instancePose.position.set(Math.cos(angle), Math.sin(i * 1.37) * .28, Math.sin(angle)).normalize().multiplyScalar(radius);
        instancePose.rotation.set(i * .3, i * .7 + motion, i * .5); instancePose.scale.setScalar((.55 + i % 4 * .19) * (1 - smooth(.84, 1, travel))); instancePose.updateMatrix(); dust.setMatrixAt(i, instancePose.matrix);
      }
      rocks.instanceMatrix.needsUpdate = dust.instanceMatrix.needsUpdate = true;
    }
    collider.visible = moonExample && motion < .72; collider.position.copy(impactFrame.position); collider.rotation.set(motion * .7, motion, .5);
    const disruption = smooth(impactFrame.contact, .72, motion); collider.scale.set(1 + disruption * .55, 1 - disruption * .5, 1 - disruption * .26);
    debris.visible = moonExample && motion > impactFrame.contact && motion < 1;
    discMaterial.opacity = .7 * smooth(impactFrame.contact, .65, motion) * (1 - smooth(.84, 1, motion));
    debris.scale.setScalar(.55 + .45 * impactFrame.aftermath); debris.rotation.z = .1 + impactFrame.aftermath * .65;
    ejecta.visible = moonExample && motion > impactFrame.contact;
    if (ejecta.visible) {
      const startAngle = Math.atan2(impactFrame.normal.z, impactFrame.normal.x);
      for (let i = 0; i < 64; i++) {
        const delay = hash3(i + 21, 9, 4) * .075;
        const travel = clamp((motion - impactFrame.contact - delay) / (1 - impactFrame.contact - delay));
        const spread = Math.sin(travel * Math.PI / 2), angle = startAngle + travel * (.6 + i % 7 * .13);
        const radius = HISTORY_PLANET_RADIUS + spread * (.55 + i % 11 * .1);
        instancePose.position.set(Math.cos(angle) * radius, impactFrame.normal.y * HISTORY_PLANET_RADIUS + Math.sin(travel * Math.PI) * (.08 + hash3(i, 14, 7) * .9), Math.sin(angle) * radius);
        instancePose.rotation.set(i * .73 + travel * 2.3, i * .9 + travel * 1.7, i * .31);
        instancePose.scale.set(.45 + i % 5 * .17, .38 + i % 4 * .19, .52 + i % 3 * .15).multiplyScalar(smooth(0, .06, travel) * (1 - smooth(.88, 1, motion) * .7));
        instancePose.updateMatrix(); ejecta.setMatrixAt(i, instancePose.matrix);
      }
      ejectaMaterial.emissiveIntensity = .65 * (1 - smooth(.55, .96, motion)); ejecta.instanceMatrix.needsUpdate = true;
    }
    moon.visible = frame.stationIndex > 2 || (frame.stationId === 'moon' && motion > .74);
    moon.position.set(2.25, .26, -.32); moon.scale.setScalar(frame.stationId === 'moon' ? smooth(.74, 1, motion) : 1);
    mats.visible = frame.mode === 'microbes' || frame.mode === 'oxygen'; iron.visible = frame.mode === 'oxygen';
    seabed.visible = frame.mode === 'animals'; roots.visible = frame.mode === 'forests' || frame.mode === 'extinction' || frame.mode === 'present';
    ice.visible = frame.mode === 'icehouse'; crisis.visible = permianExample || kpgExample; volcanoes.visible = permianExample; crater.visible = kpgExample;
    impactStone.visible = kpgExample && motion < .65; orient(impactStone, .52, .24, historyLocalBed(.52, .24) + .08 + .65 * (1 - clamp(motion / .65)));
    impactStone.rotation.z = motion * .75;
    const craterGrowth = smooth(.58, .84, motion); craterFloor.visible = craterRim.visible = craterGrowth > 0; craterFloor.scale.setScalar(craterGrowth); craterRim.scale.setScalar(craterGrowth);
    water.visible = clamp(cues.ocean) > .05;
    const rgb = bed.geometry.getAttribute('color');
    for (let i = 0; i < bedPosition.count; i++) {
      const green = bedGreen[i] * clamp(cues.vegetation) * .7, dark = clamp(cues.melt) * .35;
      rgb.setXYZ(i, mix(mix(bedBasis[i * 3], plantColor.r, green), rockColor.r, dark), mix(mix(bedBasis[i * 3 + 1], plantColor.g, green), rockColor.g, dark), mix(mix(bedBasis[i * 3 + 2], plantColor.b, green), rockColor.b, dark));
    }
    rgb.needsUpdate = true; barkMaterial.color.set(permianExample || kpgExample ? '#514537' : '#4d4c35');
    group.userData = { ...group.userData, stationId: frame.stationId, mode: frame.mode, lens, phase, earthIdentity: earth.uuid, displayGeometry: 'Original qualitative spherical fields and attached local examples; no paleogeographic reconstruction or physical solver.', localSite: 'Same authored spherical site patch; contact and relief are enlarged display geometry, not measured ancient locations.', oxygenMeaning: 'No visible oxygen layer; chemical evidence belongs to the evidence owner.' };
  }
  return {
    group, planet, earth, site,
    update,
    setFieldTextures(field: THREE.Texture, detail: THREE.Texture) {
      if (disposed || fieldsAdopted) return false;
      fieldsAdopted = true;
      ownedTextures.add(field); ownedTextures.add(detail);
      surfaceUniforms.historyFieldMap.value = field; surfaceUniforms.historyDetailMap.value = detail;
      return true;
    },
    setModernTexture(texture: THREE.Texture | null) { modernTexture = texture; },
    dispose() { if (disposed) return; disposed = true; group.removeFromParent(); planetMaterial.map = null; for (const instance of [rocks, dust, ejecta]) instance.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); ownedTextures.forEach(t => t.dispose()); group.clear(); },
    resources: { geometries, materials, textures: ownedTextures, instances: [rocks, dust, ejecta] },
  };
}
