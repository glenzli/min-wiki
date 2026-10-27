/** One authored Sun appearance for the diameter canvas and both 3D views.
 * Display colours, granule contrast and accelerated activity are illustrative,
 * not a solar image, temperature field or a calibrated granule-size map. */
export const SOLAR_SURFACE_STYLE=Object.freeze({
  revision:'golden-photosphere-v1',granuleScale:85,fineScale:170,
  colour:Object.freeze([255,221,137] as const),
  limbBase:.58,limbGain:.42,limbExponent:.55,
  haloColour:Object.freeze([255,206,116] as const),haloInner:.99,haloOuter:1.10,
  haloStops:Object.freeze([[0,69/255],[.4,18/255],[1,0]].map(stop=>Object.freeze(stop as [number,number]))),
});
export const SOLAR_SPOTS=Object.freeze([
  [-.35,.18,.035],[-.28,.22,.018],[.43,-.30,.022],
].map(([x,y,r])=>Object.freeze([x!,y!,Math.sqrt(1-x!*x!-y!*y!),r!] as const)).concat([
  Object.freeze([.32,-.16,-Math.sqrt(1-.32**2-.16**2),.024] as const),
]));
const HASH=Object.freeze([374761393,668265263,2147483647,1274126177] as const);
const clamp=(value:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,value));
const hash=(x:number,y:number,z:number)=>{let h=Math.imul(x,HASH[0])^Math.imul(y,HASH[1])^Math.imul(z,HASH[2]);h=Math.imul(h^(h>>>13),HASH[3]);return((h^(h>>>16))>>>0)/4294967295;};
function noise(x:number,y:number,z:number){
  const a=Math.floor(x),b=Math.floor(y),d=Math.floor(z);x-=a;y-=b;z-=d;
  const u=x*x*(3-2*x),v=y*y*(3-2*y),w=z*z*(3-2*z);let n=0;
  for(let k=0;k<2;k++)for(let j=0;j<2;j++)for(let i=0;i<2;i++)n+=hash(a+i,b+j,d+k)*(i?u:1-u)*(j?v:1-v)*(k?w:1-w);
  return n;
}
export const solarSurfacePhase=(value:number)=>Number.isFinite(value)?Math.max(0,Math.floor(value*6)/6):0;
export const solarLimb=(mu:number)=>SOLAR_SURFACE_STYLE.limbBase+SOLAR_SURFACE_STYLE.limbGain*Math.pow(clamp(mu,0,1),SOLAR_SURFACE_STYLE.limbExponent);
export function solarHaloAlpha(radius:number){
  if(radius<SOLAR_SURFACE_STYLE.haloInner||radius>SOLAR_SURFACE_STYLE.haloOuter)return 0;
  const s=SOLAR_SURFACE_STYLE,t=clamp((radius-s.haloInner)/(s.haloOuter-s.haloInner),0,1),a=s.haloStops;
  return t<a[1]![0]?a[0]![1]+(a[1]![1]-a[0]![1])*t/a[1]![0]:a[1]![1]*(1-(t-a[1]![0])/(1-a[1]![0]));
}

/** Unit object direction uses canvas-down Y; the GPU adapter flips local Y.
 * Writes directly into the caller's retained pixels, without per-pixel objects. */
export function writeSolarSurface(target:Uint8ClampedArray,offset:number,x:number,y:number,z:number,mu:number,phase:number){
  const a=phase*.05,sx=x*Math.cos(a)+z*Math.sin(a),sz=z*Math.cos(a)-x*Math.sin(a),s=SOLAR_SURFACE_STYLE;
  const broad=noise(sx*9+7+phase*.04,y*9,sz*9),warp=noise(sx*18,y*18+3+phase*.05,sz*18);
  const fine=noise(sx*s.granuleScale+warp*2,y*s.granuleScale+phase*.2,sz*s.granuleScale+phase*.12),micro=noise(sx*s.fineScale,y*s.fineScale+phase*.15,sz*s.fineScale);
  const cell=clamp((fine-.23)*1.8,0,1);let light=solarLimb(mu)*(.64+.38*cell+.16*broad+.07*micro);
  for(const [px,py,pz,r]of SOLAR_SPOTS){const d=Math.hypot(sx-px,y-py,sz-pz);light*=1-.70*Math.exp(-((d/r)**2))-.16*Math.exp(-((d/(r*2))**2));}
  target[offset]=s.colour[0]*Math.min(1,light*1.18);target[offset+1]=s.colour[1]*light*(.85+.15*cell);target[offset+2]=s.colour[2]*light*(.72+.28*cell);
}
export function paintSolarDisk(pixels:Uint8ClampedArray,size:number,phase:number){
  if(pixels.length!==size*size*4)throw new RangeError('Solar disk buffer does not match its square resolution');
  phase=solarSurfacePhase(phase);
  for(let py=0;py<size;py++)for(let px=0;px<size;px++){
    const x=(px+.5)*2/size-1,y=(py+.5)*2/size-1,rr=x*x+y*y,o=(py*size+px)*4;
    if(rr>=1){pixels[o+3]=0;continue;}const nz=Math.sqrt(1-rr);
    writeSolarSurface(pixels,o,x,y,nz,nz,phase);pixels[o+3]=Math.min(255,(1-Math.sqrt(rr))*size*255);
  }
}

