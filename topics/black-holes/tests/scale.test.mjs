import test from 'node:test';
import assert from 'node:assert/strict';
import { AU_KM, SCALE_HOLES, SCALE_STOPS, horizonRadiusKm, worldRadiusKm, zoomProgress, niceScale, SCALE_REFERENCES, referenceComparison, comparisonGeometry } from '../scaleModel.ts';
import { CHAPTERS, readChapter } from '../routes.ts';
import { COMPARISON_REFERENCES, DISK_OUTER_HORIZON_RADII, horizonMicroarcseconds } from '../scaleModel.ts';
import { bodies } from '../../cosmic-scale/comparisonModel.ts';

test('scale chapter is routable without changing existing encounter routes', () => {
  assert.deepEqual(CHAPTERS, ['anatomy', 'star', 'planet', 'companion', 'scale']);
  assert.equal(readChapter('?chapter=scale&lang=en'), 'scale');
});
test('Schwarzschild radii scale linearly with sourced rounded masses, not optical shadow sizes', () => {
  const [stellar, sag, m87] = SCALE_HOLES.map(hole => horizonRadiusKm(hole.mass));
  assert.ok(Math.abs(stellar * 2 - 59.065) < .001);
  assert.ok(Math.abs(sag / AU_KM - .07897) < .0001);
  assert.ok(m87 / AU_KM > 128 && m87 / AU_KM < 129);
  assert.equal(sag / stellar, 400_000);
  assert.ok(m87 / (30.07 * AU_KM) > 4.2 && m87 / (30.07 * AU_KM) < 4.3);
});
test('zoom is monotonic, invertible and clamped; the same physical ruler spans each frame', () => {
  let previous = 0;
  for (let i = 0; i <= 100; i++) {
    const p = i / 100, radius = worldRadiusKm(p);
    assert.ok(radius > previous); previous = radius;
    assert.ok(Math.abs(zoomProgress(radius) - p) < 1e-12);
    const ruler = niceScale(radius / 3);
    assert.ok(ruler > 0 && ruler <= radius / 3);
    assert.ok(ruler >= radius / 3 / 5);
  }
  assert.equal(worldRadiusKm(-1), worldRadiusKm(0));
  assert.equal(worldRadiusKm(2), worldRadiusKm(1));
  assert.ok(Math.abs(worldRadiusKm(SCALE_STOPS[1]) - 100_000_000) < 1);
});
test('familiar references compare diameters or stipulated spans, not radii with diameters', () => {
  assert.equal(SCALE_REFERENCES[0].spanKm, 50);
  assert.equal(SCALE_REFERENCES[1].spanKm, 1_391_400);
  assert.equal(SCALE_REFERENCES[2].spanKm, 60.14 * AU_KM);
  assert.ok(Math.abs(referenceComparison(0).ratio - 1.1813) < .0001);
  assert.ok(Math.abs(referenceComparison(1).ratio - 16.98) < .01);
  assert.ok(referenceComparison(2).ratio > 4.2 && referenceComparison(2).ratio < 4.3);
});
test('paired comparison fits narrow screens without altering either physical size', () => {
  for(const width of [280,326,650,900])for(const index of [0,1,2]){
    const g=comparisonGeometry(index,width);
    assert.ok(Math.abs(g.holePixels/g.referencePixels-g.ratio)<1e-12);
    assert.ok(g.holePixels <= width*.36 && g.holePixels <= 160.0001);
    assert.ok(g.referencePixels > 5);
    assert.ok(width*.25-g.holePixels/2>0);
    assert.ok(width*.75+g.referencePixels/2<width);
  }
});

test('selectable stellar references reuse cosmic radii and keep true ratios with an optional disk', () => {
  for (const body of bodies) assert.equal(COMPARISON_REFERENCES.find(ref => ref.id === body.id).spanKm, 2 * body.radius);
  for (const width of [280, 650, 1100]) for (const index of [0, 1, 2]) for (const ref of COMPARISON_REFERENCES) {
    const bare = comparisonGeometry(index, width, ref.id);
    const disk = comparisonGeometry(index, width, ref.id, true);
    assert.equal(disk.diameterKm, bare.diameterKm);
    assert.equal(disk.ratio, bare.ratio);
    assert.ok(Math.abs(disk.holePixels / disk.referencePixels / disk.ratio - 1) < 1e-12);
    assert.ok(disk.holePixels * DISK_OUTER_HORIZON_RADII <= width * .36 + 1e-10);
    assert.ok(disk.holePixels * DISK_OUTER_HORIZON_RADII <= 160 + 1e-10);
    assert.ok(disk.referencePixels <= 160 + 1e-10);
  }
});

test('galaxy comparisons preserve subpixel horizons rather than enforcing a visible minimum size', () => {
  const comparison = comparisonGeometry(2, 650, 'milky-way');
  assert.ok(comparison.holePixels < .00001);
  assert.ok(comparison.reference.spanKm / comparison.diameterKm > 20_000_000);
  assert.deepEqual(referenceComparison(1, 'unknown'), referenceComparison(1));
});

test('a farther larger horizon can have a smaller angular diameter; low-mass sizes remain conditional', () => {
  const sag = horizonMicroarcseconds(4_000_000, 27_000);
  const m87 = horizonMicroarcseconds(6_500_000_000, 55_000_000);
  assert.ok(sag > 19 && sag < 20);
  assert.ok(m87 > 15 && m87 < 16);
  assert.ok(m87 < sag);
  assert.ok(2 * horizonRadiusKm(2.5) > 14 && 2 * horizonRadiusKm(2.5) < 15);
  assert.ok(2 * horizonRadiusKm(4.5) > 26 && 2 * horizonRadiusKm(4.5) < 27);
});
