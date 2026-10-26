import {MATERIAL_TRACERS,frameStates,type RockSession,type Texture} from './model';

type Point={x:number;y:number};
const outline:Point[]=Array.from({length:19},(_,i)=>{const a=i/19*Math.PI*2,r=.94+.07*Math.sin(i*7.13);return{x:Math.cos(a)*r*1.32,y:Math.sin(a)*r*.9};});
function clip(points:Point[],nx:number,ny:number,d:number){
  const result:Point[]=[];
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],da=a.x*nx+a.y*ny-d,db=b.x*nx+b.y*ny-d;
    if(da<=0)result.push(a);
    if((da<0)!==(db<0)){const t=da/(da-db);result.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
  }return result;
}
const centers=MATERIAL_TRACERS.map((m,i)=>{
  const x=(m.x-.5)*2.15,y=(m.y-.5)*1.4,z=(m.phase-.5)*1.4;
  const inset=Math.min(1,.82/Math.hypot(x/1.32,y/.9,z/.86));
  return{x:x*inset,y:y*inset,z:z*inset,id:i};
});
/** Fixed partitions identify original material batches, not real mineral grains. */
export const PARCEL_CELLS=centers.map((center,i)=>{
  let polygon=outline;
  for(const [j,b]of centers.entries())if(i!==j)polygon=clip(polygon,b.x-center.x,b.y-center.y,(b.x*b.x+b.y*b.y-center.x*center.x-center.y*center.y)/2);
  return {id:i,center,polygon};
});
const amount=(texture:Texture,key:'loose'|'melt'|'foliated')=>texture===key?1:0;
type Arrangement='whole'|'slope'|'basin'|'cemented';
function nextArrangement(from:Arrangement,process:RockSession['process']):Arrangement{
  if(process==='weather')return'slope';
  if(process==='transport')return'basin';
  if(process==='lithify')return'cemented';
  if(process==='melt'||process==='slowCool'||process==='fastCool')return'whole';
  return from;
}
const ease=(t:number)=>t*t*(3-2*t);
function pose(cell:typeof PARCEL_CELLS[number],arrangement:Arrangement){
  const {center,id}=cell,angle=id*2.39996;
  if(arrangement==='whole')return{x:center.x,y:center.y,z:center.z,rotation:0,settled:0};
  const basin=arrangement!=='slope',packing=arrangement==='cemented'?.9:1;
  return{x:center.x*(basin?1.3:1.65)*packing+(basin?.72:-.65),y:0,
    z:(center.z*(basin?1.4:1.75)+Math.sin(angle)*.13)*packing,
    rotation:Math.sin(angle)*.95,settled:1};
}
export function parcelFrame(session:RockSession){
  const {from,to,amount:t}=frameStates(session),mix=(a:number,b:number)=>a+(b-a)*t;
  const loose=mix(amount(from.texture,'loose'),amount(to.texture,'loose'));
  const molten=mix(amount(from.texture,'melt'),amount(to.texture,'melt'));
  const banded=mix(amount(from.texture,'foliated'),amount(to.texture,'foliated'));
  const cement=mix(from.texture==='cemented'?1:0,to.texture==='cemented'?1:0);
  let arrangement:Arrangement='whole';
  for(const process of session.path.slice(0,session.cursor))arrangement=nextArrangement(arrangement,process);
  const target=nextArrangement(arrangement,session.process),transport=session.process==='transport'?t:0;
  const flow=session.path.slice(0,session.cursor).filter(process=>process==='transport').length+transport;
  const water=mix(arrangement==='basin'?1:0,target==='basin'?1:0);
  const matrix=mix(arrangement==='cemented'?1:0,target==='cemented'?1:0);
  return {materialId:from.materialId,loose,molten,banded,cement,transport,flow,water,matrix,
    cells:PARCEL_CELLS.map(cell=>{
      const id=cell.id,a=pose(cell,arrangement),b=pose(cell,target);
      // Outer batches release at slightly different fractions; this is an authored fracture view.
      const delay=session.process==='weather'?.22*(1-Math.min(1,Math.hypot(cell.center.x,cell.center.y,cell.center.z))):0;
      const s=ease(Math.max(0,Math.min(1,(t-delay)/(1-delay)))),blend=(x:number,y:number)=>x+(y-x)*s;
      const lift=Math.sin(transport*Math.PI)*(.035+(id%5)*.018);
      return {id,x:blend(a.x,b.x)*(1-molten*.72),y:blend(a.y,b.y),z:blend(a.z,b.z)*(1-molten*.72),
        rotation:blend(a.rotation,b.rotation)+Math.sin(transport*Math.PI)*Math.sin(id*2.39996)*.8,
        settled:blend(a.settled,b.settled),lift,scale:(1-molten*.94)*(1-matrix*.02)};
    })};
}
