import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { initialMotion, stepMotion, type Settings, type ObjectKind, type MotionPhase } from './model.ts';
import { createScene, renderScene, drawObject } from './scene.ts';
import './style.css';

translateDocument(t);
mountTopicNavigation('magnets');
const el = (id: string) => document.getElementById(id)!;
const near = el('near') as HTMLInputElement;
const select = el('object') as HTMLSelectElement;
const settings: Settings = { kind: 'iron', near: 0, flipped: false };
let academic = false;
let motion = initialMotion();
let lastTime = 0;
let demoStart: number | null = null;
let animation = 0;
let activePointer: number | null = null;
let dragOffset = 0;
let lastStatus = '';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const names: Record<ObjectKind, string> = { iron: t('铁制回形针'), copper: t('铜片'), aluminum: t('铝罐'), wood: t('木块'), magnet: t('另一块磁铁') };
const scene = createScene(el('scene') as unknown as SVGSVGElement);

function updateStatus() {
  const key = `${settings.kind}-${settings.flipped}-${motion.phase}`;
  if (key === lastStatus) return;
  lastStatus = key;
  el('child-prompt').textContent = settings.kind === 'magnet' ? t('翻转一次，再靠近：这次是吸住，还是推开？') : t('先猜它会不会动，再让磁铁慢慢靠近。');
  el('mechanism').textContent = settings.kind === 'iron' ? t('铁制回形针可在外磁场中被磁化。靠近时吸引作用增强，克服托盘摩擦后开始移动，接触后保持贴合。') : settings.kind === 'magnet' ? settings.flipped ? t('同极相对产生排斥。这个托盘限制了转向，因此可观察到直线分离；自由磁铁可能先转动，再以异极相对。') : t('异极相对产生吸引。图中的运动还受到摩擦和接触约束，不能用画面位移反推出真实磁力。') : t('木头、铜和铝在这个普通磁铁实验中没有明显位移。铜和铝并非完全没有磁响应，只是其响应很弱。');

  const titles: Record<MotionPhase, string> = {
    ready: t('慢慢靠近，看看什么时候动'), pulling: t('开始动了……越来越快！'),
    attached: t('啪！吸住了'), repelled: t('咻！同极推开了'), unaffected: t('它留在原地')
  };
  el('effect').textContent = titles[motion.phase];
  el('effect').dataset.phase = motion.phase;
  el('readout').textContent = motion.phase === 'attached'
    ? settings.kind === 'iron' ? t('回形针突然贴上来了！把磁铁往回拉，它还会跟着走。') : t('S 对着 N，两块磁铁吸在一起。点“翻转”，看看会发生什么。')
    : motion.phase === 'repelled' ? t('S 对着 S，还没有碰到，就把另一块磁铁推开了。')
    : motion.phase === 'pulling' ? t('越靠越近，拉力越来越明显，物品加快了脚步。')
    : motion.phase === 'unaffected' ? settings.kind === 'wood' ? t('木块留在原处。磁铁不会明显吸引木头。') : t('铜和铝也是金属，但这里不会被普通磁铁明显吸住。')
    : t('拖动左边的磁铁，或者点一下“靠近试试”。先猜，再观察。');
}
function paint() {
  renderScene(scene, settings, motion, reducedMotion.matches);
  updateStatus();
}
function syncControls() {
  near.value = String(Math.round(settings.near * 100));
  scene.mover.setAttribute('aria-valuenow', near.value);
  el('distance').textContent = settings.near < .35 ? t('远一点') : settings.near < .72 ? t('靠近中') : t('很近了');
  el('flip').hidden = settings.kind !== 'magnet';
  el('flip').setAttribute('aria-pressed', String(settings.flipped));
  el('item-label').textContent = names[settings.kind];
}
function setNear(amount: number) {
  settings.near = Math.max(0, Math.min(1, amount));
  syncControls();
  if (reducedMotion.matches) for (let i = 0; i < 180; i++) motion = stepMotion(motion, settings, 1 / 60);
  paint();
  schedule();
}
function reset() {
  demoStart = null; motion = initialMotion(); setNear(0);
}
function flip() {
  settings.flipped = !settings.flipped;
  if (!motion.attached) motion.phase = 'ready';
  drawObject(scene, settings);
  scene.itemShape.classList.remove('turning');
  if (!reducedMotion.matches) requestAnimationFrame(() => scene.itemShape.classList.add('turning'));
  syncControls();
  if (reducedMotion.matches) setNear(settings.near);
  schedule();
}
near.addEventListener('input', () => { demoStart = null; setNear(Number(near.value) / 100); });
select.addEventListener('change', () => {
  settings.kind = select.value as ObjectKind; settings.flipped = false;
  drawObject(scene, settings); reset();
});
el('flip').addEventListener('click', flip);
el('reset').addEventListener('click', reset);
el('approach').addEventListener('click', () => {
  reset();
  if (reducedMotion.matches) setNear(1); else demoStart = performance.now();
});
scene.mover.setAttribute('aria-label', t('拖动磁铁，或用左右方向键移动'));
scene.mover.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault(); demoStart = null;
  setNear(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : settings.near + (event.key === 'ArrowRight' ? .05 : -.05));
});
const localX = (event: PointerEvent) => new DOMPoint(event.clientX, event.clientY).matrixTransform(scene.svg.getScreenCTM()!.inverse()).x;
scene.mover.addEventListener('pointerdown', (event) => {
  if (activePointer !== null) return;
  event.preventDefault(); demoStart = null; activePointer = event.pointerId;
  dragOffset = localX(event) - (120 + settings.near * 310);
  scene.mover.setPointerCapture(event.pointerId); scene.mover.classList.add('dragging');
});
scene.mover.addEventListener('pointermove', (event) => {
  if (event.pointerId === activePointer) setNear((localX(event) - dragOffset - 120) / 310);
});
function endDrag(event: PointerEvent) {
  if (event.pointerId !== activePointer) return;
  activePointer = null; scene.mover.classList.remove('dragging');
}
scene.mover.addEventListener('pointerup', endDrag);
scene.mover.addEventListener('pointercancel', endDrag);
scene.mover.addEventListener('lostpointercapture', endDrag);
function tick(time: number) {
  animation = 0;
  const elapsed = lastTime ? (time - lastTime) / 1000 : 1 / 60; lastTime = time;
  if (demoStart !== null) {
    const p = Math.min(1, (time - demoStart) / 2000);
    settings.near = p * p * (3 - 2 * p); syncControls();
    if (p === 1) demoStart = null;
  }
  motion = stepMotion(motion, settings, elapsed); paint();
  if (demoStart !== null || Math.abs(motion.velocity) > .1 || motion.impact > 0 || motion.phase === 'pulling') schedule();
  else lastTime = 0;
}
function schedule() {
  if (!animation && !document.hidden) animation = requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(animation); animation = 0; lastTime = 0;
  if (!document.hidden) schedule();
});
window.addEventListener('pagehide', () => cancelAnimationFrame(animation));
drawObject(scene, settings); syncControls(); paint();
schedule();

for(const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) button.addEventListener('click',()=>{
  academic=button.dataset.mode==='academic';
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.mode==='academic')===academic)));
  document.querySelectorAll<HTMLElement>('[data-academic-only]').forEach(node=>node.hidden=!academic);
  el('child-prompt').hidden=academic;
  updateStatus();
});
