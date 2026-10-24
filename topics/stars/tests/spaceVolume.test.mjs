import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {StellarMedium,SPACE_VOLUME_EXTENT} from '../spaceVolume.ts';
import {SPACE_PARTICLES,stellarSpaceFrame,stellarObservationZoom,writeSpaceParticles} from '../spaceModel.ts';

const base={chapter:'evolution',track:'solar',progress:0,nebula:'nursery',illumination:'emission'};
const positions=new Float32Array(SPACE_PARTICLES*3),alpha=new Float32Array(SPACE_PARTICLES);
const update=(medium,input)=>{const frame=stellarSpaceFrame(input);writeSpaceParticles(frame,positions,alpha);medium.update(frame,positions,alpha);return medium.medium.data.slice();};

test('nebular illumination preserves the exact retained density and dust field, including after replay',()=>{
  const medium=new StellarMedium();
  const emission=update(medium,{...base,chapter:'nebulae'});
  const data=medium.medium.data;
  assert.ok(emission.some((v,i)=>i%4===0&&v>30),'gas has a spatially extended density');
  assert.ok(emission.some((v,i)=>i%4===2&&v>10),'dust has its own absorption field');
  for(const illumination of ['reflection','dark','emission'])assert.deepEqual(update(medium,{...base,chapter:'nebulae',illumination}),emission);
  assert.equal(medium.medium.data,data);
  update(medium,{...base,progress:.18});update(medium,{...base,progress:.7});
  assert.deepEqual(update(medium,{...base,chapter:'nebulae'}),emission);
});

test('shell colour occupies connected regions instead of averaging every bright voxel to one hue',()=>{
  for(const nebula of ['planetary','supernova']){
    const medium=new StellarMedium(),data=update(medium,{...base,chapter:'nebulae',nebula}),size=medium.medium.resolution;
    let emitting=0,cool=0,warm=0;
    for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const index=((z*size+y)*size+x)*4,weight=data[index+1],colour=data[index+3]/255;
      emitting+=weight;if(colour<.3)cool+=weight;if(colour>.7)warm+=weight;
    }
    assert.ok(cool/emitting>.15&&warm/emitting>.15,`${nebula} retains visible emitting material in both colour regions`);
  }
});

test('the volume follows the numbered cloud into the same centered disk with finite empty boundaries',()=>{
  const medium=new StellarMedium(),cloud=update(medium,base),disk=update(medium,{...base,progress:1.2/6}),size=medium.medium.resolution;
  assert.equal(medium.medium.data.byteLength,size**3*4);assert.ok(size<=48);
  const extent=(data,axis)=>{let sum=0,second=0;for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){const weight=data[((z*size+y)*size+x)*4],coordinate=([x,y,z][axis]/(size-1)*2-1)*SPACE_VOLUME_EXTENT;sum+=weight;second+=weight*coordinate*coordinate;}return Math.sqrt(second/sum);};
  assert.ok(extent(disk,1)<extent(cloud,1)*.35,'the existing cloud geometry, rather than a replacement portrait, becomes a disk');
  assert.ok(extent(disk,0)>extent(disk,1)*5);
  for(let a=0;a<size;a++)for(let b=0;b<size;b++)for(const [x,y,z]of [[0,a,b],[size-1,a,b],[a,0,b],[a,size-1,b],[a,b,0],[a,b,size-1]]){
    const index=((z*size+y)*size+x)*4;assert.ok(disk.subarray(index,index+4).every(value=>value===0));
  }
});

test('classic detail uses one larger field and returns to the original evolution resolution without changing parcel geometry',()=>{
  const medium=new StellarMedium(),owner=medium.medium;
  const initial=update(medium,base),evolutionData=medium.medium.data;
  assert.equal(medium.medium.resolution,48);
  const detailed=update(medium,{...base,chapter:'nebulae',reference:'pillars'}),detailData=medium.medium.data;
  assert.equal(medium.medium,owner);assert.equal(medium.medium.resolution,64);assert.equal(detailData.byteLength,64**3*4);
  assert.notEqual(detailData,evolutionData);
  update(medium,{...base,chapter:'nebulae',reference:'horsehead'});assert.equal(medium.medium.data,detailData,'same-quality reference switches reuse one field');
  assert.deepEqual(update(medium,base),initial);assert.equal(medium.medium.resolution,48);
  assert.deepEqual(update(medium,{...base,chapter:'nebulae',reference:'pillars'}),detailed);
});

