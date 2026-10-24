import type {NebulaReference} from './nebulaModel.ts';
import type {NebulaOpticalFront} from '../../src/visuals/nebulaPortrait.ts';

/** Independent image-inspired nursery geometries, not measured reconstructions.
 * Orion: https://esahubble.org/images/heic0601a/
 * Eagle/Pillars: https://esahubble.org/images/heic1501a/
 * Horsehead: https://esahubble.org/images/heic0105a/
 * The line-of-sight depth, density, light and colour coordinates are authored.
 * Illumination and camera never enter this material field. Evolution's numbered
 * cloud parcels remain separate; these three objects are not its time steps. */
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const gaussian=(v:number)=>Math.exp(-v*v);
function hash(x:number,y:number,z:number){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
function noise(x:number,y:number,z:number){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),a=smooth(0,1,x-ix),b=smooth(0,1,y-iy),c=smooth(0,1,z-iz);
  const row=(dy:number,dz:number)=>hash(ix,iy+dy,iz+dz)*(1-a)+hash(ix+1,iy+dy,iz+dz)*a;
  return (row(0,0)*(1-b)+row(1,0)*b)*(1-c)+(row(0,1)*(1-b)+row(1,1)*b)*c;
}
function billow(x:number,y:number,z:number){return .58*noise(x*3.2+13,y*3.2-4,z*3.2+7)+.28*noise(x*7.1-5,y*7.1+11,z*7.1+3)+.14*noise(x*14.3+9,y*14.3-3,z*14.3-7);}
// Fixed object coordinates: the initial view reveals the chosen silhouette,
// while rotating reveals its illustrative depth. They never face the camera.
const RIGHT=[.825,0,-.565] as const,UP=[-.165,.956,-.241] as const,FRONT=[.540,.293,.790] as const;
export function nebulaCloudPoint(u:number,v:number,w:number):[number,number,number]{return [0,1,2].map(i=>RIGHT[i]!*u+UP[i]!*v+FRONT[i]!*w) as [number,number,number];}
export function nebulaCloudCoordinates(x:number,y:number,z:number):[number,number,number]{return [x*RIGHT[0]+z*RIGHT[2],x*UP[0]+y*UP[1]+z*UP[2],x*FRONT[0]+y*FRONT[1]+z*FRONT[2]];}
const ellipsoid=(u:number,v:number,w:number,cx:number,cy:number,cz:number,rx:number,ry:number,rz:number)=>Math.sqrt(((u-cx)/rx)**2+((v-cy)/ry)**2+((w-cz)/rz)**2)-1;
function capsule(u:number,v:number,w:number,ax:number,ay:number,az:number,bx:number,by:number,bz:number,r:number){
  const x=u-ax,y=v-ay,z=w-az,dx=bx-ax,dy=by-ay,dz=bz-az,t=clamp((x*dx+y*dy+z*dz)/(dx*dx+dy*dy+dz*dz));
  return Math.hypot(x-dx*t,y-dy*t,z-dz*t)-r;
}
function darkCloudShape(reference:NebulaReference,u:number,v:number,w:number){
  // A broad parent cloud continues below the columns/head. An ellipsoidal base
  // reads as a round pedestal; this uneven bank instead joins the dense trunks.
  const bank=Math.max((v+.61)+.12*u+.23*(noise(u*3+5,w*3-2,7)-.5),Math.abs(w-.12)-.24);
  let shape:number;
  if(reference==='pillars'){
    const left=capsule(u,v,w,-.49,-.68,.09,-.32,.40,.11,.13);
    const middle=capsule(u,v,w,-.01,-.66,.10,.04,.18,.13,.095);
    const right=capsule(u,v,w,.40,-.69,.06,.31,-.02,.12,.085);
    const head=ellipsoid(u,v,w,-.29,.45,.10,.20,.14,.17)*.16;
    const crown=capsule(u,v,w,-.39,.48,.09,-.22,.55,.10,.075);
    const crownWing=capsule(u,v,w,-.36,.48,.10,-.49,.51,.08,.058);
    const tip=capsule(u,v,w,-.23,.51,.10,-.19,.63,.12,.040);
    const shoulder=ellipsoid(u,v,w,-.37,.20,.08,.17,.22,.15)*.15;
    const elbow=ellipsoid(u,v,w,.025,-.10,.16,.13,.16,.15)*.13;
    const branch=capsule(u,v,w,-.25,-.35,.13,-.09,-.14,.11,.065);
    const middleTip=capsule(u,v,w,.04,.14,.13,.12,.34,.12,.060);
    const rightHook=capsule(u,v,w,.31,-.03,.12,.38,.10,.13,.052);
    shape=Math.min(bank,left,middle,right,head,crown,crownWing,tip,shoulder,elbow,branch,middleTip,rightHook);
  }else{
    const neck=ellipsoid(u,v,w,.08,-.16,.13,.19,.47,.24)*.21;
    const root=capsule(u,v,w,.08,-.78,.12,.08,-.42,.13,.14);
    const head=ellipsoid(u,v,w,-.075,.245,.15,.25,.17,.235)*.19;
    const muzzle=ellipsoid(u,v,w,-.30,.20,.16,.19,.075,.19)*.15;
    const crown=ellipsoid(u,v,w,.035,.39,.14,.095,.15,.17)*.14;
    const notch=ellipsoid(u,v,w,-.24,.015,.15,.21,.14,.33)*.18;
    shape=Math.max(Math.min(bank,root,neck,head,muzzle,crown),-notch);
  }
  // Multiscale *volume* perturbations make broad folds and uneven small knots.
  // They do not stretch a thin repeated contour into feather-like filaments.
  return shape+.12*(noise(u*7+21,v*7-3,w*7+7)-.5)+.040*(noise(u*19-5,v*19+11,w*19+3)-.5);
}
export type NebulaCloudSample=readonly [gas:number,emission:number,dust:number,colour:number];
const FRONT_PROFILE={range:.18,width:.008,offset:.009,densityWidth:.0025,haloWidth:.018,haloOffset:.029,diffuseRatio:.62,gasRatio:.12};
export function nebulaCloudFront(distance:Uint8Array<ArrayBuffer>):NebulaOpticalFront{return {distance,...FRONT_PROFILE};}
function darkCloudMatter(reference:NebulaReference,u:number,v:number,w:number,broad:number){
  const distance=darkCloudShape(reference,u,v,w),knots=noise(u*19+3,v*19-8,w*19+2);
  const exposed=.06+.94*smooth(-.40,.50,v+u*.6);
  const lightU=reference==='pillars'?.70:-.65,du=lightU-u,dv=.82-v,dw=-.30-w,length=Math.max(.001,Math.hypot(du,dv,dw));
  const clear=smooth(-.008,.055,darkCloudShape(reference,u+du/length*.10,v+dv/length*.10,w+dw/length*.10));
  const frontLight=exposed*(.025+.975*clear**1.5)*(.40+.60*smooth(.30,.72,broad))*(.55+.45*knots);
  const folds=noise(u*29+(broad-.5)*7,v*3-2,w*15+(broad-.5)*3);
  const depthVariation=.40+.60*smooth(-.67,-.36,v);
  return {distance,diffuse:.12*frontLight,frontLight,dust:(.38+.42*folds+.18*knots)*depthVariation,colour:reference==='pillars'?.94:.72+.20*broad};
}
export function sampleNebulaCloud(reference:NebulaReference,x:number,y:number,z:number):NebulaCloudSample{
  const [u,v,w]=nebulaCloudCoordinates(x,y,z);
  const broad=billow(u,v,w),warp=(broad-.5)*.28;
  const box=1-smooth(.83,.98,Math.max(Math.abs(x),Math.abs(y),Math.abs(z)));
  const envelope=box*(reference==='orion'?1:(1-smooth(.72,.93,Math.abs(u)+warp*.5))*(1-smooth(.67,.84,-v+warp*.3)));
  if(envelope===0)return [0,0,0,0];
  let gas:number,emission:number,dust:number,colour:number;
  if(reference==='orion'){
    const outer=1-smooth(.72,1.02,Math.hypot((u+.04)/.97,(v+.06)/.80,w/.51)+warp*2.2);
    // An off-centre cavern opens through the upper/right cloud boundary, rather
    // than making a closed concentric doughnut. Its back wall still emits.
    const cavityRadius=Math.hypot((u-.31+warp)/.68,(v-.26)/.47,(w-.24)/.49);
    const cavity=(1-smooth(.75,1.10,cavityRadius))*smooth(-.26,.05,w);
    const wall=gaussian((cavityRadius-1.04)/.12)*(1-smooth(.39,.75,u+v*.55));
    const clumps=.045+1.25*smooth(.30,.70,broad);
    const body=outer*clumps*(1-.94*cavity);
    const lane=gaussian((v-.23+.49*u+warp)/.072)*gaussian((w-.24)/.13)*(1-smooth(.50,.93,Math.abs(u+.12)));
    const upperDust=Math.exp(-(((u+.47+warp)/.17)**2+((v-.25)/.37)**2+((w-.17)/.19)**2));
    const lowerDust=gaussian((v+.50-.28*u+warp)/.065)*gaussian((w-.27)/.14)*smooth(-.12,.42,u);
    dust=outer*(.035+.16*clumps+.87*Math.max(lane,upperDust,lowerDust)*(.65+.65*broad));
    gas=body*.65+outer*.012;
    const sourceDistance=Math.hypot(u+.10,v+.06,(w+.06)*.9);
    emission=gas*(.20+1.10*gaussian(sourceDistance/.46))*(.72+.65*wall)*(1-.92*dust);
    colour=clamp(.12+.77*smooth(.16,.79,sourceDistance)+.18*(broad-.5)+.12*u);
  }else{
    const matter=darkCloudMatter(reference,u,v,w,broad),front=FRONT_PROFILE;
    const skin=Math.max(0,1-((matter.distance-front.offset)/front.width)**2);
    const halo=Math.max(0,1-((matter.distance-front.haloOffset)/front.haloWidth)**2);
    const interior=1-smooth(-front.densityWidth,front.densityWidth,matter.distance);
    dust=matter.dust*interior;
    gas=matter.diffuse*halo+skin*front.gasRatio;
    const background=matter.diffuse*front.diffuseRatio*halo,edgeLight=matter.frontLight*skin;
    emission=background+edgeLight;
    colour=.04*(1-edgeLight/Math.max(.00001,emission))+matter.colour*edgeLight/Math.max(.00001,emission);
  }
  return [clamp(gas*envelope),clamp(emission*envelope),clamp(dust*envelope),clamp(colour)];
}

