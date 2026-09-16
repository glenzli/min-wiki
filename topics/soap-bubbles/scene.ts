import { bubbleShape, filmThickness, filmColor, reflectedIntensity, selectedIncidence, filmOptics, filmRayGeometry } from './model.ts';
export interface SceneState{deformation:number;drainage:number;zoom:number;sample:number;angle:number;light:number}
/** Both views use the same local thickness: the enlarged section is not a second experiment. */
export class BubbleScene{
 private observer:ResizeObserver;
 private texture=document.createElement('canvas');
 private textureContext:CanvasRenderingContext2D;
 private state:SceneState={deformation:0,drainage:0,zoom:0,sample:-.75,angle:0,light:0};
 private textureKey='';
 constructor(private whole:HTMLCanvasElement,private section:HTMLCanvasElement){
  this.texture.width=this.texture.height=320;
  this.textureContext=this.texture.getContext('2d')!;
  this.observer=new ResizeObserver(()=>this.draw(this.state));
  this.observer.observe(whole);this.observer.observe(section);
 }
 private begin(canvas:HTMLCanvasElement){
  const dpr=Math.min(devicePixelRatio||1,2),width=canvas.clientWidth,height=canvas.clientHeight;
  if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
  const c=canvas.getContext('2d')!;c.setTransform(dpr*width/480,0,0,dpr*height/480,0,0);c.clearRect(0,0,480,480);return c;
 }
 private makeTexture(drainage:number,angle:number){
  const key=`${drainage.toFixed(3)}|${angle.toFixed(3)}`;if(key===this.textureKey)return;this.textureKey=key;
  const size=320,pixels=this.textureContext.createImageData(size,size);
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){
   const x=(i+.5)/size*2-1,y=(j+.5)/size*2-1,r2=x*x+y*y;if(r2>=1)continue;
   const z=Math.sqrt(1-r2),edge=Math.pow(r2,3);
   // Small deterministic thickness undulations suggest moving liquid, not painted dye.
   const wave=14*Math.sin(y*15+x*5+drainage*3)*Math.sin(x*8)*(1-y*y)*drainage;
   const thickness=filmThickness(y,drainage)+wave;
   const cosine=Math.max(.1,z*Math.cos(angle)+x*Math.sin(angle));
   const colors=filmColor(thickness,cosine),idx=(j*size+i)*4;
   const brightness=.6+.4*z;
   pixels.data[idx]=32+colors[0]!*192*brightness;
   pixels.data[idx+1]=49+colors[1]!*184*brightness;
   pixels.data[idx+2]=64+colors[2]!*178*brightness;
   pixels.data[idx+3]=(0.34+.34*edge)*255;
  }
  this.textureContext.putImageData(pixels,0,0);
 }
 draw(state:SceneState){
  this.state=state;this.makeTexture(state.drainage,state.angle);
  const c=this.begin(this.whole),shape=bubbleShape(state.deformation),r=144;
  const bg=c.createLinearGradient(0,0,0,480);bg.addColorStop(0,'#192e35');bg.addColorStop(.7,'#263e3c');bg.addColorStop(1,'#4c5650');c.fillStyle=bg;c.fillRect(0,0,480,480);
  // Soft studio light and a reflected sill give the translucent film a material context.
  const glow=c.createRadialGradient(77,62,2,77,62,315);glow.addColorStop(0,'#d0ddba2b');glow.addColorStop(1,'#acc0bb00');c.fillStyle=glow;c.fillRect(0,0,480,480);
  c.fillStyle='#82957e10';c.beginPath();c.ellipse(404,326,100,190,-.3,0,Math.PI*2);c.fill();
  c.save();c.translate(240,244);const zoom=1+state.zoom*2.6;c.scale(zoom,zoom);c.translate(0,-state.sample*r*shape.b*state.zoom);
  c.save();c.scale(shape.a,shape.b);
  c.drawImage(this.texture,-r,-r,r*2,r*2);
  const rim=c.createLinearGradient(-r,-r,r,r);rim.addColorStop(0,'#f3f4d1b5');rim.addColorStop(.28,'#a4cbd453');rim.addColorStop(.57,'#e9bdda94');rim.addColorStop(.81,'#a8d2b381');rim.addColorStop(1,'#f9d497b0');
  c.strokeStyle=rim;c.lineWidth=1.35;c.beginPath();c.arc(0,0,r-.6,0,Math.PI*2);c.stroke();
  c.save();c.beginPath();c.arc(0,0,r-1,0,Math.PI*2);c.clip();
  c.strokeStyle='#fbf8e8ce';c.lineWidth=5;c.lineCap='round';c.beginPath();c.ellipse(-17,-15,106,114,-.25,3.62,4.7);c.stroke();
  c.strokeStyle='#d9e9dc59';c.lineWidth=2;c.beginPath();c.ellipse(-8,-6,129,125,-.18,.12,1.4);c.stroke();
  const sill=c.createLinearGradient(0,76,0,137);sill.addColorStop(0,'#faf8d600');sill.addColorStop(.55,'#faf8d62b');sill.addColorStop(1,'#faf8d600');c.fillStyle=sill;c.beginPath();c.ellipse(0,105,135,15,0,0,Math.PI*2);c.fill();
  c.restore();c.restore();
  // The marker stays on the same piece of film during the camera move.
  const sy=state.sample*r*shape.b;
  c.strokeStyle='#f4dda0';c.lineWidth=1.3/Math.sqrt(zoom);c.setLineDash([3/zoom,3/zoom]);c.beginPath();c.ellipse(0,sy,17,10,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
  if(state.zoom<.5){c.strokeStyle='#f1dda29e';c.lineWidth=1;c.beginPath();c.moveTo(17,sy);c.lineTo(56,sy-15);c.lineTo(83,sy-15);c.stroke();}
  c.restore();
  // Top/bottom liquid-flow cues are attached to the surface and only appear during drainage.
  if(state.drainage>.02&&state.zoom<.5){c.save();c.globalAlpha=state.drainage*(1-state.zoom*2)*.58;c.strokeStyle='#d7ede5';c.lineWidth=1.4;for(const side of [-1,1]){c.beginPath();c.moveTo(240+side*122*shape.a,212);c.quadraticCurveTo(240+side*135*shape.a,251,240+side*115*shape.a,283);c.stroke();c.beginPath();c.moveTo(240+side*115*shape.a-4,276);c.lineTo(240+side*115*shape.a,283);c.lineTo(240+side*115*shape.a+5,278);c.stroke();}c.restore();}
  this.drawSection(state);
 }
 private drawSection(state:SceneState){
  const c=this.begin(this.section),thickness=filmThickness(state.sample,state.drainage),cosine=selectedIncidence(state.sample,state.angle),height=45+thickness/800*92,top=240-height/2,bottom=240+height/2;
  const bg=c.createLinearGradient(0,0,0,480);bg.addColorStop(0,'#f5f1e4');bg.addColorStop(1,'#e6eee7');c.fillStyle=bg;c.fillRect(0,0,480,480);
  // The water-rich interior is bounded by two surfactant-covered interfaces.
  const water=c.createLinearGradient(0,top,0,bottom);water.addColorStop(0,'#91bac09a');water.addColorStop(.45,'#d6e9de');water.addColorStop(1,'#80aeb899');c.fillStyle=water;c.fillRect(35,top,410,height);
  c.strokeStyle='#547f81';c.lineWidth=1.3;for(const y of [top,bottom]){c.beginPath();c.moveTo(35,y);c.lineTo(445,y);c.stroke();}
  for(let i=0;i<22;i++)for(const side of [-1,1]){
   const x=42+i*19.2,y=side<0?top:bottom;
   c.strokeStyle='#a88d64';c.lineWidth=1.6;c.beginPath();c.moveTo(x,y+side*3);c.lineTo(x-2,y+side*11);c.lineTo(x+1,y+side*18);c.stroke();
   c.fillStyle='#557e7e';c.beginPath();c.arc(x,y,3.7,0,Math.PI*2);c.fill();
  }
  for(let i=0;i<52;i++){
   const x=44+(i*47)%386,y=top+12+((i*31)%101)/101*(height-24);
   c.fillStyle='#638f9845';c.beginPath();c.arc(x,y,1.7,0,Math.PI*2);c.fill();
  }
  // Both outgoing rays are parallel; reflection and refraction share the optical
  // incidence used for this patch's color. Swatches summarize interference separately.
  const optics=filmOptics(cosine),half=height*optics.transmittedSine/optics.transmittedCosine;
  const entry=240-half,length=Math.min(140,(215-half)/Math.max(.001,optics.sine));
  const geometry=filmRayGeometry(height,cosine,length);
  const project=(points:number[][])=>points.map(([x,y])=>[entry+x!,top+y!]);
  const ray=(points:number[][],color:string,width:number)=>{c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0]!,p[1]!):c.moveTo(p[0]!,p[1]!));c.stroke();};
  const appear=state.light;
  if(appear>0){c.save();c.globalAlpha=appear;
   ray(project(geometry.incident),'#d0aa58',3);
   ray(project(geometry.reflected),'#ba9c62',2.5);
   ray(project([...geometry.internal,...geometry.emerging.slice(1)]),'#6f989a',2.5);
   c.setLineDash([4,5]);ray([[entry,top],[entry,top-48]],'#99aaa4',1);c.setLineDash([]);
   c.fillStyle='#faf7eae8';c.strokeStyle='#cdcaba';c.lineWidth=1;c.beginPath();c.roundRect(282,47,155,66,12);c.fill();c.stroke();
   for(let channel=0;channel<3;channel++){
    const wave=[610,540,460][channel]!,intensity=reflectedIntensity(thickness,wave,cosine);
    c.fillStyle=['#af6555','#789065','#668ba4'][channel]!;c.globalAlpha=appear*(.12+.88*intensity);c.fillRect(298+channel*41,63,29,32);
   }c.restore();
  }
  // A physical thickness bracket, separate from the hugely enlarged display width.
  c.strokeStyle='#a77e4c';c.lineWidth=1.4;c.beginPath();c.moveTo(19,top);c.lineTo(19,bottom);c.moveTo(13,top);c.lineTo(25,top);c.moveTo(13,bottom);c.lineTo(25,bottom);c.stroke();
  c.strokeStyle='#a5bcb299';c.lineWidth=1;c.beginPath();c.moveTo(45,365);c.lineTo(435,365);c.stroke();
  // An expanded comparison of the two wave contributions; its scale is explanatory.
  if(appear>.01){const wavelength=540,phase=4*Math.PI*1.333*thickness*optics.transmittedCosine/wavelength;
   for(let line=0;line<2;line++){const points=Array.from({length:101},(_,i)=>[52+i*3.76,405+Math.sin(i*.19+(line?phase+Math.PI:0))*10]);c.save();c.globalAlpha=appear*.82;ray(points,line?'#6f999d':'#be9a60',1.8);c.restore();}
  }
 }
 dispose(){this.observer.disconnect();}
}
