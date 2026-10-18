import test from 'node:test';
import assert from 'node:assert/strict';
import { isSoftwareRenderer, SOFTWARE_VOLUME_PIXELS, volumePixelRatio } from '../renderPolicy.ts';

test('known software drivers receive a bounded volume buffer while hardware retains its requested detail', () => {
  for (const name of ['ANGLE (Google, SwiftShader Device (Subzero)), SwiftShader driver', 'llvmpipe (LLVM)', 'Software Renderer']) assert.equal(isSoftwareRenderer(name), true);
  for (const name of ['ANGLE (Apple, Apple M2)', 'ANGLE (Intel, Iris Xe)', '']) assert.equal(isSoftwareRenderer(name), false);
  for (const [width, height, dpr] of [[912, 520, 1], [1440, 1000, 2], [358, 365, 3], [120, 80, 1]]) {
    const hardware = volumePixelRatio(width, height, dpr, false);
    assert.equal(hardware, Math.min(dpr, 1.5));
    const software = volumePixelRatio(width, height, dpr, true);
    assert.ok(width * height * software ** 2 <= SOFTWARE_VOLUME_PIXELS + 1e-8);
    assert.ok(software > 0 && software <= hardware);
    // Uniform sampling preserves the scene's aspect ratio rather than cropping it.
    assert.ok(Math.abs(width * software / (height * software) - width / height) < 1e-12);
  }
});

test('a temporarily hidden scene has a finite policy and can recover its real size', () => {
  assert.equal(volumePixelRatio(0, 0, 2, true), 1.5);
  assert.ok(Number.isFinite(volumePixelRatio(912, 520, NaN, true)));
  assert.equal(volumePixelRatio(120, 80, 1, true), 1);
});