test('shell media have hollow centers and rewind to the same field without a phase cache',()=>{
  const medium=new StellarMedium(),size=medium.medium.resolution;
  for(const nebula of ['planetary','supernova']){
    const input={...base,chapter:'nebulae',nebula},original=update(medium,input);
    const center=((Math.floor(size/2)*size+Math.floor(size/2))*size+Math.floor(size/2))*4;
    assert.equal(original[center],0);assert.ok(original.some((v,i)=>i%4===0&&v>20));
    update(medium,{...base,progress:.1});assert.deepEqual(update(medium,input),original);
  }
});
test('solar outflow has material before its gas emission is switched on by the heating central star',()=>{
 const medium=new StellarMedium(),wind=update(medium,{...base,progress:4.85/6});
 assert.ok(wind.some((v,i)=>i%4===0&&v>5),'wind matter is already present');
 assert.ok(wind.every((v,i)=>i%4!==1||v===0),'early wind has no ionized emission');
 const glowing=update(medium,{...base,progress:.875});
 assert.ok(glowing.some((v,i)=>i%4===1&&v>5),'the same outflow later emits');
 assert.deepEqual(update(medium,{...base,progress:4.85/6}),wind,'rewind restores matter and its pre-ionization state');
});
test('evolution keeps polar ejecta and their whole splat inside one current field while preserving world coordinates',()=>{
 const medium=new StellarMedium(),owner=medium.medium,data=owner.data;
 for(const track of ['solar','massive','very-massive'])for(const progress of [.83,.875,.9,.925,1]){
  const input={...base,track,progress},frame=stellarSpaceFrame(input);writeSpaceParticles(frame,positions,alpha);const world=positions.slice();
  medium.update(frame,positions,alpha);assert.equal(medium.medium,owner);assert.equal(owner.data,data);assert.equal(owner.resolution,48);assert.deepEqual(positions,world);
  for(const coordinate of positions){const grid=(coordinate/medium.extent+1)*.5*(owner.resolution-1);assert.ok(grid>=3-1e-6&&grid<=owner.resolution-4+1e-6,'an ejecta splat is cropped by the field boundary');}
  const current=owner.data.slice(),extent=medium.extent;update(medium,{...base,progress:.1});assert.deepEqual(update(medium,input),current);assert.equal(medium.extent,extent);
 }
 update(medium,{...base,chapter:'nebulae',reference:'orion'});assert.equal(medium.extent,SPACE_VOLUME_EXTENT,'classic clouds retain their original map');
});

test('recognition radii retain the order of ordinary stars and their compact endpoints',()=>{
  for(const track of ['low-mass','solar','massive','very-massive']){
    const main=stellarSpaceFrame({...base,track,progress:2/6}),end=stellarSpaceFrame({...base,track,progress:1});
    assert.ok(main.starRadius>end.starRadius,`${track} does not enlarge its compact object beyond the living star`);
    assert.equal(main.compact,false);assert.equal(end.compact,true);
  }
  const white=stellarSpaceFrame({...base,progress:1}),neutron=stellarSpaceFrame({...base,track:'massive',progress:1});
  assert.ok(white.starRadius>neutron.starRadius);
});

