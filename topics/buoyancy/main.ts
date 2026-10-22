import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { buoyancy, type Settings, type ObjectKind } from './model.ts';
import { BuoyancyScene, type Observation } from './scene.ts';
import './style.css';

translateDocument(t);
const el=(id:string)=>document.getElementById(id)!;
const input=(id:string)=>el(id) as HTMLInputElement;
const initial:Settings={experiment:'objects',object:'wood',boat:false,cargo:0,salt:false,depth:50,boatCapacity:1400};
const state:Settings={...initial};
let academic=false,chapter='objects',observation:Observation='tank';
const scene=new BuoyancyScene(el('scene') as unknown as SVGSVGElement,el('motion-state'));

function render(){
 const result=buoyancy(state),depthMode=state.experiment==='depth',boatMode=state.experiment==='boat'&&state.boat,pressure=observation==='pressure';
 for(const mode of ['objects','boat','depth'])el(`${mode}-controls`).hidden=state.experiment!==mode;
 document.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.chapter===chapter)));
 document.querySelectorAll<HTMLButtonElement>('[data-observation]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.observation===observation)));
 document.querySelectorAll<HTMLButtonElement>('[data-object]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.object===state.object)));
 el('cargo-controls').hidden=!boatMode;el('cargo-primary').hidden=!boatMode;
 el('hull-count').textContent=academic?t('进水前最多排开 {{volume}} mL',{volume:state.boatCapacity??1400}):t('现在是{{width}}船',{width:(state.boatCapacity??1400)<=1050?t('窄'):(state.boatCapacity??1400)>=1550?t('宽'):t('中等宽度的')});
 el('capacity-readout').hidden=state.experiment!=='boat';
 el('capacity-readout').textContent=boatMode?academic?t('总质量 {{mass}} g · 排开水的质量 {{water}} g · 船沿前的载重余量 {{reserve}} g',{mass:result.mass,water:result.displacedMass.toFixed(0),reserve:result.reserve.toFixed(0)}):result.flooded?t('水已越过船沿，船里进水了。'):t('船沿还在水面上；装货会让水线升高。'):t('同一团 600 g 橡皮泥：先比较实心球和空心船。');
 el('same-load').hidden=!(boatMode&&state.cargo===4);
 el('same-load').textContent=academic?t('四块货物不变：900 mL 窄船会进水；当前船沿容积 {{capacity}} mL，{{outcome}}。',{capacity:result.capacity,outcome:result.flooded?t('已经进水'):t('还在漂浮')}):t('四块货物不变：窄船会进水；现在{{outcome}}。',{outcome:result.flooded?t('也进水了'):t('浮在水上')});
 el('ball').setAttribute('aria-pressed',String(!state.boat));el('boat').setAttribute('aria-pressed',String(state.boat));
 const title=pressure?t('水从各个方向挤压它'):depthMode?t('水与悬线一起托住它'):result.flooded?t('船边进水了'):result.floating?t('浮起来了！'):t('沉下去了，也有浮力');
 el('state').textContent=el('discovery-title').textContent=title;
 el('observation-prompt').textContent=pressure?t('沿着同一物体，看水压的方向'):observation==='displacement'?t('同一份排水量，换成量杯来比较'):t('先猜一猜，再放进水里');
 el('story').textContent=pressure?depthMode&&state.depth>=100?t('越深的地方，水挤得越用力。整个方块再放低时，上下两边都增加了，差值没有增加，所以浮力基本不变。'):t('水会向内挤压每一小块表面。左右同样深的地方相互抵消，下面比上面挤得更用力，合起来就向上托。'):depthMode?state.depth<100?t('进入水里的部分越多，水托得越多，绳子需要向上拉的力越小。'):t('已经全部进入水里，再缓缓放低，水托的力和绳的拉力都基本不变。'):result.flooded?t('水从船边进来了，小船装不下这么多货物。'):boatMode?t('还是同一块橡皮泥。捏成空心船后，它能排开更多水。'):result.floating?t('水向上托着它。停稳时，向上和向下的力一样大。'):t('它沉下去了，但水仍然在向上托它。');
 el('try-next').textContent=pressure?t('先比较同一高度的左右箭头，再把悬线方块完全浸没，继续放低。'):state.experiment==='boat'?t('先捏成船，再一点点加货物，看看船边离水面还有多远。'):depthMode?t('缓缓放低，比较水的托力和绳的拉力；两者合起来托住相同的重量。'):t('换一个物品，先猜它会停在水面，还是箱底。');
 el('displaced').textContent=result.displaced.toFixed(0);el('mass').textContent=String(result.mass);
 el('cargo-count').textContent=t('货物 {{count}} 块',{count:state.cargo});
 el('depth-count').textContent=state.depth<=100?t('浸入 {{percent}}%',{percent:state.depth}):t('全浸没，再放低 {{percent}}%',{percent:state.depth-100});
 (el('cargo-less') as HTMLButtonElement).disabled=state.cargo<=0;(el('cargo-more') as HTMLButtonElement).disabled=state.cargo>=12;
 el('numbers').textContent=depthMode?t('浮力 {{force}} N + 张力 {{tension}} N ≈ 重力 {{weight}} N。',{force:result.force.toFixed(2),tension:result.tension.toFixed(2),weight:result.weight.toFixed(2)}):result.floorSupport>0?t('浮力 {{force}} N + 箱底支持力 {{support}} N ≈ 重力 {{weight}} N。',{force:result.force.toFixed(2),support:result.floorSupport.toFixed(2),weight:result.weight.toFixed(2)}):t('浮力 {{force}} N；重力 {{weight}} N。',{force:result.force.toFixed(2),weight:result.weight.toFixed(2)});
 el('force-balance').hidden=!depthMode;el('force-balance').textContent=t('方块比同体积的水重，悬线始终绷紧。停稳时：水的托力 + 绳的拉力 = 向下的重力。');
 el('pressure-explanation').hidden=!pressure;
 scene.observe(observation,academic);scene.set(state,result,input('forces').checked,depthMode);
}

document.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(button=>button.addEventListener('click',()=>{
 chapter=button.dataset.chapter!;
 if(chapter==='pressure')observation='pressure';
 else{
  observation='tank';
  state.experiment=chapter==='objects'?'objects':chapter==='depth'?'depth':'boat';
  if(chapter==='cargo')state.boat=true;
 }
 render();
}));
document.querySelectorAll<HTMLButtonElement>('[data-observation]').forEach(button=>button.addEventListener('click',()=>{observation=button.dataset.observation as Observation;render();}));
document.querySelectorAll<HTMLButtonElement>('[data-object]').forEach(button=>button.addEventListener('click',()=>{state.object=button.dataset.object as ObjectKind;render();}));
el('ball').addEventListener('click',()=>{state.boat=false;state.cargo=0;input('cargo').value='0';render();});
el('boat').addEventListener('click',()=>{state.boat=true;render();});
el('hull').addEventListener('input',()=>{state.boatCapacity=Number(input('hull').value);render();});
el('challenge').addEventListener('click',()=>{state.boat=true;state.cargo=4;state.boatCapacity=900;input('cargo').value='4';input('hull').value='900';render();});
for(const [id,delta] of [['cargo-less',-1],['cargo-more',1]] as const)el(id).addEventListener('click',()=>{state.cargo=Math.max(0,Math.min(12,state.cargo+delta));input('cargo').value=String(state.cargo);render();});
for(const id of ['cargo','depth'] as const)el(id).addEventListener('input',()=>{state[id]=Number(input(id).value);render();});
el('water').addEventListener('change',()=>{state.salt=(el('water') as HTMLSelectElement).value==='salt';render();});
el('forces').addEventListener('change',render);
el('reset').addEventListener('click',()=>{
 Object.assign(state,initial);academic=false;chapter='objects';observation='tank';
 input('cargo').value='0';input('depth').value='50';input('hull').value='1400';(el('water') as HTMLSelectElement).value='fresh';input('forces').checked=true;
 document.querySelectorAll<HTMLElement>('[data-academic-only]').forEach(node=>node.hidden=true);
 document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode==='kids')));
 render();
});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]'))button.addEventListener('click',()=>{
 academic=button.dataset.mode==='academic';
 document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(node=>node.setAttribute('aria-pressed',String((node.dataset.mode==='academic')===academic)));
 document.querySelectorAll<HTMLElement>('[data-academic-only]').forEach(node=>node.hidden=!academic);
 render();
});
mountPresentationFrame({root:'.lab',visual:'.scene-column',choices:'.study-content>.experiments',transport:'#primary-controls'});
// Reader versions can keep or flatten the selected transport wrapper. The
// surviving transport owns layout; experiment groups retain their identities.
document.querySelector('.buoyancy-lab .presentation-transport')?.classList.add('buoyancy-primary');
render();
