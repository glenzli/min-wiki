import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS } from '../model.ts';
import { INTERIORS, interiorAt, layerStop } from '../interior.ts';

const bilingual = (value, context) => {
  assert.deepEqual(Object.keys(value).sort(), ['en', 'zh'], context);
  assert.ok(value.zh.trim().length > 0 && /[\u3400-\u9fff]/u.test(value.zh), `${context}: Chinese`);
  assert.ok(value.en.trim().length > 0 && !/[\u3400-\u9fff]/u.test(value.en), `${context}: English`);
};

test('all eight worlds have complete bilingual evidence and seamless outside-to-center regions', () => {
  assert.deepEqual(Object.keys(INTERIORS).sort(), WORLDS.map(world => world.id).sort());
  for (const [world, profile] of Object.entries(INTERIORS)) {
    bilingual(profile.summary, `${world} summary`); bilingual(profile.evidence, `${world} evidence`);
    assert.ok(profile.sources.length >= 2);
    for (const source of profile.sources) { assert.ok(source.title.trim()); assert.equal(new URL(source.url).protocol, 'https:'); }
    assert.equal(profile.layers[0].outer, 1); assert.equal(profile.layers.at(-1).inner, 0);
    assert.equal(new Set(profile.layers.map(layer => layer.id)).size, profile.layers.length);
    profile.layers.forEach((layer, index) => {
      assert.ok(Number.isFinite(layer.inner) && Number.isFinite(layer.outer));
      assert.ok(layer.inner >= 0 && layer.inner < layer.outer && layer.outer <= 1);
      assert.match(layer.color, /^#[0-9a-f]{6}$/i);
      if (index) assert.equal(layer.outer, profile.layers[index - 1].inner, `${world}: no gap or overlap`);
      for (const key of ['name', 'kids', 'science']) bilingual(layer[key], `${world}/${layer.id}/${key}`);
      assert.ok(layer.uncertain === undefined || typeof layer.uncertain === 'boolean');
    });
  }
});

test('every preset selects its own region and the last preset reaches the exact center', () => {
  for (const [world, profile] of Object.entries(INTERIORS)) {
    assert.equal(interiorAt(world, 0), profile.layers[0]);
    assert.equal(interiorAt(world, 1), profile.layers.at(-1));
    let previous = -1;
    profile.layers.forEach((layer, index) => {
      const stop = layerStop(world, index); assert.ok(stop > previous && stop <= 1); previous = stop;
      assert.equal(interiorAt(world, stop), layer);
    });
    assert.equal(layerStop(world, profile.layers.length - 1), 1);
  }
});

test('continuous descent encounters adjacent regions without gaps or jumping across interfaces', () => {
  for (const [world, profile] of Object.entries(INTERIORS)) {
    for (let index = 0; index < profile.layers.length - 1; index++) {
      const boundary = 1 - profile.layers[index].inner;
      assert.equal(interiorAt(world, boundary - 1e-8), profile.layers[index]);
      assert.equal(interiorAt(world, boundary), profile.layers[index + 1]);
      assert.equal(interiorAt(world, boundary + 1e-8), profile.layers[index + 1]);
    }
    let previous = 0;
    for (let step = 0; step <= 10000; step++) {
      const current = profile.layers.indexOf(interiorAt(world, step / 10000));
      assert.ok(current >= previous && current - previous <= 1); previous = current;
    }
    assert.equal(previous, profile.layers.length - 1);
  }
});

test('invalid progress, index and stale selector input still return bounded usable state', () => {
  for (const world of [...WORLDS.map(w => w.id), 'obsolete-world', '__proto__']) {
    for (const value of [NaN, Infinity, -Infinity, -12, 0, .34, 1, 99]) {
      assert.ok(interiorAt(world, value)?.name.en);
      const stop = layerStop(world, value); assert.ok(Number.isFinite(stop) && stop >= 0 && stop <= 1);
    }
  }
  assert.equal(interiorAt('earth', -1), INTERIORS.earth.layers[0]);
  assert.equal(interiorAt('earth', 2), INTERIORS.earth.layers.at(-1));
});

test('surface liquids do not become fictitious thick global interior shells', () => {
  assert.equal(INTERIORS.earth.layers[0].id, 'crust');
  assert.equal(INTERIORS.titan.layers[0].id, 'ice-shell');
  for (const world of ['earth', 'titan']) assert.ok(INTERIORS[world].layers.every(layer => !/^(ocean|water|hydrocarbon|lake|sea)$/i.test(layer.id)));
  assert.match(INTERIORS.earth.summary.en, /surface basins/i);
  assert.match(INTERIORS.titan.layers[0].science.en, /local surface liquids/i);
  const mantle = INTERIORS.earth.layers.find(layer => layer.id === 'upper-mantle');
  assert.match(mantle.science.en, /mostly solid/i);
  assert.match(INTERIORS.earth.layers.at(-1).name.en, /solid/i);
});

test('recent Titan and Mars evidence and a dilute Jovian center keep their uncertainty boundaries', () => {
  const titanDeep = INTERIORS.titan.layers.find(layer => layer.id === 'high-pressure-ice');
  assert.equal(titanDeep.uncertain, true); assert.match(titanDeep.science.en, /2025/);
  assert.match(titanDeep.science.en, /possible local melt/);
  assert.match(INTERIORS.titan.evidence.en, /challenged a global subsurface ocean/);
  const marsInner = INTERIORS.mars.layers.at(-1); assert.equal(marsInner.id, 'inner-core'); assert.equal(marsInner.uncertain, true);
  assert.match(marsInner.science.en, /2025/); assert.match(INTERIORS.mars.evidence.en, /earlier core models differ/);
  const jovianCenter = INTERIORS.jupiter.layers.at(-1); assert.equal(jovianCenter.id, 'dilute-core'); assert.equal(jovianCenter.uncertain, true);
  assert.match(jovianCenter.science.en, /not a rigid shell/);
});

test('unknown cores, Neptune mixtures and Cancri melt depth cannot be presented as uniquely measured layers', () => {
  assert.equal(INTERIORS.venus.layers.at(-1).uncertain, true);
  assert.match(INTERIORS.venus.layers.at(-1).science.en, /not uniquely determined/);
  assert.ok(INTERIORS.neptune.layers.slice(-2).every(layer => layer.uncertain));
  assert.match(INTERIORS.neptune.summary.en, /water-rich and rock-rich/);
  assert.ok(INTERIORS.cancri.layers.every(layer => layer.uncertain));
  assert.match(INTERIORS.cancri.layers[0].science.en, /not a known sea floor/);
  assert.match(INTERIORS.cancri.layers[0].science.en, /not a globally uniform molten shell/);
  assert.match(INTERIORS.cancri.layers.at(-1).science.en, /candidate, not a unique result/);
});
