const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const smooth=(start:number,end:number,value:number)=>{const t=clamp((value-start)/(end-start));return t*t*(3-2*t);};

/** Visual states are continuous through cloud contraction, accretion and disk dispersal. */
export function formationVisual(phase:number){
 const compression=smooth(0,1.25,phase),core=smooth(.17,1.03,phase),disk=smooth(.28,1.02,phase)*(1-smooth(1.06,1.4,phase));
 return {compression,core,disk,cloud:1-smooth(1.04,1.43,phase),jet:smooth(.5,1.1,phase)*(1-smooth(1.07,1.4,phase)),surface:smooth(1.18,1.55,phase)};
}

/** Gas dominates the cloud; dust colors trace a smaller visible component. No gas-dynamics claim is encoded by the interpolated paths. */
export function drawFormation(c:CanvasRenderingContext2D,x:number,y:number,extent:number,phase:number,time:number){
 const state=formationVisual(phase);if(phase>=2.13)return;
 const radius=extent*(1-.57*state.compression),flatten=.76-.53*state.compression;
 c.save();
 if(state.cloud>.001){
  c.save();c.translate(x,y);c.scale(1,flatten);
  const haze=c.createRadialGradient(0,0,extent*.08,0,0,radius*1.08);
  haze.addColorStop(0,`rgba(128,151,177,${state.cloud*.13})`);
  haze.addColorStop(.55,`rgba(95,130,163,${state.cloud*.19})`);
  haze.addColorStop(1,'rgba(66,111,157,0)');
  c.fillStyle=haze;c.beginPath();c.arc(0,0,radius*1.08,0,Math.PI*2);c.fill();c.restore();
 }
 // The same numbered parcels remain present as the cloud flattens toward a disk.
 for(let i=0;i<240;i++){
  const fraction=Math.sqrt((i+.5)/240),angle=i*2.399963229728653+time*.025*state.compression;
  const irregular=1+.12*Math.sin(i*1.71)+.07*Math.cos(i*.48),r=radius*fraction*irregular;
  const px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r*flatten;
  const alpha=state.cloud*(i%7===0?.34:.24),size=(i%7===0?2.1:1.3)*(extent/175)**.35;
  c.fillStyle=i%7===0?`rgba(213,171,133,${alpha})`:`rgba(121,163,190,${alpha})`;
  c.beginPath();c.arc(px,py,size,0,Math.PI*2);c.fill();
 }
 if(state.disk>.001){
  c.globalAlpha=state.disk;
  const diskRadius=extent*.77;
  const haze=c.createRadialGradient(x,y,8,x,y,diskRadius);haze.addColorStop(0,'#f6ba7860');haze.addColorStop(.35,'#a9b0b550');haze.addColorStop(1,'#789db000');
  c.save();c.translate(x,y);c.scale(1,.19);c.fillStyle=haze;c.beginPath();c.arc(0,0,diskRadius,0,Math.PI*2);c.fill();c.restore();
  for(let j=0;j<4;j++){c.strokeStyle=j%2?'#d9b18d7a':'#83a9bd72';c.lineWidth=1.5;c.beginPath();c.ellipse(x,y,diskRadius*(.43+j*.17),extent*(.052+j*.018),0,0,Math.PI*2);c.stroke();}
  c.globalAlpha=1;
 }
 if(state.jet>.001){
  c.globalAlpha=state.jet*.45;
  const length=extent*.82,width=extent*.11;
  for(const direction of [-1,1]){
   const jet=c.createLinearGradient(x,y,x,y+direction*length);jet.addColorStop(0,'#a8d5ea80');jet.addColorStop(1,'#a8d5ea00');c.fillStyle=jet;
   c.beginPath();c.moveTo(x-4,y);c.lineTo(x-width,y+direction*length);c.lineTo(x+width,y+direction*length);c.lineTo(x+4,y);c.closePath();c.fill();
  }
  c.globalAlpha=1;
 }
 const coreGlow=state.core*(1-smooth(1.25,2.12,phase));
 if(coreGlow>.001){
  const r=(5+extent*.33*state.core),glow=c.createRadialGradient(x,y,0,x,y,r*1.8);
  glow.addColorStop(0,`rgba(255,238,202,${.86*coreGlow})`);
  glow.addColorStop(.35,`rgba(239,180,117,${.58*coreGlow})`);
  glow.addColorStop(1,'rgba(235,160,100,0)');c.fillStyle=glow;c.beginPath();c.arc(x,y,r*1.8,0,Math.PI*2);c.fill();
 }
 c.restore();
}
