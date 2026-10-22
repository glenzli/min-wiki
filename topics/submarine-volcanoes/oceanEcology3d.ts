import * as THREE from 'three';
import { oceanGeometryFrame, seed, WATER_Y, type OceanGeometryFrame } from './geometry3d.ts';
import type { OceanUniforms } from './materials3d.ts';
import { ECOLOGY_PATCH_RINGS, ECOLOGY_PATCH_SECTORS, ECOLOGY_PATCH_VERTICES, ISLAND_ECOLOGY_SITES,
  MARINE_ECOLOGY_SITES, oceanEcology, type OceanEcologyCase, type OceanEcologySite } from './oceanEcology.ts';

/** The same fixed mean-water path used by this topic's stone materials. These
 * small non-emissive organisms do not borrow lava heat, light or detail motion. */
const WATER_PATH = /* glsl */`
float lifeWaterPath(vec3 p){
  float distanceToEye=length(p-cameraPosition),water=${WATER_Y.toFixed(4)};
  if(p.y>=water&&cameraPosition.y>=water)return 0.;
  float start=0.,end=1.;
  if(cameraPosition.y>=water)start=(water-cameraPosition.y)/(p.y-cameraPosition.y);
  if(p.y>=water)end=(water-cameraPosition.y)/(p.y-cameraPosition.y);
  if(uLifeCutaway>.5){
    if(p.z>=0.&&cameraPosition.z>=0.)return 0.;
    if(cameraPosition.z>=0.)start=max(start,-cameraPosition.z/(p.z-cameraPosition.z));
    if(p.z>=0.)end=min(end,-cameraPosition.z/(p.z-cameraPosition.z));
  }
  return distanceToEye*max(0.,end-start);
}
vec3 lifeAttenuate(vec3 color,vec3 p){
  vec3 transmission=exp(-vec3(.145,.062,.040)*lifeWaterPath(p)*(1.+uLifeDeep*.42));
  vec3 scatter=mix(vec3(.012,.067,.083),vec3(.0011,.0035,.0052),uLifeDeep);
  return color*transmission+scatter*(1.-transmission);
}
`;

