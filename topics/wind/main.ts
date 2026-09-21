import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountTopicLearning } from '../../src/platform/learning/mount.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { createSession, readRoute, selectWorld, resetCurrent, advanceSession, type World, type Lens, type Camera } from './session.ts';
import { describe, stages } from './observation.ts';
import { AirJourney } from './airJourney.ts';
import { StormScale } from './stormScale.ts';
import { SceneSlot } from './sceneSlot.ts';
import { t } from './i18n.ts';
import './style.css';
translateDocument(t);mountTopicNavigation('wind',{learning:false});
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const input=(id:string)=>el<HTMLInputElement>(id);
const text=(id:string,value:string)=>{if(el(id).textContent!==value)el(id).textContent=value;};
const s=createSession();Object.assign(s,readRoute(location.search,location.hash));
let frame=0,last=0,lastText=0,disposed=false,abort=new AbortController(),learningMounted=false,cancelHeat=()=>{};
let heatTarget:number|null=null;
const slot=new SceneSlot(el('scene-host'),status=>{el('scene-status').hidden=status==='ready';el('retry').hidden=status!=='error';text('scene-status',status==='error'?t('画面暂时无法显示，仍可阅读讲解。'):t('正在准备画面…'));});
const journey=new AirJourney(el('air-journey'),running=>{s.lens='flow';s.traces=true;s.camera='side';if(s.world==='typhoon')s.typhoon.section=true;s.playing=running&&!matchMedia('(prefers-reduced-motion: reduce)').matches;controls();writeRoute();slot.camera(s);update();play();},world=>{s.lens='flow';s.traces=true;s.camera='side';if(world==='typhoon')s.typhoon.section=true;void changeWorld(world,true);},()=>{s.camera='top';s.typhoon.section=false;controls();slot.camera(s);update();el('scene-host').scrollIntoView({block:'center',behavior:'instant'});});
const stormScale=new StormScale(el('storm-scale'));
function writeRoute(){const url=new URL(location.href);url.searchParams.set('world',s.world);url.searchParams.set('lens',s.lens);if(!['#narration','#academic-notes','#learning-companion'].includes(url.hash))url.hash='';history.replaceState(null,'',url);}
function controls(){
  input('heat').value=String(Math.round(s.coast.heat*100));el<HTMLSelectElement>('obstacle').value=s.coast.obstacle;
  input('temperature').value=String(s.typhoon.settings.temperature);input('typhoon-shear').value=String(s.typhoon.settings.shear);el<HTMLSelectElement>('hemisphere').value=s.typhoon.settings.hemisphere;el<HTMLSelectElement>('structure').value=s.typhoon.structure;input('replacement').value=String(s.typhoon.replacement*1000);input('section').checked=s.typhoon.section;
  input('tornado-shear').value=String(s.tornado.settings.shear*100);input('updraft').value=String(s.tornado.settings.updraft*100);input('condensation').checked=s.tornado.settings.condensation;
  input('traces').checked=s.traces;
}
function update(){
  const c=describe(s);text('world-intro',c.intro);text('scale-note',c.scale);text('scene-badge',c.badge);text('scene-caption',c.caption);text('readout',c.readout);text('condition-note',c.condition);
  text('story-title',c.title);text('story',c.body);text('observe',c.watch);text('science',c.science);text('science-limit',c.limit);
  text('story-kicker',s.lens==='cause'?t('形成条件'):s.lens==='flow'?t('气流路径'):t('影响与力量'));
  el('science-panel').hidden=!s.academic;
  for(const w of ['coast','typhoon','tornado'])el(`${w}-controls`).hidden=w!==s.world;
  el('camera-controls').hidden=s.world==='tornado';el('formation').hidden=s.world==='coast';el('scrub').hidden=s.world==='coast';
  el('replacement-controls').hidden=s.typhoon.structure!=='replacement';
  text('heat-value',Math.abs(s.coast.heat)<.01?t('海陆受热相近'):s.coast.heat>0?t('陆地较暖 · 海风'):t('陆地较冷 · 陆风'));
  text('temperature-value',`${s.typhoon.settings.temperature} °C`);text('typhoon-shear-value',`${s.typhoon.settings.shear} m/s`);text('tornado-shear-value',`${Math.round(s.tornado.settings.shear*100)} / 100`);text('updraft-value',`${Math.round(s.tornado.settings.updraft*100)} / 100`);
  text('play',s.playing?t('暂停观察'):t('开始观察'));el('play').setAttribute('aria-pressed',String(s.playing));
  text('play-status',s.playing?(s.world==='coast'&&Math.abs(s.coast.heat)<.01?t('本例环流静止'):t('空气仍在运动')):t('已暂停'));
  if(s.world!=='coast')input('progress').value=String(Math.round(s[s.world].progress*1000));
  for(const [key,value] of [['world',s.world],['lens',s.lens],['camera',s.camera],['mode',s.academic?'academic':'kids'],['part',s.typhoon.feature]])document.querySelectorAll<HTMLButtonElement>(`[data-${key}]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===value)));
  const stageNames=stages(s);el('stage-buttons').hidden=!stageNames.length;
  if(el('stage-buttons').dataset.world!==s.world){el('stage-buttons').replaceChildren(...stageNames.map((name,i)=>{const b=document.createElement('button');b.textContent=name;b.addEventListener('click',()=>{if(s.world==='coast')return;s[s.world].progress=[0,.3,.6,1][i];s.playing=false;stop();update();});return b;}));el('stage-buttons').dataset.world=s.world;}
  if(s.world!=='coast')el('stage-buttons').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===(s[s.world as 'typhoon'|'tornado'].progress<(s.world==='tornado'?.22:.2)?0:s[s.world as 'typhoon'|'tornado'].progress<.48?1:s[s.world as 'typhoon'|'tornado'].progress<.8?2:3))));
  slot.describe(s,`${c.title} — ${c.caption}`);slot.draw(s);journey.update(s);
}
function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
function tick(now:number){frame=0;if(!s.playing||document.hidden||disposed)return;advanceSession(s,last?(now-last)/1000:0);last=now;if(now-lastText>160){update();lastText=now;}else{slot.draw(s);journey.update(s);}frame=requestAnimationFrame(tick);}
function play(){stop();if(s.playing&&!document.hidden)frame=requestAnimationFrame(tick);}
async function loadLearning(){
  if(learningMounted)return;learningMounted=true;abort.abort();abort=new AbortController();el('learning-host').replaceChildren();
  const id='wind';
  try{await mountTopicLearning(id,{host:el('learning-host'),signal:abort.signal});}catch(error){console.error(error);}
}
async function changeWorld(world:World,scroll=false){cancelHeat();if(heatTarget!==null){s.coast.heat=heatTarget;heatTarget=null;}selectWorld(s,world);stop();controls();writeRoute();update();void loadLearning();await slot.select(s);update();if(scroll)el('scene-host').scrollIntoView({block:'center',behavior:'instant'});}
document.querySelectorAll<HTMLButtonElement>('[data-world],[data-compare]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.compare)s.lens='flow';void changeWorld((b.dataset.world??b.dataset.compare) as World,Boolean(b.dataset.compare));}));
document.querySelectorAll<HTMLButtonElement>('[data-lens]').forEach(b=>b.addEventListener('click',()=>{s.lens=b.dataset.lens as Lens;writeRoute();update();}));
document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(b=>b.addEventListener('click',()=>{s.camera=b.dataset.camera as Camera;slot.camera(s);update();}));
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.addEventListener('click',()=>{s.academic=b.dataset.mode==='academic';update();}));
document.querySelectorAll<HTMLButtonElement>('[data-part]').forEach(b=>b.addEventListener('click',()=>{s.typhoon.feature=s.typhoon.feature===b.dataset.part?'none':b.dataset.part!;s.lens='flow';writeRoute();update();}));
input('heat').addEventListener('input',()=>{cancelHeat();heatTarget=null;s.coast.heat=Number(input('heat').value)/100;update();});
document.querySelectorAll<HTMLButtonElement>('[data-heat]').forEach(b=>b.addEventListener('click',()=>{cancelHeat();heatTarget=Number(b.dataset.heat)/100;cancelHeat=animateValue({from:s.coast.heat,to:heatTarget,duration:650,onUpdate:v=>{s.coast.heat=v;input('heat').value=String(Math.round(v*100));update();},onComplete:()=>{heatTarget=null;}});}));
el('obstacle').addEventListener('change',()=>{s.coast.obstacle=el<HTMLSelectElement>('obstacle').value as typeof s.coast.obstacle;update();});
for(const [id,key] of [['temperature','temperature'],['typhoon-shear','shear']] as const)input(id).addEventListener('input',()=>{s.typhoon.settings[key]=Number(input(id).value);update();});
el('hemisphere').addEventListener('change',()=>{s.typhoon.settings.hemisphere=el<HTMLSelectElement>('hemisphere').value as typeof s.typhoon.settings.hemisphere;update();});
el('structure').addEventListener('change',()=>{s.typhoon.structure=el<HTMLSelectElement>('structure').value as typeof s.typhoon.structure;update();});
input('replacement').addEventListener('input',()=>{s.typhoon.replacement=Number(input('replacement').value)/1000;update();});input('section').addEventListener('change',()=>{s.typhoon.section=input('section').checked;update();});
for(const [id,key] of [['tornado-shear','shear'],['updraft','updraft']] as const)input(id).addEventListener('input',()=>{s.tornado.settings[key]=Number(input(id).value)/100;update();});
input('condensation').addEventListener('change',()=>{s.tornado.settings.condensation=input('condensation').checked;update();});input('traces').addEventListener('change',()=>{s.traces=input('traces').checked;update();});
el('play').addEventListener('click',()=>{s.playing=!s.playing;update();play();});el('reset').addEventListener('click',()=>{cancelHeat();heatTarget=null;resetCurrent(s);stop();controls();update();});
el('formation').addEventListener('click',()=>{if(s.world==='coast')return;s[s.world].progress=0;s[s.world].time=0;s.lens='cause';s.playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;writeRoute();update();play();});
input('progress').addEventListener('input',()=>{if(s.world==='coast')return;s.playing=false;stop();s[s.world].progress=Number(input('progress').value)/1000;update();});
el('retry').addEventListener('click',()=>void slot.select(s));
window.addEventListener('popstate',()=>{const route=readRoute(location.search,location.hash);s.lens=route.lens;void changeWorld(route.world);});
window.addEventListener('hashchange',()=>{if(['#origin','#coast','#flow','#effects','#storms','#typhoon','#tornado'].includes(location.hash)){const route=readRoute('',location.hash);s.lens=route.lens;void changeWorld(route.world);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();cancelHeat();}else play();});
window.addEventListener('pagehide',event=>{stop();cancelHeat();if(!event.persisted){disposed=true;abort.abort();slot.dispose();stormScale.dispose();}});window.addEventListener('pageshow',()=>{if(!disposed)play();});
controls();writeRoute();update();void slot.select(s).then(update);void loadLearning();
