import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import { galacticCases, galacticObjects, galacticPointCount, readGalacticState, saveGalacticState, turnGalacticView, SOLAR_POSITION, SOLAR_RADIUS_LY, MILKY_DISK_RADIUS_LY, MAX_POINTS_PER_CASE, GALACTIC_CACHE_LIMIT } from '../galacticModel.ts';
import { readExploration } from '../comparisonModel.ts';
import { galaxyStudy } from '../study.ts';
import content from '../galacticContent.json';
import {viewZoom} from '../viewNavigation.ts';

test('new galaxy routes retain all old comparison, address and zoom meanings', () => {
  assert.equal(readExploration('?mode=galaxies&galaxy=elliptical&scale=.7').chapter, 'galaxies');
  assert.equal(readExploration('?scale=.7').chapter, 'zoom');
  assert.equal(readExploration('?mode=homes&home=5').home, 5);
  assert.equal(readExploration('?mode=compare&pair=4&pairVersion=2').pair, 4);
  const invalid = readGalacticState('?galaxy=wrong&galaxyYaw=NaN&galaxyPitch=Infinity');
  assert.equal(invalid.selected, 'milky-way'); assert.equal(invalid.yaw, -.22); assert.equal(invalid.pitch, .92);
  assert.equal(readGalacticState('?galaxyYaw=99&galaxyPitch=-99').yaw, Math.PI);
  assert.equal(readGalacticState('?galaxyYaw=99&galaxyPitch=-99').pitch, 0);
  for (const selected of galacticCases) {
    const state = { ...readGalacticState(''), selected, yaw: 1.2, pitch: .4, disk: false, guides: false }, p = new URLSearchParams();
    saveGalacticState(p, state); assert.deepEqual(readGalacticState(p.toString()), state);
  }
});

test('all spatial populations are deterministic, finite, nonuniform and bounded', () => {
  for (const selected of galacticCases) {
    const objects = galacticObjects(selected); assert.deepEqual(objects, galacticObjects(selected));
    assert.ok(galacticPointCount(objects) <= MAX_POINTS_PER_CASE, selected);
    for (const object of objects) for (const cloud of object.clouds) {
      assert.equal(cloud.colors.length, cloud.positions.length); assert.ok(cloud.positions.every(Number.isFinite));
      assert.ok(cloud.colors.every(c => c >= 0 && c <= 1)); assert.ok(cloud.positions.some((v, i) => i % 3 === 2 && Math.abs(v) > .005));
    }
  }
  const clouds = galacticObjects('milky-way')[0]!.clouds, disk = clouds.find(c => c.part === 'disk')!, halo = clouds.find(c => c.part === 'halo')!;
  const maxZ = (p: Float32Array) => Math.max(...p.filter((_, i) => i % 3 === 2).map(Math.abs));
  assert.ok(maxZ(disk.positions) < .032); assert.ok(maxZ(halo.positions) > .9);
  const elliptical = galacticObjects('elliptical')[0]!.clouds[0]!.positions;
  const radii = Array.from({length: elliptical.length / 3}, (_, i) => Math.hypot(elliptical[i*3]!, elliptical[i*3+1]! / .72, elliptical[i*3+2]! / .60));
  const inner = radii.filter(r => r < .25).length / (.25 ** 3), outer = radii.filter(r => r > .75).length / (1 - .75 ** 3);
  assert.ok(inner > outer * 4, 'elliptical density decreases outwards');
});

test('camera turns preserve samples, solar location and independent layer state', () => {
  const samples = galacticObjects('milky-way'), state = readGalacticState('');
  let turned = state;
  for (let i = 0; i < 500; i++) { turned = turnGalacticView(turned, .17, i % 2 ? .03 : -.03); assert.ok(Number.isFinite(turned.yaw)); assert.ok(turned.pitch >= 0 && turned.pitch <= Math.PI / 2); }
  assert.equal(turned.selected, state.selected); assert.equal(turned.disk, true); assert.deepEqual(samples, galacticObjects('milky-way'));
  assert.equal(SOLAR_POSITION[0], SOLAR_RADIUS_LY / MILKY_DISK_RADIUS_LY); assert.equal(SOLAR_POSITION[2], 0);
  assert.deepEqual(galacticObjects('star-cluster').map(o => o.id), ['cluster-context', 'cluster-detail']);
});

