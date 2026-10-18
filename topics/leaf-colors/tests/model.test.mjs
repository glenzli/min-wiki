import test from 'node:test';
import assert from 'node:assert/strict';
import { colorRoute, compartmentPigments, pigmentDestination, pigmentsAt, leafRGB, journeyAt, JOURNEY_DURATION, routeLevel, leafSectionAt, LEAF_SECTION, SECTION_SPAN, sectionContextTiles, SCALE_ENTRIES, CHLOROPLAST_ENTRY, cellEdge, vacuolePoint, BLADE_ANGLE, LEAF_METRIC, UNITS_PER_UM, SURFACE_CELL_SCALE, SECTION_TURN_END, SURFACE_FRAMING, scaleCamera, metricScaleBar } from '../model.ts';

test('the retained chloroplast fits in the cell cortex and uses the same calibrated micrometres',()=>{
  const sample=SCALE_ENTRIES[0],cell=SCALE_ENTRIES[1],entry=CHLOROPLAST_ENTRY;
  const chloroplastWidthUm=420*entry.size*cell.size*sample.size/UNITS_PER_UM;
  assert.ok(Math.abs(chloroplastWidthUm-4)<1e-10,'the chosen teaching organelle is about 4 µm, not independently enlarged');
  const outline=Array.from({length:192},(_,i)=>{const [x,y]=cellEdge(i/192*Math.PI*2,171,134,1.4,.85);return [x,y-2];});
  const vacuole=Array.from({length:192},(_,i)=>vacuolePoint(i/192*Math.PI*2));
  const contains=(polygon,x,y)=>{
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[i],b=polygon[j];
      if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }return inside;
  };
  for(let i=0;i<192;i++){
    const a=i/192*Math.PI*2,dx=210*Math.cos(a)*entry.size,dy=109.2*Math.sin(a)*entry.size;
    const x=entry.x+dx*Math.cos(entry.angle)-dy*Math.sin(entry.angle),y=entry.y+dx*Math.sin(entry.angle)+dy*Math.cos(entry.angle);
    assert.ok(contains(outline,x,y),'the selected organelle cannot cross the cell wall');
    assert.ok(!contains(vacuole,x,y),'a chloroplast must remain in cytoplasm, outside the vacuole');
  }
  const camera=scaleCamera(3,entry),wholeCell=scaleCamera(2,entry);
  assert.ok(Math.abs((camera.x-wholeCell.x)/(cell.size*sample.size)-entry.x)<1e-9);
  assert.ok(Math.abs((camera.y-wholeCell.y)/(cell.size*sample.size)-entry.y)<1e-9);
});

test('macro blade, microscopic thickness and surface cell pitch share one length unit',()=>{
  const sample=SCALE_ENTRIES[0];
  assert.equal(LEAF_METRIC.bladeLength/UNITS_PER_UM,60000);
  assert.ok(Math.abs((LEAF_SECTION.bottom-LEAF_SECTION.top)*sample.size/UNITS_PER_UM-200)<1e-10);
  assert.ok(Math.abs(7*SURFACE_CELL_SCALE/UNITS_PER_UM-30)<1e-10);
  assert.ok((LEAF_SECTION.bottom-LEAF_SECTION.top)*sample.size/LEAF_METRIC.bladeLength<.004,
    'a submillimetre lamina cannot become a centimetre-scale block');
});

test('view rotation finishes before uniform zoom resumes, without an independent thickness multiplier',()=>{
  const destination={x:4,y:-2,size:.8};
  const fixed=SURFACE_FRAMING/SCALE_ENTRIES[0].size;
  for(let i=0;i<=60;i++){
    const position=.6+(SECTION_TURN_END-.6)*i/60;
    assert.ok(Math.abs(scaleCamera(position,destination).magnification-fixed)<1e-9);
    const section=leafSectionAt(position);
    assert.ok(Math.abs(section.surfaceScale**2+section.sectionScale**2-1)<1e-12);
    assert.equal(section.sectionTransform[0],1,'section width is not stretched by the turn');
  }
  assert.equal(leafSectionAt(SECTION_TURN_END).sectionScale,1);
  assert.ok(scaleCamera(.95,destination).magnification>fixed);
});

test('scale bars report the rendered model length across millimetres and micrometres',()=>{
  for(const pixelsPerUm of [.003,.08,1.2,12,80]){
    const bar=metricScaleBar(pixelsPerUm,96);
    assert.ok(bar.pixels<=96+1e-9 && bar.pixels>=30);
    assert.ok(Math.abs(bar.pixels/pixelsPerUm-bar.lengthUm)<1e-8);
  }
});

test('zooming towards a retained cell or organelle never drives its center farther from the frame center',()=>{
  for(const destination of [CHLOROPLAST_ENTRY,{x:4,y:-2,size:.92,angle:0}]) {
    for(const lower of [1,2]) {
      const target=scaleCamera(lower+1,destination);
      let previous=Infinity;
      for(let i=0;i<=200;i++) {
        const position=lower+i/200,camera=scaleCamera(position,destination);
        const distance=Math.hypot(target.x-camera.x,target.y-camera.y)*camera.magnification;
        assert.ok(distance<=previous+1e-8,`target moved away during scale ${position}`);
        previous=distance;
      }
      assert.equal(previous,0,'the approached object finishes at the frame center');
    }
  }
});

