import { CHINA_CITIES, SOLAR_TERMS } from '../data/seasonsData.ts';
import { t } from '../i18n.ts';
import { solarGeometry } from '../physics/solarGeometry.ts';
import { cityDaylightReadout, clockText, referenceClockHours } from '../physics/dayNightClock.ts';
import './dayNightObservation.css';

type ObservationState = { orbit: number; rotation: number; tilt: number; cityId: string; view: string; scenario: string };
type LabelPosition = { x: number; y: number; visible: boolean };
const stateNames = { day: t('太阳已升起'), twilight: t('曙暮光'), night: t('较暗的夜侧'), horizon: t('太阳在地平线上') };

/** The regional labels, clock and comparison consume the globe's state; no independent timer. */
export class DayNightObservation {
  private labels: { city: typeof CHINA_CITIES[number]; button: HTMLButtonElement; pose: string }[] = [];
  private rows: { city: typeof CHINA_CITIES[number]; button: HTMLButtonElement; status: HTMLElement; sunrise: HTMLElement; altitude: HTMLElement }[] = [];
  private lastReadout = '';
  private root = document.querySelector<HTMLElement>('.experience')!;
  private clock = document.getElementById('reference-clock')!;
  private term = document.getElementById('clock-season')!;
  private header = document.getElementById('daynight-heading')!;
  private comparison = document.getElementById('regional-comparison')!;
  private legend = document.getElementById('regional-legend')!;
  private labelRoot = document.getElementById('regional-labels')!;

  constructor(selectCity: (id: string) => void, private project: (id: string) => LabelPosition) {
    const list = document.getElementById('regional-city-list')!;
    for (const city of CHINA_CITIES) {
      const label = document.createElement('button');
      label.className = 'regional-label';
      label.dataset.city = city.id;
      label.textContent = city.displayName;
      label.addEventListener('click', () => selectCity(city.id));
      this.labelRoot.append(label);
      this.labels.push({ city, button: label, pose: '' });

      const button = document.createElement('button');
      button.className = 'regional-city';
      button.dataset.city = city.id;
      const name = document.createElement('strong');
      name.textContent = city.displayName;
      const status = document.createElement('span'); status.className = 'regional-state';
      const sunrise = document.createElement('span'); sunrise.className = 'regional-sunrise';
      const altitude = document.createElement('span'); altitude.className = 'regional-altitude academic-only';
      button.append(name, status, sunrise, altitude);
      button.addEventListener('click', () => selectCity(city.id));
      list.append(button);
      this.rows.push({ city, button, status, sunrise, altitude });
    }
  }

  update(state: ObservationState) {
    const regional = state.view === 'china';
    const daynight = state.scenario === 'daynight';
    this.root.dataset.observation = regional ? 'china' : 'globe';
    this.header.hidden = !daynight;
    this.comparison.hidden = !regional;
    this.legend.hidden = !regional;
    this.labelRoot.hidden = !regional;
    const light = solarGeometry(state.orbit, state.rotation, state.tilt);
    const time = clockText(referenceClockHours(light.sunLocal));
    const readouts = this.rows.map(row => cityDaylightReadout(row.city, light.sunLocal, light.declination));
    // A horizon crossing must refresh the status even within one displayed minute.
    const key = `${time}:${state.orbit}:${state.tilt}:${state.cityId}:${state.view}:${readouts.map(readout => readout.state).join(':')}`;
    if (this.lastReadout !== key) {
      this.lastReadout = key;
      this.clock.textContent = time;
      const term = SOLAR_TERMS.find(item => Math.abs(item.fractionOfYear - state.orbit) < .0001);
      this.term.textContent = term?.displayName ?? t('当前公转位置');
      for (const [index, row] of this.rows.entries()) {
        const readout = readouts[index];
        const selected = row.city.id === state.cityId;
        row.button.setAttribute('aria-pressed', String(selected));
        row.button.dataset.state = readout.state;
        row.status.textContent = stateNames[readout.state];
        row.sunrise.textContent = readout.sunrise === null
          ? t('无普通日出日落') : t('日出约 {{time}}', { time: clockText(readout.sunrise, 5) });
        row.altitude.textContent = t('太阳高度 {{angle}}°', { angle: readout.altitude.toFixed(1) });
        row.button.setAttribute('aria-label', t('观察{{place}}：{{state}}；{{sunrise}}', { place: row.city.displayName, state: row.status.textContent, sunrise: row.sunrise.textContent }));
      }
      for (const [index, label] of this.labels.entries()) {
        const readout = readouts[index];
        label.button.dataset.state = readout.state;
        label.button.setAttribute('aria-pressed', String(label.city.id === state.cityId));
        label.button.setAttribute('aria-label', t('观察{{v0}}', { v0: label.city.displayName }));
      }
    }
    if (regional) {
      for (const label of this.labels) {
        const position = this.project(label.city.id);
        const x = position.x.toFixed(2), y = position.y.toFixed(2);
        const pose = `${x}:${y}:${position.visible}`;
        if (pose !== label.pose) {
          label.pose = pose;
          label.button.hidden = !position.visible;
          label.button.style.left = `${x}px`;
          label.button.style.top = `${y}px`;
        }
      }
    }
  }
}
