import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { morningState,roses,type readFlowerState } from './model.ts';
type State=ReturnType<typeof readFlowerState>;
const seeded=(n:number)=>{const x=Math.sin(n*91.71+12.4)*43758.5453;return x-Math.floor(x);};
/** Botanical illustrations share persistent geometry across changes of progress and observation. */
export class FlowerScene extends CanvasSurface {
 private state:State={case:'pigments',rose:0,opening:1,uv:false,close:false};
 private view=0;
 private frame=0;
 private initialized=false;
 private lastCase:State['case']='pigments';
 constructor(canvas:HTMLCanvasElement){super(canvas);this.onResize(()=>this.paint());}
 draw(s:State){
  this.state={...s};
  const target=s.close&&s.case!=='guides'?1:0;
  cancelAnimationFrame(this.frame);this.frame=0;
  if(!this.initialized){this.initialized=true;this.lastCase=s.case;this.view=target;this.paint();return;}
  if(s.case!==this.lastCase||matchMedia('(prefers-reduced-motion: reduce)').matches){this.lastCase=s.case;this.view=target;this.paint();return;}
  if(Math.abs(target-this.view)<.001){this.view=target;this.paint();return;}
  const from=this.view,start=performance.now();
  const tick=(now:number)=>{const p=Math.min(1,(now-start)/420),ease=p*p*(3-2*p);this.view=from+(target-from)*ease;this.paint();if(p<1)this.frame=requestAnimationFrame(tick);else this.frame=0;};
  this.frame=requestAnimationFrame(tick);
 }
 private paint(){
  const s=this.state,view=this.view,c=this.begin('#edf0e2','#faf5ea');
  // Keep the whole specimen generous while fitting both the sampled petal and cell on narrow screens.
  const room=Math.max(0,Math.min(1,(this.width-390)/520));
  const wholeZoom=1.50+.05*room,closeZoom=1.04+.38*room;
  const zoom=wholeZoom+(closeZoom-wholeZoom)*view;
  c.scale(zoom,zoom);
  c.save();c.translate(-185*view,-12*view);c.scale(1-.3*view,1-.3*view);
  // A connected stem and foliage stay with the flower across all observations.
  c.strokeStyle='#476d44';c.lineWidth=9;c.beginPath();c.moveTo(0,45);c.bezierCurveTo(5,115,-18,170,-8,230);c.stroke();
  for(const side of [-1,1]){c.save();c.translate(0,125+side*25);c.scale(side,1);c.rotate(-.3);const g=c.createLinearGradient(0,0,100,-50);g.addColorStop(0,'#315640');g.addColorStop(.5,'#719759');g.addColorStop(1,'#3a684b');c.fillStyle=g;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(35,-55,80,-65,117,-45);c.bezierCurveTo(83,5,30,28,0,0);c.fill();c.strokeStyle='#bad08b88';c.lineWidth=1.5;for(let i=0;i<6;i++){c.beginPath();c.moveTo(i*17,-i*6);c.lineTo(i*17+25,-i*6-22);c.stroke();}c.restore();}
  if(s.case==='pigments')this.rose(roses[s.rose]!.color);
  else if(s.case==='morning')this.morning(s.opening);
  else this.sunflower(s.uv);
  c.restore();if(view>.001){c.save();c.globalAlpha=view;c.strokeStyle='#64846988';c.lineWidth=1.2;c.setLineDash([5,5]);c.beginPath();c.moveTo(-139,-55);c.lineTo(60,-115);c.moveTo(-139,-25);c.lineTo(60,105);c.stroke();c.setLineDash([]);c.strokeRect(-165,-58,28,35);this.cell(s);c.restore();}this.end();
 }
 override dispose(){cancelAnimationFrame(this.frame);super.dispose();}
 private petal(angle:number,r:number,w:number,color:string,seed:number){const c=this.context;c.save();c.rotate(angle);const g=c.createLinearGradient(0,0,0,-r);g.addColorStop(0,'#683441');g.addColorStop(.23,color);g.addColorStop(.8,color);g.addColorStop(1,'#fff9eacc');c.fillStyle=g;c.beginPath();c.moveTo(-w*.2,12);c.bezierCurveTo(-w*1.1,-r*.25,-w*.85,-r*.88,-w*.18,-r);c.bezierCurveTo(w*.18,-r*1.07,w*.9,-r*.85,w*.7,-r*.62);c.bezierCurveTo(w*.8,-r*.25,w*.2,-2,-w*.2,12);c.closePath();c.shadowColor='#58343d25';c.shadowBlur=6;c.fill();c.shadowBlur=0;c.strokeStyle='#73374828';c.lineWidth=.7;c.stroke();for(let v=0;v<7;v++){c.beginPath();c.moveTo(0,0);c.quadraticCurveTo((v-3)*w*.1,-r*.6,(v-3)*w*.12,-r*(.68+seeded(seed+v)*.2));c.strokeStyle='#fff9ee25';c.stroke();}c.restore();}
 private rose(color:string){for(let ring=0;ring<4;ring++){const count=9-ring,r=155-ring*32;for(let i=0;i<count;i++)this.petal(i*Math.PI*2/count+ring*.73,r*(.95+seeded(i+ring*21)*.1),r*.55,color,i+ring*33);}this.ellipse(0,0,13,10,'#743346');}
 private morning(progress:number){const s=morningState(progress),c=this.context,r=155*s.opening;const g=c.createRadialGradient(0,0,4,0,0,r);g.addColorStop(0,'#f8edb2');g.addColorStop(.16,'#fcf4e5');g.addColorStop(.4,`hsl(${s.hue} 65% 77%)`);g.addColorStop(1,`hsl(${s.hue} 63% 56%)`);c.fillStyle=g;c.beginPath();for(let i=0;i<=240;i++){const a=i/240*Math.PI*2,rr=r*(.95+.045*Math.cos(a*5));const x=Math.cos(a)*rr,y=Math.sin(a)*rr;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();for(let i=0;i<5;i++){c.save();c.rotate(i*Math.PI*2/5);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(r*.08,-r*.55,0,-r*.99);c.strokeStyle='#fff5f277';c.lineWidth=2+progress*4;c.stroke();c.restore();}for(let i=0;i<60;i++){const a=i/60*Math.PI*2;c.beginPath();c.moveTo(Math.cos(a)*r*.3,Math.sin(a)*r*.3);c.lineTo(Math.cos(a+.035)*r*.94,Math.sin(a+.035)*r*.94);c.lineWidth=.7;c.strokeStyle='#fff8ff25';c.stroke();}this.ellipse(0,0,10,12,'#cdb363');}
 private sunflower(uv:boolean){const c=this.context;for(let ring=0;ring<2;ring++)for(let i=0;i<24;i++){c.save();c.rotate(i*Math.PI*2/24+ring*.13);const r=158-ring*12,g=c.createLinearGradient(0,-50,0,-r);g.addColorStop(0,uv?'#724a94':'#d68d24');g.addColorStop(.38,uv?'#8559a2':'#efb737');g.addColorStop(.62,'#f2c546');g.addColorStop(1,'#ffe48e');c.fillStyle=g;c.beginPath();c.moveTo(-8,-43);c.bezierCurveTo(-28,-85,-22,-125,3,-r);c.bezierCurveTo(25,-130,26,-75,9,-43);c.closePath();c.fill();c.strokeStyle='#8d632b30';c.lineWidth=.8;c.stroke();c.beginPath();c.moveTo(0,-50);c.quadraticCurveTo(-4,-95,3,-r+4);c.stroke();c.restore();}this.ellipse(0,0,62,62,'#55402d');for(let i=0;i<800;i++){const a=i*2.39996,r=Math.sqrt(i/800)*59;c.fillStyle=i%5?'#937440':'#c6a453';c.beginPath();c.arc(Math.cos(a)*r,Math.sin(a)*r,1.2,0,7);c.fill();}}
 private cell(s:State){const c=this.context;c.save();c.translate(195,0);this.ellipse(0,0,135,155,'#e6e9d2','#809b69');const hue=s.case==='morning'?morningState(s.opening).hue:335;this.ellipse(-12,-6,92,118,s.case==='morning'?`hsl(${hue} 48% 88%)`:'#faf0eb','#b6b1c5');const count=s.case==='morning'?55:Math.round(roses[s.rose]!.anthocyanin*55);for(let i=0;i<count;i++){const a=i*2.39996,r=Math.sqrt(seeded(i+8));this.ellipse(-12+Math.cos(a)*r*77,-6+Math.sin(a)*r*100,4,2.7,`hsl(${hue} 60% 56%)`);}if(s.case==='pigments'){for(let i=0;i<12;i++){const a=i/12*Math.PI*2,x=Math.cos(a)*115,y=Math.sin(a)*137;this.ellipse(x,y,9,6,'#e5d9a2','#a6a36e');for(let j=0;j<Math.round(roses[s.rose]!.carotenoid*5);j++)this.ellipse(x+(seeded(i*8+j)-.5)*11,y+(seeded(i*13+j)-.5)*6,2,1.5,'#e9aa26');}}else{for(let i=0;i<18;i++){const a=i*2.39996,r=45+seeded(i)*45,x=Math.cos(a)*r,y=Math.sin(a)*r;const u=morningState(s.opening).environment;this.ellipse(-12+x*(1-u)+Math.cos(a)*115*u,-6+y*(1-u)+Math.sin(a)*140*u,2,2,'#56817e');}}c.restore();}
}
