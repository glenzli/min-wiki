import copy from './skyContent.json';
import catalogue from './skyCatalogue.json';
import { parallaxDistance, unit, milkyTravelProgress, type SkyCase, type SkyState } from './skyModel.ts';
import { trappistPlanets, solarPlanets } from './planetarySystems.ts';
import { SkyScene } from './skyScene.ts';
import {mountObservationChoices} from '../../src/platform/observationMode.ts';

const make = <K extends keyof HTMLElementTagNameMap>(tag: K, value = '', className = '') => { const node = document.createElement(tag); node.textContent = value; node.className = className; return node; };

/** A finite observer journey and a separate finite orbital clock. Neither advances galaxy evolution. */
export class SkyStudy {
  readonly controls = make('div', '', 'sky-controls');
  private directions = make('div', '', 'sky-directions');
  private sightlines=make('div');
  private sightlineMenu:ReturnType<typeof mountObservationChoices>;
  private sightlineToggle:HTMLDetailsElement|null;
  private observerTools = make('div', '', 'sky-observer-tools');
  private systems = make('div', '', 'sky-system-tools');
  private selection = make('div', '', 'sky-selection');
  private cue = make('p', '', 'sky-cue');
  private detail = make('output', '', 'sky-detail');
  private note = make('small', '', 'sky-note');
  private credit = make('a', '', 'sky-note');
  private range = make('input');
  private dayRange = make('input');
  private choice = make('select');
  private move = make('button');
  private start = make('button');
  private lines = make('button');
  private systemView=make('select');
  private ground = make('button');
  private orbit = make('button');
  private onward = make('button');
  private days = make('output');
  private scene?: SkyScene;
  private hasFailure = false;
  private hitLayer = make('div', '', 'sky-hit-layer');
  private hitButtons: HTMLButtonElement[] = [];
  private state!: SkyState;
  private selected: SkyCase = 'sky';
  private active = false;
  private disposed = false;
  private zoom = 1;
  private yaw = 0;
  private pitch = .45;
  private drawFrame = 0;
  private surfaceFrame=0;private surfaceTime=0;private surfaceLast=0;
  private frame = 0;
  private motion: 'camera' | 'orbit' | undefined;
  private from = 0;
  private target = 1;
  private elapsed = 0;
  private lastTime = 0;
  private drag?: { id: number; x: number; start: number; moved: boolean };
  private cancelClick = false;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private words: typeof copy.en;
  private controlKey = '';
  private choiceKey = '';
  constructor(private host: HTMLElement, private stage: HTMLElement, private language: string,
    private changed: (state: SkyState, checkpoint: boolean) => void,
    private onFailure: (failed: boolean) => void, private chooseM31: () => void, private pinching: () => boolean) {
    this.words = language === 'en' ? copy.en : copy.zh; const w = this.words;
    this.controls.hidden = true; this.directions.setAttribute('role', 'group'); this.directions.setAttribute('aria-label', w.direction);
    this.hitLayer.dataset.readerUi='custom';this.host.append(this.hitLayer);
    for(let i=0;i<15;i++){const button=make('button');button.type='button';button.hidden=true;button.dataset.sceneHitTarget='';button.onclick=()=>{if(this.selected==='orion')this.state.star=i;else this.selectSystemTarget(i);this.publish(true);};this.hitButtons.push(button);this.hitLayer.append(button);}
    this.ground.textContent=w.groundView;this.ground.onclick=()=>{this.stop();this.state.view='ground';this.publish(true);};this.directions.append(this.ground);
    const sightlineChoices=make('div');
    for (const direction of ['disk', 'pole', 'andromeda'] as const) {
      const button = make('button', w[direction]); button.dataset.direction = direction;
      button.onclick = () => { this.stop(); this.state.view='space';this.state.direction = direction; this.state.milkyProgress = 0;this.publish(true); };if(direction!=='disk')button.dataset.readerChoice='';(direction==='disk'?this.directions:sightlineChoices).append(button);
    }
    this.sightlineMenu=mountObservationChoices(this.sightlines,[sightlineChoices],{label:w.moreDirections,compactLabel:w.moreDirections});this.sightlineToggle=this.sightlines.querySelector('details');
    this.directions.append(this.sightlines);
    this.move.textContent = w.travel; this.move.onclick = () => { if (this.motion) { this.stop(true); return; } this.from = this.progress; this.target = this.from > .98 ? 0 : 1; if (this.reduced.matches) { this.progress = this.target; this.publish(true); return; } this.motion = 'camera'; this.elapsed = 0; this.lastTime = performance.now(); this.frame = requestAnimationFrame(this.tick); this.syncControls(); };
    this.start.textContent = w.return; this.start.onclick = () => { this.stop(); this.progress = 0; this.publish(true); };
    this.range.type = 'range'; this.range.min = '0'; this.range.max = '1'; this.range.step = '.001'; this.range.setAttribute('aria-label', w.observer);
    this.range.oninput = () => { this.stop(); this.progress = Number(this.range.value); this.publish(false); }; this.range.onchange = () => this.publish(true);
    const position = make('label', w.observer, 'sky-progress'); position.append(this.range); this.observerTools.append(this.move, this.start, position);
    this.lines.textContent = w.lines; this.lines.onclick = () => { this.state.lines = !this.state.lines; this.publish(true); };
    this.choice.onchange = () => { if (this.selected === 'orion') this.state.star = Number(this.choice.value); else this.selectSystemTarget(Number(this.choice.value)); this.publish(true); };
    const choiceLabel = make('label'); choiceLabel.append(this.choice); this.selection.append(choiceLabel, this.lines);
    this.systemView.setAttribute('aria-label',w.systemView);for(const [value,label] of [['whole',w.wholeSystems],['common',w.common],['close',w.close]]){const option=make('option',label);option.value=value!;this.systemView.append(option);}
    this.systemView.onchange=()=>{this.state.systemWhole=this.systemView.value==='whole';if(!this.state.systemWhole)this.state.systemClose=this.systemView.value==='close';this.publish(true);};
    this.orbit.onclick = () => { if (this.motion) { this.stop(true); return; } if (this.state.systemDays >= 20) this.state.systemDays = 0; this.motion = 'orbit'; this.lastTime = performance.now(); this.frame = requestAnimationFrame(this.tick); this.publish(true); };
    this.dayRange.type = 'range'; this.dayRange.min = '0'; this.dayRange.max = '20'; this.dayRange.step = '.01'; this.dayRange.setAttribute('aria-label', w.elapsed);
    this.dayRange.oninput = () => { this.stop(); this.state.systemDays = Number(this.dayRange.value); this.publish(false); }; this.dayRange.onchange = () => this.publish(true);
    const dayLabel = make('label', w.elapsed, 'sky-progress'); dayLabel.append(this.dayRange, this.days);
    this.systems.append(this.systemView,this.orbit, dayLabel);
    this.onward.textContent = w.m31Button; this.onward.onclick = this.chooseM31;
    this.credit.textContent=w.mapCredit;this.credit.href='https://www.solarsystemscope.com/textures/';this.credit.target='_blank';this.credit.rel='noreferrer';
    this.controls.append(this.directions, this.observerTools, this.systems, this.selection, this.cue, this.detail, this.note, this.onward,this.credit);
    this.stage.addEventListener('pointerdown', this.down); this.stage.addEventListener('pointermove', this.dragMove); this.stage.addEventListener('pointerup', this.up); this.stage.addEventListener('pointercancel', this.cancelPointer); this.stage.addEventListener('lostpointercapture', this.cancelPointer); this.stage.addEventListener('click',this.pick);this.stage.addEventListener('keydown', this.key);
    this.reduced.addEventListener('change', this.reduceMotion);
  }
  get hint() { return this.words[this.selected === 'orion' ? 'orionHint' : this.selected === 'trappist-1' ? this.state?.systemWhole?'wholeHint':'systemHint' : this.state?.view==='ground'?'groundHint':'skyHint']; }
  get boundary() { return this.words[this.selected === 'orion' ? 'orionBoundary' : this.selected === 'trappist-1' ? this.state?.systemWhole?'wholeBoundary':'systemBoundary' : this.state?.view==='ground'?'groundBoundary':this.state?.direction==='andromeda'?'m31Boundary':'skyBoundary']; }
  get failed() { return this.hasFailure; }
  private get progress() { return this.selected === 'orion' ? this.state.orionProgress : this.state.milkyProgress; }
  private set progress(n: number) { if (this.selected === 'orion') this.state.orionProgress = unit(n); else this.state.milkyProgress = unit(n); }
  private selectSystemTarget(index:number){if(index<8){this.state.systemOwner='solar';this.state.solarPlanet=index;}else{this.state.systemOwner='trappist';this.state.planet=index-8;}}
  private publish(checkpoint: boolean) { this.syncControls(); this.changed({ ...this.state }, checkpoint); this.requestDraw(); }
  private syncControls() {
    const w = this.words, orion = this.selected === 'orion', system = this.selected === 'trappist-1';
    const ground=this.selected==='sky'&&this.state.view==='ground';
    const outward=this.selected==='sky'?milkyTravelProgress(this.progress)>.02:this.progress>.1;
    this.range.value=String(this.progress);this.dayRange.value=String(this.state.systemDays);
    const key=[this.selected,this.state.view,this.state.direction,outward,this.progress===0,this.progress>.98,this.state.lines,this.state.star,this.state.systemWhole,this.state.systemClose,this.state.systemOwner,this.state.solarPlanet,this.state.planet,Math.floor(this.state.systemDays*10),this.motion??''].join(':');
    if(key===this.controlKey)return;this.controlKey=key;
    this.directions.hidden = this.selected !== 'sky'; this.observerTools.hidden = system||ground; this.systems.hidden = !system; this.selection.hidden = !orion && !system;
    this.lines.hidden = system; this.lines.setAttribute('aria-pressed', String(this.state.lines)); this.range.value = String(this.progress);
    this.move.textContent = this.motion === 'camera' ? w.pause : this.selected==='sky' ? this.progress>.98 ? w.travelBack : w.leaveSky : w.travel; this.move.setAttribute('aria-pressed', String(this.motion === 'camera'));
    this.start.disabled = this.progress === 0; this.days.textContent = `${this.state.systemDays.toFixed(1)} ${w.days}`; this.dayRange.value = String(this.state.systemDays);
    this.systemView.value=this.state.systemWhole?'whole':this.state.systemClose?'close':'common';
    if(this.selected!=='sky'&&this.sightlineToggle)this.sightlineToggle.open=false;
    this.orbit.textContent = this.motion === 'orbit' ? w.pauseOrbit : this.state.systemDays >= 20 ? w.restartOrbit : w.playOrbit; this.orbit.setAttribute('aria-pressed', String(this.motion === 'orbit'));
    this.onward.hidden = this.selected !== 'sky' || ground || this.state.direction !== 'andromeda';
    this.ground.setAttribute('aria-pressed',String(ground));this.directions.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button => button.setAttribute('aria-pressed', String(!ground&&button.dataset.direction === this.state.direction)));
    this.cue.textContent = orion ? outward ? w.depthCue : w.orionCue : system ? this.state.systemWhole?w.wholeCue:w.planetCue : ground?w.groundCue:outward ? w.outsideCue : this.state.direction === 'pole' ? w.poleCue : this.state.direction === 'andromeda' ? w.andromedaCue : w.diskCue;
    this.note.hidden = true; this.detail.hidden = !orion && !system;
    this.credit.hidden=!system;
    if (orion) {
      const star = catalogue.orion[this.state.star]!, d = parallaxDistance(star.parallax, star.error), number = (n: number) => String(Math.round(n / 10) * 10);
      this.detail.textContent = `${star.name[this.language === 'en' ? 'en' : 'zh']} · ${w.distance} ${number(d.ly)} ${w.ly} · ${w.range} ${number(d.nearLy)}–${number(d.farLy)} ${w.ly}`; this.note.textContent = w.estimateNote;
    } else if (system) {
      const solar=this.state.systemWhole&&this.state.systemOwner==='solar',p=solar?solarPlanets[this.state.solarPlanet]!:trappistPlanets[this.state.planet]!;
      const name=solar?solarPlanets[this.state.solarPlanet]!.name[this.language==='en'?'en':'zh']:`TRAPPIST-1 ${trappistPlanets[this.state.planet]!.id}`;
      this.detail.textContent = `${name} · ${w.orbit} ${p.au.toFixed(5)} AU · ${w.period} ${p.days.toFixed(2)} ${w.days}`;
    }
    if(orion||system){
      const optionKey=orion?'orion':this.state.systemWhole?'whole':'trappist';
      if(optionKey!==this.choiceKey){this.choiceKey=optionKey;this.choice.replaceChildren();
        const entries=orion?catalogue.orion.map((s,i)=>[String(i),s.name[this.language==='en'?'en':'zh']] as const):[
          ...(this.state.systemWhole?solarPlanets.map((p,i)=>[String(i),`${w.solarFamily} · ${p.name[this.language==='en'?'en':'zh']}`] as const):[]),
          ...trappistPlanets.map((p,i)=>[String(i+8),`TRAPPIST-1 ${p.id}`] as const)];
        for(const [value,name] of entries){const option=make('option',name);option.value=value;this.choice.append(option);}
      }
      this.choice.value=String(orion?this.state.star:this.state.systemWhole&&this.state.systemOwner==='solar'?this.state.solarPlanet:this.state.planet+8);
    }
  }
  private tick = (now: number) => {
    this.frame = 0; if (!this.active || this.disposed || document.hidden || !this.motion) return;
    const dt = Math.min(.1, Math.max(0, (now - this.lastTime) / 1000)); this.lastTime = now;
    if (this.motion === 'camera') { this.elapsed += dt; const p = unit(this.elapsed / (this.selected==='sky'?6.5:3.5)); this.progress = this.from + (this.target - this.from) * p; if (p >= 1) this.motion = undefined; }
    else { this.state.systemDays = Math.min(20, this.state.systemDays + dt * 1.4); if (this.state.systemDays >= 20) this.motion = undefined; }
    this.publish(!this.motion); if (this.motion) this.frame = requestAnimationFrame(this.tick);
  };
  private stop(checkpoint = false) { const wasMoving = !!this.motion; cancelAnimationFrame(this.frame); this.frame = 0; this.motion = undefined; if (this.state) { this.syncControls(); if (checkpoint && wasMoving) this.changed({ ...this.state }, true); } }
  private down = (e: PointerEvent) => { if (!this.active || this.selected==='sky'&&this.state.view==='ground' || e.button !== 0 || this.pinching() || (e.target as Element)?.closest?.('button')) return; this.cancelClick=false;this.drag = { id: e.pointerId, x: e.clientX, start: this.progress, moved: false }; };
  private dragMove = (e: PointerEvent) => {
    if (!this.active || !this.drag || e.pointerId !== this.drag.id) return;
    if (this.pinching()) { this.drag = undefined; return; }
    const delta = e.clientX - this.drag.x; if (Math.abs(delta) > 6) {this.drag.moved = true;this.cancelClick=true;}
    if (this.drag.moved && this.selected !== 'trappist-1') { this.stop(); this.progress = this.drag.start + delta / Math.max(240, this.host.clientWidth * .7); this.publish(false); }
  };
  private up = (e: PointerEvent) => {
    if (!this.active || !this.drag || this.drag.id !== e.pointerId) return; const drag = this.drag; this.drag = undefined;
    if (drag.moved && this.selected !== 'trappist-1') this.publish(true);
  };
  private pick = (e:MouseEvent)=>{if(!this.active||this.cancelClick||this.selected==='sky'||(e.target as Element)?.closest?.('button'))return;const bounds=this.host.getBoundingClientRect(),selected=this.scene?.pick(e.clientX-bounds.left,e.clientY-bounds.top);if(selected!==undefined){if(this.selected==='orion')this.state.star=selected;else this.selectSystemTarget(selected);this.publish(true);}};
  private cancelPointer = () => { if(this.drag?.moved&&this.selected!=='trappist-1')this.publish(true);this.drag = undefined; };
  private key = (e: KeyboardEvent) => { if (!this.active || this.selected === 'trappist-1' || this.selected==='sky'&&this.state.view==='ground' || e.target !== this.stage || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return; e.preventDefault(); this.stop(); this.progress += e.key === 'ArrowLeft' ? -.06 : .06; this.publish(true); };
  private reduceMotion = () => { if (this.reduced.matches) this.pause();else this.startSurface(); };
  private startSurface(){if(this.surfaceFrame||!this.active||this.selected!=='trappist-1'||this.disposed||this.hasFailure||document.hidden||this.reduced.matches)return;this.surfaceLast=performance.now();this.surfaceFrame=requestAnimationFrame(this.surfaceTick);}
  private surfaceTick=(now:number)=>{this.surfaceFrame=0;if(!this.active||this.selected!=='trappist-1'||this.disposed||this.hasFailure||document.hidden||this.reduced.matches)return;if(now-this.surfaceLast>=125){this.surfaceTime+=Math.min(.25,(now-this.surfaceLast)/1000);this.surfaceLast=now;this.requestDraw();}this.surfaceFrame=requestAnimationFrame(this.surfaceTick);};
  private requestDraw() { if (this.drawFrame || !this.active || document.hidden || this.disposed) return; this.drawFrame = requestAnimationFrame(() => { this.drawFrame = 0; this.draw(); }); }
  draw() {
    if (!this.active || this.disposed || document.hidden) return;
    if (!this.scene) this.scene = new SkyScene(this.host, this.words, this.language, failed => { this.hasFailure=failed;this.stop(); this.onFailure(failed); });
    this.scene.setActive(true); this.scene.draw(this.selected, this.state, this.zoom, this.yaw, this.pitch,this.surfaceTime);
    const targets=this.scene.targets();
    this.hitButtons.forEach((button,i)=>{const target=targets.find(t=>t.index===i);button.hidden=!target||this.selected==='sky';if(!target)return;button.style.left=`${target.x}px`;button.style.top=`${target.y}px`;button.setAttribute('aria-label',this.selected==='orion'?catalogue.orion[i]!.name[this.language==='en'?'en':'zh']:i<8?solarPlanets[i]!.name[this.language==='en'?'en':'zh']:`TRAPPIST-1 ${trappistPlanets[i-8]!.id}`);button.setAttribute('aria-pressed',String(i===(this.selected==='orion'?this.state.star:this.state.systemOwner==='solar'&&this.state.systemWhole?this.state.solarPlanet:this.state.planet+8)));});
  }
  retry() { this.scene?.retry();this.startSurface(); }
  show(active: boolean, selected: SkyCase, state: SkyState, zoom: number, yaw: number, pitch: number) {
    if (selected !== this.selected) this.stop();
    this.selected = selected; this.state = { ...state }; this.zoom = zoom; this.yaw = yaw; this.pitch = pitch; this.active = active; this.controls.hidden = !active;
    this.choice.setAttribute('aria-label', this.words[selected === 'orion' ? 'star' : 'planet']);
    if (!active) this.pause(); else {this.syncControls();this.startSurface();}
  }
  pause() { this.stop(); cancelAnimationFrame(this.drawFrame); this.drawFrame = 0;cancelAnimationFrame(this.surfaceFrame);this.surfaceFrame=0; this.drag = undefined; this.scene?.setActive(false); }
  hide() { this.active = false; this.controls.hidden = true;if(this.sightlineToggle)this.sightlineToggle.open=false; this.pause(); }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.pause();this.sightlineMenu.dispose(); this.scene?.dispose();
    this.stage.removeEventListener('pointerdown', this.down); this.stage.removeEventListener('pointermove', this.dragMove); this.stage.removeEventListener('pointerup', this.up); this.stage.removeEventListener('pointercancel', this.cancelPointer); this.stage.removeEventListener('lostpointercapture', this.cancelPointer);this.stage.removeEventListener('click',this.pick); this.stage.removeEventListener('keydown', this.key); this.reduced.removeEventListener('change', this.reduceMotion);this.hitLayer.remove();
  }
}
