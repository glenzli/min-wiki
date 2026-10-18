import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { lightningState, leaderPath, connectorPath, pathThrough, groundPoint, mastTip, attachmentPoint, clamp } from './model.ts';
import type { Settings, Point } from './model.ts';
import { StormArtwork } from './stormArtwork.ts';
import { t } from './i18n.ts';
const noise=(i:number)=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a:number,b:number,x:number)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u);};
// The same nonmetric screen mapping joins the sound front and indoor observer.
// Magnifying the first .5 km keeps that observer separate from the mast.
const projectDistance=(km:number)=>35*km+30*(1-Math.exp(-km/.25));
export class TopicScene{
 private readonly artwork:StormArtwork;
 private readonly channel=leaderPath();
 private readonly branches=[4,8,12,17,22].map(index=>{
  const [x,y]=this.channel[index],side=index%2?1:-1,length=17+noise(index+65)*22;
  const points:Point[]=[[x,y],[x+side*7,y+6],[x+side*16,y+5],[x+side*(length*.7),y+18],[x+side*length,y+25],[x+side*(length+6),y+35]];
  return {index,points};
 });
 private surface:CanvasSurface;private progress=0;private settings:Settings={distanceKm:3,temperature:20};
 constructor(canvas:HTMLCanvasElement){
  this.surface=new CanvasSurface(canvas);
  this.artwork=new StormArtwork(()=>this.draw(this.progress,this.settings));
  this.surface.onResize(()=>this.draw(this.progress,this.settings));
 }
 draw(progress:number,settings:Settings){
  this.progress=progress;this.settings=settings;
  const s=this.surface,c=s.begin('#53677d','#9ca9aa'),state=lightningState(progress,settings),path=this.channel,observerX=15+projectDistance(settings.distanceKm);
  const flash=state.connected?smooth(0,.22,state.returnStroke)*(1-smooth(.675,.75,progress)):0;
  const label=(text:string,x:number,y:number,width=240)=>{
   const half=s.width/(2*s.scale)-14/s.scale,w=Math.min(width,half*2-12),safeX=Math.max(-half+w/2,Math.min(half-w/2,x));
   s.label(text,safeX,y,{width:w,color:'#f0f3f0',background:'#1d2b32dc'});
  };
  this.artwork.paintLandscape(c,flash,s.width/(2*s.scale)+2,s.height*.46/s.scale+2);
  // Local rain is behind the channel and belongs to this cloud's rain shaft.
  c.save();
  const rainVeil=c.createLinearGradient(-160,-80,-185,146);rainVeil.addColorStop(0,'#758b9c00');rainVeil.addColorStop(.28,'#728c9c19');rainVeil.addColorStop(1,'#7c9aab00');
  c.fillStyle=rainVeil;c.beginPath();c.moveTo(-265,-90);c.lineTo(-80,-85);c.lineTo(-113,147);c.lineTo(-305,147);c.closePath();c.fill();
  for(let i=0;i<100;i++){
   const u=(noise(i+131)+progress*1.6)%1,x=-250+noise(i+641)*145-u*19,y=-80+u*228;
   s.path([[x,y],[x-1.5,y+5+noise(i+73)*5]],undefined,i%4?'#c3d1d92b':'#d3e0e13c',.55);
  }c.restore();
  this.artwork.paintCloud(c,flash*smooth(.32,.9,state.returnStroke));
  if(progress<.70){
   c.save();c.font=`600 ${Math.max(17,12/s.scale)}px -apple-system,sans-serif`;c.textAlign='center';c.textBaseline='middle';
   c.globalAlpha=(.82+.18*state.separation)*(1-smooth(.40,.64,progress));
   c.shadowColor='#152e45';c.shadowBlur=3;
   const charge=(symbol:string,x:number,y:number,color:string)=>{
    c.strokeStyle='#1b2c4199';c.lineWidth=1.7/s.scale;c.strokeText(symbol,x,y);
    c.fillStyle=color;c.fillText(symbol,x,y);
   };
   // Persistent symbols move from a mixed region into separated regions.
   // Positions and colors are illustrative, not measured charge trajectories.
   for(let i=0;i<13;i++){
    const x=-235+noise(i+266)*253,start=-178+noise(i+412)*64,target=-224+noise(i+721)*38;
    charge('+',x,start+(target-start)*state.separation,'#f4d4a2');
   }
   for(let i=0;i<13;i++){
    const x=-228+noise(i+300)*232,start=-174+noise(i+377)*60,target=-139+noise(i+174)*34;
    charge('−',x,start+(target-start)*state.separation,'#b3d5ed');
   }
   c.shadowBlur=0;c.globalAlpha=state.field*(1-smooth(.40,.64,progress));
   for(let i=0;i<12;i++){
    const proximity=1-Math.abs(i-5.5)/6,x=15+(i-5.5)*(13-7*proximity),y=146-38*proximity*proximity;
    charge('+',x,y,'#f2d6ab');
   }c.restore();
  }
  if(progress<.32){
   c.save();c.globalAlpha=.8;
   for(let i=0;i<18;i++){
    const u=(progress*.9+noise(i+44))%1,x=-205+noise(i+330)*172,y=-92-u*122;
    s.ellipse(x,y,1.2+i%3*.45,2.4+i%2,'#d7e4e899');
   }
   s.arrow(-205,-126,-190,-188,'#e8c28b',1.5);s.arrow(-49,-184,-37,-127,'#a6c9df',1.5);c.restore();
   if(s.width>650&&progress<.20)label(t('碰撞转移电荷，气流再把粒子分开'),-112,-32,340);
  }
  if(state.field>0&&progress<.60){
   c.save();c.globalAlpha=state.field*.24;
   for(let i=0;i<7;i++){
    const x=-150+i*54;c.beginPath();c.moveTo(x,-103);c.bezierCurveTo(x*.9,-20,x*.55+8,59,x*.58+6,118);c.strokeStyle='#c2c2d7';c.lineWidth=.7;c.stroke();
   }c.restore();
   if(s.width>650&&progress>.20&&progress<.36)label(t('尖端附近电荷更集中，局部电场更强'),134,39,290);
  }
  // A slim grounded truss, with the original model tip and attachment site.
  s.ellipse(groundPoint[0]+2,groundPoint[1]+2,16,3,'#1b363d77');
  c.fillStyle='#7f9292';c.fillRect(groundPoint[0]-12,groundPoint[1]-2,24,4);
  s.path([[7,140],[15,103],[23,140]],undefined,'#4a616a',2);
  s.path([[10,126],[21,137],[12,116],[18,116],[9,137]],undefined,'#a4b4b4',.8);
  s.path([[mastTip[0],103],mastTip],undefined,'#d5dfdf',1.6);
  if(state.field>.45&&state.leader<.92){
   const glow=c.createRadialGradient(15,91,0,15,91,9+state.field*7);glow.addColorStop(0,'#c4cbec70');glow.addColorStop(1,'#c5b8ff00');s.ellipse(15,91,10+state.field*7,10+state.field*7,glow);
  }
  if(state.leader>0){
   const visible=pathThrough(path,state.leader),reference=progress<.70?1:1-smooth(.70,.85,progress)*.87;
   c.save();c.globalAlpha=reference;
   s.path(visible,undefined,'#b9c3e345',3.8);s.path(visible,undefined,'#655f94c9',1.05);
   for(const branch of this.branches){
    const growth=clamp((state.leader*(path.length-1)-branch.index)/4);if(growth<=0)continue;
    s.path(pathThrough(branch.points,growth),undefined,'#807eaa8c',.65);
   }
   if(state.connector>0){s.path(pathThrough(connectorPath(),state.connector),undefined,'#bdc9eb5c',4);s.path(pathThrough(connectorPath(),state.connector),undefined,'#71679fcf',1.1);}
   c.restore();
   if(state.returnStroke>0){
    const stroke=[...connectorPath(),...pathThrough([...path].reverse(),state.returnStroke).slice(1)],fade=1-smooth(.70,.80,progress);
    c.save();c.globalAlpha=fade;c.globalCompositeOperation='screen';
    const core=(points:Point[],color:string,width:number)=>{
     c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
     c.lineJoin='miter';c.miterLimit=2;c.lineCap='butt';c.strokeStyle=color;c.lineWidth=width;c.stroke();
    };
    c.shadowColor='#bdd5ff';c.shadowBlur=22;
    s.path(stroke,undefined,'#aecbff55',12);s.path(stroke,undefined,'#c9ddffb0',5);
    // White stationary core and restrained branch light replace the roaming
    // bright bead. The front still follows the existing attached channel.
    c.shadowBlur=0;
    core(stroke,'#f0f6ff',2);core(stroke,'#ffffff',.95);
    for(const branch of this.branches){
     const reached=smooth(1-branch.index/(path.length-1),1-branch.index/(path.length-1)+.055,state.returnStroke);
     if(reached<=0)continue;
     c.globalAlpha=fade*reached*.65;c.shadowBlur=7;
     s.path(branch.points,undefined,'#bcd5ff63',3);c.shadowBlur=0;core(branch.points,'#e9f2ffd9',.65);
    }
    c.restore();
   }
   if(s.width>650&&progress>.32&&!state.connected){
    const tip=visible.at(-1)!;label(t('分步先导'),tip[0]-74,tip[1]-5,190);
    if(state.connector>0)label(t('向上连接通道'),113,36,200);
   }
   if(s.width>650&&state.returnStroke>0&&progress<.70)label(t('明亮回击向上发展'),117,-15,250);
  }
  this.artwork.paintHouse(c,observerX,flash*.8);
  if(progress>=.70){
   const radius=projectDistance(state.soundRadiusKm),frontX=Math.min(observerX,15+radius);
   // The one leading boundary and the ground track share one distance map.
   // Thin trailing arcs are schematic, not wavelength or loudness readings.
   c.save();c.beginPath();c.rect(-430,-70,870,218);c.clip();
   for(let i=0;i<3;i++){
    const r=radius-i*10;if(r<=0)continue;
    if(i===0){c.beginPath();c.arc(15,141,r,Math.PI,Math.PI*2);c.strokeStyle='#e4c99420';c.lineWidth=7;c.stroke();}
    c.beginPath();c.arc(15,141,r,Math.PI,Math.PI*2);c.strokeStyle=i===0?'#efd8a9d9':'#e4c99432';c.lineWidth=i===0?1.6:.7;c.stroke();
   }c.restore();
   s.path([[15,166],[observerX,166]],undefined,'#d4ddd45c',1.1);s.path([[15,166],[frontX,166]],undefined,'#e7c990',2.4);
   for(const x of [15,observerX])s.path([[x,162],[x,170]],undefined,'#d4ddd4',1);
   if(state.heard)s.ellipse(observerX,166,7,7,'#e5cb8533','#e8d4a4');
   s.ellipse(frontX,166,2.6,2.6,'#f1d9a8');
   label(t('声波传播示意'),(15+observerX)/2,191,230);
  }
  label(t('室内'),observerX+22,78,110);
  if(this.artwork.status!=='ready')label(this.artwork.status==='loading'?t('正在载入场景插画'):t('插画加载失败，可刷新重试；通道示意仍可操作'),0,210,510);
  s.end();
 }
 dispose(){this.artwork.dispose();this.surface.dispose();}
}
