import {stellarSpaceFrame,writeSpaceParticles,SPACE_PARTICLES,type SpaceInput} from './spaceModel.ts';
import {stellarMediumColour,stellarMediumDust} from './spaceVolume.ts';
import {nebulaCloudAppearance,nebulaCloudCoordinates,nebulaCloudPoint,writeNebulaCloud} from './nebulaCloud.ts';
import type {NebulaReference} from './nebulaModel.ts';
import {nebulaEnvironmentSampler,nebulaEnvironmentDirection,nebulaEnvironmentStars} from './nebulaEnvironment.ts';

const positions=new Float32Array(SPACE_PARTICLES*3),alpha=new Float32Array(SPACE_PARTICLES);
const order=Array.from({length:SPACE_PARTICLES/2},(_,index)=>index*2);
const smooth=(a:number,b:number,value:number)=>{const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t);};
const linear=(value:number)=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4;
const srgb=(value:number)=>Math.round(255*(value<=.0031308?12.92*value:1.055*value**(1/2.4)-.055));
const palette=(coordinate:number,colors:readonly (readonly number[])[])=>{
  const middle=smooth(.04,.52,coordinate),warm=smooth(.48,.96,coordinate);
  return [0,1,2].map(channel=>srgb((linear(colors[0]![channel]!/255)*(1-middle)+linear(colors[1]![channel]!/255)*middle)*(1-warm)+linear(colors[2]![channel]!/255)*warm));
};
const project=(x:number,y:number,z:number)=>[520+(x*.84-z*.54)*59,280+(x*.16+z*.25-y*.94)*59];
const depth=(parcel:number)=>positions[parcel*3]!*.508+positions[parcel*3+1]!*.296+positions[parcel*3+2]!*.790;
// One bounded, current sky. The volume samples this same image beneath every
// ray, including its stars, so dark dust attenuates the environment rather than
// painting a rectangular substitute sky over it. It remains a flat fallback.
let classicSky:{key:string;canvas:HTMLCanvasElement;image:ImageData}|undefined;
function skyFor(c:CanvasRenderingContext2D,input:SpaceInput){
  const reference=input.reference??'orion',key=`${reference}|${input.illumination}`,width=520,height=280;
  if(!classicSky){const canvas=c.canvas.ownerDocument.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d')!;classicSky={key:'',canvas,image:context.createImageData(width,height)};}
  if(classicSky.key!==key){
    const data=classicSky.image.data,sample=nebulaEnvironmentSampler(reference,input.illumination);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const colour=sample(...nebulaEnvironmentDirection((x+.5)*2,(y+.5)*2)),index=(y*width+x)*4;
      for(let channel=0;channel<3;channel++)data[index+channel]=srgb(colour[channel]!);data[index+3]=255;
    }
    for(const star of nebulaEnvironmentStars(reference)){
      const [u,v,w]=nebulaCloudCoordinates(...star.position);if(w>=-.1)continue;
      const px=(520+u/-w*860)/2,py=(280-v/-w*860)/2,radius=Math.max(.8,star.size/4);
      for(let y=Math.max(0,Math.floor(py-radius));y<Math.min(height,py+radius);y++)for(let x=Math.max(0,Math.floor(px-radius));x<Math.min(width,px+radius);x++){
        const r=Math.hypot(x+.5-px,y+.5-py)/radius;if(r>1)continue;
        const alpha=(Math.exp(-r*r*38)+Math.exp(-r*r*5)*.12*(1-smooth(.65,1,r)))*star.brightness,index=(y*width+x)*4;
        for(let channel=0;channel<3;channel++){const cool=[.60,.78,1][channel]!,warm=[1,.84,.62][channel]!,colour=cool*(1-star.warmth)+warm*star.warmth;data[index+channel]=srgb(linear(data[index+channel]!/255)*(1-alpha)+colour*alpha);}
      }
    }
    classicSky.canvas.getContext('2d')!.putImageData(classicSky.image,0,0);classicSky.key=key;
  }
  return classicSky;
}
// One lazy fallback field, replaced on reference changes; no per-case cache.
let classicField:{reference:NebulaReference;data:Uint8Array}|undefined;
function drawClassicCloud(c:CanvasRenderingContext2D,input:SpaceInput,sky:ImageData){
  const reference=input.reference??'orion',size=48,appearance=nebulaCloudAppearance(reference);
  if(!classicField)classicField={reference,data:new Uint8Array(size**3*4)};
  if(classicField.reference!==reference||!classicField.data.some(value=>value!==0)){
    writeNebulaCloud(reference,classicField.data,size);classicField.reference=reference;
  }
  const field=classicField.data,colors=[appearance.cool,appearance.accent,appearance.warm].map(hex=>[1,3,5].map(i=>linear(parseInt(hex.slice(i,i+2),16)/255)));
  const sources=appearance.sources.map(p=>nebulaCloudCoordinates(...p));
  const light=appearance.lightPosition,dark=input.illumination==='dark',reflection=input.illumination==='reflection';
  const dustExtinction=appearance.dustExtinction;
  const pixels=144,side=500,pixel=side/pixels,stride=2.4/40;
  // Bounded front-to-back projection of the same object-bound RGBA medium.
  // Fewer fixed samples and no GPU detail modulation: explicitly a flat fallback.
  for(let iy=0;iy<pixels;iy++)for(let ix=0;ix<pixels;ix++){
    const u=((ix+.5)/pixels*2.4-1.2),v=1.2-(iy+.5)/pixels*2.4;
    let transmission=1,r=0,g=0,b=0;
    for(let depth=0;depth<40&&transmission>.015;depth++){
      const w=1.2-(depth+.5)*stride,[x,y,z]=nebulaCloudPoint(u,v,w);
      const gx=Math.round((x+1)*.5*(size-1)),gy=Math.round((y+1)*.5*(size-1)),gz=Math.round((z+1)*.5*(size-1));
      if(gx<0||gx>=size||gy<0||gy>=size||gz<0||gz>=size)continue;
      const index=((gz*size+gy)*size+gx)*4,gas=field[index]!/255,emission=field[index+1]!/255,dust=field[index+2]!/255,coordinate=field[index+3]!/255;
      const extinction=gas*.52+dust*dustExtinction,segment=Math.exp(-extinction*stride),path=extinction>.0001?(1-segment)/extinction:stride;
      const a=smooth(.04,.52,coordinate),bMix=smooth(.48,.96,coordinate);
      const sourceLight=.12+.88*Math.exp(-((x-light[0]!)**2+(y-light[1]!)**2+(z-light[2]!)**2)*2.2);
      for(let channel=0;channel<3;channel++){
        const color=reflection?linear([135,181,220][channel]!/255):(colors[0]![channel]!*(1-a)+colors[1]![channel]!*a)*(1-bMix)+colors[2]![channel]!*bMix;
        const scattered=!dark&&!reflection?dust*appearance.dustLight*.4:0;
        const dustColor=colors[1]![channel]!*.88+colors[2]![channel]!*.12;
        const value=transmission*(color*(dark?0:reflection?(gas*.24+dust*.35)*sourceLight*5.2:emission*6.5)+dustColor*scattered*6.5)*path;
        if(channel===0)r+=value;else if(channel===1)g+=value;else b+=value;
      }
      transmission*=segment;
      if(!dark)for(const [su,sv,sw]of sources)if(Math.abs(w-sw)<stride*.5){const glow=Math.exp(-((u-su)**2+(v-sv)**2)/.00015)*transmission;r+=glow*.82;g+=glow*.9;b+=glow;}
    }
    if(transmission>.999&&Math.max(r,g,b)<.0001)continue;
    const peak=Math.max(r,g,b),gain=peak>0?(1-Math.exp(-peak))/peak:1;
    // Match the background already painted by drawNebula. In particular, an
    // extinction-only pixel must never add a brighter rectangular sky patch.
    const px=520-side/2+(ix+.5)*pixel,py=280-side/2+(iy+.5)*pixel,skyIndex=(Math.floor(py/2)*sky.width+Math.floor(px/2))*4;
    const background=[0,1,2].map(channel=>linear(sky.data[skyIndex+channel]!/255));
    c.fillStyle=`rgb(${srgb(r*gain+background[0]!*transmission)},${srgb(g*gain+background[1]!*transmission)},${srgb(b*gain+background[2]!*transmission)})`;
    c.fillRect(520-side/2+ix*pixel,280-side/2+iy*pixel,pixel+.1,pixel+.1);
  }
}