test('every case has equivalent bilingual questions, evidence, limitations and primary sources', () => {
  for (const selected of galacticCases) {
    const study = galaxyStudy(selected);
    for (const field of ['child', 'title', 'theory', 'evidence', 'limits'] as const) for (const language of ['zh', 'en'] as const) assert.ok(study[field]![language].trim().length > (field === 'title' ? 2 : 10), `${selected}.${field}.${language}`);
    assert.ok(study.sources.every(source => /^https:\/\/(science\.nasa\.gov|www\.nasa\.gov|www\.esa\.int|starchild\.gsfc\.nasa\.gov|cdsarc\.cds\.unistra\.fr|doi\.org|exoplanetarchive\.ipac\.caltech\.edu)\//.test(source.url)));
  }
  assert.match(galaxyStudy('elliptical').limits.en, /not a compulsory evolutionary sequence/);
  assert.match(galaxyStudy('star-cluster').limits.en, /No universal star-count threshold/);
  assert.match(galaxyStudy('local-group').limits.en, /no common physical scale/);
});

test('production scene cache, hidden rendering, GPU failure, retry and disposal are bounded', () => {
  const source = readFileSync(new URL('../galacticScene.ts', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace('export class GalacticScene', 'class GalacticScene');
  const code = ts.transpileModule(source + '\n globalThis.GalacticScene = GalacticScene;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let renders = 0, releases = 0, disconnects = 0;
  const strokes: {move?: number[]; line?: number[]} = {};
  const drawing = new Proxy<Record<string, unknown>>({}, {get: (target, key: string) => target[key] ?? (() => {})});
  (drawing as any).measureText = () => ({width: 120});
  (drawing as any).moveTo = (...point: number[]) => { strokes.move = point; };
  (drawing as any).lineTo = (...point: number[]) => { strokes.line = point; };
  class Canvas {
    width=0; height=0; hidden=false; listeners = new Map<string, Function>();
    setAttribute() {} getContext() { return drawing; } remove() {} replaceWith() {}
    addEventListener(name: string, listener: Function) { this.listeners.set(name, listener); }
    removeEventListener(name: string) { this.listeners.delete(name); }
  }
  class Renderer { setClearColor() {} setPixelRatio() {} setSize() {} render() { renders++; } dispose() { releases++; } forceContextLoss() {} }
  const document = { hidden: false, createElement: () => new Canvas() }, failures: boolean[] = [];
  const context = vm.createContext({ THREE: { ...THREE, WebGLRenderer: Renderer }, document, devicePixelRatio: 3,
    ResizeObserver: class { observe() {} disconnect() { disconnects++; } }, GALACTIC_CACHE_LIMIT, SOLAR_POSITION, galacticObjects,viewZoom });
  vm.runInContext(code, context);
  const host = {classList:{add(){}},append(){},clientWidth:800,clientHeight:500};
  const scene = new (context as any).GalacticScene(host, content.ui.en, (failed: boolean) => failures.push(failed));
  scene.setActive(true); const state = readGalacticState(''); scene.draw(state);
  const first = scene.cache.get('milky-way'); let disposed = 0; first.populations.forEach((p: any) => p.mesh.geometry.addEventListener('dispose', () => disposed++));
  scene.draw({...state, pitch:0}); assert.equal(scene.cache.get('milky-way'), first);
  const framing = [scene.camera.left,scene.camera.top];scene.draw({...state,zoom:1.5});assert.ok(Math.abs(scene.camera.left-framing[0]/1.5)<1e-12);assert.equal(scene.cache.get('milky-way'),first);scene.draw(state); scene.draw({...state,guides:!state.guides,halo:false}); assert.deepEqual([scene.camera.left,scene.camera.top],framing);
  for (const selected of galacticCases.slice(1)) { scene.draw({...state, selected}); assert.ok(scene.cache.size <= GALACTIC_CACHE_LIMIT); }
  assert.equal(disposed, 5); assert.ok(!scene.cache.has('milky-way'));
  for(const [width,height] of [[800,500],[390,600],[1200,520]])for(const pitch of [0,.92,Math.PI/2]){
    host.clientWidth=width!;host.clientHeight=height!;scene.draw({...state,selected:'galaxy-comparison',zoom:1,pitch,yaw:.4});
    const pair=scene.cache.get('galaxy-comparison');assert.equal(pair.objects.length,2);
    for(const population of pair.populations)for(let i=0;i<population.cloud.positions.length;i+=171){
      const p=new THREE.Vector3(...population.cloud.positions.slice(i,i+3)).applyMatrix4(population.owner.matrixWorld).project(scene.camera);
      assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,'both whole stellar volumes fit the default paired frame');
    }
  }
  host.clientWidth=800;host.clientHeight=500;
  for (const pitch of [0, .7, Math.PI / 2]) {
    scene.draw({...state, selected:'star-cluster', yaw:.65, pitch});
    const entry = scene.cache.get('star-cluster'), contextOwner = entry.populations[0].owner, detailOwner = entry.populations.find((p: any) => p.owner !== contextOwner).owner;
    const expected = (point: number[], owner: THREE.Object3D) => { const p = new THREE.Vector3(...point).applyMatrix4(owner.matrixWorld).project(scene.camera); return [(p.x+1)*400, (1-p.y)*250]; };
    assert.deepEqual(strokes.move, expected([-.75,.60,.75],contextOwner)); assert.deepEqual(strokes.line, expected([0,0,0],detailOwner));
  }
  const before = renders; scene.setActive(false); scene.draw(state); assert.equal(renders, before);
  scene.setActive(true); document.hidden = true; const hidden = renders; scene.draw(state); assert.equal(renders, hidden); document.hidden = false;
  scene.contextLost({preventDefault(){}}); assert.equal(failures.at(-1), true); const lost = renders; scene.draw(state); assert.equal(renders, lost);
  scene.retry(); assert.equal(failures.at(-1), false); assert.ok(renders > lost); assert.equal(releases, 1);
  scene.dispose(); scene.dispose(); assert.equal(scene.cache.size, 0); assert.equal(releases, 2); assert.equal(disconnects, 1);
});
