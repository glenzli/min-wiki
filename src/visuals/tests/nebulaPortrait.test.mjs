import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createNebulaPortrait } from '../nebulaPortrait.ts';

function fixture(id) {
  const portrait = createNebulaPortrait(id);
  const mesh = portrait.group.children[0], material = mesh.material;
  const texture = material.uniforms.field.value;
  const { data, width: size } = texture.image;
  const at = (x, y, z, channel = 0) => {
    const index = p => Math.max(0, Math.min(size - 1, Math.round((p + 1) * .5 * (size - 1))));
    return data[((index(z) * size + index(y)) * size + index(x)) * 4 + channel] / 255;
  };
  return { ...portrait, mesh, material, texture, data, size, at, release() {
    portrait.dispose(); mesh.geometry.dispose(); material.dispose();
  } };
}

test('nebula gas and dust are retained three-dimensional volumes with empty bounding faces', () => {
  for (const id of ['nebula', 'planetary-nebula', 'remnant']) {
    const p = fixture(id);
    try {
      assert.equal(p.group.children.length, 1);
      assert.ok(p.texture instanceof THREE.Data3DTexture);
      assert.equal(p.texture.image.width, p.texture.image.height);
      assert.equal(p.texture.image.depth, p.size);
      assert.ok(p.data.byteLength <= 1_500_000);
      assert.equal(p.material.side, THREE.BackSide, 'one far-face pass avoids integrating a ray twice');
      assert.equal(p.material.depthWrite, false, 'a transparent volume must not paint an opaque depth box');
      assert.equal(p.material.blending, THREE.NormalBlending, 'dust must obscure light from behind');
      assert.equal(p.material.premultipliedAlpha, true);
      assert.ok(p.material.defines.STEPS <= 64);
      for (let a = 0; a < p.size; a++) for (let b = 0; b < p.size; b++) {
        for (const [x, y, z] of [[0, a, b], [p.size - 1, a, b], [a, 0, b], [a, p.size - 1, b], [a, b, 0], [a, b, p.size - 1]]) {
          const offset = ((z * p.size + y) * p.size + x) * 4;
          assert.ok(p.data.subarray(offset, offset + 4).every(value => value === 0), 'bounding faces are visually empty');
        }
      }
      if (id === 'nebula') {
        assert.ok(p.at(-.02, 0, .26, 2) > .35, 'a foreground dust trunk is actually present');
        assert.ok(p.at(.45, -.10, .05, 1) > .03, 'luminous gas is spatially separate from the dust trunk');
        assert.equal(p.material.uniforms.sourceCount.value, 3);
      } else {
        assert.ok(p.at(0, 0, 0) < .01, 'a shell must have a hollow centre');
        assert.ok(p.at(.73, 0, 0) > .03, 'the shell contains actual off-centre material');
        assert.equal(p.material.uniforms.sourceCount.value, id === 'planetary-nebula' ? 1 : 0,
          'a compact central source is not compulsory in a supernova remnant');
        if (id === 'planetary-nebula') {
          for (let z = -.75; z <= .75; z += .05) assert.ok(p.at(0, 0, z) < .01, 'the representative barrel has an open axial cavity');
          assert.ok(p.at(.70, 0, .30) > .03, 'a barrel side wall extends through depth');
        }
      }
    } finally { p.release(); }
  }
});

test('turning or scaling a nebula changes the local orthographic ray while preserving its density field', () => {
  const p = fixture('nebula');
  try {
    const before = createHash('sha256').update(p.data).digest('hex');
    const world = new THREE.Scene(), camera = new THREE.OrthographicCamera(-600, 600, 250, -250, .1, 5000);
    camera.position.set(0, 0, 2000); camera.updateMatrixWorld(true);
    world.add(p.group); p.group.position.set(-250, 10, 0); p.group.scale.setScalar(160);
    p.group.rotation.set(.3, .7, -.06); world.updateMatrixWorld(true);
    p.mesh.onBeforeRender(null, world, camera, null, null, null);
    const ray = p.material.uniforms.localDirection.value;
    const expected = new THREE.Vector3(0, 0, -1).transformDirection(p.mesh.matrixWorld.clone().invert());
    assert.ok(ray.distanceTo(expected) < 1e-10);
    assert.ok(Math.abs(ray.length() - 1) < 1e-10);
    assert.equal(p.material.uniforms.orthographic.value, 1);
    p.group.rotation.y += 1; world.updateMatrixWorld(true);
    p.mesh.onBeforeRender(null, world, camera, null, null, null);
    assert.ok(ray.distanceTo(expected) > .3);
    assert.equal(createHash('sha256').update(p.data).digest('hex'), before);
    const again = fixture('nebula');
    try { assert.equal(createHash('sha256').update(again.data).digest('hex'), before); }
    finally { again.release(); }
  } finally { p.release(); }
});

