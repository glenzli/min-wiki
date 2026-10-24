import test from 'node:test';
import assert from 'node:assert/strict';
import { ashParcels, craterBasin, eruptionFrame, fragmentAt, fragmentSchedule, lavaBranches, lavaRibbon, RetainedLavaRibbon, surfaceHeight, terrainBuffers } from '../eruptionGeometry.ts';
import {FrameRender} from '../../../src/visuals/frameRender.ts';
import * as THREE from 'three';
import { Eruption3DScene } from '../eruption3d.ts';
import { scenarioSettings } from '../eruptionScenarios.ts';
import { PRESETS } from '../model.ts';
import { ashMaterial } from '../eruptionMaterials.ts';

test('the 3D height field and indexed surface are stable for each landform', () => {
  for (const kind of ['shield', 'composite', 'scoria']) {
    const geometry = terrainBuffers(kind, 20, 40);
    assert.deepEqual(terrainBuffers(kind, 20, 40), geometry);
    assert.ok(geometry.positions.every(Number.isFinite));
    assert.ok(geometry.indices.every(i => i >= 0 && i < geometry.positions.length / 3));
    assert.equal(geometry.positions.length / 3, geometry.uvs.length / 2);
    const basin = craterBasin(kind);
    assert.ok(basin.rim > basin.floor, `${kind} retains a depressed crater`);
    assert.equal(surfaceHeight(0, 0, kind), basin.floor);
  }
  assert.ok(surfaceHeight(5, 0, 'shield') > surfaceHeight(5, 0, 'scoria'));
});

test('all fragment impacts use the rendered 3D mountain, and deposits retain their positions', () => {
  for (const landform of ['scoria', 'composite', 'shield']) for (const vents of [1, 3]) {
    const settings = { ...PRESETS.fountain, landform, vents };
    for (const fragment of fragmentSchedule(settings).filter(f => f.active)) {
      assert.equal(fragmentAt(fragment, fragment.birth - .001).visible, false);
      const landingClock = fragment.birth + fragment.trajectory.impactTime / 24 + 1e-6;
      const landing = fragmentAt(fragment, landingClock);
      assert.equal(landing.landed, true);
      assert.ok(Math.abs(landing.position[1] - surfaceHeight(landing.position[0], landing.position[2], landform)) < 1e-7);
      assert.deepEqual(fragmentAt(fragment, landingClock + .2).position, landing.position);
    }
  }
});

test('lava overtops a filled crater and stays on the slope rather than floating above it', () => {
  for (const landform of ['scoria', 'composite', 'shield']) {
    const settings = { ...PRESETS.flow, landform };
    const basin = craterBasin(landform);
    for (const branch of lavaBranches(settings)) {
      assert.equal(lavaRibbon(.4, settings, branch).visible, false);
      for (const clock of [.5, .7, .85, 1]) {
        const ribbon = lavaRibbon(clock, settings, branch);
        for (let i = 0; i < ribbon.positions.length; i += 3) {
          const [x, y, z] = ribbon.positions.slice(i, i + 3);
          const clearance = y - surfaceHeight(x, z, landform);
          assert.ok(clearance >= .007, `no buried flow at ${landform}:${clock}`);
          if (Math.hypot(x, z) > basin.radius) assert.ok(clearance < .063, `no floating flow at ${landform}:${clock}`);
        }
      }
      assert.deepEqual(lavaRibbon(.85, settings, branch).positions, lavaRibbon(1, settings, branch).positions);
    }
  }
});

test('lava has a closed rounded front and a repeatable material-distance coordinate', () => {
  const settings = { ...PRESETS.flow, landform: 'composite' };
  const branch = lavaBranches(settings)[0], ribbon = lavaRibbon(.72, settings, branch);
  const front = ribbon.positions.slice(-33);
  for (let i = 3; i < front.length; i += 3) {
    assert.ok(Math.hypot(front[i]-front[0], front[i+1]-front[1], front[i+2]-front[2]) < 1e-6);
  }
  assert.equal(ribbon.uvs.at(-2), ribbon.length);
  assert.deepEqual(lavaRibbon(.72, settings, branch), ribbon);
});

