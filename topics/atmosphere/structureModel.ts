import { clamp, layerEdges, type World } from './model.ts';

/** Independent observation windows, not a universal set of atmospheric layers.
 * Heights are representative teaching locations; only Earth carries its thermal
 * layer boundaries. Display heights are reversible teaching coordinates. */
export interface AtmosphereFeature {
  id: string;
  height: number;
  range?: readonly [number, number];
  layer?: number;
}
export interface AtmosphereStructureProfile {
  top: number;
  air: number;
  tint: readonly [number, number, number];
  features: readonly AtmosphereFeature[];
}
export const structureProfiles: Record<World, AtmosphereStructureProfile> = {
  earth: { top: 1000, air: .44, tint: [.19,.48,.75], features: [
    {id:'weather',height:3,range:[0,11],layer:0},
    {id:'ozone',height:25,range:[11,50],layer:1},
    {id:'meteor',height:65,range:[50,85],layer:2},
    {id:'aurora',height:180,range:[85,600],layer:3},
    {id:'escape',height:850,range:[600,1000],layer:4},
  ]},
  venus: {top:250,air:.92,tint:[.66,.47,.26],features:[
    {id:'hot-ground',height:0}, {id:'dense-air',height:12},
    {id:'acid-cloud',height:57,range:[45,70]}, {id:'venus-upper',height:170},
  ]},
  mars: {top:200,air:.10,tint:[.63,.35,.24],features:[
    {id:'dust',height:4}, {id:'water-ice',height:22,range:[10,30]},
    {id:'co2-ice',height:70,range:[60,80]}, {id:'mars-upper',height:150},
  ]},
  titan: {top:1000,air:.72,tint:[.68,.44,.18],features:[
    {id:'methane-lakes',height:0}, {id:'methane-cloud',height:18},
    {id:'organic-haze',height:200}, {id:'titan-upper',height:700},
  ]},
  moon: {top:1000,air:0,tint:[.5,.5,.5],features:[
    {id:'moon-ground',height:0}, {id:'moon-exosphere',height:220},
  ]},
  mercury: {top:1000,air:0,tint:[.5,.5,.5],features:[
    {id:'mercury-ground',height:0}, {id:'mercury-exosphere',height:180},
  ]},
};
// Earth allocates room to each thermal region, including the formerly crowded
// 50–85 km and 600–1000 km examples. Interpolation remains continuous and
// logarithmic within each region: these are display coordinates, not thickness.
// Foreign worlds keep their own original continuous logarithmic windows.
export const DISPLAY_HEIGHT = 8.6;
const earthDisplayStops = [0,1.8,3.9,5.4,7.35,DISPLAY_HEIGHT] as const;
export const displayHeight = (world:World) => world==='earth'?DISPLAY_HEIGHT:4.65;
function heightStops(world:World):readonly number[] {return world==='earth'?earthDisplayStops:[0,displayHeight(world)];}
function altitudeStops(world:World):readonly number[] {return world==='earth'?layerEdges:[0,structureProfiles[world].top];}
function interval(stops:readonly number[],value:number) {let i=0;while(i<stops.length-2&&value>stops[i+1])i++;return i;}
export function expandedHeight(world:World,km:number) {
 const h=clamp(km,0,structureProfiles[world].top),altitudes=altitudeStops(world),heights=heightStops(world),i=interval(altitudes,h);
 const t=(Math.log1p(h)-Math.log1p(altitudes[i]))/(Math.log1p(altitudes[i+1])-Math.log1p(altitudes[i]));
 return heights[i]+(heights[i+1]-heights[i])*t;
}
export function expandedAltitude(world:World,y:number) {
 const v=clamp(y,0,displayHeight(world)),altitudes=altitudeStops(world),heights=heightStops(world),i=interval(heights,v),t=(v-heights[i])/(heights[i+1]-heights[i]);
 return Math.expm1(Math.log1p(altitudes[i])+(Math.log1p(altitudes[i+1])-Math.log1p(altitudes[i]))*t);
}
/** Gas density and emission colours use exactly the geometry's height mapping. */
export function expandedAltitudeGLSL(world:World) {
 const altitudes=altitudeStops(world),heights=heightStops(world),f=(n:number)=>n.toFixed(12);
 return `float expandedAltitudeAt(float y){y=clamp(y,0.0,${f(displayHeight(world))});\n`+heights.slice(1).map((end,i)=>
  `if(y<=${f(end)})return exp(mix(${f(Math.log1p(altitudes[i]))},${f(Math.log1p(altitudes[i+1]))},(y-${f(heights[i])})/${f(end-heights[i])}))-1.0;`).join('\n')+`\nreturn ${f(structureProfiles[world].top)};}`;
}
export const structureNoise = (n:number) => {const x=Math.sin(n*127.1+19.7)*43758.5453;return x-Math.floor(x);};
export function structureGround(world:World,x:number,z:number) {
  // A fixed illustrative place, not measured topography. Water is the visible
  // contact surface, so rain and other grounded marks use this same function.
  const curve=-.024*x*x-.014*z*z;
  const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
  const n=(Math.sin(x*2.1+z*.8)+Math.sin(z*4.1-x*1.3)*.42+Math.sin(x*9.7+z*6.3)*.13)*.026;
  if(world==='earth'){
    const shore=-.72+Math.sin(z*1.5)*.22+Math.sin(z*4.3+.4)*.1;
    const land=smooth(-.1,.46,x-shore);
    const ridge=.62*Math.exp(-(((x-2.15-Math.sin(z*1.6)*.32)/.62)**2))*(.58+.42*Math.exp(-(((z+.55)/1.4)**2)));
    const ridgeBack=.27*Math.exp(-(((x-3.55+Math.cos(z*2)*.22)/.74)**2))*(.72+.28*Math.sin(z*3.4+.8)**2);
    const relief=land*(.048+Math.max(0,x-shore)*.028+ridge+ridgeBack+n);
    // A short tidal inlet joins the bay; its sea-level surface is deliberately
    // not an animated river or a hydrological discharge model.
    const riverZ=.3+Math.sin(x*1.32)*.23-Math.cos(x*4)*.025;
    const riverWidth=.11+.13*(1-smooth(-.7,.9,x));
    const inlet=Math.exp(-(((z-riverZ)/riverWidth)**4))*(1-smooth(.55,1.3,x));
    return curve+Math.max(0,relief-inlet*(.12+land*.10));
  }
  if(world==='titan'){
    const uneven=1+Math.sin(x*4.1+z*3.8)*.08+Math.sin(z*9.1-x*2.4)*.035;
    const lake=Math.exp(-(((((x+1.35)/1.05)**2+((z-.27)/.65)**2)*uneven)**2));
    const smallLake=Math.exp(-(((((x+.05)/.48)**2+((z+1.12)/.36)**2)*uneven)**2));
    return curve+Math.max(0,.10+n*.7+Math.sin(x*.9+z*1.3)**2*.10-lake*.38-smallLake*.28);
  }
  let h=n;
  if(world==='moon'||world==='mercury'){
    const scale=world==='mercury'?.9:1;
    for(const [cx,cz,r]of [[-1.5,.55,.78],[1.6,-.5,1.02],[.1,1.2,.4],[-3,-.95,.37],[3.3,1.3,.31],[-.12,-1.3,.23]]){
      const d=Math.hypot(x-cx,z-cz)/r;
      h+=scale*(Math.exp(-(((d-1)/.14)**2))*.13-Math.exp(-((d/.78)**4))*.22);
    }
  }else if(world==='venus'){
    const fold=x*.95-z*.5+Math.sin(z*1.8)*.25;
    h+=.11+Math.sin(fold)**4*.27+Math.sin(x*3.3+z*2.1)**2*.025;
  }else{
    const eroded=.22*Math.exp(-(((x-2.4+Math.sin(z*1.5)*.3)/.9)**2));
    const dune=Math.sin(x*6.7+z*2.6+Math.sin(z*1.4)*.7);
    h+=.055+eroded+Math.max(0,dune)*.025;
  }
  return curve+h;
}

