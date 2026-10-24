import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { depositBuffers, islandVentOrigin, oceanGeometryFrame, surfaceHeight, updateDeposit, WATER_Y } from '../geometry3d.ts';
import { pillowState } from '../model.ts';
import { pillowFlow, pillowFlowBuffers, updatePillowFlow } from '../pillowFlow.ts';
import { oceanUniforms, stoneNoise } from '../materials3d.ts';
import { ISLAND_CLASTS, islandClast } from '../surfaceClasts.ts';
import { ECOLOGY_ANIMAL_LIFT, ECOLOGY_PATCH_VERTICES, ECOLOGY_SURFACE_LIFT, ISLAND_ECOLOGY_SITES, MARINE_ECOLOGY_SITES,
  oceanEcology, oceanEcologyClearance } from '../oceanEcology.ts';
import { OceanEcology3D } from '../oceanEcology3d.ts';
import { islandEcologyFraming, OceanCameraMotion, oceanEcologyFraming } from '../scene3d.ts';

test('a rapid seek supersedes a same-view camera transition without accumulating the old mountain height', () => {
  const camera=new THREE.PerspectiveCamera(37,1.5,.08,220),controls=new OrbitControls(camera);
  const early={target:new THREE.Vector3(0,.15,0),offset:new THREE.Vector3(2,2.5,7)};
  const ending={target:new THREE.Vector3(0,7.7,.34),offset:new THREE.Vector3(3.2,2.7,8.3)};
  let pending:Parameters<NonNullable<ConstructorParameters<typeof OceanCameraMotion>[3]>>[0] | undefined,cancelled=0;
  const motion=new OceanCameraMotion(camera,controls,()=>{},options=>{
    pending=options;options.onUpdate(0);return ()=>{cancelled++;};
  });
  motion.setView(early,false);motion.setView(ending,true);
  const obsolete=pending!;obsolete.onUpdate(.4);
  const partial=controls.target.clone();motion.draw(ending,ending);
  assert.equal(cancelled,0,'a same-frame redraw keeps its intended view transition');
  assert.ok(controls.target.distanceTo(partial)<1e-9);
  motion.draw(ending,early);
  assert.equal(cancelled,1,'an earlier progress anchor invalidates the old transition even without a focus-key change');
  assert.ok(controls.target.distanceTo(early.target)<1e-9);
  obsolete.onUpdate(1);obsolete.onComplete?.();
  assert.ok(controls.target.distanceTo(early.target)<1e-9,'a queued completion cannot restore the old endpoint');
  motion.draw(early,ending);
  assert.ok(controls.target.distanceTo(ending.target)<1e-9,'returning to the endpoint adds its mountain height only once');
  assert.ok(Math.abs(camera.position.distanceTo(controls.target)-ending.offset.length())<1e-9,
    'following growth retains the current viewing direction and the intended observation distance');
  motion.stop();
});

test('the selected conditions admit sparse ecology while bare, hot, shallow and submerged-land controls remain empty', () => {
  for (const environment of ['deep', 'shallow', 'island'] as const) for (const supply of ['limited', 'sustained'] as const) {
    for (const progress of [0, .2, .6, .8199, .9, 1]) {
      const frame = oceanGeometryFrame(progress, environment, supply), bare = oceanEcology(frame, 'bare');
      assert.equal(bare.visible, false); assert.equal(bare.film + bare.animal + bare.soil + bare.seedling, 0);
      assert.equal(bare.focusSite, -1);
      const selected = oceanEcology(frame, 'suitable');
      if (progress < .82 || environment === 'shallow') assert.equal(selected.visible, false);
      if (supply === 'limited' && environment === 'island') {
        assert.equal(selected.soil + selected.seedling, 0); assert.equal(selected.visible, false);
      }
      if (environment !== 'island') assert.equal(selected.soil + selected.seedling, 0);
      if (environment !== 'deep') assert.equal(selected.film + selected.animal, 0);
    }
  }
  const deep = oceanEcology(oceanGeometryFrame(1, 'deep', 'sustained'), 'suitable');
  const island = oceanEcology(oceanGeometryFrame(1, 'island', 'sustained'), 'suitable');
  assert.equal(deep.film, MARINE_ECOLOGY_SITES); assert.ok(deep.animal > 0 && deep.animal < deep.film);
  assert.ok(Math.max(...deep.sites.map(s => s.radius)) / Math.min(...deep.sites.map(s => s.radius)) > 2,
    'fixed patches have distinctly different lengths rather than repeated discs');
  assert.ok(island.seedling > 0 && island.seedling < ISLAND_ECOLOGY_SITES, 'much of the cap remains bare');
});

