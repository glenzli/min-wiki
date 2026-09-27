import { frameAt, type Body } from './model.ts';
import type { Comparison } from './runner.ts';
import { StellarSurface } from '../stellarSurface.ts';
const COLORS=['#f4cb8a','#89c7ef','#f19788'];
/** CSS-pixel drawing keeps labels legible at narrow widths; geometry is always equal-axis. */
export class ThreeBodyScene {
  private ctx:CanvasRenderingContext2D;
  private surface=new StellarSurface();
  private observer:ResizeObserver;
  private data?:Comparison;
  private initial:Body[]=[];
  private index=0;
  private comparison=true;
  private trailFrames=180;
  private extent=1.6;
  private surfaceTime=0;
  setSurfaceTime(time:number){this.surfaceTime=time;this.draw();}
  constructor(private canvas:HTMLCanvasElement,private centerLabel:string,private previewLabel:string){
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');this.ctx=ctx;
    this.observer=new ResizeObserver(()=>this.draw());this.observer.observe(canvas);
  }
  setInitial(initial:Body[]){this.data=undefined;this.initial=initial;this.extent=Math.max(1.5,...initial.flatMap(b=>[Math.abs(b.x),Math.abs(b.y)]))*1.3;this.draw();}
  setData(data:Comparison,trailFrames=180){this.data=data;this.trailFrames=trailFrames;this.extent=1.6;this.index=0;this.draw();}
  show(index:number,comparison:boolean){this.index=index;this.comparison=comparison;this.draw();}
  draw(){
    const width=this.canvas.clientWidth;if(!width)return;const height=this.canvas.clientHeight||350,dpr=Math.min(devicePixelRatio||1,2);
    if(this.canvas.width!==Math.round(width*dpr)||this.canvas.height!==Math.round(height*dpr)){this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);}
    const c=this.ctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);
    const bg=c.createRadialGradient(width*.5,height*.45,0,width*.5,height*.45,width*.8);bg.addColorStop(0,'#122239');bg.addColorStop(1,'#060d19');c.fillStyle=bg;c.fillRect(0,0,width,height);
    if(this.data){const f=frameAt(this.data.base,this.index),g=frameAt(this.data.perturbed,this.index);let target=1.6;for(const frame of this.comparison?[f,g]:[f])for(let i=0;i<3;i++)target=Math.max(target,Math.abs(frame[1+4*i]!)*1.25,Math.abs(frame[2+4*i]!)*1.25);this.extent=Math.max(this.extent,target);}
    const scale=(Math.min(width,height)-75)/(2*this.extent),cx=width/2,cy=(height-20)/2,point=(x:number,y:number)=>[cx+x*scale,cy-y*scale];
    // Keep the enlarged identification disks apart at narrow stage heights.
    const markerRadius=Math.min(18,Math.max(5,scale*.23));
    c.lineWidth=1;c.strokeStyle='#cedbf50c';const tick=10**Math.floor(Math.log10(this.extent));for(let i=-10;i<=10;i++){const v=i*tick;if(Math.abs(v)>this.extent)continue;const p=point(v,v);c.beginPath();c.moveTo(p[0]!,20);c.lineTo(p[0]!,height-48);c.moveTo(20,p[1]!);c.lineTo(width-20,p[1]!);c.stroke();}
    c.strokeStyle='#c3d2e84c';c.beginPath();c.moveTo(cx-5,cy);c.lineTo(cx+5,cy);c.moveTo(cx,cy-5);c.lineTo(cx,cy+5);c.stroke();c.font='12px system-ui';c.fillStyle='#b1c2db';c.fillText(this.centerLabel,cx+9,cy+19);
    if(this.data){
      const trajectories=this.comparison?[this.data.perturbed,this.data.base]:[this.data.base];
      for(const trajectory of trajectories){
        const perturbed=trajectory===this.data.perturbed;c.lineWidth=perturbed?1:1.6;
        const first=Math.max(0,this.index-this.trailFrames);
        for(let b=0;b<3;b++){
          c.strokeStyle=COLORS[b]!;let length=0;
          for(let n=first+1;n<=this.index;n++){
            const f=frameAt(trajectory,n-1),g=frameAt(trajectory,n),p=point(f[1+4*b]!,f[2+4*b]!),q=point(g[1+4*b]!,g[2+4*b]!);
            c.setLineDash(perturbed?[2,6]:[5,5]);c.lineDashOffset=length;
            c.globalAlpha=(perturbed?.4:.85)*(1-(this.index-n)/this.trailFrames)**1.4;
            c.beginPath();c.moveTo(p[0]!,p[1]!);c.lineTo(q[0]!,q[1]!);c.stroke();length+=Math.hypot(q[0]!-p[0]!,q[1]!-p[1]!);
          }
        }
      }c.globalAlpha=1;c.setLineDash([]);c.lineDashOffset=0;
      const base=frameAt(this.data.base,this.index);
      if(this.comparison)this.bodies(frameAt(this.data.perturbed,this.index),point,true,markerRadius,base);
      this.bodies(base,point,false,markerRadius);
    }else{const frame=new Float64Array(19);this.initial.forEach((b,i)=>{frame[1+4*i]=b.x;frame[2+4*i]=b.y;});this.bodies(frame,point,false,markerRadius);c.fillStyle='#aabbd5';c.font='12px system-ui';c.fillText(this.previewLabel,20,28);}
    const ruler=Math.max(tick,Math.floor((width*.25)/(scale*tick))*tick),length=ruler*scale;
    c.strokeStyle='#9fb3cf';c.beginPath();c.moveTo(24,height-30);c.lineTo(24+length,height-30);c.moveTo(24,height-34);c.lineTo(24,height-26);c.moveTo(24+length,height-34);c.lineTo(24+length,height-26);c.stroke();c.fillStyle='#bdcbe1';c.font='12px system-ui';c.fillText(ruler.toPrecision(2)+' L₀',24,height-10);
  }
  private bodies(frame:Float64Array,point:(x:number,y:number)=>number[],comparison:boolean,radius:number,base?:Float64Array){
    const c=this.ctx;
    for(let i=0;i<3;i++){
      const x=frame[1+4*i]!,y=frame[2+4*i]!,p=point(x,y),px=p[0]!,py=p[1]!;
      c.fillStyle=COLORS[i]!;
      if(comparison){
        // This is the same body in a separate calculation, not a shell around the base star.
        // Draw the smaller, translucent disk first so it disappears naturally while the runs overlap.
        c.save();c.globalAlpha=.5;this.surface.draw(c,px,py,radius*.8,COLORS[i]!,this.surfaceTime);c.restore();
        const counterpart=base?point(base[1+4*i]!,base[2+4*i]!):undefined;
        if(counterpart&&Math.hypot(px-counterpart[0]!,py-counterpart[1]!)<=radius*2.1)continue;
      }else this.surface.draw(c,px,py,radius,COLORS[i]!,this.surfaceTime);
      c.fillStyle=COLORS[i]!;
      c.font='600 13px system-ui';
      c.fillText(String.fromCharCode(65+i)+(comparison?'′':''),px+(x>=0?radius+8:-radius-17),py+(y>=0?-radius-7:radius+14));
    }
  }
  dispose(){this.observer.disconnect();this.surface.dispose();this.data=undefined;this.initial=[];}
}
