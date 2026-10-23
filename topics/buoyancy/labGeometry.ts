import * as THREE from 'three';

export const BASIN_FLOOR=.08;
const segments=128,top=1.80;

/** One gently flared, asymmetric outline shared by glass and water. These
 * dimensions are illustrative; the equilibrium model owns displacement. */
export function basinPoint(angle:number,height:number,inset=0){
 const t=THREE.MathUtils.clamp((height-BASIN_FLOOR)/(top-BASIN_FLOOR),0,1);
 const bend=.032*Math.sin(angle*3+.4)+.012*Math.cos(angle*5-.8);
 const c=Math.cos(angle),s=Math.sin(angle),a=2.26+.25*t,b=.84+.25*t;
 return new THREE.Vector2(
  (a-inset)*Math.sign(c)*Math.abs(c)**.90*(1+bend),
  (b-inset)*Math.sign(s)*Math.abs(s)**.92*(1+bend)+.025*Math.sin(angle*2),
 );
}

export function basinContour(height:number,inset=0){
 const shape=new THREE.Shape();
 for(let i=0;i<=segments;i++){
  const p=basinPoint(i/segments*Math.PI*2,height,inset);
  if(i===0)shape.moveTo(p.x,-p.y);else shape.lineTo(p.x,-p.y);
 }
 shape.closePath();return shape;
}

/** The four rings describe the outside, rounded lip and inside of one wall. */
export function createVesselWall(rimOnly=false){
 const geometry=new THREE.BufferGeometry(),positions:number[]=[],indices:number[]=[];
 const rings=rimOnly?[[top-.016,0],[top,.004],[top,.064],[top-.016,.070],[top-.016,0]]:
  [[.04,0],[top-.015,0],[top,.022],[top,.050],[top-.015,.070],[BASIN_FLOOR,.070],[.04,0]];
 for(const [y,inset] of rings)for(let i=0;i<=segments;i++){
  const angle=i/segments*Math.PI*2,p=basinPoint(angle,y,inset);
  const lip=y>top-.05?.012*Math.sin(angle*2+.6)+.007*Math.cos(angle*3):0;
  positions.push(p.x,y+lip,p.y);
 }
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){
  const a=j*(segments+1)+i,b=a+segments+1;
  indices.push(a,b,a+1,b,b+1,a+1);
 }
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 return geometry;
}

export function createBasinBase(inset:number,depth:number,y:number){
 const geometry=new THREE.ExtrudeGeometry(basinContour(BASIN_FLOOR,inset),{depth,steps:1,bevelEnabled:true,bevelSize:.016,bevelThickness:.012,bevelSegments:3});
 geometry.rotateX(-Math.PI/2);geometry.translate(0,y,0);return geometry;
}

export function createBasinWater(){
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array((segments+1)*2*3),indices:number[]=[];
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 for(let i=0;i<segments;i++){
  const a=i,b=i+segments+1;indices.push(a,b,a+1,b,b+1,a+1);
 }
 geometry.setIndex(indices);updateBasinWater(geometry,2.1);return geometry;
}

/** y stays normalized for the shared depth shader and the scene's scale. */
export function updateBasinWater(geometry:THREE.BufferGeometry,water:number){
 const p=geometry.getAttribute('position') as THREE.BufferAttribute;
 for(let j=0;j<2;j++)for(let i=0;i<=segments;i++){
  const q=basinPoint(i/segments*Math.PI*2,j?water:BASIN_FLOOR,.075);
  p.setXYZ(j*(segments+1)+i,q.x,j-.5,q.y);
 }
 p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
}

/** A narrow contact surface, not a surface-tension or capillary-rise model. */
export function createMeniscusGeometry(inward=false){
 const geometry=new THREE.BufferGeometry(),indices:number[]=[];
 geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(129*3*3),3));
 for(let row=0;row<2;row++)for(let i=0;i<128;i++){
  const a=row*129+i,b=a+129;
  indices.push(...(inward?[a,b,a+1,b,b+1,a+1]:[a,a+1,b,b,a+1,b+1]));
 }
 geometry.setIndex(indices);return geometry;
}

export function updateMeniscusGeometry(geometry:THREE.BufferGeometry,water:number,point:(angle:number,offset:number)=>THREE.Vector2){
 const positions=geometry.getAttribute('position') as THREE.BufferAttribute;
 const offsets=[0,.012,.035],heights=[.012,.002,.0005];
 for(let row=0;row<3;row++)for(let i=0;i<=128;i++){
  const p=point(i/128*Math.PI*2,offsets[row]);positions.setXYZ(row*129+i,p.x,water+heights[row],p.y);
 }
 positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
}

// Kept as re-exports for existing geometry consumers.
export { createWoodShape, createPebbleShape, createMetalShape, createClayShape } from "./specimenGeometry.ts";
