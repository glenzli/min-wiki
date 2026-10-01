import './style.css';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountSceneReading } from '../../src/platform/sceneReading.ts';
import { t } from './i18n.ts';
import { initialCircuit, observeCircuit, circuitModeFromQuery, type CircuitState } from './model.ts';
import { renderCircuit } from './scene.ts';
import { studyFor } from './study.ts';

translateDocument(t);
mountTopicNavigation('electronics-circuits');
const get = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing electronics element: ${id}`);
  return element as T;
};
const svg = document.getElementById('circuit-scene') as unknown as SVGSVGElement;
let state: CircuitState = { ...initialCircuit(), mode: circuitModeFromQuery(new URLSearchParams(location.search).get('control')) };
const mobile = matchMedia('(max-width:520px)');
const supply = get<HTMLButtonElement>('supply-switch');
const returnWire = get<HTMLButtonElement>('return-wire');
const sensorLink = get<HTMLButtonElement>('sensor-link');
const light = get<HTMLInputElement>('light-level');
const threshold = get<HTMLInputElement>('threshold');
const reading = mountSceneReading(get('observation'), { id: 'circuit-reading', controls: get('reading-controls') });
// Keep scientific depth next to the controls, while the live child cause remains state-specific.
get('child-explain').after(reading.element);

function render(): void {
  const observation = observeCircuit(state);
  state = observation.state;
  const automatic = state.mode === 'automatic';
  renderCircuit(svg, observation, mobile.matches);
  get('sensor-controls').hidden = !automatic;
  get('signal-story').hidden = !automatic;
  for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-control]')) button.setAttribute('aria-pressed', String(button.dataset.control === state.mode));
  for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-rule]')) button.setAttribute('aria-pressed', String(button.dataset.rule === state.rule));
  supply.setAttribute('aria-pressed', String(state.switchClosed));
  supply.textContent = state.switchClosed ? t('打开供电开关') : t('合上供电开关');
  supply.setAttribute('aria-label', state.switchClosed ? t('供电开关已闭合；按下打开') : t('供电开关已打开；按下闭合'));
  returnWire.setAttribute('aria-pressed', String(!state.returnIntact));
  returnWire.textContent = state.returnIntact ? t('断开灯的回线') : t('接好灯的回线');
  sensorLink.setAttribute('aria-pressed', String(!state.sensorConnected));
  sensorLink.textContent = state.sensorConnected ? t('拔掉图中的感光信号线') : t('接回感光信号线');
  light.value = String(state.lightLevel);
  threshold.value = String(state.threshold);
  get('light-description').textContent = t('当前亮暗：{{level}} / 100', { level: state.lightLevel });
  get('threshold-description').textContent = t('分界：{{level}}；低于它算“暗”', { level: state.threshold });
  get('scene-question').textContent = automatic ? t('亮暗变了，哪一个器件先接受信息？') : t('找到开关和回线上的两个位置');
  get('lamp-state').textContent = observation.lampOn ? t('灯亮了') : t('灯没有亮');
  get('diagram-note').textContent = automatic
    ? t('感光器与比较器也由电池供电，供电线省略。电子开关的绿线表示导通，不是移动的接点。')
    : t('先只观察手按开关：电子开关保持导通，感光输入暂不参与。没有小点表示电子速度。');
  let cause: string;
  if (!state.returnIntact && !state.switchClosed) cause = t('两处都没有接好：开关打开，灯的回线也断开。接好其中一处，另一处仍会让灯不亮。');
  else if (!state.returnIntact) cause = observation.commandOn
    ? t('开关虽已合上，电子开关也允许导通，灯的回线却断了。控制信息不能跨过断口给灯供能。')
    : t('灯的回线断了，而且电子开关也未导通。修好一处，还需要检查另一处。');
  else if (!state.switchClosed) cause = t('供电开关的两个接点分开，灯回路还缺一段。试着合上，再沿粗实线找完整的一圈。');
  else if (automatic && !state.sensorConnected) cause = t('感光输入没有接通，比较器没有可用的亮暗信息。本例选择先不点灯；这不是把“没读到”当作“很暗”。');
  else if (observation.lampOn && !automatic) cause = t('供电开关接上了，回线也完整，灯回路导通。电池持续供能，灯把电能变成光和热。');
  else if (observation.lampOn) cause = state.rule === 'dark'
    ? t('感光器附近比设定分界暗，规则要求点灯。电子开关导通，完整回路让电池给灯供能。')
    : t('感光器附近等于或亮于设定分界，反转后的规则要求点灯。相同器件也能按另一条规则工作。');
  else cause = state.rule === 'dark'
    ? t('感光器附近等于或亮于设定分界，夜灯规则要求不亮。电池与回线仍在，电子开关让灯支路不导通。')
    : t('感光器附近比设定分界暗，现在的规则却是“天亮时亮”。规则要求不亮，电子开关让灯支路不导通。');
  get('child-explain').textContent = cause;
  get('try-next').textContent = !automatic
    ? t('先让灯亮，再断开回线。合着的开关能代替那根线吗？')
    : t('先合上开关，试“遮暗”和“照亮”；再保留亮暗，只换控制规则。');
  get('signal-input').textContent = observation.sensorReading === null ? t('输入未接通') : t('收到亮暗 {{level}}', { level: observation.sensorReading });
  get('signal-compare').textContent = observation.belowThreshold === null ? t('没有可用输入') : observation.belowThreshold ? t('低于分界：暗') : t('等于或高于分界：亮');
  get('signal-switch').textContent = observation.electronicConducting ? t('控制为“开”：导通') : t('控制为“关”：不导通');
  get('signal-output').textContent = observation.lampOn ? t('回路完整，灯亮') : t('灯灭；回看回路条件');
  reading.set(studyFor(observation));
}

for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-control]')) button.addEventListener('click', () => {
  state.mode = button.dataset.control === 'automatic' ? 'automatic' : 'manual';
  const url = new URL(location.href);
  if (state.mode === 'automatic') url.searchParams.set('control', 'automatic');
  else url.searchParams.delete('control');
  history.pushState(null, '', url);
  render();
});
supply.addEventListener('click', () => { state.switchClosed = !state.switchClosed; render(); });
returnWire.addEventListener('click', () => { state.returnIntact = !state.returnIntact; render(); });
sensorLink.addEventListener('click', () => { state.sensorConnected = !state.sensorConnected; render(); });
light.addEventListener('input', () => { state.lightLevel = Number(light.value); render(); });
threshold.addEventListener('input', () => { state.threshold = Number(threshold.value); render(); });
for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-light]')) button.addEventListener('click', () => { state.lightLevel = Number(button.dataset.light); render(); });
for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-rule]')) button.addEventListener('click', () => { state.rule = button.dataset.rule === 'bright' ? 'bright' : 'dark'; render(); });
get('reset').addEventListener('click', () => { state = { ...initialCircuit(), mode: state.mode }; render(); });
addEventListener('popstate', () => { state.mode = circuitModeFromQuery(new URLSearchParams(location.search).get('control')); render(); });
mobile.addEventListener('change', render);
// No free-running clock, audio, polling, animation or asynchronous rendering exists in this topic.
render();