function lifeMaterial(noise: THREE.Data3DTexture, ocean: OceanUniforms, kind: 'film' | 'soil' | 'shell' | 'seedling') {
  const patch = kind === 'film' || kind === 'soil';
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true,
    roughness: kind === 'shell' ? .84 : .96, metalness: 0, side: THREE.DoubleSide,
    transparent: patch, opacity: kind === 'film' ? .32 : 1, depthWrite: !patch,
    polygonOffset: patch, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { uLifeStone: { value: noise }, uLifeDeep: ocean.deep, uLifeCutaway: ocean.cutaway });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLifeWorld;${patch ? 'attribute float lifeRadius;attribute float lifeCoverage;attribute vec2 lifePatch;varying float vLifeRadius;varying float vLifeCoverage;varying vec2 vLifePatch;' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${patch ? 'vLifeRadius=lifeRadius;vLifeCoverage=lifeCoverage;vLifePatch=lifePatch;' : ''}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 lifePosition=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          lifePosition=instanceMatrix*lifePosition;
        #endif
        vLifeWorld=(modelMatrix*lifePosition).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform highp sampler3D uLifeStone;uniform float uLifeDeep;uniform float uLifeCutaway;
        varying vec3 vLifeWorld;${patch ? 'varying float vLifeRadius;varying float vLifeCoverage;varying vec2 vLifePatch;' : ''}
        ${WATER_PATH}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float lifeGrain=texture(uLifeStone,vLifeWorld*5.1).r;
        float lifeFine=texture(uLifeStone,vLifeWorld*17.3+vec3(2.7,1.1,3.3)).r;
        diffuseColor.rgb*=.78+.22*lifeGrain+.16*lifeFine;
        ${patch ? `
          float lifeEdge=1.-smoothstep(max(.0,vLifeCoverage*.94-.14),max(.001,vLifeCoverage*.94),vLifeRadius);
          float lifeBroken=${kind === 'film' ? 'smoothstep(.39,.66,lifeGrain+.12*lifeFine+.10*sin(vLifePatch.x*17.+lifeGrain*5.))' : 'smoothstep(.25,.53,lifeGrain+.16*lifeFine)'};
          diffuseColor.a*=lifeEdge*lifeBroken*min(1.,vLifeCoverage*4.);
          ${kind === 'soil' ? `
            float lifeCrack=1.-smoothstep(.009,.035,abs(lifeFine-.50));
            diffuseColor.rgb*=1.-lifeCrack*.48;
          ` : `
            float lifeThread=1.-smoothstep(.17,.57,abs(vLifePatch.y+.22*sin(vLifePatch.x*6.7+lifeGrain*4.)));
            diffuseColor.a*=.23+.57*lifeThread;
            diffuseColor.rgb=mix(diffuseColor.rgb*.58,diffuseColor.rgb,smoothstep(.29,.70,lifeFine));
          `}
          if(diffuseColor.a<.015)discard;
        ` : ''}`)
      .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb=lifeAttenuate(gl_FragColor.rgb,vLifeWorld);\n#include <tonemapping_fragment>');
  };
  material.customProgramCacheKey = () => `ocean-life-${kind}-v2`;
  return material;
}

function patchGeometry(count: number) {
  const vertices = count * ECOLOGY_PATCH_VERTICES, geometry = new THREE.BufferGeometry();
  const radius = new Float32Array(vertices), patch = new Float32Array(vertices * 2), indices: number[] = [];
  for (let site = 0; site < count; site++) {
    const start = site * ECOLOGY_PATCH_VERTICES;
    for (let ring = 0; ring < ECOLOGY_PATCH_RINGS; ring++) for (let sector = 0; sector < ECOLOGY_PATCH_SECTORS; sector++) {
      const a = start + 1 + ring * ECOLOGY_PATCH_SECTORS + sector;
      const b = start + 1 + ring * ECOLOGY_PATCH_SECTORS + (sector + 1) % ECOLOGY_PATCH_SECTORS;
      radius[a] = [.34, .68, 1][ring];
      patch[a * 2] = Math.cos(sector / ECOLOGY_PATCH_SECTORS * Math.PI * 2) * radius[a];
      patch[a * 2 + 1] = Math.sin(sector / ECOLOGY_PATCH_SECTORS * Math.PI * 2) * radius[a];
      if (ring === 0) indices.push(start, b, a);
      else {
        const priorA = a - ECOLOGY_PATCH_SECTORS, priorB = b - ECOLOGY_PATCH_SECTORS;
        indices.push(priorA, priorB, a, priorB, b, a);
      }
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('lifeRadius', new THREE.BufferAttribute(radius, 1));
  geometry.setAttribute('lifePatch', new THREE.BufferAttribute(patch, 2));
  geometry.setAttribute('lifeCoverage', new THREE.BufferAttribute(new Float32Array(vertices), 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(indices); return geometry;
}

/** A low, slightly asymmetric ribbed limpet shell over its attached soft foot.
 * Vertex colour separates shell, growth rim and foot; there is no round ball,
 * floating tube or dependency on a particular species' measured proportions. */
function limpetGeometry() {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const sectors = 28, rings = 7;
  const foot = new THREE.Color('#55574d'), shell = new THREE.Color('#8e8877'), dark = new THREE.Color('#635f50');
  for (let ring = 0; ring <= rings; ring++) for (let sector = 0; sector < sectors; sector++) {
    const a = sector / sectors * Math.PI * 2, t = ring / rings, r = 1 - t;
    const rib = 1 + Math.sin(a * 13 + .20 * Math.sin(a * 3)) * .014 * Math.sin(t * Math.PI);
    positions.push(Math.cos(a) * r * .63 * rib - t * .12,
      .035 + .34 * Math.pow(t, .81) + Math.sin(a * 13) * .006 * Math.sin(t * Math.PI),
      Math.sin(a) * r * .96 * rib - t * .19);
    const band = .5 + .5 * Math.sin(t * 44 + a * .31), c = shell.clone().lerp(dark, band * .13 + (sector % 7 === 0 ? .08 : 0));
    colors.push(c.r, c.g, c.b);
    if (ring < rings) {
      const i = ring * sectors + sector, next = ring * sectors + (sector + 1) % sectors;
      indices.push(i, next + sectors, next, i, i + sectors, next + sectors);
    }
  }
  const base = positions.length / 3;
  positions.push(0, .006, 0); colors.push(foot.r, foot.g, foot.b);
  for (let sector = 0; sector < sectors; sector++) {
    const a = sector / sectors * Math.PI * 2, i = base + 1 + sector, next = base + 1 + (sector + 1) % sectors;
    positions.push(Math.cos(a) * .675, .018 + .009 * Math.sin(a * 3), Math.sin(a) * 1.015);
    colors.push(foot.r, foot.g, foot.b); indices.push(base, next, i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices);
  geometry.computeVertexNormals(); return geometry;
}

/** Two opposite cotyledons and two unequal, higher true leaves on one fine
 * upright stem. Separate nodes and leaf sizes avoid a fourfold ground rosette.
 * The small joined plant owns no independent wind or dispersal animation. */
function seedlingGeometry() {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const blade = new THREE.Color('#6f8450'), light = new THREE.Color('#9aa56b'), stem = new THREE.Color('#52633b');
  const steps = 9, widths = 4;
  const leaves = [
    { angle: .18, length: .72, width: .25, node: .44, rise: .13 },
    { angle: Math.PI + .11, length: .66, width: .23, node: .47, rise: .16 },
    { angle: 1.47, length: .50, width: .23, node: .73, rise: .25 },
    { angle: 4.30, length: .29, width: .15, node: .86, rise: .19 },
  ];
  const stemAt = (height: number) => [.025 * Math.sin(height * 1.7), height, .016 * Math.sin(height * 2.4)];
  for (let leaf = 0; leaf < leaves.length; leaf++) {
    const { angle, length, width: span, node, rise } = leaves[leaf], origin = stemAt(node);
    const offset = positions.length / 3;
    for (let along = 0; along <= steps; along++) for (let across = 0; across <= widths; across++) {
      const t = along / steps, v = across / widths * 2 - 1;
      const width = Math.pow(Math.sin(Math.PI * t), .83) * span * (.06 + .94 * THREE.MathUtils.smoothstep(t, .14, .38));
      const forward = t * length, side = v * width;
      const y = node + Math.sin(t * Math.PI * .79) * rise - v * v * .028 * Math.sin(t * Math.PI)
        + Math.sin(t * Math.PI) * v * .017 * (leaf % 2 ? 1 : -1);
      positions.push(origin[0] + Math.cos(angle) * forward - Math.sin(angle) * side, y,
        origin[2] + Math.sin(angle) * forward + Math.cos(angle) * side);
      const c = blade.clone().lerp(light, (across === widths / 2 ? .45 : .04) + t * .08 + (leaf < 2 ? .08 : 0));
      colors.push(c.r, c.g, c.b);
      if (along < steps && across < widths) {
        const i = offset + along * (widths + 1) + across;
        indices.push(i, i + widths + 1, i + 1, i + 1, i + widths + 1, i + widths + 2);
      }
    }
  }
  // The stem begins at the draped soil contact and passes through every node.
  const base = positions.length / 3, stemRings = 6;
  for (let ring = 0; ring <= stemRings; ring++) for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, height = ring / stemRings * .91, center = stemAt(height);
    const radius = .015 - ring / stemRings * .006;
    positions.push(center[0] + Math.cos(a) * radius, height, center[2] + Math.sin(a) * radius); colors.push(stem.r, stem.g, stem.b);
    if (ring < stemRings) {
      const at = base + ring * 6 + i, next = base + ring * 6 + (i + 1) % 6;
      indices.push(at, next, at + 6, next, next + 6, at + 6);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices);
  geometry.computeVertexNormals(); return geometry;
}

/** Four retained draw objects, four geometries and four materials. All changes
 * consume supplied geological progress; borrowed noise/uniforms outlive this
 * owner. No animation callbacks, textures, lights or growing resource lists. */
export class OceanEcology3D {
  readonly group = new THREE.Group();
  private sample = oceanEcology(oceanGeometryFrame(.08, 'deep', 'sustained'));
  get state() { return this.sample; }
  private film: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private soil: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private animals: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private seedlings: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private dummy = new THREE.Object3D();
  private up = new THREE.Vector3(0, 1, 0);
  private normal = new THREE.Vector3();
  private color = new THREE.Color();
  private filmShade = new THREE.Color('#5e6256');
  private cutaway?: THREE.Plane;
  private lastKey = '';
  private disposed = false;

  constructor(noise: THREE.Data3DTexture, ocean: OceanUniforms) {
    this.film = new THREE.Mesh(patchGeometry(MARINE_ECOLOGY_SITES), lifeMaterial(noise, ocean, 'film'));
    this.soil = new THREE.Mesh(patchGeometry(ISLAND_ECOLOGY_SITES), lifeMaterial(noise, ocean, 'soil'));
    this.animals = new THREE.InstancedMesh(limpetGeometry(), lifeMaterial(noise, ocean, 'shell'), MARINE_ECOLOGY_SITES);
    this.seedlings = new THREE.InstancedMesh(seedlingGeometry(), lifeMaterial(noise, ocean, 'seedling'), ISLAND_ECOLOGY_SITES);
    this.film.name = 'ocean-ecology-microbial-films'; this.soil.name = 'ocean-ecology-soil-cracks';
    this.animals.name = 'ocean-ecology-limpets'; this.seedlings.name = 'ocean-ecology-low-seedlings';
    for (const mesh of [this.film, this.soil, this.animals, this.seedlings]) {
      mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = mesh === this.animals || mesh === this.seedlings;
      this.group.add(mesh);
    }
    this.animals.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.seedlings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.animals.count = this.seedlings.count = 0; this.group.visible = false;
  }

  private patches(mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>, sites: OceanEcologySite[], kind: 'film' | 'soil') {
    const geometry = mesh.geometry, position = geometry.getAttribute('position'), color = geometry.getAttribute('color');
    const coverage = geometry.getAttribute('lifeCoverage');
    (coverage.array as Float32Array).fill(0);
    for (const site of sites) {
      this.color.set(kind === 'film' ? '#828375' : '#71573c');
      if (kind === 'film') this.color.lerp(this.filmShade, seed(site.index, 1341) * .75);
      else this.color.multiplyScalar(.83 + seed(site.index, 1352) * .3);
      for (let i = 0; i < ECOLOGY_PATCH_VERTICES; i++) {
        const at = site.index * ECOLOGY_PATCH_VERTICES + i, point = site.patch[i];
        position.setXYZ(at, ...point); color.setXYZ(at, this.color.r, this.color.g, this.color.b); coverage.setX(at, site[kind]);
      }
    }
    position.needsUpdate = color.needsUpdate = coverage.needsUpdate = true;
    geometry.computeVertexNormals(); mesh.visible = sites.some(site => site[kind] > .001);
  }

  draw(frame: OceanGeometryFrame, conditions: OceanEcologyCase = 'bare') {
    if (this.disposed) return;
    const key = `${frame.environment}|${frame.supply}|${frame.p}|${conditions}`;
    if (key === this.lastKey) return; this.lastKey = key;
    this.sample = oceanEcology(frame, conditions); this.group.visible = this.sample.visible;
    this.animals.count = this.seedlings.count = 0;
    if (!this.sample.visible) return;
    const marine = this.sample.sites.filter(s => s.habitat === 'marine'), land = this.sample.sites.filter(s => s.habitat === 'land');
    this.patches(this.film, marine, 'film'); this.patches(this.soil, land, 'soil');
    for (const site of this.sample.sites) {
      const mesh = site.habitat === 'marine' ? this.animals : this.seedlings;
      const amount = site.habitat === 'marine' ? site.animal : site.seedling;
      if (amount <= .001) continue;
      this.dummy.position.set(...(site.habitat === 'marine' ? site.animalPosition : site.position));
      if (site.habitat === 'marine') this.dummy.quaternion.setFromUnitVectors(this.up, this.normal.set(...site.animalNormal));
      else this.dummy.quaternion.identity(); // Shoot gravitropism differs from a limpet's rock attachment.
      this.dummy.rotateY(site.angle);
      const size = site.habitat === 'marine' ? site.animalSize : site.radius * .88;
      this.dummy.scale.setScalar(size * amount); this.dummy.updateMatrix(); mesh.setMatrixAt(mesh.count++, this.dummy.matrix);
    }
    this.animals.instanceMatrix.needsUpdate = this.seedlings.instanceMatrix.needsUpdate = true;
  }

  setCutaway(plane?: THREE.Plane) {
    if (this.disposed || this.cutaway === plane) return; this.cutaway = plane;
    for (const mesh of [this.film, this.soil, this.animals, this.seedlings]) {
      mesh.material.clippingPlanes = plane ? [plane] : []; mesh.material.needsUpdate = true;
    }
  }

  dispose() {
    if (this.disposed) return; this.disposed = true; this.group.visible = false;
    for (const mesh of [this.film, this.soil, this.animals, this.seedlings]) { mesh.geometry.dispose(); mesh.material.dispose(); }
    this.animals.dispose(); this.seedlings.dispose(); this.group.clear();
    this.sample = { ...this.sample, visible: false, film: 0, animal: 0, soil: 0, seedling: 0, sites: [], focus: [0, 0, 0], focusWeight: 0 };
  }
}
