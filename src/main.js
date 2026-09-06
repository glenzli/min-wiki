import * as THREE from 'three';
import { TdeSimulation } from './physics/tdeSimulation.js';
import { Playback, SCENARIOS, orbitAt, TIDAL_RADIUS, motionProgress, playbackProgress } from './physics/encounter.js';
import { STORIES, ACADEMIC, stageAt, ROUTE_DESCRIPTIONS } from './story.js';
import { SpaceSynth } from './audio/spaceSynth.js';

const $ = id => document.getElementById(id);
const clockLabel = seconds => `${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;

class App {
  constructor() {
    this.playback = new Playback();
    this.synth = new SpaceSynth();
    this.soundEnabled = false;
    this.mode = 'kids';
    this.dialog = $('about-dialog');
    this.lastFrame = performance.now();
    this.phaseKey = '';
    this.uiProgress = -1;
    this.origin = new THREE.Vector3();
    try { this.simulation = new TdeSimulation($('canvas-container')); }
    catch(error) { console.error('Scene initialization failed', error); $('scene-error').hidden = false; }
    this.bindControls();
    this.buildStages();
    this.updateUI();
    this.animate = this.animate.bind(this);
    this.frame = requestAnimationFrame(this.animate);
    window.addEventListener('pagehide', event => { if(event.persisted) return; cancelAnimationFrame(this.frame); this.synth.stop(); this.simulation?.dispose(); }, {once:true});
  }
  bindControls() {
    document.querySelectorAll('[data-mode]').forEach(button => {
      if(button.tagName !== 'BUTTON') return;
      button.addEventListener('click', () => {
        this.mode = button.dataset.mode;
        document.body.dataset.mode = this.mode;
        document.querySelectorAll('button[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
        this.updateUI();
      });
    });
    $('btn-play').addEventListener('click', () => this.togglePlay());
    $('btn-retry-gas').addEventListener('click', () => {
      this.simulation?.selectScenario(this.playback.scenario);
      this.updateUI();
    });
    $('btn-restart').addEventListener('click', () => {
      this.playback.seek(0); this.playback.playing = true; this.syncPlayback();
    });
    document.querySelectorAll('[data-scenario]').forEach(button => button.addEventListener('click', () => {
      if(this.playback.scenario===button.dataset.scenario) return;
      this.playback.select(button.dataset.scenario);
      this.playback.playing = false;
      this.simulation?.selectScenario(this.playback.scenario);
      this.buildStages(); this.syncPlayback();
    }));
    $('speed').addEventListener('change', event => { this.playback.speed = Number(event.target.value); });
    const range=$('progress');
    // Native range supports touch, pointer capture, keyboard, and assistive tech.
    // Seeking deliberately pauses, leaving the requested moment available to inspect.
    range.addEventListener('input', () => {
      this.playback.playing=false;
      this.playback.seek(Number(range.value)/1000);
      this.syncPlayback();
    });
    document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
      this.simulation?.setView(button.dataset.view);
      document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    }));
    $('toggle-guides').addEventListener('change', event => {
      if(this.simulation) this.simulation.guidesVisible=event.target.checked;
      $('scene-legend').hidden=!event.target.checked;
    });
    $('toggle-sound').addEventListener('change', event => { this.soundEnabled=event.target.checked; this.syncAudio(); });
    $('btn-about').addEventListener('click', () => {
      this.resumeAfterDialog=this.playback.playing;
      this.playback.playing=false; this.syncPlayback(); this.dialog.showModal();
    });
    for(const id of ['btn-close','btn-understood']) $(id).addEventListener('click',()=>this.dialog.close());
    this.dialog.addEventListener('click',event=>{ if(event.target===this.dialog) {
      const r=this.dialog.getBoundingClientRect();
      if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) this.dialog.close();
    }});
    this.dialog.addEventListener('close',()=>{ this.playback.playing=!!this.resumeAfterDialog; this.syncPlayback(); });
    document.addEventListener('keydown', event => {
      if(event.code!=='Space'||event.repeat||event.target.closest('button,input,select,textarea,a,[contenteditable]')||this.dialog.open) return;
      event.preventDefault(); this.togglePlay();
    });
    document.addEventListener('visibilitychange',()=>{
      this.lastFrame=performance.now();
      if(document.hidden) this.synth.stop(); else this.syncAudio();
    });
  }
  togglePlay() {
    if (this.simulation?.gasStatus !== 'ready') return;
    if(this.playback.progress>=1) this.playback.seek(0);
    this.playback.playing=!this.playback.playing;
    this.syncPlayback();
  }
  buildStages() {
    const { scenario }=this.playback;
    $('stage-buttons').replaceChildren(...STORIES[scenario].map((phase,i)=>{
      const button=document.createElement('button');
      button.innerHTML=`<span class="step-num">0${i+1}</span>${phase.label}`;
      button.setAttribute('aria-label',`第${i+1}步：${phase.label}`);
      button.addEventListener('click',()=>{
        this.playback.seek(playbackProgress(phase.at, scenario)); this.playback.playing=false; this.syncPlayback();
      });
      return button;
    }));
    document.querySelectorAll('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===scenario)));
    $('duration').textContent=clockLabel(SCENARIOS[scenario].duration);
    $('route-description').textContent=ROUTE_DESCRIPTIONS[scenario];
    $('observation-note').hidden=!SCENARIOS[scenario].disrupted;
    $('tidal-legend').hidden=!!SCENARIOS[scenario].noBlackHole;
  }
  syncAudio() {
    const audible=this.soundEnabled&&this.playback.playing&&!document.hidden;
    if(audible&&!this.synth.isPlaying) this.synth.start();
    if(!audible&&this.synth.isPlaying) this.synth.stop();
  }
  syncPlayback() { this.syncAudio(); this.updateUI(); }
  updateUI() {
    const { scenario,progress,playing }=this.playback;
    const motion = motionProgress(progress, scenario);
    const absent=!!SCENARIOS[scenario].noBlackHole;
    $('view-note').hidden=absent;
    const viewNote=this.simulation?.view==='top'
      ? '黑色区域是内界；虚线范围仍在黑洞外面'
      : '外部气流可能被前后遮挡；切换「从上看」可看清绕行';
    if ($('view-note').textContent!==viewNote) $('view-note').textContent=viewNote;
    const gasStatus = this.simulation?.gasStatus ?? 'error';
    $('scene-loading').hidden=gasStatus!=='loading';
    $('gas-error').hidden=gasStatus!=='error';
    $('canvas-container').setAttribute('aria-busy',String(gasStatus==='loading'));
    $('btn-play').disabled=gasStatus!=='ready';
    $('btn-restart').disabled=gasStatus!=='ready';
    const absorbed = this.simulation?.absorbed ?? 0;
    $('gas-outcome').hidden=absorbed===0;
    const outcome = this.mode==='academic'
      ? `已跨过模型内界：${(absorbed/12000*100).toFixed(1)}% 的气体采样点`
      : '一部分气体已落入黑洞，外面的气体还在运动';
    if ($('gas-outcome').textContent!==outcome) $('gas-outcome').textContent=outcome;
    const index=stageAt(progress,scenario), key=`${scenario}:${index}:${this.mode}`;
    if(this.phaseKey!==key) {
      this.phaseKey=key;
      const phase=STORIES[scenario][index];
      const adult=ACADEMIC[scenario][index];
      const academic=this.mode==='academic';
      $('phase-number').textContent=`0${index+1}`;
      $('phase-title').textContent=academic?adult.title:phase.title;
      $('phase-desc').textContent=academic?adult.desc:phase.desc;
      $('phase-notice').textContent=academic?adult.teach:phase.notice;
      $('notice-heading').textContent=academic?'可以这样讲给孩子听':'找一找，想一想';
      $('phase-formula').textContent=adult.formula;
      $('phase-terms').textContent=adult.terms;
      $('phase-fact').textContent=adult.caution;
      $('scene-status').textContent=phase.status;
      [...$('stage-buttons').children].forEach((b,i)=>{
        if(i===index) b.setAttribute('aria-current','step'); else b.removeAttribute('aria-current');
        b.classList.toggle('completed',i<index);
      });
    }
    if(this.mode==='academic') {
      const p=orbitAt(motion,scenario);
      const intact=!SCENARIOS[scenario].disrupted||motion<0.44;
      $('model-distance').textContent=absent?'无黑洞':intact?(p.radius/TIDAL_RADIUS).toFixed(2):'已瓦解';
      $('model-speed').textContent=absent?'—':intact?Math.sqrt(SCENARIOS[scenario].pericenter/p.radius).toFixed(2):'—';
      $('model-beta').textContent=absent?'—':(TIDAL_RADIUS/SCENARIOS[scenario].pericenter).toFixed(2);
    }
    const percent=Math.round(progress*1000);
    if(this.uiProgress!==percent) {
      this.uiProgress=percent;
      $('progress').value=percent;
      $('progress').style.setProperty('--progress',`${progress*100}%`);
      $('progress').setAttribute('aria-valuetext',`${Math.round(progress*100)}%，${STORIES[scenario][index].label}`);
    }
    const elapsed=clockLabel(progress*SCENARIOS[scenario].duration);
    if($('elapsed').textContent!==elapsed) $('elapsed').textContent=elapsed;
    const label=playing?'暂停看看':progress>=1?'再看一次':progress>0?'继续旅行':'开始旅行';
    if($('play-text').textContent!==label) {
      $('play-text').textContent=label;
      $('play-icon').textContent=playing?'Ⅱ':'▶';
      $('btn-play').setAttribute('aria-label',label);
    }
  }
  updateLabels() {
    const sim=this.simulation;
    if(!sim) return;
    const star=sim.labelPosition(sim.focus), hole=sim.labelPosition(this.origin);
    const place=(element,point,dx,dy,visible)=>{
      element.hidden=!point.visible||!visible;
      // Keep labels within the viewport even after free camera rotations.
      const x=Math.max(12,Math.min(sim.container.clientWidth-element.offsetWidth-12,point.x+dx));
      const y=Math.max(48,Math.min(sim.container.clientHeight-100,point.y+dy));
      element.style.transform=`translate3d(${x}px,${y}px,0)`;
    };
    place($('star-label'),star,16,-49,sim.starVisible);
    const diskVisible=SCENARIOS[this.playback.scenario].disrupted&&motionProgress(this.playback.progress,this.playback.scenario)>0.58;
    const labelBelow=diskVisible&&sim.container.clientWidth<600;
    place($('hole-label'),hole,labelBelow?-55:diskVisible?108:28,labelBelow?90:18,!SCENARIOS[this.playback.scenario].noBlackHole);
  }
  animate(now) {
    const delta=Math.min((now-this.lastFrame)/1000,0.05);
    this.lastFrame=now;
    if(!document.hidden) {
      const wasPlaying=this.playback.playing;
      if (this.simulation?.gasStatus==='ready') this.playback.tick(delta);
      if(wasPlaying!==this.playback.playing) this.syncAudio();
      this.simulation?.update(motionProgress(this.playback.progress,this.playback.scenario),this.playback.scenario);
      this.updateUI(); this.updateLabels();
      this.synth.updateProgress(SCENARIOS[this.playback.scenario].disrupted?Math.min(1,motionProgress(this.playback.progress,this.playback.scenario)):0);
    }
    this.frame=requestAnimationFrame(this.animate);
  }
}
new App();
