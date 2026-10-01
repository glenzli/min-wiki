import { EARTH_RADIUS, journeyFrame, layerEdges, radialPoint, type Settings } from './model.ts';
import type content from './content.json';
import type { MechanismFrame } from './layerMechanism.ts';
import earthDayMap from '../solar-system/assets/2k_earth_daymap.jpg';
import earthCloudMap from '../solar-system/assets/2k_earth_clouds.jpg';

type Text=typeof content.zh;
const noise=(i:number)=>{const n=Math.sin(i*127.1+91.7)*43758.5453;return n-Math.floor(n);};
/** One retained globe, coast, radial path and feature population under one camera.
 * Orthographic side observation, not a first-person flight or a weather forecast. */
export class AtmosphereScene {
 private c:CanvasRenderingContext2D;
 private observer:ResizeObserver;
 private state?:Settings;
 private labels=true;
 private mechanism:MechanismFrame|null=null;
 private disposed=false;
 private w=1;private h=1;private scale=1;private cy=0;
 private cloud:HTMLCanvasElement;
 private globe:HTMLCanvasElement;
 private photoSurface:HTMLCanvasElement|null=null;
 private photoClouds:HTMLCanvasElement|null=null;
 private coast=new Path2D('M0 -6500 C0 -6400 0 -6350 5 -6320 L90 -6070 310 -5920 270 -5730 580 -5590 730 -5270 570 -5010 780 -4780 1050 -4690 970 -4460 1260 -4200 1450 -3990 1400 -3720 1650 -3480 1490 -3250 1230 -3140 1180 -2860 1370 -2680 1320 -2380 1620 -2090 1790 -2150 1900 -1940 2240 -1830 2490 -1620 2630 -1710 2850 -1540 2990 -1260 2790 -1130 2540 -1210 2370 -950 2690 -790 3030 -880 3120 -670 3500 -570 3810 -860 4130 -760 4320 -1120 4650 -1220 4920 -1630 5300 -1740 5680 -2180 6080 -2470 6800 -2650 7000 -6500Z');
 private south=new Path2D('M-4750 -1920 L-4310 -2310 -3870 -2140 -3620 -2260 -3380 -2060 -3000 -1990 -2690 -1700 -2380 -1690 -2260 -1380 -1930 -1240 -1700 -810 -1790 -570 -1450 -310 -1280 70 -1420 430 -1700 650 -1750 1090 -2040 1390 -1900 1710 -1660 1910 -1570 2270 -1310 2390 -1110 2760 -1300 3010 -1690 3170 -1810 3510 -2150 3720 -2280 4060 -2620 4470 -2820 4700 -3090 4350 -3030 4000 -3350 3720 -3230 3370 -3510 3020 -3520 2710 -3860 2410 -3900 2100 -4200 1750 -4030 1430 -4280 980 -4170 620 -4500 370 -4440 40 -4800 -200 -4700 -570 -4980 -970 -4820 -1400Z');
 constructor(private canvas:HTMLCanvasElement,private text:Text){
  const c=canvas.getContext('2d');if(!c)throw new Error('Canvas 2D unavailable');this.c=c;
  this.cloud=this.makeCloud();this.globe=this.makeGlobe();
  this.observer=new ResizeObserver(()=>{if(this.state)this.draw(this.state,this.labels,this.mechanism);});this.observer.observe(canvas);
  void this.loadEarthMaps();
 }
 private async loadEarthMaps(){
  const load=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{
   const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Earth map unavailable'));image.src=src;
  });
  try{
   const [day,clouds]=await Promise.all([load(earthDayMap),load(earthCloudMap)]);
   if(this.disposed)return;
   const maps=this.projectEarthMaps(day,clouds);
   if(this.disposed){maps.surface.width=maps.clouds.width=0;return;}
   this.photoSurface=maps.surface;this.photoClouds=maps.clouds;
   if(this.state)this.draw(this.state,this.labels,this.mechanism);
  }catch{/* The retained illustrative globe remains usable if a map cannot load. */}
 }
 /** Orthographic projection of the existing licensed Earth maps. The marked
  * coast is placed near the upper limb; local terrain is still an illustration. */
 private projectEarthMaps(day:HTMLImageElement,clouds:HTMLImageElement){
  const size=1280,source=document.createElement('canvas');source.width=day.naturalWidth;source.height=day.naturalHeight;
  const src=source.getContext('2d',{willReadFrequently:true})!;
  src.drawImage(day,0,0,source.width,source.height);const dayPixels=src.getImageData(0,0,source.width,source.height).data;
  src.clearRect(0,0,source.width,source.height);src.drawImage(clouds,0,0,source.width,source.height);
  const cloudPixels=src.getImageData(0,0,source.width,source.height).data;
  const surface=document.createElement('canvas'),cloudLayer=document.createElement('canvas');
  surface.width=surface.height=cloudLayer.width=cloudLayer.height=size;
  const sc=surface.getContext('2d')!,cc=cloudLayer.getContext('2d')!;
  const face=sc.createImageData(size,size),weather=cc.createImageData(size,size);
  // A Norwegian coastal reference keeps north up, ocean to the left and
  // land to the right as the same marked region is enlarged.
  const latitude=60*Math.PI/180,longitude=5*Math.PI/180;
  const site=[Math.cos(latitude)*Math.cos(longitude),Math.cos(latitude)*Math.sin(longitude),Math.sin(latitude)];
  const north=[-Math.sin(latitude)*Math.cos(longitude),-Math.sin(latitude)*Math.sin(longitude),Math.cos(latitude)];
  const eye=north.map(v=>-v);
  const right=[site[1]*eye[2]-site[2]*eye[1],site[2]*eye[0]-site[0]*eye[2],site[0]*eye[1]-site[1]*eye[0]];
  const sourceWidth=source.width,sourceHeight=source.height,radius=size/2;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const sx=(x+.5-radius)/radius,sy=(radius-y-.5)/radius,r2=sx*sx+sy*sy;
   if(r2>=1)continue;
   const depth=Math.sqrt(1-r2),vx=right[0]*sx+site[0]*sy+eye[0]*depth;
   const vy=right[1]*sx+site[1]*sy+eye[1]*depth,vz=right[2]*sx+site[2]*sy+eye[2]*depth;
   const u=(Math.atan2(vy,vx)/(2*Math.PI)+.5)*sourceWidth;
   const v=(.5-Math.asin(Math.max(-1,Math.min(1,vz)))/Math.PI)*sourceHeight;
   const sample=(Math.min(sourceHeight-1,Math.max(0,Math.floor(v)))*sourceWidth+Math.floor(u+sourceWidth)%sourceWidth)*4;
   const target=(y*size+x)*4,light=Math.max(0,-.43*sx+.33*sy+.84*depth);
   const lit=.29+.71*light,rim=Math.pow(1-depth,4),edge=Math.min(1,(1-r2)*radius);
   face.data[target]=Math.min(255,dayPixels[sample]*lit+rim*4);
   face.data[target+1]=Math.min(255,dayPixels[sample+1]*lit+rim*16);
   face.data[target+2]=Math.min(255,dayPixels[sample+2]*lit+rim*27);
   face.data[target+3]=Math.round(255*edge);
   const brightness=(cloudPixels[sample]+cloudPixels[sample+1]+cloudPixels[sample+2])/(3*255);
   const opacity=Math.min(.73,Math.max(0,(brightness-.12)*.83))*edge;
   weather.data[target]=weather.data[target+1]=weather.data[target+2]=Math.round(182+68*lit);
   weather.data[target+3]=Math.round(opacity*255);
  }
  sc.putImageData(face,0,0);cc.putImageData(weather,0,0);source.width=source.height=0;
  return {surface,clouds:cloudLayer};
 }
 private makeCloud(){
  const a=document.createElement('canvas');a.width=400;a.height=220;const c=a.getContext('2d')!;
  for(let i=0;i<180;i++){
   const x=60+noise(i)*280,y=140-Math.sin((x-30)/340*Math.PI)*(20+noise(i+20)*62),r=14+noise(i+60)*28;
   const g=c.createRadialGradient(x-r*.25,y-r*.4,1,x,y,r);g.addColorStop(0,'#fffce86b');g.addColorStop(.55,'#e1eff64d');g.addColorStop(1,'#c1d3df00');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);
  }return a;
 }
 private makeGlobe(){
  const a=document.createElement('canvas');a.width=a.height=1536;
  const c=a.getContext('2d')!,R=EARTH_RADIUS;
  c.translate(768,768);c.scale(768/R,768/R);
  c.beginPath();c.arc(0,0,R,0,Math.PI*2);c.clip();
  const sea=c.createLinearGradient(-R,-R,R,R);sea.addColorStop(0,'#287f9b');sea.addColorStop(.5,'#164665');sea.addColorStop(1,'#071c36');c.fillStyle=sea;c.fillRect(-R,-R,R*2,R*2);
  const land=new Path2D();land.addPath(this.coast);land.addPath(this.south);
  // Small islands and ragged polar land remain attached to this same globe.
  for(let i=0;i<23;i++){const x=2300+Math.sin(i*.65)*620+i*92,y=180+Math.cos(i*.8)*200+i*85;land.moveTo(x+45,y);land.ellipse(x,y,35+noise(i+12)*75,60+noise(i+18)*125,-.45,0,Math.PI*2);}
  c.strokeStyle='#41a6ae55';c.lineWidth=130;c.stroke(land);c.strokeStyle='#7eb9a766';c.lineWidth=38;c.stroke(land);
  c.fillStyle='#62856a';c.fill(land);c.save();c.clip(land);
  const terrain=c.createLinearGradient(0,-R,0,R);terrain.addColorStop(0,'#b1b9a0');terrain.addColorStop(.22,'#769578');terrain.addColorStop(.42,'#beaa75');terrain.addColorStop(.54,'#567951');terrain.addColorStop(.76,'#426d56');terrain.addColorStop(1,'#b2b6a0');c.fillStyle=terrain;c.fillRect(-R,-R,2*R,2*R);
  for(let i=0;i<2100;i++){
   const x=(noise(i+80)*2-1)*R,y=(noise(i+3500)*2-1)*R;
   c.fillStyle=i%3===0?'#294e3b20':'#e1d3a215';c.beginPath();c.ellipse(x,y,20+noise(i+5200)*180,10+noise(i+8200)*65,-.7,0,Math.PI*2);c.fill();
  }
  // Irregular ridge chains, with a lit side and a shaded side rather than symbols.
  for(const [x,y,length] of [[1900,-4900,2100],[-3620,-1260,4500],[3500,-3400,1900]]){
   for(let i=0;i<90;i++){const t=i/90,px=x+Math.sin(t*9)*150+t*450,py=y+t*length,r=30+noise(i+600)*65;
    c.fillStyle='#354f423e';c.beginPath();c.moveTo(px-r,py+r);c.lineTo(px,py-r);c.lineTo(px+r*1.7,py+r);c.fill();
    c.fillStyle='#d7cbaa65';c.beginPath();c.moveTo(px-r,py+r);c.lineTo(px,py-r);c.lineTo(px+10,py+10);c.fill();}
  }
  c.restore();
  return a;
 }
 private point(x:number,height:number){const p=radialPoint(x,height);return {x:this.w/2+p.x*this.scale,y:this.h/2+(p.y-this.cy)*this.scale};}
 private line(points:{x:number;y:number}[],color:string|CanvasGradient,width=1){const c=this.c;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 private dot(x:number,y:number,r:number,color:string){const c=this.c;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
 private label(text:string,x:number,y:number,color='#dcebf1',align:CanvasTextAlign='left'){
  const c=this.c;c.font='12px system-ui';c.textAlign=align;c.fillStyle='#102339dd';const width=c.measureText(text).width;c.fillRect(align==='right'?x-width-5:x-5,y-15,width+10,21);c.fillStyle=color;c.fillText(text,x,y);
 }
 draw(state:Settings,labels=true,mechanism:MechanismFrame|null=null){
  if(this.disposed||state.view!=='layers')return;this.state={...state};this.labels=labels;this.mechanism=mechanism;
  const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
  this.w=w;this.h=h;const dpr=Math.min(devicePixelRatio||1,2);
  if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
  const c=this.c,f=journeyFrame(state.journey);this.scale=Math.min(w,h)/(2*f.halfSpan);this.cy=f.centerY;
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#070f20');sky.addColorStop(1,'#142e43');c.fillStyle=sky;c.fillRect(0,0,w,h);
  // Fixed background stars fade below the high atmosphere; no per-frame random population.
  const starAlpha=f.phase!=='ascent'?.6:Math.min(.7,f.height/400);
  for(let i=0;i<70;i++)this.dot(noise(i)*w,noise(i+80)*h,.5+noise(i+140)*.5,`rgba(210,226,239,${starAlpha*noise(i+200)})`);
  this.earth();this.boundaries(f.height);
  this.weather(state.journey,!mechanism ? 1 : mechanism.layer===0 ? (mechanism.step<2 ? .16 : 1) : .55);
  this.ozone(!mechanism ? 1 : mechanism.layer===1 ? 1 : .2);this.meteor(!mechanism ? 1 : mechanism.layer===2 ? .13 : .22);
  this.aurora(!mechanism ? 1 : mechanism.layer===3&&mechanism.step===2 ? 1 : .13);this.outerParticles();
  if(mechanism)this.focus(mechanism);
  const site=this.point(0,0),probe=this.point(0,f.height),top=this.point(0,1000);
  c.setLineDash([3,6]);this.line([site,top],'#f5d89a50');c.setLineDash([]);
  if(f.phase==='ascent'){this.line([site,probe],'#ffdc91',2);for(const p of [site,probe])this.line([{x:p.x-7,y:p.y},{x:p.x+7,y:p.y}],'#ffdc91',2);}
  c.strokeStyle='#ffdc91';c.lineWidth=1.5;c.strokeRect(site.x-5,site.y-5,10,10);
  this.dot(probe.x,probe.y,5,'#ffe4a2');
  if(labels){
   if(f.phase==='ascent')this.label(`${f.height.toFixed(f.height<10?1:0)} km`,probe.x+13,probe.y-8,'#ffe4ad');
   if(site.y>20&&site.y<h-20)this.label(this.text.journey.ground,site.x+13,site.y+27,'#ffe4ad');
  }
  if(f.halfSpan<4000)this.locator(f.height);
 }
 private earth(){
  const c=this.c,R=EARTH_RADIUS,scale=this.scale;
  c.save();c.translate(this.w/2,this.h/2-this.cy*scale);c.scale(scale,scale);
  const air=c.createRadialGradient(0,0,R-1,0,0,R+130);air.addColorStop(0,'#88d6ec75');air.addColorStop(.08,'#77bcd755');air.addColorStop(.3,'#4384b42b');air.addColorStop(1,'#467dab00');c.fillStyle=air;c.beginPath();c.arc(0,0,R+130,0,Math.PI*2);c.fill();
  c.beginPath();c.arc(0,0,R,0,Math.PI*2);c.clip();
  const sea=c.createLinearGradient(-R,-R,R,R);sea.addColorStop(0,'#438fa5');sea.addColorStop(.5,'#205976');sea.addColorStop(1,'#091e35');c.fillStyle=sea;c.fillRect(-R,-R,R*2,R*2);
  c.fillStyle='#658b65';c.fill(this.coast);c.fillStyle='#587e61';c.fill(this.south);
  // Coast geometry is unchanged under zoom; deliberately illustrative, not a geographic map.
  c.strokeStyle='#bfd1a688';c.lineWidth=5;c.stroke(this.coast);c.stroke(this.south);
  // The licensed far-view map dissolves into a locally authored coast while
  // the camera, marked site and sea/land sides retain their positions.
  if(scale<.9){c.globalAlpha=Math.min(1,(.9-scale)/.45);c.drawImage(this.globe,-R,-R,R*2,R*2);c.globalAlpha=1;}
  if(this.photoSurface){
   const blend=Math.max(0,Math.min(1,(scale-.35)/.3));
   c.globalAlpha=1-blend*blend*(3-2*blend);
   if(c.globalAlpha>0)c.drawImage(this.photoSurface,-R,-R,R*2,R*2);
   c.globalAlpha=1;
  }
  if(this.photoClouds){
   c.globalAlpha=Math.max(0,Math.min(1,(.9-scale)/.5));
   if(c.globalAlpha>0)c.drawImage(this.photoClouds,-R,-R,R*2,R*2);
   c.globalAlpha=1;
  }
  const shade=c.createRadialGradient(-R*.4,-R*.5,R*.2,R*.35,R*.35,R*1.7);shade.addColorStop(0,'#06111b00');shade.addColorStop(.65,'#06111b24');shade.addColorStop(1,'#010816ef');c.fillStyle=shade;c.fillRect(-R,-R,R*2,R*2);
  c.restore();
  // Local sea ripples are anchored in kilometers, never in screen coordinates.
  if(scale>2){c.save();c.globalAlpha=Math.min(1,(scale-2)/5);for(let i=0;i<18;i++){const x=-2-noise(i+175)*30,y=-.4-noise(i+185)*5;const a=this.point(x,y),b=this.point(x+1.4,y);this.line([a,b],'#afd7dd50');}c.restore();}
 }
 private boundaries(height:number){
  const c=this.c,R=EARTH_RADIUS;
  if(this.scale<.2)return;
  let lastLabelY=-Infinity;
  for(const h of layerEdges.slice(1,-1).reverse()){
   const p=this.point(0,h);if(p.y<18||p.y>this.h-18)continue;
   c.save();c.setLineDash([3,8]);c.beginPath();c.arc(this.w/2,this.h/2-this.cy*this.scale,(R+h)*this.scale,Math.PI*1.1,Math.PI*1.9);c.strokeStyle='#b8d3e536';c.lineWidth=1;c.stroke();c.restore();
   if(this.labels&&Math.abs(h-height)>3&&p.y-lastLabelY>=24){this.label(`${h} km`,this.w-12,p.y-6,'#b9d3df','right');lastLabelY=p.y;}
  }
 }
 private weather(progress:number,opacity=1){
  const c=this.c,s=this.scale;if(s<.3)return;
  c.save();c.globalAlpha=Math.min(1,s/3)*opacity;
  for(const [x,h,size] of [[-7,3,8],[5,7,6],[10,2,4]]){const p=this.point(x,h);c.drawImage(this.cloud,p.x-size*s/2,p.y-size*s*.34,size*s,size*s*.55);}
  for(let i=0;i<12;i++){const h=.3+(noise(i+123)+progress*2)%1*2.5,p=this.point(-9+noise(i+197)*4,h);this.line([p,{x:p.x-.15*s,y:p.y+.5*s}],'#b8e5f5b0',Math.min(1.5,s*.12));}
  const flow=(x:number,h:number,dx:number,dh:number,color:string)=>{const a=this.point(x,h),b=this.point(x+dx,h+dh),mid=this.point(x+dx*.25,h+dh*.7);c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(mid.x,mid.y,b.x,b.y);c.strokeStyle=color;c.lineWidth=1.5;c.stroke();const angle=Math.atan2(b.y-mid.y,b.x-mid.x);this.line([{x:b.x-Math.cos(angle-.5)*5,y:b.y-Math.sin(angle-.5)*5},b,{x:b.x-Math.cos(angle+.5)*5,y:b.y-Math.sin(angle+.5)*5}],color,1.5);};
  flow(-14,1,3,4,'#f4d19d');flow(14,7,2,-5,'#a3d6f2');flow(-4,1,6,0,'#dbe9ef');c.restore();
 }
 private ozone(opacity=1){
  const c=this.c,s=this.scale;if(s<.15)return;c.save();c.globalAlpha=Math.min(.75,s/2)*opacity;
  for(let i=0;i<15;i++){const p=this.point(-20+noise(i+120)*45,18+noise(i+424)*15);this.dot(p.x,p.y,Math.min(2,s*.6),'#d4b7ee');}
  for(const x of [-16,15]){const pts=[];for(let i=0;i<8;i++)pts.push(this.point(x+(i%2?1:-1),47-i*2.6));this.line(pts,'#d8b1f0b0',1.5);const end=pts[pts.length-1];this.dot(end.x,end.y,3,'#e9c6f7');}c.restore();
 }
 private meteor(opacity=1){
  const c=this.c,s=this.scale;if(s<.05)return;const a=this.point(-64,83),b=this.point(-14,60);
  c.save();c.globalAlpha=Math.min(1,s*2)*opacity;const g=c.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,'#ffd6aa00');g.addColorStop(.5,'#ffd8b733');g.addColorStop(1,'#fff0cbe6');
  const angle=Math.atan2(b.y-a.y,b.x-a.x),width=Math.min(3,s*.9);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x-Math.sin(angle)*width,b.y+Math.cos(angle)*width);c.lineTo(b.x+Math.sin(angle)*width,b.y-Math.cos(angle)*width);c.closePath();c.fillStyle=g;c.fill();
  const glow=c.createRadialGradient(b.x,b.y,0,b.x,b.y,12);glow.addColorStop(0,'#ffe7b9a0');glow.addColorStop(1,'#ffcb8d00');this.disk(b.x,b.y,12,glow);this.dot(b.x,b.y,Math.min(2.5,s*1.2),'#fff4d9');c.restore();
 }
 private disk(x:number,y:number,r:number,color:CanvasGradient){const c=this.c;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
 private aurora(opacity=1){
  const c=this.c,s=this.scale;if(s<.06)return;c.save();c.globalAlpha=Math.min(1,(s-.06)*10)*opacity;
  for(let i=0;i<75;i++){const x=-240+i*5.5,base=145+Math.sin(i*.1)*32,a=this.point(x,base+90),b=this.point(x,base);const g=c.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,'#aaf3d400');g.addColorStop(.7,'#94eac34d');g.addColorStop(1,'#8bebbe00');this.line([a,b],g,Math.max(.6,s*1.8));}
  for(let i=0;i<3;i++){const x=-160+i*135,a=this.point(x-30,350),b=this.point(x,190);this.line([a,this.point(x-32,285),b],'#f7d49b85',1);this.dot(b.x,b.y,3,'#b6efd9');}c.restore();
 }
 private outerParticles(){
  if(this.scale<.06)return;const c=this.c;c.save();c.globalAlpha=Math.min(.85,(this.scale-.06)*8);
  for(let i=0;i<16;i++){const p=this.point((noise(i+801)-.5)*1600,600+noise(i+1001)*650);this.dot(p.x,p.y,1.5,'#c0dced');if(i%4===0)this.line([p,{x:p.x-4,y:p.y-10}],'#b1cbd67a');}c.restore();
 }
 private glow(x:number,y:number,r:number,color:string){
  const g=this.c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#ffffff00');this.disk(x,y,r,g);
 }
 private arrow(a:{x:number;y:number},b:{x:number;y:number},color:string,width=2){
  this.line([a,b],color,width);const angle=Math.atan2(b.y-a.y,b.x-a.x);
  this.line([{x:b.x-Math.cos(angle-.55)*8,y:b.y-Math.sin(angle-.55)*8},b,{x:b.x-Math.cos(angle+.55)*8,y:b.y-Math.sin(angle+.55)*8}],color,width);
 }
 /** The same radial scene carries each captioned process. These marks are
  * enlarged explanatory symbols, never a second measured altitude model. */
 private focus(frame:MechanismFrame){
  const enter=Math.min(1,frame.progress*3);
  if(frame.step>0)this.focusStep(frame.layer,frame.step-1,1,1-enter);
  this.focusStep(frame.layer,frame.step,frame.progress,frame.step===0?1:enter);
 }
 private focusStep(layer:number,step:number,progress:number,alpha:number){
  if(alpha<=0)return;
  const c=this.c,p=Math.max(0,Math.min(1,progress));c.save();c.globalAlpha=alpha;
  if(layer===0)this.focusWeather(step,p);
  else if(layer===1)this.focusOzone(step,p);
  else if(layer===2)this.focusMeteor(step,p);
  else if(layer===3)this.focusThermosphere(step,p);
  else this.focusExosphere(step,p);
  c.restore();
 }
 private focusWeather(step:number,p:number){
  const c=this.c;
  if(step===0){
   const ground=this.point(0,0),rayStart=this.point(-7,8),rayEnd=this.point(-1,1);
   this.glow(ground.x,ground.y,Math.min(130,this.scale*5),'#ffc57885');
   this.arrow(rayStart,{x:rayStart.x+(rayEnd.x-rayStart.x)*p,y:rayStart.y+(rayEnd.y-rayStart.y)*p},'#ffdea0bd',2);
   for(const x of [-2.4,0,2.4]){
    const a=this.point(x,.3),b=this.point(x,1.2+2.2*p);
    this.arrow(a,b,'#ffbd82c9',2);
   }
  }else if(step===1){
   const from=this.point(-1,1),to=this.point(0,1+4.5*p);
   this.line([from,to],'#ffe0a39c',2);this.glow(to.x,to.y,23+18*p,'#ffdc9960');
   c.beginPath();c.arc(to.x,to.y,11+10*p,0,Math.PI*2);c.strokeStyle='#ffe5bd';c.lineWidth=2;c.stroke();
   this.arrow(this.point(3,1),this.point(3,1+3*p),'#a8d9e7b8',1.5);
  }else{
   const wet=this.point(-2,5),dry=this.point(6,5);
   c.setLineDash([4,5]);this.line([this.point(-3,1),wet],'#aee2ed',2);this.line([this.point(5,1),dry],'#aee2ed86',1.5);c.setLineDash([]);
   const size=Math.min(135,Math.max(60,this.scale*5));c.globalAlpha*=Math.min(1,p*2);
   c.drawImage(this.cloud,wet.x-size/2,wet.y-size*.28,size,size*.55);
   this.glow(wet.x,wet.y,26,'#b5e6ee65');
   for(let i=0;i<5;i++){const q=this.point(-3+i*.5,4.6+noise(i+21)*.6);this.dot(q.x,q.y,2,'#e5f4f5');}
   c.beginPath();c.arc(dry.x,dry.y,8,0,Math.PI*2);c.strokeStyle='#b2d4e19c';c.lineWidth=1.5;c.stroke();
  }
 }
 private focusOzone(step:number,p:number){
  const c=this.c;
  if(step===0){
   for(const x of [-10,0,10]){
    const a=this.point(x-4,47),b=this.point(x,31+(1-p)*10);
    this.arrow(a,b,'#dcbcf3bb',2);
   }
  }else if(step===1){
   for(const x of [-10,0,10]){
    const q=this.point(x,27+noise(x+19)*7),r=10+5*Math.sin(p*Math.PI);
    this.glow(q.x,q.y,r*2,'#dfb7f47d');this.dot(q.x,q.y,3,'#e7c8f8');
    c.beginPath();c.arc(q.x,q.y,r,0,Math.PI*2);c.strokeStyle='#ebcffa';c.lineWidth=1.5;c.stroke();
    this.arrow(this.point(x-2,40),q,'#d4b4f4a8',1.5);
   }
   for(const x of [-5,5])this.arrow(this.point(x,23),this.point(x,23+4*p),'#ffd89ec9',2);
  }else{
   for(const h of [23,30,37]){
    const a=this.point(-14,h),b=this.point(-14+25*p,h+.7*Math.sin(p*Math.PI));
    this.arrow(a,b,'#c6d8efcf',2);
   }
   // A small exchange arrow keeps this from implying a sealed, motionless layer.
   this.arrow(this.point(13,21),this.point(13,23+2*p),'#a9c8dba0',1.5);
  }
 }
 private focusMeteor(step:number,p:number){
  const c=this.c,at=(t:number)=>this.point(-48+55*t,82-27*t);
  const t=step===0?.05+.25*p:step===1?.3+.42*p:.73+.22*p;
  const head=at(t),tail=at(Math.max(0,t-(step===0?.08:.2)));
  c.setLineDash(step===0?[4,6]:[]);this.line([at(0),tail],step===0?'#bcd0db95':'#f6c38a7a',step===0?1.5:2);c.setLineDash([]);
  this.line([tail,head],step===0?'#d1d9dd':step===1?'#ffdbad':'#e2c9ad7a',step===1?3:2);
  if(step===1)this.glow(head.x,head.y,25,'#ffbb72b4');
  this.dot(head.x,head.y,step===1?5:3,step===1?'#fff3d4':'#ccd6d9');
  if(step===2){
   const last=this.point(20,47);c.setLineDash([3,7]);this.line([head,last],'#d4c6b38a',1.2);c.setLineDash([]);
   this.dot(last.x,last.y,2,'#d3c6b4a0');
  }
 }
 private focusThermosphere(step:number,p:number){
  const c=this.c;
  if(step===0){
   for(const x of [-46,4,48]){
    const a=this.point(x-12,480),b=this.point(x,265),end={x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p};
    this.arrow(a,end,'#a9d9f0bb',2);this.glow(end.x,end.y,14,'#afd9ed77');
   }
  }else if(step===1){
   for(let i=0;i<6;i++){
    const x=-62+i*24+(noise(i+87)-.5)*14,h=255+noise(i+100)*90;
    const a=this.point(x,h),b=this.point(x+(-1+i%3)*18*p,h+(i%2?16:-14)*p);
    this.line([a,b],'#a9d3e58f',1.3);this.dot(b.x,b.y,3.4,'#d7f0ef');
   }
  }else{
   for(const x of [-72,-28,18,62])this.arrow(this.point(x-15,340),this.point(x,215),'#c9d9ed9e',1.5);
   for(let i=0;i<15;i++){
    const x=-78+i*11,h=152+Math.sin(i*.5+p*1.7)*18;
    const a=this.point(x,h+60+22*p),b=this.point(x,h);
    const g=c.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,'#7edbb900');g.addColorStop(.55,'#8ee8c386');g.addColorStop(1,'#acf4d000');
    this.line([a,b],g,Math.max(2,this.scale*5));
   }
  }
 }
 private focusExosphere(step:number,p:number){
  const c=this.c;
  for(let i=0;i<9;i++){
   const q=this.point((noise(i+416)-.5)*720,650+noise(i+621)*410);
   this.glow(q.x,q.y,8,'#d1e9ef53');this.dot(q.x,q.y,2.4,'#d9eaf0');
  }
  if(step===0)return;
  const a=this.point(-320,730),mid=this.point(-80,1000),b=this.point(160,755);
  c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(mid.x,mid.y,b.x,b.y);c.strokeStyle='#a4d5dfbd';c.lineWidth=2;c.setLineDash([6,7]);c.stroke();c.setLineDash([]);
  if(step===1){
   // Follow the curve actually drawn after projection, including its endpoint.
   // Projecting a separate height path would diverge under this radial camera.
   const u=1-p,q={x:u*u*a.x+2*u*p*mid.x+p*p*b.x,y:u*u*a.y+2*u*p*mid.y+p*p*b.y};
   this.glow(q.x,q.y,14,'#b7e2e989');this.dot(q.x,q.y,4,'#dceef0');
  }else{
   const from=this.point(145,735),to=this.point(300,1110),end={x:from.x+(to.x-from.x)*p,y:from.y+(to.y-from.y)*p};
   this.arrow(from,end,'#ffe0a5c9',2);this.glow(end.x,end.y,14,'#ffe5b68a');this.dot(end.x,end.y,3.5,'#ffe9c4');
   this.dot(b.x,b.y,3.5,'#dceef0');
  }
 }
 private locator(height:number){
  const c=this.c,x=45,y=this.h-48,r=24;c.save();c.fillStyle='#061421cc';c.fillRect(10,this.h-92,73,82);
  c.drawImage(this.photoSurface??this.globe,x-r,y-r,r*2,r*2);if(this.photoClouds)c.drawImage(this.photoClouds,x-r,y-r,r*2,r*2);
  const shade=c.createLinearGradient(x-r,y-r,x+r,y+r);shade.addColorStop(0,'#04132100');shade.addColorStop(1,'#041321a0');c.fillStyle=shade;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.beginPath();c.arc(x,y,r,Math.PI,Math.PI*2);c.strokeStyle='#92d1dd';c.lineWidth=1;c.stroke();const offset=height/EARTH_RADIUS*r;
  this.line([{x,y:y-r},{x,y:y-r-offset}],'#ffe1a0',1);this.dot(x,y-r-offset,2.5,'#ffe1a0');c.restore();
 }
 dispose(){this.disposed=true;this.observer.disconnect();this.cloud.width=0;this.cloud.height=0;this.globe.width=0;this.globe.height=0;if(this.photoSurface)this.photoSurface.width=0;if(this.photoClouds)this.photoClouds.width=0;this.photoSurface=this.photoClouds=null;}
}
