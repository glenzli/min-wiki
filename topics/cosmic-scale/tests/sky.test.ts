import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import catalogue from '../skyCatalogue.json';
import { equatorial, galacticDirection, orionObserver, orionPosition, parallaxDistance, readSkyState, saveSkyState, milkyObserver, SKY_SUN, M31_DIRECTION, type Vec3 } from '../skyModel.ts';
import { planetPosition, trappistPlanets, MERCURY_AU, orbitRadius, systemFraming, solarPlanets, wholeOrbitRadius, systemPlanetPosition } from '../planetarySystems.ts';
import { readGalacticState, saveGalacticState, SOLAR_POSITION } from '../galacticModel.ts';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { galacticObjects } from '../galacticModel.ts';
import skyCopy from '../skyContent.json';
import { skyDirection, smooth, add, mul, milkyTravelProgress, earthSkyOpacity, groundObserver } from '../skyModel.ts';
import { M31_DIRECTION as m31Direction } from '../skyModel.ts';
import { galacticStarPosition,MILKY_DISK_RADIUS_LY } from '../skyModel.ts';
import {createSolarPhotosphereMaterial} from '../solarPhotosphere3d.ts';

test('sky routes roundtrip independently of legacy galaxy layers, angles and scale choices', () => {
  const old = readGalacticState('?galaxy=spiral&galaxyPitch=1.2&galaxyZoom=1.6');
  assert.equal(old.selected, 'spiral'); assert.equal(old.pitch, 1.2); assert.equal(old.zoom, 1.6);
  const state = readSkyState(new URLSearchParams('skyObserver=Infinity&orionObserver=-2&skyDirection=bad&skyStar=50&systemDays=25'));
  assert.equal(state.milkyProgress, 0); assert.equal(state.orionProgress, 0); assert.equal(state.star, 6); assert.equal(state.direction, 'disk'); assert.equal(state.systemDays, 20);
  for (const selected of ['sky', 'orion', 'trappist-1'] as const) {
    const next = { ...old, selected, sky: { ...old.sky, milkyProgress: .417, orionProgress: .82, direction: 'andromeda' as const, systemDays: 4.2, systemClose: true, planet: 6,locateOrion:true } };
    const p = new URLSearchParams(); saveGalacticState(p, next); assert.deepEqual(readGalacticState(p.toString()), next);
    const sky = new URLSearchParams(); saveSkyState(sky, next.sky); assert.deepEqual(readSkyState(sky), next.sky);
  }
});

test('equatorial directions preserve angular geometry and use the existing galactic Sun axis', () => {
  const norm = (v: Vec3) => Math.hypot(...v);
  for (const [ra, dec] of [[0, 0], [90, 0], [266.4051, -28.936175], [192.85948, 27.12825]]) assert.ok(Math.abs(norm(galacticDirection(ra!, dec!)) - 1) < 1e-9);
  const centre = galacticDirection(266.4051, -28.936175); assert.ok(centre[0] < -.99999); assert.ok(Math.abs(centre[2]) < .00001);
  const pole = galacticDirection(192.85948, 27.12825); assert.ok(pole[2] > .99999);
  const d = galacticDirection(10.6847, 41.269), r = equatorial(10.6847, 41.269), other = equatorial(88.79, 7.4), g = galacticDirection(88.79, 7.4);
  const dot = (a: Vec3, b: Vec3) => a.reduce((n, v, i) => n + v * b[i]!, 0);
  assert.ok(Math.abs(dot(r, other) - dot(d, g)) < 1e-9); assert.ok(M31_DIRECTION[2] < 0);
  assert.deepEqual(milkyObserver(0, 'disk').eye, SKY_SUN);
  assert.equal(SKY_SUN,SOLAR_POSITION);
  assert.deepEqual(milkyObserver(1, 'disk').eye, milkyObserver(1, 'pole').eye);
});