test('the remnant has broken, uneven sheets while the planetary shell stays coherent', () => {
  const profiles = [];
  for (const id of ['planetary-nebula', 'remnant']) {
    const p = fixture(id), radii = [], masses = [];
    try {
      for (let j = 0; j < 120; j++) {
        const angle = j * Math.PI * 2 / 120, dx = Math.cos(angle), dy = Math.sin(angle);
        let mass = 0, moment = 0;
        for (let r = .35; r < 1.05; r += .01) {
          const density = p.at(dx * r * .96, dy * r * (id === 'planetary-nebula' ? .85 : .82), 0);
          mass += density; moment += density * r;
        }
        assert.ok(mass > 0);
        radii.push(moment / mass); masses.push(mass);
      }
      radii.sort((a, b) => a - b);
      const mean = masses.reduce((sum, mass) => sum + mass, 0) / masses.length;
      const variation = Math.sqrt(masses.reduce((sum, mass) => sum + (mass - mean) ** 2, 0) / masses.length) / mean;
      profiles.push({ width: radii[114] - radii[6], variation });
    } finally { p.release(); }
  }
  assert.ok(profiles[1].width > profiles[0].width * 2, 'ragged remnant sheets have genuinely uneven radii');
  assert.ok(profiles[1].variation > profiles[0].variation * 1.5, 'remnant gaps vary the integrated material distribution');
});

test('the texture disposer is idempotent and leaves geometry and materials with the caller', () => {
  const p = fixture('supernova-remnant');
  let textures = 0, fineTextures = 0, materials = 0, geometries = 0;
  p.texture.addEventListener('dispose', () => textures++);
  p.material.uniforms.fineField.value.addEventListener('dispose', () => fineTextures++);
  p.material.addEventListener('dispose', () => materials++);
  p.mesh.geometry.addEventListener('dispose', () => geometries++);
  p.dispose(); p.dispose();
  assert.deepEqual({ textures, fineTextures, materials, geometries }, { textures: 1, fineTextures: 1, materials: 0, geometries: 0 });
  p.release();
  assert.deepEqual({ textures, fineTextures, materials, geometries }, { textures: 1, fineTextures: 1, materials: 1, geometries: 1 });
});

test('a supplied topic medium retains its bytes and identity across illumination and shell openings', () => {
  const data = new Uint8Array(24 ** 3 * 4), p = createNebulaPortrait('nebula', { medium: { resolution: 24, data }, steps: 48, depthTest: false });
  const mesh = p.group.children[0], material = mesh.material, field = material.uniforms.field.value;
  try {
    assert.equal(field.image.data, data); assert.equal(material.defines.STEPS, 48);
    assert.equal(material.depthTest, false);
    const original = data.slice(), geometry = mesh.geometry;
    p.setAppearance({ illumination: 'reflection', structure: 'planetary', cutaway: true, cutZ: .024, accent: '#bd3bda', sources: [[.4, .1, 0]], lightPosition: [.4, .1, 0] });
    assert.equal(material.uniforms.illumination.value, 1); assert.equal(material.uniforms.cutaway.value, 1);
    assert.equal(material.uniforms.cutZ.value, .024); assert.equal(material.uniforms.sourceCount.value, 1);
    assert.deepEqual(material.uniforms.sources.value[0].toArray(), [.4, .1, 0]);
    assert.ok(material.uniforms.accent.value.equals(new THREE.Color('#bd3bda')));
    assert.equal(material.uniforms.structure.value, 1);
    assert.deepEqual(data, original); assert.equal(mesh.geometry, geometry);
    p.setAppearance({ illumination: 'dark', structure: 'cloud', cutaway: false, sources: [] });
    assert.equal(material.uniforms.illumination.value, 2); assert.equal(material.uniforms.sourceCount.value, 0);
    assert.equal(material.uniforms.structure.value, 0);
    const version = field.version; data[700] = 135; p.updateMedium();
    assert.equal(field.image.data, data); assert.equal(field.image.data[700], 135); assert.equal(field.version, version + 1);
    p.dispose(); const disposedVersion = field.version; p.updateMedium();
    assert.equal(field.version, disposedVersion);
  } finally { p.dispose(); mesh.geometry.dispose(); material.dispose(); }
});

test('invalid externally supplied volumes fail before creating a renderer or uploading a texture', () => {
  assert.throws(() => createNebulaPortrait('nebula', { medium: { resolution: 8, data: new Uint8Array(8 ** 3 * 4) } }), /16–64/);
  assert.throws(() => createNebulaPortrait('nebula', { medium: { resolution: 24, data: new Uint8Array(10) } }), /RGBA/);
});