test('dark rind is insufficient: sites on a still-hot local lobe wait, and grazers follow microbial patches', () => {
  let encounteredHot = false, encounteredCold = false;
  for (let step = 82; step <= 100; step++) {
    const frame = oceanGeometryFrame(step / 100, 'deep', 'sustained'), result = oceanEcology(frame, 'suitable');
    for (const site of result.sites) {
      if (site.flowIndex >= 0) {
        const local = pillowState(frame.p, site.flowIndex);
        assert.equal(site.crust, local.crust); assert.equal(site.coreHeat, local.coreHeat);
        if (local.coreHeat >= .055) {
          assert.equal(site.film, 0); assert.equal(site.animal, 0); encounteredHot = true;
        }
        if (local.coreHeat === 0 && site.film > .01) encounteredCold = true;
      }
      if (site.animal > .01) assert.ok(site.film > .35);
      assert.equal(site.patch.length, ECOLOGY_PATCH_VERTICES);
      assert.ok(site.patch.every(p => p[1] < WATER_Y));
    }
  }
  assert.equal(encounteredHot, true); assert.equal(encounteredCold, true);
});

test('island patches drape on the supplied terrain and avoid water and retained deposit fragments', () => {
  for (const progress of [.88, .92, .96, 1]) {
    const frame = oceanGeometryFrame(progress, 'island', 'sustained'), state = oceanEcology(frame, 'suitable');
    const clasts = Array.from({ length: ISLAND_CLASTS }, (_, i) => islandClast(frame, i)).filter(c => c.visible);
    for (const site of state.sites) {
      for (const [x, y, z] of site.patch) assert.ok(Math.abs(y - surfaceHeight(frame, x, z) - ECOLOGY_SURFACE_LIFT) < 1e-10);
      if (site.soil <= .01 && site.seedling <= .01) continue;
      assert.ok(site.patch.every(p => p[1] > WATER_Y + ECOLOGY_SURFACE_LIFT + .03));
      for (const clast of clasts) assert.ok(Math.hypot(site.position[0] - clast.position[0], site.position[2] - clast.position[2])
        >= site.radius + Math.hypot(...clast.dimensions), 'source-linked rocks are preserved instead of replaced by plants');
      if (site.seedling > .01) { assert.ok(site.soil > .35); assert.equal(frame.history.adding, false); assert.equal(frame.state.activity, 0); }
    }
  }
});

