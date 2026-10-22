import * as THREE from 'three';
import { type OceanGeometryFrame, type SolidBuffers, type XYZ } from './geometry3d.ts';
import { pillowFlow, pillowFlowBuffers, updatePillowFlow } from './pillowFlow.ts';
import { extrusionRind, extrusionState, LIP_PIECES } from './ventMechanics.ts';
import { stoneMaterial, type OceanUniforms } from './materials3d.ts';

/** Owns the finite deep extrusion surfaces and their source collars. It borrows
 * the scene's phase/noise, never owns a process or animation timer. */
export class OceanPillowFlow3D {
  readonly group = new THREE.Group();
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private bodies: { mesh: THREE.Mesh; collar: THREE.Group; lips: THREE.Mesh[];
    data: ReturnType<typeof pillowFlowBuffers>; heat: THREE.IUniform<number>; length: THREE.IUniform<number>; front: THREE.IUniform<number>; feed: THREE.IUniform<number>;
    growth: number; crust: number; coreHeat: number; key: number }[] = [];
  private phase = 0;
  private disposed = false;
  private axis = new THREE.Vector3();
  readonly state = { opening: 0, exposedHeat: 0, retained: 0, advancing: 0, front: [0, 0, 0] as XYZ, distance: 0,
    focus: [0, 0, 0] as XYZ, focusWeight: 0, direction: [0, 1] as [number, number] };

  constructor(noise: THREE.Data3DTexture, ocean: OceanUniforms) {
    const rind = stoneMaterial(noise, ocean, 'pillow', .31).material; this.materials.add(rind);
    const sleeves = Array.from({ length: 4 }, (_, variant) => this.buffer(extrusionRind(variant)));
    const lips = Array.from({ length: 4 }, (_, variant) => Array.from({ length: LIP_PIECES }, (_, piece) => {
      const shape = extrusionRind(variant, piece); return { geometry: this.buffer(shape), pivot: shape.pivot, angle: shape.angle };
    }));
    for (let i = 0; i < 14; i++) {
      const data = pillowFlowBuffers(), geometry = this.buffer(data);
      geometry.setAttribute('oceanQuench', new THREE.BufferAttribute(data.crust, 1));
      geometry.setAttribute('oceanDistance', new THREE.BufferAttribute(data.distance, 1));
      const style = stoneMaterial(noise, ocean, 'pillow-flow', .19 + i * .041); this.materials.add(style.material);
      const mesh = new THREE.Mesh(geometry, style.material), collar = new THREE.Group();
      mesh.visible = collar.visible = false;
      mesh.name = `ocean-extrusion-${i}`; mesh.castShadow = false; mesh.receiveShadow = true;
      const sleeve = new THREE.Mesh(sleeves[i % 4], rind); sleeve.castShadow = sleeve.receiveShadow = true;
      const pieces = lips[i % 4].map(shape => {
        const piece = new THREE.Mesh(shape.geometry, rind); piece.position.set(...shape.pivot); piece.userData.angle = shape.angle;
        piece.castShadow = piece.receiveShadow = true; return piece;
      });
      collar.add(sleeve, ...pieces); collar.scale.set(.18, .18, .21);
      this.group.add(mesh, collar);
      this.bodies.push({ mesh, collar, lips: pieces, data, heat: style.heat, length: style.flowLength, front: style.flowFront, feed: style.flowFeed,
        growth: 0, crust: 0, coreHeat: 0, key: -1 });
    }
  }

  private buffer(data: SolidBuffers) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2)); geometry.setIndex(data.indices);
    geometry.computeVertexNormals(); this.geometries.add(geometry); return geometry;
  }

  draw(frame: OceanGeometryFrame) {
    if (this.disposed) return;
    this.group.visible = frame.environment === 'deep'; this.state.retained = this.state.advancing = 0; this.state.distance = 0; this.state.front = [0, 0, 0];
    this.state.focus = [0, 0, 0]; this.state.focusWeight = 0;
    this.state.direction = [0, 0];
    if (!this.group.visible) { this.state.opening = this.state.exposedHeat = 0; return; }
    let dominant = 0;
    this.bodies.forEach((body, i) => {
      const flow = pillowFlow(frame, i), visible = flow.growth > .0001;
      body.mesh.visible = body.collar.visible = visible;
      body.growth = flow.growth; body.crust = flow.crust; body.coreHeat = flow.coreHeat;
      if (!visible) return;
      this.state.retained++; if (flow.growth < 1) this.state.advancing++;
      const activity = Math.sin(flow.growth * Math.PI) * flow.coreHeat;
      const weight = activity * activity;
      this.state.focusWeight += weight;
      for (let axis = 0; axis < 3; axis++) this.state.focus[axis] += (flow.source[axis] * .52 + flow.front[axis] * .48) * weight;
      const dx = flow.front[0] - flow.source[0], dz = flow.front[2] - flow.source[2], directionLength = Math.hypot(dx, dz) || 1;
      this.state.direction[0] += dx / directionLength * weight; this.state.direction[1] += dz / directionLength * weight;
      if (activity > Math.max(.001, dominant)) { dominant = activity; this.state.front = flow.front; this.state.distance = flow.distance; }
      const key = Math.min(frame.p, .06 + i * .043 + .09), changed = key !== body.key;
      updatePillowFlow(body.data, flow, changed); body.key = key;
      if (changed) {
        for (const name of ['position', 'uv', 'oceanDistance']) body.mesh.geometry.getAttribute(name).needsUpdate = true;
        body.mesh.geometry.computeVertexNormals(); body.mesh.geometry.computeBoundingSphere();
      }
      body.mesh.geometry.getAttribute('oceanQuench').needsUpdate = true;
      body.length.value = flow.length; body.front.value = flow.distance; body.feed.value = flow.feed;
      body.collar.position.set(flow.source[0], flow.source[1] + .055, flow.source[2]);
      body.collar.rotation.set(0, -flow.heading, flow.pitch, 'YXZ');
    });
    if (this.state.focusWeight > 1e-8) this.state.focus = this.state.focus.map(n => n / this.state.focusWeight) as XYZ;
    const directionLength = Math.hypot(...this.state.direction);
    this.state.direction = directionLength > 1e-8 ? this.state.direction.map(n => n / directionLength) as [number, number] : [0, 1];
    this.updateDetail(this.phase);
  }

  updateDetail(phase: number) {
    if (this.disposed) return;
    this.phase = phase; this.state.opening = this.state.exposedHeat = 0;
    if (!this.group.visible) return;
    this.bodies.forEach((body, i) => {
      if (!body.mesh.visible) return;
      const state = extrusionState(body.growth, body.crust, body.coreHeat, phase, i % 4);
      body.heat.value = body.coreHeat * 1.15;
      body.lips.forEach((lip, piece) => {
        const angle = lip.userData.angle as number;
        this.axis.set(0, -Math.sin(angle), Math.cos(angle));
        lip.quaternion.setFromAxisAngle(this.axis, (state.opening * (.26 + piece * .029) + state.flex) * (.35 + .65 * Math.max(0, Math.cos(angle))));
      });
      this.state.opening = Math.max(this.state.opening, state.opening);
      this.state.exposedHeat = Math.max(this.state.exposedHeat, state.hot);
    });
  }

  setCutaway(plane?: THREE.Plane) {
    for (const material of this.materials) { material.clippingPlanes = plane ? [plane] : []; material.clipShadows = !!plane; material.needsUpdate = true; }
  }

  dispose() {
    if (this.disposed) return; this.disposed = true;
    this.geometries.forEach(g => g.dispose()); this.materials.forEach(m => m.dispose()); this.group.clear();
  }
}
