import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPECTRUM_COLORS,
  OPTICAL_MEDIA,
  calcRefractionAngle,
  calcCauchyIndex,
  calcPrimaryRainbowAngle,
  calcSecondaryRainbowAngle,
  calcDescartesImpactParameter
} from '../data/rainbowData.ts';
import { STORIES, ACADEMIC, stageAt } from '../story.ts';

test('Snell law refraction and total internal reflection', () => {
  // Normal incidence
  assert.equal(calcRefractionAngle(0, 1.0, 1.333), 0.0);

  // Air to Water (30° incidence)
  const deg30 = Math.PI / 6;
  const refAngle = calcRefractionAngle(deg30, 1.0, 1.333);
  assert.ok(refAngle !== null);
  const refDeg = (refAngle * 180) / Math.PI;
  assert.ok(Math.abs(refDeg - 22.08) < 0.1, '30° in air refracts to ~22.08° in water');

  // Water to Air Total Internal Reflection (critical angle is ~48.6°)
  const deg60 = Math.PI / 3;
  const tir = calcRefractionAngle(deg60, 1.333, 1.0);
  assert.equal(tir, null, '60° from water to air must trigger Total Internal Reflection');
});

test('Cauchy dispersion monotonicity across visible spectrum', () => {
  assert.equal(SPECTRUM_COLORS.length, 7, '7 spectrum colors (Red to Violet)');

  for (let i = 1; i < SPECTRUM_COLORS.length; i++) {
    const prev = SPECTRUM_COLORS[i - 1];
    const curr = SPECTRUM_COLORS[i];

    // Wavelength decreases (Red 680nm -> Violet 410nm)
    assert.ok(curr.wavelengthNm < prev.wavelengthNm, 'Wavelength must decrease towards violet');

    // Refractive index in water increases monotonically (Normal dispersion)
    assert.ok(curr.waterIndex > prev.waterIndex, 'Water refractive index must increase towards violet');

    // Refractive index in glass increases monotonically
    assert.ok(curr.glassIndex > prev.glassIndex, 'Glass refractive index must increase towards violet');
  }
});

test('Descartes primary rainbow maximum angle and color order (42° Red vs 40° Violet)', () => {
  const red = SPECTRUM_COLORS.find(c => c.id === 'red');
  const violet = SPECTRUM_COLORS.find(c => c.id === 'violet');

  assert.ok(red && violet);

  // Red (n = 1.3312)
  const bRedCrit = calcDescartesImpactParameter(red.waterIndex);
  const thetaRedMax = calcPrimaryRainbowAngle(bRedCrit, red.waterIndex);
  assert.ok(Math.abs(thetaRedMax - 42.3) < 0.1, 'Primary rainbow red peak is ~42.3°');

  // Verify that thetaRedMax is indeed a local maximum
  const thetaLower = calcPrimaryRainbowAngle(bRedCrit - 0.1, red.waterIndex);
  const thetaHigher = calcPrimaryRainbowAngle(bRedCrit + 0.08, red.waterIndex);
  assert.ok(thetaRedMax > thetaLower, 'Angle must be lower at b < b_crit');
  assert.ok(thetaRedMax > thetaHigher, 'Angle must be lower at b > b_crit');

  // Violet (n = 1.3435)
  const bVioletCrit = calcDescartesImpactParameter(violet.waterIndex);
  const thetaVioletMax = calcPrimaryRainbowAngle(bVioletCrit, violet.waterIndex);
  assert.ok(Math.abs(thetaVioletMax - 40.6) < 0.1, 'Primary rainbow violet peak is ~40.6°');

  // Primary Rainbow is Red on outside, Violet on inside
  assert.ok(thetaRedMax > thetaVioletMax, 'Red exit angle > Violet exit angle ==> Red is on outside of arc');
});

test('Descartes secondary rainbow (霓) minimum angle and color reversal (50° Red vs 53° Violet)', () => {
  const red = SPECTRUM_COLORS.find(c => c.id === 'red');
  const violet = SPECTRUM_COLORS.find(c => c.id === 'violet');

  assert.ok(red && violet);

  // Secondary Red (n = 1.3312)
  const bRed2Crit = Math.sqrt((9 - red.waterIndex * red.waterIndex) / 8);
  const thetaRed2Min = calcSecondaryRainbowAngle(bRed2Crit, red.waterIndex);
  assert.ok(Math.abs(thetaRed2Min - 50.4) < 0.15, 'Secondary rainbow red peak is ~50.4°');

  // Secondary Violet (n = 1.3435)
  const bViolet2Crit = Math.sqrt((9 - violet.waterIndex * violet.waterIndex) / 8);
  const thetaViolet2Min = calcSecondaryRainbowAngle(bViolet2Crit, violet.waterIndex);
  assert.ok(Math.abs(thetaViolet2Min - 53.6) < 0.15, 'Secondary rainbow violet peak is ~53.6°');

  // In Secondary Rainbow, Violet has greater deflection angle than Red (Color order is reversed!)
  assert.ok(thetaViolet2Min > thetaRed2Min, 'In secondary rainbow, Violet is outside (53.6°) and Red is inside (50.4°)');

  // Alexander's Dark Band: Forbidden zone between primary max and secondary min
  const darkBandGap = thetaRed2Min - 42.3;
  assert.ok(darkBandGap > 7.5, 'Alexander dark band spans ~8° gap between primary and secondary rainbow');
});

