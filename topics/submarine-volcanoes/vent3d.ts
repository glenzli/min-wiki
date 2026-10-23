import * as THREE from 'three';
import { type OceanGeometryFrame, type SolidBuffers } from './geometry3d.ts';
import { OceanPillowFlow3D } from './pillowFlow3d.ts';
import { stoneMaterial, type OceanUniforms } from './materials3d.ts';
import { burstCrust, burstEpisodes, burstFlash, burstShard, BURST_PIECES, submergedOutletCover, updateVentPocket, updateVentPocketDetail, updateVentRim, ventHeat, ventMorphology, ventOrigin, ventPocket, ventPocketDetail, ventRegime, ventRim, type BurstEpisode } from './ventMechanics.ts';

/** Owns only the finite vent reconstruction and its GPU buffers. The scene
 * supplies geology and the already bounded material phase; no timer is owned. */
export class OceanVent3D {
  readonly group = new THREE.Group();
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private pillows: OceanPillowFlow3D;
  private explosive = new THREE.Group();
  private rim: THREE.Mesh;
  private pool: THREE.Mesh;
  private poolDetail = ventPocketDetail();
  private poolHeat: THREE.IUniform<number>;
  private poolCover: THREE.IUniform<number>;
  private poolDirection: THREE.IUniform<THREE.Vector2>;
  private shards: THREE.InstancedMesh[] = [];
  private episodes: BurstEpisode[] = [];
  private episodeKey = '';
  private frame?: OceanGeometryFrame;
  private phase = 0;
  private dummy = new THREE.Object3D();
  private disposed = false;
  readonly state = { mechanism: 'effusive', opening: 0, detached: 0, settled: 0, exposedHeat: 0, remodelling: 0, pillowRetained: 0, pillowAdvancing: 0, pillowFront: [0, 0, 0], pillowDistance: 0, pillowFocus: [0, 0, 0], pillowFocusWeight: 0, pillowDirection: [0, 1] };

  constructor(noise: THREE.Data3DTexture, ocean: OceanUniforms) {
    this.explosive.name = 'ocean-retained-outlet';
    const makeMaterial = (kind: Parameters<typeof stoneMaterial>[2], variation = .5) => {
      const style = stoneMaterial(noise, ocean, kind, variation); this.materials.add(style.material); return style;
    };
    const rind = makeMaterial('pillow', .31).material;
    this.pillows = new OceanPillowFlow3D(noise, ocean); this.group.add(this.pillows.group);
    this.rim = new THREE.Mesh(this.buffer(ventRim()), rind); this.rim.castShadow = this.rim.receiveShadow = true; this.explosive.add(this.rim);
    this.rim.name = 'ocean-reworked-rim';
    const poolMaterial = makeMaterial('extruded', .77); this.poolHeat = poolMaterial.heat;
    this.poolCover = poolMaterial.outletCover; this.poolDirection = poolMaterial.outletDirection;
    const pocket = this.buffer(ventPocket());
    this.pool = new THREE.Mesh(pocket, poolMaterial.material); this.pool.castShadow = false; this.pool.receiveShadow = true; this.explosive.add(this.pool);
    this.pool.name = 'ocean-attached-melt-pocket';
    for (let piece = 0; piece < BURST_PIECES; piece++) {
      const data = this.buffer(burstCrust(piece)), style = makeMaterial('ejecta', .13 + piece * .11); style.heat.value = 1;
      data.setAttribute('oceanHeat', new THREE.InstancedBufferAttribute(new Float32Array(7), 1));
      data.setAttribute('oceanQuench', new THREE.InstancedBufferAttribute(new Float32Array(7), 1));
      const mesh = new THREE.InstancedMesh(data, style.material, 7);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = mesh.receiveShadow = true;
      this.shards.push(mesh); this.group.add(mesh);
    }
    this.group.add(this.explosive);
  }

  private buffer(data: SolidBuffers) {
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    if ('fresh' in data) geometry.setAttribute('oceanFreshFace', new THREE.BufferAttribute(data.fresh as Float32Array, 1));
    if ('skin' in data) geometry.setAttribute('oceanPoolSkin', new THREE.BufferAttribute(data.skin as Float32Array, 1));
    geometry.setIndex(data.indices); geometry.computeVertexNormals();
    this.geometries.add(geometry); return geometry;
  }

