import {stellarSpaceFrame,writeSpaceParticles,SPACE_PARTICLES,type SpaceInput} from './spaceModel.ts';
import {stellarMediumColour,stellarMediumDust} from './spaceVolume.ts';

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

/** Fixed oblique Canvas fallback of the same semantic case and optical regions.
 * Soft parcels approximate depth and extinction; this is not a photograph or
 * the WebGL volume's ray integral. No clock, image cache or new canvas is kept. */
export function drawNebula(c:CanvasRenderingContext2D,input:SpaceInput,cutaway:boolean){
  const frame=stellarSpaceFrame(input);writeSpaceParticles(frame,positions,alpha);
  const nursery=input.nebula==='nursery',dark=nursery&&input.illumination==='dark',reflection=nursery&&input.illumination==='reflection';
  const colors=reflection?[[75,174,255],[130,150,241],[75,174,255]]:frame.kind==='planetary'?[[33,214,208],[117,112,236],[255,152,88]]:frame.kind==='supernova'?[[48,191,243],[241,76,120],[255,162,75]]:[[50,200,236],[189,59,218],[255,78,125]];
  const background=c.createRadialGradient(520,280,20,520,280,340);
  background.addColorStop(0,dark?'#526476':'#11142e');background.addColorStop(1,'#070e1c');c.fillStyle=background;c.fillRect(0,0,1040,560);
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
