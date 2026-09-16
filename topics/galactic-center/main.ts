import { animateValue } from '../../src/visuals/transition.ts';
import { DONOR_MASS, BLACK_HOLE_MASS, DONOR_LOBE, SEPARATION, donorRadius } from './model.ts';
import { SCIENCE } from './science.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { CONTENT } from './content.ts';
import { CompanionScene } from './scene.ts';
import type { Scenario, View } from './scene.ts';
import './shell.css';
translateDocument(t);
mountTopicNavigation('galactic-center');
const el = (id: string) => document.getElementById(id)!;
let scene: CompanionScene | undefined;
try {
    scene = new CompanionScene(el('scene') as HTMLCanvasElement);
}
catch (error) {
    el('scene-error').hidden = false;
    console.error(error);
}
let scenario: Scenario = 'overflow', progress = 0, playing = false, academic = false, last = performance.now(), frame = 0, disposed = false;
let cancelStageMotion = () => {};
for (const type of ['click', 'input', 'keydown']) document.addEventListener(type, () => cancelStageMotion(), { capture: true });
function seekStage(target: number) {
  playing = false;
  cancelStageMotion = animateValue({ from: progress, to: target, duration: 1100,
    onUpdate: value => { progress = value; update(); } });
}
const positions = [0, .25, .55, .85];
function update() {
    const data = CONTENT[scenario], stage = Math.max(0, positions.reduce((found, p, i) => progress >= p ? i : found, 0));
    for (const [id, value] of Object.entries({ 'scene-title': data.title, 'scene-scale': data.scale, 'scene-note': data.note, 'story-title': data.stages[stage], story: academic ? SCIENCE[stage].body : data.story[stage], prompt: data.prompt, metric: data.metric, 'metric-label': data.label, fact: data.fact, explanation: data.explanation, limits: data.limits, model: data.model }))
        el(id).textContent = value;
  el('science-live').textContent = t('质量比 q = {{q}}；R_L/a ≈ {{lobe}}\n伴星半径 / 洛希瓣参考半径 ≈ {{fill}}\n固定质量与间距的教学模型', { q: (DONOR_MASS / BLACK_HOLE_MASS).toFixed(2), lobe: (DONOR_LOBE / SEPARATION).toFixed(3), fill: (donorRadius(scenario) / DONOR_LOBE).toFixed(2) });
  const science = SCIENCE[stage];
  if (academic) { el('story-title').textContent = SCIENCE[stage].title; el('science-body').textContent = data.academic; }
  el('science-panel').hidden = !academic;
  for (const key of ['title', 'formula', 'terms', 'watch', 'caution'] as const) el(`science-${key}`).textContent = science[key];
    if (scenario === 'detached') el('explanation').textContent = t('这次没有设置明显的供气。恒星与黑洞可以保持双星关系，并不因为靠近黑洞，就一定有大量气体流走。切换到溢流或恒星风，再比较气体怎样开始转移。');
    el('play').textContent = playing ? t('暂停') : progress >= 1 ? t('重新播放') : t('开始观察');
    (el('progress') as HTMLInputElement).value = String(Math.round(progress * 1000));
    el('elapsed').textContent = `${(progress * 32).toFixed(1)} / 32 s`;
    document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scenario === scenario)));
    el('steps').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === stage)));
}
function buildSteps() { el('steps').replaceChildren(...CONTENT[scenario].stages.map((s, i) => { const b = document.createElement('button'); b.textContent = s; b.addEventListener('click', () => { seekStage(positions[i]); }); return b; })); }
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-scenario]'))
    b.addEventListener('click', () => { scenario = b.dataset.scenario as Scenario; progress = 0; playing = false; buildSteps(); update(); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]'))
    b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; document.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); update(); });
function toggle() {
    if (progress >= 1)
        progress = 0;
    playing = !playing;
    update();
}
el('play').addEventListener('click', toggle);
el('reset').addEventListener('click', () => { progress = 0; playing = false; update(); });
el('progress').addEventListener('input', () => { progress = Number((el('progress') as HTMLInputElement).value) / 1000; playing = false; update(); });
document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.repeat && !(e.target as HTMLElement)?.closest('button,input,select,a,textarea,[contenteditable]')) {
        e.preventDefault();
        toggle();
    }
});
function animate(now: number) {
    const dt = Math.min((now - last) / 1000, .1);
    last = now;
    if (!document.hidden) {
        if (playing) {
            progress = Math.min(1, progress + dt * Number((el('speed') as HTMLSelectElement).value) / 32);
            if (progress >= 1)
                playing = false;
            update();
        }
        scene?.draw(progress, scenario, (el('guides') as HTMLInputElement).checked, (el('view') as HTMLSelectElement).value as View, (el('orbit') as HTMLInputElement).checked);
    }
    if (!disposed)
        frame = requestAnimationFrame(animate);
}
window.addEventListener('pagehide', e => {
    if (!e.persisted) {
        disposed = true;
        cancelAnimationFrame(frame);
        scene?.dispose();
    }
});
document.addEventListener('visibilitychange', () => { last = performance.now(); });
buildSteps();
update();
frame = requestAnimationFrame(animate);
