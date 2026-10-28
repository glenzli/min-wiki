import content from './galacticContent.json';
import { galacticCases, turnGalacticView, type GalacticCase, type GalacticState } from './galacticModel.ts';
import { GalacticScene } from './galacticScene.ts';
import navigationWords from './content.json';
import {MagnificationInput,ViewZoomControls,viewZoom} from './viewNavigation.ts';
import {isSkyCase} from './skyModel.ts';
import {SkyStudy} from './skyStudy.ts';
import skyWords from './skyContent.json';
import explorationWords from './explorationContent.json';
import {sceneCases,sceneChapter} from './explorationNavigation.ts';

const make = <K extends keyof HTMLElementTagNameMap>(tag: K, value = '', className = '') => { const node = document.createElement(tag); node.textContent = value; node.className = className; return node; };

/** Owns selection, manual camera gestures, bounded drawing and retry for the galaxy chapter. */
export class GalacticStudy {
  readonly childTarget = make('p');
  readonly copy = make('article', '', 'galactic-copy');
  private words: typeof content.ui.en;
  private state: GalacticState;
  private scene?: GalacticScene;
  private stage = make('div', '', 'galactic-stage');
  private structureHost = make('div', '', 'galactic-scene-layer');
  private skyHost = make('div', '', 'sky-scene-layer');
  private skyStudy: SkyStudy;
  private hint = make('p', '', 'galactic-hint');
  private boundary = make('p', '', 'galactic-boundary');
  private bridgeButton = make('button');
  private orionButton = make('button');
  private companionLink = make('a');
  private title = make('h2');
  readonly caseNavigation = make('nav', '', 'galactic-choices');
  private caseButtons = new Map<GalacticCase,HTMLButtonElement>();
  private yaw = make('input');
  private pitch = make('input');
  private yawLabel?: HTMLLabelElement;
  private pitchLabel?: HTMLLabelElement;
  private layers = make('div', '', 'galactic-layers');
  private failure = make('div', '', 'galactic-fallback');
  private coordinate = make('p', '', 'galactic-coordinate');
  private status = make('span', '', 'galactic-render-status');
  private source = make('a');
  private resumeZoom = make('button');
  private active = false;
  private frame = 0;
  private disposed = false;
  private renderedCase = '';
  private drag?: { id: number; x: number; y: number };
  private magnification:MagnificationInput;
  private zoomControls:ViewZoomControls;
  constructor(private root: HTMLElement, private language: string, initial: GalacticState, private changed: (state: GalacticState, checkpoint: boolean) => void, onward: (restart:boolean) => void) {
    this.copy.dataset.readerSupport='';
    this.state = { ...initial, sky: {...initial.sky} }; this.words = language === 'en' ? content.ui.en : content.ui.zh; const w = this.words;
    const heading = make('div', '', 'galactic-heading'); this.title.textContent = w.heading;
    const lesson=language==='en'?explorationWords.en:explorationWords.zh;
    this.caseNavigation.setAttribute('aria-label',lesson.caseLabel);this.caseNavigation.dataset.readerControls='';
    for (const selected of galacticCases) { const button=make('button',lesson.cases[selected]);button.dataset.case=selected;button.onclick=()=>{this.cancelDraw();this.state.selected=selected;if(selected==='galaxy-comparison')this.state.zoom=1;this.sync(true);};this.caseButtons.set(selected,button);this.caseNavigation.append(button); }
    heading.append(this.title,this.bridgeButton,this.orionButton); root.append(heading,this.caseNavigation);
    this.stage.tabIndex = 0; this.stage.setAttribute('role', 'group'); this.stage.setAttribute('aria-label', w.heading); this.stage.setAttribute('aria-describedby', 'galactic-gesture-hint');
    const navigation=language==='en'?navigationWords.navigation.en:navigationWords.navigation.zh;
    this.hint.textContent=navigation.viewHint; this.hint.id = 'galactic-gesture-hint'; this.stage.append(this.structureHost,this.skyHost,this.status); root.append(this.stage);
    const magnify=(factor:number,checkpoint:boolean)=>{const before=this.state.zoom;this.state.zoom=viewZoom(before*factor);if(before===this.state.zoom&&!checkpoint)return false;this.sync(checkpoint);return before!==this.state.zoom;};
    this.magnification=new MagnificationInput(this.stage,()=>this.active&&!document.hidden&&!this.disposed,magnify);
    this.zoomControls=new ViewZoomControls(navigation,factor=>magnify(factor,true),()=>{this.state.zoom=1;this.sync(true);});
    this.skyStudy = new SkyStudy(this.skyHost,this.stage,language,(sky,checkpoint)=>{this.state.sky={...sky};this.hint.textContent=this.skyStudy.hint;this.boundary.textContent=this.skyStudy.boundary;this.changed({...this.state},checkpoint);},failed=>{if(isSkyCase(this.state.selected)){this.failure.hidden=!failed;this.status.textContent=`${w.status}: ${failed? (language==='en'?skyWords.en:skyWords.zh).canvas:(language==='en'?skyWords.en:skyWords.zh).gpu}`;}},()=>{this.state.selected='spiral';this.sync(true);},()=>this.magnification.pinching);
    const presets = make('nav', '', 'galactic-presets'); presets.setAttribute('aria-label', w.pitch);
    for (const [name, value] of [[w.face, 0], [w.edge, Math.PI / 2], [w.oblique, .92]] as const) { const button = make('button', name); button.dataset.pitch = String(value); button.onclick = () => { this.state.pitch = value; this.sync(true); }; presets.append(button); }
    const sliders = make('div', '', 'galactic-sliders');
    for (const [input, name, min, max] of [[this.yaw, w.yaw, -Math.PI, Math.PI], [this.pitch, w.pitch, 0, Math.PI / 2]] as const) {
      input.type = 'range'; input.min = String(min); input.max = String(max); input.step = '.005'; input.setAttribute('aria-label', name); const label = make('label', name); label.append(input); sliders.append(label);
      if (input === this.pitch) this.pitchLabel = label; else this.yawLabel = label;
      input.oninput = () => { this.state.yaw = Number(this.yaw.value); this.state.pitch = Number(this.pitch.value); this.sync(false); };
      input.onchange = () => this.changed({ ...this.state }, true);
    }
    for (const part of ['disk', 'bulge', 'halo', 'guides'] as const) { const button = make('button', w[part]); button.dataset.part = part; button.onclick = () => { this.state[part] = !this.state[part]; this.sync(true); }; this.layers.append(button); }
    this.source.textContent = w.source; this.source.target = '_blank'; this.source.rel = 'noreferrer'; const next = make('button', w.onward); next.onclick = () => onward(true);this.resumeZoom.textContent=w.continueZoom;this.resumeZoom.onclick=()=>onward(false);this.resumeZoom.hidden=true;
    const options = make('details', '', 'galactic-options'), optionBody = make('div', '', 'galactic-option-body'); optionBody.append(sliders, this.layers, this.coordinate); options.append(make('summary', w.options), optionBody);
    const tools = make('div', '', 'galactic-tools'); tools.append(presets,this.zoomControls.element, options);
    this.boundary.textContent=w.shortBoundary;
    this.bridgeButton.onclick=()=>{this.state.sky.view=this.state.selected==='spiral'?'space':'ground';this.state.sky.direction=this.state.selected==='spiral'?'andromeda':'disk';this.state.sky.milkyProgress=0;this.state.selected='sky';this.sync(true);};
    this.orionButton.onclick=()=>{if(this.state.selected==='orion'){this.state.sky.locateOrion=true;this.state.selected='milky-way';}else this.state.selected='orion';this.sync(true);};
    this.companionLink.href=`../stars/?lang=${language==='en'?'en':'zh'}&chapter=orbits&orbit=circumbinary`;this.companionLink.textContent=(language==='en'?skyWords.en:skyWords.zh).keplerLink;
    this.copy.append(this.childTarget,this.companionLink,this.source, make('p',w.zoomHandoff), next,this.resumeZoom);
    const retry = make('button', w.retry); retry.onclick = () => isSkyCase(this.state.selected)?this.skyStudy.retry():this.scene?.retry(); this.failure.append(make('p', w.fallback), retry); this.failure.hidden = true;
    root.append(this.skyStudy.controls,tools, this.hint, this.boundary, this.failure, this.copy);
    this.stage.addEventListener('pointerdown', this.pointerDown); this.stage.addEventListener('pointermove', this.pointerMove); this.stage.addEventListener('pointerup', this.pointerEnd); this.stage.addEventListener('pointercancel', this.pointerEnd); this.stage.addEventListener('lostpointercapture', this.pointerEnd); this.stage.addEventListener('keydown', this.keyDown);
    this.sync(false);
  }
  private pointerDown = (event: PointerEvent) => { if(this.magnification.pinching){this.drag=undefined;return;}if (!this.active || event.button !== 0 || (event.target as Element)?.closest?.('button') || isSkyCase(this.state.selected)&&this.state.selected!=='trappist-1') return; this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY }; this.stage.setPointerCapture(event.pointerId); };
  private pointerMove = (event: PointerEvent) => {
    if(this.magnification.pinching){this.drag=undefined;return;}if (!this.drag || this.drag.id !== event.pointerId) return;
    const dx = (event.clientX - this.drag.x) * .008, dy = (event.clientY - this.drag.y) * .008; this.drag.x = event.clientX; this.drag.y = event.clientY;
    this.state = turnGalacticView(this.state, dx, dy); this.sync(false);
  };
  private pointerEnd = (event: PointerEvent) => { if (this.drag?.id !== event.pointerId) return; this.drag = undefined; if (this.stage.hasPointerCapture(event.pointerId)) this.stage.releasePointerCapture(event.pointerId); this.changed({ ...this.state }, true); };
  private keyDown = (event: KeyboardEvent) => { const steps: Record<string, [number, number]> = { ArrowLeft: [-.1, 0], ArrowRight: [.1, 0], ArrowUp: [0, -.1], ArrowDown: [0, .1] }; const step = steps[event.key]; if (!step || !this.active || isSkyCase(this.state.selected)&&this.state.selected!=='trappist-1' || event.target!==this.stage) return; event.preventDefault(); this.state = turnGalacticView(this.state, ...step); this.sync(true); };
  private cancelDraw() { cancelAnimationFrame(this.frame); this.frame = 0; }
  private render() { if (!this.active || this.disposed || document.hidden) return; if(isSkyCase(this.state.selected)){this.scene?.setActive(false);this.skyStudy.draw();return;} if (!this.scene) this.scene = new GalacticScene(this.structureHost, this.words, failed => { if(!isSkyCase(this.state.selected)){this.failure.hidden = !failed; this.status.textContent = `${this.words.status}: ${failed ? this.words.canvas : this.words.gpu}`;} }); this.scene.setActive(true); this.scene.draw(this.state);this.failure.hidden=!this.scene.failed;this.status.textContent=`${this.words.status}: ${this.scene.failed?this.words.canvas:this.words.gpu}`; }
  private schedule() { if (this.frame || !this.active || document.hidden || this.disposed) return; this.frame = requestAnimationFrame(() => { this.frame = 0; this.render(); }); }
  private sync(checkpoint: boolean) {
    const selected = content.cases[this.state.selected], text = (v: { zh: string; en: string }) => this.language === 'en' ? v.en : v.zh;
    if (this.renderedCase !== this.state.selected) { this.renderedCase = this.state.selected; this.title.textContent = text(selected.name); this.childTarget.textContent = text(selected.child); this.source.href = selected.sources[0]!.url; this.stage.setAttribute('aria-label', `${text(selected.name)}. ${text(selected.child)}`); }
    const cases=sceneCases[sceneChapter(this.state.selected)];
    for(const [selected,button] of this.caseButtons){button.hidden=!cases.includes(selected);button.setAttribute('aria-pressed',String(selected===this.state.selected));}
    this.caseNavigation.hidden=!this.active||cases.length<2;
    this.yaw.value = String(this.state.yaw); this.pitch.value = String(this.state.pitch);
    this.zoomControls.update(this.state.zoom);
    const sky=isSkyCase(this.state.selected), words=this.language==='en'?skyWords.en:skyWords.zh;
    this.structureHost.hidden=sky;this.skyHost.hidden=!sky;
    if(sky){this.skyStudy.show(this.active,this.state.selected as import('./skyModel.ts').SkyCase,this.state.sky,this.state.zoom,this.state.yaw,this.state.pitch);this.hint.textContent=this.skyStudy.hint;this.boundary.textContent=this.skyStudy.boundary;this.status.textContent=`${this.words.status}: ${this.skyStudy.failed?words.canvas:words.gpu}`;this.failure.hidden=!this.skyStudy.failed;}
    else{this.skyStudy.hide();this.hint.textContent=this.state.selected==='galaxy-comparison'?this.words.comparisonHint:(this.language==='en'?navigationWords.navigation.en:navigationWords.navigation.zh).viewHint;this.boundary.textContent=this.state.selected==='galaxy-comparison'?this.words.comparisonBoundary:this.state.selected==='milky-way'&&this.state.sky.locateOrion?words.orionContextBoundary:this.words.shortBoundary;}
    const presets=this.root.querySelector<HTMLElement>('.galactic-presets');if(presets)presets.hidden=sky&&this.state.selected!=='trappist-1';
    this.stage.dataset.systemWhole=this.state.selected==='trappist-1'&&this.state.sky.systemWhole?'1':'0';this.stage.dataset.galaxyPair=this.state.selected==='galaxy-comparison'?'1':'0';
    this.root.querySelector<HTMLElement>('.galactic-options')!.hidden=sky;
    this.bridgeButton.hidden=this.state.selected!=='milky-way'&&this.state.selected!=='spiral';this.bridgeButton.textContent=this.state.selected==='spiral'?words.skyButton:words.bridgeButton;
    this.companionLink.hidden=this.state.selected!=='trappist-1';
    this.orionButton.hidden=this.state.selected!=='orion'&&!(this.state.selected==='milky-way'&&this.state.sky.locateOrion);this.orionButton.textContent=this.state.selected==='orion'?words.orionWhere:words.orionBack;
    const diskCase = this.state.selected === 'milky-way' || this.state.selected === 'spiral', pairCase=this.state.selected==='galaxy-comparison';
    this.layers.hidden = !diskCase;
    const yawLabel = diskCase ? this.words.yaw : this.words.turn, pitchLabel = diskCase ? this.words.pitch : this.words.elevation;
    if (this.yawLabel?.firstChild) this.yawLabel.firstChild.textContent = yawLabel;
    if (this.pitchLabel?.firstChild) this.pitchLabel.firstChild.textContent = pitchLabel;
    this.yaw.setAttribute('aria-label', yawLabel); this.pitch.setAttribute('aria-label', pitchLabel);
    this.root.querySelector('.galactic-presets')?.setAttribute('aria-label', pitchLabel);
    this.coordinate.textContent = this.state.guides && (this.state.selected === 'milky-way' || this.state.selected === 'spiral') ? this.words.coordinate : this.words.normalized;
    this.coordinate.hidden = !this.state.guides || !diskCase;
    this.root.querySelectorAll<HTMLButtonElement>('[data-pitch]').forEach(b => { const value = Number(b.dataset.pitch); b.setAttribute('aria-pressed', String(Math.abs(value - this.state.pitch) < .01)); b.textContent = this.state.selected==='trappist-1'?value===0?words.orbitFace:value===Math.PI/2?words.orbitEdge:words.orbitOblique:value === 0 ? pairCase?this.words.pairFace:diskCase ? this.words.face : this.words.viewA : value === Math.PI / 2 ? pairCase?this.words.pairEdge:diskCase ? this.words.edge : this.words.viewB : this.words.oblique; });
    this.layers.querySelectorAll<HTMLButtonElement>('[data-part]').forEach(button => { const part = button.dataset.part as 'disk' | 'bulge' | 'halo' | 'guides'; button.setAttribute('aria-pressed', String(this.state[part])); button.hidden = part !== 'guides' && this.state.selected !== 'milky-way' && this.state.selected !== 'spiral'; });
    this.changed({ ...this.state }, checkpoint); this.schedule();
  }
  show(active: boolean, state: GalacticState, canResume=false) { this.state = { ...state,sky:{...state.sky} }; this.active = active; this.root.hidden = !active; this.caseNavigation.hidden = !active;this.resumeZoom.hidden=!canResume; if (!active) { this.cancelDraw(); this.drag = undefined;this.magnification.cancel(); this.scene?.setActive(false);this.skyStudy.hide(); return; } this.sync(false); }
  pause() { this.cancelDraw(); this.drag = undefined;this.magnification.cancel(); this.scene?.setActive(false);this.skyStudy.pause(); }
  dispose() { if (this.disposed) return; this.disposed = true; this.pause();this.magnification.dispose();this.zoomControls.dispose(); this.scene?.dispose();this.skyStudy.dispose(); this.stage.removeEventListener('pointerdown', this.pointerDown); this.stage.removeEventListener('pointermove', this.pointerMove); this.stage.removeEventListener('pointerup', this.pointerEnd); this.stage.removeEventListener('pointercancel', this.pointerEnd); this.stage.removeEventListener('lostpointercapture', this.pointerEnd); this.stage.removeEventListener('keydown', this.keyDown); }
}
