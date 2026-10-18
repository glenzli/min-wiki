import { EARTH_RADIUS, journeyFrame, layerEdges, radialPoint, type Settings } from './model.ts';
import type content from './content.json';
import type { MechanismFrame } from './layerMechanism.ts';
import earthDayMap from '../solar-system/assets/2k_earth_daymap.webp';
import earthCloudMap from '../solar-system/assets/2k_earth_clouds.webp';
import { AtmosphereSurface } from './surfaceScene.ts';
import { surfaceBasis, surfaceViewFrame } from './surfaceModel.ts';

type Text=typeof content.zh;
const noise=(i:number)=>{const n=Math.sin(i*127.1+91.7)*43758.5453;return n-Math.floor(n);};
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
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
 private projectionCos=1;
 private cloud:HTMLCanvasElement;
 private cloudWisps:HTMLCanvasElement;
 private localTerrain:HTMLCanvasElement;
 private terrainPaint:CanvasPattern|null=null;
 private globe:HTMLCanvasElement;
 private photoSurface:HTMLCanvasElement|null=null;
 private photoClouds:HTMLCanvasElement|null=null;
 private surface:AtmosphereSurface|null=null;
 private surfaceFrame:HTMLCanvasElement|null=null;
 private coast=new Path2D('M0 -6500 C0 -6440 -2 -6390 0 -6371 C-.7 -6368 2.6 -6367 1.1 -6364 C.4 -6361 3.6 -6358 2.1 -6354 C1.8 -6350 5.2 -6348 4.7 -6343 C4 -6338 6 -6328 5 -6320 L90 -6070 310 -5920 270 -5730 580 -5590 730 -5270 570 -5010 780 -4780 1050 -4690 970 -4460 1260 -4200 1450 -3990 1400 -3720 1650 -3480 1490 -3250 1230 -3140 1180 -2860 1370 -2680 1320 -2380 1620 -2090 1790 -2150 1900 -1940 2240 -1830 2490 -1620 2630 -1710 2850 -1540 2990 -1260 2790 -1130 2540 -1210 2370 -950 2690 -790 3030 -880 3120 -670 3500 -570 3810 -860 4130 -760 4320 -1120 4650 -1220 4920 -1630 5300 -1740 5680 -2180 6080 -2470 6800 -2650 7000 -6500Z');
 private south=new Path2D('M-4750 -1920 L-4310 -2310 -3870 -2140 -3620 -2260 -3380 -2060 -3000 -1990 -2690 -1700 -2380 -1690 -2260 -1380 -1930 -1240 -1700 -810 -1790 -570 -1450 -310 -1280 70 -1420 430 -1700 650 -1750 1090 -2040 1390 -1900 1710 -1660 1910 -1570 2270 -1310 2390 -1110 2760 -1300 3010 -1690 3170 -1810 3510 -2150 3720 -2280 4060 -2620 4470 -2820 4700 -3090 4350 -3030 4000 -3350 3720 -3230 3370 -3510 3020 -3520 2710 -3860 2410 -3900 2100 -4200 1750 -4030 1430 -4280 980 -4170 620 -4500 370 -4440 40 -4800 -200 -4700 -570 -4980 -970 -4820 -1400Z');
 constructor(private canvas:HTMLCanvasElement,private text:Text){
  const c=canvas.getContext('2d');if(!c)throw new Error('Canvas 2D unavailable');this.c=c;
  this.cloud=this.makeCloud();this.cloudWisps=this.makeCloud(true);this.globe=this.makeGlobe();this.localTerrain=this.makeLocalTerrain();
  this.terrainPaint=c.createPattern(this.localTerrain,'repeat');
  this.terrainPaint?.setTransform(new DOMMatrix([320/this.localTerrain.width,0,0,160/this.localTerrain.height,-80,-EARTH_RADIUS]));
  try{this.surface=new AtmosphereSurface(()=>{if(this.state)this.draw(this.state,this.labels,this.mechanism);});}catch{/* Canvas remains usable without WebGL. */}
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
   try{this.surface?.setMaps(day,clouds);}catch{this.surface?.dispose();this.surface=null;}
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
  const site=surfaceBasis.up,eye=surfaceBasis.eye,right=surfaceBasis.right;
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
 /** Cached, lit cloud lobes. A shared silhouette carries the shaded base and
  * small-scale billows; translucent wisps soften its edge without a blur filter. */
 private makeCloud(wisps=false){
  const a=document.createElement('canvas');a.width=768;a.height=384;const c=a.getContext('2d')!;
  if(wisps){
   for(let i=0;i<48;i++){
    const x=30+noise(i+700)*330,y=190+noise(i+720)*55,length=120+noise(i+750)*250;
    const g=c.createLinearGradient(x,y,x+length,y);g.addColorStop(0,'#dbe8e700');g.addColorStop(.28,'#dbe8e747');g.addColorStop(.65,'#f2f2e97d');g.addColorStop(1,'#f2f2e900');
    c.strokeStyle=g;c.lineWidth=.7+noise(i+800)*3.2;c.beginPath();c.moveTo(x,y);
    c.bezierCurveTo(x+length*.24,y-20,x+length*.68,y-14,x+length,y-35-noise(i+820)*25);c.stroke();
   }return a;
  }
  const lobes:Array<{x:number;y:number;rx:number;ry:number}>=[];
  for(let i=0;i<18;i++){
   const t=i/17,x=62+t*646,y=228-Math.pow(Math.sin(t*Math.PI),1.2)*(38+noise(i+34)*48);
   lobes.push({x,y,rx:30+noise(i+11)*55,ry:27+Math.sin(t*Math.PI)*45+noise(i+27)*18});
  }
  const shape=new Path2D();
  for(const q of lobes){shape.moveTo(q.x+q.rx,q.y);shape.ellipse(q.x,q.y,q.rx,q.ry,0,0,Math.PI*2);}
  // A very faint halo stays outside the body; the body itself has volume.
  for(const q of lobes){
   const g=c.createRadialGradient(q.x,q.y,0,q.x,q.y,q.rx*1.3);
   g.addColorStop(0,'#c9dce123');g.addColorStop(1,'#c9dce100');c.fillStyle=g;c.fillRect(q.x-q.rx*1.3,q.y-q.rx*1.3,q.rx*2.6,q.rx*2.6);
  }
  c.save();c.clip(shape);
  const body=c.createLinearGradient(0,105,35,282);body.addColorStop(0,'#fcfbec');body.addColorStop(.38,'#e9f0ed');body.addColorStop(.68,'#bdced5');body.addColorStop(1,'#647e90');
  c.fillStyle=body;c.fillRect(0,0,a.width,a.height);
  for(let i=0;i<135;i++){
   const q=lobes[i%lobes.length],x=q.x+(noise(i+87)-.5)*q.rx*1.5,y=q.y+(noise(i+180)-.5)*q.ry*1.4,r=10+noise(i+232)*32;
   const g=c.createRadialGradient(x-r*.28,y-r*.38,0,x,y,r);
   g.addColorStop(0,i%4===0?'#5d788c35':'#fffff38c');g.addColorStop(.52,i%4===0?'#6d8a9a18':'#f4f8ef36');g.addColorStop(1,'#e2e9e700');
   c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);
  }
  // Broken fine filaments, rather than a heavy outline around every lobe.
  c.strokeStyle='#f7faee40';c.lineWidth=1.3;
  for(let i=0;i<40;i++){const x=55+noise(i+800)*660,y=205+noise(i+850)*45;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+14,y-5,x+24+noise(i+920)*20,y-2);c.stroke();}
  c.restore();return a;
 }
 /** An authored coastal material, cached once and fixed in globe kilometers.
  * Multi-scale fields suggest relief/vegetation; none are surveyed land cover. */
 private makeLocalTerrain(){
  const a=document.createElement('canvas');a.width=1536;a.height=768;const c=a.getContext('2d')!;
  const pixels=c.createImageData(a.width,a.height),grid=new Float32Array(128*128);
  for(let i=0;i<grid.length;i++)grid[i]=noise(i+4100);
  const field=(x:number,y:number,period:number)=>{
   const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(0,1,x-ix),fy=smooth(0,1,y-iy);
   const at=(dx:number,dy:number)=>grid[((iy+dy)&(period-1))*128+((ix+dx)&(period-1))];
   return (at(0,0)*(1-fx)+at(1,0)*fx)*(1-fy)+(at(0,1)*(1-fx)+at(1,1)*fx)*fy;
  };
  const relief=(x:number,y:number)=>field(x,y,8)*.5+field(x*2,y*2,16)*.27+field(x*4,y*4,32)*.15+field(x*8,y*8,64)*.08;
  for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
   const u=x/a.width*8,v=y/a.height*8,n=relief(u,v),slope=relief(u-.025,v-.035)-n;
   const meadow=smooth(.36,.67,n),rock=smooth(.6,.8,n),light=slope*170;
   const grain=(grid[((y*71+x*31)&16383)]-.5)*4,offset=(y*a.width+x)*4;
   pixels.data[offset]=46+meadow*25+rock*32+light+grain;
   pixels.data[offset+1]=74+meadow*22+rock*14+light+grain;
   pixels.data[offset+2]=58+meadow*9+rock*11+light*.8+grain;
   pixels.data[offset+3]=255;
  }
  c.putImageData(pixels,0,0);return a;
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
  c.strokeStyle='#41a6ae55';c.lineWidth=32;c.stroke(land);c.strokeStyle='#7eb9a766';c.lineWidth=8;c.stroke(land);
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
 private point(x:number,height:number){const p=radialPoint(x,height);return {x:this.w/2+p.x*this.scale,y:this.h/2+(p.y-this.cy)*this.scale*this.projectionCos};}
 private line(points:{x:number;y:number}[],color:string|CanvasGradient,width=1){const c=this.c;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 private dot(x:number,y:number,r:number,color:string){const c=this.c;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
 private label(text:string,x:number,y:number,color='#dcebf1',align:CanvasTextAlign='left'){
  const c=this.c;c.font='13px system-ui';c.textAlign=align;c.fillStyle='#102339dd';const width=c.measureText(text).width;c.fillRect(align==='right'?x-width-5:x-5,y-17,width+10,25);c.fillStyle=color;c.fillText(text,x,y);
 }
 draw(state:Settings,labels=true,mechanism:MechanismFrame|null=null){
  if(this.disposed||state.view!=='layers')return;this.state={...state};this.labels=labels;this.mechanism=mechanism;
  const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
  this.w=w;this.h=h;const dpr=Math.min(devicePixelRatio||1,2);
  if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
  const c=this.c,f=journeyFrame(state.journey);this.scale=Math.min(w,h)/(2*f.halfSpan);this.cy=f.centerY;
  this.surfaceFrame=this.surface?.draw(state,mechanism,w,h)??null;
  this.projectionCos=this.surfaceFrame?surfaceViewFrame(state.journey,w,h).cos:1;
  this.canvas.dataset.surfaceRenderer=this.surfaceFrame?'webgl':'canvas';
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#040b16');sky.addColorStop(1,'#0c1c2e');c.fillStyle=sky;c.fillRect(0,0,w,h);
  // Fixed background stars fade below the high atmosphere; no per-frame random population.
  const starAlpha=f.phase==='ascent'?.65*smooth(65,220,f.height):.6*(1-smooth(.04,.13,state.journey));
  for(let i=0;i<70;i++)this.dot(noise(i)*w,noise(i+80)*h,.5+noise(i+140)*.5,`rgba(210,226,239,${starAlpha*noise(i+200)})`);
  this.earth();this.boundaries(f.height);
  this.weather(state.journey,!mechanism ? 1 : mechanism.layer===0 ? .4 : .55);
  this.ozone(!mechanism ? 1 : mechanism.layer===1 ? 1 : .04);this.meteor(!mechanism ? 1 : mechanism.layer===2 ? 0 : .22);
  this.aurora(!mechanism ? 1 : .13);this.outerParticles();
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
  c.save();c.translate(this.w/2,this.h/2-this.cy*scale*this.projectionCos);c.scale(scale,scale);
  const air=c.createRadialGradient(0,0,R-1,0,0,R+130);air.addColorStop(0,'#8acbdbc4');air.addColorStop(.065,'#5fa9cd9c');air.addColorStop(.18,'#337ba357');air.addColorStop(.42,'#234a711e');air.addColorStop(1,'#234a7100');c.fillStyle=air;c.beginPath();c.arc(0,0,R+130,0,Math.PI*2);c.fill();
  if(this.surfaceFrame){c.restore();c.drawImage(this.surfaceFrame,0,0,this.w,this.h);return;}
  c.beginPath();c.arc(0,0,R,0,Math.PI*2);c.clip();
  const sea=c.createLinearGradient(-R,-R,R,R);sea.addColorStop(0,'#438fa5');sea.addColorStop(.5,'#205976');sea.addColorStop(1,'#091e35');c.fillStyle=sea;c.fillRect(-R,-R,R*2,R*2);
  const close=smooth(.3,1.5,scale);
  if(close>0){
   c.save();c.globalAlpha=close;
   const shelf=c.createLinearGradient(-65,-R,5,-R);shelf.addColorStop(0,'#23516a00');shelf.addColorStop(.45,'#23556899');shelf.addColorStop(1,'#568f92d9');
   c.fillStyle=shelf;c.fillRect(-R,-R,R*2,R*2);c.restore();
  }
  c.fillStyle='#4d7158';c.fill(this.coast);c.fillStyle='#496e57';c.fill(this.south);
  // Authored local texture stays in globe coordinates as the camera passes from
  // the cached relief into the close coast. It is not surveyed topography.
  if(close>0&&this.terrainPaint){
   c.save();c.globalAlpha=close;c.clip(this.coast);
   // Periodic fields tile seamlessly in world space, so an intermediate camera
   // cannot reveal a rectangular material patch or move the detail on the land.
   c.fillStyle=this.terrainPaint;c.fillRect(-R,-R,R*2,R*2);
   c.restore();
  }
  // Coast geometry is unchanged under zoom; deliberately illustrative, not a geographic map.
  c.save();
  // Thin shallow-water and beach marks replace the former five-kilometer stripe.
  c.strokeStyle='#78a99b55';c.lineWidth=5-4.7*smooth(.12,1.4,scale);c.stroke(this.coast);c.stroke(this.south);
  if(close>0){c.globalAlpha=close;c.strokeStyle='#b4bd9866';c.lineWidth=.16;c.stroke(this.coast);}
  c.restore();
  // The licensed far-view map dissolves into a locally authored coast while
  // the camera, marked site and sea/land sides retain their positions.
  if(!this.photoSurface&&scale<.9){c.globalAlpha=Math.min(1,(.9-scale)/.45);c.drawImage(this.globe,-R,-R,R*2,R*2);c.globalAlpha=1;}
  if(this.photoSurface){
   const blend=Math.max(0,Math.min(1,(scale-.22)/.43));
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
  if(scale>2){c.save();c.globalAlpha=smooth(2,7,scale);for(let i=0;i<80;i++){
   const x=-2-noise(i+175)*58,y=-.08-noise(i+185)*10;
   const a=this.point(x,y),b=this.point(x+.12+noise(i+201)*1.4,y);
   this.line([a,b],i%3===0?'#aad7d14d':'#7fc0c32b',Math.min(1,scale*.045));
  }c.restore();}
 }
 private boundaries(height:number){
  const c=this.c,R=EARTH_RADIUS;
  if(this.scale<.2)return;
  let lastLabelY=-Infinity;
  for(const h of layerEdges.slice(1,-1).reverse()){
   const p=this.point(0,h);if(p.y<18||p.y>this.h-18)continue;
   c.save();c.setLineDash([3,8]);c.translate(this.w/2,this.h/2-this.cy*this.scale*this.projectionCos);c.scale(1,this.projectionCos);c.beginPath();c.arc(0,0,(R+h)*this.scale,Math.PI*1.1,Math.PI*1.9);c.strokeStyle='#b8d3e536';c.lineWidth=1;c.stroke();c.restore();
   if(this.labels&&Math.abs(h-height)>3&&p.y-lastLabelY>=24){this.label(`${h} km`,this.w-12,p.y-6,'#b9d3df','right');lastLabelY=p.y;}
  }
 }
 private weather(progress:number,opacity=1){
  const c=this.c,s=this.scale;if(s<.3)return;
  c.save();c.globalAlpha=smooth(.3,3,s)*opacity;
  for(const [x,h,size,thin] of [[-9,3,15,0],[6,7,18,1],[14,2,8,0]]){
   if(this.surfaceFrame&&!thin)continue;
   const p=this.point(x,h);c.drawImage(thin?this.cloudWisps:this.cloud,p.x-size*s/2,p.y-size*s*.3,size*s,size*s*.5);
  }
  // Rain belongs to this one illustrative rain bank, not to every cloud.
  for(let i=0;i<30;i++){
   const height=.15+(noise(i+123)+progress*1.1)%1*2.1,p=this.point(-13+noise(i+197)*8,height);
   this.line([p,{x:p.x-.09*s,y:p.y+.28*s}],`rgba(176,217,231,${.25+noise(i+321)*.35})`,Math.min(1,s*.065));
  }
  const flow=(x:number,h:number,dx:number,dh:number,color:string)=>{const a=this.point(x,h),b=this.point(x+dx,h+dh),mid=this.point(x+dx*.25,h+dh*.7);c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(mid.x,mid.y,b.x,b.y);c.strokeStyle=color;c.lineWidth=1.5;c.stroke();const angle=Math.atan2(b.y-mid.y,b.x-mid.x);this.line([{x:b.x-Math.cos(angle-.5)*5,y:b.y-Math.sin(angle-.5)*5},b,{x:b.x-Math.cos(angle+.5)*5,y:b.y-Math.sin(angle+.5)*5}],color,1.5);};
  flow(-14,1,3,4,'#f4d19d');flow(14,7,2,-5,'#a3d6f2');flow(-4,1,6,0,'#dbe9ef');c.restore();
 }
 private ozone(opacity=1){
  const c=this.c,s=this.scale;if(s<.15)return;c.save();c.globalAlpha=smooth(.15,2,s)*opacity*.55;
  // Enlarged false-color O3 symbols, not visible purple gas or a sealed shell.
  for(let i=0;i<11;i++){
   const p=this.point(-28+noise(i+120)*58,18+noise(i+424)*15),r=Math.min(2.3,s*.4);
   this.line([{x:p.x-r*1.3,y:p.y+r*.5},{x:p.x,y:p.y-r},{x:p.x+r*1.3,y:p.y+r*.5}],'#aebcdb77',.7);
   for(const [dx,dy]of [[-1.3,.5],[0,-1],[1.3,.5]])this.dot(p.x+dx*r,p.y+dy*r,r*.65,'#bbcae0');
  }
  c.restore();
 }
 private meteor(opacity=1){
  const c=this.c,s=this.scale;if(s<.05||opacity===0)return;const a=this.point(-48,82),b=this.point(-8.4,62.56);
  c.save();c.globalAlpha=Math.min(1,s*2)*opacity;const g=c.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,'#ffd6aa00');g.addColorStop(.5,'#ffd8b733');g.addColorStop(1,'#fff0cbe6');
  const angle=Math.atan2(b.y-a.y,b.x-a.x),width=Math.min(3,s*.9);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x-Math.sin(angle)*width,b.y+Math.cos(angle)*width);c.lineTo(b.x+Math.sin(angle)*width,b.y-Math.cos(angle)*width);c.closePath();c.fillStyle=g;c.fill();
  const glow=c.createRadialGradient(b.x,b.y,0,b.x,b.y,12);glow.addColorStop(0,'#ffe7b9a0');glow.addColorStop(1,'#ffcb8d00');this.disk(b.x,b.y,12,glow);this.dot(b.x,b.y,Math.min(2.5,s*1.2),'#fff4d9');c.restore();
 }
 private disk(x:number,y:number,r:number,color:CanvasGradient){const c=this.c;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
 private aurora(opacity=1,phase=0){
  const c=this.c,s=this.scale;if(s<.06)return;c.save();c.globalAlpha*=smooth(.06,.16,s)*opacity;
  // Fine folded curtains remain in the original ~110–270 km region; the
  // observation stop at 300 km must not drag this geometry toward the camera.
  const ridge:Array<{x:number;y:number}>=[];
  for(let i=0;i<190;i++){
   const u=i/189,x=-240+u*410,fold=Math.sin(u*10.2+phase*.5),base=143+Math.sin(u*7.5)*24+fold*7;
   const a=this.point(x+4*Math.sin(u*12),base+65+noise(i+714)*29),b=this.point(x,base),strength=(.22+Math.pow(.5+.5*Math.sin(u*23+phase),2)*.55)*smooth(0,.09,u)*(1-smooth(.9,1,u));
   const g=c.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,'#64bcbc00');g.addColorStop(.3,`rgba(86,176,157,${strength*.18})`);g.addColorStop(.83,`rgba(119,229,172,${strength})`);g.addColorStop(1,'#a9f2bc08');
   this.line([a,b],g,Math.max(.55,s*2.4));ridge.push(this.point(x,base+8));
  }
  const rim=c.createLinearGradient(ridge[0].x,ridge[0].y,ridge.at(-1)!.x,ridge.at(-1)!.y);rim.addColorStop(0,'#a5edbe00');rim.addColorStop(.12,'#a5edbe35');rim.addColorStop(.85,'#a5edbe35');rim.addColorStop(1,'#a5edbe00');
  this.line(ridge,rim,Math.max(.6,s*1.2));c.restore();
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
   c.beginPath();c.ellipse(to.x,to.y,15+14*p,11+10*p,-.15,0,Math.PI*2);c.strokeStyle='#ffe5bda8';c.lineWidth=1.5;c.stroke();
   for(let i=0;i<8;i++){
    const angle=i*Math.PI/4,q={x:to.x+Math.cos(angle)*(8+12*p),y:to.y+Math.sin(angle)*(5+8*p)};
    this.dot(q.x,q.y,1.3,'#ffe9bfab');
   }
   this.arrow(this.point(3,1),this.point(3,1+3*p),'#a8d9e7b8',1.5);
  }else{
   const wet=this.point(-2,5),dry=this.point(6,5);
   c.setLineDash([4,5]);this.line([this.point(-3,1),wet],'#aee2ed',2);this.line([this.point(5,1),dry],'#aee2ed86',1.5);c.setLineDash([]);
   const size=Math.min(180,Math.max(72,this.scale*9));c.globalAlpha*=smooth(0,.65,p);
   if(!this.surfaceFrame)c.drawImage(this.cloud,wet.x-size/2,wet.y-size*.3,size,size*.5);
   for(let i=0;i<9;i++){const q=this.point(-4+i*.45,4.6+noise(i+21)*.45);this.dot(q.x,q.y,1.1,'#e5f4f5bd');}
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
    const q=this.point(x,27+noise(x+19)*7),r=7+3*Math.sin(p*Math.PI);
    this.glow(q.x,q.y,r*2,'#d6c5ee43');
    const atoms=[{x:q.x-4,y:q.y+2},{x:q.x,y:q.y-3},{x:q.x+4,y:q.y+2}];
    this.line(atoms,'#b9b5d1',1);for(const a of atoms)this.dot(a.x,a.y,2.2,'#e1daee');
    this.arrow(this.point(x-2,40),q,'#d4b4f4a8',1.5);
    // Absorption transfers energy locally. Short non-directed agitation marks
    // avoid implying that stratospheric heating launches strong convection.
    for(let i=0;i<6;i++){
     const angle=i*Math.PI/3+p*.3,inner=12+3*p,outer=inner+4+2*Math.sin(p*Math.PI);
     this.line([{x:q.x+Math.cos(angle)*inner,y:q.y+Math.sin(angle)*inner},{x:q.x+Math.cos(angle)*outer,y:q.y+Math.sin(angle)*outer}],'#eacb92b0',1.2);
    }
   }
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
  if(step===1){
   const angle=Math.atan2(head.y-tail.y,head.x-tail.x),normal={x:-Math.sin(angle),y:Math.cos(angle)},width=2.6;
   const wake=c.createLinearGradient(tail.x,tail.y,head.x,head.y);wake.addColorStop(0,'#d7955900');wake.addColorStop(.55,'#e9b3724a');wake.addColorStop(1,'#ffe3acd9');
   c.beginPath();c.moveTo(tail.x,tail.y);c.lineTo(head.x+normal.x*width,head.y+normal.y*width);c.lineTo(head.x-normal.x*width,head.y-normal.y*width);c.closePath();c.fillStyle=wake;c.fill();
   this.glow(head.x,head.y,18,'#ffc37f83');this.line([at(Math.max(0,t-.08)),head],'#fff0c7da',1.5);
   this.dot(head.x,head.y,2.8,'#fff6d8');
   for(let i=0;i<7;i++){
    const u=(i+1)/9,q=at(t-u*.12),spread=(noise(i+977)-.5)*u*9;
    this.dot(q.x+normal.x*spread,q.y+normal.y*spread,.5+noise(i+912)*.6,`rgba(251,199,132,${(1-u)*.55})`);
   }
  }else{
   this.line([tail,head],step===0?'#bdcbd2ad':'#d0b99765',1);
   c.beginPath();for(let i=0;i<8;i++){
    const angle=i/8*Math.PI*2,r=(step===0?3.7:2)*(0.8+noise(i+441)*.3),x=head.x+Math.cos(angle)*r,y=head.y+Math.sin(angle)*r;
    if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
   }c.closePath();const rock=c.createLinearGradient(head.x-3,head.y-3,head.x+3,head.y+3);rock.addColorStop(0,'#c3c8c7');rock.addColorStop(1,'#535d63');c.fillStyle=rock;c.fill();
  }
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
   for(const x of [-112,-64,-16,32]){
    const a=this.point(x-15,340),b=this.point(x,200),head={x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p};
    c.setLineDash([2,7]);this.line([a,b],'#bbd5d64d',1);c.setLineDash([]);
    this.glow(head.x,head.y,6,'#c3e8dc68');this.dot(head.x,head.y,1.8,'#e0ecdf');
   }
   this.aurora(smooth(0,.6,p),p);
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
 dispose(){this.disposed=true;this.observer.disconnect();this.surface?.dispose();this.surface=null;this.surfaceFrame=null;this.terrainPaint=null;for(const cache of [this.cloud,this.cloudWisps,this.localTerrain,this.globe,this.photoSurface,this.photoClouds])if(cache)cache.width=cache.height=0;this.photoSurface=this.photoClouds=null;}
}
