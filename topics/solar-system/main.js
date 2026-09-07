import { mountTopicNavigation } from '../../src/platform/topicNavigation.js';
import './shell.css';
mountTopicNavigation('solar-system');

import { SolarSimulation } from './physics/solarSimulation.js';
import { PLANETS_DATA, SUN_DATA } from './data/planetsData.js';
import { SCENARIO_DESCRIPTIONS, STORIES, ACADEMIC, stageAt } from './story.js';

const $ = id => document.getElementById(id);

class SolarApp {
  constructor() {
    this.mode = 'kids';
    this.scenario = 'orbit';
    this.selectedPlanet = null;
    this.lastFrame = performance.now();
    this.cycleDurationYears = 12.0; // 12 simulation years per full scrubber cycle (approx 1 Jupiter orbit)
    this.dialog = $('about-dialog');
    this.phaseKey = '';

    try {
      this.simulation = new SolarSimulation($('canvas-container'));
    } catch (error) {
      console.error('Solar System 3D initialization failed:', error);
      $('scene-error').hidden = false;
    }

    document.querySelectorAll('[data-view]').forEach(b => { b.hidden = ['lineup','planets'].includes(b.dataset.view); });
    this.planetLabels = PLANETS_DATA.map(data => {
      const label = document.createElement('span');
      label.className = 'planet-label';
      label.textContent = data.nameZh;
      label.hidden = true;
      $('canvas-container').append(label);
      return {data, label};
    });
    this.initPlanetStrip();
    this.bindControls();
    this.buildStages();
    this.updateUI();

    this.animate = this.animate.bind(this);
    this.frame = requestAnimationFrame(this.animate);

    window.addEventListener(
      'pagehide',
      event => {
        if (event.persisted) return;
        cancelAnimationFrame(this.frame);
        this.simulation?.dispose();
      },
      { once: true }
    );
  }

  initPlanetStrip() {
    const strip = $('planet-strip');
    strip.replaceChildren();

    // "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'planet-tab active';
    allBtn.dataset.planet = '';
    allBtn.innerHTML = '<span class="p-dot" style="background:#e9b76c"></span>全景';
    allBtn.setAttribute('aria-label', '全景观测');
    strip.appendChild(allBtn);

    // Planet buttons
    for (const p of PLANETS_DATA) {
      const btn = document.createElement('button');
      btn.className = 'planet-tab';
      btn.dataset.planet = p.id;
      btn.innerHTML = `<span class="p-dot" style="background:${p.colorHex}"></span>${p.nameZh}`;
      btn.setAttribute('aria-label', `聚焦${p.nameZh}`);
      strip.appendChild(btn);
    }
  }

  bindControls() {
    // Mode switch: Kids vs Academic
    document.querySelectorAll('[data-mode]').forEach(button => {
      if (button.tagName !== 'BUTTON') return;
      button.addEventListener('click', () => {
        this.mode = button.dataset.mode;
        document.body.dataset.mode = this.mode;
        document.querySelectorAll('button[data-mode]').forEach(b => {
          b.setAttribute('aria-pressed', String(b === button));
        });
        this.updateStory();
        this.refreshPlanetCard();
      });
    });

    // Scenario switcher
    document.querySelectorAll('[data-scenario]').forEach(button => {
      button.addEventListener('click', () => {
        const nextScenario = button.dataset.scenario;
        if (this.scenario === nextScenario) return;
        this.selectScenario(nextScenario);
      });
    });

    // Planet strip click
    $('planet-strip').addEventListener('click', event => {
      const btn = event.target.closest('.planet-tab');
      if (!btn) return;
      const planetId = btn.dataset.planet;
      this.selectPlanet(planetId);
    });

    // Camera view controls
    document.querySelectorAll('[data-view]').forEach(button => {
      button.addEventListener('click', () => {
        const view = button.dataset.view;
        this.simulation?.setCameraView(view, this.selectedPlanet);
        document.querySelectorAll('[data-view]').forEach(b => {
          b.setAttribute('aria-pressed', String(b === button));
        });
      });
    });

    // Close planet card
    $('btn-close-card').addEventListener('click', () => {
      this.selectPlanet('');
    });

    // Play / Pause
    $('btn-play').addEventListener('click', () => this.togglePlay());

    // Restart time
    $('btn-restart').addEventListener('click', () => {
      if (this.simulation) {
        this.simulation.timeYears = 0.0;
        this.pause();
        this.updateUI();
      }
    });

    // Scrubber
    const scrubber = $('progress');
    scrubber.addEventListener('input', () => {
      if (!this.simulation) return;
      this.seekProgress(Number(scrubber.value) / 1000);
    });

    // Speed select
    $('speed').addEventListener('change', event => {
      if (this.simulation) {
        this.simulation.speed = Number(event.target.value);
      }
    });

    // Toggle Guides
    $('toggle-guides').addEventListener('change', event => {
      this.simulation?.setGuidesVisible(event.target.checked);
    });

    // About modal dialog
    $('btn-about').addEventListener('click', () => {
      this.resumePlayAfterDialog = this.simulation?.isPlaying;
      if (this.simulation) this.simulation.isPlaying = false;
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
      if (
        event.code !== 'Space' ||
        event.repeat ||
        event.target.closest('button,input,select,textarea,a,[contenteditable]') ||
        this.dialog.open
      ) {
        return;
      }
      event.preventDefault();
      this.togglePlay();
    });
  }

