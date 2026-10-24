import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  ENVIRONMENT_LIMITS, TREE_MIN_RADIUS, TREE_RADIUS_RATIO, buildingCorners, environmentClearance,
  environmentGroundBuffers, environmentGroundHeight, environmentLayout, environmentRoadBuffers, woodlandFloorBuffers,
} from '../eruptionEnvironment.ts';
import { EruptionEnvironment3D } from '../eruptionEnvironment3d.ts';
import { Eruption3DScene } from '../eruption3d.ts';
import { fragmentSchedule, lavaBranches, lavaRibbon, ROCK_RADIUS, terrainBuffers, WORLD_SCALE } from '../eruptionGeometry.ts';
import { scenarioSettings } from '../eruptionScenarios.ts';
import { STORAGE } from '../magmaGeometry.ts';

const kinds = ['shield', 'composite', 'scoria'];
const layouts = new Map(kinds.map(kind => [kind, environmentLayout(kind)]));
const cutPlane = () => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

function checkBuffers(data) {
  const count = data.positions.length / 3;
  assert.ok(count > 0 && data.positions.every(Number.isFinite));
  assert.equal(data.uvs.length, count * 2);
  assert.ok(data.uvs.every(Number.isFinite));
  assert.ok(data.indices.every(index => Number.isInteger(index) && index >= 0 && index < count));
  if (data.colours) { assert.equal(data.colours.length, count * 4); assert.ok(data.colours.every(Number.isFinite)); }
}

test('older land context has stable independent sites per landform and bounded irregular groves', () => {
  for (const kind of kinds) {
    const layout = layouts.get(kind), again = environmentLayout(kind);
    assert.deepEqual(layout, again);
    assert.notEqual(layout.trees, again.trees);
    assert.ok(layout.trees.length > 200 && layout.trees.length <= ENVIRONMENT_LIMITS.trees);
    assert.ok(new Set(layout.trees.map(site => site.patch)).size >= 8);
    assert.equal(new Set(layout.trees.map(site => site.id)).size, layout.trees.length);
    assert.equal(new Set(layout.trees.map(site => site.variant)).size, ENVIRONMENT_LIMITS.treeVariants);
    assert.ok(Math.max(...layout.trees.map(site => site.height)) - Math.min(...layout.trees.map(site => site.height)) > .25);
    assert.ok(layout.trees.some(site => site.position[2] > 0) && layout.trees.some(site => site.position[2] < 0));
    for (const tree of layout.trees) {
      assert.equal(tree.position[1], environmentGroundHeight(tree.position[0], tree.position[2], kind));
      assert.ok(environmentClearance(tree.position[0], tree.position[2], tree.radius));
      assert.equal(tree.radius, tree.height * TREE_RADIUS_RATIO);
    }
    again.trees[0].position[0] += 1;
    assert.notDeepEqual(layout.trees[0], again.trees[0], 'each retained scene receives its own mutable layout');
  }
  assert.notDeepEqual(layouts.get('shield').trees, layouts.get('scoria').trees);
});

test('outer ground meets every original terrain edge and tangent rather than assuming a flat shield rim', () => {
  for (const kind of kinds) {
    const ground = environmentGroundBuffers(kind), terrain = terrainBuffers(kind);
    checkBuffers(ground);
    const count = ENVIRONMENT_LIMITS.groundSectors + 1, start = terrain.positions.length - count * 3;
    for (let j = 0; j < count; j++) for (let axis = 0; axis < 3; axis++) {
      assert.ok(Math.abs(ground.positions[j * 3 + axis] - terrain.positions[start + j * 3 + axis]) < 1e-10, `${kind} shares the actual edge vertices`);
    }
    for (let j = 0; j <= 40; j++) {
      const angle = j / 40 * Math.PI * 2, point = r => environmentGroundHeight(Math.cos(angle) * r, Math.sin(angle) * r, kind);
      const delta = .001, before = (point(ROCK_RADIUS) - point(ROCK_RADIUS - delta)) / delta;
      const after = (point(ROCK_RADIUS + delta) - point(ROCK_RADIUS)) / delta;
      assert.ok(Math.abs(before - after) < .001, 'no step or changed tangent at the apron contact');
      assert.equal(point(ENVIRONMENT_LIMITS.outerRadius), -.09);
    }
    assert.ok(ground.colours.filter((_, i) => i % 4 === 3).slice(0, count).every(alpha => alpha === 0), 'basalt shading is preserved at the inner seam');
  }
});

