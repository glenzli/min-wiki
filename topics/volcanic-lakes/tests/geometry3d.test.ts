import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { supportRelief } from '../supportGeometry3d.ts';
import { basinDimensions, formationProgress, waterFraction, type Settings } from '../model.ts';
import { ANGLES, BOTTOM, EXTENT, LAYERS, SCALE, SECTION_EXPOSED_START, SOLID_ACROSS, SOLID_DEPTH, PISTON_EDGE, PISTON_UNITS, MUSH_FLOOR, PISTON_TRAVEL, mushFloor, COLLAPSE_BLOCKS, blockBuffers, blockPolygon, blockAt, blockMotion, blockOffset, roofOffset, updateBlocks, storageCellBuffers, WALL_SITES, WALL_CLASTS, wallScar, wallFailure, clastSource, depositBuffers, updateDeposit, basementBuffers, pistonBase, pistonContact, pistonDrop, pistonBuffers, pistonRadius, pistonTrace, pistonTracks, updateStorage, boulderPose, cameraPose, cutRelief, faultBuffers, faultCutDepth, faultPath, intrusionBuffers, horizon, lakeFrame, landscapeBuffers, planform, sectionBuffers, shoreRadius, shoreline, storageBuffers, storageDistance, surfaceBuffers, surfaceHeight, updateFault, updateFaultCut, updateSection, updateSurface, updateWater, waterBuffers, waterSectionBuffers, worldY, type Buffers } from '../geometry3d.ts';

const settings: Settings = { basin: 'caldera', supply: .75, leak: 'low' };
const close = (a: number, b: number, epsilon = 1e-5) => assert.ok(Math.abs(a - b) < epsilon, `${a} differs from ${b}`);

test('3D frame keeps the model clock, branch and relative-depth contract', () => {
  for (const basin of ['caldera', 'crater'] as const) for (const p of [0, .13, .23, .36, .46, .48, .7, 1]) {
    const input = { ...settings, basin }, frame = lakeFrame(p, input), d = basinDimensions(basin);
    assert.equal(frame.fraction, waterFraction(p, input)); assert.equal(frame.formation, formationProgress(p, basin));
    close(frame.waterLevel, worldY(d.floor - d.maxDepth * frame.fraction)); close(frame.radius, d.radius * SCALE);
    if (p <= .48) assert.equal(frame.fraction, 0);
  }
  const early = lakeFrame(.23, settings), initial = lakeFrame(0, settings);
  assert.ok(early.withdrawal > 0); assert.ok(early.fracture > 0); assert.equal(early.subsidence, 0);
  for (const [x, z] of [[0, 0], [2, -1], [-4, -1]]) close(surfaceHeight(x, z, early), surfaceHeight(x, z, initial));
  assert.ok(surfaceHeight(0, 0, lakeFrame(.36, settings)) < surfaceHeight(0, 0, early));
});

test('dry basins stay dry with zero supply or losses exceeding input', () => {
  for (const basin of ['caldera', 'crater'] as const) for (const p of [.48, .65, 1]) {
    for (const input of [{ ...settings, basin, supply: 0 }, { ...settings, basin, leak: 'high' as const }]) {
      const frame = lakeFrame(p, input); assert.equal(frame.fraction, 0);
      assert.equal(shoreRadius(0, frame), 0); assert.equal(shoreRadius(Math.PI / 2, frame), 0);
    }
  }
});

test('caldera subsidence leaves the outer flanks in place', () => {
  const before = lakeFrame(0, settings), after = lakeFrame(1, settings);
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI * 2, r = before.radius * 1.25;
    close(surfaceHeight(Math.cos(a) * r, Math.sin(a) * r, before), surfaceHeight(Math.cos(a) * r, Math.sin(a) * r, after));
  }
  assert.ok(after.radius > lakeFrame(1, { ...settings, basin: 'crater' }).radius * 2);
});

