import test from 'node:test';
import assert from 'node:assert/strict';
import { ashParcels, craterBasin, eruptionFrame, fragmentAt, fragmentSchedule, lavaBranches, lavaRibbon, surfaceHeight, terrainBuffers } from '../eruptionGeometry.ts';
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