test('marine patch contact agrees with the actual retained terrain and flow triangles', () => {
  const frame = oceanGeometryFrame(1, 'deep', 'sustained'), objects: THREE.Mesh[] = [];
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const add = (positions: Float32Array, indices: number[]) => {
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeBoundingSphere(); objects.push(new THREE.Mesh(geometry, material));
  };
  const terrain = depositBuffers(); updateDeposit(terrain.positions, frame, -1); add(terrain.positions, terrain.indices);
  for (let i = 0; i < 14; i++) {
    const data = pillowFlowBuffers(); updatePillowFlow(data, pillowFlow(frame, i)); add(data.positions, data.indices);
  }
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
  const state = oceanEcology(frame, 'suitable');
  for (const site of state.sites) {
    if (site.animal > 0) assert.ok(Math.hypot(site.position[0] - site.animalPosition[0], site.position[2] - site.animalPosition[2])
      > site.radius * .3, 'an attached limpet sits near the film edge, not at every patch centre');
    let xx = 0, xz = 0, zz = 0;
    for (const point of site.outline) {
      const x = point[0] - site.position[0], z = point[2] - site.position[2]; xx += x * x; xz += x * z; zz += z * z;
    }
    const difference = Math.hypot(xx - zz, 2 * xz), major = (xx + zz + difference) / 2, minor = (xx + zz - difference) / 2;
    assert.ok(major > minor * 5, 'film follows narrow irregular rock strips rather than a round white pad');
    for (const p of [site.position, site.animalPosition, site.outline[0], site.outline[5], site.outline[11]]) {
      ray.set(new THREE.Vector3(p[0], 20, p[2]), down);
      const hit = ray.intersectObjects(objects, false)[0]; assert.ok(hit);
      const lift = p === site.animalPosition ? ECOLOGY_ANIMAL_LIFT : ECOLOGY_SURFACE_LIFT;
      assert.ok(Math.abs(p[1] - lift - hit.point.y) < .00001,
        `patch ${site.index} must contact the displayed outer skin rather than an invisible generic mound`);
    }
  }
  for (const aspect of [1.5, .75]) {
    const framing = oceanEcologyFraming(state, aspect)!;
    const eye = framing.target.clone().add(framing.offset), selected = state.sites.find(s => s.index === state.focusSite)!;
    for (const point of [selected.position, selected.animalPosition]) {
      const target = new THREE.Vector3(...point), distance = eye.distanceTo(target);
      ray.set(eye, target.sub(eye).normalize());
      const hit = ray.intersectObjects(objects, false)[0];
      assert.ok(!hit || hit.distance > distance - .015, 'the close camera sees this patch without a foreground lava ridge');
    }
  }
  for (const mesh of objects) mesh.geometry.dispose(); material.dispose();
});

test('site identity, topology, static prop clearance and seek results are deterministic', () => {
  for (const environment of ['deep', 'island'] as const) {
    const frame = oceanGeometryFrame(.97, environment, 'sustained'), snapshot = structuredClone(frame);
    const state = oceanEcology(frame, 'suitable');
    oceanEcology(oceanGeometryFrame(.2, environment, 'limited'), 'bare');
    oceanEcology(oceanGeometryFrame(1, environment, 'sustained'), 'suitable');
    assert.deepEqual(oceanEcology(frame, 'suitable'), state); assert.deepEqual(frame, snapshot);
    for (const site of state.sites) {
      assert.equal(oceanEcologyClearance(site.position[0], site.position[2], 0, environment), true);
      assert.equal(oceanEcologyClearance(site.position[0], site.position[2]), true);
      if (site.animal > 0) assert.equal(oceanEcologyClearance(site.animalPosition[0], site.animalPosition[2], 0, environment), true);
      assert.ok(Math.abs(Math.hypot(...site.normal) - 1) < 1e-10);
      assert.ok(site.normal[1] > 0); assert.ok(site.position.every(Number.isFinite));
    }
  }
  assert.equal(oceanEcologyClearance(8, 8, .1), false);
  assert.equal(oceanEcologyClearance(0, 0, 100, 'shallow'), false);
  assert.equal(oceanEcologyClearance(Number.NaN, 0), false);
});

