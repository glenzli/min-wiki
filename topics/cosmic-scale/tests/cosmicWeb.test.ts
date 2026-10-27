import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COSMIC_WEB_COMPONENT, COSMIC_WEB_COUNTS, cosmicWebEdge, cosmicWebPopulation, type CosmicWebKind, type CosmicWebPopulation } from '../cosmicWebModel.ts';
import { CosmicWebVolume, COSMIC_WEB_STYLE } from '../cosmicWeb3d.ts';

const kinds: CosmicWebKind[] = ['near', 'middle', 'observable'];
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const deviation = (values: number[]) => { const average = mean(values); return Math.sqrt(mean(values.map(value => (value - average) ** 2))); };
const version = (attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => attribute instanceof THREE.BufferAttribute ? attribute.version : attribute.data.version;
const populations = kinds.map(cosmicWebPopulation);

test('three deterministic populations fit one explicit representative-point and retained-buffer budget', () => {
  assert.ok(Object.values(COSMIC_WEB_COUNTS).reduce((sum, count) => sum + count, 0) <= 90000);
  let payload = 0;
  for (const population of populations) {
    assert.deepEqual(population, cosmicWebPopulation(population.kind));
    assert.equal(population.count, COSMIC_WEB_COUNTS[population.kind]);
    assert.equal(population.positions.length, population.count * 3); assert.equal(population.colors.length, population.positions.length);
    assert.equal(population.sizes.length, population.count); assert.equal(population.opacities.length, population.count);
    assert.ok(population.positions.every(Number.isFinite)); assert.ok(population.colors.every(value => value >= 0 && value <= 1));
    assert.ok(population.sizes.every(value => value >= .5 && value <= 2)); assert.ok(population.opacities.every(value => value >= 0 && value <= .5));
    for (const value of Object.values(population)) if (ArrayBuffer.isView(value)) payload += value.byteLength;
  }
  assert.ok(payload < 3_200_000, `full CPU population payload ${payload}`);
  assert.notDeepEqual(populations[0]!.nodes, populations[1]!.nodes);
});

test('clusters and filaments occupy genuine depth and wide cross-sections rather than a planar net or hairline paths', () => {
  for (const population of populations) {
    for (const component of [COSMIC_WEB_COMPONENT.cluster, COSMIC_WEB_COMPONENT.filament]) for (let axis = 0; axis < 3; axis++) {
      const values: number[] = [];
      for (let i = 0; i < population.count; i++) if (population.components[i] === component) values.push(population.positions[i * 3 + axis]!);
      assert.ok(deviation(values) > .27, `${population.kind} component ${component} axis ${axis} lacks depth`);
    }
    const a = population.links[0]!, b = population.links[1]!, start = [0, 1, 2].map(axis => population.nodes[a * 3 + axis]!), end = [0, 1, 2].map(axis => population.nodes[b * 3 + axis]!);
    const axis = new THREE.Vector3(...end as [number, number, number]).sub(new THREE.Vector3(...start as [number, number, number])).normalize();
    const first = new THREE.Vector3().crossVectors(axis, Math.abs(axis.z) < .8 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)).normalize();
    const second = new THREE.Vector3().crossVectors(axis, first).normalize(), crossA: number[] = [], crossB: number[] = [];
    for (let i = 0; i < population.count; i++) if (population.components[i] === COSMIC_WEB_COMPONENT.filament && population.sources[i] === 0) {
      const relative = new THREE.Vector3().fromArray(population.positions, i * 3).sub(new THREE.Vector3(...start as [number, number, number]));
      crossA.push(relative.dot(first)); crossB.push(relative.dot(second));
    }
    assert.ok(crossA.length > 20); assert.ok(deviation(crossA) > .020); assert.ok(deviation(crossB) > .020);
  }
});

function projectedContrast(population: CosmicWebPopulation, axes: readonly [number, number]) {
  const bins = new Uint32Array(24 * 24);
  for (let i = 0; i < population.count; i++) {
    const x = Math.max(0, Math.min(23, Math.floor((population.positions[i * 3 + axes[0]]! + 1) * 12)));
    const y = Math.max(0, Math.min(23, Math.floor((population.positions[i * 3 + axes[1]]! + 1) * 12))); bins[x + y * 24]++;
  }
  const centre = Array.from(bins).filter((_, i) => Math.hypot((i % 24 + .5) / 12 - 1, (Math.floor(i / 24) + .5) / 12 - 1) < .7).sort((a, b) => a - b);
  return centre[Math.floor(centre.length * .9)]! / Math.max(1, centre[Math.floor(centre.length * .1)]!);
}
test('sparse voids remain nonempty and each full-depth projection retains visible density contrasts', () => {
  for (const population of populations) {
    for (const axes of [[0, 1], [1, 2], [2, 0]] as const) assert.ok(projectedContrast(population, axes) > 3, `${population.kind} projected ${axes} became uniform`);
    let inner = 0, outer = 0, innerVolume = 0, outerVolume = 0;
    for (let v = 0; v < population.voids.length; v += 4) {
      const x = population.voids[v]!, y = population.voids[v + 1]!, z = population.voids[v + 2]!, radius = population.voids[v + 3]!;
      innerVolume += 4 / 3 * Math.PI * (radius * .55) ** 3; outerVolume += 4 / 3 * Math.PI * ((radius * 1.3) ** 3 - (radius * .95) ** 3);
      for (let i = 0; i < population.count; i++) {
        const distance = Math.hypot(population.positions[i * 3]! - x, population.positions[i * 3 + 1]! - y, population.positions[i * 3 + 2]! - z);
        if (distance < radius * .55) inner++; if (distance > radius * .95 && distance < radius * 1.3) outer++;
      }
    }
    assert.ok(inner > 0, 'voids should be sparse, not entirely empty'); assert.ok(inner / innerVolume < outer / outerVolume * .35);
  }
});