test('roads, woodland floor and foundations consume the same ground, including the join', () => {
  for (const [kind, layout] of layouts) {
    for (const [width, lift] of [[.18, .008], [.32, .004]]) {
      const road = environmentRoadBuffers(layout, width, lift); checkBuffers(road);
      for (let i = 0; i < road.positions.length; i += 3) {
        const [x, y, z] = road.positions.slice(i, i + 3);
        assert.ok(Math.abs(y - environmentGroundHeight(x, z, kind) - lift) < 1e-10);
      }
    }
    const litter = woodlandFloorBuffers(layout); checkBuffers(litter);
    for (let i = 0; i < litter.positions.length; i += 3) {
      const [x, y, z] = litter.positions.slice(i, i + 3);
      assert.ok(Math.abs(y - environmentGroundHeight(x, z, kind) - .005) < 1e-10);
    }
    for (const site of layout.buildings) {
      assert.ok(environmentClearance(site.position[0], site.position[2], Math.hypot(site.width, site.depth) / 2));
      for (const [x, z] of buildingCorners(site)) {
        const y = environmentGroundHeight(x, z, kind);
        assert.ok(site.foundationBottom < y && site.foundationTop > y, 'closed foundation intersects every footprint corner');
      }
      assert.ok(site.foundationTop - site.foundationBottom < .12, 'modest grounded plinth rather than a floating high platform');
    }
    const end = layout.road.at(-1);
    assert.ok(Math.hypot(end[0] - layout.pad.x, end[2] - layout.pad.z) < .4, 'access road enters the service ground');
  }
});

test('static decorative clearance reserves every supported lava configuration and the representative impacts', () => {
  let farthestLava = 0;
  for (const vents of [1, 3]) for (const gas of [0, .5, 1]) for (const viscosity of [0, .16, .5, .88, 1]) for (const supply of [0, .65, 1]) {
    const settings = { vents, gas, viscosity, supply, strength: 1, landform: 'scoria' };
    for (const branch of lavaBranches(settings)) {
      const flow = lavaRibbon(1, settings, branch);
      for (let i = 0; i < flow.positions.length; i += 3) {
        const x = flow.positions[i], z = flow.positions[i + 2];
        farthestLava = Math.max(farthestLava, Math.hypot(x, z));
        assert.equal(environmentClearance(x, z), false, 'all possible visible lava remains inside the reserved area');
      }
    }
  }
  assert.ok(farthestLava < TREE_MIN_RADIUS - .1);
  for (const [kind, layout] of layouts) {
    let farthestClast = 0;
    for (const vents of [1, 3]) for (const viscosity of [0, .25, .5, .75, 1]) {
      for (const fragment of fragmentSchedule({ vents, gas: 1, viscosity, supply: 1, strength: 1, landform: kind })) {
        farthestClast = Math.max(farthestClast, Math.hypot(fragment.x + fragment.dx * fragment.trajectory.impactX * WORLD_SCALE,
          fragment.dz * fragment.trajectory.impactX * WORLD_SCALE) + fragment.radius);
      }
    }
    for (const tree of layout.trees) assert.ok(Math.hypot(tree.position[0], tree.position[2]) - tree.radius > Math.max(farthestLava, farthestClast) + .1);
  }
});

function sceneGeometry(data) {
  const shape = new THREE.BufferGeometry(); shape.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3)); shape.setIndex(data.indices);
  return new THREE.Mesh(shape, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
}
function productionCamera(kind, view, width, height) {
  const scene = Object.create(Eruption3DScene.prototype), camera = new THREE.PerspectiveCamera(38, width / height, .1, 200);
  scene.camera = camera; scene.settings = scenarioSettings('gentle-flow', { landform: kind }); scene.cutaway = view === 'overview'; scene.view = view;
  scene.cancelCamera = () => {}; scene.render = () => {};
  scene.controls = { target: new THREE.Vector3(), update() { camera.lookAt(this.target); camera.updateMatrixWorld(); } };
  scene.moveCamera(false); return camera;
}
function visibleFrom(point, camera, meshes, section) {
  const distance = point.distanceTo(camera.position), direction = point.clone().sub(camera.position).normalize();
  const hits = new THREE.Raycaster(camera.position, direction, .001, distance - .015).intersectObjects(meshes);
  return !hits.some(hit => !section || hit.point.z <= 0);
}

