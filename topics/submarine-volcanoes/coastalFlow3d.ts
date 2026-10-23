import * as THREE from 'three';
import { APRON_COLUMNS, APRON_ROWS, coastalApronPoint, COASTAL_PIECES, coastalParcels, coastalPiece, islandFlowBuffers, islandFlows, updateIslandFlow } from './coastalFlow.ts';
import { type OceanGeometryFrame, type PlumeVolume } from './geometry3d.ts';
import { stoneMaterial, type OceanUniforms } from './materials3d.ts';

/** Retained channel skins and chilled coastal fragments share the supplied
 * accretion frame. No local animation clock, allocating trail or extra geology. */
export class OceanCoastalFlow3D {
  readonly group = new THREE.Group();
  private channels: { mesh: THREE.Mesh; data: ReturnType<typeof islandFlowBuffers>; heat: THREE.IUniform<number>; length: THREE.IUniform<number>; feed: THREE.IUniform<number>; key: string }[] = [];
  private aprons: { mesh: THREE.Mesh; unit: number; key: string }[] = [];
  private pieces: THREE.InstancedMesh;
  private cooled: THREE.Material;
  private dummy = new THREE.Object3D();
  private disposed = false;
  readonly state = { exposedHeat: 0, contacts: 0, retained: 0, fragments: 0, contact: [] as number[], parcels: [] as PlumeVolume[] };

