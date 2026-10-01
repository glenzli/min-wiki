import { t } from './i18n.ts';
import type { ProgramState } from './model.ts';
const x = (column: number) => 100 + column * 105;
const y = (row: number) => 120 + row * 125;
/** Original SVG tabletop. The cart, parcel, trace and sensor all consume interpreter state. */
export class ProgramScene {
  private robot: SVGGElement;
  private body: SVGGElement;
  private onboard: SVGGElement;
  private source: SVGGElement;
  private delivered: SVGGElement;
  private obstacle: SVGGElement;
  private trace: SVGPathElement;
  private upper: SVGGElement;
  private sensor: SVGGElement;
  private description: SVGDescElement;
  private narrow = matchMedia('(max-width: 500px)');
  private fit = () => this.svg.setAttribute('viewBox', this.narrow.matches ? '120 20 620 430' : '0 0 880 450');
  constructor(private svg: SVGSVGElement) {
    svg.innerHTML = `<defs>
      <linearGradient id="table" x2="0" y2="1"><stop stop-color="#faf5eb"/><stop offset="1" stop-color="#eee4d4"/></linearGradient>
      <linearGradient id="metal" x2="0" y2="1"><stop stop-color="#eef1ee"/><stop offset=".45" stop-color="#c4d0ce"/><stop offset="1" stop-color="#a5b9b7"/></linearGradient>
      <linearGradient id="cardboard" x2="1" y2="1"><stop stop-color="#e5be83"/><stop offset="1" stop-color="#bb8850"/></linearGradient>
      <filter id="cart-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#53605a" flood-opacity=".2"/></filter>
      <g id="parcel"><rect x="-20" y="-17" width="40" height="34" rx="3" fill="url(#cardboard)" stroke="#946739" stroke-width="2"/><path d="M-3-17H5V17H-3Z" fill="#f5d7a7"/><path d="M-16-10H-8M-16-5H-8" stroke="#956c45" stroke-width="2"/><rect x="9" y="2" width="7" height="9" rx="1" fill="#fff4dc"/></g>
    </defs><title>${t('送货小车按指令卡行动')}</title><desc id="scene-desc"></desc>
    <rect x="28" y="28" width="824" height="377" rx="27" fill="#c5bcae"/>
    <rect x="28" y="20" width="824" height="377" rx="27" fill="url(#table)" stroke="#d7cdbd" stroke-width="2"/>
    <path d="M62 51C230 37 331 63 501 45S732 44 814 49M58 365C180 352 290 378 460 364S717 379 821 366" fill="none" stroke="#d4c5aa" opacity=".22" stroke-width="2"/>
    <g id="upper-route"><path d="M310 245V120H625V245" fill="none" stroke="#c6b49a" stroke-width="3" stroke-dasharray="8 8"/>
    ${[2, 3, 4, 5].map(c => `<circle cx="${x(c)}" cy="120" r="22" fill="#f9f4e9" stroke="#d6caba" stroke-width="2"/>`).join('')}
    <text x="415" y="81" text-anchor="middle" fill="#7c694b" font-size="17">${t('旁边的小路')}</text></g>
    <path d="M205 245H625" fill="none" stroke="#bdc5bd" stroke-width="3" stroke-dasharray="8 8"/>
    ${[1, 2, 3, 4, 5].map(c => `<circle cx="${x(c)}" cy="245" r="27" fill="#f7f4ec" stroke="#c5cdc5" stroke-width="2"/>`).join('')}
    <circle cx="205" cy="245" r="44" fill="none" stroke="#7ba89d" stroke-width="3"/>
    <circle cx="625" cy="245" r="44" fill="none" stroke="#7ba89d" stroke-width="3"/>
    <g fill="#315953" font-family="inherit" font-size="19" text-anchor="middle"><text x="205" y="187">${t('A · 取货点')}</text><text x="625" y="187">${t('B · 收货点')}</text></g>
    <path id="travel-trace" d="" fill="none" stroke="#318172" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".66"/>
    <g id="source-parcel" transform="translate(205 325)"><ellipse cy="23" rx="27" ry="5" fill="#b7a88d" opacity=".25"/><use href="#parcel"/></g>
    <g id="delivered-parcel" transform="translate(625 325)"><ellipse cy="23" rx="27" ry="5" fill="#b7a88d" opacity=".25"/><use href="#parcel"/></g>
    <g id="road-obstacle" transform="translate(415 245)"><ellipse cy="24" rx="32" ry="8" fill="#857765" opacity=".19"/><path d="M-28-16L0-28L28-16V18L0 31L-28 18Z" fill="#d28d57" stroke="#9c623c" stroke-width="2"/><path d="M-28-16L0-3L28-16M0-3V31" stroke="#f4c399" stroke-width="2"/><path d="M-10-23L0-18L10-23M0-18V-3" stroke="#e9b98e" stroke-width="6"/><text x="0" y="63" text-anchor="middle" font-family="inherit" font-size="17" fill="#804e30">${t('路上的箱子')}</text></g>
    <g id="robot"><g id="robot-body" filter="url(#cart-shadow)">
      <g id="sensor-rays"><path d="M37-14L73-30M38 0H81M37 14L73 30" stroke="#be803e" stroke-width="3" stroke-dasharray="5 5" fill="none"/></g>
      <rect x="-27" y="-38" width="22" height="16" rx="6" fill="#354842"/><rect x="-27" y="22" width="22" height="16" rx="6" fill="#354842"/>
      <rect x="7" y="-38" width="20" height="16" rx="6" fill="#354842"/><rect x="7" y="22" width="20" height="16" rx="6" fill="#354842"/>
      <rect x="-40" y="-28" width="80" height="56" rx="15" fill="url(#metal)" stroke="#6c8580" stroke-width="2"/>
      <path d="M-33-19H-7V19H-33Z" fill="#e1e9e4" stroke="#8fa39b" stroke-width="2"/><path d="M-29-14V14M-23-14V14M-17-14V14" stroke="#afc0b8" stroke-width="2"/>
      <rect x="6" y="-19" width="24" height="38" rx="7" fill="#406d65"/><circle cx="37" cy="-9" r="5" fill="#335850" stroke="#8caba1" stroke-width="2"/><circle cx="37" cy="9" r="5" fill="#335850" stroke="#8caba1" stroke-width="2"/>
      <circle cx="18" cy="-10" r="3" fill="#a9d7b6"/><path d="M15 7L23 7M19 3V11" stroke="#bed6c9" stroke-width="2"/>
      <g id="onboard-parcel" transform="translate(-18 0) scale(.72)"><use href="#parcel"/></g>
    </g></g>
    `;
    const get = <T extends SVGElement>(id: string) => svg.querySelector<T>(`#${id}`)!;
    this.robot = get('robot'); this.body = get('robot-body'); this.onboard = get('onboard-parcel');
    this.source = get('source-parcel'); this.delivered = get('delivered-parcel'); this.obstacle = get('road-obstacle');
    this.trace = get('travel-trace'); this.upper = get('upper-route'); this.sensor = get('sensor-rays'); this.description = get('scene-desc');
    this.narrow.addEventListener('change', this.fit); this.fit();
  }
  draw(state: ProgramState) {
    this.robot.style.transform = `translate(${x(state.position.x)}px, ${y(state.position.y)}px)`;
    const op = state.instructions.find(card => card.id === state.last)?.operation;
    this.body.style.transform = `rotate(${op === 'north' ? -90 : op === 'south' ? 90 : 0}deg)`;
    this.onboard.style.display = state.parcel === 'onboard' ? '' : 'none';
    this.source.style.display = state.parcel === 'pickup' ? '' : 'none';
    this.delivered.style.display = state.parcel === 'delivered' ? '' : 'none';
    this.obstacle.style.display = state.obstacle ? '' : 'none';
    this.upper.style.display = state.scenario === 'condition' ? '' : 'none';
    this.sensor.style.display = state.scenario === 'condition' && state.position.x === 2 && state.position.y === 1 ? '' : 'none';
    this.sensor.style.opacity = state.sensor === null ? '.3' : '1';
    this.trace.setAttribute('d', state.trail.map((p, i) => `${i ? 'L' : 'M'}${x(p.x)} ${y(p.y)}`).join(' '));
    this.svg.dataset.x = String(state.position.x); this.svg.dataset.y = String(state.position.y);
    this.svg.dataset.parcel = state.parcel; this.svg.dataset.choice = state.choice ?? 'unread';
    this.description.textContent = t('小车在第 {{column}} 列、第 {{row}} 行。已执行 {{count}} 条指令。',{ column: state.position.x, row: state.position.y + 1, count: state.executed });
  }
  dispose() { this.narrow.removeEventListener('change', this.fit); }
}