test('3D surface products obey the existing connection gate, including stalled intrusion', () => {
  const stalled = { ...PRESETS.fountain, supply: .2, resistance: .9 };
  for (let i = 0; i <= 100; i++) {
    const frame = eruptionFrame(i / 100, stalled);
    assert.equal(frame.clock, 0); assert.equal(frame.intensity, 0);
    assert.equal(frame.lavaVisible, false); assert.deepEqual(frame.ash, []);
  }
  const settings = { ...PRESETS.ash, landform: 'composite' };
  const before = eruptionFrame(.24, settings);
  const erupting = eruptionFrame(.65, settings);
  assert.equal(before.mechanism.connected, false); assert.equal(before.lavaVisible, false);
  assert.equal(erupting.mechanism.connected, true); assert.equal(erupting.lavaVisible, true);
  assert.ok(erupting.ash.some(p => p.density > .1));
  eruptionFrame(1, stalled);
  assert.deepEqual(eruptionFrame(.65, settings), erupting);
});

test('already emitted ash continues upward as the source weakens', () => {
  const a = ashParcels(.83, PRESETS.ash), b = ashParcels(.92, PRESETS.ash);
  assert.ok(b[5].position[1] > a[5].position[1]);
  assert.ok(b[5].density > 0);
  assert.equal(ashParcels(.6, PRESETS.flow).every(p => p.density === 0), true);
});

test('ash scenes share bounded immutable density data and own separate disposable GPU textures', () => {
  const first=ashMaterial(),second=ashMaterial();
  assert.notEqual(first.noise,second.noise);
  assert.equal(first.noise.image.data,second.noise.image.data);
  assert.equal(first.noise.image.data.byteLength,256*1024);
  const data=second.noise.image.data,version=second.noise.version;
  let disposed=0;first.noise.addEventListener('dispose',()=>disposed++);
  first.noise.dispose();first.material.dispose();
  assert.equal(disposed,1);assert.equal(second.noise.version,version);assert.equal(second.noise.image.data,data);
  second.noise.dispose();second.material.dispose();
});


test('finite ash has a connected narrow source at the active review state without adding a thirteenth slot', () => {
  for (const strength of [.32, 1]) {
    const settings = scenarioSettings('strong-ash', { strength, landform: 'scoria' });
    const frame = eruptionFrame(.8252, settings), summit = surfaceHeight(0, 0, 'scoria');
    assert.equal(frame.intensity, 1); assert.equal(frame.ash.length, 12);
    const source = frame.ash.filter(parcel => parcel.source);
    assert.equal(source.length, 1); const stem = source[0];
    const coarse = (y) => frame.ash.reduce((sum, parcel) => {
      if (parcel.radius <= 0) return sum;
      const q = [0, summit + y, 0].map((value, axis) => (value - parcel.position[axis]) / (parcel.radius * parcel.axes[axis]));
      return sum + Math.max(0, 1 - q.reduce((n, v) => n + v * v, 0)) * parcel.density;
    }, 0);
    // The shader returns max(eroded, sourceField * (1.25 + .25 * detail)).
    // These lower bounds therefore survive the second envelope/erosion, not
    // merely an overlap between proxy boxes. Scale the young head with strength.
    const headHeight = strength ** .55 * 2.4;
    for (let dy = .03; dy <= headHeight; dy += .025) {
      assert.ok(coarse(dy) > .035, `passes the first field rejection at ${strength}:${dy}`);
      const q = (summit + dy - stem.position[1]) / (stem.radius * stem.axes[1]);
      const protectedDensity = Math.max(0, 1 - q * q) * stem.density * 1.25;
      assert.ok(protectedDensity > .008, `survives final density erosion at ${strength}:${dy}`);
    }
    assert.ok(stem.radius < .24 && stem.axes[1] > 2);
    assert.ok(stem.position[1] - stem.radius * stem.axes[1] < summit + .02);
    assert.ok(frame.ash.slice(0, 11).some(parcel => parcel.position[1] - parcel.radius * parcel.axes[1] < stem.position[1] + stem.radius * stem.axes[1]));
    const before = JSON.stringify(frame.ash); eruptionFrame(.95, settings); assert.equal(JSON.stringify(eruptionFrame(.8252, settings).ash), before);
  }
});

