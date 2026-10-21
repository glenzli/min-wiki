import test from 'node:test';
import assert from 'node:assert/strict';
import { oceanUniforms, stoneNoise, waterMaterial } from '../materials3d.ts';

test('local water phase variation keeps the same mean plane, optical settings, clock and noise resource', () => {
  const noise = stoneNoise(), ocean = oceanUniforms(), material = waterMaterial(noise, ocean);
  assert.equal(material.uniforms.uStone.value, noise); assert.equal(material.uniforms.uClock, ocean.clock);
  assert.equal(material.uniforms.uDeep, ocean.deep); assert.equal(material.uniforms.uCutaway, ocean.cutaway);
  assert.equal(material.depthWrite, false); assert.equal(material.transparent, true);
  assert.doesNotMatch(material.vertexShader, /localWarp|uClock/);
  assert.match(material.fragmentShader, /localWarp=.*filteredGrain/);
  assert.match(material.fragmentShader, /\*2\.4\*medium/);
  assert.match(material.fragmentShader, /localWarp\.x\*\.7-localWarp\.y\*\.5/);
  assert.match(material.fragmentShader, /mix\(\.17,\.98,smoothstep/);
  assert.equal(noise.image.data.byteLength, 32 ** 3);
  material.dispose(); noise.dispose();
});