test('GPU projection retains bounded resources, uses real site poses and preserves the borrowed water/noise contract', () => {
  const noise = stoneNoise(), ocean = oceanUniforms(), owner = new OceanEcology3D(noise, ocean);
  const objects = [...owner.group.children] as THREE.Mesh[], resources = new Set<THREE.BufferGeometry | THREE.Material>();
  assert.equal(objects.length, 4);
  let bytes = 0;
  for (const object of objects) {
    resources.add(object.geometry); resources.add(object.material as THREE.Material);
    for (const attribute of Object.values(object.geometry.attributes)) bytes += attribute.array.byteLength;
    bytes += object.geometry.index?.array.byteLength ?? 0;
    if (object instanceof THREE.InstancedMesh) bytes += object.instanceMatrix.array.byteLength;
    assert.equal((object.material as THREE.MeshStandardMaterial).emissive.getHex(), 0);
  }
  assert.ok(bytes < 192 * 1024, 'retained ecology buffers stay below 192 KiB, with no owned textures');
  for (const progress of [.85, .95, 1, .2, .96, 1]) {
    owner.draw(oceanGeometryFrame(progress, 'deep', 'sustained'), 'suitable');
    assert.deepEqual([...owner.group.children], objects);
  }
  const animals = objects.find(o => o.name === 'ocean-ecology-limpets') as THREE.InstancedMesh;
  assert.equal(animals.count, owner.state.animal);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
  owner.state.sites.filter(s => s.animal > .001).forEach((site, index) => {
    animals.getMatrixAt(index, matrix); matrix.decompose(position, rotation, scale);
    assert.ok(position.distanceTo(new THREE.Vector3(...site.animalPosition)) < 1e-6);
    assert.ok(scale.y > 0 && scale.y < .09);
  });
  const previous = new Float32Array(animals.instanceMatrix.array);
  const film = objects.find(o => o.name === 'ocean-ecology-microbial-films')!;
  const filmMaterial = film.material as THREE.MeshStandardMaterial;
  assert.equal(filmMaterial.transparent, true); assert.equal(filmMaterial.depthWrite, false);
  assert.ok(filmMaterial.opacity > .55 && filmMaterial.opacity < .85,
    'a translucent film retains useful contrast before its broken shader mask further reduces coverage');
  assert.ok(Math.max(...film.geometry.getAttribute('color').array) < .5, 'film albedo stays tan/cream rather than opaque white');
  owner.draw(oceanGeometryFrame(.5, 'deep', 'sustained'), 'suitable');
  owner.draw(oceanGeometryFrame(1, 'deep', 'sustained'), 'suitable');
  assert.deepEqual(animals.instanceMatrix.array, previous);
  owner.draw(oceanGeometryFrame(1, 'island', 'sustained'), 'suitable');
  assert.ok(owner.state.seedling > 0); assert.ok(owner.state.focusWeight > 0);
  const plants = objects.find(o => o.name === 'ocean-ecology-low-seedlings') as THREE.InstancedMesh;
  assert.equal(plants.count, owner.state.seedling);
  owner.draw(oceanGeometryFrame(1, 'island', 'limited'), 'suitable'); assert.equal(owner.group.visible, false);
  owner.draw(oceanGeometryFrame(1, 'shallow', 'sustained'), 'suitable'); assert.equal(owner.group.visible, false);
  owner.draw(oceanGeometryFrame(1, 'deep', 'sustained'), 'bare'); assert.equal(owner.group.visible, false);
  for (const object of objects) {
    const material = object.material as THREE.MeshStandardMaterial;
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader } as Parameters<THREE.Material['onBeforeCompile']>[0];
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    const uniforms = shader.uniforms as Record<string, THREE.IUniform>;
    assert.equal(uniforms.uLifeStone.value, noise); assert.equal(uniforms.uLifeDeep, ocean.deep); assert.equal(uniforms.uLifeCutaway, ocean.cutaway);
    assert.ok(shader.vertexShader.includes('instanceMatrix*lifePosition')); assert.ok(shader.fragmentShader.includes('lifeAttenuate(gl_FragColor.rgb,vLifeWorld)'));
    assert.ok(!shader.fragmentShader.includes('uLifeClock'), 'life does not replay or animate while the scene is paused');
  }
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0); owner.setCutaway(plane);
  for (const object of objects) assert.deepEqual((object.material as THREE.Material).clippingPlanes, [plane]);
  owner.setCutaway(); for (const object of objects) assert.deepEqual((object.material as THREE.Material).clippingPlanes, []);
  let disposed = 0, borrowedDisposals = 0;
  resources.forEach(resource => resource.addEventListener('dispose', () => disposed++)); noise.addEventListener('dispose', () => borrowedDisposals++);
  owner.dispose(); owner.dispose(); assert.equal(disposed, resources.size); assert.equal(borrowedDisposals, 0);
  assert.equal(owner.group.children.length, 0); assert.equal(owner.state.visible, false);
  owner.draw(oceanGeometryFrame(1, 'deep', 'sustained'), 'suitable'); assert.equal(owner.group.children.length, 0);
  noise.dispose();
});

