import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWoodShape, createPebbleShape, createMetalShape, createClayShape } from '../specimenGeometry.ts';
import { createSpecimenMaterials } from '../specimenMaterials.ts';

const factories = [createWoodShape, createPebbleShape, createMetalShape, createClayShape];

function triangles(geometry, visit) {
  const p = geometry.getAttribute('position'), index = geometry.index;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const count = index ? index.count : p.count;
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(p, index ? index.getX(i) : i);
    b.fromBufferAttribute(p, index ? index.getX(i + 1) : i + 1);
    c.fromBufferAttribute(p, index ? index.getX(i + 2) : i + 2);
    visit(a, b, c);
  }
}

test('specimens retain deterministic unit bounds and finite, nondegenerate surfaces within the mesh budget', () => {
  for (const make of factories) {
    const geometry = make(), again = make(), positions = geometry.getAttribute('position');
    assert.ok(positions.count <= 15000, make.name);
    assert.deepEqual(positions.array, again.getAttribute('position').array, make.name);
    for (const axis of ['x', 'y', 'z']) {
      assert.ok(Math.abs(geometry.boundingBox.min[axis] + .5) < 1e-6, `${make.name} ${axis} min`);
      assert.ok(Math.abs(geometry.boundingBox.max[axis] - .5) < 1e-6, `${make.name} ${axis} max`);
    }
    for (const attribute of ['position', 'normal', 'uv']) {
      for (const value of geometry.getAttribute(attribute).array) assert.ok(Number.isFinite(value), `${make.name} ${attribute}`);
    }
    const ab = new THREE.Vector3(), ac = new THREE.Vector3();
    let volume = 0;
    triangles(geometry, (a, b, c) => {
      assert.ok(ab.subVectors(b, a).cross(ac.subVectors(c, a)).lengthSq() > 1e-16, `${make.name} triangle area`);
      volume += a.dot(ab.copy(b).cross(c)) / 6;
    });
    assert.ok(volume > .1 && volume < 1, `${make.name} outward winding`);
    geometry.dispose(); again.dispose();
  }
});

test('every surface edge has two oppositely oriented incident faces, including cap and shading seams', () => {
  const key = p => [p.x, p.y, p.z].map(v => Math.round(v * 1e6)).join(',');
  for (const make of factories) {
    const geometry = make(), edges = new Map();
    triangles(geometry, (a, b, c) => {
      const points = [key(a), key(b), key(c)];
      for (let j = 0; j < 3; j++) {
        const from = points[j], to = points[(j + 1) % 3];
        const edge = from < to ? `${from}|${to}` : `${to}|${from}`;
        const previous = edges.get(edge) ?? { count: 0, direction: 0 };
        previous.count++;
        previous.direction += from < to ? 1 : -1;
        edges.set(edge, previous);
      }
    });
    for (const edge of edges.values()) {
      assert.equal(edge.count, 2, `${make.name} closed edge`);
      assert.equal(edge.direction, 0, `${make.name} consistent winding`);
    }
    geometry.dispose();
  }
});

test('the steel nut has a real through bore and a solid annular top', () => {
  const geometry = createMetalShape(), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const object = new THREE.Mesh(geometry, material);
  object.updateMatrixWorld();
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, -1, 0));
  assert.equal(ray.intersectObject(object).length, 0, 'the axial ray passes right through the hole');
  ray.ray.origin.x = .38;
  const hits = ray.intersectObject(object);
  assert.ok(hits.length >= 2, 'a ray beside the bore crosses both solid faces');
  assert.ok(hits[0].point.y > .45, 'the top annulus is solid');
  geometry.dispose(); material.dispose();
});

test('natural finishes retain caller-owned water state, photographed split wood and clay continuity', () => {
  const water = { value: 2.1 }, set = createSpecimenMaterials(water);
  const shaders = new Map();
  for (const material of set.materials) {
    const source = THREE.ShaderLib[material.isMeshPhysicalMaterial ? 'physical' : 'standard'];
    const shader = { vertexShader: source.vertexShader, fragmentShader: source.fragmentShader, uniforms: {} };
    material.onBeforeCompile(shader, {});
    assert.equal(shader.uniforms.specimenWaterLevel, water);
    assert.equal(shader.uniforms.specimenGrain.value, set.textures[0]);
    assert.ok(shader.vertexShader.includes('vSpecimenHeight = (modelMatrix * vec4(transformed, 1.)).y'));
    assert.ok(shader.fragmentShader.includes('float specimenWet = 1. - smoothstep'));
    assert.ok(!shader.fragmentShader.includes('undefined'));
    shaders.set(material.name, shader.fragmentShader);
  }
  const wood = shaders.get('buoyancy-wood');
  assert.ok(wood.includes('float fissure ='));
  assert.ok(wood.includes('float split ='));
  assert.ok(wood.includes('if (specimenWoodReady > .5)'));
  assert.ok(!wood.includes('if (specimenWoodReady < .5)'), 'photographs supplement rather than replace bark/end grain');
  const clay = shaders.get('buoyancy-clay'), hull = shaders.get('buoyancy-hull');
  const earth = shader => shader.match(/vec3 earth = [^;]+;/)[0];
  assert.equal(earth(clay), earth(hull));
  for (const material of set.materials) material.dispose();
  for (const texture of set.textures) texture.dispose();
});
