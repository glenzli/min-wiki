import { animateValue } from '../../src/visuals/transition.ts';
import { renderCell } from '../body-cells/scene.ts';
import { renderBlood } from '../blood-cells/scene.ts';
import { explorations as body } from '../body-cells/content.ts';
import { explorations as blood } from '../blood-cells/content.ts';
import { t as bodyText } from '../body-cells/i18n.ts';
import { t as bloodText } from '../blood-cells/i18n.ts';
import type { CellKind } from '../body-cells/model.ts';
import type { BloodProcess } from '../blood-cells/model.ts';
import { t } from './i18n.ts';
import { createWorkState, workPhase, type Specialism } from './exploration.ts';
import bodyLearning from '../body-cells/learning.json';
import bloodLearning from '../blood-cells/learning.json';
import { language } from '../../src/platform/i18n.ts';

/** Owns six retained experiments; switching examples never claims a cell changes type. */
export function mountSpecialization(initial: Specialism, onSelect: (kind: Specialism) => void) {
  const el = <T extends Element = HTMLElement>(id: string) => document.getElementById(id)! as unknown as T;
  const scene = el<SVGSVGElement>('work-scene'), states = createWorkState();
  let kind = initial, playing = false, cancel = () => {}, cancelZoom = () => {}, explained = '';
  const examples = [...body, ...blood];
  const current = () => examples.find(item => item.id === kind)!;
  function draw() {
    const state = states[kind], info = current(), phase = workPhase(kind, state.progress);
    // Renderer IDs are namespaced because the detailed cellular SVG stays mounted.
    const art = kind === 'barrier' || kind === 'muscle' || kind === 'neuron'
      ? renderCell(kind as CellKind, state.progress, bodyText) : renderBlood(kind as BloodProcess, state.progress, bloodText);
    scene.innerHTML = art.replace(/id="([^"]+)"/g, 'id="work-$1"').replace(/url\(#([^\)]+)\)/g, 'url(#work-$1)').replace(/href="#([^"]+)"/g, 'href="#work-$1"');
    const focus = kind === 'barrier' ? { x: 490, y: 270 } : kind === 'muscle' ? { x: 490, y: 417 } : kind === 'neuron' ? { x: 859, y: 255 } : kind === 'oxygen' ? { x: 570, y: 295 } : { x: 530, y: 317 };
    const width = 980 / (1 + state.zoom * 1.2), height = width * 550 / 980;
    const x = 490 + (focus.x - 490) * state.zoom, y = 275 + (focus.y - 275) * state.zoom;
    scene.setAttribute('viewBox', `${x - width / 2} ${y - height / 2} ${width} ${height}`);
    scene.setAttribute('aria-label', info.subject);
    scene.dataset.case = kind; scene.dataset.progress = state.progress.toFixed(4);
    el('work-subject').textContent = info.subject; el('work-observe').textContent = info.observe;
    el('work-phase').textContent = info.stages[phase]!.title; el('work-story').textContent = info.stages[phase]!.body;
    el<HTMLInputElement>('work-progress').value = String(Math.round(state.progress * 1000));
    el('work-progress').setAttribute('aria-valuetext', `${info.stages[phase]!.title} · ${Math.round(state.progress * 100)}%`);
    el('work-percent').textContent = `${Math.round(state.progress * 100)}%`;
    el('work-play').textContent = playing ? t('暂停观察') : state.progress >= 1 ? t('再看一次') : t('观察这项工作');
    el('work-play').setAttribute('aria-pressed', String(playing));
    el('work-zoom').setAttribute('aria-pressed', String(state.zoom > .5));
    el('work-zoom').textContent = state.zoom > .5 ? t('回到组织全景') : t('靠近工作的位置');
    document.querySelectorAll<HTMLButtonElement>('[data-specialism]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.specialism === kind)));
    el('work-bridge').textContent = kind === 'oxygen' ? t('氧气到了组织旁边。比较组织细胞怎样利用它，而不是让红细胞自己运行这段线粒体示例。') : kind === 'repair' ? t('血小板是细胞片段，纤维蛋白来自血浆蛋白。合作并不意味着参与者都是完整细胞。') : kind === 'neuron' ? t('亮点是膜上信号的位置，不是沿神经奔跑的物质小球；跨突触才是另一段化学传递。') : t('这些是不同细胞与组织的比较，不是同一颗细胞依次变身。返回结构或能量观察，原来的实验进度仍然保留。');
    if (explained !== kind) {
      explained = kind;
      const content = kind === 'barrier' || kind === 'muscle' || kind === 'neuron' ? bodyLearning : bloodLearning;
      const prose = content[language === 'en' ? 'en' : 'zh'], host = el('work-science-content'); host.replaceChildren();
      for (const note of prose.academic) { const article = document.createElement('article'), title = document.createElement('h3'), body = document.createElement('p'); title.textContent = note.title; body.textContent = note.body; article.append(title, body); host.append(article); }
      const boundary = document.createElement('p'); boundary.textContent = prose.boundary; host.append(boundary);
      for (const reference of content.references) { const a = document.createElement('a'); a.href = reference.url; a.textContent = reference.title; host.append(a); }
    }
  }
  function pause() { cancel(); playing = false; draw(); }
  function select(next: Specialism) { pause(); cancelZoom(); kind = next; draw(); onSelect(kind); }
  const options = el('work-options');
  for (const info of examples) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.specialism = info.id; button.textContent = info.name;
    button.addEventListener('click', () => select(info.id)); options.append(button);
  }
  el('work-play').addEventListener('click', () => {
    if (playing) { pause(); return; }
    cancel(); const state = states[kind]; if (state.progress >= 1) state.progress = 0;
    playing = true; draw();
    cancel = animateValue({ from: state.progress, to: 1, duration: 8500 * (1 - state.progress), onUpdate: p => { state.progress = p; draw(); }, onComplete: () => { playing = false; draw(); } });
  });
  el('work-reset').addEventListener('click', () => { pause(); states[kind].progress = 0; draw(); });
  el('work-progress').addEventListener('input', () => { const value = Number(el<HTMLInputElement>('work-progress').value) / 1000; pause(); states[kind].progress = value; draw(); });
  el('work-zoom').addEventListener('click', () => { cancelZoom(); const state = states[kind]; cancelZoom = animateValue({ from: state.zoom, to: state.zoom > .5 ? 0 : 1, duration: 500, onUpdate: value => { state.zoom = value; draw(); } }); });
  el('work-labels').addEventListener('click', () => { const enabled = scene.dataset.labels !== 'true'; scene.dataset.labels = String(enabled); el('work-labels').setAttribute('aria-pressed', String(enabled)); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); cancelZoom(); } });
  window.addEventListener('pagehide', () => { pause(); cancelZoom(); });
  draw();
  return { pause: () => { pause(); cancelZoom(); }, select };
}
