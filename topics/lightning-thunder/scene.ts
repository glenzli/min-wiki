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
  // Diagram annotations stay above environmental exposure, with one visual
  // vocabulary. Capture each call's teaching-state opacity before deferring it.
  const annotations:Array<()=>void>=[];
  const label=(text:string,x:number,y:number,width=240,options:{color?:string;anchor?:Point}={})=>{
   const opacity=c.globalAlpha;
   annotations.push(()=>{
    c.save();c.globalAlpha=opacity;
    const font=(s.width<650?12:13)/s.scale,lineHeight=font*1.35,pad=6/s.scale;
    const half=s.width/(2*s.scale)-12/s.scale,maxText=Math.min(width,2*half-2*pad);
    c.font=`500 ${font}px -apple-system,BlinkMacSystemFont,sans-serif`;
    c.textAlign='center';c.textBaseline='middle';
    const wordMode=/[A-Za-z]/.test(text)||text.includes(' '),words=wordMode?text.split(' '):[...text],lines:string[]=[];
    let line='';
    for(const word of words){
     const next=line+(line&&wordMode?' ':'')+word;
     if(line&&c.measureText(next).width>maxText){lines.push(line);line=word;}else line=next;
    }
    if(line)lines.push(line);
    const w=Math.max(...lines.map(value=>c.measureText(value).width))+pad*2;
    const safeX=Math.max(-half+w/2,Math.min(half-w/2,x)),top=y-lineHeight/2-4/s.scale;
    if(options.anchor){
     s.path([options.anchor,[safeX,y]],undefined,'#d1dee8aa',.8/s.scale);
     s.ellipse(...options.anchor,1.4/s.scale,1.4/s.scale,'#d9e4eb');
    }
    c.beginPath();c.roundRect(safeX-w/2,top,w,lineHeight*lines.length+8/s.scale,4/s.scale);
    c.fillStyle='#142734cf';c.fill();c.strokeStyle='#c6d7df3b';c.lineWidth=.65/s.scale;c.stroke();
    c.fillStyle=options.color??'#f0f5f7';
    lines.forEach((value,i)=>c.fillText(value,safeX,y+i*lineHeight));c.restore();
   });
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
  if(progress<.32){
   c.save();c.globalAlpha=.8;
   for(let i=0;i<18;i++){
    const u=(progress*.9+noise(i+44))%1,x=-205+noise(i+330)*172,y=-92-u*122;
    s.ellipse(x,y,1.2+i%3*.45,2.4+i%2,'#d7e4e899');
   }
   s.arrow(-205,-126,-190,-188,'#e8c28b',1.5);s.arrow(-49,-184,-37,-127,'#a6c9df',1.5);c.restore();
  }
  if(progress<.70){
   c.save();
   const chargeFade=1-smooth(.46,.61,progress),markSize=Math.max(4.2,3.5/s.scale);
   const pane=(x:number,y:number,width:number,height:number)=>{
    const fill=c.createLinearGradient(x,y,x,y+height);
    fill.addColorStop(0,'#152c3a94');fill.addColorStop(1,'#102331a3');
    c.beginPath();c.roundRect(x,y,width,height,6);c.fillStyle=fill;c.fill();
    c.strokeStyle='#c8d9e461';c.lineWidth=.8/s.scale;c.stroke();
   };
   const charge=(positive:boolean,x:number,y:number,r=markSize)=>{
    c.beginPath();c.moveTo(x-r,y);c.lineTo(x+r,y);
    if(positive){c.moveTo(x,y-r);c.lineTo(x,y+r);}
    c.lineCap='round';c.strokeStyle='#07162566';c.lineWidth=2.7/s.scale;c.stroke();
    c.strokeStyle=positive?'#ffdf9f':'#e1f4ff';c.lineWidth=1.5/s.scale;c.stroke();
   };
   const region=(x:number,y:number,rx:number,ry:number,color:string)=>{
    c.save();c.translate(x,y);c.scale(rx,ry);
    const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,color);g.addColorStop(1,'#ffffff00');
    c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();
   };
   // One explicit diagram window softens the texture behind the entire field;
   // its outline is an annotation boundary, not a physical cloud/cut surface.
   c.globalAlpha=chargeFade;pane(-250,-262,320,188);
   c.globalAlpha=state.separation*chargeFade;
   region(-105,-226,142,38,'#ffda9638');region(-105,-128,154,31,'#81c3ee4f');
   // Retained, mildly irregular sign fields separate from the same mixed band.
   // Signs label regions, not visible particles or electron trajectories.
   c.globalAlpha=chargeFade;
   for(let i=0;i<14;i++){
    const row=Math.floor(i/7),x=-221+i%7*36+row*12+(noise(i+220)-.5)*10;
    const start=-190+row*29+(noise(i+280)-.5)*15,u=state.separation;
    const upper=-241+row*27+(noise(i+501)-.5)*15,lower=-145+row*25+(noise(i+612)-.5)*15;
    charge(true,x-8*(1-u),start+(upper-start)*u);
    charge(false,x+8*(1-u),start+(lower-start)*u);
   }
   c.globalAlpha=smooth(.35,.8,state.separation)*chargeFade;
   label(t('上部：正电荷'),156,-226,170,{color:'#ffe1ad',anchor:[31,-226]});
   label(t('中下部：负电荷'),168,-128,185,{color:'#d1efff',anchor:[33,-128]});
   // The small lower positive pocket belongs to the existing teaching model.
   c.globalAlpha=smooth(.6,1,state.separation)*chargeFade;
   region(-165,-90,34,15,'#ffdc8c38');
   for(let i=0;i<3;i++)charge(true,-180+i*15,-92+(i%2)*5,markSize*.75);
   c.globalAlpha=smooth(0,.45,state.field)*chargeFade;
   pane(-148,139,164,44);
   region(-65,151,121,17,'#f5c97755');
   for(let i=0;i<12;i++)charge(true,-132+i%6*24+(noise(i+848)-.5)*6,151+Math.floor(i/6)*16+(noise(i+947)-.5)*5,markSize*.9);
   label(t('地面：感应正电荷'),-65,s.width<650?224:211,320,{color:'#ffe1ad'});
   if(progress<.32){
    c.globalAlpha=1;
    label(t('电荷区域示意 · 符号不是粒子'),-105,s.width<650?-32:-56,365);
   }
   c.restore();
  }
  if(state.field>0&&progress<.60){
   c.save();c.globalAlpha=state.field*.24;
   for(let i=0;i<7;i++){
    const x=-150+i*54;c.beginPath();c.moveTo(x,-103);c.bezierCurveTo(x*.9,-20,x*.55+8,59,x*.58+6,118);c.strokeStyle='#c2c2d7';c.lineWidth=.7;c.stroke();
   }c.restore();
   if(s.width>650&&progress>.20&&progress<.36)label(t('尖端附近电荷更集中，局部电场更强'),134,39,290);
  }
  // The tower retains the exact model tip/ground anchors. Wider footings,
  // dark edge separation and lit galvanized faces make its truss readable.
  c.save();
  s.ellipse(groundPoint[0]+2,groundPoint[1]+4,23,5,'#172d2ca6');
  s.path([[-3,139],[27,139],[33,143],[3,143]],'#bec5b9','#dce2d6',.7);
  s.path([[3,143],[33,143],[33,147],[3,147]],'#677871','#3e514e',.8);
  s.path([[31,139],[19,102]],undefined,'#243941',4);
  s.path([[31,139],[19,102]],undefined,'#98aaa8',1.6);
  const half=(y:number)=>1.6+(y-102)/39*10.4;
  for(const [top,bottom] of [[103,115],[115,128],[128,141]]){
   const lt:Point=[15-half(top),top],rt:Point=[15+half(top),top];
   const lb:Point=[15-half(bottom),bottom],rb:Point=[15+half(bottom),bottom];
   s.path([lt,rb],undefined,'#263b42',2.9);s.path([rt,lb],undefined,'#263b42',2.9);
   s.path([lt,rb],undefined,'#d0d8c8',1);s.path([rt,lb],undefined,'#9cafa8',1);
   s.path([lb,rb],undefined,'#bac8bd',1.25);
  }
  for(const foot of [3,27]){
   const top=foot<15?13.4:16.6;
   s.path([[foot,141],[top,102]],undefined,'#22343d',4.1);
   s.path([[foot-.45,141],[top-.45,102]],undefined,'#e3e4cc',1.7);
   s.ellipse(foot,141,2.1,1,'#c5caba','#3e514e');
  }
  s.path([[mastTip[0],103],mastTip],undefined,'#253b43',4.6);
  s.path([[mastTip[0]-.35,103],[mastTip[0]-.35,mastTip[1]]],undefined,'#f6f1d6',2);
  s.ellipse(mastTip[0],mastTip[1],1,1,'#fff5d5');
  if(progress<.32){
   label(t('接地塔'),-88,91,155,{anchor:[5,120]});
  }
  c.restore();
  this.artwork.paintHouse(c,observerX,flash*.8);
  if(flash>0){
   // One connected return lights the entire visible environment. Local masks
   // above remain stronger near the channel; neither pass introduces a clock.
   c.save();c.globalCompositeOperation='screen';c.globalAlpha=flash*.36;
   c.fillStyle='#dfeaff';
   c.fillRect(-s.width/(2*s.scale)-2,-s.height*.54/s.scale-2,s.width/s.scale+4,s.height/s.scale+4);
   c.restore();
  }
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
  for(const paint of annotations)paint();
  s.end();
 }
 dispose(){this.artwork.dispose();this.surface.dispose();}
}
