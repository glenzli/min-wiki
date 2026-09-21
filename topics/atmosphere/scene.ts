import { EARTH_RADIUS, journeyFrame, layerEdges, radialPoint, type Settings } from './model.ts';
import type content from './content.json';

type Text=typeof content.zh;
const noise=(i:number)=>{const n=Math.sin(i*127.1+91.7)*43758.5453;return n-Math.floor(n);};
/** One retained globe, coast, radial path and feature population under one camera.
 * Orthographic side observation, not a first-person flight or a weather forecast. */
export class AtmosphereScene {
 private c:CanvasRenderingContext2D;
 private observer:ResizeObserver;
 private state?:Settings;
 private labels=true;
 private disposed=false;
 private w=1;private h=1;private scale=1;private cy=0;
 private cloud:HTMLCanvasElement;
 private globe:HTMLCanvasElement;
 private coast=new Path2D('M0 -6500 C0 -6400 0 -6350 5 -6320 L90 -6070 310 -5920 270 -5730 580 -5590 730 -5270 570 -5010 780 -4780 1050 -4690 970 -4460 1260 -4200 1450 -3990 1400 -3720 1650 -3480 1490 -3250 1230 -3140 1180 -2860 1370 -2680 1320 -2380 1620 -2090 1790 -2150 1900 -1940 2240 -1830 2490 -1620 2630 -1710 2850 -1540 2990 -1260 2790 -1130 2540 -1210 2370 -950 2690 -790 3030 -880 3120 -670 3500 -570 3810 -860 4130 -760 4320 -1120 4650 -1220 4920 -1630 5300 -1740 5680 -2180 6080 -2470 6800 -2650 7000 -6500Z');
 private south=new Path2D('M-4750 -1920 L-4310 -2310 -3870 -2140 -3620 -2260 -3380 -2060 -3000 -1990 -2690 -1700 -2380 -1690 -2260 -1380 -1930 -1240 -1700 -810 -1790 -570 -1450 -310 -1280 70 -1420 430 -1700 650 -1750 1090 -2040 1390 -1900 1710 -1660 1910 -1570 2270 -1310 2390 -1110 2760 -1300 3010 -1690 3170 -1810 3510 -2150 3720 -2280 4060 -2620 4470 -2820 4700 -3090 4350 -3030 4000 -3350 3720 -3230 3370 -3510 3020 -3520 2710 -3860 2410 -3900 2100 -4200 1750 -4030 1430 -4280 980 -4170 620 -4500 370 -4440 40 -4800 -200 -4700 -570 -4980 -970 -4820 -1400Z');
 constructor(private canvas:HTMLCanvasElement,private text:Text){
  const c=canvas.getContext('2d');if(!c)throw new Error('Canvas 2D unavailable');this.c=c;
  this.cloud=this.makeCloud();this.globe=this.makeGlobe();
  this.observer=new ResizeObserver(()=>{if(this.state)this.draw(this.state,this.labels);});this.observer.observe(canvas);
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
  // Cloud banks follow broad curved fronts; each has wisps, gaps and dense cores.
  // These fixed patterns are illustrative weather, not an observed satellite map.
  const puff=(x:number,y:number,rx:number,ry:number,angle:number,alpha:number)=>{
   c.save();c.translate(x,y);c.rotate(angle);c.scale(rx,ry);
   const g=c.createRadialGradient(-.15,-.2,.05,0,0,1);g.addColorStop(0,`rgba(249,252,249,${alpha})`);g.addColorStop(.48,`rgba(228,241,242,${alpha*.65})`);g.addColorStop(1,'#dcebf000');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();
  };
  for(let band=0;band<4;band++)for(let i=0;i<750;i++){
   const t=i/749,x=-6400+t*12800,y=-4700+band*2600+Math.sin(t*7+band*1.8)*650;
   if(noise(i+band*631)<.22)continue;
   const spread=(noise(i+band*913+330)-.5)*1050;
   puff(x,y+spread,110+noise(i+band*712)*220,55+noise(i+412)*150,Math.cos(t*7+band*1.8)*.35,.06+noise(i+151)*.18);
  }
  for(const [cx,cy,radius] of [[-2500,-2700,1450],[2100,2200,1700]])for(let arm=0;arm<2;arm++)for(let i=0;i<550;i++){
   const t=i/550,angle=t*5.2+arm*Math.PI,r=150+t*radius;
   puff(cx+Math.cos(angle)*r+(noise(i+820)-.5)*280,cy+Math.sin(angle)*r*.65+(noise(i+810)-.5)*220,90+t*180,55+noise(i+arm*890)*115,angle+Math.PI/2,(.07+noise(i+212)*.18)*(1-t*.6));
  }
  return a;
 }
 private point(x:number,height:number){const p=radialPoint(x,height);return {x:this.w/2+p.x*this.scale,y:this.h/2+(p.y-this.cy)*this.scale};}
 private line(points:{x:number;y:number}[],color:string|CanvasGradient,width=1){const c=this.c;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 private dot(x:number,y:number,r:number,color:string){const c=this.c;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
 private label(text:string,x:number,y:number,color='#dcebf1',align:CanvasTextAlign='left'){
  const c=this.c;c.font='12px system-ui';c.textAlign=align;c.fillStyle='#102339dd';const width=c.measureText(text).width;c.fillRect(align==='right'?x-width-5:x-5,y-15,width+10,21);c.fillStyle=color;c.fillText(text,x,y);
 }
 draw(state:Settings,labels=true){
  if(this.disposed||state.view!=='layers')return;this.state={...state};this.labels=labels;
  const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
  this.w=w;this.h=h;const dpr=Math.min(devicePixelRatio||1,2);
  if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
  const c=this.c,f=journeyFrame(state.journey);this.scale=Math.min(w,h)/(2*f.halfSpan);this.cy=f.centerY;
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#070f20');sky.addColorStop(1,'#142e43');c.fillStyle=sky;c.fillRect(0,0,w,h);
  // Fixed background stars fade below the high atmosphere; no per-frame random population.
  const starAlpha=f.phase!=='ascent'?.6:Math.min(.7,f.height/400);
  for(let i=0;i<70;i++)this.dot(noise(i)*w,noise(i+80)*h,.5+noise(i+140)*.5,`rgba(210,226,239,${starAlpha*noise(i+200)})`);
  this.earth();this.boundaries(f.height);this.weather(state.journey);this.ozone();this.meteor();this.aurora();this.outerParticles();
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
  // Cached fine relief and cloud systems share the vector coast coordinates.
  // Fade only unresolved detail during approach; the underlying coast never changes.
  if(scale<.9){c.globalAlpha=Math.min(1,(.9-scale)/.45);c.drawImage(this.globe,-R,-R,R*2,R*2);c.globalAlpha=1;}
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
 private weather(progress:number){
  const c=this.c,s=this.scale;if(s<.3)return;
  c.save();c.globalAlpha=Math.min(1,s/3);
  for(const [x,h,size] of [[-7,3,8],[5,7,6],[10,2,4]]){const p=this.point(x,h);c.drawImage(this.cloud,p.x-size*s/2,p.y-size*s*.34,size*s,size*s*.55);}
  for(let i=0;i<12;i++){const h=.3+(noise(i+123)+progress*2)%1*2.5,p=this.point(-9+noise(i+197)*4,h);this.line([p,{x:p.x-.15*s,y:p.y+.5*s}],'#b8e5f5b0',Math.min(1.5,s*.12));}
  const flow=(x:number,h:number,dx:number,dh:number,color:string)=>{const a=this.point(x,h),b=this.point(x+dx,h+dh),mid=this.point(x+dx*.25,h+dh*.7);c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(mid.x,mid.y,b.x,b.y);c.strokeStyle=color;c.lineWidth=1.5;c.stroke();const angle=Math.atan2(b.y-mid.y,b.x-mid.x);this.line([{x:b.x-Math.cos(angle-.5)*5,y:b.y-Math.sin(angle-.5)*5},b,{x:b.x-Math.cos(angle+.5)*5,y:b.y-Math.sin(angle+.5)*5}],color,1.5);};
  flow(-14,1,3,4,'#f4d19d');flow(14,7,2,-5,'#a3d6f2');flow(-4,1,6,0,'#dbe9ef');c.restore();
 }
 private ozone(){
  const c=this.c,s=this.scale;if(s<.15)return;c.save();c.globalAlpha=Math.min(.75,s/2);
  for(let i=0;i<15;i++){const p=this.point(-20+noise(i+120)*45,18+noise(i+424)*15);this.dot(p.x,p.y,Math.min(2,s*.6),'#d4b7ee');}
  for(const x of [-16,15]){const pts=[];for(let i=0;i<8;i++)pts.push(this.point(x+(i%2?1:-1),47-i*2.6));this.line(pts,'#d8b1f0b0',1.5);const end=pts[pts.length-1];this.dot(end.x,end.y,3,'#e9c6f7');}c.restore();
 }
 private meteor(){
  const c=this.c,s=this.scale;if(s<.05)return;const a=this.point(-64,83),b=this.point(-14,60);
  c.save();c.globalAlpha=Math.min(1,s*2);const g=c.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,'#ffd6aa00');g.addColorStop(.5,'#ffd8b733');g.addColorStop(1,'#fff0cbe6');
  const angle=Math.atan2(b.y-a.y,b.x-a.x),width=Math.min(3,s*.9);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x-Math.sin(angle)*width,b.y+Math.cos(angle)*width);c.lineTo(b.x+Math.sin(angle)*width,b.y-Math.cos(angle)*width);c.closePath();c.fillStyle=g;c.fill();
  const glow=c.createRadialGradient(b.x,b.y,0,b.x,b.y,12);glow.addColorStop(0,'#ffe7b9a0');glow.addColorStop(1,'#ffcb8d00');this.disk(b.x,b.y,12,glow);this.dot(b.x,b.y,Math.min(2.5,s*1.2),'#fff4d9');c.restore();
 }
 private disk(x:number,y:number,r:number,color:CanvasGradient){const c=this.c;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
 private aurora(){
  const c=this.c,s=this.scale;if(s<.06)return;c.save();c.globalAlpha=Math.min(1,(s-.06)*10);
  for(let i=0;i<75;i++){const x=-240+i*5.5,base=145+Math.sin(i*.1)*32,a=this.point(x,base+90),b=this.point(x,base);const g=c.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,'#aaf3d400');g.addColorStop(.7,'#94eac34d');g.addColorStop(1,'#8bebbe00');this.line([a,b],g,Math.max(.6,s*1.8));}
  for(let i=0;i<3;i++){const x=-160+i*135,a=this.point(x-30,350),b=this.point(x,190);this.line([a,this.point(x-32,285),b],'#f7d49b85',1);this.dot(b.x,b.y,3,'#b6efd9');}c.restore();
 }
 private outerParticles(){
  if(this.scale<.06)return;const c=this.c;c.save();c.globalAlpha=Math.min(.85,(this.scale-.06)*8);
  for(let i=0;i<16;i++){const p=this.point((noise(i+801)-.5)*1600,600+noise(i+1001)*650);this.dot(p.x,p.y,1.5,'#c0dced');if(i%4===0)this.line([p,{x:p.x-4,y:p.y-10}],'#b1cbd67a');}c.restore();
 }
 private locator(height:number){
  const c=this.c,x=45,y=this.h-48,r=24;c.save();c.fillStyle='#061421cc';c.fillRect(10,this.h-92,73,82);
  c.drawImage(this.globe,x-r,y-r,r*2,r*2);const shade=c.createLinearGradient(x-r,y-r,x+r,y+r);shade.addColorStop(0,'#04132100');shade.addColorStop(1,'#041321a0');c.fillStyle=shade;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.beginPath();c.arc(x,y,r,Math.PI,Math.PI*2);c.strokeStyle='#92d1dd';c.lineWidth=1;c.stroke();const offset=height/EARTH_RADIUS*r;
  this.line([{x,y:y-r},{x,y:y-r-offset}],'#ffe1a0',1);this.dot(x,y-r-offset,2.5,'#ffe1a0');c.restore();
 }
 dispose(){this.disposed=true;this.observer.disconnect();this.cloud.width=0;this.cloud.height=0;this.globe.width=0;this.globe.height=0;}
}
