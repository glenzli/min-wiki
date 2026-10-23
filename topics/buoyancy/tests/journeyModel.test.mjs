import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleJourney, DEFAULT_JOURNEY, CHAPTER_DURATION } from '../journeyModel.ts';
import { metalDimensions } from '../metalGeometry.ts';

const frame = overrides => sampleJourney({ ...DEFAULT_JOURNEY, ...overrides });
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance,
  `${actual} should equal ${expected} within ${tolerance}`);

test('initial shore is an open above-water observation with no phantom buoyancy or floor support', () => {
  for (const object of ['log', 'stone', 'coin', 'boat']) {
    const initial = frame({ object });
    assert.equal(initial.beat, 'shore.observe');
    assert.ok(initial.body.bottom > initial.waterY);
    assert.equal(initial.forces.buoyancy, 0);
    assert.equal(initial.forces.support, 0);
    assert.equal(initial.hydro.floating, false);
    assert.equal(initial.hydro.flooded, false);
  }
});

test('the imagined water has the same boundary and buoyancy during replacement in place', () => {
  for (const object of ['log', 'stone', 'coin', 'boat']) {
    for (const salt of [false, true]) {
      const parcel = frame({ chapter: 'water', object, salt, progress: 0.1 });
      const replacing = frame({ chapter: 'water', object, salt, progress: 0.32 });
      const material = frame({ chapter: 'water', object, salt, progress: 0.43 });
      assert.equal(parcel.parcel.opacity, 1);
      assert.equal(parcel.body.opacity, 0);
      assert.equal(material.parcel.opacity, 0);
      assert.equal(material.body.opacity, 1);
      assert.ok(replacing.body.opacity > 0 && replacing.body.opacity < 1);
      for (const current of [parcel, replacing, material]) {
        near(current.parcel.weightN, current.forces.buoyancy);
        near(current.parcel.massG, current.hydro.displacedMassG);
        near(current.body.bottom, parcel.body.bottom);
        near(current.waterY, parcel.waterY);
        near(current.body.opacity + current.parcel.opacity, 1);
        for (const key of ['massG', 'solidVolumeMl', 'displacedMl', 'displacedMassG', 'capacityMl', 'density', 'flooded', 'submergedFraction']) {
          assert.equal(current.hydro[key], parcel.hydro[key]);
        }
        near(current.forces.support, 0);
      }
      if (object !== 'boat') {
        assert.ok(parcel.body.bottom + parcel.body.height < parcel.waterY);
        near(parcel.hydro.displacedMl, parcel.hydro.solidVolumeMl);
      } else {
        assert.ok(parcel.body.bottom < parcel.waterY && parcel.body.bottom + parcel.body.height > parcel.waterY);
        assert.equal(parcel.hydro.flooded, false);
      }
    }
  }
});

test('release lets the same submerged log rise while heavy specimens sink before floor support appears', () => {
  const logStart = frame({ chapter: 'water', progress: 0.43 });
  const logEnd = frame({ chapter: 'water', progress: 1 });
  assert.ok(logEnd.body.bottom > logStart.body.bottom);
  assert.equal(logEnd.hydro.floating, true);
  near(logEnd.forces.buoyancy, logEnd.forces.weight);
  assert.ok(logEnd.hydro.submergedFraction > 0 && logEnd.hydro.submergedFraction < 1);
  for (const object of ['stone', 'coin']) {
    const moving = frame({ chapter: 'water', object, progress: 0.65 });
    const end = frame({ chapter: 'water', object, progress: 1 });
    assert.ok(moving.body.bottom > moving.floorY);
    near(moving.forces.support, 0);
    assert.ok(moving.forces.buoyancy > 0 && moving.forces.buoyancy < moving.forces.weight);
    near(end.body.bottom, end.floorY);
    near(end.forces.buoyancy + end.forces.support, end.forces.weight);
    assert.equal(end.hydro.floating, false);
  }
});

test('whole and molecular pressure lenses retain exactly the same experiment and pose', () => {
  for (const object of ['log', 'stone', 'coin', 'boat']) {
    for (const progress of [0, 0.2, 0.32, 0.6, 1]) {
      const water = frame({ chapter: 'water', object, progress, cargo: 3, salt: true });
      for (const lens of ['whole', 'micro']) {
        const pressure = frame({ chapter: 'pressure', object, progress, cargo: 3, salt: true, lens });
        for (const key of ['kind', 'body', 'parcel', 'hydro', 'forces', 'comparison', 'waterY', 'floorY']) {
          assert.deepEqual(pressure[key], water[key], `${key} persists at ${progress}`);
        }
        assert.equal(pressure.beat, `pressure.${lens}`);
      }
    }
  }
});