test('the marine camera observes the same small attached limpet and broken rock patch at a readable magnification', () => {
  const noise = stoneNoise(), owner = new OceanEcology3D(noise, oceanUniforms());
  const frame = oceanGeometryFrame(1, 'deep', 'sustained'); owner.draw(frame, 'suitable');
  const selected = owner.state.sites.find(s => s.index === owner.state.focusSite)!;
  assert.ok(selected && selected.animal > .01 && selected.animalSize < .045);
  const animals = owner.group.children.find(o => o.name === 'ocean-ecology-limpets') as THREE.InstancedMesh;
  animals.geometry.computeBoundingBox();
  const cap = animals.geometry.boundingBox!, shellLength = cap.max.z - cap.min.z, capHeight = cap.max.y - cap.min.y;
  assert.ok(capHeight > shellLength * .24 && capHeight < shellLength * .34,
    'a low conical cap rises visibly above its foot while remaining much lower than a ball');
  const index = owner.state.sites.filter(s => s.animal > .001).findIndex(s => s.index === selected.index);
  const matrix = new THREE.Matrix4(); animals.getMatrixAt(index, matrix);
  for (const aspect of [1.5, .75]) {
    const framing = oceanEcologyFraming(owner.state, aspect)!;
    assert.ok(framing.offset.length() < 1.5 && framing.offset.length() > framing.minDistance!);
    assert.ok(framing.target.distanceTo(new THREE.Vector3(...selected.position)) < .06);
    const camera = new THREE.PerspectiveCamera(37, aspect, .08, 220);
    camera.position.copy(framing.target).add(framing.offset); camera.lookAt(framing.target); camera.updateMatrixWorld();
    const points = animals.geometry.getAttribute('position'); let left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
    for (let vertex = 0; vertex < points.count; vertex++) {
      const p = new THREE.Vector3().fromBufferAttribute(points, vertex).applyMatrix4(matrix).project(camera);
      left = Math.min(left, p.x); right = Math.max(right, p.x); top = Math.max(top, p.y); bottom = Math.min(bottom, p.y);
    }
    const shellWidth = (right - left) * 390 / 2, shellHeight = (top - bottom) * (390 / aspect) / 2;
    assert.ok(shellWidth > 20 && shellWidth < 70 && shellHeight > 10,
      'even a 390px stage can show the original shell outline rather than a barely visible point');
    for (const point of selected.patch) {
      const p = new THREE.Vector3(...point).project(camera);
      assert.ok(Math.abs(p.x) < .9 && Math.abs(p.y) < .9 && p.z > -1 && p.z < 1,
        'the same retained patch, its edge and surrounding rock stay inside the close camera');
    }
  }
  const focus = owner.state.focusSite;
  owner.draw(oceanGeometryFrame(.2, 'deep', 'sustained'), 'suitable');
  assert.equal(oceanEcologyFraming(owner.state), undefined);
  owner.draw(frame, 'suitable'); assert.equal(owner.state.focusSite, focus);
  owner.draw(oceanGeometryFrame(1, 'island', 'sustained'), 'suitable');
  assert.equal(oceanEcologyFraming(owner.state), undefined, 'marine framing never selects a terrestrial site');
  owner.dispose(); noise.dispose();
});