test('observable points stay within the volume, with fading edges rather than a shell accumulation', () => {
  for (const population of populations) {
    const inner: number[] = [], edge: number[] = [];
    for (let i = 0; i < population.count; i++) {
      const x = population.positions[i * 3]!, y = population.positions[i * 3 + 1]!, z = population.positions[i * 3 + 2]!;
      const radius = population.kind === 'observable' ? Math.hypot(x, y, z) : Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
      assert.ok(radius < .996, `${population.kind} point escaped its window`);
      if (population.components[i] !== COSMIC_WEB_COMPONENT.void) continue;
      if (radius < .6) inner.push(population.opacities[i]!); if (radius > .92) edge.push(population.opacities[i]!);
    }
    assert.ok(inner.length > 20 && edge.length > 20); assert.ok(mean(inner) > mean(edge) * 4);
    assert.equal(cosmicWebEdge(population.kind, 1, 0, 0), 0); assert.ok(cosmicWebEdge(population.kind, .9, 0, 0) > 0);
  }
});

test('warm cluster cores and cooler dispersed populations retain the restrained galactic palette', () => {
  for (const population of populations) {
    let warm = 0, cool = 0, cluster = 0, filament = 0;
    for (let i = 0; i < population.count; i++) {
      const r = population.colors[i * 3]!, g = population.colors[i * 3 + 1]!, b = population.colors[i * 3 + 2]!;
      if (population.components[i] === COSMIC_WEB_COMPONENT.cluster) { cluster++; if (r > g && g > b) warm++; }
      if (population.components[i] === COSMIC_WEB_COMPONENT.filament) { filament++; if (r < g && g < b) cool++; }
    }
    assert.equal(warm, cluster); assert.ok(cool / filament > .80);
  }
});

test('retained volumes only update bounded uniforms, admit no shells or clocks, and release every owned GPU resource once', () => {
  const volumes = kinds.map(kind => new CosmicWebVolume(kind)); let geometryBytes = 0;
  for (const volume of volumes) {
    assert.equal(volume.root.children.length, 1); const points = volume.root.children[0]! as THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    assert.ok(points instanceof THREE.Points); assert.equal(points.material.depthWrite, false); assert.equal(points.material.depthTest, true);
    assert.ok(!Object.keys(points.material.uniforms).some(name => /time|clock|phase/i.test(name)));
    const arrays = Object.values(points.geometry.attributes).map(attribute => attribute.array), versions = Object.values(points.geometry.attributes).map(version);
    geometryBytes += arrays.reduce((sum, array) => sum + array.byteLength, 0); const original = points.geometry.getAttribute('position').array.slice();
    volume.root.position.set(.2, -.3, .4); volume.root.scale.setScalar(46.5e9);
    for (const radius of [0, .1, 1, 100, 800, 6000, 1e9, -1, NaN, Infinity]) for (const dpr of [1, 2, 8, NaN]) {
      volume.update(radius, dpr, .72);
      assert.ok(points.material.uniforms.pixelScale!.value >= .58 && points.material.uniforms.pixelScale!.value <= 1.65);
      assert.ok(points.material.uniforms.dpr!.value >= .5 && points.material.uniforms.dpr!.value <= 2);
      assert.ok(points.material.uniforms.opacity!.value <= COSMIC_WEB_STYLE.brightness);
    }
    assert.deepEqual(Object.values(points.geometry.attributes).map(attribute => attribute.array), arrays); assert.deepEqual(Object.values(points.geometry.attributes).map(version), versions);
    assert.deepEqual(points.geometry.getAttribute('position').array, original); assert.equal(volume.root.scale.x, 46.5e9); assert.deepEqual(volume.root.position.toArray(), [.2, -.3, .4]);
    volume.update(400, 2, 1); assert.equal(volume.root.visible, true); volume.update(400, 2, -1); assert.equal(volume.root.visible, false);
    volume.update(400, 2, NaN); assert.equal(volume.root.visible, false);
    let geometryDisposals = 0, materialDisposals = 0;
    points.geometry.addEventListener('dispose', () => geometryDisposals++); points.material.addEventListener('dispose', () => materialDisposals++);
    volume.dispose(); volume.dispose(); volume.update(400, 2, 1);
    assert.equal(geometryDisposals, 1); assert.equal(materialDisposals, 1); assert.equal(volume.root.children.length, 0); assert.equal(volume.root.visible, false);
  }
  assert.ok(geometryBytes <= 2_800_000, `GPU attribute payload ${geometryBytes}`);
});