test('exact replacement milestone keeps its caption with the actual object fully restored', () => {
  for (const object of ['log', 'stone', 'coin', 'boat']) {
    const current = frame({ chapter: 'water', object, progress: 0.43 });
    const next = frame({ chapter: 'water', object, progress: 0.43 + Number.EPSILON });
    assert.equal(current.beat, 'water.replace');
    assert.equal(next.beat, 'water.release');
    assert.equal(current.comparison, 1);
    assert.equal(current.body.opacity, 1);
    assert.equal(current.parcel.opacity, 0);
    assert.equal(current.body.bottom, next.body.bottom);
    assert.deepEqual(current.forces, next.forces);
    assert.deepEqual(current.hydro, next.hydro);
  }
  const log = frame({ chapter: 'water', progress: 0.43 });
  assert.equal(log.hydro.massG, 300);
  near(log.forces.weight, 300 * 9.81 / 1000);
});

test('exact metal milestones describe completed steps without delaying the following physical phase', () => {
  const milestones = [
    { progress: 0.12, beat: 'metal.solid', next: 'metal.lift', form: 0, bottom: -2.2 },
    { progress: 0.43, beat: 'metal.flatten', next: 'metal.bend', form: 0.5, bottom: 0.65 },
    { progress: 0.63, beat: 'metal.bend', next: 'metal.lower', form: 1, bottom: 0.65 },
  ];
  for (const cargo of [0, 8]) for (const milestone of milestones) {
    const current = frame({ chapter: 'metal', cargo, progress: milestone.progress });
    const next = frame({ chapter: 'metal', cargo, progress: milestone.progress + Number.EPSILON });
    assert.equal(current.beat, milestone.beat);
    assert.equal(next.beat, milestone.next);
    near(current.body.form, milestone.form);
    near(current.body.bottom, milestone.bottom);
    near(current.body.bottom, next.body.bottom);
    assert.deepEqual(current.forces, next.forces);
    assert.deepEqual(current.hydro, next.hydro);
    near(current.hydro.massG, 780 + (milestone.form === 1 ? cargo * 100 : 0));
  }
});

test('the same 780g and 100mL metal sinks, leaves the water, flattens, bends and floats', () => {
  const sunk = frame({ chapter: 'metal', progress: 0.1 });
  assert.equal(sunk.hydro.floating, false);
  near(sunk.body.bottom, sunk.floorY);
  assert.ok(sunk.forces.buoyancy < sunk.forces.weight);
  near(sunk.forces.buoyancy + sunk.forces.support, sunk.forces.weight);
  for (let sample = 0; sample <= 100; sample++) {
    const current = frame({ chapter: 'metal', progress: sample / 100 });
    near(current.hydro.massG, 780);
    near(current.hydro.solidVolumeMl, 100);
    assert.equal(current.body.opacity, 1, 'no disappearance during forming');
    near(current.waterY, 0);
    if (sample >= 27 && sample <= 63) {
      assert.ok(current.body.bottom > current.waterY, 'forming happens out of water');
      near(current.forces.buoyancy, 0);
      near(current.forces.support, 0);
    }
  }
  const flat = frame({ chapter: 'metal', progress: 0.43 });
  near(flat.body.form, 0.5);
  near(flat.body.height, metalDimensions(0.5).thickness);
  const floating = frame({ chapter: 'metal', progress: 1 });
  near(floating.body.form, 1);
  assert.equal(floating.hydro.floating, true);
  near(floating.hydro.displacedMl, 780);
  near(floating.forces.buoyancy, floating.forces.weight);
  near(floating.forces.support, 0);
});

