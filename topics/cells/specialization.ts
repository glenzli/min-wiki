import { animateValue } from '../../src/visuals/transition.ts';
import { renderCell } from '../body-cells/scene.ts';
import { renderBlood } from '../blood-cells/scene.ts';
import { explorations as body, muscleControls, muscleExplanation } from '../body-cells/content.ts';
import { explorations as blood } from '../blood-cells/content.ts';
import { t as bodyText } from '../body-cells/i18n.ts';
import { t as bloodText } from '../blood-cells/i18n.ts';
import { clamp, DEFAULT_MUSCLE, muscleForceViewport, type CellKind, type MuscleMode, type MuscleViewport } from '../body-cells/model.ts';
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
  const muscleOptions = { ...DEFAULT_MUSCLE };
  let muscleView:'whole'|'sarcomere'|'forces'='whole';
  let lastMuscleCamera:MuscleViewport={x:0,y:0,width:980,height:550};
  let muscleCamera={from:lastMuscleCamera,blend:1};
  const node = <K extends keyof HTMLElementTagNameMap>(tag:K, value='') => {
    const element=document.createElement(tag); element.textContent=value; return element;
  };
  const musclePanel=node('section'); musclePanel.id='muscle-study'; musclePanel.className='muscle-study';
  const forceView=node('button',muscleControls.forces); forceView.id='muscle-forces';forceView.type='button';
  forceView.setAttribute('aria-pressed','false');el('work-zoom').after(forceView);
  const constraint=node('div'); constraint.className='muscle-constraint'; constraint.setAttribute('role','group'); constraint.setAttribute('aria-label',muscleControls.title);
  const modeButtons=([['shortening',muscleControls.shortening],['isometric',muscleControls.isometric]] as const).map(([mode,label])=>{
    const button=node('button',label); button.type='button'; button.dataset.muscleMode=mode; constraint.append(button); return button;
  });
  const loadLabel=node('label',muscleControls.load); loadLabel.htmlFor='muscle-load';
  const load=node('input'); load.id='muscle-load'; load.type='range'; load.min='0'; load.max='100'; load.step='1';
  const loadReadout=node('output'); loadReadout.setAttribute('for','muscle-load');
  const ends=node('div'); ends.className='muscle-load-ends'; ends.append(node('span',muscleControls.soft),node('span',muscleControls.stiff));
  const loadBox=node('div'); loadBox.className='muscle-load'; loadBox.append(loadLabel,load,ends,node('span',muscleControls.stiffness),loadReadout);
  const legend=node('p',muscleControls.legend); legend.className='muscle-legend';
  const scaleNote=node('p',muscleControls.scale); scaleNote.className='muscle-scale';
  const comparisonNote=node('p',muscleControls.note); comparisonNote.className='muscle-scale';
  const muscleQuestion=node('p'); muscleQuestion.className='muscle-question';
  const numbers=node('p'); numbers.className='muscle-numbers'; numbers.setAttribute('aria-live','off');
  const academic=node('div'); academic.id='muscle-academic';
  const theory=node('p'), formula=node('code'), terms=node('p'), boundary=node('p');
  academic.append(numbers,theory,formula,terms,boundary);
  musclePanel.append(constraint,loadBox,muscleQuestion,legend,scaleNote,comparisonNote,academic);
  el('work-observe').after(musclePanel);
  let kind = initial, playing = false, cancel = () => {}, cancelZoom = () => {}, explained = '';
  const examples = [...body, ...blood];
  const current = () => examples.find(item => item.id === kind)!;
  function draw() {
    const state = states[kind], info = current(), phase = workPhase(kind, state.progress);
    const muscleCopy=kind==='muscle'?muscleExplanation(state.progress,muscleOptions):undefined;
    // Renderer IDs are namespaced because the detailed cellular SVG stays mounted.
    const art = kind === 'barrier' || kind === 'muscle' || kind === 'neuron'
      ? renderCell(kind as CellKind, state.progress, bodyText, muscleOptions) : renderBlood(kind as BloodProcess, state.progress, bloodText);
    scene.innerHTML = art.replace(/id="([^"]+)"/g, 'id="work-$1"').replace(/url\(#([^\)]+)\)/g, 'url(#work-$1)').replace(/href="#([^"]+)"/g, 'href="#work-$1"');
    const focus = kind === 'barrier' ? { x: 490, y: 270 } : kind === 'muscle' ? { x: 490, y: 417 } : kind === 'neuron' ? { x: 859, y: 255 } : kind === 'oxygen' ? { x: 570, y: 295 } : { x: 530, y: 317 };
    const width = 980 / (1 + state.zoom * (kind==='muscle'?.85:1.2)), height = width * 550 / 980;
    const x = 490 + (focus.x - 490) * state.zoom, y = 275 + (focus.y - 275) * state.zoom;
    let camera={x:x-width/2,y:y-height/2,width,height};
    if(muscleCopy) {
      const target=muscleView==='whole'?{x:0,y:0,width:980,height:550}
        :muscleView==='forces'?muscleForceViewport(muscleCopy.state)
        :{x:490-980/1.85/2,y:417-550/1.85/2,width:980/1.85,height:550/1.85};
      const from=muscleCamera.from,blend=muscleCamera.blend;
      camera={x:from.x+(target.x-from.x)*blend,y:from.y+(target.y-from.y)*blend,
        width:from.width+(target.width-from.width)*blend,height:from.height+(target.height-from.height)*blend};
      lastMuscleCamera=camera;
    }
    scene.setAttribute('viewBox', `${camera.x} ${camera.y} ${camera.width} ${camera.height}`);
    scene.setAttribute('aria-label', info.subject);
    scene.dataset.case = kind; scene.dataset.progress = state.progress.toFixed(4);
    scene.dataset.muscleView=kind==='muscle'?muscleView:'whole';
    el('work-subject').textContent = info.subject; el('work-observe').textContent = info.observe;
    if(!muscleCopy) { el('work-phase').textContent = info.stages[phase]!.title; el('work-story').textContent = info.stages[phase]!.body; }
    musclePanel.hidden=kind!=='muscle';
    forceView.hidden=kind!=='muscle';
    if(kind==='muscle') {
      const copy=muscleCopy!;
      const setText=(target:HTMLElement,value:string)=>{if(target.textContent!==value)target.textContent=value;};
      setText(el('work-phase'),copy.title);setText(el('work-story'),copy.child);
      setText(muscleQuestion,copy.question);setText(numbers,copy.readout);setText(theory,copy.academic);
      setText(formula,copy.formula);setText(terms,copy.terms);setText(boundary,copy.boundary);
      load.value=String(Math.round(copy.state.load*100));loadReadout.value=copy.state.springStiffness.toFixed(3);
      load.setAttribute('aria-valuetext',`${muscleControls.stiffness} ${loadReadout.value}`);
      modeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.muscleMode===copy.state.mode)));
      scene.setAttribute('aria-label',`${info.subject}. ${copy.title}. ${copy.child}`);
      if(muscleView==='forces')scene.setAttribute('aria-label',`${muscleControls.forceView}. ${copy.title}. ${copy.child}`);
      scene.dataset.muscleMode=copy.state.mode;scene.dataset.muscleLoad=String(copy.state.load);
      scene.dataset.muscleTension=String(copy.state.tension);
    }
    el<HTMLInputElement>('work-progress').value = String(Math.round(state.progress * 1000));
    el('work-progress').setAttribute('aria-valuetext', `${muscleCopy?.title??info.stages[phase]!.title} · ${Math.round(state.progress * 100)}%`);
    el('work-percent').textContent = `${Math.round(state.progress * 100)}%`;
    el('work-play').textContent = playing ? t('暂停观察') : state.progress >= 1 ? t('再看一次') : t('观察这项工作');
    el('work-play').setAttribute('aria-pressed', String(playing));
    const close=kind==='muscle'?muscleView==='sarcomere':state.zoom>.5;
    el('work-zoom').setAttribute('aria-pressed', String(close));
    el('work-zoom').textContent = close ? t('回到组织全景') : t('靠近工作的位置');
    forceView.setAttribute('aria-pressed',String(kind==='muscle'&&muscleView==='forces'));
    forceView.textContent=muscleView==='forces'?muscleControls.whole:muscleControls.forces;
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
  function stopCamera(){cancelZoom();muscleCamera.blend=1;}
  function select(next: Specialism) { pause(); stopCamera(); kind = next; draw(); onSelect(kind); }
  function inspectMuscle(next:typeof muscleView) {
    cancelZoom();muscleView=next;muscleCamera={from:lastMuscleCamera,blend:0};
    states.muscle.zoom=next==='whole'?0:1;
    cancelZoom=animateValue({from:0,to:1,duration:500,onUpdate:value=>{muscleCamera.blend=value;draw();}});
  }
  const options = el('work-options');
  for (const info of examples) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.specialism = info.id; button.textContent = info.name;
    button.addEventListener('click', () => select(info.id)); options.append(button);
  }
  el('work-play').addEventListener('click', () => {
    if (playing) { pause(); return; }
    cancel(); const state = states[kind]; if (state.progress >= 1) state.progress = 0;
    if(kind==='muscle' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      state.progress=state.progress<.5?.5:1;draw();return;
    }
    playing = true; draw();
    cancel = animateValue({ from: state.progress, to: 1, duration: 8500 * (1 - state.progress), onUpdate: p => { state.progress = p; draw(); }, onComplete: () => { playing = false; draw(); } });
  });
  el('work-reset').addEventListener('click', () => { pause(); states[kind].progress = 0; draw(); });
  el('work-progress').addEventListener('input', () => { const value = Number(el<HTMLInputElement>('work-progress').value) / 1000; pause(); states[kind].progress = value; draw(); });
  el('work-zoom').addEventListener('click', () => {
    if(kind==='muscle'){inspectMuscle(muscleView==='sarcomere'?'whole':'sarcomere');return;}
    cancelZoom(); const state = states[kind]; cancelZoom = animateValue({ from: state.zoom, to: state.zoom > .5 ? 0 : 1, duration: 500, onUpdate: value => { state.zoom = value; draw(); } });
  });
  forceView.addEventListener('click',()=>{if(kind==='muscle')inspectMuscle(muscleView==='forces'?'whole':'forces');});
  el('work-labels').addEventListener('click', () => { const enabled = scene.dataset.labels !== 'true'; scene.dataset.labels = String(enabled); el('work-labels').setAttribute('aria-pressed', String(enabled)); });
  modeButtons.forEach(button=>button.addEventListener('click',()=>{
    pause();muscleOptions.mode=button.dataset.muscleMode as MuscleMode;draw();
  }));
  load.addEventListener('input',()=>{const value=clamp(Number(load.value)/100);pause();muscleOptions.load=value;draw();});
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); stopCamera(); } });
  window.addEventListener('pagehide', () => { pause(); stopCamera(); });
  draw();
  return { pause: () => { pause(); stopCamera(); }, select };
}