  constructor(noise: THREE.Data3DTexture, ocean: OceanUniforms, rock: THREE.Material) {
    this.cooled = stoneMaterial(noise, ocean, 'pillow', .93).material;
    for (let index = 0; index < 24; index++) {
      if (index >= 14 && index < 19) continue;
      const data = islandFlowBuffers(), geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2)); geometry.setIndex(data.indices);
      geometry.setAttribute('oceanSource', new THREE.BufferAttribute(data.source, 3));
      geometry.setAttribute('oceanQuench', new THREE.BufferAttribute(data.quench, 1));
      geometry.setAttribute('oceanDistance', new THREE.BufferAttribute(data.distance, 1));
      geometry.setAttribute('oceanFlowStage', new THREE.BufferAttribute(data.stage, 1));
      const style = stoneMaterial(noise, ocean, 'flow', .23 + index * .027), mesh = new THREE.Mesh(geometry, style.material);
      mesh.castShadow = false; mesh.receiveShadow = true; mesh.userData.unit = index;
      this.group.add(mesh); this.channels.push({ mesh, data, heat: style.heat, length: style.flowLength, feed: style.flowFeed, key: '' });
    }
    for (let unit = 19; unit < 24; unit++) {
      const geometry = new THREE.BufferGeometry(), count = (APRON_ROWS + 1) * (APRON_COLUMNS + 1), indices: number[] = [];
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3));
      const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, c, a, c, d);
      for (let row = 0; row < APRON_ROWS; row++) for (let col = 0; col < APRON_COLUMNS; col++) {
        const a = row * (APRON_COLUMNS + 1) + col, b = a + 1, d = a + APRON_COLUMNS + 1, c = d + 1;
        quad(a, d, c, b); quad(a + count, b + count, c + count, d + count);
      }
      for (let col = 0; col < APRON_COLUMNS; col++) {
        const a = col, b = a + 1, c = APRON_ROWS * (APRON_COLUMNS + 1) + col, d = c + 1;
        quad(a, b, b + count, a + count); quad(c, c + count, d + count, d);
      }
      for (let row = 0; row < APRON_ROWS; row++) {
        const a = row * (APRON_COLUMNS + 1), b = a + APRON_COLUMNS + 1, c = a + APRON_COLUMNS, d = b + APRON_COLUMNS;
        quad(a, a + count, b + count, b); quad(c, d, d + count, c + count);
      }
      for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
      geometry.setIndex(indices); const mesh = new THREE.Mesh(geometry, this.cooled);
      mesh.castShadow = false; mesh.receiveShadow = true; this.group.add(mesh); this.aprons.push({ mesh, unit, key: '' });
    }
    this.pieces = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), rock, COASTAL_PIECES);
    this.pieces.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.pieces.frustumCulled = false;
    this.pieces.castShadow = this.pieces.receiveShadow = true; this.group.add(this.pieces);
  }

  draw(frame: OceanGeometryFrame) {
    if (this.disposed) return;
    const flows = islandFlows(frame);
    this.group.visible = frame.environment === 'island'; this.state.contacts = this.state.fragments = this.state.exposedHeat = 0;
    this.state.retained = flows.length; this.state.contact = [];
    for (const channel of this.channels) {
      const flow = flows.find(f => f.unit.index === channel.mesh.userData.unit);
      channel.mesh.visible = !!flow; channel.heat.value = flow?.heat ?? 0;
      channel.feed.value = flow?.feed ?? 0;
      if (!flow) continue;
      channel.length.value = flow.front;
      this.state.exposedHeat = Math.max(this.state.exposedHeat, flow.heat);
      if (flow.entry) { this.state.contacts++; this.state.contact.push(...flow.entry.point); }
      const key = `${frame.supply}|${flow.unit.growth}|${flow.unit.growth < 1 ? frame.p : frame.history.erosion}|${flow.quench.at(-1)}`;
      if (key === channel.key) continue;
      channel.key = key; updateIslandFlow(channel.data, flow, frame);
      for (const attribute of ['position', 'oceanQuench', 'oceanDistance', 'oceanFlowStage']) channel.mesh.geometry.getAttribute(attribute).needsUpdate = true;
      channel.mesh.geometry.computeVertexNormals(); channel.mesh.geometry.computeBoundingSphere();
    }
    for (const apron of this.aprons) {
      const flow = flows.find(f => f.unit.index === apron.unit);
      apron.mesh.visible = !!flow?.route.crossing && flow.front > flow.route.crossing.distance + .01;
      if (!flow || !apron.mesh.visible) continue;
      const key = `${frame.supply}|${flow.unit.growth}|${flow.unit.growth < 1 ? frame.p : frame.history.erosion}`;
      if (apron.key === key) continue;
      apron.key = key; const vertices = apron.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      let index = 0;
      for (let side = 0; side < 2; side++) for (let row = 0; row <= APRON_ROWS; row++) for (let col = 0; col <= APRON_COLUMNS; col++) {
        vertices.setXYZ(index++, ...coastalApronPoint(frame, flow, row, col, !!side));
      }
      vertices.needsUpdate = true; apron.mesh.geometry.computeVertexNormals(); apron.mesh.geometry.computeBoundingSphere();
    }
    for (let i = 0; i < COASTAL_PIECES; i++) {
      const piece = coastalPiece(flows, i);
      this.dummy.position.set(...piece.position); this.dummy.rotation.set(...piece.rotation, 'XYZ');
      this.dummy.scale.set(piece.scale * 1.4, piece.scale * .75, piece.scale); this.dummy.updateMatrix(); this.pieces.setMatrixAt(i, this.dummy.matrix);
      if (piece.visible) this.state.fragments++;
    }
    this.pieces.instanceMatrix.needsUpdate = true;
    this.state.parcels = coastalParcels(frame, flows);
  }

  setCutaway(plane?: THREE.Plane) {
    for (const { mesh } of this.channels) {
      const material = mesh.material as THREE.Material; material.clippingPlanes = plane ? [plane] : []; material.clipShadows = !!plane; material.needsUpdate = true;
    }
    this.cooled.clippingPlanes = plane ? [plane] : []; this.cooled.clipShadows = !!plane; this.cooled.needsUpdate = true;
  }

  dispose() {
    if (this.disposed) return; this.disposed = true;
    for (const { mesh } of this.channels) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }
    for (const { mesh } of this.aprons) mesh.geometry.dispose();
    this.cooled.dispose();
    this.pieces.geometry.dispose(); this.pieces.dispose(); this.group.clear();
  }
}