test('cargo changes the finished hull only and flooding excludes its air cavity', () => {
  const selected = 8;
  for (const progress of [0, 0.15, 0.35, 0.55, 0.62]) {
    const current = frame({ chapter: 'metal', progress, cargo: selected });
    assert.equal(current.settings.cargo, selected);
    near(current.hydro.massG, 780);
    near(current.hydro.solidVolumeMl, 100);
    assert.equal(current.hydro.flooded, false);
  }
  let previousDraft = 0;
  for (let cargo = 0; cargo <= 8; cargo++) {
    const current = frame({ chapter: 'metal', progress: 1, cargo });
    near(current.hydro.massG, 780 + cargo * 100);
    near(current.hydro.solidVolumeMl, 100 + cargo * 40);
    near(current.hydro.capacityMl, 1400);
    if (cargo <= 6) {
      assert.equal(current.hydro.floating, true);
      assert.equal(current.hydro.flooded, false);
      near(current.forces.buoyancy, current.forces.weight);
      assert.ok(-current.body.bottom > previousDraft);
      assert.ok(current.body.bottom + current.body.height > current.waterY);
      previousDraft = -current.body.bottom;
    } else {
      assert.equal(current.hydro.floating, false);
      assert.equal(current.hydro.flooded, true);
      near(current.hydro.displacedMl, current.hydro.solidVolumeMl);
      assert.ok(current.hydro.displacedMl < current.hydro.capacityMl);
      near(current.forces.buoyancy + current.forces.support, current.forces.weight);
    }
  }
  for (const object of ['log', 'stone', 'coin']) {
    assert.deepEqual(frame({ object, cargo: 8 }).hydro, frame({ object, cargo: 0 }).hydro);
  }
});

test('an overloaded boat never uses a dry air-cavity parcel or floods before touching water', () => {
  const above = frame({ object: 'boat', cargo: 8, progress: 0 });
  assert.equal(above.hydro.flooded, false);
  near(above.hydro.displacedMl, 0);
  for (const chapter of ['water', 'pressure']) {
    const current = frame({ chapter, object: 'boat', cargo: 8, progress: 0.2 });
    assert.equal(current.hydro.flooded, true);
    near(current.parcel.opacity, 0);
    near(current.body.opacity, 1);
    near(current.hydro.displacedMl, 420);
    near(current.hydro.solidVolumeMl, 420);
  }
});

test('saltwater changes the draft but not a floating specimen or hull weight', () => {
  for (const overrides of [{ object: 'log' }, { object: 'boat', cargo: 5 }, { chapter: 'metal', cargo: 6 }]) {
    const fresh = frame({ ...overrides, progress: 1 });
    const salt = frame({ ...overrides, progress: 1, salt: true });
    near(fresh.hydro.massG, salt.hydro.massG);
    near(fresh.forces.weight, salt.forces.weight);
    assert.ok(salt.hydro.displacedMl < fresh.hydro.displacedMl);
    assert.ok(salt.body.bottom > fresh.body.bottom);
    near(fresh.forces.buoyancy, fresh.forces.weight);
    near(salt.forces.buoyancy, salt.forces.weight);
  }
});

test('timeline seeking is reproducible, finite and continuous through authored joins', () => {
  for (const chapter of ['shore', 'water', 'pressure', 'metal']) {
    assert.ok(CHAPTER_DURATION[chapter] > 0);
    const settings = { chapter, object: 'stone', cargo: 5, salt: true, lens: 'micro' };
    const first = frame({ ...settings, progress: 0.72 });
    frame({ ...settings, progress: 1 });
    frame({ ...settings, progress: 0.12 });
    assert.deepEqual(frame({ ...settings, progress: 0.72 }), first);
    for (const join of chapter === 'metal' ? [0.12, 0.27, 0.43, 0.63, 0.84] : [0.16, 0.22, 0.43, 0.8, 0.84]) {
      const before = frame({ ...settings, progress: join - 1e-7 });
      const after = frame({ ...settings, progress: join + 1e-7 });
      for (const key of ['bottom', 'width', 'height', 'depth', 'form', 'opacity']) near(before.body[key], after.body[key], 0.00001);
      near(before.waterY, after.waterY);
    }
  }
  const clamped = frame({ progress: Infinity, cargo: NaN });
  assert.equal(clamped.settings.progress, 0);
  assert.equal(clamped.settings.cargo, 0);
  assert.ok(Object.values(clamped.forces).every(Number.isFinite));
  assert.equal(frame({ progress: -1, cargo: -4 }).settings.progress, 0);
  assert.equal(frame({ progress: 2, cargo: 99 }).settings.cargo, 8);
});
