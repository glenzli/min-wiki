import { distanceAU, solarObservation } from './model.ts';
import { StellarSurface } from './stellarSurface.ts';
import {drawEvolution} from './evolutionScene.ts';
import {drawAnatomy,disposeAnatomyTexture} from './anatomyScene.ts';
import type {Track} from './evolutionModel.ts';
import type {OrbitCase} from './orbitSystems.ts';
import {drawOrbitSystem} from './orbitScene.ts';
import data from './content.json';
type Words=(v:{zh:string;en:string})=>string;
export interface ViewState {chapter:string;distance:number;type:number;section:boolean;orbitCase:OrbitCase;time:number;surfaceTime:number;evolutionTrack:Track;evolutionProgress:number;anatomyFocus:number}
const rand=(n:number)=>{const v=Math.sin(n*127.13+8.37)*43758.5453;return v-Math.floor(v);};
export class StellarScene {
  private ctx:CanvasRenderingContext2D;
  private surface=new StellarSurface();
  private lastState?:ViewState;
  private viewScale=1;
  private resizeObserver:ResizeObserver;
  constructor(private canvas:HTMLCanvasElement,private text:Words){
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');this.ctx=ctx;
    this.resizeObserver=new ResizeObserver(()=>{if(this.lastState)this.draw(this.lastState);});this.resizeObserver.observe(canvas);
  }
  private star(x:number,y:number,r:number,color:string,time=0){this.surface.draw(this.ctx,x,y,r,color,time);}
  private fontSize(size:number){return Math.max(size,12/this.viewScale);}
  private label(value:string,x:number,y:number,size=18,maxWidth=430){
    const c=this.ctx,font=this.fontSize(size),spaced=value.includes(' '),words=spaced?value.split(' '):[...value],lines:string[]=[];let line='';
    c.font=`500 ${font}px system-ui`;c.textAlign='center';c.fillStyle='#cad3e2';
    for(const word of words){const next=line+(line&&spaced?' ':'')+word;if(line&&c.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
    lines.forEach((text,i)=>c.fillText(text,x,y+(i-(lines.length-1)/2)*font*1.18));
  }
  draw(s:ViewState){this.lastState=s;const width=this.canvas.clientWidth,newChapter=s.chapter==='evolution'||s.chapter==='anatomy',stacked=newChapter&&width<650,mobileOrbit=s.chapter==='orbits'&&width<650;
    this.canvas.style.height=stacked?`${Math.ceil(width*560/520*2)}px`:mobileOrbit?`${Math.ceil(width*(s.orbitCase==='hierarchical'?780:565)/520)}px`:'';const height=this.canvas.clientHeight;if(!width||!height)return;const dpr=Math.min(devicePixelRatio||1,2),c=this.ctx;
    if(this.canvas.width!==Math.round(width*dpr)||this.canvas.height!==Math.round(height*dpr)){this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);}
    if(stacked){c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#070e1c';c.fillRect(0,0,width,height);const panelHeight=width*560/520,scale=width/520;
      for(let panel=0;panel<2;panel++){c.save();c.beginPath();c.rect(0,panel*panelHeight,width,panelHeight);c.clip();c.translate(-panel*520*scale,panel*panelHeight);c.scale(scale,scale);
        if(s.chapter==='evolution')drawEvolution(c,s.evolutionTrack,s.evolutionProgress,s.surfaceTime,this.text,this.surface,18);
        else drawAnatomy(c,s.anatomyFocus,s.surfaceTime,this.text,this.surface,18);c.restore();}
      return;}
    if(mobileOrbit){c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#070e1c';c.fillRect(0,0,width,height);c.scale(width/520,width/520);drawOrbitSystem(c,s.orbitCase,s.time,s.surfaceTime,this.text,this.surface,true);return;}
    c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#070e1c';c.fillRect(0,0,width,height);this.viewScale=Math.min(width/1040,height/560);c.translate((width-1040*this.viewScale)/2,(height-560*this.viewScale)/2);c.scale(this.viewScale,this.viewScale);
    for(let i=0;i<100;i++){c.globalAlpha=.12+rand(i+1)*.38;c.fillStyle='#c4d4ed';c.beginPath();c.arc(rand(i+11)*1040,rand(i+421)*560,.3+rand(i+20),0,7);c.fill();}c.globalAlpha=1;
    if(s.chapter==='evolution')drawEvolution(c,s.evolutionTrack,s.evolutionProgress,s.surfaceTime,this.text,this.surface,this.fontSize(16));
    else if(s.chapter==='anatomy')drawAnatomy(c,s.anatomyFocus,s.surfaceTime,this.text,this.surface,this.fontSize(16));
    else if(s.chapter==='sun'){
      c.strokeStyle='#283344';c.beginPath();c.moveTo(520,65);c.lineTo(520,470);c.stroke();
      this.star(260,270,142,'#ffe5b1',s.surfaceTime);const r=142*solarObservation(distanceAU(s.distance)).angularDiameterDegrees/solarObservation(1).angularDiameterDegrees;
      this.star(780,270,r,'#ffe5b1',s.surfaceTime);this.label(this.text(data.ui.fixed),260,80);this.label(this.text(data.ui.apparent),780,80);this.label('1 AU',260,484);this.label(distanceAU(s.distance).toFixed(1)+' AU',780,484);
    }else if(s.chapter==='types'){
      const model=data.types[s.type]!;
      if(s.section){this.star(405,280,198,model.color,s.surfaceTime);c.save();c.beginPath();c.rect(405,82,220,396);c.clip();
        for(const layer of model.layers){c.fillStyle=layer.color;c.beginPath();c.arc(405,280,198*layer.r,0,7);c.fill();}
        c.restore();c.strokeStyle='#ddd3b288';c.beginPath();c.moveTo(405,82);c.lineTo(405,478);c.stroke();
        model.layers.forEach((l,i)=>{const y=150+i*85,x=405+198*(l.r+(model.layers[i+1]?.r??0))/2;c.strokeStyle=l.color;c.beginPath();c.moveTo(x,280);c.lineTo(650,y);c.lineTo(690,y);c.stroke();if(this.canvas.clientWidth<600)this.label(String(i+1),730,y+5);else this.label(this.text(l.name),850,y+5,16,320);});
      }else{
        const factor=164/Math.max(1,model.radius),r=model.radius*factor;
        this.star(200,265,factor,'#ffe5b1',s.surfaceTime);this.star(730,265,r,model.color,s.surfaceTime);
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
          this.star(200,390,27,'#ffe5b1',s.surfaceTime);this.label(this.text(data.ui.enlargedSun),200,510,14,310);
          if(model.radius===800){this.star(490,265,50*factor,data.types[2]!.color,s.surfaceTime);this.label(this.text(data.ui.bridge),430,130,16,330);c.strokeStyle='#899cb7';c.beginPath();c.moveTo(490,167);c.lineTo(490,246);c.stroke();}
        }
      }

    }else drawOrbitSystem(c,s.orbitCase,s.time,s.surfaceTime,this.text,this.surface);
  }
  dispose(){this.resizeObserver.disconnect();this.lastState=undefined;this.surface.dispose();disposeAnatomyTexture();}
}
