import test from 'node:test';
import assert from 'node:assert/strict';
import { litFraction, moonPosition, SYNODIC_DAYS, SIDEREAL_DAYS, DISTANCE_EARTH_RADII, MOON_EARTH_RADIUS_RATIO } from '../model.ts';
test('phase geometry matches new, quarter and full Moon', () => {
  for (const [p, expected] of [[0, 0], [.25, .5], [.5, 1], [.75, .5], [1, 0]]) assert.ok(Math.abs(litFraction(p) - expected) < 1e-12);
});
test('illustrative orbit is continuous and separate from true display scale', () => {
  for (let i = 0; i <= 100; i++) assert.ok(Math.abs(Math.hypot(...moonPosition(i / 100)) - 11) < 1e-10);
  assert.ok(DISTANCE_EARTH_RADII > 60 && DISTANCE_EARTH_RADII < 61);
  assert.ok(MOON_EARTH_RADIUS_RATIO > .27 && MOON_EARTH_RADIUS_RATIO < .28);
  assert.ok(SYNODIC_DAYS > SIDEREAL_DAYS);
});

// Continuous scrubbing must wrap to the next new Moon, not leave the last-quarter story selected.
test('phase neighborhoods agree with quarter landmarks and wrap at a full cycle', async () => {
  const { phaseIndex } = await import('../model.ts');
  assert.deepEqual([0, .125, .25, .375, .5, .625, .75, .875, 1].map(phaseIndex), [0,1,2,3,4,5,6,7,0]);
});

test('Earth observer frame is orthonormal and consistently faces the same lunar side', async () => {
  const { moonObserverFrame } = await import('../model.ts');
  const dot = (a,b) => a.reduce((s,v,i) => s+v*b[i],0);
  for(let i=0;i<=100;i++) {
    const p=i/100, f=moonObserverFrame(p), m=moonPosition(p,1);
    for(const v of [f.right,f.up,f.towardEarth]) assert.ok(Math.abs(dot(v,v)-1)<1e-12);
    assert.ok(Math.abs(dot(f.right,f.towardEarth))<1e-12);
    assert.ok(Math.abs(dot(f.towardEarth,m)+1)<1e-12);
    assert.ok(Math.abs((1+f.sunLocal[2])/2-litFraction(p))<1e-12);
  }
});
test('north-up waxing is lit on the right and waning on the left', async () => {
  const { moonObserverFrame } = await import('../model.ts');
  assert.ok(moonObserverFrame(.25).sunLocal[0]>.999);
  assert.ok(moonObserverFrame(.75).sunLocal[0]<-.999);
  assert.ok(moonObserverFrame(.5).sunLocal[2]>.999);
  assert.ok(moonObserverFrame(0).sunLocal[2]<-.999);
});
test('the lunar map central meridian is turned onto the Earth-facing +z axis', async () => {
  const { LUNAR_MAP_ROTATION } = await import('../model.ts');
  // Three SphereGeometry at u=.5 lies on +x before the texture-bearing mesh rotation.
  const mapped = [Math.cos(LUNAR_MAP_ROTATION),0,-Math.sin(LUNAR_MAP_ROTATION)];
  assert.ok(Math.abs(mapped[0])<1e-12); assert.equal(mapped[2],1);
});

test('Three lookAt and the observer projection use exactly the same Sun basis', async () => {
  const THREE = await import('three');
  const { moonObserverFrame } = await import('../model.ts');
  for(const p of [0,.125,.25,.5,.75,.875,1]) {
    const moon = new THREE.Object3D(); moon.position.set(...moonPosition(p)); moon.lookAt(0,0,0);
    const localSun = new THREE.Vector3(-1,0,0).applyQuaternion(moon.quaternion.clone().invert());
    assert.ok(localSun.distanceTo(new THREE.Vector3(...moonObserverFrame(p).sunLocal))<1e-12);
  }
});