test('Story and academic stage synchronization', () => {
  for (const scenario of ['prism', 'raindrop', 'double', 'sky']) {
    assert.equal(STORIES[scenario].length, 5, `${scenario} must have 5 story steps`);
    assert.equal(ACADEMIC[scenario].length, 5, `${scenario} must have 5 academic steps`);
  }

  assert.equal(stageAt(0.0, 'prism'), 0);
  assert.equal(stageAt(0.30, 'prism'), 1);
  assert.equal(stageAt(0.55, 'prism'), 2);
  assert.equal(stageAt(0.80, 'prism'), 3);
  assert.equal(stageAt(0.95, 'prism'), 4);
});

test('Rendered water paths meet the sphere, obey Snell at exit and match rainbow readouts', async () => {
  const { traceDropRay } = await import('../data/rainbowData.ts');
  const unit = ([x,y]) => { const length = Math.hypot(x,y); return [x/length,y/length]; };
  const between = (a,b) => unit([b[0]-a[0],b[1]-a[1]]);
  const cross = (a,b) => Math.abs(a[0]*b[1]-a[1]*b[0]);
  for (const color of SPECTRUM_COLORS) for (const reflections of [1,2]) {
    const points = traceDropRay(color.waterIndex, reflections);
    for (const boundary of points.slice(1,-1)) assert.ok(Math.abs(Math.hypot(...boundary)-1)<1e-12);
    const exit = points.at(-2), inside = between(points.at(-3),exit), outside = between(exit,points.at(-1));
    assert.ok(outside[0]<0, 'Rainbow light returns toward the sun side');
    assert.ok(Math.abs(color.waterIndex*cross(inside,exit)-cross(outside,exit))<1e-12, 'Snell law at water-air exit');
    const radius = Math.acos(-outside[0])*180/Math.PI;
    assert.ok(Math.abs(radius-(reflections===1?color.primaryAngleDeg:color.secondaryAngleDeg))<1e-9, 'Rendered direction must agree with the colour card');
    for(let j=2;j<points.length-2;j++) {
      const incoming=between(points[j-1],points[j]), outgoing=between(points[j],points[j+1]), normal=points[j];
      const dot=incoming[0]*normal[0]+incoming[1]*normal[1];
      assert.ok(Math.hypot(outgoing[0]-(incoming[0]-2*dot*normal[0]),outgoing[1]-(incoming[1]-2*dot*normal[1]))<1e-12,'Specular reflection at each internal surface');
    }
  }
});

test('complementary drop branches share interfaces and obey Snell or reflection', async () => {
  const { traceDropRay, traceDropBranches } = await import('../data/rainbowData.ts');
  const unit = ([x,y]) => { const m=Math.hypot(x,y); return [x/m,y/m]; };
  const direction = (a,b) => unit([b[0]-a[0],b[1]-a[1]]);
  const cross = (a,b) => a[0]*b[1]-a[1]*b[0];
  for (const color of SPECTRUM_COLORS) for (const reflections of [1,2]) {
    const path=traceDropRay(color.waterIndex,reflections);
    const branches=traceDropBranches(color.waterIndex,reflections);
    assert.equal(branches.filter(b=>b.kind==='transmission').length,reflections);
    for(const branch of branches) {
      const [point,end]=branch.points, j=branch.surfaceIndex;
      assert.deepEqual(point,path[j]);
      const incoming=direction(path[j-1],point), outgoing=direction(point,end);
      const dot=incoming[0]*point[0]+incoming[1]*point[1];
      if(branch.kind==='transmission') {
        assert.ok(Math.abs(color.waterIndex*cross(incoming,point)-cross(outgoing,point))<1e-10);
        assert.ok(outgoing[0]*point[0]+outgoing[1]*point[1]>0);
      } else {
        assert.ok(Math.hypot(outgoing[0]-incoming[0]+2*dot*point[0],outgoing[1]-incoming[1]+2*dot*point[1])<1e-10);
      }
    }
  }
});

test('spectrum uses a bounded number of continuous strokes without filtered tiles', async () => {
  const { RainbowSimulation } = await import('../physics/rainbowSimulation.ts');
  const simulation=Object.create(RainbowSimulation.prototype);
  simulation.scenario='prism';
  simulation.selectedColorId=null;
  const traces=[];
  simulation.path=(points,...args)=>traces.push({points,args});
  const paths=SPECTRUM_COLORS.map((_,i)=>[[0,0],[100,30+i],[200,60+i*20]]);
  simulation.spectrum(paths,0.7);
  assert.equal(traces.length,49);
  for(const trace of traces) {
    assert.equal(trace.points.length,3,'every wavelength includes its joint in one stroke');
    assert.deepEqual(trace.points[0],[0,0]);
    assert.equal(trace.args[1],0.7);
  }
  assert.deepEqual(traces[0].points,paths[0]);
  assert.deepEqual(traces.at(-1).points,paths.at(-1));
});
