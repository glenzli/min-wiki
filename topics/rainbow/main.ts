import { animateValue } from '../../src/visuals/transition.ts';
import { SCIENCE_EXPLANATIONS } from './science.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import './shell.css';
mountTopicNavigation('rainbow');
import { RainbowSimulation } from './physics/rainbowSimulation.ts';
import { SPECTRUM_COLORS } from './data/rainbowData.ts';
import { SCENARIO_DESCRIPTIONS, STORIES, ACADEMIC, stageAt } from './story.ts';
import { t } from './i18n.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
translateDocument(t);
const $ = (id: string) => document.getElementById(id) as HTMLElement;
class RainbowApp {
  private cancelStageMotion = () => {};
    mode: 'kids' | 'academic' = 'kids';
    scenario: 'prism' | 'raindrop' | 'double' | 'sky' = 'prism';
    selectedColorId: string = 'red';
    lastFrame = performance.now();
    private lastProgress = -1;
    phaseKey = '';
    dialog: HTMLDialogElement;
    simulation?: RainbowSimulation;
    resumePlayAfterDialog = false;
    private animationFrame = 0;
    constructor() {
    for (const type of ["click", "input", "keydown"]) document.addEventListener(type, () => this.cancelStageMotion(), { capture: true });
        this.dialog = $('about-dialog') as HTMLDialogElement;
        try {
            this.simulation = new RainbowSimulation($('canvas-container'));
        }
        catch (error) {
            console.error('Rainbow diagram initialization failed:', error);
            $('scene-error').hidden = false;
        }
        this.initSpectrumStrip();
        this.bindControls();
        this.buildStages();
        this.updateUI();
        $('optic-card').hidden = true;
        this.animate = this.animate.bind(this);
        this.animationFrame = requestAnimationFrame(this.animate);
        window.addEventListener('pagehide', event => {
            if (event.persisted)
                return;
            cancelAnimationFrame(this.animationFrame);
            this.simulation?.dispose();
        });
    }
    initSpectrumStrip() {
        const strip = $('spectrum-strip');
        strip.replaceChildren();
        for (const c of SPECTRUM_COLORS) {
            const btn = document.createElement('button');
            btn.className = 'color-tab';
            btn.dataset.color = c.id;
            btn.innerHTML = `<span class="c-dot" style="background:${c.hex}"></span>${t(c.nameZh)}`;
            btn.setAttribute('aria-label', t(c.nameZh));
            btn.setAttribute('aria-pressed', 'false');
            strip.appendChild(btn);
        }
    }
    bindControls() {
        // Mode toggle: Kids vs Academic
        document.querySelectorAll('[data-mode]').forEach(button => {
            if (button.tagName !== 'BUTTON')
                return;
            button.addEventListener('click', () => {
                this.mode = (button as HTMLElement).dataset.mode as 'kids' | 'academic';
                document.body.dataset.mode = this.mode;
                document.querySelectorAll('button[data-mode]').forEach(b => {
                    b.setAttribute('aria-pressed', String(b === button));
                });
                this.updateStory();
            });
        });
        // Scenario switcher
        document.querySelectorAll('[data-scenario]').forEach(button => {
            button.addEventListener('click', () => {
                const sc = (button as HTMLElement).dataset.scenario as 'prism' | 'raindrop' | 'double' | 'sky';
                if (this.scenario === sc)
                    return;
                this.selectScenario(sc);
            });
        });
        // Color tabs click
        $('spectrum-strip').addEventListener('click', event => {
            const btn = (event.target as HTMLElement).closest('.color-tab') as HTMLElement;
            if (!btn)
                return;
            this.selectColor(btn.dataset.color || 'red');
        });
        // Schematic lens recombination
        $('btn-toggle-recombine').addEventListener('click', () => {
            if (!this.simulation)
                return;
            const nextState = !this.simulation.recombinationEnabled;
            this.simulation.setRecombination(nextState);
            $('btn-toggle-recombine').setAttribute('aria-pressed', String(nextState));
        });
        // Ground and unobstructed sky views
        document.querySelectorAll('[data-skyview]').forEach(button => {
            button.addEventListener('click', () => {
                const view = (button as HTMLElement).dataset.skyview as 'ground' | 'unobstructed';
                this.simulation?.setSkyView(view);
                document.querySelectorAll('[data-skyview]').forEach(b => {
                    b.classList.toggle('active', b === button);
                    b.setAttribute('aria-pressed', String(b === button));
                });
            });
        });
        $('sun-altitude').addEventListener('input', event => {
            const angle = Number((event.target as HTMLInputElement).value);
            if (this.simulation)
                this.simulation.sunAltitude = angle;
            $('sun-value').textContent = `${angle}°`;
        });
        // Close optical card
        $('btn-close-card').addEventListener('click', () => {
            $('optic-card').hidden = true;
            if (this.simulation)
                this.simulation.selectedColorId = null;
            document.querySelectorAll('.color-tab').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        });
        // Play / Pause
        $('btn-play').addEventListener('click', () => this.togglePlay());
        // Restart
        $('btn-restart').addEventListener('click', () => {
            if (this.simulation) {
                this.simulation.progress = 0.0;
                this.simulation.isPlaying = false;
                this.updateUI();
                this.syncScrubber();
            }
        });
        // Scrubber
        const scrubber = $('progress') as HTMLInputElement;
        scrubber.addEventListener('input', () => {
            if (!this.simulation)
                return;
            this.simulation.progress = Number(scrubber.value) / 1000;
            this.simulation.isPlaying = false;
            this.syncPlayButton();
            this.updateStory();
        });
        // Speed select
        $('speed').addEventListener('change', event => {
            if (this.simulation) {
                this.simulation.speed = Number((event.target as HTMLSelectElement).value);
            }
        });
        // Guides toggle
        $('toggle-guides').addEventListener('change', event => {
            this.simulation?.setGuidesVisible((event.target as HTMLInputElement).checked);
        });
        // About modal dialog
        $('btn-about').addEventListener('click', () => {
            this.resumePlayAfterDialog = !!this.simulation?.isPlaying;
            if (this.simulation)
                this.simulation.isPlaying = false;
            this.syncPlayButton();
            this.dialog.showModal();
        });
        for (const id of ['btn-close', 'btn-understood']) {
            $(id).addEventListener('click', () => this.dialog.close());
        }
        this.dialog.addEventListener('click', event => {
            if (event.target === this.dialog) {
                const r = this.dialog.getBoundingClientRect();
                if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) {
                    this.dialog.close();
                }
            }
        });
        this.dialog.addEventListener('close', () => {
            if (this.simulation && this.resumePlayAfterDialog) {
                this.simulation.isPlaying = true;
                this.syncPlayButton();
            }
        });
        // Spacebar play/pause
        document.addEventListener('keydown', event => {
            if (event.code !== 'Space' ||
                event.repeat ||
                (event.target as HTMLElement | null)?.closest('button,input,select,textarea,a,[contenteditable]') ||
                this.dialog.open) {
                return;
            }
            event.preventDefault();
            this.togglePlay();
        });
    }
    selectScenario(sc: 'prism' | 'raindrop' | 'double' | 'sky') {
        this.scenario = sc;
        document.querySelectorAll('[data-scenario]').forEach(b => {
            b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.scenario === sc));
        });
        // Show/hide scenario-specific tool buttons
        $('btn-toggle-recombine').hidden = sc !== 'prism';
        $('sky-view-modes').hidden = sc !== 'sky';
        $('sun-control').hidden = sc !== 'sky';
        this.simulation?.selectScenario(sc);
        this.buildStages();
        this.updateUI();
    }
    selectColor(colorId: string) {
        this.selectedColorId = colorId;
        document.querySelectorAll('.color-tab').forEach(b => {
            b.classList.toggle('active', (b as HTMLElement).dataset.color === colorId);
            b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.color === colorId));
        });
        if (this.simulation)
            this.simulation.selectedColorId = colorId;
        const colorData = SPECTRUM_COLORS.find(c => c.id === colorId);
        if (!colorData)
            return;
        $('card-color-name').textContent = t(colorData.nameZh);
        $('card-color-tag').textContent = `λ = ${colorData.wavelengthNm} nm`;
        $('card-wavelength').textContent = `${colorData.wavelengthNm} nm`;
        $('card-index').textContent = colorData.waterIndex.toFixed(4);
        $('card-primary-angle').textContent = `${colorData.primaryAngleDeg.toFixed(1)}°`;
        $('card-secondary-angle').textContent = `${colorData.secondaryAngleDeg.toFixed(1)}°`;
        $('card-desc').textContent = t('表中角度相对反太阳方向；选择颜色可突出对应光路。');
        $('optic-card').hidden = false;
    }
    buildStages() {
        const stories = STORIES[this.scenario] || STORIES.prism;
        $('stage-buttons').replaceChildren(...stories.map((phase, i) => {
            const button = document.createElement('button');
            button.innerHTML = `<span class="step-num">0${i + 1}</span> ${phase.label}`;
            button.setAttribute('aria-label', `${t('第{{step}}步', { step: i + 1 })}：${phase.label}`);
            button.addEventListener('click', () => {
                if (this.simulation) {
                    this.simulation.isPlaying = false; this.syncPlayButton();
                    this.cancelStageMotion = animateValue({ from: this.simulation.progress, to: phase.at, duration: 1000,
                      onUpdate: value => { if (!this.simulation) return; this.simulation.progress = value; this.syncScrubber(); this.updateStory(); } });
                }
            });
            return button;
        }));
        $('route-description').textContent = SCENARIO_DESCRIPTIONS[this.scenario] || SCENARIO_DESCRIPTIONS.prism;
    }
    togglePlay() {
        if (!this.simulation)
            return;
        if (this.simulation.progress === 1)
            this.simulation.progress = 0;
        this.simulation.isPlaying = !this.simulation.isPlaying;
        this.syncPlayButton();
    }
    syncPlayButton() {
        const playing = this.simulation?.isPlaying;
        const text = playing ? t('暂停演示') : this.simulation?.progress === 0 ? t('开始观察') : this.simulation?.progress === 1 ? t('重新播放') : t('继续演示');
        if ($('play-text').textContent !== text) {
            $('play-icon').textContent = playing ? 'Ⅱ' : '▶';
            $('play-text').textContent = text;
            $('btn-play').setAttribute('aria-label', text);
        }
    }
    syncScrubber() {
        if (!this.simulation)
            return;
        const norm = this.simulation.progress;
        const val = Math.round(norm * 1000);
        const scrubber = $('progress') as HTMLInputElement;
        scrubber.value = String(val);
        scrubber.style.setProperty('--progress', `${norm * 100}%`);
        $('elapsed').textContent = `${(norm * 20.0).toFixed(1)} ${t('秒')}`;
    }
    updateStory() {
        const norm = this.simulation?.progress ?? 0;
        const stories = STORIES[this.scenario] || STORIES.prism;
        const academic = ACADEMIC[this.scenario] || ACADEMIC.prism;
        const index = stageAt(norm, this.scenario);
        const key = `${this.scenario}:${index}:${this.mode}`;
        if (this.phaseKey !== key) {
            this.phaseKey = key;
            const pKids = stories[index];
            const pAcad = academic[index] || stories[index];
            $('phase-number').textContent = `0${index + 1}`;
            $('phase-title').textContent = this.mode === 'academic' ? SCIENCE_EXPLANATIONS[this.scenario][index].title : pKids.title;
            $('phase-desc').textContent = this.mode === 'academic' ? SCIENCE_EXPLANATIONS[this.scenario][index].body : pKids.desc;
            $('phase-notice').textContent = pKids.notice;
            $('notice-heading').textContent = t('找一找，想一想');
            $('phase-formula').textContent = pAcad.formula || '';
            $('phase-terms').textContent = pAcad.terms || '';
            $('scene-status').textContent = pKids.status || '';
            [...$('stage-buttons').children].forEach((b, i) => {
                if (i === index)
                    b.setAttribute('aria-current', 'step');
                else
                    b.removeAttribute('aria-current');
            });
        }
        const red = SPECTRUM_COLORS[0], violet = SPECTRUM_COLORS[6];
        $('model-readout').hidden = this.scenario === 'prism';
        $('model-index').textContent = '1.331–1.344';
        $('model-red-angle').textContent = `${red.primaryAngleDeg.toFixed(1)}°`;
        $('model-violet-angle').textContent = `${violet.primaryAngleDeg.toFixed(1)}°`;
    }
    updateUI() {
        this.syncPlayButton();
        this.syncScrubber();
        this.updateStory();
    }
    animate(now: number) {
        const delta = Math.min((now - this.lastFrame) / 1000, 0.05);
        this.lastFrame = now;
        if (!document.hidden && this.simulation) {
            this.simulation.update(delta);
            this.syncPlayButton();
            if (this.lastProgress !== this.simulation.progress) {
                this.lastProgress = this.simulation.progress;
                this.syncScrubber();
                this.updateStory();
            }
        }
        this.animationFrame = requestAnimationFrame(this.animate);
    }
}
new RainbowApp();
