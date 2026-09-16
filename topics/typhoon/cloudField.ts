/** Seeded cloud relief, shared by volume rendering and its scientific geometry tests. */
export const clamp = (v:number)=>Math.max(0,Math.min(1,v));
export const ramp = (a:number,b:number,v:number)=>{const u=clamp((v-a)/(b-a));return u*u*(3-2*u);};
const hash=(x:number,y:number)=>{const n=Math.sin(x*127.1+y*311.7+78.233)*43758.5453;return n-Math.floor(n);};
export function noise(x:number,y:number){
  const i=Math.floor(x),j=Math.floor(y),u=ramp(0,1,x-i),v=ramp(0,1,y-j);
  return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;
}
// Early convection is a set of unequal clusters, not the inverse of holes in a cloud sheet.
// Each cluster has its own depth and several offset lobes; the seed remains stable when scrubbing.
const cloudGroups=[[-112,-104,35,59],[-40,-33,48,101],[82,-73,38,80],[128,30,24,47],
  [23,101,44,66],[-154,48,23,40],[-99,145,15,30],[125,148,18,37],
  [13,-166,20,45],[176,-91,14,28],[-200,-25,15,30]];
const cloudLobes=cloudGroups.flatMap(([x,z,size,top],group)=>Array.from({length:3+group%4},(_,i)=>{
  const angle=hash(group+13,i+6)*Math.PI*2,offset=i===0?0:size*(.25+hash(i+2,group)*.65);
  const radius=size*(i===0?.7:.26+hash(group,i+11)*.4),turn=hash(group+8,i+3)*Math.PI;
  return {x:x+Math.cos(angle)*offset,z:z+Math.sin(angle)*offset,rx:radius,rz:radius*(.65+hash(i,group+9)*.65),
    c:Math.cos(turn),s:Math.sin(turn),top:top*(.76+hash(group+15,i)*.3),base:9+hash(group,i+40)*9};
}));
function initialConvection(x:number,z:number){
  const wx=x+16*(noise(x*.011+21,z*.009+8)-.5)+6*(noise(x*.041,z*.034)-.5);
  const wz=z+18*(noise(x*.008-8,z*.012+37)-.5)+5*(noise(x*.031+4,z*.039)-.5);
  let sum=0,top=0,base=0;
  for(const lobe of cloudLobes){
    const dx=wx-lobe.x,dz=wz-lobe.z,u=(dx*lobe.c+dz*lobe.s)/lobe.rx,v=(-dx*lobe.s+dz*lobe.c)/lobe.rz;
    const d=u*u+v*v;if(d>7)continue;
    const weight=Math.exp(-d*1.65);sum+=weight;top+=weight*lobe.top;base+=weight*lobe.base;
  }
  const density=1-Math.exp(-sum*1.45);
  return {density,top:sum>1e-6?top/sum:30,base:sum>1e-6?base/sum:12};
}
export function relief(x:number,z:number){
  const r=Math.hypot(x,z),a=Math.atan2(z,x);
  const n=.53*noise(x*.021+17,z*.021+4)+.28*noise(x*.056,z*.056)+.13*noise(x*.14+8,z*.14)+.06*noise(x*.33,z*.33);
  let bands=0;
  for(let k=0;k<3;k++){
    const start=[47,83,105][k],end=[236,217,194][k];
    const phase=[.2,2.5,4.83][k]+[1.72,1.95,1.45][k]*Math.log(Math.max(r,30)/48);
    const delta=Math.atan2(Math.sin(a-phase),Math.cos(a-phase));
    const width=.15+.075*Math.sin(r*.035+k);
    bands+=Math.exp(-Math.pow(delta/width,2))*ramp(start,start+25,r)*(1-ramp(end-28,end,r));
  }
  const cloud=initialConvection(x,z);
  return {bands:clamp(bands*(.44+.85*n)),detail:n,scatter:cloud.density,cloudTop:cloud.top,cloudBase:cloud.base};
}
export type StormStructure='eye'|'covered'|'replacement';
export function eyewalls(structure:StormStructure,replacement:number){
  const p=clamp(replacement);
  return {innerRadius:36,innerStrength:structure==='covered'?0:structure==='replacement'?1-ramp(.36,.82,p):1,
    outerRadius:96-54*ramp(.48,1,p),outerStrength:structure==='replacement'?ramp(.02,.34,p):0};
}

/** Approximate clear inner radius; the moat remains outside the original eye until its wall fades. */
export function eyeRadius(structure:StormStructure,replacement:number){
  if(structure==='covered')return 0;
  const p=clamp(replacement),outer=eyewalls(structure,p).outerRadius;
  return structure==='replacement'?23+(outer-36)*ramp(.68,.98,p):20;
}
