import { t } from './i18n.ts';
import { canGerminate, allowedGrowth } from './lifecycleModel.ts';
import { GrowthPlayback } from './growthPlayback.ts';
import { createBeanScene } from './growthScene.ts';
import type { StudyState, PlantStudy } from './lifecycleModel.ts';

export function mountStudy(root:HTMLElement,initial:StudyState,onChange:(state:StudyState)=>void):PlantStudy {
const el=<T extends Element>(id:string)=>root.querySelector(`#${id}`)! as T;
const result=el<HTMLElement>('result'),range=el<HTMLInputElement>('stage'),play=el<HTMLButtonElement>('growth-play');
const scene=createBeanScene(el<SVGSVGElement>('scene'),t);
let shownGrowth=Math.max(0,Math.min(3,Number.isFinite(initial.progress)?initial.progress:0)),reachedGrowth=shownGrowth,soilKey='';
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
function conditionsOkay(){return canGerminate(el<HTMLSelectElement>('water').value,el<HTMLSelectElement>('air').value,el<HTMLSelectElement>('temp').value);}
function drawSoilInset(water:string,air:string,temp:string,stage:number){
  // A separate, qualitative close-up of the soil around this bean: pore size,
  // water content and oxygen dots are not measurements or particle tracks.
  const grainPositions:Array<[number,number,number,number]>=[[28,32,24,17],[84,26,25,14],[151,30,29,18],[22,94,29,19],[87,99,26,16],[155,94,31,22],[57,66,21,14],[123,65,22,15]];
  const grains=grainPositions.map(([x,y,rx,ry],i)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${['#a48360','#ba9870','#81664c','#9a7958'][i%4]}" stroke="#65503e" stroke-width="1.5"/>`).join('');
  const waterFilm=water==='dry'?'':water==='damp'?`<g fill="none" stroke="#9bd5d5" stroke-width="4" stroke-linecap="round" opacity=".85"><path d="M30 51 Q48 44 64 51 M95 47 Q108 40 126 48 M53 110 Q69 103 84 113 M118 107 Q134 102 143 111"/></g>`:`<rect width="184" height="126" fill="#73beca" opacity=".58"/>`;
  const oxygen=air==='yes'&&water!=='flood'?`<g fill="#f1faf7" font-family="system-ui" font-size="11" font-weight="700"><text x="43" y="85">O₂</text><text x="107" y="92">O₂</text><text x="132" y="54">O₂</text></g>`:`<text x="105" y="83" fill="#f1faf7" opacity=".45" font-family="system-ui" font-size="11" font-weight="700">O₂</text>`;
  const cracks=water==='dry'?`<g fill="none" stroke="#e7d0a1" stroke-width="1.5" opacity=".78"><path d="M71 8 l-8 10 7 5 -4 8 M111 105 l-7 8 5 13"/></g>`:'';
  el<SVGSVGElement>('soil-inset-art').innerHTML=`<rect width="184" height="126" rx="12" fill="#302a25"/>${grains}${waterFilm}${cracks}${oxygen}<rect x="1" y="1" width="182" height="124" rx="11" fill="none" stroke="#fff5dc" stroke-opacity=".55" stroke-width="2"/>`;
  el('soil-inset-caption').textContent=water==='dry'?t('孔隙有空气，种子却缺水'):water==='flood'?t('孔隙被水占据，氧气难进入'):air==='no'?t('有水膜，氧气仍不足'):t('水膜和空气孔隙同时存在');
  el('water-state').textContent=water==='dry'?t('缺水'):water==='flood'?t('积水'):t('湿润');
  el('air-state').textContent=water==='flood'||air==='no'?t('供应不足'):t('可以到达');
  el('temp-state').textContent=temp==='cold'?t('偏冷'):t('适宜');
  el('mechanism').textContent=water==='dry'?t('干土缺少吸胀所需的水；本图不计算含水率。已经出现的根与叶只暂停后续生长，不会退回种子。'):water==='flood'?t('种子吸水仍需氧气维持细胞呼吸。积水可减少土壤气相孔隙，使氧供应受限；本图把缺氧简化为暂停，不预测腐烂或存活。'):air==='no'?t('即使土壤湿润，如果周围氧气供应不足，种子的呼吸和后续生长仍会受限。本图不计算氧浓度，把限制简化为暂停。'):temp==='cold'?t('温度影响代谢反应速度；这里用暂停表示偏冷，不表示所有种子在低温下完全停止，也不是实际发芽天数。'):[t('水进入种子后，代谢重新活跃；子叶中的储备支持胚最初的生长。孔隙图只示意水与空气共存。'),t('胚根先突破种皮，随后伸入土壤吸水；这段相册不按真实天数计时。'),t('胚轴逐渐伸长，把子叶抬起；画面保留同一株菜豆的根与芽。'),t('真叶展开后，幼苗可进行光合作用，但达到开花成熟还需要继续生长与适宜环境。')][stage]!;
}

const playback=new GrowthPlayback({initial:shownGrowth,reduced:()=>reduced.matches,
 allowed:requested=>allowedGrowth(requested,reachedGrowth,conditionsOkay()),
 update(value,playing){shownGrowth=value;reachedGrowth=Math.max(reachedGrowth,value);draw(playing);}});
function draw(playing=false){
 const water=el<HTMLSelectElement>('water').value,air=el<HTMLSelectElement>('air').value,temp=el<HTMLSelectElement>('temp').value;
 const cue=scene.update(shownGrowth,water,air);
 const s=Math.floor(shownGrowth),key=[water,air,temp,s].join(':');
 if(key!==soilKey){soilKey=key;drawSoilInset(water,air,temp,s);}
 const note=conditionsOkay()?cue:t('条件限制了后续生长；已长出的结构保留。请在设置中检查水分、氧气与温度。');
 if(result.textContent!==note)result.textContent=note;
 range.value=String(shownGrowth);range.setAttribute('aria-valuetext',cue);
 play.textContent=playing?t('暂停'):reduced.matches?t('看下一步'):shownGrowth>=3?t('再看一次'):t('连续观察');
 play.setAttribute('aria-pressed',String(playing));
 el<HTMLButtonElement>('next').disabled=allowedGrowth(Math.min(3,Math.floor(shownGrowth)+1),reachedGrowth,conditionsOkay())<=shownGrowth;
 onChange(read());
}
for(const id of ['water','air','temp'])el<HTMLSelectElement>(id).value=(initial[id as keyof StudyState]??({water:'damp',air:'yes',temp:'warm'} as Record<string,string>)[id]) as string;
for(const id of ['water','air','temp'])el(id).addEventListener('input',()=>playback.pause());
play.addEventListener('click',()=>{if(playback.read().playing)playback.pause();else playback.play();});
range.addEventListener('input',()=>playback.scrub(Number(range.value)));
el('next').addEventListener('click',()=>playback.seek(Math.min(3,Math.floor(shownGrowth)+1)));
el('reset').addEventListener('click',()=>{
 playback.scrub(0);
 // Scrubbing first pauses/emits the old observation. Clear history afterwards,
 // so that the old fractional extent cannot leak into a new blocked seed.
 reachedGrowth=0;draw();
});
draw();
function read():StudyState{return {progress:shownGrowth,water:el<HTMLSelectElement>('water').value,air:el<HTMLSelectElement>('air').value,temp:el<HTMLSelectElement>('temp').value};}
return {read,pause(){playback.pause();},dispose(){playback.dispose();root.replaceChildren();}};
}
