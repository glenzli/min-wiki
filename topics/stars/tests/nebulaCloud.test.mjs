import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nebulaCloudPoint,nebulaCloudCoordinates,nebulaCloudFront,sampleNebulaCloud,writeNebulaCloud} from '../nebulaCloud.ts';
import {drawNebula} from '../nebulaScene.ts';

const references=['orion','pillars','horsehead'];
const at=(reference,...point)=>sampleNebulaCloud(reference,...nebulaCloudPoint(...point));

test('classic fields are deterministic, bounded three-dimensional matter with empty box faces',()=>{
  const size=32,hashes=[];
  for(const reference of references){
    const field=new Uint8Array(size**3*4);writeNebulaCloud(reference,field,size);
    assert.ok(field.some((value,index)=>index%4===1&&value>20));
    assert.ok(field.some((value,index)=>index%4===2&&value>100));
    for(let a=0;a<size;a++)for(let b=0;b<size;b++)for(const [x,y,z]of [[0,a,b],[size-1,a,b],[a,0,b],[a,size-1,b],[a,b,0],[a,b,size-1]]){
      const offset=((z*size+y)*size+x)*4;
      assert.ok(field.subarray(offset,offset+4).every(value=>value===0));
    }
    const again=new Uint8Array(field.length);writeNebulaCloud(reference,again,size);assert.deepEqual(again,field);
    hashes.push(createHash('sha256').update(field).digest('hex'));
    // A fixed object basis, not a camera-facing billboard or a one-voxel sheet.
    for(const point of [[.2,-.3,.1],[-.4,.1,-.2]]){
      const roundtrip=nebulaCloudCoordinates(...nebulaCloudPoint(...point));
      roundtrip.forEach((value,index)=>assert.ok(Math.abs(value-point[index])<.002));
    }
    for(const point of [[.70,.82,-.30],[-.65,.82,-.30]])assert.ok(at(reference,...point).every(Number.isFinite),'a schematic light location must not create a singular field sample');
  }
  assert.equal(new Set(hashes).size,3,'changing the reference replaces morphology, not only its palette');
});

test('Orion has emitting cavity material, a distinct foreground dust lane and an open side',()=>{
  const cavity=at('orion',-.1,-.06,.2),lane=at('orion',0,.23,.24),opening=at('orion',.45,.25,.4);
  assert.ok(cavity[1]>.08&&cavity[3]<.25);
  assert.ok(lane[2]>cavity[2]*5&&lane[1]<cavity[1]*.2,'the dark lane absorbs rather than emitting a decorative dark stroke');
  assert.ok(opening[0]<cavity[0]*.1,'the cavity opens out through the cloud instead of a closed luminous ring');
});

test('Pillars have three unequal dense trunks, real gaps and a connected parent cloud',()=>{
  const roots=[[-.49,-.68,.09],[-.01,-.66,.10],[.40,-.69,.06]],heads=[[-.32,.40,.11],[.04,.18,.13],[.31,-.02,.12]];
  for(let trunk=0;trunk<3;trunk++)for(let step=0;step<=20;step++){
    const t=step/20,point=roots[trunk].map((value,index)=>value*(1-t)+heads[trunk][index]*t);
    const sample=at('pillars',...point);assert.ok(sample[2]>.05,'uneven, partly transparent parent material still connects each dense head');
    assert.ok(sample[1]<.03,'shielded interiors are not uniformly self-luminous');
  }
  assert.ok(at('pillars',-.11,.18,.12)[2]<.05,'a gap is genuinely free of the neighbouring trunk');
  assert.ok(at('pillars',0,-.7,.12)[2]>.08);
  for(const head of heads)assert.ok(at('pillars',...head)[2]>.4,'the column heads remain denser than the diffuse parent fringe');
});

