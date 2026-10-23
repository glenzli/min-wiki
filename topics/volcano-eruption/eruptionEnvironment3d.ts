import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seed } from './magmaGeometry.ts';
import { rockMaterial } from './eruptionMaterials.ts';
import {
  ENVIRONMENT_LIMITS, environmentGroundBuffers, environmentGroundHeight, environmentLayout, environmentRoadBuffers,
  woodlandFloorBuffers, type EnvironmentBuffers, type EnvironmentLayout,
} from './eruptionEnvironment.ts';
import type { Landform } from './projectModel.ts';
import type { XYZ } from './eruptionGeometry.ts';

function geometry(data: EnvironmentBuffers) {
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
  result.setIndex(data.indices); result.computeVertexNormals(); return result;
}
function merged(parts: THREE.BufferGeometry[]) {
  const result = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!result) throw new Error('Incompatible eruption environment geometry');
  return result;
}
const up = new THREE.Vector3(0, 1, 0);
function branch(a: XYZ, b: XYZ, bottom: number, top: number) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const result = new THREE.CylinderGeometry(top, bottom, direction.length(), 7, 1);
  result.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()));
  result.translate(...start.add(end).multiplyScalar(.5).toArray()); return result;
}

/** Branch-following unequal leaf sprays make a ragged, uneven crown. A small
 * family is retained as instanced geometry; there are no leaf sprites, alpha
 * foliage planes, per-frame wind updates or spherical crown primitives. */
function leafSpray(center: XYZ, rx: number, ry: number, rz: number, phase: number) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [], colours: number[] = [];
  const rings = 5, sectors = 9;
  for (let i = 0; i <= rings; i++) for (let j = 0; j <= sectors; j++) {
    const v = i / rings, angle = j / sectors * Math.PI * 2, envelope = Math.sin(v * Math.PI) ** .7;
    const irregular = 1 + .16 * Math.sin(angle * 3 + v * 4 + phase) + .11 * Math.sin(angle * 7 - phase);
    positions.push(center[0] + Math.cos(angle) * rx * envelope * irregular,
      center[1] + (v - .5) * ry * 2 + .10 * ry * Math.sin(angle * 5 + phase) * envelope,
      center[2] + Math.sin(angle) * rz * envelope * irregular);
    uvs.push(j / sectors, v);
    const shade = .72 + .18 * v + .12 * seed(i * 77 + j * 13 + phase);
    colours.push(shade * .94, shade, shade * .86);
    if (i < rings && j < sectors) {
      const a = i * (sectors + 1) + j, b = a + sectors + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const result = geometry({ positions, uvs, indices });
  result.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3)); return result;
}
function treeGeometry(variant: number) {
  const wood: THREE.BufferGeometry[] = [], leaves: THREE.BufferGeometry[] = [], salt = 7000 + variant * 103;
  const leanX = (seed(salt) - .5) * .07, leanZ = (seed(salt + 1) - .5) * .07;
  const points: XYZ[] = [[0, -.045, 0], [leanX * .3, .29, leanZ * .3], [leanX, .63, leanZ], [leanX + .02, .85, leanZ]];
  for (let i = 0; i < points.length - 1; i++) wood.push(branch(points[i], points[i + 1], [.052, .029, .017][i], [.029, .017, .007][i]));
  const forks = 5 + variant % 3;
  for (let i = 0; i < forks; i++) {
    const angle = i * 2.39996 + seed(salt + i + 10) * .5, spread = .19 + .07 * seed(salt + i + 20);
    const origin: XYZ = [leanX * .65, .29 + i / forks * .28, leanZ * .65];
    const tip: XYZ = [leanX + Math.cos(angle) * spread, .57 + i / forks * .22 + seed(salt + i + 30) * .035, leanZ + Math.sin(angle) * spread];
    wood.push(branch(origin, tip, .018 - i * .001, .005));
    const twig: XYZ = [tip[0] + Math.cos(angle + .8) * .07, tip[1] + .075, tip[2] + Math.sin(angle + .8) * .07];
    wood.push(branch(tip, twig, .006, .002));
    leaves.push(leafSpray([tip[0], tip[1] + .055, tip[2]], .145 + seed(salt + i + 50) * .03,
      .13 + seed(salt + i + 60) * .04, .14 + seed(salt + i + 70) * .035, salt + i));
  }
  leaves.push(leafSpray([leanX + .02, .84, leanZ], .17, .16, .16, salt + 81));
  return { trunk: merged(wood), crown: merged(leaves) };
}

