import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t);
mountTopicNavigation('ant-trails');
const el = <T extends Element = HTMLElement>(id: string): T => document.getElementById(id)! as unknown as T;
const report = (n: number, title: string, text: string) => { el('badge').textContent = String(n); el('state-title').textContent = title; el('state-text').textContent = text; };
type Mode = 'trail' | 'gap' | 'detour';
let mode: Mode = 'trail';
let progress = 0, routeBlend = 0;
let cancelWalk: () => void = () => {};
const direct = el<SVGPathElement>('direct'), detour = el<SVGPathElement>('detour');
const directLength = direct.getTotalLength(), detourLength = detour.getTotalLength();
function pointAt(fraction: number) {
  const path=routeBlend<.5?direct:detour;
  return path.getPointAtLength((routeBlend<.5?directLength:detourLength)*fraction);
}
function drawAnts() {
  for (let i = 0; i < 6; i++) {
    // Reverse at the endpoints; never teleport from the food to the nest.
    const travel = (i * .12 + progress) % 2;
    const direction = travel < 1 ? 1 : -1;
    const fraction = travel <= 1 ? travel : 2 - travel;
    const p = pointAt(fraction);
    const q = pointAt(Math.max(0, Math.min(1, fraction + direction * .003)));
    const angle = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
    el('ant' + i).setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${angle})`);
  }
}
function render() {
  const scent = el<HTMLInputElement>('scent').checked;
  el('trail').setAttribute('opacity', String(scent ? 1 - routeBlend : 0));
  el('detour').setAttribute('visibility', 'visible');
  el('detour').setAttribute('opacity', String(scent ? routeBlend : 0));
  el('gap').setAttribute('visibility', mode === 'gap' ? 'visible' : 'hidden');
  el<HTMLButtonElement>('erase').disabled = mode !== 'trail';
  el<HTMLButtonElement>('reroute').disabled = mode !== 'gap';
  el<HTMLButtonElement>('walk').disabled = mode === 'gap' || (mode === 'detour' && routeBlend<1);
  el('ants').setAttribute('opacity',String(Math.abs(2*routeBlend-1)));
  drawAnts();
  if (mode === 'trail') report(1,t('跟着气味走'),t('一些蚂蚁找到食物后会留下气味痕迹。伙伴用触角探测气味，沿着路线前进。紫色点只是帮我们看见气味。'));
  else if (mode === 'gap') report(2,t('咦，气味小路断了'),t('画面暂时停住，方便你找到气味缺口。这不是每只蚂蚁真实停下的位置；失去线索的蚂蚁可能继续在附近寻找。'));
  else report(3,t('找到绕行的小路'),t('这是找到新线索后的一种路线对照，蚂蚁位置已经重新安排。按前进，观察伙伴怎样沿新路线行走；中间的切换不是实际寻找过程。'));
}
el('walk').addEventListener('click', () => {
  cancelWalk();
  cancelWalk = animateValue({from: progress, to: progress + .075, duration: 900, onUpdate: value => {progress = value; drawAnts();}});
});
el('erase').addEventListener('click', () => {cancelWalk(); mode = 'gap'; render();});
el('reroute').addEventListener('click', () => {
  cancelWalk(); mode = 'detour'; let repositioned=false; render();
  // Compare route snapshots with a midpoint-hidden layout switch, never an ant crossing unmarked ground.
  cancelWalk = animateValue({from: routeBlend, to: 1, duration: 1100, onUpdate: value => {routeBlend = value; if(value>=.5&&!repositioned){progress=0;repositioned=true;} render();}});
});
el('reset').addEventListener('click', () => {cancelWalk(); mode = 'trail'; progress = 0; routeBlend = 0; el<HTMLInputElement>('scent').checked = true; render();});
el('scent').addEventListener('change', render);
render();

mountReadingMode('details:not(.references)');