  draw(frame: OceanGeometryFrame) {
    if (this.disposed) return;
    this.frame = frame;
    const key = `${frame.environment}|${frame.supply}`;
    if (key !== this.episodeKey) { this.episodeKey = key; this.episodes = burstEpisodes(frame.environment, frame.supply); }
    this.state.mechanism = ventRegime(frame); this.state.detached = this.state.settled = 0;
    this.pillows.draw(frame);
    this.state.pillowRetained = this.pillows.state.retained; this.state.pillowAdvancing = this.pillows.state.advancing;
    this.state.pillowFront = this.pillows.state.front; this.state.pillowDistance = this.pillows.state.distance;
    this.state.pillowFocus = this.pillows.state.focus; this.state.pillowFocusWeight = this.pillows.state.focusWeight;
    this.state.pillowDirection = this.pillows.state.direction;
    // An island retains the same open, reworked rock rim through emergence and
    // the switch to lava overflow. It is not replaced by a round pillow model.
    this.explosive.visible = frame.environment !== 'deep';
    const origin = ventOrigin(frame), morphology = ventMorphology(frame);
    this.poolCover.value = submergedOutletCover(frame);
    this.poolDirection.value.set(Math.cos(morphology.bearing), Math.sin(morphology.bearing));
    this.explosive.position.set(origin[0], origin[1], origin[2]);
    this.state.remodelling = morphology.build;
    if (this.explosive.visible) {
      const vertices = this.rim.geometry.getAttribute('position') as THREE.BufferAttribute;
      updateVentRim(vertices.array as Float32Array, frame, this.episodes); vertices.needsUpdate = true;
      this.rim.geometry.computeVertexNormals(); this.rim.geometry.computeBoundingSphere();
      const melt = this.pool.geometry.getAttribute('position') as THREE.BufferAttribute;
      updateVentPocket(melt.array as Float32Array, frame, this.phase, this.episodes, this.poolDetail);
    }
    for (let piece = 0; piece < this.shards.length; piece++) {
      const mesh = this.shards[piece], heat = mesh.geometry.getAttribute('oceanHeat') as THREE.InstancedBufferAttribute;
      const quench = mesh.geometry.getAttribute('oceanQuench') as THREE.InstancedBufferAttribute;
      mesh.count = this.episodes.length; mesh.visible = this.episodes.length > 0;
      this.episodes.forEach((episode, event) => {
        const shard = burstShard(frame, episode, piece);
        this.dummy.position.set(...shard.position); this.dummy.rotation.set(...shard.rotation, 'XYZ');
        this.dummy.scale.set(...shard.dimensions).multiplyScalar(shard.visible ? 1 : 0); this.dummy.updateMatrix(); mesh.setMatrixAt(event, this.dummy.matrix);
        heat.setX(event, shard.heat); quench.setX(event, shard.quench);
        if (shard.visible && shard.detached) this.state.detached++;
        if (shard.visible && shard.settled) this.state.settled++;
      });
      mesh.instanceMatrix.needsUpdate = true; heat.needsUpdate = quench.needsUpdate = true;
    }
    this.updateDetail(this.phase);
  }

  updateDetail(phase: number) {
    if (this.disposed || !this.frame) return;
    this.phase = phase; this.state.opening = this.state.exposedHeat = 0;
    this.pillows.updateDetail(phase);
    this.state.opening = this.pillows.state.opening; this.state.exposedHeat = this.pillows.state.exposedHeat;
    if (this.explosive.visible) {
      const activity = ventHeat(this.frame), flash = burstFlash(this.frame, this.episodes);
      const positions = this.pool.geometry.getAttribute('position') as THREE.BufferAttribute;
      updateVentPocketDetail(positions.array as Float32Array, phase, this.poolDetail); positions.needsUpdate = true;
      this.pool.geometry.computeVertexNormals(); this.pool.geometry.computeBoundingSphere();
      this.poolHeat.value = activity * (1.15 + flash * .42);
      this.state.opening = 1; this.state.exposedHeat = Math.max(this.state.exposedHeat, activity);
    }
  }

  setCutaway(plane?: THREE.Plane) {
    this.pillows.setCutaway(plane);
    for (const material of this.materials) { material.clippingPlanes = plane ? [plane] : []; material.clipShadows = !!plane; material.needsUpdate = true; }
  }

  dispose() {
    if (this.disposed) return; this.disposed = true;
    this.pillows.dispose();
    this.geometries.forEach(g => g.dispose()); this.materials.forEach(m => m.dispose()); this.shards.forEach(m => m.dispose());
    this.group.clear(); this.frame = undefined; this.episodes = [];
  }
}
