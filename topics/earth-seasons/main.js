import { mountTopicNavigation } from '../../src/platform/topicNavigation.js';
import './shell.css';
mountTopicNavigation('earth-seasons');

import { mountDaylightLesson } from './learning/daylightLesson.js';
import { EarthSimulation } from './physics/earthSimulation.js';
import {
  EARTH_CONSTANTS,
  SOLAR_TERMS,
  MAJOR_CITIES,
  calcSubsolarLatitude,
  calcNoonSolarAltitude,
  calcDaylightHours,
  calcSolarHeatFlux
} from './data/seasonsData.js';
import { SCENARIO_DESCRIPTIONS, STORIES, ACADEMIC, stageAt } from './story.js';

const $ = id => document.getElementById(id);

class EarthApp {
  constructor() {
    this.mode = 'kids';
    this.scenario = 'daynight';
    this.selectedCity = 'beijing';
    this.cityCardOpen = true;
    this.selectedSolstice = 'spring_equinox';
    this.lastFrame = performance.now();
    this.phaseKey = '';
    this.dialog = $('about-dialog');

    try {
      this.simulation = new EarthSimulation($('canvas-container'));
    } catch (error) {
      console.error('Earth 3D initialization failed:', error);
      $('scene-error').hidden = false;
    }

    this.daylightLesson = mountDaylightLesson($('daylight-lesson'));
    this.initToolsBar();
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
        this.daylightLesson?.dispose();
      },
      { once: true }
    );
  }

  initToolsBar() {
    // Solstices strip
    const solsticeStrip = $('solstice-strip');
    solsticeStrip.replaceChildren();

    for (const term of SOLAR_TERMS) {
      const btn = document.createElement('button');
      btn.className = `solstice-tab ${term.id === this.selectedSolstice ? 'active' : ''}`;
      btn.dataset.solstice = term.id;
      btn.innerHTML = term.nameZh;
      btn.setAttribute('aria-label', `跳转至${term.nameZh}`);
      solsticeStrip.appendChild(btn);
    }

    // Cities strip
    const cityStrip = $('city-strip');
    cityStrip.replaceChildren();

    for (const city of MAJOR_CITIES) {
      const btn = document.createElement('button');
      btn.className = `city-tab ${city.id === this.selectedCity ? 'active' : ''}`;
      btn.dataset.city = city.id;
      btn.innerHTML = city.nameZh;
      btn.setAttribute('aria-label', `观察${city.nameZh}`);
      btn.setAttribute('aria-pressed',String(city.id === this.selectedCity));
      cityStrip.appendChild(btn);
    }
  }

  bindControls() {
    // Mode toggle: Kids vs Academic
    document.querySelectorAll('[data-mode]').forEach(button => {
      if (button.tagName !== 'BUTTON') return;
      button.addEventListener('click', () => {
        this.mode = button.dataset.mode;
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
        const sc = button.dataset.scenario;
        if (this.scenario === sc) return;
        this.selectScenario(sc);
      });
    });

    // Solstice tabs click
    $('solstice-strip').addEventListener('click', event => {
      const btn = event.target.closest('.solstice-tab');
      if (!btn) return;
      this.selectSolstice(btn.dataset.solstice);
    });

    // City tabs click
    $('city-strip').addEventListener('click', event => {
      const btn = event.target.closest('.city-tab');
      if (!btn) return;
      this.selectCity(btn.dataset.city);
    });

    // View controls
    document.querySelectorAll('[data-view]').forEach(button => {
      button.addEventListener('click', () => {
        const view = button.dataset.view;
        this.setView(view);
        document.querySelectorAll('[data-view]').forEach(b => {
          b.setAttribute('aria-pressed', String(b === button));
        });
      });
    });

    // Close city card
    $('btn-close-city').addEventListener('click', () => {
      this.cityCardOpen = false;
      $('city-card').hidden = true;
    });

    // Play / Pause
    $('btn-play').addEventListener('click', () => this.togglePlay());

    // Restart
    $('btn-restart').addEventListener('click', () => {
      if (this.simulation) {
        if (['seasons','notilt'].includes(this.scenario)) {
          this.simulation.orbitProgress = 0.0;
        } else {
          this.simulation.rotationProgress = 0.0;
        }
        this.pause();
        this.updateUI();
      }
    });

    // Scrubber
    const scrubber = $('progress');
    scrubber.addEventListener('input', () => {
      if (!this.simulation) return;
      this.pause();
      const frac = Number(scrubber.value) / 1000;
      if (['seasons','notilt'].includes(this.scenario)) {
        this.simulation.orbitProgress = frac;
      } else {
        this.simulation.rotationProgress = frac;
      }
      this.updateStory();
      this.updateCityCard();
    });

    // Speed select
    $('speed').addEventListener('change', event => {
      if (this.simulation) {
        this.simulation.speed = Number(event.target.value);
      }
    });

    // Guides toggle
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
    this.scenario = sc;
    document.querySelectorAll('[data-scenario]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.scenario === sc));
    });

    this.pause();
    this.simulation?.selectScenario(sc);
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.view==='default')));
    this.buildStages();
    this.updateTimeLabels();
    this.updateUI();
  }

  selectSolstice(solsticeId) {
    this.selectedSolstice = solsticeId;
    document.querySelectorAll('.solstice-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.solstice === solsticeId);
    });

    const term = SOLAR_TERMS.find(t => t.id === solsticeId);
    if (term && this.simulation) {
      this.pause();
      this.simulation.setSolsticeTerm(term.fractionOfYear);
      this.syncScrubber();
      this.updateCityCard();
    }
  }

  selectCity(cityId) {
    this.selectedCity = cityId;
    document.querySelectorAll('.city-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.city === cityId);
      b.setAttribute('aria-pressed',String(b.dataset.city === cityId));
    });

    this.cityCardOpen = true;
    this.simulation?.selectCity(cityId);
    this.updateCityCard();
  }

  setView(viewName) {
    this.simulation?.setView(viewName === 'default' ? 'standard' : viewName);
  }

  pause() {
    if(this.simulation) this.simulation.isPlaying = false;
    this.syncPlayButton();
  }

  buildStages() {
    const stories = STORIES[this.scenario] || STORIES.daynight;
    $('stage-buttons').replaceChildren(
      ...stories.map((phase, i) => {
        const button = document.createElement('button');
        button.innerHTML = `<span class="step-num">0${i + 1}</span> ${phase.label}`;
        button.setAttribute('aria-label', `第${i + 1}步：${phase.label}`);
        button.addEventListener('click', () => {
          if (this.simulation) {
            this.pause();
            if (['seasons','notilt'].includes(this.scenario)) {
              this.simulation.orbitProgress = phase.at;
            } else {
              this.simulation.rotationProgress = phase.at;
            }
            this.syncScrubber();
            this.updateStory();
            this.updateCityCard();
          }
        });
        return button;
      })
    );

    $('route-description').textContent = SCENARIO_DESCRIPTIONS[this.scenario] || SCENARIO_DESCRIPTIONS.daynight;
  }

  updateTimeLabels() {
    if (['seasons','notilt'].includes(this.scenario)) {
      $('duration').textContent = '365 天 (1年)';
    } else {
      $('duration').textContent = '24:00 时';
    }
  }

  togglePlay() {
    if (!this.simulation) return;
    this.simulation.isPlaying = !this.simulation.isPlaying;
    this.syncPlayButton();
  }

  syncPlayButton() {
    const playing = this.simulation?.isPlaying;
    $('play-icon').textContent = playing ? 'Ⅱ' : '▶';
    $('play-text').textContent = playing ? '暂停运转' : '继续运转';
    $('btn-play').setAttribute('aria-label', playing ? '暂停运转' : '继续运转');
  }

  syncScrubber() {
    if (!this.simulation) return;
    const norm = ['seasons','notilt'].includes(this.scenario) ? this.simulation.orbitProgress : this.simulation.rotationProgress;
    const val = Math.round(norm * 1000);
    const scrubber = $('progress');
    scrubber.value = val;
    scrubber.style.setProperty('--progress', `${norm * 100}%`);

    if (['seasons','notilt'].includes(this.scenario)) {
      const days = Math.round(norm * 365.25);
      $('elapsed').textContent = `春分起 ${days} 天`;
    } else {
      const totalMinutes = Math.round(norm * 24 * 60);
      const h = Math.floor(totalMinutes / 60)
        .toString()
        .padStart(2, '0');
      const m = (totalMinutes % 60).toString().padStart(2, '0');
      $('elapsed').textContent = `自转 ${h}:${m}`;
    }
  }

  updateCityCard() {
    const city = MAJOR_CITIES.find(c => c.id === this.selectedCity);
    if (!city || !this.simulation) return;

    const state = this.simulation.getCityReadout(city);
    $('card-city-name').textContent = city.nameZh;
    $('card-city-tag').textContent = `${city.lat >= 0 ? '北纬' : '南纬'} ${Math.abs(city.lat).toFixed(1)}°`;
    $('card-city-altitude').textContent = `${state.altitude.toFixed(1)}°`;
    $('card-city-daylight').textContent = state.daylight === null ? '太阳在地平线附近' : `${state.daylight.toFixed(1)} 小时`;
    $('card-city-flux').textContent = `${Math.round(state.flux * 100)}%（几何投影）`;
    $('card-city-desc').textContent = this.scenario === 'notilt' ? '零倾角假想实验：非极点昼长约 12 小时；极点的太阳停留在理想地平线。' : city.desc;
    const labels = {day:'白天 ☀',night:'黑夜 ☾',horizon:'晨昏交界'};
    $('card-city-status').textContent = labels[state.state];
    $('card-city-status').style.color = state.state === 'day' ? '#38bdf8' : '#e9b76c';
    $('city-card').hidden = !this.cityCardOpen;
  }

  updateStory() {
    if (!this.simulation) return;
    const norm = ['seasons','notilt'].includes(this.scenario) ? this.simulation.orbitProgress : this.simulation.rotationProgress;
    const stories = STORIES[this.scenario] || STORIES.daynight;
    const academic = ACADEMIC[this.scenario] || ACADEMIC.daynight;
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
      const tilt = this.simulation.currentTiltDeg;
      const subsolarLat = calcSubsolarLatitude(this.simulation.orbitProgress, tilt);
      const bjAltitude = calcNoonSolarAltitude(39.9, subsolarLat);
      const bjDaylight = calcDaylightHours(39.9, subsolarLat);

      $('model-subsolar').textContent = `${subsolarLat >= 0 ? '+' : ''}${subsolarLat.toFixed(1)}°`;
      $('model-altitude').textContent = `${bjAltitude.toFixed(1)}°`;
      $('model-daylight').textContent = bjDaylight === null ? '地平线附近' : `${bjDaylight.toFixed(1)} 小时`;
    }
  }

  updateUI() {
    this.syncPlayButton();
    this.syncScrubber();
    this.updateStory();
    this.updateCityCard();
  }

  animate(now) {
    const delta = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;

    if (!document.hidden && this.simulation) {
      this.simulation.update(delta);
      this.syncScrubber();
      this.updateStory();
      this.updateCityCard();
      const phase = this.simulation.orbitProgress;
      document.querySelectorAll('.solstice-tab').forEach(button => {
        const term = SOLAR_TERMS.find(item => item.id === button.dataset.solstice);
        const distance = Math.abs(phase - term.fractionOfYear);
        const selected = Math.min(distance,1-distance) < 0.0001;
        button.classList.toggle('active',selected);
        button.setAttribute('aria-pressed',String(selected));
      });
    }

    this.frame = requestAnimationFrame(this.animate);
  }
}

// Bootstrap
new EarthApp();
