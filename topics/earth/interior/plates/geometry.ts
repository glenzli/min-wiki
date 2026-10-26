import * as THREE from 'three';
import { plateFrame, type Boundary, type InteriorState } from '../model';

export type PlateSide = -1 | 0 | 1;
export type PlateLayer = 'crust' | 'mantle' | 'base';
export type PlateFrame = { boundary: Boundary; p: number };
export type Point = [number, number, number];
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t); };
const hash = (x: number, z: number) => { const n = Math.sin(x*127.1+z*311.7)*43758.5453; return n-Math.floor(n); };
function noise(x: number, z: number) {
  const i=Math.floor(x), j=Math.floor(z), u=smooth(0,1,x-i), v=smooth(0,1,z-j);
  return mix(mix(hash(i,j),hash(i+1,j),u),mix(hash(i,j+1),hash(i+1,j+1),u),v)*2-1;
}
export function relief(x: number, z: number) {
  return noise(x*.8,z*.8)*.11+noise(x*2.1+13,z*2.1)*.047+noise(x*5.3,z*5.3+31)*.018;
}
export function frameForPlates(state: Pick<InteriorState, 'interiorBoundary'|'interiorMotion'|'interiorProgress'>): PlateFrame {
  return { boundary: state.interiorBoundary, p: plateFrame(state.interiorBoundary,state.interiorMotion,state.interiorProgress).effectiveProgress };
}
const seam = (z: number) => Math.sin(z*1.6)*.065+Math.sin(z*4.3)*.019;
function slabTop(x: number, z: number, p: number) {
  const t=Math.max(0,(x+.4)/3);
  return .18-.31*Math.exp(-Math.pow((x+.4)/.38,2))+relief(x,z)*.35-(.75+2.7*p)*Math.pow(t,1.3);
}
/** An established subduction margin. The selected progress does not create subduction from nothing. */
function slab(u: number,z: number,p: number,depth: number): Point {
  const t=Math.max(0,(u-.6)/.4),x=u<=.6?mix(-5,-.4,u/.6):-.4+3*t;
  const derivative=(slabTop(x+.002,z,p)-slabTop(x-.002,z,p))/.004;
  const length=Math.hypot(1,derivative);
  return [x+depth*derivative/length+seam(z),slabTop(x,z,p)-depth/length,z];
}
function landTop(boundary: Boundary, x: number, z: number, p: number) {
  if(boundary==='collision') {
    const belt=Math.exp(-Math.pow((x-seam(z))/.98,2));
    const peaks=.8+Math.abs(noise(z*1.9,x*.7))*.65+noise(x*4,z*5)*.08;
    return .42+relief(x,z)+p*1.8*belt*peaks;
  }
  if(boundary==='subduction') {
    const cone=Math.exp(-Math.pow((x-2.6)/.65,2)-Math.pow((z+.25)/1.6,2));
    return .34+.58*smooth(.05,1.3,x)+relief(x,z)+(.16+.9*smooth(.55,1,p))*cone;
  }
  if(boundary==='divergent')return .32+.95*Math.exp(-x*x/1.15)+relief(x,z)*.85-.09*Math.exp(-x*x/.025);
  const channel=Math.exp(-Math.pow((z-Math.sin(x*.7)*.4)/.11,2));
  return .46+relief(x,z)*1.9-.10*channel;
}
export function platePoint(frame: PlateFrame, side: PlateSide, layer: PlateLayer, u: number, v: number, w: number): Point {
  const {boundary,p}=frame;
  let z=mix(-1.8,1.8,v);
  if(layer==='base') {
    const x=mix(-5.9,5.9,u),top=boundary==='collision'?-1.36-.85*p*Math.exp(-x*x/3):boundary==='divergent'?-1.45+.3*p*Math.exp(-x*x/1.5):-1.4;
    return [x,mix(top,boundary==='subduction'?-4.5:-2.9,w),z*.975];
  }
  if(boundary==='subduction'&&side===-1) return slab(u,z,p,layer==='crust'?w*.17:.17+w*.86);
  let x=side<0?mix(-5,0,u):mix(0,5,u),materialX=x,materialZ=z;
  if(boundary==='divergent') {
    const gap=p*1.5;
    x=side===0?mix(-gap/2,gap/2,u):x+side*gap/2;
    x+=seam(z);
  } else if(boundary==='subduction')x=mix(.05,5.1,u)+seam(z);
  else if(boundary==='collision')x=x*(1-.19*p)+seam(z);
  else z+=side*p*.82;
  let top=landTop(boundary,boundary==='transform'?materialX:x,boundary==='transform'?materialZ:z,p);
  if(boundary==='divergent'&&side===0)top=mix(landTop(boundary,seam(z)-p*.75,z,p),landTop(boundary,seam(z)+p*.75,z,p),u)+.08*p*Math.sin(u*Math.PI);
  const crustBase=boundary==='subduction'?Math.max(top-.62,slabTop(x-seam(z),z,p)+.04):boundary==='collision'?-.16-.85*p*Math.exp(-x*x/3):boundary==='divergent'?top-.23:-.28;
  const lithBase=boundary==='subduction'?Math.max(crustBase-.95,slabTop(x-seam(z),z,p)+.014):boundary==='collision'?crustBase-1.2:boundary==='divergent'?-1.45+.3*p*Math.exp(-x*x/1.5):-1.4;
  return [x,layer==='crust'?mix(top,crustBase,w):mix(crustBase,lithBase,w),z];
}