test('epidermis has a motionless inspection interval before the tissue turn', async () => {
  const {scaleCamera,epidermisVisible,SCALE_STOPS}=await import('../model.ts');
  const destination={x:4,y:-2,size:.72};
  for(const position of [.44,.5,.56,.6]) {
    assert.equal(leafSectionAt(position).angle,0);
    assert.equal(leafSectionAt(position).textureOpacity,1);
    assert.equal(leafSectionAt(position).foregroundOpacity,1,'the whole surface remains until the section turn');
    assert.deepEqual(scaleCamera(position,destination),scaleCamera(.5,destination));
    assert.ok(epidermisVisible(position));
  }
  assert.deepEqual(SCALE_STOPS,[0,.5,1,2,3]);
  assert.ok(leafSectionAt(.7).angle>0);
});

test('a marked cut removes only the concealing foreground after surface inspection', () => {
  let last = 0;
  for (let position = 0; position <= .6; position += .01) {
    const state = leafSectionAt(position);
    assert.equal(state.foregroundOpacity,1,'no tissue is removed during approach');
    assert.equal(state.sectionScale,0,'the surface does not already imply exposed mesophyll');
    assert.ok(state.textureOpacity >= last && state.textureOpacity <= 1);
    last = state.textureOpacity;
  }
  assert.equal(leafSectionAt(0).textureOpacity,0);
  assert.equal(leafSectionAt(.5).textureOpacity,1);
  assert.ok(leafSectionAt(.5).guideOpacity>0,'mark the cut while the surface is still whole');
  assert.ok(leafSectionAt(.65).foregroundOpacity>0 && leafSectionAt(.65).foregroundOpacity<1);
  assert.equal(leafSectionAt(.70).foregroundOpacity,0);
  assert.equal(leafSectionAt(SECTION_TURN_END).guideOpacity,0);
});

test('continuous tissue context covers the viewport without isolated side edges or duplicated selected cells',()=>{
  for(const [left,right] of [[-1700,1500],[-130,70],[290,1400],[-1400,-300]]) {
    const tiles=sectionContextTiles(left,right);
    assert.ok(tiles[0]*SECTION_SPAN+LEAF_SECTION.left<=left);
    assert.ok(tiles.at(-1)*SECTION_SPAN+LEAF_SECTION.right>=right);
    for(let i=0;i<100;i++) {
      const x=left+(right-left)*(i+.5)/100;
      assert.equal(tiles.filter(tile=>x>=tile*SECTION_SPAN+LEAF_SECTION.left&&x<tile*SECTION_SPAN+LEAF_SECTION.right).length,1);
    }
    assert.equal(tiles.filter(tile=>tile===0).length,left<LEAF_SECTION.right&&right>LEAF_SECTION.left?1:0);
  }
});

test('the full epidermal sheet has no gaps or duplicate coverage and supplies the cut seam', async () => {
  const {EpidermisSurface,epidermisSeam}=await import('../epidermis.ts');
  const surface=new EpidermisSurface(),sheet=surface.geometry;
  const cells=sheet.cells.map(cell=>({ ...cell,
    left:Math.min(...cell.contour.map(p=>p[0])),right:Math.max(...cell.contour.map(p=>p[0])),
    top:Math.min(...cell.contour.map(p=>p[1])),bottom:Math.max(...cell.contour.map(p=>p[1])),
  }));
  for(let j=0;j<13;j++)for(let i=0;i<15;i++) {
    const x=-150+i*20.31,y=-200+j*29.13;
    let count=0;
    for(const cell of cells) {
      if(x<cell.left||x>cell.right||y<cell.top||y>cell.bottom)continue;
      let inside=false;
      cell.contour.forEach((a,k)=>{
        const b=cell.contour[(k+1)%cell.contour.length];
        if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
      });
      if(inside)count++;
    }
    assert.equal(count,1,`continuous sheet at ${x},${y}`);
  }
  const {x,y,size}=SCALE_ENTRIES[0];
  const point=(localX)=>{
    const wx=x+localX*size;
    return [wx*Math.cos(-BLADE_ANGLE)-y*Math.sin(-BLADE_ANGLE),wx*Math.sin(-BLADE_ANGLE)+y*Math.cos(-BLADE_ANGLE)];
  };
  const from=point(LEAF_SECTION.left),to=point(LEAF_SECTION.right);
  const seam=surface.seam(from,to);
  assert.equal(seam[0],0);assert.equal(seam.at(-1),1);
  assert.ok(seam.length>8,'the cut intersects multiple existing surface cells');
  assert.ok(seam.every((t,i)=>i===0||t>seam[i-1]));
  assert.deepEqual(surface.seam(to,from).map(t=>1-t).reverse().map(t=>+t.toFixed(8)),
    seam.map(t=>+t.toFixed(8)),'both viewing directions intersect the same walls');
  const rawFrom=from.map(v=>v/SURFACE_CELL_SCALE),rawTo=to.map(v=>v/SURFACE_CELL_SCALE);
  assert.deepEqual(epidermisSeam(sheet,rawFrom.map((v,i)=>v+[378,420][i]),rawTo.map((v,i)=>v+[378,420][i])).map(t=>+t.toFixed(7)),
    seam.map(t=>+t.toFixed(7)),'the texture tile and physical cut share periodic walls without a sampling seam');
  const wideLeft=LEAF_SECTION.left-SECTION_SPAN,wideRight=LEAF_SECTION.right+SECTION_SPAN;
  const wide=surface.seam(point(wideLeft),point(wideRight)).map(u=>wideLeft+(wideRight-wideLeft)*u)
    .filter(x=>x>LEAF_SECTION.left+1e-7&&x<LEAF_SECTION.right-1e-7);
  assert.deepEqual(wide.map(x=>+x.toFixed(6)),seam.slice(1,-1).map(u=>+(LEAF_SECTION.left+SECTION_SPAN*u).toFixed(6)),
    'extending the visible section retains the same internal walls instead of inserting sample-box edges');
});

