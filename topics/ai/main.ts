import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument, language } from '../../src/platform/i18n.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { t } from './i18n.ts';
import content from './content.json';
import { initialState, selectDemo, selectTask, answerTask, selectClaim, checkClaim,
  taskMatches, taskChoices, evidenceMatches, type Demo, type Entity, type FirstAction, type Evidence } from './model.ts';
import './style.css';

translateDocument(t);
mountTopicNavigation('ai');
const pick = (words: { zh: string; en: string }) => language === 'en' ? words.en : words.zh;
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
let state = initialState();

// Original static illustrations and editorial example results, not AI inference.
const svg = (body: string) => `<svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const boat = (refined: boolean, recognize = false) => svg(`
  <defs><linearGradient id="water" x2="0" y2="1"><stop stop-color="#ecf5f7"/><stop offset="1" stop-color="#c2dce6"/></linearGradient><linearGradient id="paper" x2=".8" y2="1"><stop stop-color="#fffef5"/><stop offset="1" stop-color="#e1d6bf"/></linearGradient></defs>
  <rect width="360" height="180" rx="12" fill="url(#water)"/>
  <g stroke="#87b2c3" stroke-width="2" fill="none" opacity=".7"><path d="M20 134q25-6 50 0m230 12q25-6 45 0M62 160q42-8 84 0m40-12q42-8 84 0"/></g>
  <ellipse cx="184" cy="129" rx="96" ry="8" fill="#527e93" opacity=".16"/>
  ${refined || recognize ? `<path d="M95 99l57-36 29 37 35-37 53 36-24 32H120Z" fill="url(#paper)" stroke="#ac9c82" stroke-width="1.5"/><path d="m95 99 86 1 35-37m-64 0 29 37 88-1m-150 32 62-31 64 31" stroke="#c3b59a" fill="none"/>` : `<path d="M88 100h184l-25 34H112Z" fill="#d6b984" stroke="#ac9163"/><path d="M181 25v75m3-67 67 62h-67Z" stroke="#a38c6f" fill="#faf7e8"/>`}
  ${recognize ? `<path d="M81 54V38h25m170 0h25v16M81 126v17h25m170 0h25v-17" stroke="#507e6e" stroke-width="3" fill="none"/>` : ''}`);
const house = svg(`<rect width="360" height="180" rx="12" fill="#f1eee7"/><ellipse cx="179" cy="148" rx="114" ry="9" fill="#95856e" opacity=".15"/><path d="m83 71 82-46 103 39-31 17-71-31-56 37Z" fill="#c7a475" stroke="#93754f"/><path d="M110 87v56h127V81l-71-31Z" fill="#debd89" stroke="#93754f"/><path d="M154 143V97h42v46m-73-52 18-9v23h-18Z" fill="#8a735e"/><path d="M206 95h18v18h-18Z" fill="#eaf1ec"/><path d="M103 72l21 12m-1-25 22 15m62-33-10 16m32-8-10 13" stroke="#ead5b1" stroke-width="2"/><path d="M54 143v-24m0 11-12-10m12 0 12-12m-12 12-8-16" stroke="#79977d" stroke-width="3"/>`);
const triangle = svg(`<rect width="360" height="180" rx="12" fill="#f2f3ed"/><path d="m82 140 99-109 103 109Z" fill="#d7e6e1" stroke="#4b786c" stroke-width="4"/><g fill="#4b786c" font-family="sans-serif" font-size="24"><text x="115" y="82">1</text><text x="238" y="82">2</text><text x="177" y="167">3</text></g>`);
const materials = svg(`<rect width="360" height="180" rx="12" fill="#f1f0ec"/><path d="M42 130V70a40 40 0 0 1 80 0v60h-22V70a18 18 0 0 0-36 0v60Z" fill="#b1645f" stroke="#794d49" stroke-width="2"/><path d="M43 112h20v18H43m58-18h20v18h-20" fill="#d6d9d7" stroke="#858c8b"/><path d="m153 80 14 35q6 16-8 20-10 3-15-9l-12-29q-5-13 5-17 7-3 11 7l11 27q3 8-3 10-4 2-7-6l-9-24" fill="none" stroke="#777f84" stroke-width="4"/><ellipse cx="267" cy="69" rx="35" ry="12" fill="#e5e8e7" stroke="#939d9e"/><path d="M232 69v60c0 17 70 17 70 0V69" fill="#bdc8cb" stroke="#939d9e"/><ellipse cx="267" cy="129" rx="35" ry="12" fill="#bdc8cb" stroke="#939d9e"/><ellipse cx="267" cy="69" rx="35" ry="12" fill="#e5e8e7" stroke="#939d9e"/>`);
const notice = svg(`<rect width="360" height="180" rx="12" fill="#f2f1ed"/><path d="M119 16h125v148H119Z" fill="#fffef9" stroke="#b3b1a6"/><rect x="136" y="35" width="91" height="14" rx="3" fill="#c0d2c9"/><path d="M136 70h91m-91 18h91m-91 18h64m-64 18h51" stroke="#c6c5bc" stroke-width="3"/><circle cx="99" cy="126" r="25" fill="#d9b983"/><text x="99" y="136" text-anchor="middle" font-size="32" fill="#715c3c">?</text>`);
const entityPictures: Record<Entity, string> = {
  person: svg(`<circle cx="180" cy="62" r="33" fill="#d3ab89"/><path d="M144 59q-3-44 39-43 39 2 33 51l-16-34-50 11Z" fill="#675b4f"/><path d="M123 164v-39q0-42 57-42t57 42v39Z" fill="#79968b"/><path d="M159 94l21 24 23-24" fill="#ede2d2"/><circle cx="169" cy="61" r="2" fill="#5a4d44"/><circle cx="191" cy="61" r="2" fill="#5a4d44"/><path d="M171 74q9 6 18 0" stroke="#8f6757" fill="none"/>`),
  program: svg(`<rect x="115" y="17" width="130" height="150" rx="15" fill="#7e8887"/><rect x="128" y="30" width="104" height="43" rx="6" fill="#dce4da"/><text x="180" y="59" text-anchor="middle" font-size="22" fill="#52625a">2+3=5</text><g fill="#e4e6df"><rect x="128" y="88" width="27" height="21" rx="4"/><rect x="166" y="88" width="27" height="21" rx="4"/><rect x="205" y="88" width="27" height="21" rx="4"/><rect x="128" y="122" width="27" height="21" rx="4"/><rect x="166" y="122" width="27" height="21" rx="4"/><rect x="205" y="122" width="27" height="21" rx="4"/></g>`),
  ai: svg(`<rect x="88" y="27" width="184" height="121" rx="10" fill="#6b777b"/><rect x="98" y="37" width="164" height="100" rx="4" fill="#e7edec"/><path d="M73 148h214l-19 14H92Z" fill="#a4adaa"/><path d="M116 54h130v49h-98l-19 14v-14h-13Z" fill="#b3cfc5"/><path d="M129 69h91m-91 16h69" stroke="#659888" stroke-width="5"/>`),
  robot: svg(`<rect x="144" y="24" width="76" height="53" rx="12" fill="#bfc9c8" stroke="#788988"/><circle cx="162" cy="50" r="8" fill="#678d91"/><circle cx="202" cy="50" r="8" fill="#678d91"/><path d="M182 24V13m-13 64v15m26-15v15" stroke="#788988" stroke-width="7"/><rect x="138" y="89" width="91" height="50" rx="12" fill="#d4bd91" stroke="#9b895f"/><path d="M139 104h-23v30m114-30h22v30" fill="none" stroke="#788988" stroke-width="9"/><circle cx="151" cy="150" r="15" fill="#65706f"/><circle cx="218" cy="150" r="15" fill="#65706f"/>`),
};

function pressed(selector: string, value: string, attribute: string) {
  for (const button of document.querySelectorAll<HTMLButtonElement>(`button${selector}`)) {
    button.setAttribute('aria-pressed', String(button.getAttribute(attribute) === value));
  }
}
function render() {
  const demo = content.demos[state.demo];
  pressed('[data-demo]', state.demo, 'data-demo');
  el('request').textContent = pick(state.refined ? demo.refinedRequest : demo.request);
  el('response').textContent = pick(state.refined ? demo.refinedResponse : demo.response);
  el('example-cause').textContent = pick(demo.cause);
  el('refine').textContent = pick(state.refined ? content.ui.simple : content.ui.refine);
  el('refine').setAttribute('aria-pressed', String(state.refined));
  el('prompt-hint').textContent = pick(state.refined ? content.ui.hintRefined : content.ui.hintSimple);
  el('output-art').innerHTML = state.demo === 'chat' ? house : boat(state.refined, state.demo === 'recognize');
  el('input-picture').hidden = state.demo !== 'recognize';
  el('input-art').innerHTML = state.demo === 'recognize' ? boat(true) : '';
  el('output-art').hidden = state.demo === 'recognize';
  const entity = content.entities[state.entity];
  pressed('[data-entity]', state.entity, 'data-entity');
  el('entity-title').textContent = pick(entity.title);
  el('entity-copy').textContent = pick(entity.body);
  el('entity-example').textContent = pick(entity.example);
  el('entity-art').innerHTML = entityPictures[state.entity];
  const task = content.tasks[state.task]!;
  pressed('[data-task]', String(state.task), 'data-task');
  el('task-number').textContent = `${state.task + 1} / ${content.tasks.length}`;
  el('task-question').textContent = pick(task.title);
  el('task-context').textContent = pick(task.context);
  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button, index) => {
    const choice = taskChoices[state.task]![index]!;
    button.dataset.action = choice;
    button.textContent = pick(content.choices[choice]);
  });
  pressed('[data-action]', state.answers[state.task] ?? '', 'data-action');
  const taskDetail = state.answers[state.task] === 'observe' && 'feedbackObserve' in task && task.feedbackObserve
    ? task.feedbackObserve : task.feedback;
  el('task-feedback').textContent = state.answers[state.task] === null
    ? pick(content.ui.taskInitial)
    : `${pick(taskMatches(state) ? content.ui.taskGood : content.ui.taskOther)} ${pick(taskDetail)}`;
  const claim = content.claims[state.claim]!;
  pressed('[data-claim]', String(state.claim), 'data-claim');
  el('claim-text').textContent = pick(claim.text);
  el('claim-art').innerHTML = [triangle, materials, notice][state.claim]!;
  pressed('[data-evidence]', state.checked[state.claim] ?? '', 'data-evidence');
  const checked = state.checked[state.claim] !== null;
  const matched = checked && evidenceMatches(state);
  el('check-feedback').textContent = pick(!checked ? content.ui.evidenceInitial : matched ? claim.result : content.ui.evidenceOther);
  el('evidence-detail').textContent = matched ? pick(claim.detail) : checked ? pick(content.ui.evidenceQuestion) : '';
  const link = el<HTMLAnchorElement>('evidence-link');
  link.hidden = !matched || !('link' in claim);
  if ('link' in claim && typeof claim.link === 'string' && claim.linkText) {
    link.href = claim.link; link.textContent = pick(claim.linkText);
  }
  el('examples').dataset.activeDemo = state.demo;
  el('task-lab').dataset.activeTask = String(state.task);
  el('check-lab').dataset.activeClaim = String(state.claim);
  el('check-lab').dataset.verified = String(matched);
}
for (const [id, entries, attribute] of [
  ['task-tabs', content.tasks.map(x => x.title), 'task'],
  ['claim-tabs', content.claims.map(x => x.label), 'claim'],
] as const) {
  entries.forEach((title, index) => {
    const button = document.createElement('button'); button.type = 'button';
    button.dataset[attribute] = String(index); button.textContent = pick(title);
    el(id).append(button);
  });
}
for (const source of content.sources) {
  const li = document.createElement('li'), link = document.createElement('a'), detail = document.createElement('small');
  link.href = source.url; link.textContent = source.title; link.target = '_blank'; link.rel = 'noopener noreferrer';
  detail.textContent = pick(source.claim); li.append(link, detail); el('source-list').append(li);
}
document.querySelectorAll<HTMLButtonElement>('[data-demo]').forEach(button => button.addEventListener('click', () => {
  state = selectDemo(state, button.dataset.demo as Demo); render();
}));
el('refine').addEventListener('click', () => { state = { ...state, refined: !state.refined }; render(); });
document.querySelectorAll<HTMLButtonElement>('[data-entity]').forEach(button => button.addEventListener('click', () => {
  state = { ...state, entity: button.dataset.entity as Entity }; render();
}));
document.querySelectorAll<HTMLButtonElement>('[data-task]').forEach(button => button.addEventListener('click', () => {
  state = selectTask(state, Number(button.dataset.task)); render();
}));
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.addEventListener('click', () => {
  state = answerTask(state, button.dataset.action as FirstAction); render();
}));
document.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach(button => button.addEventListener('click', () => {
  state = selectClaim(state, Number(button.dataset.claim)); render();
}));
document.querySelectorAll<HTMLButtonElement>('[data-evidence]').forEach(button => button.addEventListener('click', () => {
  state = checkClaim(state, button.dataset.evidence as Evidence); render();
}));
el('restart').addEventListener('click', () => {
  state = initialState(); render(); document.querySelector<HTMLButtonElement>('[data-demo="chat"]')?.focus();
});
render();
mountReadingMode('details.deeper');