test('close framing exposes a main-sequence surface while keeping cloud/shell framing and the radius order',()=>{
  assert.ok(stellarObservationZoom({...base,chapter:'nebulae'},3)<=1,'full classic cloud silhouettes need wider framing than a stellar surface');
  assert.equal(stellarObservationZoom({...base,chapter:'nebulae',nebula:'planetary'},3),1);
  assert.equal(stellarObservationZoom({...base,chapter:'nebulae',nebula:'supernova'},3),1);
  const main={...base,progress:2/6};assert.ok(stellarObservationZoom(main,3)>2.1&&stellarObservationZoom(main,3)<2.3);
  for(const progress of [.14,.2])assert.ok(stellarObservationZoom({...base,progress},3)<1,'visible polar outflows need headroom at both ends');
  assert.ok(stellarObservationZoom(main,1)<stellarObservationZoom(main,3));
  let prior=0;
  for(let phase=2;phase<=4;phase+=.025){const input={...base,progress:phase/6},frame=stellarSpaceFrame(input),visibleRadius=frame.starRadius*stellarObservationZoom(input,3);assert.ok(visibleRadius>=prior-1e-10);prior=visibleRadius;}
  for(const phase of [1,1.3,1.95,4.2,5.55]){
    const before=stellarObservationZoom({...base,progress:(phase-1e-5)/6},3),after=stellarObservationZoom({...base,progress:(phase+1e-5)/6},3);
    assert.ok(Math.abs(before-after)<.001,'camera framing must also be reversible and continuous');
  }
  const newborn={...base,progress:.9},cooled={...base,progress:1};
  assert.ok(stellarObservationZoom(newborn,3)<1,'the newly exposed remnant keeps its shell context');
  assert.ok(stellarObservationZoom(cooled,3)>stellarObservationZoom(newborn,3),'the fading shell permits a closer remnant view');
  assert.ok(stellarSpaceFrame(cooled).starRadius*stellarObservationZoom(cooled,3)<stellarSpaceFrame(main).starRadius*stellarObservationZoom(main,3),'the compact close-up remains smaller than the main-sequence disk');
});
test('the expanding solar envelope and massive ejecta fit the default camera before the cooling close-up',()=>{
 for(const track of ['solar','massive','very-massive'])for(const progress of [.79,.83,.85,.875,.9,.925]){
  const input={...base,track,progress},frame=stellarSpaceFrame(input);if(frame.shellOpacity<.01)continue;
  writeSpaceParticles(frame,positions,alpha);
  for(const aspect of [1238/450,1.5,.8]){
   const camera=new PerspectiveCamera(36,aspect,.05,70);camera.position.set(6.3,3.4,9.2);camera.lookAt(0,0,0);camera.zoom=stellarObservationZoom(input,aspect);camera.updateProjectionMatrix();camera.updateMatrixWorld();
   for(let i=0;i<SPACE_PARTICLES;i+=4){const point=new Vector3(...positions.subarray(i*3,i*3+3)).project(camera);assert.ok(Math.abs(point.x)<.96&&Math.abs(point.y)<.96,`${track} ${progress} at ${aspect} clips its outflow`);}
  }
 }
});

test('all classic nurseries keep luminous gas and dense silhouettes inside narrow and desktop frames',()=>{
 for(const reference of ['orion','pillars','horsehead']){
  const input={...base,chapter:'nebulae',reference},medium=new StellarMedium();
  update(medium,input);
  const {resolution:size,data}=medium.medium;
  const front=medium.medium.front;
  for(const aspect of [368/330,600/450,1238/472]){
    const camera=new PerspectiveCamera(36,aspect,.05,70);
    camera.position.set(6.3,3.4,9.2);camera.lookAt(0,0,0);
    camera.zoom=stellarObservationZoom(input,aspect);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    let extentX=0,extentY=0,samples=0;
    for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const index=((z*size+y)*size+x)*4;
      if(front){
        const distance=(front.distance[index/4]/255*2-1)*front.range;
        // Coefficients are not pre-blurred densities. Bound the reconstructed
        // support, including the shader's small object-bound erosion envelope.
        const margin=.035;
        const dense=data[index+2]>=90&&distance<margin;
        const emitting=data[index+1]>=12&&Math.abs(distance-front.offset)<front.width+margin;
        const halo=data[index]>=12&&Math.abs(distance-front.haloOffset)<front.haloWidth+margin;
        if(!dense&&!emitting&&!halo)continue;
      }else if(data[index+1]<12&&data[index+2]<90)continue;
      const point=new Vector3(...[x,y,z].map(v=>(v/(size-1)*2-1)*SPACE_VOLUME_EXTENT)).project(camera);
      extentX=Math.max(extentX,Math.abs(point.x));extentY=Math.max(extentY,Math.abs(point.y));samples++;
    }
    assert.ok(samples>1000,'the check includes extended emitting material, not only the central source');
    assert.ok(extentX<.95&&extentY<.95,`${reference} at ${aspect} retains gas and opaque dust with room at its edges (${extentX}, ${extentY})`);
  }
 }
});

test('resolved dark fronts reuse one current distance array and release it outside dark-cloud cases',()=>{
  const medium=new StellarMedium(),pillars={...base,chapter:'nebulae',reference:'pillars'};
  const original=update(medium,pillars),front=medium.medium.front,distance=front.distance.slice();
  for(const illumination of ['reflection','dark','emission']){
    assert.deepEqual(update(medium,{...pillars,illumination}),original);
    assert.equal(medium.medium.front,front);assert.deepEqual(front.distance,distance);
  }
  update(medium,{...pillars,reference:'horsehead'});
  assert.equal(medium.medium.front,front);assert.notDeepEqual(front.distance,distance);
  update(medium,{...pillars,reference:'orion'});assert.equal(medium.medium.front,undefined);
  update(medium,base);assert.equal(medium.medium.front,undefined);
  assert.deepEqual(update(medium,pillars),original);assert.deepEqual(medium.medium.front.distance,distance);
});
