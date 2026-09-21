import { distanceAU, solarObservation, binaryState, tripleState } from './model.ts';
import { StellarSurface } from './stellarSurface.ts';
import data from './content.json';
type Words=(v:{zh:string;en:string})=>string;
export interface ViewState {chapter:string;distance:number;type:number;section:boolean;triple:boolean;ratio:number;time:number}
const rand=(n:number)=>{const v=Math.sin(n*127.13+8.37)*43758.5453;return v-Math.floor(v);};
export class StellarScene {
  private ctx:CanvasRenderingContext2D;
  private surface=new StellarSurface();
  private lastState?:ViewState;
  private resizeObserver:ResizeObserver;
  constructor(private canvas:HTMLCanvasElement,private text:Words){
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');this.ctx=ctx;
    this.resizeObserver=new ResizeObserver(()=>{if(this.lastState)this.draw(this.lastState);});this.resizeObserver.observe(canvas);
  }
  private star(x:number,y:number,r:number,color:string,time=0){this.surface.draw(this.ctx,x,y,r,color,time);}
  private fontSize(size:number){return Math.max(size,12*1040/(this.canvas.clientWidth||1040));}
  private label(value:string,x:number,y:number,size=18,maxWidth=430){
    const c=this.ctx,font=this.fontSize(size),spaced=value.includes(' '),words=spaced?value.split(' '):[...value],lines:string[]=[];let line='';
    c.font=`500 ${font}px system-ui`;c.textAlign='center';c.fillStyle='#cad3e2';
    for(const word of words){const next=line+(line&&spaced?' ':'')+word;if(line&&c.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
    lines.forEach((text,i)=>c.fillText(text,x,y+(i-(lines.length-1)/2)*font*1.18));
  }
  draw(s:ViewState){this.lastState=s;const c=this.ctx;c.clearRect(0,0,1040,560);c.fillStyle='#070e1c';c.fillRect(0,0,1040,560);
    for(let i=0;i<100;i++){c.globalAlpha=.12+rand(i+1)*.38;c.fillStyle='#c4d4ed';c.beginPath();c.arc(rand(i+11)*1040,rand(i+421)*560,.3+rand(i+20),0,7);c.fill();}c.globalAlpha=1;
    if(s.chapter==='sun'){
      c.strokeStyle='#283344';c.beginPath();c.moveTo(520,65);c.lineTo(520,470);c.stroke();
      this.star(260,270,142,'#ffe5b1',s.time*10);const r=142*solarObservation(distanceAU(s.distance)).angularDiameterDegrees/solarObservation(1).angularDiameterDegrees;
      this.star(780,270,r,'#ffe5b1',s.time*10);this.label(this.text(data.ui.fixed),260,80);this.label(this.text(data.ui.apparent),780,80);this.label('1 AU',260,484);this.label(distanceAU(s.distance).toFixed(1)+' AU',780,484);
    }else if(s.chapter==='types'){
      const model=data.types[s.type]!;
      if(s.section){this.star(405,280,198,model.color,s.time*10);c.save();c.beginPath();c.rect(405,82,220,396);c.clip();
        for(const layer of model.layers){c.fillStyle=layer.color;c.beginPath();c.arc(405,280,198*layer.r,0,7);c.fill();}
        c.restore();c.strokeStyle='#ddd3b288';c.beginPath();c.moveTo(405,82);c.lineTo(405,478);c.stroke();
        model.layers.forEach((l,i)=>{const y=150+i*85,x=405+198*(l.r+(model.layers[i+1]?.r??0))/2;c.strokeStyle=l.color;c.beginPath();c.moveTo(x,280);c.lineTo(650,y);c.lineTo(690,y);c.stroke();if(this.canvas.clientWidth<600)this.label(String(i+1),730,y+5);else this.label(this.text(l.name),850,y+5,16,320);});
      }else{
        const factor=164/Math.max(1,model.radius),r=model.radius*factor;
        this.star(200,265,factor,'#ffe5b1',s.time*10);this.star(730,265,r,model.color,s.time*10);
        this.label(this.text(data.ui.sun)+' · 1',200,model.radius>=50?310:475,20,300);
        this.label(this.text(model.shortName),730,475,20,440);
        this.label(model.radius+' × '+this.text(data.ui.diameter),730,55,26,530);
        // One ruler uses the same pixels-per-solar-radius as both disks.
        c.strokeStyle='#e1bd83';c.lineWidth=1.5;c.beginPath();c.moveTo(730-r,445);c.lineTo(730+r,445);c.stroke();
        const divisions=model.radius>=50?10:4;
        for(let i=0;i<=divisions;i++){const x=730-r+2*r*i/divisions;c.beginPath();c.moveTo(x,440);c.lineTo(x,450);c.stroke();}
        this.label(this.text(data.ui.tick)+' '+(model.radius/divisions)+' '+this.text(data.ui.solarDiameters),730,535,16,500);
        if(model.radius>=50){
          // Clearly separated enlargement keeps a subpixel Sun recognisable without falsifying its disk.
          c.strokeStyle='#899cb7';c.setLineDash([4,6]);c.beginPath();c.moveTo(200,326);c.lineTo(200,353);c.stroke();c.setLineDash([]);
          this.star(200,390,27,'#ffe5b1',s.time*10);this.label(this.text(data.ui.enlargedSun),200,510,14,310);
          if(model.radius===800){this.star(490,265,50*factor,data.types[2]!.color,s.time*10);this.label(this.text(data.ui.bridge),430,130,16,330);c.strokeStyle='#899cb7';c.beginPath();c.moveTo(490,167);c.lineTo(490,246);c.stroke();}
        }
      }

    }else{
      const points=s.triple?tripleState(s.time):binaryState(s.time,s.ratio);
      const scale=s.triple?35:300,centerX=520,centerY=280;
      const color=['#ffe2ac','#adcff2','#efa27e'];
      // Recent analytical circular history, not a pre-drawn full orbit.
      const span=s.triple?3:.8,segments=180,start=Math.max(0,s.time-span);
      for(let b=0;b<points.length;b++){let length=0;c.strokeStyle=color[b]!;c.lineWidth=1.8;c.setLineDash([6,7]);
        for(let i=1;i<=segments;i++){const t=start+(s.time-start)*(i-1)/segments,t2=start+(s.time-start)*i/segments;
          const a=(s.triple?tripleState(t):binaryState(t,s.ratio))[b]!,p=(s.triple?tripleState(t2):binaryState(t2,s.ratio))[b]!;
          const x=centerX+a.x*scale,y=centerY+a.y*scale*.62,nx=centerX+p.x*scale,ny=centerY+p.y*scale*.62;
          c.globalAlpha=.75*(1-(s.time-t2)/span)**1.5;c.lineDashOffset=length;c.beginPath();c.moveTo(x,y);c.lineTo(nx,ny);c.stroke();length+=Math.hypot(nx-x,ny-y);
        }
      }c.globalAlpha=1;c.setLineDash([]);c.lineDashOffset=0;
      points.forEach((p,i)=>{const x=centerX+p.x*scale,y=centerY+p.y*scale*.62;this.star(x,y,18+6*Math.cbrt(p.mass),color[i]!,s.time*10);const closePair=s.triple&&i<2,labelX=x+(closePair?(i===0?-60:60):0),labelY=y-(closePair?(i===0?88:50):45);if(closePair){c.strokeStyle=color[i]!+'80';c.beginPath();c.moveTo(x,y-22);c.lineTo(labelX,labelY+8);c.stroke();}this.label(String.fromCharCode(65+i),labelX,labelY);});
      c.strokeStyle='#deccab';c.beginPath();c.moveTo(512,280);c.lineTo(528,280);c.moveTo(520,272);c.lineTo(520,288);c.stroke();this.label(this.text(data.ui.center),520,505,16);
    }
  }
  dispose(){this.resizeObserver.disconnect();this.lastState=undefined;this.surface.dispose();}
}