test('Orion keeps the same measured angular pattern while an observer reveals distance', () => {
  const stars = catalogue.orion.map(s => orionPosition(s.ra, s.dec, parallaxDistance(s.parallax, s.error).ly));
  const project = (p: number) => { const o = orionObserver(p), c = new THREE.PerspectiveCamera(o.fov, 1.6, .01, 10000); c.position.set(...o.eye); c.up.set(...o.up); c.lookAt(...o.target); c.updateMatrixWorld(); return stars.map(s => new THREE.Vector3(...s).project(c)); };
  const initial = project(0), side = project(1); assert.deepEqual(project(0), initial);
  for(const aspect of [.7,1.02,1.25,1.6,2.1])for(const progress of [0,.25,.5,.75,1]){
    const o=orionObserver(progress,aspect),camera=new THREE.PerspectiveCamera(o.fov,aspect,.01,10000);
    camera.position.set(...o.eye);camera.up.set(...o.up);camera.lookAt(...o.target);camera.updateMatrixWorld();
    for(const star of stars){const p=new THREE.Vector3(...star).project(camera);assert.ok(Math.abs(p.x)<.94&&Math.abs(p.y)<.94,`all star locators fit at aspect ${aspect}, observer ${progress}`);}
  }
  assert.ok(Math.abs(initial[2]!.y - initial[4]!.y) < .2, 'belt lies on a narrow sky diagonal');
  assert.ok(side.some((point, i) => point.distanceTo(initial[i]!) > .2));
  catalogue.orion.forEach((star, i) => {
    const d = parallaxDistance(star.parallax, star.error);
    assert.ok(d.nearLy < d.ly && d.farLy > d.ly); assert.ok(d.farLy - d.ly > d.ly - d.nearLy);
    assert.ok(Math.abs(Math.hypot(...stars[i]!) - d.ly) < 1e-8);
    const position=galacticStarPosition(star.ra,star.dec,d.ly);assert.ok(Math.abs(Math.hypot(position[0]-SOLAR_POSITION[0],position[1],position[2])-d.ly/MILKY_DISK_RADIUS_LY)<1e-12);
  });
  const distances = catalogue.orion.map(s => parallaxDistance(s.parallax, s.error).ly);
  assert.ok(distances[1]! < 300); assert.ok(distances[3]! > 1500);
  for(const [p,e] of [[0,0],[-1,.1],[1,2],[NaN,.1]])assert.throws(()=>parallaxDistance(p!,e!),RangeError);
});

test('disk-to-pole travel keeps the solar anchor in view and a stable stellar population ahead', () => {
  const halo=galacticObjects('milky-way')[0]!.clouds.find(c=>c.part==='halo')!;
  for(const direction of ['disk','pole','andromeda'] as const)for(const aspect of [.7,1.1,2.16]){
    for(const progress of [0,.03,.1,.2,.2721,.4,.56,.7,.85,1]){
      const o=milkyObserver(progress,direction,aspect),camera=new THREE.PerspectiveCamera(o.fov,aspect,.000005,10000);
      camera.position.set(...o.eye);camera.up.set(...o.up);camera.lookAt(...o.target);camera.updateMatrixWorld();
      const aim=new THREE.Vector3(...o.target).sub(camera.position).normalize();
      assert.ok(new THREE.Vector3(...o.up).normalize().cross(aim).length()>.12,'camera up must not align with its sightline');
      if(milkyTravelProgress(progress)>0){const sun=new THREE.Vector3(...SKY_SUN).project(camera);assert.ok(Math.abs(sun.x)<.9&&Math.abs(sun.y)<.9&&sun.z<1,`Sun stays visible: ${direction}, ${aspect}, ${progress}`);}
      if(direction==='pole'){
        let visible=0;
        for(let i=0;i<halo.positions.length;i+=3){const star=new THREE.Vector3(...halo.positions.slice(i,i+3));const view=star.clone().applyMatrix4(camera.matrixWorldInverse);star.project(camera);if(view.z<0&&Math.abs(star.x)<1&&Math.abs(star.y)<1)visible++;}
        assert.ok(visible>=10,'looking away from the band does not erase all foreground/halo stars');
      }
    }
  }
});

test('ground sky is an explicit retained view and never enters the spatial progress automatically',()=>{
  assert.equal(earthSkyOpacity('ground'),1);assert.equal(earthSkyOpacity('space'),0);
  assert.equal(readSkyState(new URLSearchParams('skyDirection=disk&skyObserver=.72')).view,'space');
  const ground=readSkyState(new URLSearchParams('skyView=ground&skyObserver=.72'));assert.equal(ground.view,'ground');assert.equal(ground.milkyProgress,.72);
  assert.deepEqual(groundObserver().eye,SKY_SUN);
  assert.notDeepEqual(milkyObserver(.08,'disk').eye,SKY_SUN);
  assert.deepEqual(milkyObserver(1,'disk').eye,milkyObserver(1,'pole').eye);
});

