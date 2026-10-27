import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {paintSolarDisk,writeSolarSurface,SOLAR_SURFACE_STYLE,SOLAR_SPOTS,solarLimb,solarHaloAlpha,solarSurfacePhase} from '../solarSurfaceModel.ts';

// Frozen pixels from the approved 01 generator before extraction, not a second
// implementation of the new sampler. They protect both resting and moving views.
test('the shared Sun preserves the approved golden reference at two activity phases',()=>{
 const expected=['055f9cc9767501a8722d9b60faefa8fe71f889e441f1764af91d8e12778c6bfa','35c2e954839e07fe9c411519a12ef89812983d78e9de56162debd0bcbc20a06b'];
 for(const [i,phase]of [0,8].entries()){const pixels=new Uint8ClampedArray(320*320*4);paintSolarDisk(pixels,320,phase);assert.equal(createHash('sha256').update(pixels).digest('hex'),expected[i]);}
});
test('rasterisation retains one circular body and a separate halo at both display sizes',()=>{
 for(const size of [80,320]){const pixels=new Uint8ClampedArray(size*size*4);paintSolarDisk(pixels,size,0);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const radius=Math.hypot((x+.5)*2/size-1,(y+.5)*2/size-1),alpha=pixels[(y*size+x)*4+3]!;assert.equal(alpha>0,radius<1);}}
 assert.throws(()=>paintSolarDisk(new Uint8ClampedArray(4),80,0),RangeError);
 assert.equal(solarHaloAlpha(.5),0);assert.equal(solarHaloAlpha(1.11),0);
 const s=SOLAR_SURFACE_STYLE,alphas=Array.from({length:100},(_,i)=>solarHaloAlpha(s.haloInner+(s.haloOuter-s.haloInner)*i/99));for(let i=1;i<alphas.length;i++)assert.ok(alphas[i]!<=alphas[i-1]!+1e-12);
});
test('gold colour, contrast and grouped spots retain a stable object-bound identity',()=>{
 assert.ok(Object.isFrozen(SOLAR_SURFACE_STYLE)&&Object.isFrozen(SOLAR_SPOTS));
 const bright=new Uint8ClampedArray(4),dark=new Uint8ClampedArray(4),spot=SOLAR_SPOTS[0]!;
 writeSolarSurface(bright,0,0,0,1,1,0);writeSolarSurface(dark,0,spot[0],spot[1],spot[2],spot[2],0);
 assert.ok(bright[0]!>bright[1]!&&bright[1]!>bright[2]!);assert.ok(dark[0]!<bright[0]!*.45);
 assert.ok(Math.hypot(SOLAR_SPOTS[0]![0]-SOLAR_SPOTS[1]![0],SOLAR_SPOTS[0]![1]-SOLAR_SPOTS[1]![1])<.1);
 assert.ok(SOLAR_SPOTS.some(spot=>spot[2]<0));assert.equal(solarLimb(1),1);assert.ok(solarLimb(0)>0&&solarLimb(0)<solarLimb(.5));
 assert.equal(solarSurfacePhase(8.49),8+2/6);assert.equal(solarSurfacePhase(NaN),0);
});
