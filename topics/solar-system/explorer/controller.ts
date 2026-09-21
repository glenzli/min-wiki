import { PLANETS_DATA, SUN_DATA } from '../data/planetsData.ts';
import { language, languageHref } from '../../../src/platform/i18n.ts';
import { ExplorerScene, profileFor } from './scene.ts';
import { sitesFor, siteFor, interiorMotion, isBody, canView, parentOf, SATELLITES, worldFor, descentState, type BodyId, type ExploreView } from './model.ts';
import bodies from './bodies.json';
import moonContent from './moons.json';
import ui from './ui.json';
import rings from './rings.json';
import { ringView, ringPeriodHours } from './ringsModel.ts';
import motions from './motions.json';
import fidelity from './fidelity.json';
import type { Bilingual } from '../../planet-surfaces/interior.ts';
import './style.css';
const text=(p:Bilingual)=>language==='en'?p.en:p.zh;
const u=(key:keyof typeof ui)=>text(ui[key]);
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const moonText=moonContent as Record<string,{name:Bilingual;fact:Bilingual}>;
export class ExplorerController {
  body:BodyId='earth';view:ExploreView='globe';active=false;
  private scene?:ExplorerScene;
  private siteKey='';
  private siteSelect=document.createElement('select');
  private siteBar=document.createElement('div');
  private progress=0;private time=0;private travel=false;
  private activity=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  private academic=false;private suspended=false;
  private selectedMoon='';private lastStage='';private labels=new Map<string,HTMLElement>();
  constructor(private select:(body:string)=>void){
    const ringButton=document.createElement('button');ringButton.dataset.exploreView='rings';ringButton.textContent=u('rings');document.querySelector('.explorer-views')!.append(ringButton);
    this.siteBar.className='explorer-site';
    const label=document.createElement('label');label.textContent=u('sites');
    this.siteSelect.id='explorer-site';this.siteSelect.setAttribute('aria-label',u('sites'));label.append(this.siteSelect);
    const note=document.createElement('span');note.id='explorer-site-location';this.siteBar.append(label,note);
    document.querySelector('.explorer-views')!.after(this.siteBar);
    this.siteSelect.onchange=()=>{this.siteKey=siteFor(this.body,this.siteSelect.value).id;this.progress=0;this.travel=false;this.writeUrl();this.update();};
    el('explorer-back').onclick=()=>this.select('');
    el('explorer-parent').onclick=()=>{const parent=parentOf(this.body);if(parent)this.select(parent);};
    document.querySelectorAll<HTMLButtonElement>('[data-explore-view]').forEach(b=>b.onclick=()=>this.switchView(b.dataset.exploreView as ExploreView));
    el('activity-play').onclick=()=>{this.activity=!this.activity;this.update();};
    el('descent-play').onclick=()=>{if(this.progress>=1)this.progress=0;this.travel=!this.travel;this.update();};
    el('descent-reset').onclick=()=>{this.progress=0;this.travel=false;this.update();};
    el<HTMLInputElement>('explorer-progress').oninput=e=>{this.progress=Number((e.target as HTMLInputElement).value)/1000;this.travel=false;this.update();};
  }
  private ensureScene(){
    if(this.scene)return;
    try{this.scene=new ExplorerScene(el<HTMLCanvasElement>('explorer-canvas'));this.scene.onFailure=()=>{el('explorer-error').hidden=false;this.activity=false;this.travel=false;this.update();};}
    catch{el('explorer-error').hidden=false;}
  }
  open(body:BodyId,view:ExploreView='globe'){
    const params=new URLSearchParams(location.search);this.siteKey=siteFor(body,params.get('body')===body?params.get('site'):undefined).id;
    this.siteSelect.replaceChildren(...sitesFor(body).map(site=>{const option=document.createElement('option');option.value=site.id;option.textContent=text(site.name);return option;}));
    this.active=true;this.body=body;this.progress=0;this.travel=false;this.selectedMoon='';
    el('explorer').hidden=false;document.body.classList.add('exploring');this.ensureScene();this.switchView(canView(body,view)?view:'globe');
  }
  close(){this.active=false;this.travel=false;el('explorer').hidden=true;document.body.classList.remove('exploring');this.writeUrl();}
  setAcademic(value:boolean){this.academic=value;if(this.active)this.update();}
  toggleActivity(){this.activity=!this.activity;this.update();}
  suspend(value:boolean){this.suspended=value;}
  private writeUrl(){const url=new URL(location.href);if(this.active){url.searchParams.set('body',this.body);url.searchParams.set('view',this.view);url.searchParams.set('site',this.siteKey);}else{url.searchParams.delete('body');url.searchParams.delete('view');url.searchParams.delete('site');}history.replaceState(null,'',url);}
  private switchView(view:ExploreView){
    this.view=view;this.travel=false;this.progress=0;this.lastStage='';this.writeUrl();
    const list=SATELLITES[this.body]??[];this.labels.clear();el('moon-labels').replaceChildren();el('explorer-moons').replaceChildren();
    if(view==='moons')list.forEach(moon=>{
      const button=document.createElement('button');button.textContent=text(moonText[moon.id].name);button.onclick=()=>{this.selectedMoon=moon.id;this.update();};button.dataset.moon=moon.id;el('explorer-moons').append(button);
      const label=button.cloneNode(true) as HTMLButtonElement;label.onclick=button.onclick;el('moon-labels').append(label);this.labels.set(moon.id,label);
    });
    if(view==='rings')for(const [id,name] of Object.entries(rings.labels)){const label=document.createElement('span');label.className='ring-label';label.textContent=text(name);label.hidden=true;el('moon-labels').append(label);this.labels.set(id,label);}
    this.update();
  }
  private update(){
    if(!this.active)return;const data=bodies[this.body],profile=profileFor(this.body),section=this.view==='section',descent=this.view==='descent',moons=this.view==='moons',ring=this.view==='rings';
    const site=siteFor(this.body,this.siteKey),local=this.view==='landscape';
    this.siteBar.hidden=section||moons||ring;this.siteSelect.value=site.id;
    el('explorer-site-location').textContent=`${Math.abs(site.latitude)}°${site.latitude<0?'S':'N'} · ${Number((((site.longitude%360)+360)%360).toFixed(2))}°E`;
    const parent=parentOf(this.body);el('explorer-parent').hidden=!parent;el('explorer-parent').textContent=parent?text(bodies[parent].name)+' /':'';
    el('explorer-name').textContent=text(data.name);el('explorer-title').textContent=text(data.title);
    el('activity-play').textContent=u(this.activity?'pause':'resume');el('activity-play').setAttribute('aria-pressed',String(this.activity));
    document.querySelectorAll<HTMLButtonElement>('[data-explore-view]').forEach(b=>{const v=b.dataset.exploreView as ExploreView;b.hidden=!canView(this.body,v);b.setAttribute('aria-pressed',String(v===this.view));if(v==='landscape')b.textContent=u(this.body==='sun'?'sunClose':worldFor(this.body)?.surface?'surface':'gasClose');});
    el('explorer-travel').hidden=!(section||descent);el('explorer-moons').hidden=!moons;
    el('explorer-progress-label').textContent=u(section?'interiorProgress':'descentProgress');
    el('explorer-progress').setAttribute('aria-label',u(section?'interiorProgress':'descentProgress'));
    el('descent-play').textContent=u(section?(this.travel?'pauseInterior':'interiorTravel'):this.travel?'pauseTravel':this.progress>=1?'replay':this.progress>0?'continue':this.body==='sun'?'sunTravel':'begin');
    el('explorer-scale').textContent=u(section?'sectionScale':descent?'descentScale':this.body==='sun'?'sunScale':this.view==='landscape'?'localScale':'scale');
    el('explorer-hint').textContent=u(section?'sectionHint':descent?'travelHint':this.body==='sun'?'sunHint':'gesture');
    el('explorer-context').textContent=u(section?'section':descent?'descentProgress':moons?'moons':'activity');
    const layer=profile.layers.find(l=>this.progress<1-l.inner)??profile.layers.at(-1)!;
    const stage=descentState(this.body,this.progress).stage;
    el('explorer-stage').textContent=section?text(layer.name):descent?text(data.stages[stage].title):moons?u('moons'):text(data.name);
    el('explorer-description').textContent=section?text(this.academic?layer.science:layer.kids):descent?text(data.stages[stage].text):moons?(SATELLITES[this.body]?.length?u('moonIntro'):u('none')):text(data.description);
    el('explorer-detail').textContent=section?u(layer.uncertain?'uncertain':'model')+' · '+text(profile.evidence):moons?u('selected'):'';
    if(this.view==='globe'){const planet=PLANETS_DATA.find(p=>p.id===this.body);if(planet)el('explorer-detail').textContent=this.academic?planet.academicFact:planet.quickFact;}
    const metrics=el('explorer-metrics');metrics.replaceChildren();metrics.hidden=this.view!=='globe';
    if(this.view==='globe'){
      const planet=PLANETS_DATA.find(p=>p.id===this.body);
      const pairs: [string,string][]=[];
      if(planet){el('explorer-context').textContent=planet.typeZh;pairs.push([u('diameter'),planet.diameterKm.toLocaleString()+' km'],[u('year'),planet.orbitalPeriodDays+' '+u('days')],[u('spin'),Math.abs(planet.rotationHours)+' '+u('hours')+(planet.rotationHours<0?' · '+u('retrograde'):'')]);}
      else if(this.body==='sun'){el('explorer-context').textContent=u('star');pairs.push([u('diameter'),SUN_DATA.diameterKm.toLocaleString()+' km']);}
      for(const [label,value] of pairs){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;metrics.append(dt,dd);}
    }
    if(!section&&!moons&&!ring){
      if(local||descent){el('explorer-stage').textContent=text(site.name);el('explorer-description').textContent=descent?text(site.stages[stage]!.text):text(site.description);}
      el('explorer-detail').textContent=text(site.description)+(local||descent?' · '+u('siteModel'):'');
      if(local||descent)el('explorer-detail').textContent=u(worldFor(this.body)?.surface?'siteModel':'atmosphereModel');
    }
    if(this.view==='globe')el('explorer-detail').textContent=text(fidelity[this.body].note);
    if(section)el('explorer-detail').textContent=text(motions[interiorMotion(this.body,layer)])+' '+u('flowModel')+' '+text(profile.evidence);
    const source=el<HTMLAnchorElement>('explorer-source');source.href=moons?'https://ssd.jpl.nasa.gov/sats/elem/':section?profile.sources[0]!.url:this.view==='globe'?fidelity[this.body].source:site.source;
    const steps=el('explorer-steps');steps.replaceChildren();
    if(section)profile.layers.forEach((l,i)=>{const b=document.createElement('button'),dot=document.createElement('i');dot.style.background=l.color;b.append(dot,text(l.name));b.setAttribute('aria-pressed',String(l.id===layer.id));b.onclick=()=>{this.progress=i===profile.layers.length-1?1:1-(l.inner+l.outer)/2;this.travel=false;this.update();};steps.append(b);});
    else if(descent)site.stages.forEach((s,i)=>{const b=document.createElement('button');b.textContent=`0${i+1} · ${text(s.title)}`;b.setAttribute('aria-pressed',String(stage===i));b.onclick=()=>{this.progress=i===3?1:i/4;this.travel=false;this.update();};steps.append(b);});
    const further=el<HTMLAnchorElement>('explorer-further');further.hidden=true;
    if(this.body==='moon'||(this.body==='earth'&&moons)){further.href=languageHref('/topics/earth-moon/');further.textContent=u('phases');further.hidden=false;}
    if(moons&&this.selectedMoon){const moon=(SATELLITES[this.body]??[]).find(m=>m.id===this.selectedMoon)!;el('explorer-stage').textContent=text(moonText[moon.id].name);el('explorer-description').textContent=text(moonText[moon.id].fact);el('explorer-detail').textContent=`${u('period')} ${moon.period} ${u('days')} · ${u('diameter')} ${Number((moon.radius*2).toFixed(1))} km`;
      if(isBody(moon.id)){const b=document.createElement('button');b.textContent=u('enter');b.onclick=()=>this.open(moon.id as BodyId);steps.append(b);}
    }
    if(ring){const selected=rings.views.find(v=>v.id===ringView(this.progress))!;
      el('explorer-title').textContent=text(rings.title);el('explorer-context').textContent=text(rings.context);el('explorer-stage').textContent=text(selected.title);el('explorer-description').textContent=text(this.academic?selected.science:selected.kids);el('explorer-detail').textContent=text(selected.detail);el('explorer-scale').textContent=text(rings.scale);el('explorer-hint').textContent=text(rings.hint);source.href=selected.source;
      if(selected.id==='motion')el('explorer-detail').textContent+=` ${text(rings.labels.inner)}: ${ringPeriodHours(95000).toFixed(1)} h · ${text(rings.labels.outer)}: ${ringPeriodHours(130000).toFixed(1)} h`;
      rings.views.forEach((v,i)=>{const b=document.createElement('button');b.textContent=text(v.title);b.setAttribute('aria-pressed',String(v===selected));b.onclick=()=>{this.progress=i/3;this.update();};steps.append(b);});
    }
    el('explorer-moons').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.moon===this.selectedMoon)));
    this.lastStage=section?layer.id:String(stage);this.syncProgress();this.render();
  }
  private syncProgress(){el<HTMLInputElement>('explorer-progress').value=String(Math.round(this.progress*1000));el('explorer-progress-text').textContent=`${Math.round(this.progress*100)}%`;}
  private render(){this.scene?.set(this.body,this.view,this.progress,this.time,this.siteKey);if(this.view==='moons'||this.view==='rings'){for(const label of this.labels.values())label.hidden=true;for(const point of this.scene?.labels()??[]){const label=this.labels.get(point.id);if(label){label.hidden=!point.visible;label.style.left=`${point.x*100}%`;label.style.top=`${point.y*100}%`;}}}}
  tick(dt:number){if(!this.active||this.suspended||document.hidden)return;if(this.activity)this.time+=dt;if(this.travel){this.progress=Math.min(1,this.progress+dt/32);const profile=profileFor(this.body),stage=this.view==='section'?(profile.layers.find(l=>this.progress<1-l.inner)??profile.layers.at(-1)!).id:String(descentState(this.body,this.progress).stage);if(this.progress===1){this.travel=false;this.update();}else if(stage!==this.lastStage)this.update();this.syncProgress();}this.render();}
  dispose(){this.scene?.dispose();}
}
