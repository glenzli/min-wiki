import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {stellarSpotDirections} from '../../../src/visuals/stellarPortrait.ts';
import {ANATOMY_SURFACE_ROTATION,FLARE_DURATION,SOLAR_SECTION,advanceSolarFlare,solarActiveRegion,solarConvectionCells,solarFlare,solarRadiationPaths} from '../solarMechanisms.ts';
import {drawAnatomy,disposeAnatomyTexture} from '../anatomyScene.ts';
import {readState} from '../model.ts';
import {anatomyStudies} from '../study.ts';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} differs from ${b}`);

test('the selected region projects the actual spherical spot pair and encloses both visible footprints',()=>{
 const region=solarActiveRegion(),directions=stellarSpotDirections('solar');
 assert.equal(region.id,'A');assert.equal(region.spots.length,2);assert.equal(ANATOMY_SURFACE_ROTATION,0);
 for(const [index,spot]of region.spots.entries()){
  const [x,y,z,radius]=directions[index];
  near(spot.whole.x,SOLAR_SECTION.x+x*SOLAR_SECTION.radius);near(spot.whole.y,SOLAR_SECTION.y-y*SOLAR_SECTION.radius);
  assert.ok(z>0&&spot.whole.x<SOLAR_SECTION.x,'both selected spots stay in the uncut visible half');
  assert.ok(Math.hypot(spot.whole.x-region.whole.x,spot.whole.y-region.whole.y)+radius*SOLAR_SECTION.radius<region.radius);
 }
 assert.equal(Math.sign(region.spots[1].local.x-region.spots[0].local.x),Math.sign(region.spots[1].whole.x-region.spots[0].whole.x));
 assert.ok(region.spots[0].radius>region.spots[1].radius,'the unequal spot pair keeps its ordering in the close view');
});

test('radiation keys stay in their annulus and convective cells have distinct outward and returning halves',()=>{
 for(const path of solarRadiationPaths())for(const p of path){const radius=Math.hypot(p.x-SOLAR_SECTION.x,p.y-SOLAR_SECTION.y);assert.ok(radius>SOLAR_SECTION.coreRadius&&radius<SOLAR_SECTION.radiativeRadius);assert.ok(p.x>SOLAR_SECTION.x);}
 for(const points of solarConvectionCells()){
  const radii=points.map(p=>Math.hypot(p.x-SOLAR_SECTION.x,p.y-SOLAR_SECTION.y));
  assert.ok(radii.every(radius=>radius>SOLAR_SECTION.radiativeRadius&&radius<SOLAR_SECTION.radius));
  for(let i=1;i<=16;i++)assert.ok(radii[i]>radii[i-1]);
  for(let i=17;i<33;i++)assert.ok(radii[i]<radii[i-1]);
  near(points[0].x,points.at(-1).x);near(points[0].y,points.at(-1).y);
 }
});

test('one reconnection event changes connections and releases light only within a finite interval',()=>{
 const before=solarFlare(0),middle=solarFlare(4.8),after=solarFlare(FLARE_DURATION);
 assert.equal(before.release,0);assert.equal(before.connection,0);assert.equal(before.stage,'stored');
 assert.equal(middle.connection,1);assert.ok(middle.release>.9);
 assert.equal(after.release,0);assert.equal(after.connection,1);assert.equal(after.stage,'after');assert.equal(after.ended,true);
 assert.notDeepEqual(before.beforeConnections,after.afterConnections);
 assert.deepEqual(solarFlare(FLARE_DURATION+100),after,'the flash cannot restart with a later surface time');
 assert.deepEqual(solarFlare(7),solarFlare(7));assert.deepEqual(solarFlare(NaN),before);
});

test('the existing clock can advance only the visible event and bounded positions restore through URLs',()=>{
 let time=advanceSolarFlare(0,3,true);near(time,3);
 time=advanceSolarFlare(time,100,false);near(time,3);
 time=advanceSolarFlare(time,0,true);near(time,3);
 time=advanceSolarFlare(time,100,true);near(time,FLARE_DURATION);
 near(advanceSolarFlare(time,1,true),FLARE_DURATION);
 near(readState('?chapter=anatomy&focus=4&flare=4.8').flareTime,4.8);
 near(readState('?chapter=anatomy&flare=Infinity').flareTime,0);
 near(readState('?chapter=anatomy&flare=999').flareTime,FLARE_DURATION);
 near(readState('?chapter=anatomy&flare=-3').flareTime,0);
 const state=readState('?chapter=anatomy&focus=4&flare=7&track=massive&evolution=.5');
 near(state.flareTime,7);near(state.evolutionProgress,.5);assert.equal(state.evolutionTrack,'massive');
});

test('the production surface callback gates pause, hidden pages and chapter switches without advancing scientific time',()=>{
 // Run the actual callback with its browser dependencies adapted, rather than
 // duplicating its clock logic or creating a second renderer/preview instance.
 const source=ts.createSourceFile('main.ts',readFileSync(new URL('../main.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
 const callback=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='surfaceTick');assert.ok(callback);
 const code=ts.transpileModule(callback.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const state={...readState('?chapter=anatomy&focus=4&flare=3&evolution=.5'),surfaceTime:10,time:7};let schedules=0,draws=0;
 const context=vm.createContext({state,surfaceFrame:0,surfacePlaying:true,surfaceLast:0,surfacePaint:0,disposed:false,document:{hidden:false},advanceSolarFlare,
  requestAnimationFrame(){schedules++;return schedules;},draw(){draws++;},updateAnatomyFlare(){},threeBody:{setSurfaceTime(){}}});
 vm.runInContext(code,context);
 context.surfaceTick(100);near(state.surfaceTime,10.1);near(state.flareTime,3.1);near(state.evolutionProgress,.5);near(state.time,7);
 context.surfacePlaying=false;context.surfaceTick(200);near(state.flareTime,3.1);near(state.surfaceTime,10.1);assert.equal(schedules,1);
 context.surfacePlaying=true;context.document.hidden=true;context.surfaceTick(300);near(state.flareTime,3.1);assert.equal(schedules,1);
 context.document.hidden=false;state.chapter='orbits';context.surfaceLast=300;context.surfaceTick(400);near(state.flareTime,3.1);near(state.time,7);
 state.chapter='anatomy';state.anatomyFocus=3;context.surfaceTick(500);near(state.flareTime,3.1);
 state.anatomyFocus=4;context.surfaceTick(600);near(state.flareTime,3.2);near(state.evolutionProgress,.5);assert.ok(draws>0);
 state.flareTime=FLARE_DURATION;context.surfaceTick(700);near(state.flareTime,FLARE_DURATION);
});

function capture(focus,flareTime){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document'),arcs=[],ellipses=[],curves=[],surfaces=[],labels=[],gradients=[],strokes=[],paint=[],boxes=[];let currentPath=[];
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
 const c=new Proxy({globalAlpha:1,beginPath(){currentPath=[];},moveTo(...p){currentPath.push(['move',...p]);},lineTo(...p){currentPath.push(['line',...p]);},arc(...p){arcs.push(p);currentPath.push(['arc',...p]);},roundRect(...p){boxes.push(p);},ellipse(...p){ellipses.push(p);},bezierCurveTo(...p){curves.push(p);},stroke(){const stroke={style:c.strokeStyle,width:c.lineWidth,path:currentPath.slice(),order:paint.length};strokes.push(stroke);paint.push(stroke);},strokeText(...p){paint.push({outline:p,style:c.strokeStyle,width:c.lineWidth});},fillText(...p){labels.push(p);paint.push({text:p,style:c.fillStyle});},createRadialGradient(...p){gradients.push(p);return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};}},{get:(object,key)=>key in object?object[key]:()=>{}});
 try{drawAnatomy(c,focus,3,word=>word.en,{draw(...p){surfaces.push(p);}},18,flareTime);return {arcs,ellipses,curves,surfaces,labels,gradients,strokes,paint,boxes};}
 finally{disposeAnatomyTexture();if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}
}

test('the renderer uses the same region coordinates and supplied finite event without its own pulse clock',()=>{
 const region=solarActiveRegion(),before=capture(4,0),bright=capture(4,4.8),after=capture(4,12);
 assert.equal(before.surfaces[0].at(-1),ANATOMY_SURFACE_ROTATION);
 assert.ok(before.arcs.some(([x,y,r])=>x===region.whole.x&&y===region.whole.y&&r===region.radius));
 for(const spot of region.spots)assert.ok(before.ellipses.some(([x,,r])=>x===spot.local.x&&Math.abs(r-spot.radius*1.05)<1e-9));
 assert.notDeepEqual(before.curves,after.curves,'field endpoints and connections change after the same event');
 const burst=frame=>frame.gradients.some(([,,r,,,outer])=>r===2&&outer===55);
 assert.equal(burst(before),false);assert.equal(burst(bright),true);assert.equal(burst(after),false);
 const transport=capture(1,0);assert.ok(transport.labels.some(([text])=>/radiative transfer/.test(text)));assert.ok(transport.labels.some(([text])=>/cooler return/.test(text)));
});

test('the selected circle has a dark under-stroke, an off-surface badge and a continuous identity link while transfer labels remain above their keys',()=>{
 const region=solarActiveRegion(),active=capture(3,0);
 const circle=active.strokes.filter(stroke=>stroke.path.some(([kind,x,y,r])=>kind==='arc'&&x===region.whole.x&&y===region.whole.y&&r===region.radius));
 assert.ok(circle.some(stroke=>stroke.style==='#091320'&&stroke.width>=6));assert.ok(circle.some(stroke=>stroke.style==='#fff4cb'&&stroke.width<3));
 const badge=active.labels.find(([value])=>value==='A');assert.ok(badge);assert.ok(badge[1]<SOLAR_SECTION.x-SOLAR_SECTION.radius,'A stays outside the full solar limb');
 assert.ok(active.boxes.some(([x,,w])=>badge[1]>x&&badge[1]<x+w));
 const connector=active.strokes.find(stroke=>stroke.path[0]?.[0]==='move'&&stroke.path[0]?.[1]===region.whole.x-region.radius&&stroke.path[0]?.[2]===region.whole.y);
 assert.ok(connector);assert.deepEqual(connector.path.at(-1),['line',563,103]);
 const transfer=capture(1,0),lastReturn=Math.max(...transfer.strokes.filter(stroke=>stroke.style==='#a8def1').map(stroke=>stroke.order));
 for(const name of ['Core','Radiative zone','Convective zone']){
  const index=transfer.paint.findIndex(item=>item.text?.[0]===name);assert.ok(index>lastReturn);
  assert.ok(transfer.paint.slice(0,index).some(item=>item.outline?.[0]===name),'layer names have a contrasting text halo');
 }
 const legend=transfer.labels.find(([value])=>/radiative transfer/.test(value)),layer=transfer.labels.find(([value])=>value==='Convective zone');
 assert.ok(legend[2]-layer[2]>80,'the explanatory legend stays below the cut-face labels');
});

test('both reading depths retain the mechanism roles, finite-event qualification and no false internal-core promise',()=>{
 const content=JSON.parse(readFileSync(new URL('../anatomyContent.json',import.meta.url))),evolution=JSON.parse(readFileSync(new URL('../evolutionContent.json',import.meta.url)));
 for(const key of ['selectedRegion','radiationKey','convectionKey','fieldKey','flareProgress','replayFlare','flareNote'])for(const language of ['zh','en'])assert.ok(content.ui[key][language].length>3);
 assert.deepEqual(Object.keys(content.ui.flareStages),['stored','reconnecting','release','fading','after']);
 assert.match(anatomyStudies[1].child.en,/radiative zone/);assert.match(anatomyStudies[1].child.en,/blue return/);
 assert.match(anatomyStudies[4].limits.en,/does not loop/);assert.match(anatomyStudies[4].limits.en,/does not change stellar/);
 assert.doesNotMatch(evolution.tracks.massive.stages[4].body.en,/marked separately/);
});
