import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {StellarMedium,SPACE_VOLUME_EXTENT} from '../spaceVolume.ts';
import {SPACE_PARTICLES,stellarSpaceFrame,stellarObservationZoom,writeSpaceParticles} from '../spaceModel.ts';

const base={chapter:'evolution',track:'solar',progress:0,nebula:'nursery',illumination:'emission'};
const positions=new Float32Array(SPACE_PARTICLES*3),alpha=new Float32Array(SPACE_PARTICLES);
const update=(medium,input)=>{const frame=stellarSpaceFrame(input);writeSpaceParticles(frame,positions,alpha);medium.update(frame,positions,alpha);return medium.medium.data.slice();};

test('nebular illumination preserves the exact retained density and dust field, including after replay',()=>{
  const medium=new StellarMedium(),data=medium.medium.data;
  const emission=update(medium,{...base,chapter:'nebulae'});
  assert.ok(emission.some((v,i)=>i%4===0&&v>30),'gas has a spatially extended density');
  assert.ok(emission.some((v,i)=>i%4===2&&v>10),'dust has its own absorption field');
  for(const illumination of ['reflection','dark','emission'])assert.deepEqual(update(medium,{...base,chapter:'nebulae',illumination}),emission);
  assert.equal(medium.medium.data,data);
  update(medium,{...base,progress:.18});update(medium,{...base,progress:.7});
  assert.deepEqual(update(medium,{...base,chapter:'nebulae'}),emission);
});

test('enhanced colour occupies connected regions instead of averaging every bright voxel to one hue',()=>{
  for(const nebula of ['nursery','planetary','supernova']){
    const medium=new StellarMedium(),data=update(medium,{...base,chapter:'nebulae',nebula}),size=medium.medium.resolution;
    let emitting=0,cool=0,warm=0,nearWeight=0,nearColour=0,farWeight=0,farColour=0;
    for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const index=((z*size+y)*size+x)*4,weight=data[index+1],colour=data[index+3]/255;
      emitting+=weight;if(colour<.3)cool+=weight;if(colour>.7)warm+=weight;
      if(nebula!=='nursery'||weight===0)continue;
      const px=(x/(size-1)*2-1)*SPACE_VOLUME_EXTENT,py=(y/(size-1)*2-1)*SPACE_VOLUME_EXTENT,pz=(z/(size-1)*2-1)*SPACE_VOLUME_EXTENT;
      const sourceDistance=Math.hypot(px-1.8,py-.3,pz*.9);
      if(sourceDistance<1.2){nearWeight+=weight;nearColour+=weight*colour;}
      if(sourceDistance>2.8){farWeight+=weight;farColour+=weight*colour;}
    }
    assert.ok(cool/emitting>.15&&warm/emitting>.15,`${nebula} retains visible emitting material in both colour regions`);
    if(nebula==='nursery')assert.ok(farColour/farWeight-nearColour/nearWeight>.6,'the source cavity and outer cloud remain distinct after overlap reconstruction');
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

test('shell media have hollow centers and rewind to the same field without a phase cache',()=>{
  const medium=new StellarMedium(),size=medium.medium.resolution;
  for(const nebula of ['planetary','supernova']){
    const input={...base,chapter:'nebulae',nebula},original=update(medium,input);
    const center=((Math.floor(size/2)*size+Math.floor(size/2))*size+Math.floor(size/2))*4;
    assert.equal(original[center],0);assert.ok(original.some((v,i)=>i%4===0&&v>20));
    update(medium,{...base,progress:.1});assert.deepEqual(update(medium,input),original);
  }
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
  assert.equal(stellarObservationZoom({...base,chapter:'nebulae'},3),1.32);
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

test('the nursery keeps its luminous outer cloud inside narrow and desktop observation frames',()=>{
  const input={...base,chapter:'nebulae'},medium=new StellarMedium();
  update(medium,input);
  const {resolution:size,data}=medium.medium;
  for(const aspect of [368/330,600/450,1238/472]){
    const camera=new PerspectiveCamera(36,aspect,.05,70);
    camera.position.set(6.3,3.4,9.2);camera.lookAt(0,0,0);
    camera.zoom=stellarObservationZoom(input,aspect);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    let extentX=0,extentY=0,samples=0;
    for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      if(data[((z*size+y)*size+x)*4+1]<12)continue;
      const point=new Vector3(...[x,y,z].map(v=>(v/(size-1)*2-1)*SPACE_VOLUME_EXTENT)).project(camera);
      extentX=Math.max(extentX,Math.abs(point.x));extentY=Math.max(extentY,Math.abs(point.y));samples++;
    }
    assert.ok(samples>1000,'the check includes extended emitting material, not only the central source');
    assert.ok(extentX<.9&&extentY<.9,`the default ${aspect} frame retains luminous gas with room at its edges`);
  }
});
