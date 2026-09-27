import content from './anatomyContent.json';
import {StellarSurface} from './stellarSurface.ts';
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
/** Two linked mechanism sketches: solar cutaway and enlarged photosphere/corona patch. */
export function drawAnatomy(c:CanvasRenderingContext2D,focus:number,time:number,text:Text,surface:StellarSurface,minFont:number){
 const u=content.ui,font=Math.max(16,minFont),label=(value:string,x:number,y:number,color='#dbe7ec',max=360)=>{c.font=`500 ${font}px system-ui`;c.textAlign='center';c.fillStyle=color;c.fillText(value,x,y,max);};
 label(text(u.section),265,42,'#b8cbd6',440);label(text(u.surface),782,42,'#b8cbd6',450);
 c.strokeStyle='#466073';c.beginPath();c.moveTo(526,50);c.lineTo(526,518);c.stroke();
 surface.draw(c,264,277,186,'#ffe1a8',time,0,focus===3||focus===4?1:0);
 c.save();c.beginPath();c.rect(264,82,188,392);c.clip();
 for(const [r,color]of [[186,'#bb714fdc'],[133,'#e3ad67'],[47,'#ffdb8a']] as const){c.fillStyle=color;c.beginPath();c.arc(264,277,r,0,Math.PI*2);c.fill();}
 if(focus===0){const glow=c.createRadialGradient(264,277,0,264,277,52);glow.addColorStop(0,'#ffffff');glow.addColorStop(1,'#ffe79800');c.fillStyle=glow;c.beginPath();c.arc(264,277,52,0,Math.PI*2);c.fill();}
 c.restore();c.strokeStyle='#d8e1e1';c.lineWidth=1.3;c.beginPath();c.moveTo(264,91);c.lineTo(264,463);c.stroke();
 for(const [radius,color,active]of [[47,'#fff1ae',focus===0],[133,'#f4c080',focus===1],[186,'#f4a17d',focus===1||focus===2]] as const){c.strokeStyle=color;c.globalAlpha=active?1:.35;c.lineWidth=active?3:1;c.beginPath();c.arc(264,277,radius,-Math.PI/2,Math.PI/2);c.stroke();}c.globalAlpha=1;
 label(text(u.core),360,265,'#fff5cb',150);label(text(u.radiative),363,334,'#f4d4a8',190);label(text(u.convective),374,418,'#f5c2a1',220);
 if(focus<=2){for(let i=0;i<5;i++){const a=-.95+i*.48,r=54+i*24,x=264+Math.cos(a)*r,y=277+Math.sin(a)*r;c.strokeStyle=i<2?'#fff0ad':'#e9c29a';c.lineWidth=2;c.beginPath();c.moveTo(x-10,y+8);c.lineTo(x+9,y-8);c.stroke();c.beginPath();c.moveTo(x+9,y-8);c.lineTo(x+1,y-6);c.moveTo(x+9,y-8);c.lineTo(x+7,y);c.stroke();}}
 // The highlighted limb segment identifies the region carried into the close-up.
 c.strokeStyle='#ffe0a7';c.lineWidth=3;c.beginPath();c.arc(264,277,187,-2.08,-1.78);c.stroke();
 c.strokeStyle='#99b7c28c';c.lineWidth=1;c.setLineDash([4,6]);c.beginPath();c.moveTo(177,112);c.lineTo(201,85);c.lineTo(540,85);c.lineTo(563,103);c.stroke();c.setLineDash([]);
 // One selected solar region is enlarged into a layered photosphere/chromosphere view.
 // Fixed seeds retain cell and footpoint identity; the separate clock only moves them slowly.
 const x0=563,w=430,ySurface=338,top=(x:number)=>ySurface+3.6*Math.sin((x-x0)*.061+time*.23)+1.4*Math.sin((x-x0)*.17-1.1);
 c.save();c.beginPath();c.rect(x0,95,w,362);c.clip();
 const sky=c.createLinearGradient(0,95,0,390);sky.addColorStop(0,'#071627');sky.addColorStop(.65,'#292437');sky.addColorStop(1,'#8a4546');c.fillStyle=sky;c.fillRect(x0,95,w,362);
 // Diffuse coronal strands stay behind the visible surface and magnetic arcs.
 if(focus>=4)for(let i=0;i<24;i++){const x=x0+12+i*18+hash(i+80)*9,y=top(x);c.strokeStyle=`rgba(161,199,212,${focus===5?.12:.035})`;c.lineWidth=1+hash(i+90)*2;c.beginPath();c.moveTo(x,y-12);c.bezierCurveTo(x+14,265,x-17,190,x+30*Math.sin(i*2.4),111);c.stroke();}
 const plasma=c.createLinearGradient(0,ySurface,0,456);plasma.addColorStop(0,'#ffbd64');plasma.addColorStop(.43,'#b65439');plasma.addColorStop(1,'#48243a');c.fillStyle=plasma;c.beginPath();c.moveTo(x0,top(x0));for(let x=x0+3;x<=x0+w;x+=3)c.lineTo(x,top(x));c.lineTo(x0+w,457);c.lineTo(x0,457);c.closePath();c.fill();
 c.save();c.beginPath();c.moveTo(x0,top(x0));for(let x=x0+3;x<=x0+w;x+=3)c.lineTo(x,top(x));c.lineTo(x0+w,457);c.lineTo(x0,457);c.closePath();c.clip();c.globalAlpha=focus===2?1:focus>=3?.72:.28;c.drawImage(granulePatch(time),x0,ySurface-5);c.restore();
 // Uneven, thin chromosphere with many narrow jets rather than a solid horizon.
 c.strokeStyle='#ffd194';c.lineWidth=1.3;c.beginPath();c.moveTo(x0,top(x0));for(let x=x0+3;x<=x0+w;x+=3)c.lineTo(x,top(x));c.stroke();
 if(focus>=2){c.save();c.globalAlpha=focus===2?1:focus===5?.72:.42;for(let i=0;i<69;i++){const x=x0+4+i*6.25,y=top(x),height=8+hash(i+174)*32,bend=4*Math.sin(time*.28+i*1.9);
  c.strokeStyle=i%5===0?'#ffd7a8b0':'#efa67870';c.lineWidth=.7+hash(i+115)*.9;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+bend*.5,y-height*.6,x+bend,y-height);c.stroke();}c.restore();}
 const spotShift=Math.sin(time*.16)*9,spots:[number,number]=[682+spotShift,852+spotShift];
 if(focus===3||focus===4){
  for(const x of spots){const y=top(x)+3,penumbra=c.createRadialGradient(x,y,3,x,y,29);penumbra.addColorStop(0,'#211c2b');penumbra.addColorStop(.4,'#342433');penumbra.addColorStop(.7,'#6a3b40');penumbra.addColorStop(1,'#dc875600');c.fillStyle=penumbra;c.beginPath();c.ellipse(x,y+5,31,21,0,0,Math.PI*2);c.fill();
   c.strokeStyle='#ebaa78a8';c.lineWidth=1;for(let i=0;i<18;i++){const a=i*Math.PI/9,inner=12+hash(i+Math.round(x))*3,outer=20+hash(i+Math.round(x)+11)*6;c.beginPath();c.moveTo(x+Math.cos(a)*inner,y+5+Math.sin(a)*inner*.65);c.lineTo(x+Math.cos(a)*outer,y+5+Math.sin(a)*outer*.65);c.stroke();}
  }
  for(let i=0;i<5;i++){const offset=(i-2)*6;c.strokeStyle=`rgba(247,203,150,${.35+(i%2)*.14})`;c.lineWidth=1.5+(i%2)*.7;c.beginPath();c.moveTo(spots[0]+offset,top(spots[0])-5);c.bezierCurveTo(724+offset,171-i*8,807-offset,171-i*8,spots[1]-offset,top(spots[1])-5);c.stroke();}
 }
 if(focus===4){const pulse=.55+.45*Math.sin(time*3.2),cx=766,cy=190;
  const flare=c.createRadialGradient(cx,cy,2,cx,cy,55);flare.addColorStop(0,`rgba(255,250,217,${pulse})`);flare.addColorStop(.2,`rgba(255,213,140,${pulse*.75})`);flare.addColorStop(1,'#ffbb7700');c.fillStyle=flare;c.beginPath();c.arc(cx,cy,55,0,Math.PI*2);c.fill();
  c.strokeStyle=`rgba(255,236,182,${.75+.2*pulse})`;c.lineWidth=2.5;for(let i=0;i<9;i++){const a=i*Math.PI*2/9;c.beginPath();c.moveTo(cx+Math.cos(a)*9,cy+Math.sin(a)*9);c.lineTo(cx+Math.cos(a)*(19+hash(i+501)*17),cy+Math.sin(a)*(19+hash(i+501)*17));c.stroke();}
 }
 if(focus===5){for(let i=0;i<72;i++){const x=x0+hash(i+119)*w,travel=(hash(i+521)+time*(.028+.014*hash(i+79)))%1,y=top(x)-travel*242;
   c.strokeStyle=i%4===0?'#ffdfa9b8':'#a8d5e2a0';c.lineWidth=1+hash(i+43);c.beginPath();c.moveTo(x,y+2+travel*4);c.lineTo(x+3*Math.sin(i*2.2),y-3-travel*7);c.stroke();}}
 c.restore();
 label(text(u.photosphere),780,481,'#f4c597',400);
 if(focus===3)label(text(u.spot),780,118,'#e1c8b9',390);
 if(focus===4)label(text(u.flare),780,118,'#ffe4ad',390);
 if(focus===5)label(text(u.wind),780,118,'#bddbe1',420);
 if(focus===0||focus===1)label(text(u.energy),780,118,'#dce7ed',400);
 if(focus===2)label(text(u.photosphere),780,118,'#e8d6be',400);
}