test('each shoreline point meets its own terrain and leaves wet bed inside', () => {
  for (const basin of ['caldera', 'crater'] as const) for (const p of [.51, .65, 1]) {
    const frame = lakeFrame(p, { ...settings, basin, supply: 1 });
    const edge = shoreline(frame); assert.equal(edge.length, ANGLES + 1);
    for (let i = 0; i < edge.length; i++) {
      const [x, y, z] = edge[i]; close(surfaceHeight(x, z, frame), y, 2e-5);
      assert.ok(Math.hypot(x, z) < frame.radius * 1.1);
      for (const u of [0, .2, .5, .8, .98]) assert.ok(surfaceHeight(x * u, z * u, frame) <= frame.waterLevel + 2e-5);
    }
    close(edge[0][0], edge.at(-1)![0]); close(edge[0][2], edge.at(-1)![2]);
    // The maximum water plane remains below the irregular rim everywhere.
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * Math.PI * 2, r = frame.radius * planform(a);
      assert.ok(surfaceHeight(Math.cos(a) * r, Math.sin(a) * r, frame) > frame.waterLevel);
    }
  }
});

test('retained terrain, section and water buffers have bounded valid topology', () => {
  for (const basin of ['caldera', 'crater'] as const) {
    const frame = lakeFrame(.72, { ...settings, basin });
    for (const data of [surfaceBuffers(frame), waterBuffers(frame), waterSectionBuffers(frame), ...Array.from({ length: LAYERS }, (_, i) => sectionBuffers(i, frame))]) {
      assert.ok(data.positions.length < 30000); assert.equal(data.indices.length % 3, 0);
      assert.equal(data.uvs.length / 2, data.positions.length / 3);
      for (const n of data.positions) assert.ok(Number.isFinite(n));
      for (const index of data.indices) assert.ok(Number.isInteger(index) && index >= 0 && index < data.positions.length / 3);
    }
    for (let i = 0; i < 120; i++) {
      const x = -EXTENT + i / 119 * EXTENT * 2;
      for (let unit = 0; unit < LAYERS; unit++) {
        assert.ok(horizon(unit, x, frame) >= horizon(unit + 1, x, frame));
        assert.ok(horizon(unit + 1, x, frame) >= BOTTOM);
      }
    }
  }
});

test('water depth and cut-face volume use the same submerged bed', () => {
  const frame = lakeFrame(1, settings), plan = waterBuffers(frame), cap = waterSectionBuffers(frame);
  for (let i = 0; i < plan.positions.length; i += 3) {
    const [x, minusZ, plane] = plan.positions.slice(i, i + 3); assert.equal(plane, 0);
    close(plan.depths![i / 3], Math.max(0, frame.waterLevel - surfaceHeight(x, -minusZ, frame)));
  }
  for (let i = 0; i < cap.positions.length; i += 6) {
    close(cap.positions[i + 1], frame.waterLevel);
    close(cap.positions[i + 4], surfaceHeight(cap.positions[i], 0, frame));
    assert.ok(cap.positions[i + 4] <= cap.positions[i + 1] + 1e-5);
  }
});

test('deep horizons subside for caldera, while the smaller crater has no caldera displacement', () => {
  const before = lakeFrame(0, settings), after = lakeFrame(1, settings);
  assert.ok(horizon(3, 0, after) < horizon(3, 0, before) - 4);
  const craterBefore = lakeFrame(0, { ...settings, basin: 'crater' }), craterAfter = lakeFrame(1, { ...settings, basin: 'crater' });
  close(horizon(8, 0, craterBefore), horizon(8, 0, craterAfter));
  assert.equal(craterAfter.fracture, 0); assert.equal(craterAfter.subsidence, 0); assert.equal(craterAfter.withdrawal, 0);
});