/** Closed retained ground geometry: front/side thickness follows the same top.
 * The underside is illustrative ground support, not a planetary interior. */
export function structureTerrain(world:World,nx=96,nz=48){
  nx=Number.isFinite(nx)?Math.round(Math.max(8,Math.min(160,nx))):96;
  nz=Number.isFinite(nz)?Math.round(Math.max(8,Math.min(96,nz))):48;
  const positions:number[]=[],indices:number[]=[],uv:number[]=[];
  const width=8.4,depth=4.2;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const x=(i/nx-.5)*width,z=(j/nz-.5)*depth;
    positions.push(x,structureGround(world,x,z),z);uv.push(i/nx,j/nz);
    if(i<nx&&j<nz){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  const edge:number[]=[];
  for(let i=0;i<=nx;i++)edge.push(i);
  for(let j=1;j<=nz;j++)edge.push(j*(nx+1)+nx);
  for(let i=nx-1;i>=0;i--)edge.push(nz*(nx+1)+i);
  for(let j=nz-1;j>0;j--)edge.push(j*(nx+1));
  const ring=positions.length/3;
  for(const source of edge){positions.push(positions[source*3],-.9,positions[source*3+2]);uv.push(0,0);}
  for(let k=0;k<edge.length;k++){const n=(k+1)%edge.length;indices.push(edge[k],edge[n],ring+k,edge[n],ring+n,ring+k);}
  const center=positions.length/3;positions.push(0,-.9,0);uv.push(.5,.5);
  for(let k=0;k<edge.length;k++)indices.push(center,ring+k,ring+(k+1)%edge.length);
  return {positions:new Float32Array(positions),uv:new Float32Array(uv),indices:new Uint16Array(indices)};
}

export function referenceTicks(world:World){
  return world==='earth'?layerEdges.slice(1):structureProfiles[world].features.filter(f=>f.range).flatMap(f=>f.range!);
}