function transformedBox(size: XYZ, position: XYZ, rotation: XYZ = [0, 0, 0]) {
  const result = new THREE.BoxGeometry(...size); result.rotateX(rotation[0]); result.rotateY(rotation[1]); result.rotateZ(rotation[2]);
  result.translate(...position); return result;
}
function houseSolid(width: number, depth: number, height: number, rise: number) {
  const positions: number[] = [], indices: number[] = [];
  for (const z of [-depth / 2, depth / 2]) positions.push(-width / 2, 0, z, width / 2, 0, z,
    width / 2, height, z, 0, height + rise, z, -width / 2, height, z);
  indices.push(0, 2, 1, 0, 3, 2, 0, 4, 3, 5, 6, 7, 5, 7, 8, 5, 8, 9);
  for (let i = 0; i < 5; i++) { const next = (i + 1) % 5; indices.push(i, next, i + 5, next, next + 5, i + 5); }
  const indexed = geometry({ positions, uvs: positions.flatMap((_, i) => i % 3 === 0 ? [positions[i], positions[i + 1]] : []), indices });
  const result = indexed.toNonIndexed(); indexed.dispose(); result.computeVertexNormals(); return result;
}
function siteTransform(data: THREE.BufferGeometry, x: number, y: number, z: number, yaw: number) {
  data.rotateY(yaw); data.translate(x, y, z); return data;
}

export interface EnvironmentResources {
  geometryBytes: number; instanceBytes: number; drawCalls: number; materials: number; triangles: number; trees: number;
}

/** Complete retained owner for the older decorative land context. Its only
 * invalidation input is Landform. Texture and clipping plane are borrowed;
 * buffers, materials and instance buffers are owned here and disposed once. */
export class EruptionEnvironment3D {
  readonly group = new THREE.Group();
  readonly layout: EnvironmentLayout;
  readonly resources: EnvironmentResources;
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private instances = new Set<THREE.InstancedMesh>();
  private disposed = false;
  private section = false;

  constructor(readonly kind: Landform, texture: THREE.Texture, private cut: THREE.Plane) {
    this.group.name = 'older-eruption-setting'; this.layout = environmentLayout(kind);
    const groundData = environmentGroundBuffers(kind), groundGeometry = geometry(groundData), ground = rockMaterial(texture);
    groundGeometry.setAttribute('environmentSoil', new THREE.Float32BufferAttribute(groundData.colours, 4));
    const rockCompile = ground.onBeforeCompile;
    ground.onBeforeCompile = (shader, renderer) => {
      rockCompile(shader, renderer);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 environmentSoil; varying vec4 vEnvironmentSoil;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEnvironmentSoil=environmentSoil;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vEnvironmentSoil;')
        .replace('#include <roughnessmap_fragment>', 'diffuseColor.rgb=mix(diffuseColor.rgb,vEnvironmentSoil.rgb,vEnvironmentSoil.a);\n#include <roughnessmap_fragment>');
    };
    ground.customProgramCacheKey = () => 'volcano-older-setting-ground-v1';
    this.add(groundGeometry, ground, 'older-ground', false);
    const litterData = woodlandFloorBuffers(this.layout), litter = geometry(litterData);
    litter.setAttribute('color', new THREE.Float32BufferAttribute(litterData.colours, 4));
    this.add(litter, this.style({ color: '#ffffff', vertexColors: true, transparent: true, depthWrite: false, alphaTest: .018, roughness: 1 }), 'woodland-floor', false);
    this.add(environmentRoadBuffers(this.layout, .32, .004), this.style({ color: '#625d50', roughness: 1 }), 'road-shoulder', false);
    this.add(environmentRoadBuffers(this.layout, .18, .008), this.style({ color: '#44443e', roughness: 1 }), 'access-road', false);
    this.addPad(); this.addTrees(); this.addFacilities();
    this.resources = this.measure();
    const limits = ENVIRONMENT_LIMITS;
    if (this.resources.geometryBytes > limits.geometryBytes || this.resources.instanceBytes > limits.instanceBytes
      || this.resources.drawCalls > limits.drawCalls || this.resources.materials > limits.materials || this.resources.triangles > limits.triangles) {
      this.dispose(); throw new Error('Eruption environment exceeded its retained resource budget');
    }
  }

