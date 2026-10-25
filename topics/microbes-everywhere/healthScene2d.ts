import type {WorkspaceState} from './workspaceModel';
import {currentProgress} from './workspaceModel';
import {ramp,sampleHumanVirus,sampleInfection,sampleImmunity,sampleCare,sampleAssembly,casePathogen,type VirusKind,type HealthCase} from './healthModel';
import type words from './healthContent.json';
import {escaped as e,type WorkspaceRenderer} from './workspaceRenderer';
type Copy=typeof words.en;
type Mode='virus-cycle'|'infection'|'immunity'|'care'|'specimen';
const lerp=(a:number,b:number,p:number)=>a+(b-a)*p;
const defs=`<defs><linearGradient id="h-cell" x2=".8" y2="1"><stop stop-color="#e5c9b7"/><stop offset=".5" stop-color="#cfae9f"/><stop offset="1" stop-color="#b5958b"/></linearGradient><radialGradient id="h-nucleus"><stop stop-color="#c0a9be"/><stop offset="1" stop-color="#8f7e9d"/></radialGradient><radialGradient id="h-immune"><stop stop-color="#d9e2da"/><stop offset="1" stop-color="#91b0a3"/></radialGradient><linearGradient id="h-depth" x2="0" y2="1"><stop stop-color="#f2eee5"/><stop offset="1" stop-color="#e2d2c6"/></linearGradient><pattern id="h-fine" width="23" height="21" patternUnits="userSpaceOnUse"><path d="M2 7l4 1m7 10l3-1m-6-8l2 2" stroke="#6e7c79" stroke-opacity=".09" stroke-width=".7"/></pattern></defs>`;
function virus(x:number,y:number,r:number,kind:string,opacity=1,damaged=0,id='',inside=true){
 const enveloped=kind==='influenza',phage=kind==='phage';
 if(phage)return `<g transform="translate(${x} ${y}) scale(${r/20})" opacity="${opacity}" data-object="${id}"><path d="M-12-18L0-25 12-18 10-3 0 2-10-3Z" fill="#859eaf" stroke="#4d687e"/><path d="M0 2v26m-9-10H9m-9 0L-20 33m20-15L20 33" stroke="#6f8592" stroke-width="4" fill="none"/></g>`;
 const spikes=Array.from({length:enveloped?14:10},(_,i)=>{const a=i*Math.PI*2/(enveloped?14:10);return `<path d="M${Math.cos(a)*r} ${Math.sin(a)*r}l${Math.cos(a)*r*.23} ${Math.sin(a)*r*.23}" stroke="${enveloped?'#8b7391':'#829baf'}" stroke-width="${Math.max(2,r*.12)}" stroke-linecap="round"/>`;}).join('');
 return `<g transform="translate(${x} ${y})" opacity="${opacity}" data-object="${id}"><g opacity="${1-damaged*.78}">${spikes}<circle r="${r}" fill="${enveloped?'#b29bad':'#92a9bb'}" stroke="${enveloped?'#7c637b':'#617e97'}" stroke-width="${r*.12}"/>${inside?`<circle r="${r*.73}" fill="#d4d4cd"/><path d="M${-r*.45} 0q${r*.3} ${-r*.7} ${r*.55} 0t${r*.4} 0" fill="none" stroke="#b48b50" stroke-width="${Math.max(1.4,r*.1)}"/>`:''}</g>${damaged>0?`<path d="M${-r} ${-r*.6}l${r*.45} ${-r*.4}m${r*.9} ${r*.7}l${r*.4} ${r*.5}" stroke="#8d7c90" stroke-width="2" opacity="${damaged}"/>`:''}</g>`;
}
function bacterium(x:number,y:number,r:number,opacity=1,wall=0,id=''){
 return `<g transform="translate(${x} ${y})" opacity="${opacity}" data-object="${id}"><ellipse rx="${r*1.18}" ry="${r}" fill="#b5c6aa" stroke="#568f7d" stroke-width="${r*.18}"/><ellipse rx="${r*.94}" ry="${r*.76}" fill="#d2d6a9" stroke="#97ab7d" stroke-width="${r*.05}"/><path d="M${-r*.6} 0q${r*.3} ${-r*.65} ${r*.6} 0t${r*.6} 0" fill="none" stroke="#8873a3" stroke-width="${Math.max(1.4,r*.08)}"/>${Array.from({length:7},(_,i)=>`<circle cx="${Math.cos(i*2.4)*r*.57}" cy="${Math.sin(i*2.4)*r*.52}" r="${Math.max(1.4,r*.06)}" fill="#ab905f"/>`).join('')}${wall>0?`<path d="M${r*.88} ${-r*.62}a${r*1.18} ${r} 0 0 1 ${r*.02} ${r*1.22}" stroke="#efe9df" stroke-width="${r*.22}" stroke-dasharray="${r*.1} ${r*.08+wall*r*.3}" fill="none" opacity="${wall}"/>`:''}</g>`;
}
function offspring(x:number,y:number,r:number,kind:Exclude<VirusKind,'phage'>,opacity:number,release:number,id:string){const a=sampleAssembly(kind,release);if(kind==='norovirus')return virus(x,y,r,kind,opacity,0,id);return `<g data-object="${id}" data-envelope="${a.envelope.toFixed(3)}"><path d="M${x-r*.65} ${y}q${r*.4}-${r*.9} ${r*.75} 0t${r*.6} 0" fill="none" stroke="#b68e4e" stroke-width="2.5" opacity="${opacity*(1-a.envelope)}"/>${virus(x,y,r,kind,opacity*a.envelope)}</g>`;}
function immuneCell(x:number,y:number,r:number,type='phagocyte',opacity=1){
 const outline=type==='phagocyte'?`M${-r} 0C${-r*1.2} ${-r*.5} ${-r*.3} ${-r*1.2} ${r*.2} ${-r}S${r*1.2} ${-r*.5} ${r} ${r*.2}S${r*.2} ${r*1.3} ${-r*.4} ${r*.8}S${-r*1.2} ${r*.5} ${-r} 0Z`:`M${-r} 0a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 ${-r*2} 0`;
 return `<g transform="translate(${x} ${y})" opacity="${opacity}" data-immune="${type}"><path d="${outline}" fill="url(#h-immune)" stroke="#6d9485" stroke-width="2.5"/><path d="M${-r*.47} ${-r*.25}q${r*.6} ${-r*.45} ${r*.85} 0t${-r*.12} ${r*.65}q${-r*.7} ${r*.22} ${-r*.73} ${-r*.65}" fill="#8f829e" opacity=".85"/><circle cx="${r*.55}" cy="${r*.25}" r="${r*.09}" fill="#becac0"/></g>`;
}
function antibody(x:number,y:number,rotation=0,opacity=1){return `<path data-compartment="extracellular" d="M0 10V0L-8-8M0 0L8-8" transform="translate(${x} ${y}) rotate(${rotation})" fill="none" stroke="#b28a43" stroke-width="4" stroke-linecap="round" opacity="${opacity}"/>`;}
function cell(x:number,site:HealthCase,target=false){
 const top=192,bottom=397,w=110;
 return `<g ${target?'data-host-cell="true"':''}><path d="M${x-w/2} ${top}Q${x} ${top-10} ${x+w/2} ${top}L${x+w/2-7} ${bottom-12}Q${x} ${bottom+12} ${x-w/2+7} ${bottom-12}Z" fill="url(#h-cell)" stroke="#987f78" stroke-width="2"/><ellipse cx="${x}" cy="322" rx="27" ry="32" fill="url(#h-nucleus)" stroke="#927c96"/><circle cx="${x-7}" cy="324" r="9" fill="#a593aa"/><path d="M${x-40} 247q20-20 30 4t23 3m-12 86q-22-11-20 9t22 12m-45-65q14-9 16 2t-13 10" fill="none" stroke="#b1978a" stroke-width="3"/>${Array.from({length:site==='airway'?10:16},(_,i)=>{const px=x-47+i*(site==='airway'?10:6);return `<path d="M${px} 190q3-${site==='airway'?11:4} ${site==='airway'?2:0}-${site==='airway'?18:7}" stroke="#aa9380" stroke-width="2" fill="none"/>`;}).join('')}</g>`;
}
function tissue(site:HealthCase,entry='entered'){
 if(site==='wound'){
 const cells=Array.from({length:7},(_,row)=>Array.from({length:11},(_,i)=>{const x=i*64-(row%2)*30,y=200+row*31;return `<rect x="${x}" y="${y}" width="61" height="29" rx="11" fill="${row<2?'#cfb494':'#d5bbaa'}" stroke="#b49681" stroke-opacity=".65"/><ellipse cx="${x+30}" cy="${y+15}" rx="7" ry="3.5" fill="#ac909d" opacity="${row<2?.15:.65}"/>`;}).join('')).join('');
 return `<defs><mask id="h-wound"><rect width="650" height="500" fill="white"/>${entry==='entered'?'<path d="M298 182L349 184 338 245 357 278 329 328 301 305 320 257Z" fill="black"/>':''}</mask></defs><path d="M0 192Q325 180 650 195V500H0Z" fill="#d1b5a1"/>${entry==='entered'?'<path d="M298 182L349 184 338 245 357 278 329 328 301 305 320 257Z" fill="#927b6f" opacity=".8"/>':''}<g mask="url(#h-wound)">${cells}</g><path d="M0 440q100-23 210 0t210-1 230 0" fill="none" stroke="#bd8986" stroke-width="12" opacity=".6"/>`;
 }
 return `<path d="M0 397H650V500H0Z" fill="#d7c0af"/>${[105,215,325,435,545].map(x=>cell(x,site,x===325)).join('')}<path d="M0 166Q80 151 175 166T340 166 500 166 650 166V184Q540 178 450 185T230 184 0 186Z" fill="#b5c6b6" opacity=".3"/><path d="M0 446q100-24 200 0t210 0 240 0" fill="none" stroke="#bc8583" stroke-width="12" opacity=".56"/><rect width="650" height="500" fill="url(#h-fine)" pointer-events="none"/>`;
}
function releasePoint(i:number,p:number){const start={x:301+(i%3)*24,y:247+Math.floor(i/3)*35};if(p<.5)return {x:lerp(start.x,325,p*2),y:lerp(start.y,181,p*2)};return{x:lerp(325,125+i*80,(p-.5)*2),y:lerp(181,70-(i%2)*20,(p-.5)*2)};}
export class HealthScene2D implements WorkspaceRenderer {
 private svg:SVGSVGElement;private dynamic:SVGGElement;private legend:HTMLElement;private key='';
 constructor(private host:HTMLElement,private copy:Copy,private mode:Mode){
  host.innerHTML=`<svg class="micro-health-svg" viewBox="0 0 650 500" role="img"><title></title>${defs}<rect width="650" height="500" fill="url(#h-depth)"/><g data-static></g><g data-dynamic></g></svg><div class="micro-scene-legend"></div>`;
  host.classList.add('micro-mechanism');this.svg=host.querySelector('svg')!;this.dynamic=this.svg.querySelector('[data-dynamic]')!;this.legend=host.querySelector('.micro-scene-legend')!;
 }
 render(s:WorkspaceState){const p=currentProgress(s),kind=s.virus,site=s.healthCase;const copy=this.copy;
  const key=[this.mode,site,s.entry,s.care,kind,s.form,s.cutaway].join(':');
  if(key!==this.key){this.key=key;const base=this.svg.querySelector('[data-static]')!;
   if(this.mode==='specimen')base.innerHTML='';
   else if(this.mode==='care'&&['wash','alcohol'].includes(s.care))base.innerHTML=`<path d="M0 315Q130 292 250 315T500 315L650 307V500H0Z" fill="#c7ab8d"/><path d="M0 322q130-25 250-2t250 0 150-10" stroke="#a98e76" fill="none" stroke-width="3"/><rect y="330" width="650" height="170" fill="url(#h-fine)"/>`;
   else if(this.mode==='care'&&s.care!=='antiviral'&&s.care!=='symptoms')base.innerHTML='<rect width="650" height="500" fill="url(#h-fine)"/>';
   else base.innerHTML=tissue(this.mode==='virus-cycle'?(kind==='norovirus'?'gut':'airway'):site,this.mode==='care'?'entered':s.entry);
   const keys=this.mode==='care'?(s.care==='wash'?['surface','removed']:s.care==='alcohol'?['surface']:s.care==='vaccine'?['training','antigen']:s.care==='symptoms'?['inside','present']:['inside','drug']):this.mode==='immunity'&&s.entry==='blocked'?['barrier']:this.mode==='immunity'?(s.healthCase==='wound'?['phagocyte','antibody','plasma']:['phagocyte','antibody','tcell','plasma']):this.mode==='specimen'?['genome']:this.mode==='virus-cycle'?['genome','hostRibosomes','proteinParts','offspring']:this.mode==='infection'&&s.healthCase==='wound'?['barrier','toxin']:['barrier','genome','offspring'];
   this.legend.innerHTML=keys.map(key=>`<span data-legend="${key}"><i></i>${e(copy.legend[key as keyof Copy['legend']])}</span>`).join('');
  }
  // Camera framing consumes the same progress; it never relocates tissue or microbes.
  let frame=[0,0,650,500];
  if(s.healthClose&&this.mode!=='specimen'){
   let target=[90,75,470,400];
   if(this.mode==='virus-cycle'){const focus=ramp(.06,.3,p)*(1-ramp(.8,1,p));target=[lerp(0,210,focus),lerp(0,128,focus),lerp(650,230,focus),lerp(500,280,focus)];}
   else if(this.mode==='infection'){const focus=ramp(.08,.38,p);target=s.healthCase==='wound'?[lerp(0,190,focus),lerp(0,150,focus),lerp(650,270,focus),lerp(500,250,focus)]:[lerp(0,215,focus),lerp(0,140,focus),lerp(650,220,focus),lerp(500,280,focus)];if(p>.78){const wide=ramp(.78,1,p);target=target.map((v,i)=>lerp(v,frame[i]!,wide));}}
   else if(this.mode==='care')target=s.care==='wash'||s.care==='alcohol'?[125,130,400,245]:s.care==='vaccine'?[35,90,565,300]:s.care==='antibiotic'?[90,45,470,410]:[150,110,410,340];
   frame=target;
  }
  this.svg.setAttribute('viewBox',frame.join(' '));
  this.svg.querySelector('[data-host-cell]')?.setAttribute('opacity','1');
  if(this.mode==='specimen')this.drawSpecimen(s);
  else if(this.mode==='virus-cycle')this.drawCycle(s,p);
  else if(this.mode==='infection')this.drawInfection(s,p);
  else if(this.mode==='immunity')this.drawImmune(s,p);
  else this.drawCare(s,p);
  this.svg.setAttribute('aria-label',`${copy.chapters[s.chapter]}. ${s.chapter==='viruses'?copy.viruses[s.virus]:copy.cases[site]}. ${copy.ui.common}`);
  this.host.dataset.scene=this.mode;this.host.dataset.progress=p.toFixed(3);
 }
 private drawSpecimen(s:WorkspaceState){
  if(s.chapter==='bacteria'){
   if(s.form==='coccus')this.dynamic.innerHTML='<circle cx="325" cy="250" r="115" fill="#78aa94" stroke="#4a8271" stroke-width="7"/>';
   else if(s.form==='spiral')this.dynamic.innerHTML='<path d="M110 275c22-160 76-160 99-20s80 142 104 0 80-140 104 0 80 136 106-25" fill="none" stroke="#5a9886" stroke-width="35" stroke-linecap="round"/>';
   else this.dynamic.innerHTML=`<g transform="translate(325 250)"><rect x="-205" y="-85" width="410" height="170" rx="85" fill="#78aa94" stroke="#4a8271" stroke-width="9"/>${s.cutaway?`<rect x="-194" y="-74" width="388" height="148" rx="74" fill="#c9cda2" stroke="#9eaf77" stroke-width="5"/>`: ''}${s.cutaway?`<path d="M-130-8q30-60 55 0t55 0 55 0 55 0" fill="none" stroke="#8a71a1" stroke-width="8"/>${Array.from({length:24},(_,i)=>`<ellipse cx="${Math.sin(i*9.1)*145}" cy="${Math.cos(i*4.1)*48}" rx="5" ry="4" fill="#ae8d58"/>`).join('')}`:''}</g>`;
  }else if(s.virus==='phage')this.dynamic.innerHTML=`${virus(325,210,100,'phage')}${s.cutaway?'<path d="M293 132q18-35 33 0t30 0-30 34-30-34" fill="none" stroke="#b58d50" stroke-width="5"/>':''}`;
  else{const genome=s.virus==='influenza'?Array.from({length:8},(_,i)=>`<path data-segment="${i}" d="M${270+i%4*30} ${208+Math.floor(i/4)*46}q7-15 13 0t13 0" fill="none" stroke="#b58d50" stroke-width="4"/>`).join(''):'<path d="M268 210q35-50 54-4t37 10-21 48-27-41-33 34" fill="none" stroke="#b58d50" stroke-width="5"/>';this.dynamic.innerHTML=`${virus(325,235,125,s.virus,1,0,'specimen',s.cutaway)}${s.cutaway?`<circle cx="325" cy="235" r="96" fill="#e8e2d1"/>${genome}`:''}`;}
 }
 private drawCycle(s:WorkspaceState,p:number){
  if(s.virus==='phage')return;const q=sampleHumanVirus(s.virus,p,s.entry);const cy=q.copySite==='nucleus'?320:250;
  const parentX=lerp(160,325,q.attached),parentY=lerp(66,173,q.attached);
  let art=virus(parentX,parentY,19,s.virus,1-q.entered);
  art+=`<path data-genome="parent" d="M${lerp(325,312,q.entered)} ${lerp(177,cy,q.entered)}q15-16 23 0t20 0" stroke="#b68e4e" stroke-width="3" fill="none" opacity="${q.entered}"/>`;
  for(let i=0;i<8;i++){const x=305+(i%3)*13,y=cy-17+Math.floor(i/3)*13;art+=`<path d="M${x} ${y}q8-8 13 0" stroke="#b68e4e" stroke-width="2" fill="none" opacity="${ramp(.36+i*.02,.43+i*.02,p)*q.copied}"/>`;}
  // Protein production uses the host's ribosomes; these are not viral organelles.
  art+=`<g data-machinery="host-ribosomes"><ellipse cx="286" cy="275" rx="8" ry="5" fill="#bc9c69"/><ellipse cx="286" cy="269" rx="10" ry="6" fill="#cdb487"/><ellipse cx="358" cy="277" rx="8" ry="5" fill="#bc9c69"/><ellipse cx="358" cy="271" rx="10" ry="6" fill="#cdb487"/></g>`;
  for(let i=0;i<7;i++){const made=ramp(.38+i*.025,.47+i*.025,p),move=ramp(.45,.72,p),fromX=i%2?358:286,x=lerp(fromX,303+i%3*21,move),y=lerp(270,215+Math.floor(i/3)*13,move);art+=`<path data-component="protein-${i}" d="M-4-3L3-4 5 2-2 4Z" transform="translate(${x} ${y})" fill="#7c93ad" opacity="${made*(1-q.assembled*.85)}"/>`;}
  for(let i=0;i<6;i++){const pos=releasePoint(i,q.released),birth=ramp(.61+i*.022,.69+i*.022,p)*q.assembled;art+=offspring(pos.x,pos.y,12,s.virus,birth,q.released,`offspring-${i}`);}
  if(q.assembled>0&&s.virus==='influenza')art+=`<path d="M302 188q23-${q.released*17+4} 46 0" fill="none" stroke="#9b7f93" stroke-width="4" opacity="${q.assembled}"/>`;
  this.dynamic.innerHTML=art;this.host.dataset.copySite=q.copySite;this.host.dataset.released=q.released.toFixed(3);
 }
 private drawInfection(s:WorkspaceState,p:number){const q=sampleInfection(s.healthCase,p,s.entry),pathogen=casePathogen[s.healthCase];
  let art='';for(let i=0;i<7;i++){let x=lerp(70+i*75,245+i*26,q.arrival),y=lerp(65+(i%2)*24,148,q.arrival);if(s.entry==='blocked'){x=lerp(x,80+i*75,ramp(.3,1,p));y=lerp(y,77+(i%2)*16,ramp(.3,1,p));}art+=pathogen==='staph'?bacterium(x,y,12,1-q.entry*.8,0,`arrival-${i}`):virus(x,y,12,pathogen,1-q.entry*.8,0,`arrival-${i}`);}
  if(q.viral){const cy=s.healthCase==='airway'?320:250;art+=`<path d="M305 ${cy}q15-18 27 0t23 0" fill="none" stroke="#b18b50" stroke-width="3" opacity="${q.entry}"/>`;for(let i=0;i<6;i++){const pos=releasePoint(i,ramp(.78,1,p));art+=offspring(pos.x,pos.y,12,pathogen as 'influenza'|'norovirus',ramp(.43+i*.035,.52+i*.035,p)*q.multiplication,ramp(.78,1,p),`new-${i}`);}}
  else{for(let i=0;i<7;i++)art+=bacterium(328+Math.sin(i*2.4)*7,225+i*10,10,ramp(.42+i*.035,.51+i*.035,p)*q.multiplication,0,`new-${i}`);for(let i=0;i<8;i++){const a=i*Math.PI/4,x=325+Math.cos(a)*q.toxin*90,y=270+Math.sin(a)*q.toxin*55;art+=`<path data-product="tissue-damaging" d="M-4 3L0-4 5 3Z" transform="translate(${x} ${y})" fill="#a56b69" opacity="${q.toxin}"/>`;}}
  art+=`<ellipse cx="325" cy="378" rx="${82+q.inflammation*35}" ry="57" fill="#bd796b" opacity="${q.inflammation*.22}"/><path d="M286 198l15 11-9 12m63-8 15 9-8 14" fill="none" stroke="#a36d66" stroke-width="4" opacity="${q.injury}"/>`;
  this.dynamic.innerHTML=art;this.host.dataset.inflammation=q.inflammation.toFixed(3);this.host.dataset.multiplication=q.multiplication.toFixed(3);
 }
 private drawImmune(s:WorkspaceState,p:number){const q=sampleImmunity(s.healthCase,p,s.memory,s.entry),pathogen=casePathogen[s.healthCase],targetY=q.viral?132:246;
  let art='';if(!q.admitted){this.dynamic.innerHTML=(q.viral?virus(lerp(150,480,ramp(.2,1,p)),110,19,pathogen):bacterium(lerp(150,480,ramp(.2,1,p)),140,20));this.host.dataset.clearance='0';return;}
  art+=q.viral?virus(205,targetY,19,pathogen,1-q.innate*.7):bacterium(323,targetY,18,1-q.innate*.7);
  const phagoX=lerp(560,q.viral?208:328,q.innate),phagoY=lerp(421,targetY+6,q.innate);
  art+=immuneCell(phagoX,phagoY,37,'phagocyte',ramp(.1,.22,p));
  // The swallowed reference is inside a membrane-bound phagosome, not erased at contact.
  if(q.innate>.7){const swallowed=(q.innate-.7)/.3;art+=`<circle cx="${phagoX-5}" cy="${phagoY-2}" r="16" fill="#c7d3bc" stroke="#8ba68d" opacity="${swallowed}"/>${q.viral?virus(phagoX-5,phagoY-2,8,pathogen,swallowed*(1-ramp(.6,.9,p))):bacterium(phagoX-5,phagoY-2,8,swallowed*(1-ramp(.6,.9,p)))}`;}
  const freeX=q.viral?485:354,freeY=q.viral?125:258;
  art+=q.viral?virus(freeX,freeY,17,pathogen,1-q.antibodies*.45):bacterium(freeX,freeY,15,1-q.clearance*.7);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;art+=antibody(freeX+Math.cos(a)*27,freeY+Math.sin(a)*27,a*180/Math.PI+90,q.antibodies);}
  art+=immuneCell(115,438,26,'plasma-cell',q.antibodies);
  if(q.viral){art+=`<path d="M304 287q15-18 25 0t20 0" fill="none" stroke="#b28c51" stroke-width="3" opacity="${ramp(.1,.25,p)*(1-q.tCell)}"/>`;
   art+=immuneCell(lerp(554,328,q.tCell),424,26,'T-cell',ramp(s.memory?.45:.68,s.memory?.6:.8,p));
   this.svg.querySelector('[data-host-cell]')?.setAttribute('opacity',String(1-q.tCell));
   if(q.tCell>.5)art+=`<g opacity="${(q.tCell-.5)*2}"><path d="M312 350l9 8m20-5 6-9m-18-35 9 2" stroke="#b3a19c" stroke-width="6"/></g>`;
  }else art+=immuneCell(lerp(590,353,q.antibodies),lerp(440,259,q.antibodies),31,'phagocyte',q.antibodies);
  this.dynamic.innerHTML=art;this.host.dataset.clearance=q.clearance.toFixed(3);this.host.dataset.antibodies=q.antibodies.toFixed(3);this.host.dataset.tcell=q.tCell.toFixed(3);
 }
 private drawCare(s:WorkspaceState,p:number){const q=sampleCare(s.care,s.healthCase,p,s.resistant);let art='';
  if(s.care==='wash'||s.care==='alcohol'){
   for(let i=0;i<9;i++){const leaves=i===3||i===4?0:q.removal,x=lerp(70+i*62,760+i*18,leaves),y=lerp(284+(i%2)*5,185-i%3*18,leaves);art+=q.bacterial?bacterium(x,y,13,1-q.inactivation*.75,q.inactivation,`resident-${i}`):virus(x,y,13,q.pathogen,1-q.inactivation*.6,q.inactivation,`resident-${i}`);}
   if(s.care==='wash')for(let i=0;i<5;i++)art+=`<path d="M${-170+p*500+i*50} ${225+i*11}q125-22 250 0t250 0" fill="none" stroke="#97b8c7" stroke-width="${i%2?3:6}" opacity="${ramp(0,.25,p)*.5}"/>`;
   else for(let i=0;i<12;i++)art+=`<ellipse cx="${50+i*48}" cy="${lerp(94+(i%3)*13,282,ramp(0,.6,p))}" rx="7" ry="11" fill="#b7c8d0" opacity="${.45*(1-ramp(.7,1,p))}"/>`;
  }else if(s.care==='antibiotic'){
   art=q.bacterial?bacterium(330,250,94,1-q.wallSynthesisBlocked*.25,q.wallSynthesisBlocked,'drug-target'):virus(330,250,100,q.pathogen,1,0,'drug-no-target');
   for(let i=0;i<8;i++){const a=i*Math.PI/4,x=lerp(325+Math.cos(a)*240,325+Math.cos(a)*115,ramp(.05,.55,p)),y=lerp(250+Math.sin(a)*190,250+Math.sin(a)*100,ramp(.05,.55,p));art+=`<rect x="${x}" y="${y}" width="15" height="8" rx="3" fill="#7c9db4"/>`;}
  }else if(s.care==='antiviral'){
   for(let i=0;i<(q.targetMatches?3:6);i++){const r=q.targetMatches?ramp(.3,.8,p)*.58:ramp(.5,.95,p),pos=q.targetMatches?{x:lerp(301+i*24,295+i*30,ramp(.3,.8,p)),y:lerp(247,172,ramp(.3,.8,p))}:releasePoint(i,r);art+=q.bacterial?bacterium(260+i*27,246,12):offspring(pos.x,pos.y,12,q.pathogen as 'influenza'|'norovirus',ramp(.2,.5,p),r,`drug-offspring-${i}`);if(q.targetMatches)art+=`<path d="M${pos.x} ${pos.y+12}L${pos.x} 190" stroke="#a58c91" stroke-width="2" opacity="${q.releaseBlocked}"/>`;}
   for(let i=0;i<5;i++)art+=`<rect x="${280+i*20}" y="${182+Math.sin(i)*6}" width="10" height="7" rx="2" fill="#7c9db4" opacity="${ramp(.1,.45,p)}"/>`;
  }else if(s.care==='symptoms'){
   art=`<ellipse cx="325" cy="345" rx="130" ry="92" fill="#c78070" opacity="${.25*(1-q.symptomRelief*.75)}"/>`;
   for(let i=0;i<4;i++)art+=q.bacterial?bacterium(320+(i%2)*9,231+i*20,10,1,0,`unchanged-${i}`):offspring(294+i*21,255,12,q.pathogen as 'influenza'|'norovirus',1,0,`unchanged-${i}`);if(!q.bacterial)art+=virus(230,138,15,q.pathogen);
   art+=`<path d="M545 250v80a15 15 0 1 1-22 0v-80a11 11 0 0 1 22 0Z" fill="#f1eee5" stroke="#9d8e89" stroke-width="3"/><path d="M534 334v-${18+(1-q.symptomRelief)*54}" stroke="#c58b7a" stroke-width="7" stroke-linecap="round"/>`;
  }else{
   art+=immuneCell(155,247,58,'antigen-presenting');
   // A protein-pattern symbol represents antigen, not a whole replicating virus.
   art+=`<path d="M88 125l21 8 7-22 18 16-10 21 13 19-22 5-17-17-16 2Z" fill="#a28aa5" opacity="${1-ramp(.35,.55,p)*.75}"/>`;
   art+=`<path d="M222 250H400m-14-10 14 10-14 10" fill="none" stroke="#a29a87" stroke-width="3" stroke-dasharray="6 6" opacity="${q.memoryTrained}"/>`;
   art+=immuneCell(467,247,44,'memory-B',q.memoryTrained)+immuneCell(535,302,31,'memory-T',q.memoryTrained);
   art+=antibody(457,230,0,q.memoryTrained);
  }
  this.dynamic.innerHTML=art;this.host.dataset.targetMatches=String(q.targetMatches);this.host.dataset.actionLocation=q.location;this.host.dataset.removal=q.removal.toFixed(3);this.host.dataset.inactivation=q.inactivation.toFixed(3);
 }
 pause(){}
 dispose(){this.host.classList.remove('micro-mechanism');this.host.replaceChildren();}
}
