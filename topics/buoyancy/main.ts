import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { buoyancy, type Settings, type Experiment, type ObjectKind } from './model.ts';
import './style.css';
import { BuoyancyScene } from './scene.ts';
translateDocument(t);
mountTopicNavigation('buoyancy');
const el = (id:string)=>document.getElementById(id)!;
const state:Settings={experiment:'objects',object:'wood',boat:false,cargo:0,salt:false,depth:50};
let academic=false;
const scene = new BuoyancyScene(el('scene') as unknown as SVGSVGElement, el('motion-state'));
function render(){
 const r=buoyancy(state), depthMode=state.experiment==='depth', boatMode=state.experiment==='boat'&&state.boat;
 for(const mode of ['objects','boat','depth'])el(`${mode}-controls`).hidden=state.experiment!==mode;
 document.querySelectorAll<HTMLButtonElement>('[data-experiment]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.experiment===state.experiment)));
 document.querySelectorAll<HTMLButtonElement>('[data-object]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.object===state.object)));
 el('cargo-controls').hidden=!state.boat;
 el('ball').setAttribute('aria-pressed',String(!state.boat));el('boat').setAttribute('aria-pressed',String(state.boat));
 const name=depthMode?t('有外部装置托着'):r.flooded?t('船边进水了'):r.floating?t('浮起来了！'):t('沉下去了，也有浮力');
 el('state').textContent=el('discovery-title').textContent=name;
 el('story').textContent=depthMode?(state.depth<100?t('进入水里的部分越多，排开的水越多，浮力也越大。'):t('现在方块全在水里。继续往深处移动，排开的水没有变多，浮力也基本不变。')):r.flooded?t('货物太多，水从船边流进来。空气能跑出去，船就不能再保持原来的排水空间了。'):boatMode?t('橡皮泥没有变轻！捏成船后，船壳围住的空间能让它在进水前排开更多水。'):r.floating?t('木块只要一部分进入水里，排开的水就已经足够重，能够把它托住。'):t('水也在向上托它，只是这个力小于向下的重力。到达箱底后，箱底一起把它托住。');
 el('try-next').textContent=state.experiment==='boat'?(boatMode?t('给船加货物：船会更深地进入水里，直到排开的水足以托住新重量。'):t('看看橡皮泥球和空心船：质量相同，结果却不同。')):t('浸入水里的体积不变时，换成密度更大的水，浮力会更大。已经漂浮的物品会浮高一点，最后浮力仍等于重力。');
 if(!academic){
  el('story').textContent=depthMode?(state.depth<100?t('进入水里的部分越多，水向上托的力越大。'):t('已经全部进入水里，再往下压，水向上托的力基本不变。')):r.flooded?t('水从船边进来了，小船装不下这么多货物。'):boatMode?t('还是同一块橡皮泥。捏成空心船后，它能排开更多水。'):r.floating?t('水向上托着它。停稳时，向上和向下的力一样大。'):t('它沉下去了，但水仍然在向上托它。');
  el('try-next').textContent=state.experiment==='boat'?t('先捏成船，再一点点加货物，看看船边离水面还有多远。'):depthMode?t('慢慢往下压，比较半浸入和全浸入时向上的箭头。'):t('换一个物品，先猜它会停在水面，还是箱底。');
 }
 el('displaced').textContent=r.displaced.toFixed(0);el('mass').textContent=String(r.mass);
 el('cargo-count').textContent=t('货物 {{count}} 块',{count:state.cargo});el('depth-count').textContent=t('浸入 {{percent}}%',{percent:Math.min(100,state.depth)});
 el('numbers').textContent=t('浮力 {{force}} N；重力 {{weight}} N。',{force:r.force.toFixed(2),weight:r.weight.toFixed(2)});
 scene.set(state,r,(el('forces') as HTMLInputElement).checked,state.experiment==='depth');
}
document.querySelectorAll<HTMLButtonElement>('[data-experiment]').forEach(b=>b.addEventListener('click',()=>{state.experiment=b.dataset.experiment as Experiment;render();}));
document.querySelectorAll<HTMLButtonElement>('[data-object]').forEach(b=>b.addEventListener('click',()=>{state.object=b.dataset.object as ObjectKind;render();}));
el('ball').addEventListener('click',()=>{state.boat=false;state.cargo=0;(el('cargo') as HTMLInputElement).value='0';render();});el('boat').addEventListener('click',()=>{state.boat=true;render();});
for(const id of ['cargo','depth'])el(id).addEventListener('input',()=>{state[id as 'cargo'|'depth']=Number((el(id) as HTMLInputElement).value);render();});
el('water').addEventListener('change',()=>{state.salt=(el('water') as HTMLSelectElement).value==='salt';render();});el('forces').addEventListener('change',render);
el('reset').addEventListener('click',()=>{Object.assign(state,{experiment:'objects',object:'wood',boat:false,cargo:0,salt:false,depth:50});(el('cargo') as HTMLInputElement).value='0';(el('depth') as HTMLInputElement).value='50';(el('water') as HTMLSelectElement).value='fresh';(el('forces') as HTMLInputElement).checked=true;render();});
render();

for(const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) button.addEventListener('click',()=>{
 academic=button.dataset.mode==='academic';
 document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.mode==='academic')===academic)));
 document.querySelectorAll<HTMLElement>('[data-academic-only]').forEach(node=>node.hidden=!academic);
 render();
});