const f=(value:number)=>Number.isInteger(value)?`${value}.0`:String(value);
/** The same integer hash, interpolation, surface coefficients and spot data
 * expressed for WebGL2. It adds only pixel-footprint filtering to unresolved
 * fine detail; the colour grading is display-space, as on the reference canvas. */
export const SOLAR_SURFACE_GLSL=`
uniform float surfacePhase;
uniform vec4 solarSpots[${SOLAR_SPOTS.length}];
float solarHash(ivec3 p){uint h=uint(p.x)*${HASH[0]}u^uint(p.y)*${HASH[1]}u^uint(p.z)*${HASH[2]}u;h=(h^(h>>13u))*${HASH[3]}u;return float(h^(h>>16u))/4294967295.0;}
float solarNoise(vec3 p){
  ivec3 c=ivec3(floor(p));vec3 f=fract(p);f=f*f*(3.-2.*f);
  float a=mix(solarHash(c),solarHash(c+ivec3(1,0,0)),f.x),b=mix(solarHash(c+ivec3(0,1,0)),solarHash(c+ivec3(1,1,0)),f.x);
  float d=mix(solarHash(c+ivec3(0,0,1)),solarHash(c+ivec3(1,0,1)),f.x),e=mix(solarHash(c+ivec3(0,1,1)),solarHash(c+ivec3(1,1,1)),f.x);
  return mix(mix(a,b,f.y),mix(d,e,f.y),f.z);
}
vec3 solarSurface(vec3 p,float mu,float footprint){
  float angle=surfacePhase*.05;vec3 q=vec3(p.x*cos(angle)+p.z*sin(angle),p.y,p.z*cos(angle)-p.x*sin(angle));
  float broad=solarNoise(q*9.+vec3(7.+surfacePhase*.04,0.,0.)),warp=solarNoise(q*18.+vec3(0.,3.+surfacePhase*.05,0.));
  float detail=1.-smoothstep(.85,2.5,footprint*${f(SOLAR_SURFACE_STYLE.granuleScale)}),small=1.-smoothstep(.65,1.75,footprint*${f(SOLAR_SURFACE_STYLE.fineScale)});
  float fine=.5,micro=.5;
  if(detail>.001)fine=mix(.5,solarNoise(q*${f(SOLAR_SURFACE_STYLE.granuleScale)}+vec3(warp*2.,surfacePhase*.2,surfacePhase*.12)),detail);
  if(small>.001)micro=mix(.5,solarNoise(q*${f(SOLAR_SURFACE_STYLE.fineScale)}+vec3(0.,surfacePhase*.15,0.)),small);
  float cell=clamp((fine-.23)*1.8,0.,1.),limb=${f(SOLAR_SURFACE_STYLE.limbBase)}+${f(SOLAR_SURFACE_STYLE.limbGain)}*pow(clamp(mu,0.,1.),${f(SOLAR_SURFACE_STYLE.limbExponent)});
  float light=limb*(.64+.38*cell+.16*broad+.07*micro);
  for(int i=0;i<${SOLAR_SPOTS.length};i++){float d=length(q-solarSpots[i].xyz),r=solarSpots[i].w;float mask=1.-smoothstep(.55,1.8,footprint/r);light*=1.-mask*(.70*exp(-pow(d/r,2.))+.16*exp(-pow(d/(r*2.),2.)));}
  return clamp(vec3(${f(SOLAR_SURFACE_STYLE.colour[0])}*min(1.,light*1.18),${f(SOLAR_SURFACE_STYLE.colour[1])}*light*(.85+.15*cell),${f(SOLAR_SURFACE_STYLE.colour[2])}*light*(.72+.28*cell))/255.,0.,1.);
}`;