test('whole planetary views include eight and seven members while common-scale geometry stays in AU',()=>{
  assert.equal(solarPlanets.length,8);assert.equal(trappistPlanets.length,7);
  for(const family of ['solar','trappist'] as const)for(const [i,p] of (family==='solar'?solarPlanets:trappistPlanets).entries()){
    assert.ok(Math.abs(Math.hypot(...systemPlanetPosition(family,i,7,false))-p.au)<1e-10);
    assert.ok(Math.abs(Math.hypot(...systemPlanetPosition(family,i,7,true))-wholeOrbitRadius(family,i))<1e-10);
    const start=systemPlanetPosition(family,i,0,true),end=systemPlanetPosition(family,i,p.days,true);assert.ok(Math.hypot(...start.map((v,k)=>v-end[k]!))<1e-10);
  }
  assert.equal(readSkyState(new URLSearchParams()).systemWhole,true);
  assert.equal(readSkyState(new URLSearchParams('systemClose=1')).systemWhole,false);
});

test('TRAPPIST orbits retain a common AU scale and an independent, reversible elapsed-day clock', () => {
  assert.equal(trappistPlanets.length, 7);
  assert.ok(trappistPlanets.every(p => p.au < MERCURY_AU));
  for (const [i, p] of trappistPlanets.entries()) {
    assert.ok(Math.abs(Math.hypot(...planetPosition(i, 7.4)) - p.au) < 1e-14);
    const start = planetPosition(i, 0), complete = planetPosition(i, p.days); assert.ok(Math.hypot(...start.map((v, j) => v - complete[j]!)) < 1e-14);
    assert.deepEqual(planetPosition(i, 0), start);
    assert.ok(Math.abs(orbitRadius(p.au, systemFraming(false), 200) / orbitRadius(MERCURY_AU, systemFraming(false), 200) - p.au / MERCURY_AU) < 1e-14);
  }
  assert.ok(systemFraming(true) > trappistPlanets.at(-1)!.au); assert.ok(systemFraming(true) < MERCURY_AU);
});