export function writeNebulaCloud(reference:NebulaReference,data:Uint8Array,resolution:number,front?:NebulaOpticalFront){
  for(let z=0;z<resolution;z++)for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
    const px=x/(resolution-1)*2-1,py=y/(resolution-1)*2-1,pz=z/(resolution-1)*2-1,index=((z*resolution+y)*resolution+x)*4;
    let sample:NebulaCloudSample;
    if(front&&reference!=='orion'){
      const [u,v,w]=nebulaCloudCoordinates(px,py,pz),broad=billow(u,v,w),warp=(broad-.5)*.28;
      const envelope=(1-smooth(.83,.98,Math.max(Math.abs(px),Math.abs(py),Math.abs(pz))))*(1-smooth(.72,.93,Math.abs(u)+warp*.5))*(1-smooth(.67,.84,-v+warp*.3));
      const matter=darkCloudMatter(reference,u,v,w,broad);
      sample=[matter.diffuse*envelope,matter.frontLight*envelope,matter.dust*envelope,matter.colour];
      front.distance[index/4]=Math.round(clamp(.5+(envelope>0?matter.distance:front.range)/(front.range*2))*255);
      if(envelope===0)sample=[0,0,0,0];
    }else sample=sampleNebulaCloud(reference,px,py,pz);
    for(let channel=0;channel<4;channel++)data[index+channel]=Math.round(sample[channel]!*255);
  }
}