  private style(options: THREE.MeshStandardMaterialParameters) { return new THREE.MeshStandardMaterial(options); }
  private add(data: THREE.BufferGeometry | EnvironmentBuffers, material: THREE.Material, name: string, castShadow = true) {
    const shape = data instanceof THREE.BufferGeometry ? data : geometry(data), mesh = new THREE.Mesh(shape, material);
    mesh.name = name; mesh.castShadow = castShadow; mesh.receiveShadow = true;
    this.geometries.add(shape); this.materials.add(material); this.group.add(mesh); return mesh;
  }
  private addPad() {
    const { pad, kind } = this.layout, positions: number[] = [], uvs: number[] = [], indices: number[] = [], nx = 16, nz = 12;
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const u = (i / nx - .5) * pad.width, v = (j / nz - .5) * pad.depth;
      const x = pad.x + u * Math.cos(pad.yaw) + v * Math.sin(pad.yaw), z = pad.z - u * Math.sin(pad.yaw) + v * Math.cos(pad.yaw);
      positions.push(x, environmentGroundHeight(x, z, kind) + .005, z); uvs.push(i / nx, j / nz);
      if (i < nx && j < nz) { const a = i * (nz + 1) + j, b = a + nz + 1; indices.push(a, a + 1, b, a + 1, b + 1, b); }
    }
    this.add({ positions, uvs, indices }, this.style({ color: '#665f50', roughness: 1 }), 'service-ground', false);
  }
  private addTrees() {
    const bark = this.style({ color: '#ffffff', roughness: 1 }), foliage = this.style({ color: '#ffffff', vertexColors: true, roughness: 1 });
    const dummy = new THREE.Object3D(), colour = new THREE.Color(), low = new THREE.Color('#3c5039'), high = new THREE.Color('#637052');
    for (let variant = 0; variant < ENVIRONMENT_LIMITS.treeVariants; variant++) {
      const sites = this.layout.trees.filter(site => site.variant === variant), shapes = treeGeometry(variant);
      for (const [name, shape, material] of [['tree-trunks', shapes.trunk, bark], ['tree-crowns', shapes.crown, foliage]] as const) {
        const mesh = new THREE.InstancedMesh(shape, material, sites.length); mesh.name = `${name}-${variant}`;
        mesh.castShadow = mesh.receiveShadow = true;
        sites.forEach((site, index) => {
          dummy.position.fromArray(site.position); dummy.rotation.set(0, site.yaw, 0); dummy.scale.setScalar(site.height); dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
          if (name === 'tree-crowns') colour.copy(low).lerp(high, site.tone);
          else colour.set('#554735').multiplyScalar(.78 + site.tone * .3);
          mesh.setColorAt(index, colour);
        });
        mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
        this.geometries.add(shape); this.materials.add(material); this.instances.add(mesh); this.group.add(mesh);
      }
    }
  }
  private addFacilities() {
    const foundation: THREE.BufferGeometry[] = [], walls: THREE.BufferGeometry[] = [], roofs: THREE.BufferGeometry[] = [], windows: THREE.BufferGeometry[] = [];
    for (const site of this.layout.buildings) {
      const { position: [x, , z], width, depth, height, yaw, foundationBottom, foundationTop } = site;
      foundation.push(siteTransform(transformedBox([width + .055, foundationTop - foundationBottom, depth + .055], [0, (foundationTop + foundationBottom) / 2, 0]), x, 0, z, yaw));
      const rise = .075, overhang = .035, pitch = Math.atan2(rise, width / 2), slope = Math.hypot(width / 2 + overhang, rise);
      walls.push(siteTransform(houseSolid(width, depth, height, rise), x, foundationTop, z, yaw));
      for (const side of [-1, 1]) {
        roofs.push(siteTransform(transformedBox([slope, .016, depth + overhang * 2], [side * width / 4, height + rise / 2 + .008, 0], [0, 0, -side * pitch]), x, foundationTop, z, yaw));
      }
      for (const dx of [-.23, .23]) windows.push(siteTransform(transformedBox([width * .2, height * .32, .005], [width * dx, height * .63, depth / 2 + .003]), x, foundationTop, z, yaw));
      windows.push(siteTransform(transformedBox([.006, height * .32, depth * .28], [width / 2 + .003, height * .63, 0]), x, foundationTop, z, yaw));
      windows.push(siteTransform(transformedBox([width * .15, height * .7, .005], [width * .03, height * .35, depth / 2 + .003]), x, foundationTop, z, yaw));
    }
    this.add(merged(foundation), this.style({ color: '#686459', roughness: 1 }), 'grounded-foundations');
    this.add(merged(walls), this.style({ color: '#858472', roughness: .94 }), 'service-buildings');
    this.add(merged(roofs), this.style({ color: '#535650', roughness: .83, metalness: .08 }), 'service-roofs');
    this.add(merged(windows), this.style({ color: '#304246', roughness: .43, metalness: .12 }), 'service-openings', false);
    const [x, y, z] = this.layout.monitor, frame: THREE.BufferGeometry[] = [], solar: THREE.BufferGeometry[] = [];
    frame.push(transformedBox([.14, .045, .14], [x, y + .012, z]));
    const mast = new THREE.CylinderGeometry(.009, .014, .46, 7); mast.translate(x, y + .23, z); frame.push(mast);
    frame.push(transformedBox([.06, .06, .055], [x, y + .47, z]));
    const tilt = -.38, panelCenter: XYZ = [x + .12, y + .31, z + .02];
    frame.push(transformedBox([.39, .024, .25], panelCenter, [tilt, 0, 0]));
    solar.push(transformedBox([.365, .007, .225], [0, .017, 0]).rotateX(tilt).translate(...panelCenter));
    for (let i = 1; i <= 3; i++) frame.push(transformedBox([.0025, .003, .223], [-.1825 + i * .365 / 4, .022, 0]).rotateX(tilt).translate(...panelCenter));
    this.add(merged(frame), this.style({ color: '#686c63', roughness: .72, metalness: .17 }), 'monitor-frame');
    this.add(merged(solar), this.style({ color: '#2e424c', roughness: .45, metalness: .19 }), 'monitor-solar', false);
  }
  private measure(): EnvironmentResources {
    let geometryBytes = 0, instanceBytes = 0, triangles = 0;
    for (const shape of this.geometries) {
      for (const attribute of Object.values(shape.attributes)) geometryBytes += attribute.array.byteLength;
      geometryBytes += shape.index?.array.byteLength ?? 0;
    }
    for (const mesh of this.instances) instanceBytes += mesh.instanceMatrix.array.byteLength + (mesh.instanceColor?.array.byteLength ?? 0);
    this.group.traverse(object => {
      if (object instanceof THREE.Mesh) triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3
        * (object instanceof THREE.InstancedMesh ? object.count : 1);
    });
    return { geometryBytes, instanceBytes, triangles, drawCalls: this.group.children.length, materials: this.materials.size, trees: this.layout.trees.length };
  }
  setSection(enabled: boolean) {
    if (this.disposed || this.section === enabled) return;
    this.section = enabled;
    for (const material of this.materials) {
      material.clippingPlanes = enabled ? [this.cut] : []; material.clipShadows = true; material.needsUpdate = true;
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const mesh of this.instances) mesh.dispose();
    for (const shape of this.geometries) shape.dispose();
    for (const material of this.materials) material.dispose();
    this.instances.clear(); this.geometries.clear(); this.materials.clear();
    this.group.removeFromParent(); this.group.clear();
  }
}