test('all vacuolar pigment positions use the same bounded membrane contour', async () => {
  const {vacuolePoint,VACUOLE,cellEdge}=await import('../model.ts');
  for(let i=0;i<160;i++) {
    const a=i*2.399963, r=Math.sqrt((i+.5)/160)*.94;
    const edge=cellEdge(a,VACUOLE.rx,VACUOLE.ry,VACUOLE.seed);
    const point=vacuolePoint(a,r), border=vacuolePoint(a);
    assert.deepEqual(border,[VACUOLE.x+edge[0],VACUOLE.y+edge[1]]);
    assert.ok(Math.abs(point[0]-VACUOLE.x)<Math.abs(border[0]-VACUOLE.x)+1e-9);
    assert.ok(Math.abs(point[1]-VACUOLE.y)<Math.abs(border[1]-VACUOLE.y)+1e-9);
    assert.deepEqual(point,vacuolePoint(a,r));
  }
});

test('surface and section turn together at a fixed upper edge and reverse exactly', () => {
  let previous = leafSectionAt(0);
  assert.equal(previous.sectionScale, 0);
  assert.equal(previous.surfaceScale, 1);
  assert.ok(previous.surfaceTransform.every((v,i)=>Math.abs(v-[1,0,0,1,0,0][i])<1e-12));
  const entry = SCALE_ENTRIES[0];
  assert.ok(entry.x+LEAF_SECTION.left*entry.size>30,'sample stays beside the midrib');
  for (let i=1;i<=320;i++) {
    const position=i/100, state=leafSectionAt(position);
    assert.ok(state.angle >= previous.angle);
    assert.ok(state.sectionScale >= previous.sectionScale);
    assert.ok(state.surfaceScale <= previous.surfaceScale);
    assert.ok(state.bladeOpacity <= previous.bladeOpacity);
    assert.ok(state.sectionScale >= 0 && state.sectionScale <= 1);
    assert.ok(state.bladeOpacity >= 0 && state.bladeOpacity <= 1);
    if (position < 1) assert.equal(state.bladeOpacity,1);
    assert.ok(Math.abs(state.sectionScale**2+state.surfaceScale**2-1)<1e-12);
    const [a,b,c,d,e,f]=state.surfaceTransform, [aa,bb,cc,dd]=state.sectionTransform;
    for (const x of [-3*SECTION_SPAN,LEAF_SECTION.left,0,LEAF_SECTION.right,3*SECTION_SPAN]) {
      const surfaceX=a*(entry.x+x*entry.size)+c*entry.y+e;
      const surfaceY=b*(entry.x+x*entry.size)+d*entry.y+f;
      const sectionX=entry.x+(aa*x+cc*LEAF_SECTION.top)*entry.size;
      const sectionY=entry.y+(bb*x+dd*LEAF_SECTION.top)*entry.size;
      assert.ok(Math.abs(surfaceX-sectionX)<1e-12 && Math.abs(surfaceY-sectionY)<1e-12,'upper epidermis stays on the leaf surface across the whole seam');
    }
    assert.deepEqual(state,leafSectionAt(position));
    previous=state;
  }
  assert.equal(leafSectionAt(1).bladeOpacity,1);
  assert.equal(leafSectionAt(1).sectionScale,1);
  for (const stop of [.12,.28,.36,.52,1,1.3]) {
    const a=leafSectionAt(stop-1e-6), b=leafSectionAt(stop+1e-6);
    const av=Object.values(a).flat(), bv=Object.values(b).flat();
    av.forEach((value,i)=>assert.ok(Math.abs(value-bv[i])<.001));
  }
  const halfway=leafSectionAt(.57); leafSectionAt(2); leafSectionAt(0);
  assert.deepEqual(leafSectionAt(.57),halfway);
});

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