test('rewinding and replaying overwrite the retained buffers deterministically', () => {
  const target = lakeFrame(.72, settings), prior = lakeFrame(.23, settings);
  const land = surfaceBuffers(target), section = sectionBuffers(2, target), water = waterBuffers(target);
  const snapshot = [land.positions.slice(), section.positions.slice(), water.positions.slice(), water.depths!.slice()];
  updateSurface(land.positions, prior); updateSection(section, 2, prior); updateWater(water.positions, water.depths!, prior);
  updateSurface(land.positions, target); updateSection(section, 2, target); updateWater(water.positions, water.depths!, target);
  [land.positions, section.positions, water.positions, water.depths!].forEach((buffer, i) => assert.deepEqual(buffer, snapshot[i]));
});

test('landscape continuation meets the retained terrain without a raised disk edge', () => {
  for (const basin of ['caldera', 'crater'] as const) {
    const frame = lakeFrame(.85, { ...settings, basin }), distant = landscapeBuffers(frame);
    for (let i = 0; i <= ANGLES; i++) {
      const [x, y, z] = distant.positions.slice(i * 3, i * 3 + 3);
      close(Math.hypot(x, z), EXTENT); close(y, surfaceHeight(x, z, frame));
    }
  }
});

test('default camera fits actual wide and portrait stages without small-model framing', () => {
  for (const view of ['section', 'landscape'] as const) for (const aspect of [1104 / 364, 340 / 510]) {
    for (const p of [.13, .23, .36, .72, .85]) {
      const frame = lakeFrame(p, settings), pose = cameraPose(frame, view, aspect);
      const camera = new PerspectiveCamera(37, aspect, .1, 160);
      camera.position.set(...pose.position); camera.lookAt(new Vector3(...pose.target)); camera.updateMatrixWorld();
      const projected = pose.points.map(point => new Vector3(...point).project(camera));
      for (const point of projected) { assert.ok(Math.abs(point.x) < .865); assert.ok(Math.abs(point.y) < .865); }
      const width = (Math.max(...projected.map(point => point.x)) - Math.min(...projected.map(point => point.x))) / 2;
      // The caldera section retains the entire pre-collapse roof and basement:
      // on a 3:1 stage that geological history is constrained by height.
      if (view === 'section' && aspect > 2 && p >= .72) assert.ok(width > .50, `historical section fills only ${width * 100}%`);
      if (view === 'landscape' && aspect < 1) assert.ok(width > .74, `portrait lake fills only ${width * 100}%`);
    }
  }
});

test('newly exposed closed section bands retain valid normals after subsidence', () => {
  for (let unit = 0; unit < LAYERS; unit++) {
    const data = sectionBuffers(unit, lakeFrame(0, settings));
    for (const progress of [.13, .23, .36, .72, .85, 1, .23, .85]) {
      updateSection(data, unit, lakeFrame(progress, settings));
      for (let i = 0; i < data.normals!.length; i += 3) {
        const length = Math.hypot(...data.normals!.slice(i, i + 3));
        close(length, 1); assert.ok(Number.isFinite(length));
      }
    }
  }
});

