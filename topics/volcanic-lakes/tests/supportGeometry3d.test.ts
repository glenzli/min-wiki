import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORT_POCKETS, fractureRecess, refineSectionPerimeter, supportRelief, supportSeparation } from '../supportGeometry3d.ts';
import { blockAt, blockOffset, lakeFrame, mushFloor, pistonBase, storageBuffers, supportContact, updateStorage } from '../geometry3d.ts';

const settings = { basin: 'caldera' as const, supply: .75, leak: 'low' as const };

test('local support pockets have separate mouths, side shoulders and a closed rear', () => {
  for (const pocket of SUPPORT_POCKETS) {
    assert.ok(supportRelief(pocket.x, 0) > pocket.height * .65);
    assert.equal(supportRelief(pocket.x, pocket.z - pocket.depth), 0);
    assert.equal(supportRelief(pocket.x, -1.5), 0);
  }
  for (const x of [-3.4, -1.5, .4, 2.8, 3.7]) assert.equal(supportRelief(x, 0), 0);
  for (let x = -4; x <= 4; x += .13) for (let z = -4; z <= 0; z += .13) {
    assert.ok(supportRelief(x, z) >= 0 && supportRelief(x, z) <= 1.04);
    if (z < -1.3) assert.equal(supportRelief(x, z), 0);
  }
});

test('withdrawal precedes local opening and the same block phase closes it completely', () => {
  assert.equal(supportSeparation(1, 0, 0), 0); assert.equal(supportSeparation(1, .14, 0), 0);
  assert.ok(supportSeparation(1, 1, .5) > .99);
  assert.ok(supportSeparation(1, 1, .8) > supportSeparation(1, 1, .95));
  assert.equal(supportSeparation(1, 1, 1), 0);
  const frame = lakeFrame(.36, settings);
  assert.ok(SUPPORT_POCKETS.some(p => {
    const roof = pistonBase(p.x) + blockOffset(blockAt(p.x, 0), p.x, 0, frame);
    return roof - supportContact(p.x, 0, frame) > .4;
  }), 'a mid-collapse opening must remain visible beneath a retained block');
  for (const p of [0, .23, .28, .32, .36, .40, .44, .48, .85]) for (const pocket of SUPPORT_POCKETS) {
    const state = lakeFrame(p, settings), roof = pistonBase(pocket.x) + blockOffset(blockAt(pocket.x, 0), pocket.x, 0, state), contact = supportContact(pocket.x, 0, state);
    assert.ok(contact <= roof && contact > mushFloor(pocket.x) + .1);
    if (p === 0 || p >= .48) assert.ok(Math.abs(contact - roof) < 1e-9);
  }
});

test('retained support top samples actual recesses and replays without new topology', () => {
  const state = lakeFrame(.36, settings), data = storageBuffers(state), p = data.positions.slice(), count = data.positions.length;
  let open = 0, touch = 0;
  for (let i = 0; i < data.samples!.length; i += 4) {
    const x = data.samples![i], z = data.samples![i + 1], t = data.samples![i + 2];
    if (t !== 0 || Math.abs(z) > 1e-7) continue;
    const y = data.positions[i / 4 * 3 + 1], roof = pistonBase(x, z) + blockOffset(data.blockIds![i / 4], x, z, state);
    if (roof - y > .18) open++; else if (Math.abs(roof - y) < 1e-5) touch++;
  }
  assert.ok(open > 8 && touch > 4, 'cutaway must resolve both openings and intact contacts');
  for (const progress of [.23, .48, 0, .85, .36]) updateStorage(data, lakeFrame(progress, settings));
  assert.equal(data.positions.length, count); assert.deepEqual(data.positions, p);
  assert.ok(data.normals!.every(Number.isFinite));
});

test('cutaway perimeter refinement retains the same polygon and closes short section edges', () => {
  const source: [number, number][] = [[-2, 0], [-1, -2], [1, -2], [2, 0]], refined = refineSectionPerimeter(source);
  for (const p of source) assert.ok(refined.some(q => p[0] === q[0] && p[1] === q[1]));
  for (let i = 0; i < refined.length; i++) {
    const a = refined[i], b = refined[(i + 1) % refined.length];
    if (a[1] === 0 && b[1] === 0) assert.ok(Math.abs(a[0] - b[0]) <= .160001);
  }
});

test('a fracture recess has a finite mouth, variable floor and bounded lower end', () => {
  assert.equal(fractureRecess(0, 1, 4, -2, 0), 0);
  assert.equal(fractureRecess(.25, 1, 4, -2, 1), 0);
  assert.equal(fractureRecess(0, -2.2, 4, -2, 1), 0);
  assert.equal(fractureRecess(0, 4.2, 4, -2, 1), 0);
  assert.ok(fractureRecess(0, 1, 4, -2, 1) > .45);
  assert.ok(fractureRecess(.18, 1, 4, -2, 1) < fractureRecess(.04, 1, 4, -2, 1));
  assert.notEqual(fractureRecess(0, 1, 4, -2, 1), fractureRecess(0, 1.15, 4, -2, 1));
});
