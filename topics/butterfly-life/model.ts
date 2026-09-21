/** Illustrative expansion after emergence, followed by a waiting interval; not flight kinematics. */
export function wingPreparation(value: number) {
  const p=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
  const v=Math.min(1,p/.72),extension=v*v*(3-2*v);
  return { width:.22+.78*extension,length:.46+.54*extension,phase:p<.08?0:p<.72?1:2 };
}

const clamp=(p:number)=>Number.isFinite(p)?Math.max(0,Math.min(4,p)):0;
const ease=(a:number,b:number,p:number)=>{const u=Math.max(0,Math.min(1,(p-a)/(b-a)));return u*u*(3-2*u);};
/** A reversible visual itinerary, not equal-age stages or a tissue simulator. */
export function butterflyGrowth(value:number){
  const p=clamp(value),hatch=ease(.38,.92,p),hang=ease(1.38,1.82,p),pupate=ease(1.82,2,p),emerge=ease(2.70,3,p);
  const grow=ease(.8,1.5,p);
  return {
    progress:p,hatch,hang,pupate,emerge,
    eggOpacity:1-ease(.6,1.15,p),larvaOpacity:hatch*(1-pupate),
    pupaOpacity:pupate,adultOpacity:ease(2.70,2.76,p),
    larvaScale:(.19+.81*grow)*(1-.18*hang),
    larvaX:490+10*hang,larvaY:290-145*hang,larvaAngle:90*hang,
    larvaWave:Math.sin(p*48)*4*(1-hang)*hatch,
    shellSplit:ease(2.68,2.95,p),remodel:ease(2.08,2.68,p),
    adultY:40+85*emerge,adultScale:.8,
    wing:wingPreparation(Math.max(0,p-3)),
    hostOpacity:1-ease(1.45,1.92,p),
  };
}
