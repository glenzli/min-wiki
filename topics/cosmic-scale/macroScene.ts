import { OBSERVABLE_RADIUS_KM, LIGHT_YEAR_KM, smooth } from './model.ts';
import { virgoOpacity } from './cosmicSpaceModel.ts';
import content from './content.json';

type Project=(xMly:number,yMly:number)=>[number,number];
type Label=(value:string,x:number,y:number)=>void;
type Text=(value:{zh:string;en:string})=>string;
const fade=(value:number,start:number,end:number)=>smooth((Math.log10(value)-Math.log10(start))/(Math.log10(end)-Math.log10(start)));

/** Annotation only: distance anchors and dashed references are distinct from
 * the retained statistical volumes rendered by CosmicScene. */
export class MacroScene {
 draw(c:CanvasRenderingContext2D,width:number,height:number,halfLy:number,nominalHalfLy:number,project:Project,label:Label,text:Text){
  const center=project(0,0),horizonOpacity=fade(nominalHalfLy,1.3e10,5e10);
  const horizonRadius=OBSERVABLE_RADIUS_KM/LIGHT_YEAR_KM/halfLy*width/2;
  if(nominalHalfLy>1e9&&nominalHalfLy<1.5e10)label(text(content.ui.cosmicWeb),width*.30,height*.17);
  const regionOpacity=fade(nominalHalfLy,7e7,2.2e8)*(1-fade(nominalHalfLy,3e9,1e10));
  if(regionOpacity>.01){
   const [cx,cy]=project(160,0),rx=260e6/halfLy*width/2,ry=155e6/halfLy*width/2;
   c.save();c.globalAlpha=regionOpacity;c.strokeStyle='#c3d3a56b';c.lineWidth=1;c.setLineDash([4,7]);c.beginPath();c.ellipse(cx,cy,rx,ry,-.1,0,Math.PI*2);c.stroke();c.restore();
   if(rx>28&&rx<width*1.4)label(text(content.ui.laniakea),cx,cy-ry+18);
  }
  if(virgoOpacity(nominalHalfLy)>.01&&nominalHalfLy<1.5e8){
   const [px,py]=project(50,20);label(text(content.ui.virgoCluster),px,py+48);
  }
  if(horizonOpacity>.01){
   c.save();c.globalAlpha=horizonOpacity;c.strokeStyle='#e3d3ac';c.lineWidth=1.2;c.setLineDash([5,7]);c.beginPath();c.arc(center[0],center[1],horizonRadius,0,Math.PI*2);c.stroke();c.restore();
   if(horizonRadius<Math.min(width,height)*.48)label(text(content.ui.observableHorizon),center[0],center[1]-horizonRadius+25);
  }
 }
}
