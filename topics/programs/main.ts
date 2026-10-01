import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountSceneReading } from '../../src/platform/sceneReading.ts';
import { t } from './i18n.ts';
import { ProgramScene } from './scene.ts';
import { studies } from './study.ts';
import { createProgram, stepProgram, playProgram, pauseProgram, tickProgram, resetProgram, setObstacle, fixOrder, type ProgramState, type Scenario, type Operation } from './model.ts';

translateDocument(t);
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
const lab = document.querySelector<HTMLElement>('.program-lab')!;
const reading = mountSceneReading(lab, { id: 'program-study', childTarget: el('child-note') });
const states: Record<Scenario, ProgramState> = { sequence: createProgram('sequence'), condition: createProgram('condition'), debug: createProgram('debug') };
const raw = new URLSearchParams(location.search).get('experiment');
let scenario: Scenario = raw === 'condition' || raw === 'debug' ? raw : 'sequence';
const scene = new ProgramScene(document.querySelector<SVGSVGElement>('#program-scene')!);
const operationLabels = (): Record<Operation, string> => ({ load: t('取货'), east: t('向右走一格'), north: t('向上走一格'), south: t('向下走一格'), look: t('看看前面：有箱子吗？'), unload: t('在 B 点放下包裹') });
let frame = 0, previousTime = 0, cardsSignature = '';
const current = () => states[scenario];
function statusText(s: ProgramState): string {
  if (s.status === 'error') {
    if (s.fault === 'not-at-pickup') return t('停在取货卡：小车已离开 A 点，包裹还在那里。需要改顺序，而不是只按更快。');
    if (s.fault === 'obstacle') return t('屏幕保护停住了小车：它早已选好直路，程序没有再读传感器。画面不允许小车与箱子重叠；真实小车若不再检查，可能撞上。重新试，让它重新读输入。');
    return t('这条指令无法完成。重新检查小车的位置、包裹和指令顺序。');
  }
  if (s.status === 'finished') return t('送到了！同一个包裹现在在 B 点。回看每张卡，你能说出哪一步决定了结果吗？');
  if (s.executed === 0) return t('先猜下一步会发生什么，再执行第一张卡。现在小车和包裹都在 A 点。');
  const next = s.instructions[s.pc];
  return t('已执行 {{count}} 条。下一条：{{command}}。', { count: s.executed, command: next ? operationLabels()[next.operation] : t('完成') });
}
function renderCards(s: ProgramState) {
  const signature = `${scenario}:${s.instructions.map(c => c.id).join(',')}`;
  if (signature !== cardsSignature) {
    cardsSignature = signature;
    const labels = operationLabels();
    el('instruction-cards').replaceChildren(...s.instructions.map(card => {
      const item = document.createElement('li'); item.dataset.card = card.id;
      if (card.branch) item.dataset.branch = card.branch;
      const marker = document.createElement('span'); marker.className = 'card-marker'; marker.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span'); text.textContent = labels[card.operation];
      const type = document.createElement('span'); type.className = 'card-kind';
      type.textContent = card.operation === 'look' ? t('判断') : card.branch ? t('所选路线') : '';
      item.append(marker, text, type); return item;
    }));
  }
  const ended = s.status === 'finished' || s.status === 'error';
  [...el('instruction-cards').children].forEach((item, index) => {
    item.classList.toggle('executed', index < s.pc);
    item.classList.toggle('next', index === s.pc && !ended);
    item.classList.toggle('failed', s.status === 'error' && index === s.pc - 1);
    if (index === s.pc && !ended) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    item.querySelector('.card-marker')!.textContent = s.status === 'error' && index === s.pc - 1 ? '!' : index < s.pc ? '✓' : index === s.pc && !ended ? '→' : String(index + 1);
  });
}
function render() {
  const s = current(); scene.draw(s); renderCards(s);
  lab.dataset.scenario = scenario; lab.dataset.status = s.status; lab.dataset.executed = String(s.executed);
  document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scenario === scenario)));
  el('input-panel').hidden = scenario !== 'condition'; el('branch-preview').hidden = scenario !== 'condition'; el('debug-panel').hidden = scenario !== 'debug';
  el<HTMLInputElement>('obstacle').checked = s.obstacle;
  el('fix-order').hidden = s.corrected; el('break-order').hidden = !s.corrected;
  const ended = s.status === 'finished' || s.status === 'error';
  el<HTMLButtonElement>('step').disabled = ended; el<HTMLButtonElement>('run').disabled = ended || s.status === 'running'; el<HTMLButtonElement>('pause').disabled = s.status !== 'running';
  el('run').textContent = s.status === 'paused' ? t('继续执行') : t('连续执行');
  const status = statusText(s); if (el('status').textContent !== status) el('status').textContent = status;
  el('command-count').textContent = t('{{count}} 张卡', { count: s.instructions.length });
  el('sensor-status').textContent = s.sensor === null ? t('还没执行判断卡：传感器读数尚未读取。') : s.sensor ? t('判断时读到：有箱子。已经选择旁边的小路。') : t('判断时读到：没有箱子。已经选择直路。');
  document.querySelectorAll<HTMLElement>('#branch-preview [data-branch]').forEach(branch => { branch.classList.toggle('chosen', s.choice === branch.dataset.branch); branch.classList.toggle('not-chosen', s.choice !== null && s.choice !== branch.dataset.branch); });
}
function stop() { cancelAnimationFrame(frame); frame = 0; previousTime = 0; states[scenario] = pauseProgram(current()); }
function animate(time: number) {
  const before = current(); states[scenario] = tickProgram(before, previousTime ? time - previousTime : 0); previousTime = time;
  if (current().executed !== before.executed || current().status !== before.status) render();
  if (current().status === 'running') frame = requestAnimationFrame(animate); else { frame = 0; previousTime = 0; }
}
function selectScenario(next: Scenario) {
  stop(); scenario = next; reading.set(studies[scenario]); render();
  const url = new URL(location.href); url.searchParams.set('experiment', scenario); history.replaceState(null, '', url);
}
document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(b => b.addEventListener('click', () => selectScenario(b.dataset.scenario as Scenario)));
el('step').addEventListener('click', () => { stop(); states[scenario] = stepProgram(current()); render(); });
el('run').addEventListener('click', () => { stop(); states[scenario] = playProgram(current()); if (current().status === 'running') frame = requestAnimationFrame(animate); render(); });
el('pause').addEventListener('click', () => { stop(); render(); });
el('reset').addEventListener('click', () => { stop(); states[scenario] = resetProgram(current()); render(); });
el('obstacle').addEventListener('change', () => { states[scenario] = setObstacle(current(), el<HTMLInputElement>('obstacle').checked); render(); });
el('fix-order').addEventListener('click', () => { stop(); states[scenario] = fixOrder(current(), true); cardsSignature = ''; render(); el('break-order').focus(); });
el('break-order').addEventListener('click', () => { stop(); states[scenario] = fixOrder(current(), false); cardsSignature = ''; render(); el('fix-order').focus(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); render(); } });
window.addEventListener('pagehide', event => { stop(); if (!event.persisted) scene.dispose(); });
reading.set(studies[scenario]); render(); mountTopicNavigation('programs');
