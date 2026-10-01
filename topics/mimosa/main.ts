import { mountObservationMode } from '../../src/platform/observationMode.ts';
import { mountMovementStudy } from './movementStudy.ts';
import { mountMovementComparison } from './movementComparison.ts';
import { plantCase, type PlantCase } from './movementModel.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { MimosaScene } from './scene.ts';
import { response, type TouchSettings } from './model.ts';
import { steps, stories } from './content.ts';
import { primaryPulvinus, leafletPulvinus } from './anatomy.ts';
import './style.css';
translateDocument(t); mountTopicNavigation('mimosa');
const el = (id: string) => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
const select = (id: string) => el(id) as HTMLSelectElement;
let progress = 0, playing = false, academic = false, view = 'plant', frame = 0, last = 0;
let viewDepth = 0;
let selectedPlant: PlantCase = 'mimosa';
let movement: ReturnType<typeof mountMovementStudy> | undefined;
let cancelView: () => void = () => {};
let scene: MimosaScene | undefined;
try { scene = new MimosaScene(el('scene') as HTMLCanvasElement); } catch (error) { el('scene-error').hidden = false; console.error(error); }
const settings = (): TouchSettings => ({ pinna: Number(select('pinna').value), extent: select('extent').value === 'whole' ? 'whole' : 'local' });
function update() {
  const config = settings(), s = response(progress, config), story = stories[s.stage];
  el('story-title').textContent = story.title; el('story').textContent = story.body;
  el('status').textContent = s.recovering ? t('重新舒展') : s.fold > .95 ? t('已经合拢') : s.fold > .02 ? t('正在收拢') : t('小叶展开');
  const primary = primaryPulvinus(progress, config), tertiary = leafletPulvinus(progress, config), enlarged = view !== 'plant', atLeaflet = view === 'leaflet';
  el('scene-title').textContent = atLeaflet ? t('小叶叶枕：同一对小叶向上合拢') : view === 'plant' ? t('四条羽片，许多对小叶') : view === 'cell' ? t('下侧运动细胞：从壁到液泡') : t('主叶枕纵切：两侧共同支撑叶柄');
  el('scene-note').textContent = atLeaflet ? t('沿羽轴看所选第七对小叶。组织插图为机制示意，未指定哪一侧失水。') : view === 'plant' ? t('短叶柄连接主叶枕与羽片汇合处。几何是定性投影，亮点只标信号。') : t('结构与颜色经过教学放大；不是显微照片，也不按同一比例。');
  const water = enlarged && !atLeaflet ? primary.lowerWater : s.water;
  el('water-value').textContent = atLeaflet ? tertiary.recovering ? t('逐渐恢复') : tertiary.fold > .02 ? t('相对减少') : t('初始状态') : `${Math.round(water * 100)}%`;
  el('water-bar').style.width = `${water * 100}%`;
  el('water-label').textContent = enlarged && !atLeaflet ? t('主叶枕下侧细胞的含水趋势') : t('金圈处小叶叶枕的含水趋势');
  el('zoom-guide').hidden = !enlarged;
  el('explore-hint').hidden = enlarged;
  el('wide-demo').hidden = atLeaflet;
  el('pressure-pair').hidden = atLeaflet;
  el('pressure-note').hidden = atLeaflet;
  const leafletHints = {
    waiting: t('还是金圈处的第七对小叶。信号尚未到达这里，小叶基部尚未折合；局部视图跟随羽轴。'),
    arrived: t('信号已经到达这里，小叶尚未明显折合。继续推进，观察基部叶枕的变化。'),
    folding: t('信号到达小叶叶枕后，运动组织的膨压与形状改变，让小叶绕基部向上合拢。下方只示意一组运动细胞。'),
    held: t('小叶已向上合拢。拖到恢复阶段，比较叶枕与小叶怎样重新展开。'),
    recovering: t('离子和水分逐渐重新分配，小叶围绕自己的基部展开；局部视图以羽轴为参照。'),
    recovered: t('这对小叶已恢复。比较“主叶枕组织”：局部轻触仍不让本例的叶柄下垂。'),
  };
  el('zoom-context').textContent = atLeaflet ? leafletHints[tertiary.phase] : config.extent === 'local' ? t('这里另看叶柄基部的主叶枕。局部轻触让金圈处的小叶合拢，本例的主叶枕保持原状。') : progress === 1 ? t('水分与两侧支撑已恢复，叶柄重新抬起。') : primary.recovering ? t('水分重新分配，两侧支撑逐渐恢复，叶柄抬起。') : primary.contraction > .05 ? t('下侧伸展组织失水，膨压降低；连续的组织带着叶柄向下弯。') : t('这是主叶枕；信号到达后，再观察下侧细胞与叶柄。');
  el('upper-pressure').style.width = `${primary.upperTurgor * 100}%`;
  el('lower-pressure').style.width = `${primary.lowerTurgor * 100}%`;
  el('touch').textContent = config.extent === 'local' ? t('轻触选中的羽片') : t('演示较广刺激');
  (el('scene') as HTMLCanvasElement).setAttribute('aria-label', enlarged ? `${el('scene-title').textContent} ${el('zoom-context').textContent}` : t('含羞草触碰与叶枕观察'));
  input('progress').value = String(Math.round(progress * 1000)); input('progress').setAttribute('aria-valuetext', steps[s.stage]);
  el('elapsed').textContent = `${(progress * 20).toFixed(1)} / 20 s`;
  el('pause').textContent = playing ? t('暂停') : t('继续观察'); (el('pause') as HTMLButtonElement).disabled = progress === 0 || progress === 1;
  el('science-panel').hidden = !academic;
  el('science-live').textContent = atLeaflet ? t('当前阶段：{{stage}}\n观察位置：{{pinna}}的第七对小叶基部\n水相、细胞体积与转角均为定性示意；未计算真实压力或离子通量。', { stage: steps[s.stage], pinna: select('pinna').selectedOptions[0].text }) : t('当前阶段：{{stage}}\n观察位置：{{pinna}}\n含水趋势：{{water}}%（归一化示意）', { stage: steps[s.stage], pinna: select('pinna').selectedOptions[0].text, water: Math.round(water * 100) });
  el('formula').textContent = t('Ψw = Ψs + Ψp\n离子重新分配 → 水分移动 → 膨压差');
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'academic') === academic)));
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  el('steps').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === s.stage)));
  if (selectedPlant === 'mimosa') scene?.draw(progress, config, view, viewDepth);
}
let cancelSeek: () => void = () => {};
function seek(target: number) {
  stop();
  cancelSeek = animateValue({from: progress, to: target, duration: 800, onUpdate: value => { progress = value; update(); }});
}
function cancel() { cancelAnimationFrame(frame); frame = 0; }
function stop() { cancelSeek(); playing = false; cancel(); }
function tick(now: number) {
  frame = 0; if (!playing || document.hidden) return;
  progress = Math.min(1, progress + Math.min((now - last) / 1000, .1) / 20); last = now;
  if (progress >= 1) playing = false; update(); if (playing) frame = requestAnimationFrame(tick);
}
function resume() { playing = true; last = performance.now(); if (!frame) frame = requestAnimationFrame(tick); }
function touch() { stop(); progress = .1; resume(); update(); }
el('touch').addEventListener('click', touch);
el('scene').addEventListener('click', () => { if (view === 'plant') touch(); });
el('pause').addEventListener('click', () => { cancelSeek(); if (playing) stop(); else resume(); update(); });
el('reset').addEventListener('click', () => { stop(); progress = 0; update(); });
el('progress').addEventListener('input', () => { stop(); progress = Number(input('progress').value) / 1000; update(); });
for (const id of ['pinna', 'extent']) el(id).addEventListener('change', () => { stop(); progress = 0; update(); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.addEventListener('click', () => {
  cancelView(); const previous = view; view = b.dataset.view!;
  const target = view === 'plant' ? 0 : view === 'cell' ? 2 : 1;
  // The two pulvini are distinct organs. Do not morph one tissue into the other
  // or imply that the primary cell is a zoomed tertiary cell.
  if (view === 'leaflet' || previous === 'leaflet') { viewDepth = target; update(); return; }
  update();
  cancelView = animateValue({from: viewDepth, to: target, duration: 720, onUpdate: value => { viewDepth = value; scene?.draw(progress, settings(), view, viewDepth); }});
});
el('wide-demo').addEventListener('click', () => { select('extent').value = 'whole'; touch(); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; movement?.setAcademic(academic); comparison?.setAcademic(academic); update(); });
el('steps').replaceChildren(...steps.map((label, i) => { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', () => { seek([0, .21, .43, .62, .84][i]!); }); return b; }));
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); else if (playing) resume(); });
window.addEventListener('pagehide', e => { cancelView(); viewDepth = view === 'plant' ? 0 : view === 'cell' ? 2 : 1; cancel(); if (!e.persisted) { stop(); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if (playing && !frame) resume(); update(); });
update();

// The journey coordinates selection and presentation; each experiment owns its own clock.
const workspace=el('plant-workspace');
const comparison=mountMovementComparison(workspace,value=>choosePlant(value,true));
const inspector=workspace.querySelector<HTMLElement>('.inspector')!;
inspector.prepend(workspace.querySelector('.story')!);
inspector.append(el('science-panel'));
movement=mountMovementStudy(el('movement-study'),el('movement-reading'));
const observation=mountObservationMode(workspace,{enter:t('沉浸演示'),exit:t('退出沉浸 · Esc')},{fit:true,panels:[{label:t('解说与设置'),elements:[inspector,movement.notes]}]});
const observationTitle=document.createElement('h2');observationTitle.className='observation-title';observationTitle.textContent=t('没有肌肉，怎样动？');observation.toolbar.prepend(observationTitle);
function choosePlant(value:PlantCase,push=false){
  stop();cancelView();viewDepth=view==='plant'?0:view==='cell'?2:1;
  selectedPlant=value;workspace.dataset.plant=value;
  comparison.select(value);
  el('mimosa-study').hidden=value!=='mimosa';el('mimosa-details').hidden=value!=='mimosa';
  el('movement-study').hidden=value==='mimosa';el('movement-reading').hidden=value==='mimosa';
  document.querySelectorAll<HTMLButtonElement>('[data-plant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plant===value)));
  movement?.select(value,academic);update();
  if(push){const url=new URL(location.href);if(value==='mimosa')url.searchParams.delete('plant');else url.searchParams.set('plant',value);history.pushState(null,'',url);}
}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-plant]'))b.addEventListener('click',()=>choosePlant(plantCase(b.dataset.plant??null),true));
window.addEventListener('popstate',()=>choosePlant(plantCase(new URL(location.href).searchParams.get('plant'))));
choosePlant(plantCase(new URL(location.href).searchParams.get('plant')));
