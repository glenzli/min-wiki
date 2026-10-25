import * as THREE from 'three';
import {REGION_A} from './journeyModel';

const size=512,height=256;
let baked:[Uint8Array<ArrayBuffer>,Uint8Array<ArrayBuffer>]|undefined;
const fract=(x:number)=>x-Math.floor(x);
const hash=(x:number,y:number,z:number)=>fract(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453);
function noise(x:number,y:number,z:number){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let a=x-ix,b=y-iy,c=z-iz;
  a=a*a*(3-2*a);b=b*b*(3-2*b);c=c*c*(3-2*c);const mix=(v:number,w:number,t:number)=>v+(w-v)*t;
  return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),a),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),a),b),mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),a),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),a),b),c);
}
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const landField=(a:number,b:number,c:number)=>.58*noise(a*3.1+2.5,b*3.1+7.3,c*3.1-1.2)+.28*noise(a*6.6+2.5,b*6.6+7.3,c*6.6-1.2)+.14*noise(a*13.2+2.5,b*13.2+7.3,c*13.2-1.2);
function bake(){
  if(baked)return baked;
  const surface=new Uint8Array(size*height*4),ice=new Uint8Array(surface.length);
  const latA=REGION_A.latitude*Math.PI/180,lonA=REGION_A.longitude*Math.PI/180;
  const shoreline=landField(Math.cos(latA)*Math.cos(lonA),Math.sin(latA),Math.cos(latA)*Math.sin(lonA));
  for(let y=0;y<height;y++)for(let x=0;x<size;x++){
    const lon=((x+.5)/size-.5)*Math.PI*2,lat=((y+.5)/height-.5)*Math.PI;
    const a=Math.cos(lat)*Math.cos(lon),b=Math.sin(lat),c=Math.cos(lat)*Math.sin(lon);
    const broad=landField(a,b,c);
    const land=smooth(shoreline-.045,shoreline+.045,broad),rugged=noise(a*29,b*29,c*29),fine=noise(a*145,b*145,c*145),ocean=noise(a*5.5+8,b*5.5+3,c*5.5-2);
    const ridge=noise(a*28+4,b*28+7,c*28+2),crack=1-smooth(.015,.065,Math.abs(ridge-.5));
    const v=(.45+.5*fine),base=[.37+v*.46,.62+v*.29,.73+v*.18];
    const index=(y*size+x)*4;
    for(let k=0;k<3;k++){
      const water=[.025,.16,.22][k]+[.00875,.0375,.04][k]*ocean;
      const rock=([.27,.27,.22][k]+[.25,.24,.19][k]*rugged)*(.88+.18*fine);
      surface[index+k]=Math.round(Math.max(0,Math.min(1,water+(rock-water)*land))*255);
      ice[index+k]=Math.round(Math.max(0,Math.min(1,base[k]-crack*[.23,.15,.10][k]))*255);
    }
    surface[index+3]=Math.round(land*255);ice[index+3]=Math.round(rugged*255);
  }
  baked=[surface,ice];return baked;
}
/** Two original stable 512×256 maps, baked once per module, uploaded once per mounted stage. */
export function globeTextures(){
  return bake().map(pixels=>{const texture=new THREE.DataTexture(pixels,size,height,THREE.RGBAFormat);texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;}) as [THREE.DataTexture,THREE.DataTexture];
}
