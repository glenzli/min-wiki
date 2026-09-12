import { SCIENCE } from './science.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { CONTENT, childStory } from './content.ts';
import { PlanetScene } from './scene.ts';
import type { View } from './scene.ts';
import { DENSITY, tidalRadius, PERICENTER } from './model.ts';
import type { Planet, Route } from './model.ts';
import './shell.css';
translateDocument(t);
mountTopicNavigation('planet-black-hole');
const el = (id: string) => document.getElementById(id)!;
let scene: PlanetScene | undefined;
try {
    scene = new PlanetScene(el('scene') as HTMLCanvasElement);
}
catch (error) {
    el('scene-error').hidden = false;
    console.error(error);
}
let route: Route = 'safe', planet: Planet = 'rocky', progress = 0, playing = false, academic = false, last = performance.now(), frame = 0, disposed = false;
const positions = [0, .375, .57, .9];
function update() {
    const data = CONTENT[route], shared = CONTENT.shared, stage = Math.max(0, positions.reduce((found, p, i) => progress >= p ? i : found, 0));
    for (const [id, value] of Object.entries({ 'scene-title': data.title, 'scene-scale': shared.scale, 'scene-note': shared.note, 'story-title': shared.stages[stage], story: academic ? SCIENCE[stage].body : childStory(stage, route, planet), prompt: data.prompt, metric: DENSITY[planet].toFixed(2), 'metric-label': shared.label, fact: shared[planet], explanation: shared.explanation, limits: shared.limits, model: shared.model }))
        el(id).textContent = value;
  el('science-live').textContent = t('平均密度 {{density}} g/cm³\nr_t ≈ {{tidal}}；r_p = {{pericenter}}\n穿透因子 β ≈ {{beta}}（长度以类地球潮汐尺度归一化）', { density: DENSITY[planet].toFixed(3), tidal: tidalRadius(planet).toFixed(2), pericenter: PERICENTER[route].toFixed(2), beta: (tidalRadius(planet) / PERICENTER[route]).toFixed(2) });
  const science = SCIENCE[stage];
  if (academic) el('story-title').textContent = SCIENCE[stage].title;
  el('science-body').textContent = shared.academic;
  el('science-panel').hidden = !academic;
  for (const key of ['title', 'formula', 'terms', 'watch', 'caution'] as const) el(`science-${key}`).textContent = science[key];
    el('play').textContent = playing ? t('暂停') : progress >= 1 ? t('重新播放') : t('开始观察');
    (el('progress') as HTMLInputElement).value = String(Math.round(progress * 1000));
    el('elapsed').textContent = `${(progress * 32).toFixed(1)} / 32 s`;
    document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scenario === route)));
    el('steps').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === stage)));
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-scenario]'))
    b.addEventListener('click', () => { route = b.dataset.scenario as Route; progress = 0; playing = false; scene?.select(planet, route); update(); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]'))
    b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; document.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); update(); });
el('planet').addEventListener('change', () => { planet = (el('planet') as HTMLSelectElement).value as Planet; playing = false; scene?.select(planet, route); update(); });
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
el('steps').replaceChildren(...CONTENT.shared.stages.map((s, i) => { const b = document.createElement('button'); b.textContent = s; b.addEventListener('click', () => { progress = positions[i]; playing = false; update(); }); return b; }));
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
        scene?.draw(progress, planet, route, (el('guides') as HTMLInputElement).checked, (el('view') as HTMLSelectElement).value as View);
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
update();
frame = requestAnimationFrame(animate);