test('ash source ends with its finite emission window while old emitted packets continue rising', () => {
  const settings = scenarioSettings('strong-ash', { landform: 'scoria' });
  for (const clock of [0, .2, .275, .845, .9, 1]) {
    const parcels = ashParcels(clock, settings); assert.equal(parcels.length, 12);
    assert.ok(parcels.every(parcel => !parcel.source));
  }
  const stopped = ashParcels(.92, settings), earlier = ashParcels(.83, settings);
  assert.ok(stopped[5].density > 0 && stopped[5].position[1] > earlier[5].position[1]);
  assert.ok(ashParcels(.6, { ...settings, strength: 0 }).every(parcel => parcel.density === 0 && !parcel.source));
  assert.ok(ashParcels(.6, PRESETS.flow).every(parcel => parcel.density === 0 && !parcel.source));
  const style = ashMaterial();
  assert.equal(style.uniforms.uAxes.value.length, 12); assert.equal(style.uniforms.uSourceActive.value, 0);
  assert.match(style.material.fragmentShader, /max\(eroded,sourceField\(p\)\*\(1\.25\+\.25\*detail\)\)/, 'fine eroding noise cannot sever an admitted source core');
  for (let clock = .39; clock < .81; clock += .001) {
    const a = ashParcels(clock, settings)[11], b = ashParcels(clock + 1e-5, settings)[11];
    assert.ok(a.source && b.source); assert.ok(Math.abs(a.position[1] - b.position[1]) < .002, 'young guide changes continuously between finite packets');
  }
  style.material.dispose(); style.noise.dispose();
});

test('rebuilding the actual rock group disposes instance buffers separately from its geometry', () => {
  const scene = Object.create(Eruption3DScene.prototype), group = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(1, 0), material = new THREE.MeshBasicMaterial();
  const rock = new THREE.InstancedMesh(geometry, material, 480); group.add(rock); scene.geometries = new Set([geometry]);
  let instances = 0, solids = 0; rock.addEventListener('dispose', () => instances++); geometry.addEventListener('dispose', () => solids++);
  scene.clear(group); scene.clear(group);
  assert.equal(instances, 1); assert.equal(solids, 1); assert.equal(group.children.length, 0); assert.equal(scene.geometries.size, 0);
  material.dispose();
});

test('the actual final scene cleanup releases the boulder instance and geometry exactly once', () => {
  const scene = Object.create(Eruption3DScene.prototype), group = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(1, 0), material = new THREE.MeshBasicMaterial(), rock = new THREE.InstancedMesh(geometry, material, 480);
  group.add(rock); scene.rocks = group; scene.scene = new THREE.Scene(); scene.scene.add(group);
  scene.geometries = new Set([geometry]); scene.materials = new Set([material]); scene.disposed = false;
  scene.stopMotion = () => {}; scene.detailMotion = { dispose() {} }; scene.resizeObserver = { disconnect() {} };scene.presentation=new FrameRender(()=>{});
  scene.controls = { dispose() {} }; scene.canvas = { removeEventListener() {} }; scene.ejecta = { dispose() {} };
  scene.texture = new THREE.Texture(); scene.ash = { noise: new THREE.Texture() };
  scene.sceneTarget = { dispose() {} }; scene.ashTarget = { dispose() {} };
  scene.ashScene = new THREE.Scene(); scene.compositeScene = new THREE.Scene(); scene.renderer = { dispose() {}, forceContextLoss() {} };
  let instances = 0, solids = 0; rock.addEventListener('dispose', () => instances++); geometry.addEventListener('dispose', () => solids++);
  scene.dispose(); scene.dispose(); assert.equal(instances, 1); assert.equal(solids, 1);
});

test('retained lava matches every direct geometry through growth, cooling, rewind and replay',()=>{
  for(const landform of ['scoria','shield','composite'])for(const vents of [1,3]){
    const settings={...PRESETS.flow,landform,vents};
    for(const branch of lavaBranches(settings)){
      const retained=new RetainedLavaRibbon(settings,branch);let mature;
      for(const clock of [0,.25,.35,.42,.56,.72,.82,.86,.95,1,.35,.82]){
        const current=retained.sample(clock),direct=lavaRibbon(clock,settings,branch),{visible,flux,...geometry}=direct;
        assert.deepEqual(current.geometry,geometry);assert.equal(current.visible,visible);assert.equal(current.flux,flux);
        if(clock===.82&&!mature)mature=current.geometry;
        if(clock>.82)assert.equal(current.geometry,mature,'cooling cannot rebuild an unchanged source');
      }
      const same=retained.sample(.82).geometry;assert.equal(retained.sample(.82).geometry,same);
      assert.notEqual(retained.sample(.6).geometry,same,'rewind still changes the front');
    }
  }
});
