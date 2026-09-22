import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { language } from '../../src/platform/i18n.ts';
import content from './movementContent.json';
import { flytrapFrame,growthFrame,growthPoint,type LightDirection,type TouchPattern,SIGNAL_THRESHOLD } from './movementModel.ts';
const copy=language==='en'?content.en:content.zh;
const GROWTH_START=.34, GROWTH_END=.62;
export type MovementDrawing = {kind:'flytrap'|'seedling';progress:number;detail:boolean;pattern:TouchPattern;gap:number;direction:LightDirection};
export class MovementScene extends CanvasSurface {
  private current:MovementDrawing={kind:'flytrap',progress:0,detail:false,pattern:'twice',gap:5,direction:'left'};
  constructor(canvas:HTMLCanvasElement){super(canvas);this.onResize(()=>this.draw(this.current));}
  draw(state:MovementDrawing){
    this.current=state;
    if(this.width<1||this.height<1)return;
    this.scale=Math.max(.01,Math.min((this.width-20)/650,(this.height-20)/380));
    const c=this.begin('#e6ecdb','#faf6e9');
    c.translate(0,-15);
    c.lineCap='round';c.lineJoin='round';
    if(state.kind==='flytrap')this.trap(state);else this.seedlings(state);
    this.end();
  }
  private leaf(x:number,y:number,angle:number,size:number){
    const c=this.context;c.save();c.translate(x,y);c.rotate(angle);
    const g=c.createLinearGradient(0,-20,size,18);g.addColorStop(0,'#36573b');g.addColorStop(.55,'#7f9b4f');g.addColorStop(1,'#a0b761');
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(size*.2,-size*.35,size*.8,-size*.38,size,0);c.bezierCurveTo(size*.7,size*.32,size*.2,size*.27,0,0);c.fillStyle=g;c.fill();
    c.beginPath();c.moveTo(0,0);c.lineTo(size*.92,0);c.strokeStyle='#c1ce83';c.lineWidth=1;c.stroke();c.restore();
  }
  private trap(state:MovementDrawing){
    const c=this.context,s=flytrapFrame(state.progress,state.pattern,state.gap);
    const center=state.detail?-120:0, size=state.detail?.77:1;
    c.save();c.translate(center,-15);c.scale(size,size);
    this.path([[0,112],[8,159],[2,198]],undefined,'#5a7d42',13);
    this.leaf(4,169,2.9,90);this.leaf(5,172,-.3,95);
    const width=102*(1-s.closure)+32;
    for(const side of [-1,1]){
      c.save();c.scale(side,1);
      const g=c.createLinearGradient(0,0,width,0);g.addColorStop(0,'#a8655a');g.addColorStop(.45,'#b77660');g.addColorStop(.82,'#bc9866');g.addColorStop(1,'#819657');
      c.beginPath();c.moveTo(0,-125);c.bezierCurveTo(width*1.4,-125,width*1.42,112,0,124);c.bezierCurveTo(6,50,6,-70,0,-125);c.fillStyle=g;c.fill();c.strokeStyle='#6b8a4c';c.lineWidth=7;c.stroke();
      for(let i=0;i<7;i++) {const yy=-94+i*30;c.beginPath();c.moveTo(3,yy*.86);c.quadraticCurveTo(width*.48,yy*.92,width*.95*Math.sqrt(Math.max(0,1-(yy/127)**2)),yy);c.strokeStyle='#dfb99080';c.lineWidth=1.1;c.stroke();}
      for(let i=0;i<13;i++){
        const a=.16+i*(Math.PI-.32)/12,x=width*1.06*Math.sin(a),y=-123*Math.cos(a);
        this.path([[x-3,y-3],[x+20*(1-s.closure)-s.closure*15,y-10],[x+3,y+4]],'#c8cf86','#7b9452',1);
      }
      for(const [hx,hy] of [[.35,-51],[.57,5],[.28,63]]){
        const px=width*hx!,py=hy!;this.path([[px,py],[px+3*(1-s.closure),py-24]],undefined,'#593d34',2);
        this.ellipse(px,py,3.5,2.5,'#925b43');
        if(s.trigger){this.ellipse(px,py-23,6,6,'#efd888');c.beginPath();c.arc(px,py-23,13,0,Math.PI*2);c.strokeStyle='#d6ad45';c.lineWidth=1.2;c.stroke();}
      }
      c.restore();
    }
    this.path([[0,-124],[0,122]],undefined,'#6d864b',6);
    c.restore();
    if(state.detail){
      this.label(copy.flytrap.name,center,-159,{background:'#fffaf0',color:'#445a3d',width:200});
      const bx=83,by=-86,bw=190,bh=17;
      this.label(copy.signal,bx+bw/2,by-41,{background:'#fffaf0',color:'#445a3d',width:195});
      c.fillStyle='#cbd8bf';c.fillRect(bx,by,bw,bh);c.fillStyle='#d4a64b';c.fillRect(bx,by,bw*Math.min(1,s.signal/1.2),bh);
      const threshold=bx+bw*SIGNAL_THRESHOLD/1.2;
      this.path([[threshold,by-5],[threshold,by+bh+6]],undefined,'#66523d',2);
      this.label(copy.threshold,threshold,by+45,{background:'#fffaf0',color:'#66523d',width:170});
      // Fixed sample of the selected trial; the marker follows the same causal state as the trap.
      const duration=flytrapFrame(1,state.pattern,state.gap).time;
      this.path([[bx,90],[bx+bw,90]],undefined,'#a9b59d',1);
      for(const time of s.touches){const xx=bx+bw*time/duration;this.ellipse(xx,90,5,5,time<=s.time?'#ce9b3b':'#bbc5b0');}
      this.ellipse(bx+bw*state.progress,90,4,4,'#3c6849');
      this.label(`${copy.touches}: ${s.count}`,bx+bw/2,130,{background:'#fffaf0',color:'#445a3d',width:210});
    }
  }
  private shoot(progress:number,direction:LightDirection,x:number,zoom=false){
    const c=this.context,s=growthFrame(progress,direction),baseY=125;
    c.save();c.translate(x,zoom?0:baseY);
    const region=(value:number)=>zoom?GROWTH_START+(GROWTH_END-GROWTH_START)*value:value;
    if(zoom){const anchor=growthPoint(s,(GROWTH_START+GROWTH_END)/2);c.scale(3.8,3.8);c.translate(-anchor[0],-anchor[1]);}
    const points:[number,number][]=[];
    for(let i=0;i<=28;i++)points.push(growthPoint(s,region(i/28),-1));
    for(let i=28;i>=0;i--)points.push(growthPoint(s,region(i/28),1));
    const g=c.createLinearGradient(-25,0,25,0);g.addColorStop(0,'#7da265');g.addColorStop(.5,'#b3c785');g.addColorStop(1,'#5f8451');
    this.path(points,g,'#547845',1.4);
    if(zoom){
      for(let i=0;i<=8;i++)this.path([growthPoint(s,region(i/8),-1),growthPoint(s,region(i/8),1)],undefined,'#476f44',1.8);
      const mid:[number,number][]=[];for(let i=0;i<=28;i++)mid.push(growthPoint(s,region(i/28)));this.path(mid,undefined,'#6d9054',1);
      for(let side of [-1,1])for(let i=0;i<8;i++){
        const p=growthPoint(s,region((i+.5)/8),side*.56);
        this.ellipse(p[0],p[1],2,3,'#d6ad4e');
      }
    }else{
      const tip=growthPoint(s,1);this.leaf(tip[0],tip[1],-2.85+s.bend,66);this.leaf(tip[0],tip[1],-.3+s.bend,61);
      const focus:[number,number][]=[];
      for(let i=0;i<=8;i++)focus.push(growthPoint(s,GROWTH_START+(GROWTH_END-GROWTH_START)*i/8,-1.6));
      for(let i=8;i>=0;i--)focus.push(growthPoint(s,GROWTH_START+(GROWTH_END-GROWTH_START)*i/8,1.6));
      focus.push(focus[0]!);this.path(focus,undefined,'#bf9c4f',1.8);
      this.path([[-44,0],[44,0],[34,54],[-34,54]],'#b98766','#91694f',1.5);this.ellipse(0,0,44,8,'#735a41');
      // Stem stays connected to the soil rather than moving the whole plant with the light.
      this.path([[0,5],growthPoint(s,.08)],undefined,'#6c8c52',12);
    }
    c.restore();
  }
  private lamp(x:number,y:number,targetX:number){
    const c=this.context;const light=c.createLinearGradient(x,y,targetX,0);light.addColorStop(0,'#f4d57155');light.addColorStop(1,'#f4d57100');
    this.path([[x,y-10],[targetX-30,40],[targetX+30,40]],light);
    this.ellipse(x,y,15,15,'#f6d97c','#b69b51');
    for(let i=0;i<8;i++){const a=i*Math.PI/4;this.path([[x+Math.cos(a)*21,y+Math.sin(a)*21],[x+Math.cos(a)*28,y+Math.sin(a)*28]],undefined,'#c9a650',2);}
  }
  private seedlings(state:MovementDrawing){
    if(state.detail){
      this.shoot(state.progress,state.direction,-100,true);
      const s=growthFrame(state.progress,state.direction),c=this.context;
      for(const [i,value] of [s.left,s.right].entries()){
        const x=104+i*81;
        c.fillStyle='#88aa68';c.fillRect(x,95-100*value,37,100*value);
        for(let n=1;n<8;n++)this.path([[x,95-100*value*n/8],[x+37,95-100*value*n/8]],undefined,'#e1e7be',2);
        this.label(i===0?copy.leftSide:copy.rightSide,x+18,122,{background:'#fffaf0',color:'#445a3d',width:80});
      }
      this.label(copy.growthZone,-100,-171,{background:'#fffaf0',color:'#445a3d',width:245});
      this.label(copy.relative,164,-116,{background:'#fffaf0',color:'#445a3d',width:228});
    }else{
      this.shoot(state.progress,state.direction,-160);this.shoot(state.progress,'both',155);
      if(state.direction!=='right')this.lamp(-296,-150,-160);
      if(state.direction!=='left')this.lamp(-27,-150,-160);
      this.lamp(43,-150,155);this.lamp(282,-150,155);
      this.label(copy.oneSide,-160,194,{background:'#fffaf0',color:'#445a3d',width:235});
      this.label(copy.control,160,194,{background:'#fffaf0',color:'#445a3d',width:235});
    }
  }
}