  selectScenario(sc) {
    this.pause();
    this.scenario = sc;
    document.querySelectorAll('[data-scenario]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.scenario === sc));
    });

    if (sc === 'lineup') {
      this.simulation?.setViewMode('lineup');
      this.simulation?.setCameraView('lineup');
      document.querySelectorAll('[data-view]').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.view === 'lineup'));
      });
    } else if (sc === 'inner') {
      this.simulation?.setViewMode('orbit');
      this.simulation?.setCameraView('inner');
      document.querySelectorAll('[data-view]').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.view === 'perspective'));
      });
    } else if (sc === 'outer') {
      this.simulation?.setViewMode('orbit');
      this.simulation?.setCameraView('outer');
      document.querySelectorAll('[data-view]').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.view === 'perspective'));
      });
    } else {
      // 'orbit'
      this.simulation?.setViewMode('orbit');
      this.simulation?.setCameraView('perspective');
      document.querySelectorAll('[data-view]').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.view === 'perspective'));
      });
    }

    this.selectedPlanet = null;
    if (this.simulation) this.simulation.selectedPlanetId = null;
    $('planet-card').hidden = true;
    document.querySelectorAll('.planet-tab').forEach(b => b.classList.toggle('active',!b.dataset.planet));
    document.querySelectorAll('[data-view]').forEach(b => {
      b.hidden = sc === 'lineup' ? !['lineup','planets'].includes(b.dataset.view) : ['lineup','planets'].includes(b.dataset.view);
    });
    this.buildStages();
    this.updateUI();
  }

  selectPlanet(planetId) {
    this.selectedPlanet = planetId || null;

    // Update strip button active states
    document.querySelectorAll('.planet-tab').forEach(b => {
      const match = (planetId || '') === (b.dataset.planet || '');
      b.classList.toggle('active', match);
    });

    const card = $('planet-card');
    if (!this.selectedPlanet) {
      card.hidden = true;
      if (this.scenario === 'lineup') {
        this.simulation?.setCameraView('lineup');
      } else if (this.scenario === 'inner') {
        this.simulation?.setCameraView('inner');
      } else if (this.scenario === 'outer') {
        this.simulation?.setCameraView('outer');
      } else {
        this.simulation?.setCameraView('perspective');
      }
      return;
    }

    this.refreshPlanetCard();
    this.simulation?.selectPlanet(planetId);
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed','false'));
  }

  refreshPlanetCard() {
    const data = PLANETS_DATA.find(p => p.id === this.selectedPlanet);
    if (!data) return;
    $('card-name').textContent = data.nameZh;
    $('card-type').textContent = data.typeZh;
    $('card-diameter').textContent = `${data.diameterKm.toLocaleString()} km`;
    $('card-ratio').textContent = `${(data.diameterKm / 12742).toFixed(2)} × 地球直径`;
    $('card-period').textContent = `${data.orbitalPeriodDays.toLocaleString()} 天（${data.orbitalPeriodYears} 年）`;
    $('card-rotation').textContent = `${Math.abs(data.rotationHours)} 小时${data.rotationHours<0?'（逆行）':''}`;
    $('card-fact').textContent = this.mode === 'academic' ? data.academicFact : data.quickFact;
    $('planet-card').hidden = false;
  }

  cycleProgress() {
    const time = this.simulation?.timeYears ?? 0;
    const remainder = time % this.cycleDurationYears;
    return time > 0 && Math.abs(remainder) < 1e-9 ? 1 : remainder / this.cycleDurationYears;
  }

  pause() {
    if(this.simulation) this.simulation.isPlaying = false;
    this.syncPlayButton();
  }

  seekProgress(progress) {
    if(!this.simulation) return;
    const base = this.simulation.timeYears - this.cycleProgress() * this.cycleDurationYears;
    this.simulation.timeYears = Math.max(0,base) + progress * this.cycleDurationYears;
    this.pause();
    this.updateUI();
  }

  buildStages() {
    const stories = STORIES[this.scenario] || STORIES.orbit;
    $('stage-buttons').replaceChildren(
      ...stories.map((phase, i) => {
        const button = document.createElement('button');
        button.innerHTML = `<span class="step-num">0${i + 1}</span> ${phase.label}`;
        button.setAttribute('aria-label', `第${i + 1}步：${phase.label}`);
        button.addEventListener('click', () => {
          if (this.simulation) {
            this.seekProgress(phase.at);
          }
        });
        return button;
      })
    );

    $('route-description').textContent = SCENARIO_DESCRIPTIONS[this.scenario] || SCENARIO_DESCRIPTIONS.orbit;
  }

  togglePlay() {
    if (!this.simulation) return;
    this.simulation.isPlaying = !this.simulation.isPlaying;
    this.syncPlayButton();
  }

  syncPlayButton() {
    const playing = this.simulation?.isPlaying;
    $('play-icon').textContent = playing ? 'Ⅱ' : '▶';
    $('play-text').textContent = playing ? '暂停公转' : '继续公转';
    $('btn-play').setAttribute('aria-label', playing ? '暂停公转' : '继续公转');
  }

  syncScrubber() {
    if (!this.simulation) return;
    const norm = this.cycleProgress();
    const val = Math.round(norm * 1000);
    const scrubber = $('progress');
    scrubber.value = val;
    scrubber.style.setProperty('--progress', `${norm * 100}%`);
    $('elapsed').textContent = `${this.simulation.timeYears.toFixed(1)} 年`;
  }

  updateStory() {
    if (!this.simulation) return;
    const norm = this.cycleProgress();
    const stories = STORIES[this.scenario] || STORIES.orbit;
    const academic = ACADEMIC[this.scenario] || ACADEMIC.orbit;
    const index = stageAt(norm, this.scenario);

    const key = `${this.scenario}:${index}:${this.mode}`;
    if (this.phaseKey !== key) {
      this.phaseKey = key;
      const pKids = stories[index];
      const pAcad = academic[index] || stories[index];
      const isAcademic = this.mode === 'academic';

      $('phase-number').textContent = `0${index + 1}`;
      $('phase-title').textContent = isAcademic && pAcad.label ? `${pKids.title} (${pAcad.label})` : pKids.title;
      $('phase-desc').textContent = pKids.desc;
      $('phase-notice').textContent = isAcademic ? pAcad.terms : pKids.notice;
      $('notice-heading').textContent = isAcademic ? '物理机制分析' : '找一找，想一想';
      $('phase-formula').textContent = pAcad.formula || '';
      $('phase-terms').textContent = pAcad.terms || '';
      $('phase-fact').textContent = pAcad.fact || pKids.fact || '';
      $('scene-status').textContent = pKids.status || '';

      [...$('stage-buttons').children].forEach((b, i) => {
        if (i === index) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
    }

    // Academic Readout
    if (this.mode === 'academic') {
      $('model-year').textContent = `${this.simulation.timeYears.toFixed(2)} 年`;
      const planet = PLANETS_DATA.find(p => p.id === this.selectedPlanet) ?? PLANETS_DATA[2];
      $('model-kepler').textContent = `${(planet.semiMajorAxisAU**3 / planet.orbitalPeriodYears**2).toFixed(4)}（${planet.nameZh}）`;
      $('model-scale').textContent = this.scenario === 'lineup' ? '直径同尺度' : '轨道间距压缩';
    }
  }

  updateUI() {
    this.syncPlayButton();
    this.syncScrubber();
    this.updateStory();
  }

  updatePlanetLabels() {
    for (const {data, label} of this.planetLabels) {
      const node = this.simulation.planetNodes.get(data.id);
      const point = this.simulation.labelPosition(node.currentPos);
      label.hidden = this.scenario !== 'lineup' || !point.visible;
      label.style.left = `${point.x}px`;
      label.style.top = `${point.y + 14 + (data.index % 2) * 18}px`;
    }
  }

  animate(now) {
    const delta = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;

    if (!document.hidden && this.simulation) {
      this.simulation.update(delta);
      this.updatePlanetLabels();
      this.syncScrubber();
      this.updateStory();
    }

    this.frame = requestAnimationFrame(this.animate);
  }
}

// Bootstrap
new SolarApp();
