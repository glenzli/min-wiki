import {mountTopicNavigation} from '../../src/platform/topicNavigation.ts';
import {translateDocument,language} from '../../src/platform/i18n.ts';
import {t} from '../hydrangea/i18n.ts';
import {mountHydrangeaStudy} from '../hydrangea/main.ts';
import {cases,readFlowerState,roses,type FlowerCase} from './model.ts';
import {FlowerScene} from './scene.ts';
import content from './content.json';
import './style.css';
const el=(id:string)=>document.getElementById(id)!;
const legacy=location.pathname.includes('/hydrangea/');
translateDocument(t);mountTopicNavigation('flower-colors');
const w=language==='en'?content.en:content.zh;
let state=readFlowerState(location.search,legacy);
let hydrangea:ReturnType<typeof mountHydrangeaStudy>|undefined;
function save(){if(!hydrangea)return;const u=new URL(location.href);u.searchParams.set('case',state.case);u.searchParams.set('rose',String(state.rose));u.searchParams.set('opening',state.opening.toFixed(4));u.searchParams.set('uv',state.uv?'1':'0');u.searchParams.set('close',state.close?'1':'0');hydrangea.save(u.searchParams);history.replaceState(null,'',u);}
hydrangea=mountHydrangeaStudy(new URLSearchParams(location.search),save);
const scene=new FlowerScene(el('flower-canvas') as HTMLCanvasElement);
const button=(text:string,action:()=>void,pressed?:boolean)=>{const b=document.createElement('button');b.textContent=text;b.onclick=action;if(pressed!==undefined)b.setAttribute('aria-pressed',String(pressed));return b;};
const change=(c:FlowerCase)=>{hydrangea?.stop();state.case=c;render();};
el('flower-cases').setAttribute('aria-label',w.title);el('flower-title').textContent=w.title;el('flower-intro').textContent=w.intro;document.title=w.title;
const sources=['https://pmc.ncbi.nlm.nih.gov/articles/PMC6379320/','','https://pmc.ncbi.nlm.nih.gov/articles/PMC3559195/','https://elifesciences.org/articles/72072'];
function render(){
 const i=cases.indexOf(state.case),isHyd=state.case==='hydrangea';el('hydrangea-study').hidden=!isHyd;el('flower-study').hidden=isHyd;
 el('flower-cases').replaceChildren(...cases.map((c,j)=>button(w.cases[j]!,()=>change(c),state.case===c)));
 el('flower-bridge').textContent=w.bridges[i]!;
 el('flower-next').textContent=i===3?w.restart:w.next;el('flower-next').onclick=()=>change(cases[(i+1)%4]!);
 if(isHyd){hydrangea?.redraw();save();return;}
 el('flower-heading').textContent=w.titles[i]!;el('flower-note').textContent=w.notes[i]!;el('flower-limit').textContent=w.limits[i]!;
 const source=el('flower-source') as HTMLAnchorElement;source.href=sources[i]!;source.textContent=w.source;
 const controls=el('flower-controls');controls.replaceChildren();
 if(state.case==='pigments'){const label=document.createElement('p');label.textContent=w.roseLabel;controls.append(label,...w.roseNames.map((name,j)=>button(name,()=>{state.rose=j;render();},state.rose===j)));}
 if(state.case==='morning'){const label=document.createElement('label');label.textContent=w.opening;const range=document.createElement('input');range.type='range';range.min='0';range.max='1';range.step='.001';range.value=String(state.opening);range.setAttribute('aria-label',w.opening);range.oninput=()=>{state.opening=Number(range.value);paint();save();};label.append(range);controls.append(label);}
 if(state.case==='guides')controls.append(button(w.human,()=>{state.uv=false;render();},!state.uv),button(w.uv,()=>{state.uv=true;render();},state.uv));
 else controls.append(button(w.whole,()=>{state.close=false;render();},!state.close),button(w.close,()=>{state.close=true;render();},state.close));
 paint();save();
}
function paint(){scene.draw(state);const key=el('flower-key');key.replaceChildren();const line=(text:string)=>{const p=document.createElement('p');p.textContent=text;key.append(p);};
 if(state.case==='pigments'){if(state.close){line(w.cell);line(w.vac+' · '+w.plastid);}for(const [label,value,color]of [[w.anth,roses[state.rose]!.anthocyanin,'#b44272'],[w.carot,roses[state.rose]!.carotenoid,'#d9aa30']] as const){const item=document.createElement('div');item.className='pigment-meter';const name=document.createElement('span');name.textContent=label;const track=document.createElement('span');track.className='pigment-track';const fill=document.createElement('i');fill.style.width=(value*100)+'%';fill.style.background=color;track.append(fill);item.append(name,track);key.append(item);}}
 if(state.case==='morning'){line(state.opening<.5?w.acid:w.lessAcid);line(w.snapshot);if(state.close){line(w.vac);line(w.ions);}}
 if(state.case==='guides')line(state.uv?w.guideKey:w.visibleKey);
 el('flower-canvas').setAttribute('aria-label',w.titles[cases.indexOf(state.case)]!+' · '+(state.close?w.cell:state.case==='guides'?(state.uv?w.uv:w.human):w.whole));}
window.addEventListener('popstate',()=>location.reload());
window.addEventListener('pagehide',e=>{hydrangea?.stop();if(!e.persisted)scene.dispose();});
render();