export function nebulaCloudAppearance(reference:NebulaReference){
  const dustDetailTransform=Array.from({length:9},(_,i)=>[RIGHT,UP,FRONT][i%3]![Math.floor(i/3)]!*[1.0,.35,.25][i%3]!);
  return reference==='orion'
    ? {cool:'#bdd7d4',accent:'#e1b8c3',warm:'#d46d53',dustExtinction:12,densityDisplacement:.012,emissionVariation:1,dustVariation:.8,dustLight:0,dustDetailTransform:undefined,sources:[nebulaCloudPoint(-.14,-.07,.04),nebulaCloudPoint(-.055,-.05,.025),nebulaCloudPoint(-.08,-.155,.05)],lightPosition:nebulaCloudPoint(-.09,-.06,.06)}
    : reference==='pillars'
      ? {cool:'#579cae',accent:'#9b432e',warm:'#efbd76',dustExtinction:8,densityDisplacement:.003,emissionVariation:.15,dustVariation:.25,dustLight:.09,dustDetailTransform,sources:[],lightPosition:nebulaCloudPoint(.70,.82,-.30)}
      : {cool:'#bfa9b9',accent:'#db777e',warm:'#be434e',dustExtinction:18,densityDisplacement:.003,emissionVariation:.15,dustVariation:.25,dustLight:.025,dustDetailTransform,sources:[],lightPosition:nebulaCloudPoint(-.65,.68,-.24)};
}
