import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { oceanUniforms, stoneNoise, stoneMaterial, waterMaterial } from '../materials3d.ts';

test('local water phase variation keeps the same mean plane, optical settings, clock and noise resource', () => {
  const noise = stoneNoise(), ocean = oceanUniforms(), material = waterMaterial(noise, ocean);
  assert.equal(material.uniforms.uStone.value, noise); assert.equal(material.uniforms.uClock, ocean.clock);
  assert.equal(material.uniforms.uDeep, ocean.deep); assert.equal(material.uniforms.uCutaway, ocean.cutaway);
  assert.equal(material.uniforms.uIslandEmergence, ocean.emergence);
  assert.equal(material.depthWrite, false); assert.equal(material.transparent, true);
  assert.doesNotMatch(material.vertexShader, /localWarp|uClock/);
  assert.match(material.fragmentShader, /localWarp=.*filteredGrain/);
  assert.match(material.fragmentShader, /\*2\.4\*medium/);
  assert.match(material.fragmentShader, /localWarp\.x\*\.7-localWarp\.y\*\.5/);
  assert.match(material.fragmentShader, /mix\(\.17,\.98,smoothstep/);
  assert.match(material.fragmentShader, /mix\(teachingOpacity,seaOpacity,uIslandEmergence\)/);
  assert.equal(noise.image.data.byteLength, 32 ** 3);
  material.dispose(); noise.dispose();
});

test('molten surfaces share one independent phase without changing the water or process clock', () => {
  const noise = stoneNoise(), ocean = oceanUniforms(), water = waterMaterial(noise, ocean);
  const styles = ['magma', 'feeder', 'flow', 'pillow', 'basalt', 'extruded', 'ejecta', 'pillow-flow'].map(kind => stoneMaterial(noise, ocean, kind as Parameters<typeof stoneMaterial>[2]));
  const shaders = styles.map(style => {
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
    style.material.onBeforeCompile(shader as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
    return shader as typeof shader & { uniforms: Record<string, THREE.IUniform> };
  });
  for (const [i, shader] of shaders.entries()) {
    assert.equal(shader.uniforms.uDetailPhase, ocean.detailPhase);
    assert.equal(shader.uniforms.uClock, ocean.clock);
    assert.equal(shader.uniforms.uHeat, styles[i].heat);
    assert.equal(shader.uniforms.uFlowLength, styles[i].flowLength);
    assert.equal(shader.uniforms.uFlowFront, styles[i].flowFront);
    assert.equal(shader.uniforms.uFlowFeed, styles[i].flowFeed);
    assert.equal(shader.uniforms.uStone.value, noise);
    assert.equal(shader.uniforms.uIslandEmergence, ocean.emergence);
    assert.equal(styles[i].material.transparent, false);
  }
  ocean.detailPhase.value = Math.PI;
  assert.equal(ocean.clock.value, .08); assert.equal(water.uniforms.uClock.value, .08);
  assert.ok(shaders.every(s => s.uniforms.uDetailPhase.value === Math.PI));
  assert.match(shaders[6].vertexShader, /vShardHeat=oceanHeat;vFreshFace=mix\(1\.,oceanFreshFace,oceanQuench\)/);
  assert.match(shaders[6].vertexShader, /attribute float oceanQuench;/);
  assert.match(shaders[6].fragmentShader, /exposureHeat=uHeat\*vShardHeat/);
  assert.match(shaders[6].fragmentShader, /meltMask=vFreshFace/);
  assert.match(shaders[2].vertexShader, /\(1\.-oceanQuench\)\*endMask/);
  assert.match(shaders[2].fragmentShader, /exposureHeat=uHeat\*\(1\.-vQuench\*\.78\)/);
  assert.match(shaders[2].fragmentShader, /meltMask=mix\(meltMask,\(fracture\*\.30\+seam\*\.16\)/);
  assert.match(shaders[2].fragmentShader, /raftPoint=vec3\(sin\(drift\)/);
  assert.match(shaders[2].fragmentShader, /meltMask=.*1\.-banks\*\.96/);
  assert.match(shaders[7].vertexShader, /attribute float oceanDistance/);
  assert.match(shaders[7].vertexShader, /transformed\.y\+=\.032\*mobility\*fold/);
  assert.match(shaders[7].fragmentShader, /float distance=vDistance/);
  assert.match(shaders[7].fragmentShader, /float mobility=max\(1\.-smoothstep\(\.38,\.96,vQuench\),fedSkin\*\.85\)/);
  assert.match(shaders[7].fragmentShader, /skinAge=vQuench\*\(1\.-fedSkin\*\.76\)/);
  const a = stoneMaterial(noise, ocean, 'pillow', .5, 0), b = stoneMaterial(noise, ocean, 'pillow', .7, 1);
  assert.equal(a.material.customProgramCacheKey(), b.material.customProgramCacheKey());
  const compile = (style: typeof a) => {
    const shader = { uniforms: {} as Record<string, THREE.IUniform>, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
    style.material.onBeforeCompile(shader as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer); return shader;
  };
  const sa = compile(a), sb = compile(b);
  assert.equal(sa.vertexShader, sb.vertexShader); assert.equal(sa.fragmentShader, sb.fragmentShader);
  assert.notEqual(sa.uniforms.uPillowLip.value.x, sb.uniforms.uPillowLip.value.x);
  assert.notEqual(sa.uniforms.uPillowLip.value.y, sb.uniforms.uPillowLip.value.y);
  assert.equal(sa.uniforms.uRockVariation.value, .5); assert.equal(sb.uniforms.uRockVariation.value, .7);
  assert.notEqual(sa.uniforms.uHeat, sb.uniforms.uHeat);
  [...styles, a, b].forEach(s => s.material.dispose()); water.dispose(); noise.dispose();
});
