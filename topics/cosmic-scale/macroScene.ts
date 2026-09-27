import { OBSERVABLE_RADIUS_KM, LIGHT_YEAR_KM, smooth } from './model.ts';
import content from './content.json';
import {drawObservableWeb} from './observableWeb.ts';

type Project=(xMly:number,yMly:number)=>[number,number];
type Label=(value:string,x:number,y:number)=>void;
type Text=(value:{zh:string;en:string})=>string;

const hash=(a:number,b:number,c=0)=>{let n=Math.imul(a+19,374761393)^Math.imul(b+43,668265263)^Math.imul(c+67,1274126177);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
const fade=(value:number,start:number,end:number)=>smooth((Math.log10(value)-Math.log10(start))/(Math.log10(end)-Math.log10(start)));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const noise=(x:number,y:number)=>{
 const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
 return mix(mix(hash(ix,iy,83),hash(ix+1,iy,83),fx),mix(hash(ix,iy+1,83),hash(ix+1,iy+1,83),fx),fy);
};
// One world-coordinate density field guides all detail levels; it is a teaching sketch, not a survey.
const density=(x:number,y:number)=>.55*noise(x/3600,y/3600)+.45*noise(x/900,y/900);
const node=(ix:number,iy:number,cell:number):[number,number]=>{
 if(cell>60){
  const child=cell/4,bx=ix*4+Math.min(3,Math.floor(hash(ix,iy,cell)*4)),by=iy*4+Math.min(3,Math.floor(hash(ix,iy,cell+1)*4));
  return node(bx,by,child);
 }
 return [(ix+.5+(hash(ix,iy,1)-.5)*.78)*60,(iy+.5+(hash(ix,iy,2)-.5)*.78)*60];
};

const horizonGrains:(readonly [number,number,number,number])[]=[];
for(let i=0;i<28000;i++){
 const x=(hash(i,311)*2-1)*46500,y=(hash(i,419)*2-1)*46500;
 if(x*x+y*y>46500*46500||hash(i,527)>.12+smooth((density(x,y)-.24)/.48)*.79)continue;
 horizonGrains.push([x,y,hash(i,613),.35+hash(i,719)*.8]);
}

/** Rounded distance anchors share one camera; every cosmic-web mark is illustrative. */
export class MacroScene {
 draw(c:CanvasRenderingContext2D,width:number,height:number,halfLy:number,nominalHalfLy:number,project:Project,label:Label,text:Text){
  const center=project(0,0);
  const webOpacity=fade(nominalHalfLy,6e7,6e8);
  const observableWebOpacity=fade(nominalHalfLy,1.2e10,4e10);
  const horizonOpacity=fade(nominalHalfLy,1.3e10,5e10);
  const horizonRadius=OBSERVABLE_RADIUS_KM/LIGHT_YEAR_KM/halfLy*width/2;
  if(webOpacity>.01){
   c.save();
   if(halfLy>1.3e10){c.beginPath();c.arc(center[0],center[1],horizonRadius,0,Math.PI*2);c.clip();}
   // The final physical view resolves into the same illustrative network as the
   // structural address; local links and grains recede during the handoff.
   if(observableWebOpacity>.01)drawObservableWeb(c,center[0],center[1],horizonRadius,observableWebOpacity);
   const localWebOpacity=webOpacity*(1-observableWebOpacity);
   // Short local links cover the full frame. Each coarser level retains a subset
   // of the finer level's world-coordinate nodes while other detail fades away.
   this.filamentLayer(c,project,width,height,60,localWebOpacity*fade(nominalHalfLy,5e7,1.8e8)*(1-fade(nominalHalfLy,7e8,2e9)));
   this.filamentLayer(c,project,width,height,240,localWebOpacity*fade(nominalHalfLy,5e8,1.5e9)*(1-fade(nominalHalfLy,4e9,1.2e10)));
   this.filamentLayer(c,project,width,height,960,localWebOpacity*fade(nominalHalfLy,3e9,8e9)*(1-fade(nominalHalfLy,1.4e10,4e10)));
   this.horizonGrain(c,project,width,height,localWebOpacity*fade(nominalHalfLy,2e9,1e10));
   c.restore();
   if(nominalHalfLy>1e9&&nominalHalfLy<1.5e10)label(text(content.ui.cosmicWeb),width*.30,height*.17);
  }
  const regionOpacity=fade(nominalHalfLy,7e7,2.2e8)*(1-fade(nominalHalfLy,3e9,1e10));
  if(regionOpacity>.01){
   const [cx,cy]=project(160,0),rx=260e6/halfLy*width/2,ry=155e6/halfLy*width/2;
   c.save();c.globalAlpha=regionOpacity;c.strokeStyle='#c3d3a592';c.lineWidth=1.5;c.setLineDash([6,6]);c.beginPath();c.ellipse(cx,cy,rx,ry,-.1,0,Math.PI*2);c.stroke();c.restore();
   if(rx>28&&rx<width*1.4)label(text(content.ui.laniakea),cx,cy-ry+18);
  }
  const clusterOpacity=fade(nominalHalfLy,8e6,3e7)*(1-fade(nominalHalfLy,2e9,7e9));
  if(clusterOpacity>.01){
   const [px,py]=project(50,20);if(px>-50&&px<width+50&&py>-50&&py<height+50){
    c.save();c.globalAlpha=clusterOpacity;const gas=c.createRadialGradient(px,py,0,px,py,34);gas.addColorStop(0,'#8ea9d452');gas.addColorStop(1,'#8ea9d000');c.fillStyle=gas;c.beginPath();c.arc(px,py,34,0,Math.PI*2);c.fill();
    for(let i=0;i<95;i++){const a=hash(i,1)*Math.PI*2,r=Math.sqrt(hash(i,2))*27;c.fillStyle=i%11===0?'#ffe1b9':'#bed5e5ad';c.beginPath();c.arc(px+Math.cos(a)*r,py+Math.sin(a)*r,i%11===0?2:1,0,Math.PI*2);c.fill();}c.restore();
    if(nominalHalfLy<1.5e8)label(text(content.ui.virgoCluster),px,py+48);
   }
  }
  if(horizonOpacity>.01){
   c.save();c.globalAlpha=horizonOpacity;c.strokeStyle='#f3dcaa';c.lineWidth=1.7;c.setLineDash([5,6]);c.beginPath();c.arc(center[0],center[1],horizonRadius,0,Math.PI*2);c.stroke();c.restore();
   if(horizonRadius<Math.min(width,height)*.48)label(text(content.ui.observableHorizon),center[0],center[1]-horizonRadius+25);
  }
 }

 /** Cell-local curves avoid a privileged central patch and screen-spanning strokes. */
 private filamentLayer(c:CanvasRenderingContext2D,project:Project,width:number,height:number,cell:number,opacity:number){
  if(opacity<.035)return;
  const [ox,oy]=project(0,0),pxPerMly=Math.abs(project(1000,0)[0]-ox)/1000;
  if(pxPerMly<=0)return;
  const x0=Math.floor(-ox/pxPerMly/cell)-2,x1=Math.ceil((width-ox)/pxPerMly/cell)+2;
  const y0=Math.floor((oy-height)/pxPerMly/cell)-2,y1=Math.ceil(oy/pxPerMly/cell)+2;
  c.save();c.globalAlpha=opacity;c.lineWidth=1;
  for(let ix=x0;ix<=x1;ix++)for(let iy=y0;iy<=y1;iy++){
   const [ax,ay]=node(ix,iy,cell),strength=density(ax,ay);
   if(strength<.24)continue;
   const [px,py]=project(ax,ay);
   for(const [dx,dy,seed] of [[1,0,11],[0,1,17],[1,1,23]] as const){
    const [bx,by]=node(ix+dx,iy+dy,cell),linkStrength=Math.min(strength,density(bx,by));
    if(linkStrength<.28||hash(ix+dx,iy+dy,seed)>(dx&&dy? .15 : .49)*(.55+linkStrength*.7))continue;
    const [qx,qy]=project(bx,by),length=Math.hypot(qx-px,qy-py);
    const bend=(hash(ix,iy,seed+29)-.5)*Math.min(18,cell*pxPerMly*.35);
    const cx=(px+qx)/2+(qy-py)/length*bend,cy=(py+qy)/2-(qx-px)/length*bend;
    c.strokeStyle='#89aec54d';c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(cx,cy,qx,qy);c.stroke();
    c.fillStyle='#a9c8dcb8';
    for(let k=1;k<=3;k++){
     const t=k/4,j=(hash(ix*7+k,iy*11+k,seed)-.5)*Math.min(5,cell*pxPerMly*.18);
     const sx=(1-t)*(1-t)*px+2*(1-t)*t*cx+t*t*qx+j;
     const sy=(1-t)*(1-t)*py+2*(1-t)*t*cy+t*t*qy-j;
     if(sx>=0&&sx<=width&&sy>=0&&sy<=height)c.fillRect(sx,sy,.7,.7);
    }
   }
   if(px>=0&&px<=width&&py>=0&&py<=height){
    if(hash(ix,iy,71)>.91){const glow=c.createRadialGradient(px,py,0,px,py,10);glow.addColorStop(0,'#d3d8d080');glow.addColorStop(1,'#8bb6cf00');c.fillStyle=glow;c.beginPath();c.arc(px,py,10,0,Math.PI*2);c.fill();}
    c.fillStyle=hash(ix,iy,73)>.88?'#ead9bb':'#abcbd7';c.beginPath();c.arc(px,py,hash(ix,iy,79)>.94?1.5:.7,0,Math.PI*2);c.fill();
   }
  }
  c.restore();
 }

 /** World-coordinate grains suggest statistical texture; none is a mapped individual galaxy. */
 private horizonGrain(c:CanvasRenderingContext2D,project:Project,width:number,height:number,opacity:number){
  if(opacity<.025)return;
  c.save();c.globalAlpha=opacity;
  for(const [x,y,tint,size] of horizonGrains){
   const [px,py]=project(x,y);if(px<0||px>width||py<0||py>height)continue;
   c.fillStyle=tint>.87?'#e6cfb8ab':'#9abfd08f';c.fillRect(px,py,size,size);
  }
  c.restore();
 }
}
