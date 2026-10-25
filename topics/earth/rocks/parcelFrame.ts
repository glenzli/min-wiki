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
const centers=MATERIAL_TRACERS.map((m,i)=>({x:(m.x-.5)*2.15,y:(m.y-.5)*1.4,id:i}));
/** Fixed partitions identify original material batches, not real mineral grains. */
export const PARCEL_CELLS=centers.map((center,i)=>{
  let polygon=outline;
  for(const [j,b]of centers.entries())if(i!==j)polygon=clip(polygon,b.x-center.x,b.y-center.y,(b.x*b.x+b.y*b.y-center.x*center.x-center.y*center.y)/2);
  return {id:i,center,polygon};
});
const amount=(texture:Texture,key:'loose'|'melt'|'foliated')=>texture===key?1:0;
export function parcelFrame(session:RockSession){
  const {from,to,amount:t}=frameStates(session),mix=(a:number,b:number)=>a+(b-a)*t;
  const loose=mix(amount(from.texture,'loose'),amount(to.texture,'loose'));
  const molten=mix(amount(from.texture,'melt'),amount(to.texture,'melt'));
  const banded=mix(amount(from.texture,'foliated'),amount(to.texture,'foliated'));
  const cement=mix(from.texture==='cemented'?1:0,to.texture==='cemented'?1:0);
  const transport=session.process==='transport'?t:0;
  return {materialId:from.materialId,loose,molten,banded,cement,transport,
    cells:PARCEL_CELLS.map(cell=>{
      const id=cell.id,angle=id*2.39996;
      const scatterX=cell.center.x*1.35,scatterZ=Math.sin(angle)*(.35+(id%4)*.13);
      const settled=-.82+(id%3)*.15;
      const lift=transport>0?Math.sin(transport*Math.PI)*(.08+(id%5)*.027):0;
      return {id,x:cell.center.x+(scatterX-cell.center.x)*loose,y:cell.center.y-.18+(settled-cell.center.y+.18)*loose+lift,z:scatterZ*loose,
        rotation:loose*Math.sin(angle)*.48,scale:(1-molten*.94)*(1-cement*.02)};
    })};
}