test('Horsehead is an absorbing head and neck attached to a cloud, with an open notch below its muzzle',()=>{
  for(const point of [[-.3,.20,.16],[.08,-.13,.13]]){
    const sample=at('horsehead',...point);assert.ok(sample[2]>.5);assert.ok(sample[1]<.015);
  }
  assert.ok(at('horsehead',0,-.7,.12)[2]>.08,'the neck remains attached to a partly transparent parent cloud');
  for(let v=-.7;v<-.3;v+=.025)assert.ok(at('horsehead',.08,v,.13)[2]>.06,'the uneven neck has no empty break above its parent cloud');
  assert.ok(at('horsehead',-.30,-.03,.15)[2]<.03);
  assert.ok(at('horsehead',.5,.35,.15)[2]<.03,'background is not a second opaque sphere');
});

test('dark-cloud emission is local to its illuminated interfaces, while dense dust remains non-emitting',()=>{
  for(const reference of ['pillars','horsehead']){
    let bright=0,dense=0;
    for(let u=-.7;u<=.7;u+=.04)for(let v=-.7;v<=.7;v+=.04)for(const w of [-.14,.02,.18]){
      const sample=at(reference,u,v,w);
      if(sample[2]>.3){dense++;assert.ok(sample[1]<.001,'neutral interior dust does not become a self-luminous solid');}
      if(sample[1]>.03){bright++;assert.ok(sample[2]<.15,'the emitting interface is spatially separate from the dense core');}
    }
    assert.ok(bright>5&&dense>50);
    assert.equal(at(reference,.65,.6,-.28)[1],0,'empty background is not filled by a bounded oval emission wall');
  }
});

test('a separate distance field retains an emitting interface narrower than one density voxel',()=>{
  const size=64,data=new Uint8Array(size**3*4),front=nebulaCloudFront(new Uint8Array(size**3));
  writeNebulaCloud('pillars',data,size,front);
  assert.ok(front.width<1/(size-1),'the density-grid interpolation must not set the interface width');
  assert.ok(front.range*2/255<front.width/4,'distance encoding retains several levels across the thin interface');
  assert.ok(front.distance.some(value=>value<100)&&front.distance.some(value=>value>155));
  for(let a=0;a<size;a++)for(let b=0;b<size;b++)for(const [x,y,z]of [[0,a,b],[size-1,a,b],[a,0,b],[a,size-1,b],[a,b,0],[a,b,size-1]])assert.equal(front.distance[(z*size+y)*size+x],255);
  const copy=data.slice(),distance=front.distance.slice();writeNebulaCloud('pillars',data,size,front);
  assert.deepEqual(data,copy);assert.deepEqual(front.distance,distance);
});

test('flat fallback preserves each classic shape through illumination changes and deterministic replay',()=>{
  const input={chapter:'nebulae',track:'solar',progress:.4,nebula:'nursery',illumination:'emission'};
  const render=state=>{
    const hash=createHash('sha256');let pixels=0,background;
    const c={globalAlpha:1,fillStyle:'',canvas:{ownerDocument:{createElement(){
      const sky={image:null,getContext:()=>({createImageData:(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}),putImageData(image){sky.image=image;}})};return sky;
    }}},drawImage(sky){background=sky.image;hash.update(background.data);pixels++;},createRadialGradient:()=>({addColorStop(){}}),fillRect(...rect){
      assert.ok(rect.every(Number.isFinite));assert.ok(!/NaN|Infinity/.test(String(this.fillStyle)));
      if(state.illumination==='dark'&&typeof this.fillStyle==='string'){
        const rgb=this.fillStyle.match(/\d+/g).map(Number),x=Math.floor((rect[0]+500/288)/2),y=Math.floor((rect[1]+500/288)/2),index=(y*background.width+x)*4;
        rgb.forEach((value,channel)=>assert.ok(value<=background.data[index+channel]+1,'extinction cannot brighten the actual environment, including background stars'));
      }
      hash.update(`${this.fillStyle}:${rect.join(',')};`);pixels++;
    }};
    drawNebula(c,state,false);assert.ok(pixels>1000&&pixels<=144**2+1);return hash.digest('hex');
  };
  const hashes=[];
  for(const reference of references){
    const state={...input,reference},emission=render(state);hashes.push(emission);
    assert.notEqual(render({...state,illumination:'reflection'}),emission);
    assert.notEqual(render({...state,illumination:'dark'}),emission);
    assert.equal(render(state),emission);
  }
  assert.equal(new Set(hashes).size,3);
});
