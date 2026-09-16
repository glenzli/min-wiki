import { animateValue } from '../../src/visuals/transition.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { MimosaScene } from './scene.ts';
import { response, type TouchSettings } from './model.ts';
import { steps, stories } from './content.ts';
import { primaryPulvinus } from './anatomy.ts';
import './style.css';
translateDocument(t); mountTopicNavigation('mimosa');
const el = (id: string) => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
const select = (id: string) => el(id) as HTMLSelectElement;
let progress = 0, playing = false, academic = false, view = 'plant', frame = 0, last = 0;
let viewDepth = 0;
let cancelView: () => void = () => {};
let scene: MimosaScene | undefined;
try { scene = new MimosaScene(el('scene') as HTMLCanvasElement); } catch (error) { el('scene-error').hidden = false; console.error(error); }
const settings = (): TouchSettings => ({ pinna: Number(select('pinna').value), extent: select('extent').value === 'whole' ? 'whole' : 'local' });
function update() {
  const config = settings(), s = response(progress, config), story = stories[s.stage];
  el('story-title').textContent = story.title; el('story').textContent = story.body;
  el('status').textContent = s.recovering ? t('重新舒展') : s.fold > .95 ? t('已经合拢') : s.fold > .02 ? t('正在收拢') : t('小叶展开');
  const primary = primaryPulvinus(progress, config), enlarged = view !== 'plant';
  el('scene-title').textContent = view === 'plant' ? t('四条羽片，许多对小叶') : view === 'cell' ? t('下侧运动细胞：从壁到液泡') : t('主叶枕纵切：两侧共同支撑叶柄');
  el('scene-note').textContent = view === 'plant' ? t('颜色标出信号的位置，不是植物发光。') : t('结构与颜色经过教学放大；不是显微照片，也不按同一比例。');
  const water = enlarged ? primary.lowerWater : s.water;
  el('water-value').textContent = `${Math.round(water * 100)}%`; el('water-bar').style.width = `${water * 100}%`;
  el('water-label').textContent = enlarged ? t('主叶枕下侧细胞的含水趋势') : t('一侧运动细胞的含水趋势');
  el('zoom-guide').hidden = !enlarged;
  el('explore-hint').hidden = enlarged;
  el('zoom-context').textContent = config.extent === 'local' ? t('局部轻触只让这条羽片的小叶合拢；本例的主叶枕没有下垂。') : progress === 1 ? t('水分与两侧支撑已恢复，叶柄重新抬起。') : primary.recovering ? t('水分重新分配，两侧支撑逐渐恢复，叶柄抬起。') : primary.contraction > .05 ? t('下侧伸展组织失水，膨压降低；连续的组织带着叶柄向下弯。') : t('这是主叶枕；信号到达后，再观察下侧细胞与叶柄。');
  el('upper-pressure').style.width = `${primary.upperTurgor * 100}%`;
  el('lower-pressure').style.width = `${primary.lowerTurgor * 100}%`;
  el('touch').textContent = config.extent === 'local' ? t('轻触选中的羽片') : t('演示较广刺激');
  (el('scene') as HTMLCanvasElement).setAttribute('aria-label', enlarged ? `${el('scene-title').textContent} ${el('zoom-context').textContent}` : t('含羞草触碰与叶枕观察'));
  input('progress').value = String(Math.round(progress * 1000)); input('progress').setAttribute('aria-valuetext', steps[s.stage]);
  el('elapsed').textContent = `${(progress * 20).toFixed(1)} / 20 s`;
  el('pause').textContent = playing ? t('暂停') : t('继续观察'); (el('pause') as HTMLButtonElement).disabled = progress === 0 || progress === 1;
  el('science-panel').hidden = !academic;
  el('science-live').textContent = t('当前阶段：{{stage}}\n观察位置：{{pinna}}\n含水趋势：{{water}}%（归一化示意）', { stage: steps[s.stage], pinna: select('pinna').selectedOptions[0].text, water: Math.round(water * 100) });
  el('formula').textContent = t('Ψw = Ψs + Ψp\n离子重新分配 → 水分移动 → 膨压差');
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'academic') === academic)));
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  el('steps').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === s.stage)));
  scene?.draw(progress, config, view, viewDepth);
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
  cancelView(); view = b.dataset.view!; update();
  const target = view === 'plant' ? 0 : view === 'cell' ? 2 : 1;
  cancelView = animateValue({from: viewDepth, to: target, duration: 720, onUpdate: value => { viewDepth = value; scene?.draw(progress, settings(), view, viewDepth); }});
});
el('wide-demo').addEventListener('click', () => { select('extent').value = 'whole'; touch(); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; update(); });
el('steps').replaceChildren(...steps.map((label, i) => { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', () => { seek([0, .21, .43, .62, .84][i]!); }); return b; }));
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); else if (playing) resume(); });
window.addEventListener('pagehide', e => { cancelView(); viewDepth = view === 'plant' ? 0 : view === 'cell' ? 2 : 1; cancel(); if (!e.persisted) { stop(); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if (playing && !frame) resume(); update(); });
update();
