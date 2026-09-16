import { clamp, ramp, relief } from './cloudField.ts';

/**
 * A prescribed, qualitative advection/condensation model, not a weather solver.
 * One cloud field is transported throughout formation. Sources represent renewed
 * convection; sinks represent evaporation. Individual initial clouds do not persist
 * for the whole genesis. Length, speed, height and elapsed time are illustrative.
 */
export const CLOUD_GRID = 112;
const STEPS = 120, STEP = .5, EXTENT = 520;

/** Northern-hemisphere near-surface circulation in the illustration's X/Z plane. */
export function genesisWind(x:number,z:number,progress:number){
  const r=Math.hypot(x,z),spin=ramp(.02,.86,progress);
  const omega=(.015+.145*spin)/(1+(r/125)**2);
  const inward=-(.22+1.55*spin)*ramp(18,65,r)*(1-ramp(195,258,r));
  return {x:inward*x/Math.max(r,1)+omega*z,z:inward*z/Math.max(r,1)-omega*x};
}

/** Bilinear semi-Lagrangian transport; outside the domain is clear air. */
export function sampleCloud(values:Float32Array,size:number,x:number,z:number){
  if(x<0||z<0||x>size-1||z>size-1)return 0;
  const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
  const j=Math.min(iz+1,size-1)*size,k=iz*size,nx=Math.min(ix+1,size-1);
  return (values[k+ix]*(1-fx)+values[k+nx]*fx)*(1-fz)+(values[j+ix]*(1-fx)+values[j+nx]*fx)*fz;
}

export class CloudEvolution {
  readonly size=CLOUD_GRID;
  private cloud=new Float32Array(this.size**2);
  private height=new Float32Array(this.size**2);
  private nextCloud=new Float32Array(this.size**2);
  private nextHeight=new Float32Array(this.size**2);
  private detail=new Float32Array(this.size**2);
  private bands=new Float32Array(this.size**2);
  private initial=new Float32Array(this.size**2);
  private frames:Uint8Array[]=[];
  constructor(){
    for(let z=0;z<this.size;z++)for(let x=0;x<this.size;x++){
      const i=z*this.size+x,p=relief((x+.5)/this.size*EXTENT-260,(z+.5)/this.size*EXTENT-260);
      this.cloud[i]=p.scatter;this.height[i]=p.scatter*p.cloudTop;
      this.detail[i]=p.detail;this.bands[i]=p.bands;this.initial[i]=p.scatter;
    }
    this.saveFrame();
  }
  private saveFrame(){
    const data=new Uint8Array(this.size**2*4);
    for(let i=0;i<this.cloud.length;i++){
      data[i*4]=Math.round(clamp(this.cloud[i])*255);
      data[i*4+1]=Math.round(clamp(this.height[i]/Math.max(.001,this.cloud[i])/128)*255);
      data[i*4+2]=Math.round((11+this.detail[i]*8)/32*255);data[i*4+3]=255;
    }
    this.frames.push(data);
  }
  private advance(){
    const p=this.frames.length/STEPS,organized=ramp(.08,.86,p),core=ramp(.32,.88,p),cellSize=EXTENT/this.size;
    for(let z=0;z<this.size;z++)for(let x=0;x<this.size;x++){
      const i=z*this.size+x,wx=(x+.5)*cellSize-260,wz=(z+.5)*cellSize-260,r=Math.hypot(wx,wz);
      const wind=genesisWind(wx,wz,p),sx=x-wind.x*STEP/cellSize,sz=z-wind.z*STEP/cellSize;
      const q=sampleCloud(this.cloud,this.size,sx,sz),h=sampleCloud(this.height,this.size,sx,sz);
      // Convective pulses grow and decay locally. Convergence strengthens gradually;
      // rainbands are prescribed regions of renewed convection, not a second cloud image.
      const pulse=.3+.7*(.5+.5*Math.sin(this.detail[i]*29-p*24+wx*.013))**2;
      const broad=(1-ramp(76,151,r))*(.28+.72*this.detail[i]);
      const wall=Math.exp(-(((r-39)/13)**2));
      const source=(.026*this.initial[i]*(1-organized)+organized*(.13*broad+.27*this.bands[i])*pulse+.25*core*wall)* (1-ramp(225,258,r));
      const loss=.037+.035*(1-this.detail[i]);
      const added=STEP*source*(1-q),retained=Math.max(0,1-STEP*loss);
      const top=40+this.detail[i]*49+core*(wall*24+broad*17);
      this.nextCloud[i]=clamp(q*retained+added);
      this.nextHeight[i]=Math.min(128*this.nextCloud[i],h*retained+added*top);
    }
    [this.cloud,this.nextCloud]=[this.nextCloud,this.cloud];[this.height,this.nextHeight]=[this.nextHeight,this.height];
    this.saveFrame();
  }
  /** Adjacent integration frames interpolate for smooth, reproducible scrubbing. */
  write(progress:number,target:Uint8Array){
    if(target.length!==this.size**2*4)throw new RangeError('Cloud output must match the cloud grid');
    const t=clamp(progress)*STEPS,a=Math.floor(t),b=Math.min(STEPS,a+1),blend=t-a;
    while(this.frames.length<=b)this.advance();
    const before=this.frames[a],after=this.frames[b];
    for(let i=0;i<target.length;i++)target[i]=Math.round(before[i]+(after[i]-before[i])*blend);
  }
  dispose(){this.frames=[];}
}
