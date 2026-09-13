import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { stages, stories } from './content.ts';
import { draw } from './scene.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation("rain-cycle");
const el=(id:string)=>document.getElementById(id)!;
let progress=0,condition=0,transitionFrame=0;
function cancelTransition(){cancelAnimationFrame(transitionFrame);transitionFrame=0;}
function goTo(target:number){
 cancelTransition();
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){progress=target;update();return;}
 const start=performance.now(),from=progress;
 const tick=(now:number)=>{const f=Math.min(1,(now-start)/1100);progress=from+(target-from)*(f*f*(3-2*f));update();if(f<1)transitionFrame=requestAnimationFrame(tick);else transitionFrame=0;};
 transitionFrame=requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelTransition();});
window.addEventListener('pagehide',cancelTransition);
function update(){
 const stage=Math.min(3,Math.floor(progress*4));
 el('story-title').textContent=stages[stage];el('story').textContent=stories[stage];
 (el('progress') as HTMLInputElement).value=String(Math.round(progress*1000));
 el('progress').setAttribute('aria-valuetext',stages[stage]);
 el('stages').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(stage===i)));
 (el('next') as HTMLButtonElement).disabled=stage===3;
 const result=draw(progress,condition);
 el('scene').innerHTML=result.scene;
 el('metrics').replaceChildren(...result.labels.map(label=>{const span=document.createElement('span');span.textContent=label;return span;}));
}
el('stages').replaceChildren(...stages.map((label,i)=>{const b=document.createElement('button');b.textContent=label;b.dataset.number=String(i+1);b.addEventListener('click',()=>{goTo(i/3);});return b;}));
el('progress').addEventListener('input',()=>{cancelTransition();progress=Number((el('progress') as HTMLInputElement).value)/1000;update();});
el('condition').addEventListener('change',()=>{cancelTransition();condition=Number((el('condition') as HTMLSelectElement).value);update();});
el('next').addEventListener('click',()=>{goTo(Math.min(1,(Math.floor(progress*4)+1)/3));});
el('reset').addEventListener('click',()=>{cancelTransition();progress=0;condition=0;(el('condition') as HTMLSelectElement).value='0';update();});
update();

mountReadingMode('details:not(.references)');
