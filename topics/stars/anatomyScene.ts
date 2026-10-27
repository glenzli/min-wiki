import content from './anatomyContent.json';
import {StellarSurface} from './stellarSurface.ts';
import {ANATOMY_SURFACE_ROTATION,SOLAR_PATCH,SOLAR_SECTION,solarActiveRegion,solarConvectionCells,solarFlare,solarRadiationPaths,solarTransferPosition,type SolarPoint} from './solarMechanisms.ts';
type Text=(value:{zh:string;en:string})=>string;
const hash=(n:number)=>{const x=Math.sin(n*127.13+8.37)*43758.5453;return x-Math.floor(x);};
let granulation:{canvas:HTMLCanvasElement;phase:number}|undefined;
function granulePatch(time:number){
 const width=430,height=120,cell=11,phase=Math.floor(time*4)/4;
 if(!granulation){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;granulation={canvas,phase:NaN};}
 if(granulation.phase===phase)return granulation.canvas;
 granulation.phase=phase;const ctx=granulation.canvas.getContext('2d')!,image=ctx.createImageData(width,height),pixels=image.data;
 const columns=Math.ceil(width/cell)+3,rows=Math.ceil(height/cell)+3,centersX=new Float32Array(columns*rows),centersY=new Float32Array(columns*rows),tones=new Float32Array(columns*rows);
 for(let gy=-1;gy<rows-1;gy++)for(let gx=-1;gx<columns-1;gx++){const index=(gy+1)*columns+gx+1,seed=(gx+29)*73+(gy+19)*137;
  centersX[index]=(gx+.5+(hash(seed)-.5)*.88)*cell+.8*Math.sin(phase*.31+seed);
  centersY[index]=(gy+.5+(hash(seed+11)-.5)*.88)*cell+.8*Math.sin(phase*.27+seed*.7);
  tones[index]=(hash(seed+77)-.5)*.08;}
 for(let py=0;py<height;py++)for(let px=0;px<width;px++){
  const gx=Math.floor(px/cell),gy=Math.floor(py/cell),wx=px+1.7*Math.sin(py*.16+phase*.17),wy=py+1.5*Math.sin(px*.14-phase*.12);let nearest=Infinity,next=Infinity,nearestIndex=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const index=(gy+dy+1)*columns+gx+dx+1,ox=wx-centersX[index]!,oy=wy-centersY[index]!,d=ox*ox+oy*oy;if(d<nearest){next=nearest;nearest=d;nearestIndex=index;}else if(d<next)next=d;}
  const lane=Math.max(0,Math.min(1,(next-nearest)/32)),brightness=lane*lane*(3-2*lane),fine=.035*Math.sin(px*.87+py*.21)*Math.sin(py*1.03-px*.18),heat=.64+.3*brightness+tones[nearestIndex]!+fine,o=(py*width+px)*4;
  pixels[o]=178+70*heat;pixels[o+1]=72+112*heat;pixels[o+2]=25+72*heat;pixels[o+3]=230*Math.exp(-py/50);
 }
 ctx.putImageData(image,0,0);return granulation.canvas;
}
export function disposeAnatomyTexture(){granulation=undefined;}
function path(c:CanvasRenderingContext2D,points:readonly SolarPoint[],color:string,width=1.8){
 c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach((point,index)=>index?c.lineTo(point.x,point.y):c.moveTo(point.x,point.y));c.stroke();
}
function arrow(c:CanvasRenderingContext2D,from:SolarPoint,to:SolarPoint,color:string){
 const angle=Math.atan2(to.y-from.y,to.x-from.x);c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(from.x,from.y);c.lineTo(to.x,to.y);c.moveTo(to.x-7*Math.cos(angle-.45),to.y-7*Math.sin(angle-.45));c.lineTo(to.x,to.y);c.lineTo(to.x-7*Math.cos(angle+.45),to.y-7*Math.sin(angle+.45));c.stroke();
}
function along(points:readonly SolarPoint[],fraction:number){const at=Math.min(points.length-1.001,Math.max(0,fraction)*(points.length-1)),index=Math.floor(at),a=points[index]!,b=points[index+1]!;return {x:a.x+(b.x-a.x)*(at-index),y:a.y+(b.y-a.y)*(at-index)};}
function drawTransfer(c:CanvasRenderingContext2D,time:number,emphasis:boolean){
 c.save();c.globalAlpha=emphasis?1:.43;
 solarRadiationPaths().forEach((points,index)=>{path(c,points,'#ffe5a37d',1.6);for(const node of points){c.fillStyle='#f3d49b9c';c.beginPath();c.arc(node.x,node.y,1.7,0,Math.PI*2);c.fill();}const p=along(points,solarTransferPosition(time,index));c.fillStyle='#fff2bb';c.beginPath();c.arc(p.x,p.y,3.4,0,Math.PI*2);c.fill();});
 solarConvectionCells().forEach((points,index)=>{const up=points.slice(0,17),down=points.slice(16);path(c,up,'#f5ab73');path(c,down,'#84cbe7');arrow(c,points[9]!,points[11]!,'#ffd2a2');arrow(c,points[25]!,points[27]!,'#a8def1');const p=along(points,solarTransferPosition(time,index));c.fillStyle=solarTransferPosition(time,index)<.5?'#ffd2a2':'#a8def1';c.beginPath();c.arc(p.x,p.y,2.8,0,Math.PI*2);c.fill();});c.restore();
}
function drawPatchConvection(c:CanvasRenderingContext2D,top:(x:number)=>number,time:number){
 for(const [index,x]of [633,778,923].entries()){
  const y=top(x),up=[{x:x-21,y:y+101},{x:x-29,y:y+68},{x:x-20,y:y+34},{x:x-7,y:y+8}],down=[{x:x+18,y:y+8},{x:x+38,y:y+35},{x:x+43,y:y+72},{x:x+21,y:y+101}];
  path(c,up,'#f3b17c',2.2);path(c,down,'#92cce5',2.2);path(c,[up[0]!,down[3]!],'#bca79b8c',1);
  arrow(c,up[2]!,up[3]!,'#ffcca0');arrow(c,down[1]!,down[2]!,'#a6daee');
  const progress=solarTransferPosition(time,index),p=progress<.5?along(up,progress*2):along(down,(progress-.5)*2);c.fillStyle=progress<.5?'#ffe0a6':'#a9def3';c.beginPath();c.arc(p.x,p.y,3.5,0,Math.PI*2);c.fill();
  c.fillStyle='#ffe5a68a';c.beginPath();c.ellipse(x-7,top(x-7)+5,10,3,0,0,Math.PI*2);c.fill();c.fillStyle='#67394eaa';c.beginPath();c.ellipse(x+18,top(x+18)+6,3,5,0,0,Math.PI*2);c.fill();
 }
}
/** Two linked mechanism sketches: solar cutaway and enlarged photosphere/corona patch. */
export function drawAnatomy(c:CanvasRenderingContext2D,focus:number,time:number,text:Text,surface:StellarSurface,minFont:number,flareTime=0){
 const u=content.ui,font=Math.max(16,minFont),label=(value:string,x:number,y:number,color='#dbe7ec',max=360)=>{c.font=`500 ${font}px system-ui`;c.textAlign='center';c.fillStyle=color;c.fillText(value,x,y,max);};
 label(text(u.section),265,42,'#b8cbd6',440);label(text(u.surface),782,42,'#b8cbd6',450);
 c.strokeStyle='#466073';c.beginPath();c.moveTo(526,50);c.lineTo(526,518);c.stroke();
 surface.draw(c,SOLAR_SECTION.x,SOLAR_SECTION.y,SOLAR_SECTION.radius,'#ffe1a8',time,0,focus===3||focus===4?1:0,'solar',1,1,ANATOMY_SURFACE_ROTATION);
 c.save();c.beginPath();c.rect(264,82,188,392);c.clip();
 for(const [r,color]of [[SOLAR_SECTION.radius,'#bb714fdc'],[SOLAR_SECTION.radiativeRadius,'#e3ad67'],[SOLAR_SECTION.coreRadius,'#ffdb8a']] as const){c.fillStyle=color;c.beginPath();c.arc(SOLAR_SECTION.x,SOLAR_SECTION.y,r,0,Math.PI*2);c.fill();}
 if(focus===0){const glow=c.createRadialGradient(264,277,0,264,277,52);glow.addColorStop(0,'#ffffff');glow.addColorStop(1,'#ffe79800');c.fillStyle=glow;c.beginPath();c.arc(264,277,52,0,Math.PI*2);c.fill();}
 c.restore();c.strokeStyle='#d8e1e1';c.lineWidth=1.3;c.beginPath();c.moveTo(264,91);c.lineTo(264,463);c.stroke();
 for(const [radius,color,active]of [[SOLAR_SECTION.coreRadius,'#fff1ae',focus===0],[SOLAR_SECTION.radiativeRadius,'#f4c080',focus===1],[SOLAR_SECTION.radius,'#f4a17d',focus===1||focus===2]] as const){c.strokeStyle=color;c.globalAlpha=active?1:.35;c.lineWidth=active?3:1;c.beginPath();c.arc(SOLAR_SECTION.x,SOLAR_SECTION.y,radius,-Math.PI/2,Math.PI/2);c.stroke();}c.globalAlpha=1;
 if(focus<=2)drawTransfer(c,time,focus===1);
 // Draw layer names above the transfer keys, with a dark text halo on the
 // warm cut face. The mechanism legend remains below the solar outline.
 for(const [value,x,y,color,max]of [[text(u.core),360,265,'#fff5cb',150],[text(u.radiative),363,334,'#f4d4a8',190],[text(u.convective),374,418,'#f5c2a1',220]] as const){
  c.save();c.font=`500 ${font}px system-ui`;c.textAlign='center';c.strokeStyle='#18212be8';c.lineWidth=5;c.lineJoin='round';c.strokeText(value,x,y,max);label(value,x,y,color,max);c.restore();
 }
 // The marker encloses the same spherical spot pair used by the local view.
 // The held orientation keeps A on the visible hemisphere while detail evolves.
 const region=solarActiveRegion();
 c.save();c.lineJoin='round';
 for(const [color,width]of [['#091320',7],['#fff4cb',2.5]] as const){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(region.whole.x,region.whole.y,region.radius,0,Math.PI*2);c.stroke();}
 const connector=[{x:region.whole.x-region.radius,y:region.whole.y},{x:50,y:region.whole.y},{x:50,y:85},{x:540,y:85},{x:563,y:103}];
 path(c,connector,'#091320',5);c.setLineDash([5,5]);path(c,connector,'#dce9ed',1.8);c.setLineDash([]);
 // A is outside the solar limb, rather than pale lettering on the photosphere.
 c.fillStyle='#091320';c.strokeStyle='#dce9ed';c.lineWidth=1.5;c.beginPath();c.roundRect(32,region.whole.y-16,36,32,5);c.fill();c.stroke();
 label(region.id,50,region.whole.y+font*.35,'#fff4cb',28);c.restore();
 // One selected solar region is enlarged into a layered photosphere/chromosphere view.
 // Fixed seeds retain cell and footpoint identity; the separate clock only moves them slowly.
 const {x:x0,width:w,surface:ySurface}=SOLAR_PATCH,top=(x:number)=>ySurface+3.6*Math.sin((x-x0)*.061+time*.23)+1.4*Math.sin((x-x0)*.17-1.1);
 c.save();c.beginPath();c.rect(x0,95,w,362);c.clip();
 const sky=c.createLinearGradient(0,95,0,390);sky.addColorStop(0,'#071627');sky.addColorStop(.65,'#292437');sky.addColorStop(1,'#8a4546');c.fillStyle=sky;c.fillRect(x0,95,w,362);
 // Diffuse coronal strands stay behind the visible surface and magnetic arcs.
 if(focus>=4)for(let i=0;i<24;i++){const x=x0+12+i*18+hash(i+80)*9,y=top(x);c.strokeStyle=`rgba(161,199,212,${focus===5?.12:.035})`;c.lineWidth=1+hash(i+90)*2;c.beginPath();c.moveTo(x,y-12);c.bezierCurveTo(x+14,265,x-17,190,x+30*Math.sin(i*2.4),111);c.stroke();}
 const plasma=c.createLinearGradient(0,ySurface,0,456);plasma.addColorStop(0,'#ffbd64');plasma.addColorStop(.43,'#b65439');plasma.addColorStop(1,'#48243a');c.fillStyle=plasma;c.beginPath();c.moveTo(x0,top(x0));for(let x=x0+3;x<=x0+w;x+=3)c.lineTo(x,top(x));c.lineTo(x0+w,457);c.lineTo(x0,457);c.closePath();c.fill();
 c.save();c.beginPath();c.moveTo(x0,top(x0));for(let x=x0+3;x<=x0+w;x+=3)c.lineTo(x,top(x));c.lineTo(x0+w,457);c.lineTo(x0,457);c.closePath();c.clip();c.globalAlpha=focus===2?1:focus>=3?.72:.28;c.drawImage(granulePatch(time),x0,ySurface-5);c.restore();
 if(focus<=2)drawPatchConvection(c,top,time);
 // Uneven, thin chromosphere with many narrow jets rather than a solid horizon.
 c.strokeStyle='#ffd194';c.lineWidth=1.3;c.beginPath();c.moveTo(x0,top(x0));for(let x=x0+3;x<=x0+w;x+=3)c.lineTo(x,top(x));c.stroke();
 if(focus>=2){c.save();c.globalAlpha=focus===2?1:focus===5?.72:.42;for(let i=0;i<69;i++){const x=x0+4+i*6.25,y=top(x),height=8+hash(i+174)*32,bend=4*Math.sin(time*.28+i*1.9);
  c.strokeStyle=i%5===0?'#ffd7a8b0':'#efa67870';c.lineWidth=.7+hash(i+115)*.9;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+bend*.5,y-height*.6,x+bend,y-height);c.stroke();}c.restore();}
 const spots=region.spots.map(spot=>({x:spot.local.x,y:top(spot.local.x)+spot.local.y*.18,radius:spot.radius}));
 if(focus===3||focus===4){
  for(const {x,y,radius:r}of spots){const penumbra=c.createRadialGradient(x,y,2,x,y,r);penumbra.addColorStop(0,'#211c2b');penumbra.addColorStop(.4,'#342433');penumbra.addColorStop(.7,'#6a3b40');penumbra.addColorStop(1,'#dc875600');c.fillStyle=penumbra;c.beginPath();c.ellipse(x,y+5,r*1.05,r*.72,0,0,Math.PI*2);c.fill();
   c.strokeStyle='#ebaa78a8';c.lineWidth=1;for(let i=0;i<18;i++){const a=i*Math.PI/9,inner=r*(.4+hash(i+Math.round(x))*.1),outer=r*(.7+hash(i+Math.round(x)+11)*.2);c.beginPath();c.moveTo(x+Math.cos(a)*inner,y+5+Math.sin(a)*inner*.65);c.lineTo(x+Math.cos(a)*outer,y+5+Math.sin(a)*outer*.65);c.stroke();}
  }
  const flare=solarFlare(focus===4?flareTime:0),feet=spots.map(spot=>[-1,1].map(side=>({x:spot.x+side*spot.radius*.22,y:spot.y-3})));
  const field=(after:boolean,opacity:number)=>{if(opacity<=.001)return;c.save();c.globalAlpha=opacity;c.strokeStyle=after?'#add5e7':'#f2c395';c.lineWidth=2;
   for(const [i,end]of (after?flare.afterConnections:flare.beforeConnections)){const a=feet[0]![i]!,b=feet[1]![end]!;c.beginPath();c.moveTo(a.x,a.y);
    if(after)c.bezierCurveTo(a.x+10,i?115:270,b.x-10,i?115:270,b.x,b.y);
    else c.bezierCurveTo(a.x+(i?102:14),i?290:112,b.x-(i?14:102),i?112:290,b.x,b.y);
    c.stroke();}
   c.restore();};
  field(false,flare.before*(.48+.25*flare.stress));field(true,flare.after*.64);
  label('+',spots[0]!.x,spots[0]!.y+12,'#ffddb3',28);label('−',spots[1]!.x,spots[1]!.y+12,'#bfdfed',28);
 }
 if(focus===4){const flare=solarFlare(flareTime),pulse=flare.release,cx=(spots[0]!.x+spots[1]!.x)/2,cy=225;
  if(flare.stage==='reconnecting'){c.strokeStyle='#fff0c9';c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,8,0,Math.PI*2);c.stroke();}
  if(pulse>.001){
  const flare=c.createRadialGradient(cx,cy,2,cx,cy,55);flare.addColorStop(0,`rgba(255,250,217,${pulse})`);flare.addColorStop(.2,`rgba(255,213,140,${pulse*.75})`);flare.addColorStop(1,'#ffbb7700');c.fillStyle=flare;c.beginPath();c.arc(cx,cy,55,0,Math.PI*2);c.fill();
  c.strokeStyle=`rgba(255,236,182,${pulse*.9})`;c.lineWidth=2.5;for(let i=0;i<9;i++){const a=i*Math.PI*2/9;c.beginPath();c.moveTo(cx+Math.cos(a)*9,cy+Math.sin(a)*9);c.lineTo(cx+Math.cos(a)*(19+hash(i+501)*17),cy+Math.sin(a)*(19+hash(i+501)*17));c.stroke();}}
 }
 if(focus===5){for(let i=0;i<72;i++){const x=x0+hash(i+119)*w,travel=(hash(i+521)+time*(.028+.014*hash(i+79)))%1,y=top(x)-travel*242;
   c.strokeStyle=i%4===0?'#ffdfa9b8':'#a8d5e2a0';c.lineWidth=1+hash(i+43);c.beginPath();c.moveTo(x,y+2+travel*4);c.lineTo(x+3*Math.sin(i*2.2),y-3-travel*7);c.stroke();}}
 c.restore();
 label(text(u.photosphere),780,481,'#f4c597',400);
 label(text(u.selectedRegion),265,496,'#e6d4ad',480);
 if(focus<=2){label(text(u.radiationKey),265,529,'#ffe4ac',480);label(text(u.convectionKey),780,529,'#c8dde5',480);}
 if(focus===3||focus===4)label(text(u.fieldKey),780,529,'#c8dde5',480);
 if(focus===3)label(text(u.spot),780,118,'#e1c8b9',390);
 if(focus===4)label(text(u.flare),780,118,'#ffe4ad',390);
 if(focus===5)label(text(u.wind),780,118,'#bddbe1',420);
 if(focus===0||focus===1)label(text(u.energy),780,118,'#dce7ed',400);
 if(focus===2)label(text(u.photosphere),780,118,'#e8d6be',400);
}