function signedVolume(data: Buffers) {
  const p = data.positions; let volume = 0;
  for (let i = 0; i < data.indices.length; i += 3) {
    const a = data.indices[i] * 3, b = data.indices[i + 1] * 3, c = data.indices[i + 2] * 3;
    volume += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) + p[a + 1] * (p[b + 2] * p[c] - p[b] * p[c + 2]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
  }
  return volume;
}
function pairedEdges(data: Buffers, weld = false) {
  const ids = new Map<string, number>(), mapped: number[] = [], counts = new Map<string, number>();
  for (let i = 0; i < data.positions.length; i += 3) {
    const key = [...data.positions.slice(i, i + 3)].map(value => Math.round(value * 1e5)).join(',');
    if (!ids.has(key)) ids.set(key, ids.size); mapped.push(ids.get(key)!);
  }
  for (let i = 0; i < data.indices.length; i += 3) {
    const triangle = data.indices.slice(i, i + 3), actual = weld ? triangle.map(index => mapped[index]) : triangle;
    if (new Set(actual).size < 3) continue;
    for (let j = 0; j < 3; j++) {
      const a = actual[j], b = actual[(j + 1) % 3], key = a < b ? `${a}:${b}` : `${b}:${a}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.values()];
}

test('rock units have closed finite depth and shared upper/lower contacts', () => {
  const frame = lakeFrame(0, settings);
  for (const unit of [0, 3, 7, 10]) {
    const data = sectionBuffers(unit, frame);
    assert.ok(signedVolume(data) > 1); assert.ok([...data.positions].some((value, i) => i % 3 === 2 && value < -4));
    for (const count of pairedEdges(data, true)) assert.equal(count, 2);
    if (unit + 1 < LAYERS) {
      const next = sectionBuffers(unit + 1, frame);
      const contact = (body: Buffers, t: number) => {
        const points = new Map<string, number[]>();
        for (let i = 0; i < body.samples!.length; i += 4) if (body.samples![i + 2] === t) {
          const key = `${body.samples![i]},${body.samples![i + 1]}`; points.set(key, [...body.positions.slice(i / 4 * 3, i / 4 * 3 + 3)]);
        }
        return points;
      };
      assert.deepEqual(contact(data, 1), contact(next, 0));
    }
  }
});

test('filled mush is a closed connected volume, bounded and reproducible', () => {
  const data = storageBuffers(), ids = new Map<string, number>(), mapped: number[] = [];
  for (let i = 0; i < data.positions.length; i += 3) {
    const key = [...data.positions.slice(i, i + 3)].map(v => Math.round(v * 1e5)).join(',');
    if (!ids.has(key)) ids.set(key, ids.size); mapped.push(ids.get(key)!);
  }
  const parents = Array.from({ length: ids.size }, (_, i) => i);
  const find = (i: number): number => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; };
  for (let i = 0; i < data.indices.length; i += 3) {
    const [a, b, c] = data.indices.slice(i, i + 3).map(index => mapped[index]); parents[find(b)] = find(a); parents[find(c)] = find(a);
  }
  assert.equal(new Set(parents.map((_, i) => find(i))).size, 1);
  for (let id = 0; id < COLLAPSE_BLOCKS.length; id++) for (const edges of pairedEdges(storageCellBuffers(id, lakeFrame(0, settings)), true)) assert.equal(edges, 2);
  assert.ok(signedVolume(data) > 10); assert.ok(data.positions.length < 120000);
  assert.ok(storageDistance(.26, -1.77, 0) < 0); assert.ok(storageDistance(0, 3.1, 0) > 0);
  assert.deepEqual(data.positions, storageBuffers().positions);
});

test('intrusive sheet and rock-filled fault bands are closed positive volumes', () => {
  const frame = lakeFrame(.36, settings);
  for (const data of [intrusionBuffers(frame), faultBuffers(-1, frame), faultBuffers(1, frame)]) {
    assert.ok(signedVolume(data) > .01); for (const edges of pairedEdges(data)) assert.equal(edges, 2);
    for (const value of data.positions) assert.ok(Number.isFinite(value));
  }
  const data = faultBuffers(-1, frame), snapshot = data.positions.slice();
  updateFault(data, -1, lakeFrame(.23, settings)); updateFault(data, -1, frame); assert.deepEqual(data.positions, snapshot);
});

test('roof contacts translate together before local slump and never move in fracture-only stage', () => {
  const before = lakeFrame(0, settings), fractured = lakeFrame(.23, settings), moving = lakeFrame(.36, settings);
  for (const unit of [1, 2, 3, 4]) {
    close(horizon(unit, 0, fractured), horizon(unit, 0, before));
    close(horizon(unit, EXTENT * .8, moving), horizon(unit, EXTENT * .8, before));
  }
  close(horizon(2, 0, moving) - horizon(2, 0, before), horizon(3, 0, moving) - horizon(3, 0, before));
  for (const frame of [fractured, moving, lakeFrame(.72, settings)]) for (const z of [-3, -1, 0]) for (let i = 0; i < 200; i++) {
    const x = -EXTENT + i / 199 * EXTENT * 2;
    for (let unit = 0; unit < LAYERS; unit++) assert.ok(horizon(unit, x, frame, z) >= horizon(unit + 1, x, frame, z));
  }
});

test('wall clasts remain at their source before release and settle on the same terrain', () => {
  const prior = lakeFrame(.23, settings), final = lakeFrame(.72, settings);
  for (let i = 0; i < WALL_CLASTS; i++) {
    const source = clastSource(i, prior), before = boulderPose(i, prior), pose = boulderPose(i, final);
    assert.equal(before.travel, 0); close(before.position[0], source.position[0]); close(before.position[2], source.position[2]);
    close(before.position[1] + before.size * .7, surfaceHeight(before.position[0], before.position[2], prior)); assert.equal(pose.source, source.siteId); assert.equal(pose.travel, 1);
    close(pose.position[1], surfaceHeight(pose.position[0], pose.position[2], final) + pose.size * .45);
    assert.deepEqual(pose, boulderPose(i, lakeFrame(.72, { ...settings, supply: 0, leak: 'high' })));
    assert.ok(Math.hypot(pose.position[0], pose.position[2]) < source.radius);
  }
});

test('exposed drawing range contains cut and cavity walls, never coarse buried roofs', () => {
  const frame = lakeFrame(.48, settings);
  for (const basin of ['crater', 'caldera'] as const) for (const unit of [0, 3, 7, 10]) {
    const data = sectionBuffers(unit, lakeFrame(.48, { ...settings, basin }));
    const start = data.exposedStart ?? SECTION_EXPOSED_START; assert.ok(start < data.indices.length);
    for (const index of data.indices.slice(start)) {
      const x = data.positions[index * 3], y = data.positions[index * 3 + 1], z = data.positions[index * 3 + 2];
      if (data.samples) {
        const sample = data.samples.slice(index * 4, index * 4 + 4), radius = Math.hypot(sample[0], sample[1]);
        assert.ok(sample[3] === 1 || Math.abs(radius - EXTENT) < 1e-5 || Math.abs(radius - pistonRadius(Math.atan2(sample[1], sample[0]))) < 1e-5);
      } else assert.ok(Math.abs(z - cutRelief(x, y)) < 1e-5 || Math.abs(Math.hypot(x, z) - EXTENT) < 1e-5);
    }
    assert.ok(signedVolume(data) >= 0);
  }
});

test('finite irregular source blocks retain their layers while differentially descending', () => {
  const middle = lakeFrame(.36, settings), motions = COLLAPSE_BLOCKS.map((_, id) => blockMotion(id, middle).drop);
  assert.ok(Math.max(...motions) - Math.min(...motions) > 1);
  for (let id = 0; id < COLLAPSE_BLOCKS.length; id++) for (let unit = 0; unit < PISTON_UNITS; unit++) for (const half of [true, false]) {
    const data = blockBuffers(unit, id, half), source = data.positions.slice(), volume = signedVolume(data);
    for (const count of pairedEdges(data, true)) assert.equal(count, 2);
    for (const p of [.13, .23, .36, .48, .85, .23, .48]) {
      const frame = lakeFrame(p, settings); updateBlocks(data, frame);
      for (let i = 0; i < data.positions.length; i += 3) {
        close(data.positions[i], source[i]);
        const recessed = half && data.samples![i / 3 * 4 + 3] ? faultCutDepth(data.samples![i / 3 * 4], data.positions[i + 1], frame) : 0;
        close(data.positions[i + 2], source[i + 2] - recessed);
        close(data.positions[i + 1] - source[i + 1], blockOffset(id, data.samples![i / 3 * 4], data.samples![i / 3 * 4 + 1], frame));
      }
      if (volume > .01) {
        if (!half) assert.ok(Math.abs(signedVolume(data) - volume) / volume < .01);
        else assert.ok(signedVolume(data) > 0 && signedVolume(data) <= volume * 1.01, 'the teaching cut can expose a recessed edge, while the whole-lake solid retains volume');
      }
    }
    const snapshot = data.positions.slice(); updateBlocks(data, lakeFrame(.23, settings)); updateBlocks(data, lakeFrame(.48, settings)); assert.deepEqual(data.positions, snapshot);
  }
});

test('support remains below the moving roof with only bounded local separation', () => {
  for (const p of [.13, .23, .36, .48, .85]) for (let id = 0; id < COLLAPSE_BLOCKS.length; id++) {
    const frame = lakeFrame(p, settings), mush = storageCellBuffers(id, frame);
    for (let i = 0; i < mush.samples!.length; i += 4) {
      const [x, z, t] = mush.samples!.slice(i, i + 3), y = mush.positions[i / 4 * 3 + 1], roof = pistonBase(x, z) + blockOffset(id, x, z, frame);
      assert.ok(y >= mushFloor(x, z) - 1e-5); assert.ok(y <= roof + 1e-5);
      if (t === 0) {
        assert.ok(roof - y <= 1.041); assert.ok(y > mushFloor(x, z) + .10);
        if (supportRelief(x, z) === 0 || p >= .48) close(y, roof);
      }
    }
  }
});

test('original roof and layer traces identify the same material after translation', () => {
  const frame = lakeFrame(.36, settings), drop = pistonDrop(frame);
  for (const unit of [0, 1, 2]) {
    const original = pistonTrace(unit, frame, true), current = pistonTrace(unit, frame);
    current.forEach((point, i) => { close(point[0], original[i][0]); close(point[2], original[i][2]); close(point[1] - original[i][1], roofOffset(point[0], 0, frame)); });
  }
  const tracks = pistonTracks(frame); for (let i = 0; i < tracks.length; i += 2) close(tracks[i + 1][1] - tracks[i][1], roofOffset(tracks[i][0], 0, frame));
});


test('fault damage is clipped to the current terrain rather than projecting above it', () => {
  for (const p of [.13, .23, .36, .48, .85]) for (const side of [-1, 1] as const) {
    const frame = lakeFrame(p, settings), data = faultBuffers(side, frame);
    for (let i = 0; i < data.positions.length - 6; i += 3) assert.ok(data.positions[i + 1] <= surfaceHeight(data.positions[i], data.positions[i + 2], frame) + 1e-5);
    for (let i = 0; i < data.normals!.length; i += 3) close(Math.hypot(...data.normals!.slice(i, i + 3)), 1);
  }
});

test('fault cut has finite relief and terminates at the tracked roof base', () => {
  for (const p of [.23, .30, .36, .44, .48]) for (const side of [-1, 1] as const) {
    const frame = lakeFrame(p, settings), edge = side * pistonRadius(side < 0 ? Math.PI : 0), path = faultPath(side, frame);
    assert.ok(path.at(-1)![1] > mushFloor(edge), 'fault marker must not run through the entire basement');
    close(path.at(-1)![1], pistonBase(edge) + roofOffset(edge, 0, frame) - .10);
    assert.equal(faultCutDepth(edge, mushFloor(edge) - .2, frame), 0);
    assert.equal(faultCutDepth(edge + side * .3, 2.8, frame), 0);
  }
  const frame = lakeFrame(.23, settings), cut = blockBuffers(2, 1), snapshot = cut.positions.slice();
  updateFaultCut(cut, frame); assert.ok(cut.positions.some((v, i) => i % 3 === 2 && v < snapshot[i] - .05));
  updateFaultCut(cut, lakeFrame(0, settings)); assert.deepEqual(cut.positions, snapshot);
  const full = blockBuffers(2, 1, false), original = full.positions.slice(); updateFaultCut(full, frame); assert.deepEqual(full.positions, original);
  for (const unit of [0, 2, 8]) {
    const host = sectionBuffers(unit, lakeFrame(0, settings)), direct = sectionBuffers(unit, frame);
    updateFaultCut(host, frame); assert.deepEqual(host.positions, direct.positions);
    updateSection(host, unit, lakeFrame(.36, settings)); updateSection(host, unit, frame);
    assert.deepEqual(host.positions, direct.positions);
  }
});

test('wall scars, fresh source sites and persistent deposits share staged failures', () => {
  const before = lakeFrame(.23, settings), middle = lakeFrame(.36, settings), after = lakeFrame(.48, settings);
  assert.equal(wallScar(0, -4.4, before), 0);
  for (let id = 0; id < WALL_SITES.length; id++) {
    const site = WALL_SITES[id], r = after.radius * planform(site.angle) * .932, x = Math.cos(site.angle) * r, z = Math.sin(site.angle) * r;
    assert.ok(wallScar(x, z, after) > site.depth * .95); assert.equal(wallFailure(id, before), 0);
    assert.ok(wallFailure(id, after) >= wallFailure(id, middle));
  }
  const data = depositBuffers(after), snapshot = data.positions.slice();
  assert.ok(data.depths!.some(depth => depth > .02)); updateDeposit(data, before); assert.ok(data.depths!.every(depth => depth === 0));
  updateDeposit(data, after); assert.deepEqual(data.positions, snapshot);
});


test('caldera section retains one geological camera frame and the complete original roof', () => {
  for (const aspect of [1104 / 364, 340 / 510]) {
    const source = cameraPose(lakeFrame(0, settings), 'section', aspect);
    for (const p of [.13, .23, .27, .36, .48, .85, 1]) {
      const frame = lakeFrame(p, settings), pose = cameraPose(frame, 'section', aspect);
      assert.deepEqual(pose.position, source.position); assert.deepEqual(pose.target, source.target);
      const camera = new PerspectiveCamera(37, aspect, .1, 160);
      camera.position.set(...pose.position); camera.lookAt(new Vector3(...pose.target)); camera.updateMatrixWorld();
      for (const unit of [0, 1, 2]) for (const original of [true, false]) for (const point of pistonTrace(unit, frame, original)) {
        const projected = new Vector3(...point).project(camera);
        assert.ok(Math.abs(projected.x) < .865 && Math.abs(projected.y) < .865, 'tracked roof or its original outline left the reference frame');
      }
    }
  }
});


test('visible rear source windows cut scallops between buttresses and leave thick talus', () => {
  const frame = lakeFrame(.48, settings);
  const at = (angle: number, u: number) => { const r = frame.radius * planform(angle) * u; return surfaceHeight(Math.cos(angle) * r, Math.sin(angle) * r, frame); };
  for (const id of [1, 2, 3]) {
    const site = WALL_SITES[id], shoulders = (at(site.angle - site.width * 1.85, .958) + at(site.angle + site.width * 1.85, .958)) / 2;
    assert.ok(at(site.angle, .958) < shoulders - .5, 'the failed wall must retreat behind its residual buttresses');
  }
  const deposit = depositBuffers(frame); assert.ok(Math.max(...deposit.depths!) > .5);
  const dry = lakeFrame(.48, { ...settings, supply: 0, leak: 'high' });
  assert.deepEqual(deposit.positions, depositBuffers(dry).positions); // Deposits are not made by lake water.
});

test('retained spatial terms match direct terrain evaluation through seek and replay', () => {
  const data = surfaceBuffers(lakeFrame(0, settings));
  for (const p of [.13, .23, .30, .33, .36, .40, .46, .85, .23, .36]) {
    const frame = lakeFrame(p, settings); updateSurface(data.positions, frame);
    for (let i = 0; i < data.positions.length; i += 33) close(data.positions[i + 1], surfaceHeight(data.positions[i], data.positions[i + 2], frame), 2e-6);
  }
});

test('bounded block slips include rests and preserve the original final destination', () => {
  for (let id = 0; id < COLLAPSE_BLOCKS.length; id++) {
    const block = COLLAPSE_BLOCKS[id], phase = (t: number) => blockMotion(id, { ...lakeFrame(0, settings), subsidence: block.start + t * (block.end - block.start) });
    close(phase(.23).drop, phase(.27).drop); assert.ok(phase(.50).drop - phase(.35).drop > block.travel * .2);
    let previous = 0;
    for (let i = 0; i <= 100; i++) { const motion = phase(i / 100); assert.ok(motion.drop >= previous - 1e-10 && motion.drop <= block.travel + 1e-10); previous = motion.drop; }
    const final = blockMotion(id, lakeFrame(.48, settings)); close(final.drop, block.travel); close(final.tx, block.tx); close(final.tz, block.tz);
  }
});

test('source-linked moving clasts remain finite and deterministically settle after bounded rolling', () => {
  for (const id of [0, 6, 33, 68, 99, 130, 191]) {
    const final = boulderPose(id, lakeFrame(.48, settings)), source = clastSource(id, lakeFrame(0, settings));
    assert.equal(final.source, source.siteId); assert.equal(final.travel, 1);
    close(final.position[1], surfaceHeight(final.position[0], final.position[2], lakeFrame(.48, settings)) + final.size * .45);
    for (const p of [.30, .33, .36, .40, .44]) { const pose = boulderPose(id, lakeFrame(p, settings)); assert.ok(pose.position.every(Number.isFinite)); assert.ok(pose.travel >= 0 && pose.travel <= 1); }
    const replay = boulderPose(id, lakeFrame(.36, settings)); boulderPose(id, lakeFrame(.48, settings)); assert.deepEqual(boulderPose(id, lakeFrame(.36, settings)), replay);
  }
});

test('delayed wall fragments remain attached until their own continuous release and rewind', () => {
  const base = lakeFrame(0, settings);
  for (const id of [6, 33, 68, 99, 130, 148, 191]) {
    const source = clastSource(id, base), site = WALL_SITES[source.siteId];
    assert.ok(source.start >= site.start && source.start <= site.start + .045);
    const at = (subsidence: number) => ({ ...base, subsidence });
    for (const sub of [0, site.start, (site.start + source.start) * .5, source.start - 1e-7, source.start]) {
      const frame = at(Math.max(0, sub)), pose = boulderPose(id, frame);
      assert.equal(pose.travel, 0); close(pose.position[0], source.position[0]); close(pose.position[2], source.position[2]);
      close(pose.position[1] + pose.size * .7, surfaceHeight(pose.position[0], pose.position[2], frame));
    }
    close(source.position[1], surfaceHeight(source.position[0], source.position[2], at(source.start)));
    const before = boulderPose(id, at(source.start - 1e-7)), release = boulderPose(id, at(source.start)), after = boulderPose(id, at(source.start + 1e-7));
    assert.ok(Math.hypot(...before.position.map((value, i) => value - release.position[i])) < 1e-4);
    assert.ok(Math.hypot(...after.position.map((value, i) => value - release.position[i])) < 1e-4);
    const end = boulderPose(id, lakeFrame(.48, settings)); assert.equal(end.travel, 1); assert.equal(end.source, source.siteId); assert.equal(end.size, source.size);
    close(end.position[1], surfaceHeight(end.position[0], end.position[2], lakeFrame(.48, settings)) + source.size * .45);
    const replay = boulderPose(id, at(source.start - .003));
    boulderPose(id, at(1)); boulderPose(id, at(0)); assert.deepEqual(boulderPose(id, at(source.start - .003)), replay);
  }
  const observed = lakeFrame(.39772222222222225, settings), pose = boulderPose(148, observed);
  assert.equal(pose.travel, 0); close(pose.position[1] + pose.size * .7, surfaceHeight(pose.position[0], pose.position[2], observed));
});