test('production setView then draw cancels the early vent transition and places island life outside the actual mature mountain', () => {
  const early = oceanGeometryFrame(.08, 'island', 'sustained');
  const stale = new THREE.Vector3(...islandVentOrigin(early)).add(new THREE.Vector3(1.8, 1.77, 4.7));
  const earlyView = { target: new THREE.Vector3(...islandVentOrigin(early)).add(new THREE.Vector3(0, .12, .20)),
    offset: new THREE.Vector3(1.8, 1.65, 4.5) };
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), ray = new THREE.Raycaster();
  const noise = stoneNoise(), owner = new OceanEcology3D(noise, oceanUniforms());
  for (const progress of [.94, .97, 1]) {
    const frame = oceanGeometryFrame(progress, 'island', 'sustained'), state = oceanEcology(frame, 'suitable');
    const objects: THREE.Mesh[] = [];
    for (const unit of [-1, ...frame.history.units.map(u => u.index)]) {
      const data = depositBuffers(); updateDeposit(data.positions, frame, unit);
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
      geometry.setIndex(data.indices); objects.push(new THREE.Mesh(geometry, material));
    }
    if (progress === 1) {
      ray.set(new THREE.Vector3(stale.x, 25, stale.z), new THREE.Vector3(0, -1, 0));
      assert.ok(ray.intersectObjects(objects, false)[0].point.y > stale.y + .2,
        'a completed early-vent camera animation would end inside this later real mountain');
    }
    owner.draw(frame, 'suitable');
    const site = state.sites.find(s => s.index === state.focusSite)!;
    const plants = owner.group.children.find(o => o.name === 'ocean-ecology-low-seedlings') as THREE.InstancedMesh;
    for (const aspect of [3, 1.5, .75]) {
      const framing = islandEcologyFraming(frame, state, aspect)!;
      assert.equal(framing.focusKey, 'island-ecology', 'entering life supersedes an old vent animation even in the same view');
      const camera = new THREE.PerspectiveCamera(37, aspect, .08, 220); camera.position.set(8, 10, 18);
      const controls = new OrbitControls(camera);
      let pending: Parameters<NonNullable<ConstructorParameters<typeof OceanCameraMotion>[3]>>[0] | undefined, cancelled = 0;
      const motion = new OceanCameraMotion(camera, controls, () => {}, options => {
        pending = options; options.onUpdate(0); return () => { cancelled++; };
      });
      // These are the same two methods called by Ocean3D.setView and draw.
      // The scene mount starts the early vent animation before supplying p=1.
      motion.setView(earlyView, true); const obsolete = pending!; obsolete.onUpdate(.4);
      motion.draw(earlyView, framing);
      assert.equal(cancelled, 1, 'drawing the new island-life anchor cancels the old mounted vent transition');
      const eye = camera.position.clone(), actualTarget = controls.target.clone();
      assert.ok(eye.distanceTo(framing.target.clone().add(framing.offset)) < 1e-8);
      assert.ok(actualTarget.distanceTo(framing.target) < 1e-8);
      obsolete.onUpdate(1); obsolete.onComplete?.();
      assert.ok(camera.position.distanceTo(eye) < 1e-8 && controls.target.distanceTo(actualTarget) < 1e-8,
        'even an obsolete queued completion cannot overwrite the late safe pose');
      camera.updateMatrixWorld();
      ray.set(new THREE.Vector3(eye.x, 25, eye.z), new THREE.Vector3(0, -1, 0));
      assert.ok(eye.y > ray.intersectObjects(objects, false)[0].point.y + .3, 'the actual closed terrain lies below the observation camera');
      for (const point of [...site.patch, [site.position[0], site.position[1] + .05, site.position[2]]]) {
        const p = new THREE.Vector3(...point), distance = eye.distanceTo(p);
        ray.set(eye, p.clone().sub(eye).normalize());
        const hit = ray.intersectObjects(objects, false)[0];
        assert.ok(!hit || hit.distance > distance - .001, 'no deposited mountain layer hides the selected soil or small shoot');
        const projected = p.project(camera);
        assert.ok(Math.abs(projected.x) < .9 && Math.abs(projected.y) < .9 && projected.z > -1 && projected.z < 1);
      }
      if (site.seedling > .001) {
        const index = state.sites.filter(s => s.seedling > .001).findIndex(s => s.index === state.focusSite);
        const matrix = new THREE.Matrix4(); plants.getMatrixAt(index, matrix);
        const positions = plants.geometry.getAttribute('position'); let top = -Infinity, bottom = Infinity;
        for (let vertex = 0; vertex < positions.count; vertex++) {
          const p = new THREE.Vector3().fromBufferAttribute(positions, vertex).applyMatrix4(matrix).project(camera);
          assert.ok(Math.abs(p.x) < .9 && Math.abs(p.y) < .9 && p.z > -1 && p.z < 1);
          top = Math.max(top, p.y); bottom = Math.min(bottom, p.y);
        }
        if (progress === 1) assert.ok((top - bottom) * (390 / aspect) / 2 > 5,
          'the original small seedling occupies visible pixels in a 390px-wide stage');
      }
      motion.setView(framing, true); const lateTransition = pending!;
      motion.draw(framing, earlyView); const restoredEye = camera.position.clone(), restoredTarget = controls.target.clone();
      lateTransition.onUpdate(1); lateTransition.onComplete?.();
      assert.ok(camera.position.distanceTo(restoredEye) < 1e-8 && controls.target.distanceTo(restoredTarget) < 1e-8,
        'a rapid return also invalidates an in-flight life camera transition');
      motion.stop();
    }
    for (const mesh of objects) mesh.geometry.dispose();
  }
  assert.equal(islandEcologyFraming(early, oceanEcology(early, 'suitable')), undefined);
  const submerged = oceanGeometryFrame(1, 'island', 'limited');
  assert.equal(islandEcologyFraming(submerged, oceanEcology(submerged, 'suitable')), undefined);
  owner.dispose(); noise.dispose(); material.dispose();
});

