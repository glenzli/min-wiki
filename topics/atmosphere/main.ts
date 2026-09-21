import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { language, languageHref, translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { AtmosphereScene } from './scene.ts';
import { AtmosphereProfiles } from './profileView.ts';
import { advanceJourney, railPosition, APPROACH_END, journeyFrame, journeyAtHeight, layerStops, parseRoute, profile, routeQuery, worlds, type View, type ComparisonWorld } from './model.ts';
import translations from './content.json';
import './style.css';

translateDocument(t);mountTopicNavigation('atmosphere');
const text=language==='en'?translations.en:translations.zh,journeyText=text.journey;
const el=(id:string)=>document.getElementById(id)!;
const input=(id:string)=>el(id) as HTMLInputElement;
const set=(id:string,value:string)=>{if(el(id).textContent!==value)el(id).textContent=value;};
let state=parseRoute(location.search),academic=false,playing=false,frame=0,last=0,lastUI=0,holdRemaining=0;
let scene:AtmosphereScene|undefined;
function createScene(){try{scene=new AtmosphereScene(el('atmo-canvas') as HTMLCanvasElement,text);el('render-error').hidden=true;draw();}catch(error){el('render-error').hidden=false;console.error(error);}}
const profiles=new AtmosphereProfiles(el('atmo-profiles'),text);
function saveRoute(){const url=new URL(location.href);for(const key of ['height','humidity','lift','wind','motion','p'])url.searchParams.delete(key);routeQuery(state).forEach((v,k)=>url.searchParams.set(k,v));history.replaceState(null,'',url);}
function stop(){holdRemaining=0;playing=false;cancelAnimationFrame(frame);frame=0;}
function readings(items:[string,string][]){const frag=document.createDocumentFragment();for(const [term,value]of items){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=term;dd.textContent=value;frag.append(dt,dd);}el('readings').replaceChildren(frag);}
function draw(){el('atmo-canvas').hidden=state.view!=='layers';if(state.view==='layers')scene?.draw(state,input('labels').checked);profiles.draw(state,input('labels').checked);}
const rail=el('height-rail');
const railTitle=document.createElement('strong');railTitle.textContent=journeyText.rail;
const track=document.createElement('div');track.className='height-track';
for(const layer of [...text.layers].reverse()){const band=document.createElement('div');band.className='height-band';band.textContent=layer.name;track.append(band);}
const marker=document.createElement('span');marker.className='height-marker';marker.textContent='◀';marker.setAttribute('aria-hidden','true');track.append(marker);
const ground=document.createElement('strong');ground.textContent='▰ '+journeyText.ground;
const note=document.createElement('small');note.textContent=journeyText.railNote;
rail.append(railTitle,track,ground,note);
function update(save=false){
 const f=journeyFrame(state.journey),layer=text.layers[f.layer];
 el('journey-visual').hidden=state.view!=='layers';el('journey-clue').hidden=state.view!=='layers';
 marker.style.bottom=`${railPosition(f.height)*100}%`;
 track.querySelectorAll('.height-band').forEach((b,i)=>b.classList.toggle('current',f.phase==='ascent'&&4-i===f.layer));
 const clueIndex=f.phase!=='ascent'||f.height<1?0:f.layer+1;
 set('journey-clue',`${holdRemaining>0?journeyText.holding:journeyText.above+' · '+f.height.toFixed(f.height<10?1:0)+' km'} — ${journeyText.clues[clueIndex]}`);
 el('world-controls').hidden=state.view!=='worlds';el('journey-controls').hidden=state.view!=='layers';
 el('transport').hidden=state.view!=='layers';el('render-error').hidden=!!scene||state.view!=='layers';
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
 document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.mode==='academic')===academic)));
 el('science').hidden=!academic;
 (el('world') as HTMLSelectElement).value=state.world;
 input('progress').value=String(state.journey*1000);set('play',playing?journeyText.pause:journeyText.play);
 set('journey-position',f.phase==='overview'?journeyText.overview:f.phase==='approach'?journeyText.approach:`${layer.name} · ${f.height.toFixed(f.height<10?1:0)} km`);
 input('progress').setAttribute('aria-valuetext',el('journey-position').textContent!);
 el('layer-stops').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(f.phase==='ascent'&&f.layer===i)));
 el('overview').setAttribute('aria-pressed',String(f.phase==='overview'));el('surface').setAttribute('aria-pressed',String(Math.abs(state.journey-APPROACH_END)<1e-6));
 const link=el('next-link') as HTMLAnchorElement;
 if(state.view==='layers'){
  set('projection',journeyText.projection);set('caution',journeyText.boundary);
  set('observation-title',f.phase==='ascent'?layer.name:journeyText.overview);
  set('observation',f.phase==='ascent'?layer.key:journeyText.overviewGuide);
  set('story-title',f.phase==='ascent'?layer.feature:journeyText.question);
  set('story',f.phase==='ascent'?layer.detail:journeyText.story);set('science',f.phase==='ascent'?layer.science:journeyText.science);
  const p=profile(f.height);
  readings(f.phase==='ascent'?[[t('观察高度'),`${f.height.toFixed(1)} km`],[t('参考温度'),p.temperature===null?t('随环境变化'):`${p.temperature.toFixed(1)} °C`],[t('参考压力'),p.pressure===null?t('未外推'):`${p.pressure<1?p.pressure.toPrecision(3):p.pressure.toFixed(1)} hPa`]]:[[journeyText.anchor,journeyText.site],[journeyText.camera,journeyText.cameraDescription]]);
  set('next-link',journeyText.compare);link.href=languageHref(`/topics/atmosphere/?view=worlds&world=${state.world}&journey=${state.journey.toFixed(6)}`);
 }else{
  const w=worlds[state.world],words=text.worlds[state.world];
  set('observation-title',words.name);set('observation',words.composition);
  readings([[t('代表地表压力'),w.pressure===null?words.pressureNote:`${w.pressure.toLocaleString(language)} hPa`],[t('代表地表温度'),w.temperature===null?words.temperatureNote:`${w.temperature} °C`],[t('云与液体'),words.cloud]]);
  set('story-title',t('用同样的问题，看不同的天空'));set('story',words.story);
  set('science',t('左右并排展示从地表到外部的代表性现象；各段分别展开，不是相同高度、厚度或密度的定量比较。地表数值为代表值，颜色和景观为教学编码，不是观测照片。'));
  set('caution',t('成分相近，不代表大气量相同。月球和土卫六是卫星；近真空不等于绝对没有粒子。'));
  set('projection',t('左边固定地球，右边选择其他世界 · 从下向上看 · 行位置不代表相同高度；底部为代表地表压力与温度'));
  set('next-link',t('到太阳系里，继续观察这个世界 →'));link.href=languageHref(`/topics/solar-system/?body=${w.worldId}&view=globe`);
 }
 draw();if(save)saveRoute();
}
function tick(now:number){
 frame=0;if(!playing||document.hidden)return;
 const dt=Math.min((now-last)/1000,.08);last=now;if(holdRemaining>0)holdRemaining=Math.max(0,holdRemaining-dt);
 else{const step=advanceJourney(state.journey,dt/55);state.journey=step.position;if(step.hold)holdRemaining=3;}
 if(state.journey===1)playing=false;
 draw();if(now-lastUI>100||!playing){update(!playing);lastUI=now;}if(playing)frame=requestAnimationFrame(tick);
}
function toggle(){if(playing){stop();update(true);return;}if(state.journey>=1)state.journey=0;playing=true;last=performance.now();frame=requestAnimationFrame(tick);update();}
function setView(view:View){stop();state.view=view;update(true);}
function seek(position:number){stop();state.journey=position;update(true);}
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view as View)));
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.addEventListener('click',()=>{academic=b.dataset.mode==='academic';update();}));
el('next-link').addEventListener('click',e=>{if(state.view==='layers'){e.preventDefault();setView('worlds');}});
el('play').addEventListener('click',toggle);el('reset').addEventListener('click',()=>seek(0));el('overview').addEventListener('click',()=>seek(0));el('surface').addEventListener('click',()=>seek(APPROACH_END));
el('progress').addEventListener('input',()=>seek(Number(input('progress').value)/1000));
el('world').addEventListener('change',()=>{state.world=(el('world') as HTMLSelectElement).value as ComparisonWorld;update(true);});
el('labels').addEventListener('change',()=>update());el('retry').addEventListener('click',createScene);
el('layer-stops').replaceChildren(...text.layers.map((layer,i)=>{const b=document.createElement('button');b.textContent=layer.name;b.addEventListener('click',()=>seek(journeyAtHeight(layerStops[i])));return b;}));
window.addEventListener('popstate',()=>{stop();state=parseRoute(location.search);update();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;saveRoute();}else if(playing){last=performance.now();frame=requestAnimationFrame(tick);}});
window.addEventListener('pagehide',e=>{cancelAnimationFrame(frame);frame=0;saveRoute();if(!e.persisted){stop();scene?.dispose();profiles.dispose();}});
window.addEventListener('pageshow',()=>{if(playing&&!frame){last=performance.now();frame=requestAnimationFrame(tick);}});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!(e.target as HTMLElement).closest('input,button,select,a,textarea,[contenteditable]')&&state.view==='layers'){e.preventDefault();toggle();}});
// Initial state is still. Reduced-motion users can select each stop without any tween.
update();createScene();saveRoute();
