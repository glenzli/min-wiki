import test from 'node:test';
import assert from 'node:assert/strict';
import { leafletPulvinus, leafletPairPose, primaryPulvinus } from '../anatomy.ts';
import { leafletFold, signalArrival, OBSERVED_PAIR } from '../model.ts';
import { MimosaScene } from '../scene.ts';

const local = { pinna: 1, extent: 'local' };
const tips = pose => pose.leafBases.map(([x,y],i) => [x + pose.length * Math.cos(pose.angles[i]), y + pose.length * Math.sin(pose.angles[i])]);
const distance = (a,b) => Math.hypot(a[0]-b[0], a[1]-b[1]);

test('the ringed tertiary organ follows its own arrival and recovers independently of the primary organ', () => {
  for (const extent of ['local','whole']) for (let pinna=0;pinna<4;pinna++) {
    const settings={extent,pinna}, arrival=signalArrival(pinna,OBSERVED_PAIR,settings);
    const before=leafletPulvinus(arrival-.001,settings);
    assert.equal(before.arrived,false);assert.equal(before.fold,0);assert.equal(before.flux,0);
    for (let i=0;i<=100;i++) assert.equal(leafletPulvinus(i/100,settings).fold,leafletFold(i/100,pinna,OBSERVED_PAIR,settings));
    assert.equal(leafletPulvinus(.6,settings).fold,1);
    assert.equal(leafletPulvinus(.6,settings).flux,0,'the held joint must not have continuing illustrative transfer');
    assert.ok(leafletPulvinus(.32,settings).flux>0);
    assert.ok(leafletPulvinus(.85,settings).recovering);
    assert.equal(leafletPulvinus(1,settings).water,1);
    assert.equal(leafletPulvinus(1,settings).flux,0);
    assert.equal(leafletPulvinus(1,settings).recovering,false);
  }
  assert.equal(primaryPulvinus(.6,local).contraction,0);
  assert.equal(leafletPulvinus(.6,local).fold,1);
});

test('first arrival is distinct from a fully recovered pair', () => {
  assert.equal(leafletPulvinus(.19,local).phase,'waiting');
  assert.equal(leafletPulvinus(.20,local).phase,'arrived');
  assert.equal(leafletPulvinus(.28,local).phase,'folding');
  assert.equal(leafletPulvinus(.6,local).phase,'held');
  assert.equal(leafletPulvinus(.85,local).phase,'recovering');
  assert.equal(leafletPulvinus(1,local).phase,'recovered');
});

test('two blades fold upward at distinct fixed joints without shortening their material lengths', () => {
  const open=leafletPairPose(0), reference=tips(open);
  for (let i=0;i<=100;i++) {
    const pose=leafletPairPose(i/100), ends=tips(pose);
    assert.deepEqual(pose.axis,open.axis);assert.deepEqual(pose.joints,open.joints);
    for(let side=0;side<2;side++) {
      assert.ok(Math.abs(distance(pose.leafBases[side],ends[side])-218)<1e-8);
      assert.ok(ends[side][1]<=reference[side][1]+1e-8,'both tips fold upward in the side projection');
      assert.ok(Math.abs(distance(pose.joints[side],pose.leafBases[side])-14)<1e-8,'the bending neck retains the illustrated connection');
    }
    assert.ok(Math.abs(ends[0][0]+ends[1][0])<1e-8);
    assert.ok(distance(...ends)<=distance(...reference)+1e-8);
  }
  assert.ok(distance(...tips(leafletPairPose(1)))<distance(...reference)/3);
});

function fixture(width,height) {
  const records={leaves:[],water:[],arrows:[],labels:[],curves:[]};
  const context=new Proxy({globalAlpha:1,createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),bezierCurveTo:(...args)=>records.curves.push(args)}, {get:(target,key)=>key in target?target[key]:()=>{}});
  const scene=new MimosaScene({clientWidth:width,clientHeight:height,getContext:()=>context});
  const leaf=scene.leaflet.bind(scene),ellipse=scene.ellipse.bind(scene),arrow=scene.arrow.bind(scene);
  scene.leaflet=(...args)=>{records.leaves.push(args);leaf(...args);};
  scene.ellipse=(...args)=>{if(args[4]==='#7dbfc4') records.water.push(args.slice(0,4));ellipse(...args);};
  scene.arrow=(...args)=>{records.arrows.push(args);arrow(...args);};
  scene.label=(...args)=>records.labels.push(args);
  return {scene,draw:(progress,settings)=>{for(const key of Object.keys(records))records[key]=[];scene.draw(progress,settings,'leaflet',1);return structuredClone(records);}};
}

test('production tertiary rendering uses the retained pair clock, actual bending necks and reversible water guides', t => {
  const oldResize=globalThis.ResizeObserver,oldDpr=globalThis.devicePixelRatio;
  globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.devicePixelRatio=1;
  t.after(()=>{globalThis.ResizeObserver=oldResize;globalThis.devicePixelRatio=oldDpr;});
  for (const [width,height] of [[320,330],[354,330],[960,200],[960,530]]) {
    const f=fixture(width,height),open=f.draw(0,local),held=f.draw(.6,local),changing=f.draw(.32,local),recovering=f.draw(.85,local);
    assert.equal(held.leaves.length,4,'two open references and two current blades');
    const blades=held.leaves.filter((_,i)=>i%2===1),pose=leafletPairPose(1);
    for(let i=0;i<2;i++) {assert.equal(blades[i][2],pose.angles[i]);assert.equal(blades[i][3],218);assert.deepEqual(blades[i].slice(0,2),pose.leafBases[i]);}
    assert.notDeepEqual(held.curves,open.curves,'real production joint contours bend');
    assert.ok(held.water.every((cell,i)=>cell[2]<open.water[i][2]&&cell[3]<open.water[i][3]));
    assert.equal(held.arrows.length,0);assert.equal(open.arrows.length,0);
    assert.equal(changing.arrows.length,4);assert.equal(recovering.arrows.length,4);
    assert.ok(changing.arrows.every(a=>a[3]>a[1]));assert.ok(recovering.arrows.every(a=>a[3]<a[1]));
    assert.deepEqual(f.draw(1,local),open,'full recovery restores the same material objects');
    f.draw(.18,{pinna:3,extent:'whole'});assert.deepEqual(f.draw(.6,local),held,'switching scope and reverse scrubbing cannot substitute primary-organ state');
    assert.equal(held.labels.find(l=>l[0]==='金圈处的小叶叶枕')[3].anchor[0],22);
    f.scene.dispose();
  }
});