test('land shoots stand against gravity on selected ledges while limpets retain their rock-normal attachment', () => {
  const noise = stoneNoise(), owner = new OceanEcology3D(noise, oceanUniforms());
  const plants = owner.group.children.find(o => o.name === 'ocean-ecology-low-seedlings') as THREE.InstancedMesh;
  const animals = owner.group.children.find(o => o.name === 'ocean-ecology-limpets') as THREE.InstancedMesh;
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0); plants.geometry.computeBoundingBox();
  for (const progress of [.96, 1]) {
    const frame = oceanGeometryFrame(progress, 'island', 'sustained'); owner.draw(frame, 'suitable');
    const selected = owner.state.sites.filter(s => s.seedling > .001); assert.ok(selected.length > 0);
    selected.forEach((site, index) => {
      plants.getMatrixAt(index, matrix); matrix.decompose(position, rotation, scale);
      assert.ok(up.clone().applyQuaternion(rotation).dot(up) > .999999,
        'a soil-normal rotation must not turn terrestrial shoots into wall-mounted rosettes');
      assert.ok(Math.abs(position.y - surfaceHeight(frame, position.x, position.z) - ECOLOGY_SURFACE_LIFT) < 1e-6);
      assert.ok(position.distanceTo(new THREE.Vector3(...site.position)) < 1e-6);
      assert.ok(site.normal[1] > .9, 'these authored ledges are locally gentle; this is not a universal ecological slope rule');
      for (const [x, , z] of site.patch) {
        const d = .012, dx = (surfaceHeight(frame, x + d, z) - surfaceHeight(frame, x - d, z)) / (2 * d);
        const dz = (surfaceHeight(frame, x, z + d) - surfaceHeight(frame, x, z - d)) / (2 * d);
        assert.ok(1 / Math.hypot(dx, 1, dz) > .8, 'the soil footprint must not wrap onto a reconstructed wall');
      }
      assert.ok(plants.geometry.boundingBox!.max.y * scale.y < .12, 'the fine-stemmed seedling remains low');
    });
    const focus = owner.state.sites.find(s => s.position.every((p, i) => p === owner.state.focus[i]));
    assert.ok(focus && focus.soil > .01 && focus.normal[1] > .9);
  }
  owner.draw(oceanGeometryFrame(1, 'deep', 'sustained'), 'suitable');
  let tilted = false;
  owner.state.sites.filter(s => s.animal > .001).forEach((site, index) => {
    animals.getMatrixAt(index, matrix); matrix.decompose(position, rotation, scale);
    const normal = new THREE.Vector3(...site.animalNormal);
    assert.ok(up.clone().applyQuaternion(rotation).dot(normal) > .999999);
    assert.ok(position.distanceTo(new THREE.Vector3(...site.animalPosition)) < 1e-6);
    tilted ||= normal.y < .95;
  });
  assert.equal(tilted, true, 'a limpet remains aligned to its inclined rock rather than the plant pose');
  owner.dispose(); noise.dispose();
});
