import test from 'node:test';
import assert from 'node:assert/strict';
import {bodies,lastPair,homeStops,homeRoute,homeSideViews,homeContext,homeRoutePosition,stepHomeRoute,comparisonFrame,readExploration,stellarOrbitFrame} from '../comparisonModel.ts';
test('comparison defaults and legacy zoom links remain distinct',()=>{
 assert.equal(readExploration('').chapter,'compare');
 assert.equal(readExploration('?origin=sun').chapter,'zoom');
 assert.equal(readExploration('?scale=.7').chapter,'zoom');
 assert.equal(readExploration('?mode=homes&scale=.7').chapter,'homes');
 assert.deepEqual(readExploration('?mode=bad&pair=99&home=-9'),{chapter:'compare',pair:lastPair,home:0});
 assert.deepEqual(readExploration('?mode=compare&pair=1.4&home=2'),{chapter:'compare',pair:1.4,home:2});
 assert.equal(readExploration('?mode=homes&home=6').home,6);
 assert.equal(readExploration('?mode=homes&home=999').home,homeStops.length-1);
});
test('every structure stop has bilingual explanation, qualification, and a source',async()=>{
 const {default:words}=await import('../comparisonContent.json',{with:{type:'json'}});
 assert.equal(homeStops.length,7);
 for(const language of ['zh','en'])for(const field of ['homeNames','homeTitles','homeNotes','homeBoundary','homeAnchor','homeSources']){
  assert.equal(words[language][field].length,homeStops.length,`${language}.${field}`);
  assert.ok(words[language][field].every(Boolean));
 }
 for(const language of ['zh','en']){
  assert.equal(words[language].homeCues.length,homeStops.length,`${language}.homeCues`);
  assert.ok(words[language].homeCues.every(cues=>cues.length===2&&cues.every(cue=>cue.label&&cue.detail)));
 }
 assert.match(words.en.homeNotes[2],/dwarf galaxies/);
 assert.match(words.en.homeNotes[3],/not take us inside the Virgo Cluster/);
 assert.match(words.en.homeNotes[6],/not an outer wall/);
 for(const language of ['zh','en'])assert.equal(words[language].homeSideNames.length,homeSideViews.length);
});
test('the structural address skips neighbor and pattern views without breaking old links',()=>{
 assert.deepEqual(homeRoute.map(index=>homeStops[index]),['solar-system','milky-way','local-group','supercluster','observable-universe']);
 assert.deepEqual(homeSideViews.map(index=>homeStops[index]),['nearby-clusters','cosmic-web']);
 assert.equal(stepHomeRoute(2,1),4);
 assert.equal(stepHomeRoute(4,1),6);
 assert.equal(stepHomeRoute(6,-1),4);
 assert.equal(homeContext(3),4);
 assert.equal(homeContext(5),6);
 assert.equal(homeRoutePosition(3),3);
 assert.equal(homeRoutePosition(5),4);
 assert.equal(readExploration('?mode=homes&home=3').home,3);
 assert.equal(readExploration('?mode=homes&home=5').home,5);
});
test('the comparison sequence and authored labels stay aligned after removing WOH G64',async()=>{
 const {default:words}=await import('../comparisonContent.json',{with:{type:'json'}});
 assert.equal(bodies.length,7);
 assert.ok(bodies.every(body=>body.id!=='woh-g64'));
 for(const language of ['zh','en']){
  assert.equal(words[language].names.length,bodies.length);
  assert.equal(words[language].kinds.length,bodies.length);
  for(const field of ['pairs','pairTitles','pairNotes'])assert.equal(words[language][field].length,lastPair+1,`${language}.${field}`);
 }
});
test('every moving comparison frame retains body identity and a single diameter ratio',()=>{
 for(const width of [342,1100])for(let n=0;n<=lastPair*100;n++){
  const frame=comparisonFrame(n/100,width);
  frame.forEach((b,i)=>{assert.equal(b.id,bodies[i].id);assert.ok(Number.isFinite(b.x)&&b.radius>0&&b.opacity>=0&&b.opacity<=1);assert.ok(Math.abs(b.radius/frame[0].radius-bodies[i].radius/bodies[0].radius)<1e-9);});
 }
 for(let q=0;q<=lastPair;q++){const frame=comparisonFrame(q,342);assert.equal(frame[q].opacity,1);assert.equal(frame[q+1].opacity,1);assert.ok(frame[q].x-frame[q].radius>0);assert.ok(frame[q+1].x+frame[q+1].radius<342);}
 const a=comparisonFrame(1-1e-8,1000),b=comparisonFrame(1+1e-8,1000);a.forEach((v,i)=>assert.ok(Math.abs(v.radius-b[i].radius)/v.radius<1e-6));
});