test('sky scene retains identities across changes, bounds cache resources and recovers after GPU loss', () => {
  const source=readFileSync(new URL('../skyScene.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export class SkyScene','class SkyScene');
  const code=ts.transpileModule(source+'\nglobalThis.SceneUnderTest=SkyScene;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  let renders=0,disposes=0,disconnects=0;
  const context2d=new Proxy<any>({measureText:()=>({width:90}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]??(()=>{})});
  class Canvas {width=0;height=0;hidden=false;setAttribute(){}getContext(){return context2d;}addEventListener(){}removeEventListener(){}replaceWith(){}remove(){}}
  class Renderer {setClearColor(){}setPixelRatio(){}setSize(){}render(){renders++;}dispose(){disposes++;}forceContextLoss(){}}
  const document={hidden:false,createElement:()=>new Canvas()},failures:boolean[]=[];
  const sandbox=vm.createContext({THREE:{...THREE,WebGLRenderer:Renderer,TextureLoader:class{load(){return new THREE.Texture();}}},createSolarPhotosphereMaterial,catalogue,galacticObjects,SKY_SUN,M31_DIRECTION:m31Direction,milkyObserver,groundObserver,milkyTravelProgress,earthSkyOpacity,orionObserver,orionPosition,parallaxDistance,skyDirection,smooth,add,mul,galacticDirection,trappistPlanets,solarPlanets,wholeOrbitRadius,systemPlanetPosition,MERCURY_AU,planetPosition,systemFraming,...Object.fromEntries(['mercuryMap','venusMap','earthMap','marsMap','jupiterMap','saturnMap','uranusMap','neptuneMap'].map(k=>[k,k])),document,devicePixelRatio:2,ResizeObserver:class{observe(){}disconnect(){disconnects++;}}});
  vm.runInContext(code,sandbox);
  const scene=new (sandbox as any).SceneUnderTest({append(){},clientWidth:900,clientHeight:450},skyCopy.en,'en',(failed:boolean)=>failures.push(failed));
  const state=readSkyState(new URLSearchParams());scene.setActive(true);scene.draw('orion',state,1);
  const entry=scene.entries.get('orion'),positions=entry.samples.map((s:any)=>s.position);
  let released=0;entry.root.traverse((object:any)=>object.geometry?.addEventListener('dispose',()=>released++));
  scene.draw('orion',{...state,orionProgress:.55,star:4},1.5);assert.equal(scene.entries.get('orion'),entry);assert.deepEqual(entry.samples.map((s:any)=>s.position),positions);
  scene.draw('sky',state,1);const skyEntry=scene.entries.get('sky'),skyPositions=skyEntry.samples.map((s:any)=>s.position);
  scene.draw('sky',{...state,direction:'pole',milkyProgress:.2721},1);assert.equal(scene.entries.get('sky'),skyEntry);assert.deepEqual(skyEntry.samples.map((s:any)=>s.position),skyPositions);
  scene.draw('trappist-1',{...state,systemClose:true,systemDays:7},1);assert.equal(scene.entries.size,2);assert.equal(released,1);
  assert.equal(scene.entries.get('trappist-1').stars[0].material.name,'cosmic-solar-photosphere');
  assert.equal(scene.entries.get('trappist-1').planets.length,15);assert.equal(scene.textures.size,8);
  scene.draw('trappist-1',{...state,systemWhole:false,systemClose:false},1);assert.equal(scene.entries.get('trappist-1').planets.filter((p:any)=>p.visible).length,8);
  scene.draw('sky',{...state,view:'ground',milkyProgress:.72},1);assert.deepEqual([...scene.camera.position],SKY_SUN);
  for(let i=0;i<9;i++){scene.draw((['orion','sky','trappist-1'] as const)[i%3],{...state,systemClose:true,systemDays:i},1);assert.ok(scene.entries.size<=2);}
  const before=renders;scene.setActive(false);scene.draw('orion',state,1);assert.equal(renders,before);
  scene.setActive(true);document.hidden=true;scene.draw('orion',state,1);assert.equal(renders,before);document.hidden=false;
  scene.contextLost({preventDefault(){}});assert.equal(failures.at(-1),true);const lost=renders;scene.draw('trappist-1',{...state,systemClose:true},1);assert.equal(renders,lost);
  scene.retry();assert.equal(failures.at(-1),false);assert.ok(renders>lost);scene.dispose();scene.dispose();assert.equal(scene.entries.size,0);assert.equal(disposes,2);assert.equal(disconnects,1);
});

test('finite observer and orbital playback stops on hide without jumping or resetting retained choices', () => {
  const source=readFileSync(new URL('../skyStudy.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export class SkyStudy','class SkyStudy');
  const code=ts.transpileModule(source+'\nglobalThis.StudyUnderTest=SkyStudy;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const callbacks=new Map<number,(now:number)=>void>();let id=0,draws=0;
  class Element{dataset:any={};hidden=false;children:Element[]=[];setAttribute(){}append(...nodes:Element[]){this.children.push(...nodes);}addEventListener(){}removeEventListener(){}replaceChildren(){this.children=[];}querySelectorAll(){return this.children.filter(n=>n.dataset.direction);}}
  const document={hidden:false,createElement:()=>new Element()},changed:any[]=[];
  const sandbox=vm.createContext({document,copy:skyCopy,catalogue,trappistPlanets,solarPlanets,milkyTravelProgress,performance:{now:()=>0},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),unit:(n:number)=>Math.max(0,Math.min(1,n)),requestAnimationFrame:(f:(now:number)=>void)=>{callbacks.set(++id,f);return id;},cancelAnimationFrame:(i:number)=>callbacks.delete(i)});
  vm.runInContext(code,sandbox);const study=new (sandbox as any).StudyUnderTest(new Element(),new Element(),'en',(state:any,checkpoint:boolean)=>changed.push({state,checkpoint}),()=>{},()=>{},()=>false);
  Object.assign(study,{state:readSkyState(new URLSearchParams()),selected:'orion',active:true,disposed:false,motion:'camera',from:0,target:1,elapsed:0,lastTime:0,frame:0,drawFrame:0,scene:{setActive(){}},syncControls(){},requestDraw(){draws++;}});
  const step=(now:number)=>{const next=[...callbacks.values()];callbacks.clear();next.forEach(f=>f(now));};
  study.tick(16);const initial=study.state.orionProgress;step(100000);assert.ok(study.state.orionProgress-initial<.03,'large wall-clock gap is bounded');
  let now=100000;while(study.motion){now+=16;step(now);}assert.equal(study.state.orionProgress,1);assert.equal(changed.at(-1).checkpoint,true);
  study.selected='trappist-1';study.motion='orbit';study.lastTime=now;study.tick(now+16);assert.ok(study.state.systemDays>0);const retained=study.state.systemDays;
  study.hide();assert.equal(callbacks.size,0);assert.equal(study.motion,undefined);step(now+1000);assert.equal(study.state.systemDays,retained);assert.equal(study.state.orionProgress,1);assert.equal(study.controls.hidden,true);
  const before=draws;study.tick(now+2000);assert.equal(draws,before);
});
