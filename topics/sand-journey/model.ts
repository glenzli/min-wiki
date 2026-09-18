const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const quad=(t:number,a:number[],b:number[],c:number[])=>[0,1].map(k=>(1-t)**2*a[k]!+2*(1-t)*t*b[k]!+t*t*c[k]!) as [number,number];
/** A possible history for a persistent grain, not a universal sand-making timetable. */
export function sandGrain(progress:number,index:number,source:number){
 const lag=index*.009,p=clamp((clamp(progress)-lag)/(1-lag));
 let center:[number,number];
 if(source===0){
  if(p<.28)center=quad(p/.28,[196,261],[225,278],[251,326]);
  else if(p<.57)center=quad((p-.28)/.29,[251,326],[331,411],[458,343]);
  else if(p<.82)center=quad((p-.57)/.25,[458,343],[585,275],[653,348]);
  else center=quad((p-.82)/.18,[653,348],[660,398],[620,400]);
 }else{
  if(p<.28)center=quad(p/.28,[602,307],[632,304],[657,329]);
  else if(p<.57)center=quad((p-.28)/.29,[657,329],[714,324],[706,368]);
  else if(p<.82)center=quad((p-.57)/.25,[706,368],[711,413],[672,418]);
  else center=quad((p-.82)/.18,[672,418],[644,423],[620,400]);
 }
 const spread=mix(4,35,p),angle=index*2.399963;
 const x=center[0]+(index===0?0:Math.cos(angle)*spread),y=center[1]+(index===0?0:Math.sin(angle)*spread*.48);
 return {id:index,x,y,size:mix(8+index%4,2.5+index%3*.45,p),rounding:p,rotation:mix(index*23,index*23+140,p),deposited:p===1};
}