test('Antares extends the sequence without changing legacy Arcturus stop',()=>{assert.equal(bodies[3].id,'arcturus');assert.equal(bodies[4].id,'antares');assert.equal(bodies[4].radius/bodies[2].radius,700);assert.equal(readExploration('?mode=compare&pair=2').pair,2);});

test('short and immersive canvases keep spherical diameter ratios within their available height', () => {
 for (const height of [140, 220, 600]) for (const width of [340, 1200]) for (let pair=0;pair<=lastPair;pair++) {
  const frame = comparisonFrame(pair, width, height);
  const a = frame[pair], b = frame[pair + 1];
  assert.ok(Math.abs(a.radius / b.radius - bodies[pair].radius / bodies[pair + 1].radius) < 1e-10);
  assert.ok(b.radius * 2 < height - 30);
 }
});

test('estimated giant outlines and planetary orbits share one scale, not icon sizes',()=>{
 for(const [width,height] of [[342,250],[1000,160],[1200,520]]){
  const vy=stellarOrbitFrame(5,width,height),st=stellarOrbitFrame(6,width,height);
  assert.equal(vy.body.id,'vy-canis-majoris');assert.equal(st.body.id,'stephenson-2-18');
  assert.ok(vy.orbits[4].inside);assert.equal(vy.orbits[5].inside,false);assert.ok(st.orbits[5].inside);
  assert.ok(st.radius>st.orbits[5].radius&&st.radius/st.orbits[5].radius<1.06);
  assert.ok(st.radius*2<height-40);assert.ok(st.radius*2<width*.86);
  assert.ok(Math.abs(st.radius/vy.radius-2150/1420)<1e-10);
  for(const g of [vy,st]) assert.ok(Math.abs(g.radius/g.orbits[2].radius-g.body.radius/149597870.7)<1e-10);
 }
 assert.equal(bodies[5].id,'vy-canis-majoris');
 assert.equal(readExploration('?pair=6').pair,5);
 assert.equal(readExploration('?pair=5&pairVersion=2').pair,5);
});

test('short-viewport framing preserves the physical ruler and fits the Earth anchor', async () => {
 const {viewportScale,halfWidthKm,EARTH_RADIUS_KM} = await import('../model.ts');
 for (const [width,height] of [[1200,140],[1000,360],[340,300]]) {
  const half = halfWidthKm(0) * viewportScale(width,height);
  const diameter = EARTH_RADIUS_KM / half * width;
  assert.ok(diameter < height * .8);
  assert.equal(half, halfWidthKm(0) * Math.max(1,width/(2*height)));
 }
});


test('VY Canis Majoris extends Antares with an explicit representative photospheric estimate', () => {
 assert.equal(bodies[5].id, 'vy-canis-majoris');
 assert.equal(bodies[5].radius / bodies[2].radius, 1420);
 assert.ok(bodies[5].radius / bodies[4].radius > 2);
 assert.equal(readExploration('?mode=compare&pair=3').pair, 3);
 assert.equal(readExploration('?mode=compare&pair=4').pair, 4);
 const before = comparisonFrame(3-1e-8,1000), after = comparisonFrame(3+1e-8,1000);
 before.forEach((body,i)=>assert.ok(Math.abs(body.radius-after[i].radius)/body.radius<1e-6));
});
