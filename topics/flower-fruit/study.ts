import { animateValue } from '../../src/visuals/transition.ts';
import { t } from './i18n.ts';
import { GrowthPlayback } from '../seed-sprouting/growthPlayback.ts';
import { createCherryScene } from './growthScene.ts';
import type { StudyState, PlantStudy } from '../seed-sprouting/lifecycleModel.ts';

export function mountStudy(root:HTMLElement,initial:StudyState,onChange:(state:StudyState)=>void):PlantStudy {
const el=<T extends HTMLElement>(id:string)=>root.querySelector(`#${id}`)! as T;
const scene=root.querySelector<SVGSVGElement>('#scene')!,result=el('result'),range=el<HTMLInputElement>('journey'),play=el<HTMLButtonElement>('journey-play');
const drawing=createCherryScene(scene,t),reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let shown=Math.max(0,Math.min(3,Number.isFinite(initial.progress)?initial.progress:0)),compatible=initial.compatible!==false;
const pollenHistory={compatible:compatible?shown:0,incompatible:compatible?0:shown};
const playback=new GrowthPlayback({initial:shown,reduced:()=>reduced.matches,update(value,playing){shown=value;draw(playing);}});
let closeView=false,camera=[0,0,760,530],cancelCamera:()=>void=()=>{};
el('zoom').addEventListener('click',()=>{
 cancelCamera();closeView=!closeView;scene.parentElement?.classList.toggle('detail-view',closeView);const from=[...camera],to=closeView?[469,133,264,326]:[0,0,760,530];
 el('zoom').textContent=closeView?t('返回整体'):t('放大剖面');el('zoom').setAttribute('aria-pressed',String(closeView));
 cancelCamera=animateValue({from:0,to:1,duration:650,onUpdate:p=>{camera=from.map((v,i)=>v+(to[i]!-v)*p);scene.setAttribute('viewBox',camera.join(' '));}});
});
function draw(playing=false){
 const cue=drawing.update(shown,compatible);
 const note=!compatible&&shown>=.49?t('花粉已经到达柱头，但不相容的花粉管在花柱中受阻，未完成受精；本案例不会形成种子和果实。花粉相容仍不是实际结果的唯一条件。'):cue;
 if(result.textContent!==note)result.textContent=note;
 range.value=String(Math.round(shown*1000));range.setAttribute('aria-valuetext',cue);
 play.textContent=playing?t('暂停'):reduced.matches?t('看下一步'):shown>=3?t('再看一次'):t('连续观察');play.setAttribute('aria-pressed',String(playing));
 el<HTMLButtonElement>('next').disabled=shown>=3;el<HTMLButtonElement>('pollinate').disabled=shown>0;
 onChange(read());
}
el('pollinate').addEventListener('click',()=>playback.seek(1));
el('next').addEventListener('click',()=>playback.seek(Math.min(3,Math.floor(shown)+1)));
el('reset').addEventListener('click',()=>playback.seek(0));
play.addEventListener('click',()=>{if(playback.read().playing)playback.pause();else playback.play();});
range.addEventListener('input',()=>playback.scrub(Number(range.value)/1000));
el<HTMLSelectElement>('pollen').value=compatible?'compatible':'incompatible';
el('pollen').addEventListener('change',()=>{
 playback.pause();pollenHistory[compatible?'compatible':'incompatible']=shown;
 compatible=el<HTMLSelectElement>('pollen').value==='compatible';playback.scrub(pollenHistory[compatible?'compatible':'incompatible']);
});
draw();
function read():StudyState{return {progress:shown,compatible};}
return {read,pause(){playback.pause();cancelCamera();},dispose(){playback.dispose();cancelCamera();root.replaceChildren();}};
}