/** Fixed oblique Canvas fallback of the same semantic case and optical regions.
 * Soft parcels approximate depth and extinction; this is not a photograph or
 * the WebGL volume's ray integral. One current bounded sky is retained, with no
 * clock or per-case cache. */
export function drawNebula(c:CanvasRenderingContext2D,input:SpaceInput,cutaway:boolean){
  const frame=stellarSpaceFrame(input);
  const nursery=input.nebula==='nursery',dark=nursery&&input.illumination==='dark',reflection=nursery&&input.illumination==='reflection';
  if(nursery){const sky=skyFor(c,input);c.drawImage(sky.canvas,0,0,1040,560);drawClassicCloud(c,input,sky.image);return;}
  const colors=reflection?[[75,174,255],[130,150,241],[75,174,255]]:frame.kind==='planetary'?[[33,214,208],[117,112,236],[255,152,88]]:frame.kind==='supernova'?[[48,191,243],[241,76,120],[255,162,75]]:[[50,200,236],[189,59,218],[255,78,125]];
  const background=c.createRadialGradient(520,280,20,520,280,340);
  const sky=['#11142e','#070e1c'];
  background.addColorStop(0,sky[0]!);background.addColorStop(1,sky[1]!);c.fillStyle=background;c.fillRect(0,0,1040,560);
  writeSpaceParticles(frame,positions,alpha);
  order.sort((a,b)=>depth(a)-depth(b));
  const source=nursery?[1.8,.3,0]:[0,0,0],sourceDepth=source[0]!*.508+source[1]!*.296;
  let sourceDrawn=dark||frame.starOpacity===0;
  const drawSource=()=>{
    sourceDrawn=true;
    const [x,y]=project(source[0]!,source[1]!,source[2]!),radius=nursery?19:14;
    const star=c.createRadialGradient(x!,y!,0,x!,y!,radius);
    star.addColorStop(0,'#eff8ff');star.addColorStop(.12,'#d5ecff');star.addColorStop(.27,'#8bc8f3a8');star.addColorStop(1,'#6caff000');
    c.globalAlpha=frame.starOpacity;c.fillStyle=star;c.beginPath();c.arc(x!,y!,radius,0,Math.PI*2);c.fill();
  };
  for(const parcel of order){
    if(!sourceDrawn&&depth(parcel)>sourceDepth)drawSource();
    const x=positions[parcel*3]!,y=positions[parcel*3+1]!,z=positions[parcel*3+2]!;
    if(alpha[parcel]!<.0001||(cutaway&&frame.shellOpacity>.01&&z>.04*frame.shellRadius))continue;
    const [px,py]=project(x,y,z),radius=frame.kind==='formation'?19:8,dust=stellarMediumDust(frame.shellOpacity>.001,parcel);
    if(!dark){
      const colour=palette(stellarMediumColour(frame,x,y,z),colors),distance=((x-1.8)**2+(y-.3)**2+z*z)/12;
      const light=reflection?.24+.76*Math.exp(-distance):1;
      const glow=c.createRadialGradient(px!,py!,0,px!,py!,radius);
      glow.addColorStop(0,`rgba(${colour.join(',')},.82)`);glow.addColorStop(.46,`rgba(${colour.join(',')},.28)`);glow.addColorStop(1,`rgba(${colour.join(',')},0)`);
      c.globalAlpha=alpha[parcel]!*.29*light;c.fillStyle=glow;c.beginPath();c.arc(px!,py!,radius,0,Math.PI*2);c.fill();
    }
    if(dark||dust>.13){
      const r=dark?17:13,shadow=c.createRadialGradient(px!,py!,0,px!,py!,r);
      shadow.addColorStop(0,'#060714e6');shadow.addColorStop(.38,'#0809189c');shadow.addColorStop(1,'#08091800');
      c.globalAlpha=alpha[parcel]!*(dark?.26:dust*.62);c.fillStyle=shadow;c.beginPath();c.arc(px!,py!,r,0,Math.PI*2);c.fill();
    }
  }
  if(!sourceDrawn)drawSource();c.globalAlpha=1;
}
