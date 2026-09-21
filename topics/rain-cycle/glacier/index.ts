import copy from './content.json';
import { MAX_YEARS, glacierState, normalizeClimate, presets, type Climate, type Scenario } from './model.ts';
import { glacierPicture, budgetPicture, layerPicture } from './scene.ts';
import './style.css';

export interface GlacierStudy { setActive(active:boolean):void; dispose():void; }
/** Owns one bounded, initially paused study. It never edits the parent's watershed state. */
export function mountGlacierStudy(host:HTMLElement,language:'zh'|'en'):GlacierStudy {
 const text=copy[language],root=document.createElement('section');root.className='glacier-study';
 root.innerHTML=`<header><p class="glacier-eyebrow">WATER · ICE · TIME</p><h2>${text.title}</h2><p>${text.intro}</p></header>
 <div class="glacier-presets" role="group" aria-label="${text.controls}">${Object.entries(text.presets).map(([id,label])=>`<button type="button" data-preset="${id}" aria-pressed="${id==='growth'}">${label}</button>`).join('')}</div>
 <div class="glacier-workspace"><div class="glacier-landscape"><svg data-role="scene" viewBox="80 145 365 220" role="img" aria-label="${text.title}"></svg><p class="glacier-key">${text.front} · ${text.traces}</p><div class="glacier-playback"><button type="button" data-role="play" aria-pressed="false">${text.play}</button><output data-role="time"></output><button type="button" data-role="reset">${text.reset}</button></div><label class="glacier-timeline">${text.years}<input data-role="progress" type="range" min="0" max="4000" step="1" value="0"></label></div>
 <aside class="glacier-controls"><label>${text.snowfall}<output data-role="snow-value"></output><input data-role="snow" type="range" aria-label="${text.snowfall}" min="0" max="3" step=".1" value="1.6"></label><label>${text.warmth}<output data-role="warm-value"></output><input data-role="warm" type="range" aria-label="${text.warmth}" min="0" max="3" step=".05" value=".45"></label><label class="glacier-check"><input type="checkbox" data-role="warming">${text.warming}</label><p>${text.unit}</p><p data-role="season"></p></aside></div>
 <div class="glacier-metrics" aria-label="${text.historyTitle}"></div><p class="glacier-equation" data-role="equation"></p>
 <p>${text.conditionNote}</p><section class="glacier-story"><h3 data-role="status"></h3><p data-role="explanation"></p></section>
 <div class="glacier-analysis"><section><h3>${text.annual}</h3><p data-role="annual-values"></p><svg data-role="budget" viewBox="0 0 600 160" role="img" aria-label="${text.annualLegend}"></svg><p>${text.annualLegend}</p></section><section class="glacier-column"><div><h3>${text.layerTitle}</h3><p>${text.layerNote}</p><p>${text.stores.snow} · ${text.stores.firn} · ${text.stores.ice}</p></div><svg data-role="layers" viewBox="0 0 280 255" role="img" aria-label="${text.layerNote}"></svg></section></div>
 <details><summary>${text.disclosure}</summary><p>${text.boundary}</p><h3>${text.sources}</h3><ul><li><a href="https://nsidc.org/learn/parts-cryosphere/glaciers/science-glaciers">NSIDC · Science of glaciers</a></li><li><a href="https://pubs.usgs.gov/fs/2009/3046/">USGS · Glacier mass balance</a></li></ul></details>`;
 host.append(root);
 const el=(role:string)=>root.querySelector<HTMLElement>(`[data-role="${role}"]`)!;
 const input=(role:string)=>el(role) as HTMLInputElement;
 const events=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');
 let climate:Climate={...presets.growth},time=0,active=true,playing=false,disposed=false,frame=0,last=0,lastPaint=0,preset:Scenario|null='growth';
 const on=(target:EventTarget,name:string,fn:EventListener)=>target.addEventListener(name,fn,{signal:events.signal});
 function stop(){playing=false;cancelAnimationFrame(frame);frame=0;}
 function render(){
  if(disposed)return;const state=glacierState(time,climate),status=state.retreating?'retreating':state.activeIce?'growing':state.stores.firn>0?'firn':'bare';
  el('scene').innerHTML=glacierPicture(state,climate);el('budget').innerHTML=budgetPicture(state);el('layers').innerHTML=layerPicture(state);
  el('time').textContent=`${time.toFixed(1)} / ${MAX_YEARS} ${text.year}`;input('progress').value=String(Math.round(time*100));input('progress').setAttribute('aria-valuetext',`${time.toFixed(1)} ${text.year}`);
  input('snow').value=String(climate.snowfall);el('snow-value').textContent=climate.snowfall.toFixed(1);input('warm').value=String(climate.warmth);el('warm-value').textContent=climate.warmth.toFixed(2);input('warming').checked=climate.warmAfterTwenty;
  el('season').textContent=text.season[state.season];el('play').textContent=playing?text.pause:time>=MAX_YEARS?text.replay:text.play;el('play').setAttribute('aria-pressed',String(playing));
  el('status').textContent=text.status[status];el('explanation').textContent=text.explain[status];
  const metrics:[[string,number],[string,number],[string,number],[string,number],[string,number],[string,number]]=[[text.input,state.input],[text.loss,state.loss],[text.stores.snow,state.stores.snow],[text.stores.firn,state.stores.firn],[text.stores.ice,state.stores.ice],[text.balance,state.current.net]];
  root.querySelector('.glacier-metrics')!.replaceChildren(...metrics.map(([label,value])=>{const card=document.createElement('div'),span=document.createElement('span'),strong=document.createElement('strong');span.textContent=label;strong.textContent=value.toFixed(2);card.append(span,strong);return card;}));
  el('equation').textContent=`${text.retained}: ${state.input.toFixed(2)} − ${state.loss.toFixed(2)} = ${state.total.toFixed(2)} (${text.unit})`;
  el('annual-values').textContent=text.annualValues.replace('{{input}}',state.current.input.toFixed(2)).replace('{{loss}}',state.current.loss.toFixed(2)).replace('{{net}}',state.current.net.toFixed(2));
  root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.preset===preset)));
 }
 function tick(now:number){
  frame=0;if(disposed||!active||!playing||document.hidden)return;
  time=Math.min(MAX_YEARS,time+Math.min(.08,(now-last)/1000)*1.05);last=now;
  if(now-lastPaint>=45||time>=MAX_YEARS){render();lastPaint=now;}
  if(time>=MAX_YEARS){stop();render();}else frame=requestAnimationFrame(tick);
 }
 on(el('play'),'click',()=>{if(!active)return;if(playing){stop();render();return;}if(time>=MAX_YEARS)time=0;if(motion.matches){time=MAX_YEARS;render();return;}playing=true;last=performance.now();render();frame=requestAnimationFrame(tick);});
 on(el('reset'),'click',()=>{stop();time=0;render();});
 on(input('progress'),'input',()=>{stop();time=Number(input('progress').value)/100;render();});
 for(const role of ['snow','warm','warming'])on(input(role),role==='warming'?'change':'input',()=>{stop();climate=normalizeClimate({snowfall:Number(input('snow').value),warmth:Number(input('warm').value),warmAfterTwenty:input('warming').checked});preset=null;render();});
 root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button=>on(button,'click',()=>{stop();preset=button.dataset.preset as Scenario;climate={...presets[preset]};render();}));
 on(document,'visibilitychange',()=>{if(document.hidden){stop();render();}});
 on(window,'pagehide',()=>{stop();});
 on(motion,'change',()=>{stop();render();});
 render();
 return {setActive(value){if(disposed)return;active=value;if(!active)stop();render();},dispose(){if(disposed)return;stop();disposed=true;events.abort();root.remove();}};
}
