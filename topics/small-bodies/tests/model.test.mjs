import test from 'node:test';
import assert from 'node:assert/strict';
import { cometFrame, tailPoint, solveKepler, COMET_ORBIT, earthFrame, reservoirPoints, RESERVOIR_COUNTS,
  specimenRadius, specimenPoint, DISPLAY_RADII, random01, parseState, writeState, DEFAULT_STATE, TAU } from '../model.ts';

const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`);

test('hypothetical orbit solves Kepler with one focus at the Sun and closes at aphelion', () => {
  const {aAU: a, eccentricity: e} = COMET_ORBIT;
  for (let i = 0; i <= 200; i++) {
    const phase = i / 200, M = Math.PI + phase * TAU, E = solveKepler(M, e), f = cometFrame(phase);
    close(E - e * Math.sin(E), M);
    close(f.rAU, a * (1 - e * Math.cos(E)));
    close(((f.x + a * e) / a) ** 2 + (f.z / (a * Math.sqrt(1 - e * e))) ** 2, 1);
  }
  close(cometFrame(0).rAU, a * (1 + e)); close(cometFrame(.5).rAU, a * (1 - e));
  close(cometFrame(1).x, cometFrame(0).x); close(cometFrame(1).z, cometFrame(0).z);
});

test('equal elapsed-time steps move faster near perihelion; sunlight follows inverse square', () => {
  const displacement = (p, q) => {const a=cometFrame(p),b=cometFrame(q);return Math.hypot(a.x-b.x,a.z-b.z)};
  assert.ok(displacement(.5, .501) > displacement(0, .001) * 5);
  for (const phase of [0,.25,.45,.5,.56,.75,1]) {
    const f=cometFrame(phase); close(f.sunlightAtEarth * f.rAU ** 2, 1);
  }
  assert.ok(cometFrame(.5).activity > cometFrame(.3).activity);
  assert.equal(cometFrame(0).activity, 0);
});

test('exposed ice changes activity without changing the same nucleus trajectory', () => {
  for (let i=0;i<=80;i++) {
    const on=cometFrame(i/80,true),off=cometFrame(i/80,false);
    close(on.x,off.x);close(on.z,off.z);close(on.sunlightAtEarth,off.sunlightAtEarth);
    assert.equal(off.activity,0);
    for(const kind of ['ion','dust'])assert.deepEqual(tailPoint(off,1,kind),{x:off.x,z:off.z});
  }
});

test('ion tail stays anti-solar on inbound and outbound arcs; dust curve retains a lag', () => {
  for (const phase of [.42,.46,.5,.54,.58]) {
    const f=cometFrame(phase),ion=tailPoint(f,1,'ion'),dust=tailPoint(f,1,'dust');
    const ix=ion.x-f.x,iz=ion.z-f.z,dx=dust.x-f.x,dz=dust.z-f.z;
    close(ix*f.antiSun.z-iz*f.antiSun.x,0);
    assert.ok(ix*f.antiSun.x+iz*f.antiSun.z>0);
    assert.ok(dx*f.antiSun.x+dz*f.antiSun.z>0);
    assert.ok(Math.abs(dx*f.antiSun.z-dz*f.antiSun.x)>.01);
  }
});

test('forward, reverse, forward scrubbing returns the identical nucleus and tail sample', () => {
  const before=cometFrame(.46);cometFrame(.7);cometFrame(.12);
  assert.deepEqual(cometFrame(.46),before);
  assert.deepEqual(tailPoint(cometFrame(.46),.73,'dust'),tailPoint(before,.73,'dust'));
});

test('Earth enters and leaves a deliberately widened stream on the same comet ellipse', () => {
  const p=COMET_ORBIT.aAU*(1-COMET_ORBIT.eccentricity**2);
  const crossing=Math.acos((p-1)/COMET_ORBIT.eccentricity)/TAU;
  assert.equal(earthFrame(crossing).inStream,true);
  assert.equal(earthFrame(1-crossing).inStream,true);
  assert.equal(earthFrame(.3).inStream,false);
  assert.equal(earthFrame(.5).inStream,false);
  close(earthFrame(crossing).streamGapAU,0);
  let nearest=Infinity;
  for(let i=0;i<=20000;i++){const f=cometFrame(i/20000),earth=earthFrame(crossing);nearest=Math.min(nearest,Math.hypot(f.x-earth.x,f.z-earth.z))}
  assert.ok(nearest<.003);
  close(Math.hypot(earthFrame(.3).x,earthFrame(.3).z),1);
});

test('reservoir points have finite bounded counts, stable identity and qualified radial ranges', () => {
  for(const region of ['main','kuiper','dust','oort']) {
    const points=reservoirPoints(region);assert.equal(points.length,RESERVOIR_COUNTS[region]*3);
    assert.deepEqual(points,reservoirPoints(region));assert.ok(points.every(Number.isFinite));
    for(let i=0;i<points.length;i+=3){
      const radius=region==='oort'?Math.hypot(points[i],points[i+1],points[i+2]):Math.hypot(points[i],points[i+2]);
      const [inner,outer]=region==='main'?[2.1,3.3]:region==='kuiper'?[30,50]:region==='dust'?[.45,4.4]:[5,11];
      assert.ok(radius>=inner-1e-5&&radius<=outer+1e-5);
    }
  }
});

test('illustrative relief remains bounded and deterministic on either side of all specimens', () => {
  for(const specimen of ['carbon','silicate','metal','ceres'])for(let i=0;i<1500;i++){
    const y=2*random01(i)-1,p=TAU*random01(i+100),r=Math.sqrt(1-y*y),x=r*Math.cos(p),z=r*Math.sin(p);
    const value=specimenRadius(x,y,z,specimen);assert.ok(value>.8&&value<1.2);assert.equal(specimenRadius(x,y,z,specimen),value);
  }
});

test('representative rocks stay irregular while Ceres stays near-round, with stable geometry', () => {
  for (const specimen of ['carbon','silicate','metal','ceres']) {
    let smallest=Infinity,largest=0;
    for(let i=0;i<4000;i++) {
      const y=2*random01(i)-1,p=TAU*random01(i+100),r=Math.sqrt(1-y*y),x=r*Math.cos(p),z=r*Math.sin(p);
      const point=specimenPoint(x,y,z,specimen),radius=Math.hypot(point.x,point.y,point.z);
      assert.ok(radius>.6&&radius<1.6);assert.deepEqual(point,specimenPoint(x,y,z,specimen));
      smallest=Math.min(smallest,radius);largest=Math.max(largest,radius);
    }
    assert.ok(specimen==='ceres'?largest/smallest<1.15:largest/smallest>1.3);
  }
});

test('independently enlarged Sun markers preserve the body size order in the same scene', () => {
  let nucleusRadius=0;
  for(let y=-64;y<=64;y++)for(let j=0;j<192;j++) {
    const h=y/64,a=j/192*TAU,r=Math.sqrt(1-h*h),p=specimenPoint(r*Math.cos(a),h,r*Math.sin(a),'carbon');
    nucleusRadius=Math.max(nucleusRadius,Math.hypot(p.x,p.y,p.z)*DISPLAY_RADII.nucleus);
  }
  assert.ok(DISPLAY_RADII.cometSun>nucleusRadius*1.8);
  assert.ok(DISPLAY_RADII.dustSun>DISPLAY_RADII.earthHalo);
  assert.ok(DISPLAY_RADII.earthHalo>DISPLAY_RADII.earth);
});

test('invalid route values are rejected or clamped; unrelated URL state and base survive', () => {
  assert.deepEqual(parseState('?view=no&sample=other&region=unknown&orbit=NaN&light=Infinity&earth=no'),DEFAULT_STATE);
  const low=parseState('?orbit=-9&earth=9&light=-999&ice=0&labels=0');
  assert.equal(low.cometPhase,0);assert.equal(low.earthPhase,1);assert.equal(low.light,-150);assert.equal(low.exposedIce,false);assert.equal(low.labels,false);
  const state={...DEFAULT_STATE,view:'comet',cometPhase:.4507,cometLens:'nucleus',reservoir:'dust'};
  const url=writeState(new URL('https://example.test/encyclopedia/topics/small-bodies/?lang=en&reading=academic#narration'),state);
  assert.equal(url.pathname,'/encyclopedia/topics/small-bodies/');assert.equal(url.searchParams.get('lang'),'en');assert.equal(url.searchParams.get('reading'),'academic');assert.equal(url.hash,'#narration');
  assert.deepEqual(parseState(url.search),state);
});
