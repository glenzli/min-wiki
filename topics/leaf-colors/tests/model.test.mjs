import test from 'node:test';
import assert from 'node:assert/strict';
import { colorRoute, compartmentPigments, pigmentDestination, pigmentsAt, leafRGB, journeyAt, JOURNEY_DURATION, routeLevel } from '../model.ts';

test('yellow path reveals retained carotenoids without making red pigment', () => {
  let previous = pigmentsAt(0, 'yellow');
  assert.ok(previous.carotenoids > 0);
  for (let i = 1; i <= 100; i++) {
    const current = pigmentsAt(i / 100, 'yellow');
    assert.ok(current.chlorophyll <= previous.chlorophyll);
    assert.ok(current.carotenoids <= previous.carotenoids);
    assert.equal(current.anthocyanins, 0);
    previous = current;
  }
  assert.ok(previous.carotenoids > previous.chlorophyll * 10);
});
test('red path adds anthocyanin while sharing chloroplast pigment changes', () => {
  assert.equal(pigmentsAt(0, 'red').anthocyanins, 0);
  let last = 0;
  for (let i = 0; i <= 100; i++) {
    const red = pigmentsAt(i / 100, 'red'), yellow = pigmentsAt(i / 100, 'yellow');
    assert.equal(red.chlorophyll, yellow.chlorophyll);
    assert.equal(red.carotenoids, yellow.carotenoids);
    assert.ok(red.anthocyanins >= last);
    last = red.anthocyanins;
  }
  assert.ok(last > .8);
});
test('all levels can reuse deterministic bounded state across season changes', () => {
  for (const kind of ['yellow', 'red']) for (const s of [-1, 0, .3, .7, 1, 2]) {
    const p = pigmentsAt(s, kind);
    assert.deepEqual(p, pigmentsAt(s, kind));
    assert.ok(Object.values(p).every(v => v >= 0 && v <= 1));
    assert.ok(leafRGB(p).every(v => v >= 0 && v <= 255));
  }
});

test('yellow and red journeys diverge from the same cell into different pigment compartments', () => {
  for (const [kind, last, destination] of [['yellow',3,'chloroplast'],['red',4,'vacuole']]) {
    const visits = [];
    for (let seconds=0; seconds<=JOURNEY_DURATION; seconds+=.25) { const level=journeyAt(seconds,kind); if (visits.at(-1)!==level) visits.push(level); }
    assert.deepEqual(visits,[0,1,2,last]);
    assert.deepEqual(visits,colorRoute(kind));
    assert.equal(pigmentDestination(kind),destination);
    assert.equal(journeyAt(JOURNEY_DURATION,kind),last);
  }
});
test('switching the leaf capability at organelle scale follows the new destination and preserves shared levels', () => {
  assert.equal(routeLevel(3,'red'),4);
  assert.equal(routeLevel(4,'yellow'),3);
  for(const kind of ['yellow','red']) for(const level of [0,1,2]) assert.equal(routeLevel(level,kind),level);
});
test('red pigment remains excluded from the chloroplast in every season', () => {
  for(let step=0;step<=100;step++) for(const kind of ['yellow','red']) {
    const leaf=pigmentsAt(step/100,kind);
    const chloroplast=compartmentPigments(leaf,'chloroplast'),vacuole=compartmentPigments(leaf,'vacuole');
    assert.equal(chloroplast.anthocyanins,0);
    assert.equal(chloroplast.chlorophyll,leaf.chlorophyll);
    assert.equal(chloroplast.carotenoids,leaf.carotenoids);
    assert.equal(vacuole.chlorophyll,0);
    assert.equal(vacuole.carotenoids,0);
    assert.equal(vacuole.anthocyanins,leaf.anthocyanins);
    assert.deepEqual(leaf,pigmentsAt(step/100,kind),'compartment projection does not mutate the shared seasonal state');
  }
});

test('scale camera is continuous across tissue and cell boundaries and reverses exactly', async () => {
  const {scaleCamera, journeyScale, SCALE_ENTRIES}=await import('../model.ts');
  for(const destination of [{x:105,y:-80,size:.115,angle:.65},{x:0,y:0,size:.72,angle:0}]){
    for(const stop of [1,2]){
      const a=scaleCamera(stop-1e-5,destination),b=scaleCamera(stop+1e-5,destination);
      assert.ok(Math.abs(a.x-b.x)<1e-6 && Math.abs(a.y-b.y)<1e-6);
      assert.ok(Math.abs(a.magnification-b.magnification)<1e-5);
      assert.ok(Math.abs(a.angle-b.angle)<1e-7);
    }
    let previous=1;
    for(let p=0;p<=3;p+=.007){
      const camera=scaleCamera(p,destination);
      assert.ok(camera.magnification>=previous-1e-8);
      assert.deepEqual(camera,scaleCamera(p,destination),'returning to a slider position reproduces the same view');
      previous=camera.magnification;
    }
    assert.equal(scaleCamera(0,destination).magnification,1);
    const expected=1/(SCALE_ENTRIES[0].size*SCALE_ENTRIES[1].size*destination.size);
    assert.ok(Math.abs(scaleCamera(3,destination).magnification-expected)<1e-8);
  }
  assert.equal(journeyScale(0),0);assert.equal(journeyScale(JOURNEY_DURATION),3);
  assert.ok(journeyScale(10.1)>journeyScale(10) && journeyScale(10.1)<2);
});
