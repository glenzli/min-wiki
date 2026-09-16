export interface Settings { temperature: number; shear: number; hemisphere: 'north' | 'south' | 'equator' }
export const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
export function coriolis(latitudeDegrees: number) { return 2 * 7.292115e-5 * Math.sin(latitudeDegrees * Math.PI / 180); }
/** Qualitative favorability, explicitly not a forecast probability. */
export function favorability(settings: Settings) {
  const ocean = smooth(25, 28.5, settings.temperature), wind = 1 - smooth(6, 24, settings.shear), rotation = settings.hemisphere === 'equator' ? 0 : 1;
  return ocean * wind * rotation;
}
export const organization = (progress: number, settings: Settings) => smooth(.12, .93, progress) * favorability(settings);
export function readout(progress: number, settings: Settings) { return { value: favorability(settings) >= .5 ? 'favorable' : 'unfavorable', stage: progress < .2 ? 0 : progress < .48 ? 1 : progress < .8 ? 2 : 3, limited: favorability(settings) < .5 }; }

/** Canvas angles grow clockwise; the band winding mirrors between hemispheres. */
export function spiralAngle(radius: number, progress: number, arm: number, hemisphere: Settings['hemisphere']) {
  const direction = hemisphere === 'north' ? -1 : 1;
  return arm * Math.PI * 2 / 3 - direction * radius * .025 + direction * progress * 5;
}

export interface PlaybackState { formation:number; circulation:number; playing:boolean }
/** Development stops at maturity; transport keeps moving without resetting the storm. */
export function advance(state:PlaybackState,seconds:number,rate=1):PlaybackState {
  if(!state.playing)return state;
  const elapsed=Math.max(0,Math.min(.12,seconds))*Math.max(0,rate);
  return {...state,formation:Math.min(1,state.formation+elapsed/26),circulation:state.circulation+elapsed};
}
export function circulationDirection(hemisphere:Settings['hemisphere']){return hemisphere==='north'?-1:hemisphere==='south'?1:0;}
/** Fixed tracer IDs use independent phase/azimuth spacing; endpoint fading hides reinsertion. */
export function airParcel(index:number,time:number,hemisphere:Settings['hemisphere'],wallRadius=39) {
  const p=((time*.038+index*.7548776662466927)%1+1)%1,dir=circulationDirection(hemisphere);
  const angle=index*2.399963+dir*(p<.48?p*8:p<.72?3.84+(p-.48)*1.4:4.176-(p-.72)*2.4);
  let radius:number,height:number;
  if(p<.48){radius=230-(p/.48)*(230-wallRadius);height=5+3*p/.48;}
  else if(p<.72){const u=(p-.48)/.24;radius=wallRadius+15*u;height=8+124*smooth(0,1,u);}
  else{const u=(p-.72)/.28;radius=wallRadius+15+(222-wallRadius)*u;height=132+15*Math.sin(u*Math.PI);}
  return {x:radius*Math.cos(angle),y:height,z:radius*Math.sin(angle),opacity:smooth(0,.05,p)*(1-smooth(.94,1,p)),phase:p};
}