/** Retained closed volumes. Both materials evaluate the exact same contact surface. */
export function createPlateGeometry(side: PlateSide, layer: PlateLayer, across=44, along=24) {
  const samples: {u:number;v:number;w:number}[]=[],indices:number[]=[],uvs:number[]=[];
  const groups:{start:number;count:number;materialIndex:number}[]=[];
  function face(nx:number,ny:number,materialIndex:number,point:(a:number,b:number)=>{u:number;v:number;w:number},reverse=false){
    const first=samples.length,start=indices.length;
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const a=i/nx,b=j/ny;samples.push(point(a,b));uvs.push(a,b);}
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=first+j*(nx+1)+i,b=a+nx+1;
      if(reverse)indices.push(a,a+1,b,a+1,b+1,b);else indices.push(a,b,a+1,a+1,b,b+1);
    }groups.push({start,count:indices.length-start,materialIndex});
  }
  face(across,along,0,(u,v)=>({u,v,w:0}));
  face(across,along,1,(u,v)=>({u,v,w:1}),true);
  face(across,6,1,(u,w)=>({u,v:0,w}),true);face(across,6,1,(u,w)=>({u,v:1,w}));
  face(along,6,1,(v,w)=>({u:0,v,w}));face(along,6,1,(v,w)=>({u:1,v,w}),true);
  const geometry=new THREE.BufferGeometry(),positions=new THREE.Float32BufferAttribute(new Float32Array(samples.length*3),3);
  const rest=new THREE.Float32BufferAttribute(new Float32Array(samples.length*3),3);
  geometry.setAttribute('position',positions);geometry.setAttribute('materialPoint',rest);geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
  for(const group of groups)geometry.addGroup(group.start,group.count,group.materialIndex);
  let lastBoundary: Boundary|undefined;
  function update(frame: PlateFrame){
    for(let i=0;i<samples.length;i++){
      const {u,v,w}=samples[i];positions.setXYZ(i,...platePoint(frame,side,layer,u,v,w));
      if(lastBoundary!==frame.boundary){const p=platePoint({...frame,p:side===0&&layer!=='base'?1:0},side,layer,u,v,w);rest.setXYZ(i,...p);}
    }
    if(lastBoundary!==frame.boundary)rest.needsUpdate=true;lastBoundary=frame.boundary;
    positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  }
  return {geometry,update};
}