test('unchanged production cameras include terrain-visible facilities, road and woodland on wide and phone frames', () => {
  for (const [kind, layout] of layouts) {
    const meshes = [sceneGeometry(terrainBuffers(kind)), sceneGeometry(environmentGroundBuffers(kind))];
    for (const [width, height] of [[1160, 374], [310, 390]]) for (const view of ['overview', 'exterior']) {
      const camera = productionCamera(kind, view, width, height), section = view === 'overview';
      for (const site of layout.buildings) {
        const point = new THREE.Vector3(site.position[0], site.foundationTop + site.height + .075, site.position[2]), screen = point.clone().project(camera);
        assert.ok(Math.abs(screen.x) < .8 && Math.abs(screen.y) < .8 && screen.z > -1 && screen.z < 1);
        assert.ok(visibleFrom(point, camera, meshes, section), `${kind}/${view} roof is not hidden behind the actual terrain`);
        const left = point.clone().add(new THREE.Vector3(-site.width / 2, 0, 0)).project(camera), right = point.clone().add(new THREE.Vector3(site.width / 2, 0, 0)).project(camera);
        assert.ok(Math.abs(right.x - left.x) * width / 2 > 5.5, 'small facility still has a readable silhouette');
      }
      const road = layout.road.filter((_, i) => i % 8 === 0).filter(value => {
        const point = new THREE.Vector3(...value); point.y += .01; const screen = point.clone().project(camera);
        return Math.abs(screen.x) < .9 && Math.abs(screen.y) < .8 && visibleFrom(point, camera, meshes, section);
      });
      assert.ok(road.length >= 4, 'a connected part of the access road remains in the view');
      const trees = layout.trees.filter(site => !section || site.position[2] + site.radius < 0).filter(site => {
        const point = new THREE.Vector3(...site.position); point.y += site.height * .85; const screen = point.clone().project(camera);
        return Math.abs(screen.x) < .9 && Math.abs(screen.y) < .8 && visibleFrom(point, camera, meshes, section);
      });
      assert.ok(trees.length >= 20, 'surrounding woodland is visible without moving the camera or enlarging trees');
    }
    for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
  }
});

function resources(owner) {
  const shapes = new Set(), materials = new Set(), instances = [];
  owner.group.traverse(object => {
    if (object instanceof THREE.Mesh) {
      shapes.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    }
    if (object instanceof THREE.InstancedMesh) instances.push(object);
  });
  return { shapes, materials, instances };
}
function disposalCounter(collection) {
  const counts = new Map([...collection].map(value => [value, 0]));
  for (const object of collection) object.addEventListener('dispose', () => counts.set(object, counts.get(object) + 1));
  return () => assert.ok([...counts.values()].every(count => count === 1), 'every owned resource is disposed exactly once');
}

test('retained meshes have finite bounded payload, irregular tree silhouettes and exact-once resource ownership', () => {
  for (const kind of kinds) {
    const texture = new THREE.Texture(), owner = new EruptionEnvironment3D(kind, texture, cutPlane()), current = resources(owner);
    let textureDisposed = 0; texture.addEventListener('dispose', () => textureDisposed++);
    assert.ok(owner.resources.geometryBytes <= ENVIRONMENT_LIMITS.geometryBytes);
    assert.ok(owner.resources.instanceBytes <= ENVIRONMENT_LIMITS.instanceBytes);
    assert.ok(owner.resources.drawCalls <= ENVIRONMENT_LIMITS.drawCalls && owner.resources.triangles <= ENVIRONMENT_LIMITS.triangles);
    assert.ok(owner.resources.materials <= ENVIRONMENT_LIMITS.materials && owner.resources.trees <= ENVIRONMENT_LIMITS.trees);
    for (const shape of current.shapes) {
      for (const attribute of Object.values(shape.attributes)) assert.ok([...attribute.array].every(Number.isFinite));
      const count = shape.getAttribute('position').count;
      if (shape.index) assert.ok([...shape.index.array].every(index => index >= 0 && index < count));
    }
    for (const mesh of current.instances) {
      assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));
      const positions = mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) assert.ok(Math.hypot(positions.getX(i), positions.getZ(i)) < TREE_RADIUS_RATIO, 'actual crowns fit their reserved footprint');
      if (mesh.name.startsWith('tree-trunks')) {
        assert.ok(positions.count > 200 && Math.max(...positions.array.filter((_, i) => i % 3 === 1)) > .8, 'visible branched trunk is retained separately from its crown');
      }
    }
    const shapesDisposed = disposalCounter(current.shapes), materialsDisposed = disposalCounter(current.materials), instancesDisposed = disposalCounter(current.instances);
    owner.dispose(); owner.dispose(); shapesDisposed(); materialsDisposed(); instancesDisposed();
    assert.equal(owner.group.children.length, 0); assert.equal(textureDisposed, 0, 'borrowed rock texture belongs to the parent renderer'); texture.dispose();
  }
});

