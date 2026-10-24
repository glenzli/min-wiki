import {evolutionAppearance,evolutionState,recognitionRadius,RSUN_AU,TRACKS,type Track} from './evolutionModel.ts';
import {StellarSurface} from './stellarSurface.ts';
import {drawFormation,formationVisual} from './formationScene.ts';
import words from './evolutionContent.json';
import {stellarSpaceFrame} from './spaceModel.ts';

type Text=(value:{zh:string;en:string})=>string;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
function paintSurface(c:CanvasRenderingContext2D,surface:StellarSurface,x:number,y:number,r:number,track:Track,progress:number,time:number){
 const appearance=evolutionAppearance(track,progress),phase=evolutionState(track,progress).phaseCoordinate,limb=.004+.012*clamp((phase-3.1)/.9);
 const {surfaceColor:color,compactBlend:blend,emission,glare,photosphereProfile}=appearance;
 c.save();const inheritedAlpha=c.globalAlpha;
 if(blend<1){c.globalAlpha=inheritedAlpha*(1-blend);surface.draw(c,x,y,r,color,time,limb,0,photosphereProfile,emission,glare);}
 if(blend>0){c.globalAlpha=inheritedAlpha*blend;surface.draw(c,x,y,r,color,time,0,0,'compact',emission,glare);}c.restore();
}
/** Radius and orbit geometry share a scale. The nebula and detail window are explicitly illustrative. */
export function drawEvolution(c:CanvasRenderingContext2D,track:Track,progress:number,surfaceTime:number,text:Text,surface:StellarSurface,minFont:number){
 const state=evolutionState(track,progress),p=state.phaseCoordinate,solar=track==='solar',low=track==='low-mass',center:[number,number]=[282,280],orbitUnit=148,tail=state.remnantProgress*state.remnantProgress*(3-2*state.remnantProgress);
 const label=(value:string,x:number,y:number,fill='#d8e4ec')=>{c.fillStyle=fill;c.font=`500 ${Math.max(16,minFont)}px system-ui`;c.textAlign='center';c.fillText(value,x,y,470);};
 const leftRadius=solar?state.radiusSolar*RSUN_AU*orbitUnit:low?state.radiusSolar*184:state.radiusSolar/900*184;
 const model=TRACKS[track],maxEnvelope=model.anchors[4]!.radiusSolar,mainRadius=model.anchors[2]!.radiusSolar;
 c.strokeStyle='#40586b';c.lineWidth=1;c.beginPath();c.moveTo(542,52);c.lineTo(542,510);c.stroke();
 if(solar){
  label(text(p<1.8?words.ui.formationScale:words.ui.solarSystem),280,48,'#aec4d2');
  if(p>=1.5){const visibility=clamp((p-1.5)/.7);c.save();c.globalAlpha=visibility*visibility*(3-2*visibility);
  for(const [i,orbit]of [.387,.723,1,1.524].entries()){
   const radius=orbit*orbitUnit,engulfed=i===0?state.mercuryEngulfed:i===1?state.venusEngulfed:false;
   c.strokeStyle=engulfed?'#b67f73b5':'#789aad83';c.lineWidth=i===2?1.6:1;c.setLineDash(engulfed?[4,5]:[]);c.beginPath();c.arc(center[0],center[1],radius,0,Math.PI*2);c.stroke();c.setLineDash([]);
   const angle=[-2.35,-.45,.88,2.42][i]!,x=center[0]+Math.cos(angle)*radius,y=center[1]+Math.sin(angle)*radius;
   if(!engulfed){c.fillStyle=i===2?'#80c9dc':'#d6c3a3';c.beginPath();c.arc(x,y,i===2?5:3,0,Math.PI*2);c.fill();}
   const name=text([words.ui.mercury,words.ui.venus,words.ui.earth,words.ui.mars][i]!);
   label(name+(engulfed?' ×':''),x+(i===0?-18:0),y+(i===1?24:-12),engulfed?'#c29486':'#c5d4dd');
  }c.restore();}
 }else{label(`${state.massSolar} M☉`,280,48,'#aec4d2');
  if(p>=1.65){c.strokeStyle='#8199ad99';c.beginPath();c.moveTo(188,486);c.lineTo(372,486);c.moveTo(188,480);c.lineTo(188,492);c.moveTo(372,480);c.lineTo(372,492);c.stroke();label(low?'1 R☉':'900 R☉',280,513,'#a8bac5');}}
 // Keep the last expanded envelope as a stable reference while the compact center emerges.
 if(p>=5&&!low){const before=solar?maxEnvelope*RSUN_AU*orbitUnit:maxEnvelope/900*184;
  c.save();c.globalAlpha=.32+.34*clamp(p-5);c.strokeStyle='#e2ab85';c.lineWidth=1.5;c.setLineDash([5,6]);c.beginPath();c.arc(...center,before,0,Math.PI*2);c.stroke();c.setLineDash([]);c.restore();
  label(text(words.ui.formerEnvelope),280,83,'#d9ac91');
 }
 // The cloud, disk, bipolar outflow and growing core retain one center through the transition.
 if(p<2.13)drawFormation(c,center[0],center[1],178,p,surfaceTime);
 // After the envelope is shed, an expanding shell remains around the same center.
 if(p>(solar?4.58:5.02)&&!low){const frame=stellarSpaceFrame({chapter:'evolution',track,progress,nebula:'nursery',illumination:'emission'});
  const before=solar?maxEnvelope*RSUN_AU*orbitUnit:maxEnvelope/900*184,outer=before+(frame.shellRadius-(solar?2.1:2.35))*46;
  for(let j=0;j<3;j++){const opacity=frame.shellOpacity*(.12+.88*frame.shellEmission)/(j+1);c.strokeStyle=solar?`rgba(128,209,202,${.43*opacity})`:`rgba(237,167,112,${.5*opacity})`;c.lineWidth=8-j*2;c.beginPath();c.arc(center[0],center[1],outer*(1+j*.10),0,Math.PI*2);c.stroke();}}
 if(p<6&&leftRadius>=1.5&&p>=1.38){c.save();c.globalAlpha=formationVisual(p).surface;paintSurface(c,surface,...center,Math.min(225,leftRadius),track,progress,surfaceTime);c.restore();}
 else if(p>=1.55&&(p<6||state.remnant==='white-dwarf')){c.save();c.globalAlpha=formationVisual(p).surface;c.strokeStyle=state.surfaceColor;c.lineWidth=1.5;c.beginPath();c.moveTo(center[0]-6,center[1]);c.lineTo(center[0]+6,center[1]);c.moveTo(center[0],center[1]-6);c.lineTo(center[0],center[1]+6);c.stroke();c.restore();}
 if(state.remnant==='black-hole'&&p>=5.8){c.save();c.globalAlpha=clamp((p-5.8)/.2);c.fillStyle='#020711';c.strokeStyle='#b4c3cf';c.lineWidth=1;c.beginPath();c.arc(...center,4.5,0,Math.PI*2);c.fill();c.stroke();c.restore();}
 if(p>=6&&state.remnant==='neutron-star'){c.fillStyle='#d7efff';c.beginPath();c.arc(...center,3.5,0,Math.PI*2);c.fill();}
 if(solar&&state.mercuryEngulfed){label(state.venusEngulfed?`${text(words.ui.mercury)} / ${text(words.ui.venus)} ${text(words.ui.inside)}`:`${text(words.ui.mercury)} ${text(words.ui.inside)}`,280,538,'#e9b796');}
 if(!solar&&!low&&p>=5)label(`${text(words.ui.mainSequence)} ${mainRadius} R☉ → ${text(words.ui.lateEnvelope)} ${maxEnvelope} R☉`,280,538,'#c9d5de');
 label(text(p<2?words.ui.formationDetail:words.ui.magnified),790,48,'#aec4d2');
 // This view enlarges small phases nonlinearly, but every resolved stellar radius
 // still grows in the same direction as the physical radius on the left.
 {const detailRadius=recognitionRadius(track,state.radiusSolar),reference=recognitionRadius(track,mainRadius);
  if(p<2.13){drawFormation(c,790,268,153,p,surfaceTime);label(text(p<.58?words.ui.cloud:p<1.18?words.ui.accreting:words.ui.diskClears),790,440);}
  if(p>=2){c.save();c.strokeStyle='#9bafc599';c.lineWidth=1.2;c.setLineDash([4,6]);c.beginPath();c.arc(790,268,reference,0,Math.PI*2);c.stroke();c.restore();label(text(words.ui.mainReference),790,101,'#9bb2bf');}
  const darkening=state.remnant==='black-hole'?clamp((p-5.8)/.2):0;
  if(p>=1.38&&p<6&&darkening<1){c.save();c.globalAlpha=(1-darkening)*formationVisual(p).surface;paintSurface(c,surface,790,268,detailRadius,track,progress,surfaceTime);c.restore();}
  if(state.remnant==='black-hole'&&p>=5.8){c.save();c.globalAlpha=darkening;
   c.fillStyle='#020711';c.strokeStyle='#b7c9d2';c.lineWidth=1.6;c.beginPath();c.arc(790,268,8,0,Math.PI*2);c.fill();c.stroke();
   c.beginPath();c.moveTo(762,268);c.lineTo(777,268);c.moveTo(803,268);c.lineTo(818,268);c.moveTo(790,240);c.lineTo(790,255);c.moveTo(790,281);c.lineTo(790,296);c.stroke();
   c.restore();
  }else if(p>=6)paintSurface(c,surface,790,268,detailRadius,track,progress,surfaceTime);
  if(p>=3&&p<6)label(text(low&&state.coreFuel>0?words.ui.mainSequence:words.ui.exhausted),790,440);
  else if(p>=6)label(text(state.remnant==='black-hole'?words.ui.blackHoleNoDisk:state.remnant==='neutron-star'?words.ui.neutronDiameter:words.ui.remnant),790,440);
 }
 if(p>=(solar?4.58:5.02)&&p<6&&!low)label(text(words.ui.dispersal),790,488,'#b9d3db');
}