test('section toggles use the same cut convention for every contextual material and keep all sites/resources fixed', () => {
  const texture = new THREE.Texture(), plane = cutPlane(), owner = new EruptionEnvironment3D('shield', texture, plane), current = resources(owner);
  const sites = JSON.stringify(owner.layout), children = [...owner.group.children], matrices = current.instances.map(mesh => mesh.instanceMatrix.array.slice());
  const parent = new THREE.Group(); parent.add(owner.group);
  owner.setSection(true); owner.setSection(true);
  for (const material of current.materials) { assert.equal(material.clippingPlanes.length, 1); assert.equal(material.clippingPlanes[0], plane); assert.equal(material.clipShadows, true); }
  assert.ok(plane.distanceToPoint(new THREE.Vector3(0, 0, -1)) > 0 && plane.distanceToPoint(new THREE.Vector3(0, 0, 1)) < 0, 'front context is removed with the original terrain convention');
  owner.setSection(false);
  for (const material of current.materials) assert.deepEqual(material.clippingPlanes, []);
  assert.equal(JSON.stringify(owner.layout), sites); assert.deepEqual(owner.group.children, children);
  current.instances.forEach((mesh, i) => assert.deepEqual(mesh.instanceMatrix.array, matrices[i]));
  owner.dispose(); assert.equal(parent.children.length, 0); texture.dispose();
});

function rendererHarness() {
  const scene = Object.create(Eruption3DScene.prototype), style = () => ({ material: new THREE.MeshStandardMaterial() });
  Object.assign(scene, {
    scene: new THREE.Scene(), terrain: new THREE.Group(), section: new THREE.Group(), jets: new THREE.Group(), surfaceProducts: new THREE.Group(), rocks: new THREE.Group(),
    geometries: new Set(), materials: new Set(), texture: new THREE.Texture(), cut: cutPlane(), settings: scenarioSettings('gentle-flow', { landform: 'scoria' }),
    dummy: new THREE.Object3D(), surfaceRock: new THREE.MeshStandardMaterial(), geology: [0, 1, 2].map(() => new THREE.MeshStandardMaterial()), contactRock: new THREE.MeshStandardMaterial(),
    magma: style(), magmaPath: style(), fountain: style(), lava: style(), pool: style(), surfaceTransport: style(), intrusiveTransport: style(),
    storageLights: STORAGE.map(() => new THREE.PointLight()), ground: new THREE.Mesh(), view: 'overview', cutaway: true, canvas: { dataset: {}, removeEventListener() {} },
    controls: { dispose() {} }, renderer: { shadowMap: {}, dispose() {}, forceContextLoss() {} },
    stopMotion() {}, syncDetailHeat() {}, moveCamera() {}, presentation: { dispose() {} }, detailMotion: { dispose() {} }, resizeObserver: { disconnect() {} }, ejecta: { dispose() {} },
    ash: { noise: new THREE.Texture() }, sceneTarget: { dispose() {} }, ashTarget: { dispose() {} }, ashScene: new THREE.Scene(), compositeScene: new THREE.Scene(), disposed: false,
  });
  return scene;
}

test('actual renderer retains the environment across product rebuilds and disposes it on landform replacement and scene exit', () => {
  const scene = rendererHarness(); scene.rebuild();
  const first = scene.environment, held = resources(first), shapesDisposed = disposalCounter(held.shapes), materialsDisposed = disposalCounter(held.materials), instancesDisposed = disposalCounter(held.instances);
  const matrices = held.instances.map(mesh => mesh.instanceMatrix.array);
  for (const view of ['overview', 'exterior', 'storage', 'vent', 'flow', 'plume']) for (const section of [true, false]) {
    scene.setView(view, section);
    assert.equal(scene.section.visible, section);
    for (const material of held.materials) assert.equal(material.clippingPlanes?.length ?? 0, section ? 1 : 0, `${view} clips the whole context consistently`);
    assert.equal(scene.environment, first, 'a close lens never replaces the older landscape');
  }
  scene.settings = { ...scene.settings, gas: .9, vents: 3, strength: .32 }; scene.rebuild();
  assert.equal(scene.environment, first); held.instances.forEach((mesh, i) => assert.equal(mesh.instanceMatrix.array, matrices[i]));
  scene.settings = { ...scene.settings, landform: 'shield' }; scene.rebuild();
  assert.notEqual(scene.environment, first); shapesDisposed(); materialsDisposed(); instancesDisposed();
  const last = resources(scene.environment), lastShapes = disposalCounter(last.shapes), lastMaterials = disposalCounter(last.materials), lastInstances = disposalCounter(last.instances);
  scene.dispose(); scene.dispose(); lastShapes(); lastMaterials(); lastInstances(); assert.equal(scene.environment, undefined);
});
