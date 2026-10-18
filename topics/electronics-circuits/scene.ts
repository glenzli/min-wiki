import type { CircuitObservation } from './model.ts';
import { t } from './i18n.ts';

const namespace = 'http://www.w3.org/2000/svg';
type Attributes = Record<string, string | number>;
function element(tag: string, attributes: Attributes = {}, text?: string): SVGElement {
  const node = document.createElementNS(namespace, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Draws actual switch contact and return-wire geometry from the same observed state as the prose. */
export function renderCircuit(svg: SVGSVGElement, observation: CircuitObservation, compact: boolean): void {
  const { state, lampOn, electronicConducting, sensorReading } = observation;
  const width = compact ? 500 : 850;
  const height = compact ? 610 : 570;
  const left = compact ? 70 : 105, right = width - (compact ? 65 : 105);
  const top = 140, bottom = compact ? 430 : 425;
  const contactLeft = compact ? 210 : 325, contactRight = contactLeft + (compact ? 63 : 83);
  const chipX = compact ? 335 : 515, returnLeft = compact ? 142 : 215, returnRight = returnLeft + 46;
  const sensorX = compact ? 185 : 310, controllerX = compact ? 300 : 465, signalY = compact ? 300 : 285;
  const nodes: SVGElement[] = [];
  const add = (tag: string, attrs: Attributes = {}, text?: string) => { const node = element(tag, attrs, text); nodes.push(node); return node; };
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.dataset.lamp = lampOn ? 'on' : 'off';
  svg.dataset.command = observation.commandOn ? 'on' : 'off';
  svg.dataset.return = state.returnIntact ? 'intact' : 'broken';
  svg.dataset.switch = state.switchClosed ? 'closed' : 'open';
  const description = state.mode === 'manual'
    ? t('电池、机械开关、灯和回线组成灯回路。打开的接点或断开的回线都会让灯不亮。')
    : t('感光器把亮暗输入送到比较器；控制信号决定电子开关是否导通，完整灯回路才让灯亮。');
  add('title', {}, t('桌面低压灯与感光控制示意'));
  add('desc', {}, description);
  const defs = add('defs');
  defs.innerHTML = '<linearGradient id="ec-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8fbfc"/><stop offset=".43" stop-color="#8b9a9e"/><stop offset=".67" stop-color="#e5ebec"/><stop offset="1" stop-color="#72818a"/></linearGradient><linearGradient id="ec-cell" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#b56f32"/><stop offset=".35" stop-color="#f0c880"/><stop offset=".7" stop-color="#dfab61"/><stop offset="1" stop-color="#ac6a2c"/></linearGradient><radialGradient id="ec-glow"><stop stop-color="#ffd56d" stop-opacity=".65"/><stop offset="1" stop-color="#ffdb91" stop-opacity="0"/></radialGradient><filter id="ec-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#384b47" flood-opacity=".14"/></filter>';
  add('rect', { x: 12, y: 10, width: width - 24, height: height - 22, rx: 22, fill: '#f1f2e9', stroke: '#e1e6db' });
  add('rect', { x: 30, y: 86, width: width - 60, height: 412, rx: 18, fill: '#e3ece3', stroke: '#bfcfc1', 'stroke-width': 2 });
  for (const x of [42, width - 42]) for (const y of [98, 485]) {
    add('circle', { cx: x, cy: y, r: 5, fill: 'url(#ec-metal)' });
    add('path', { d: `M${x - 2},${y}h4`, stroke: '#6a7974', 'stroke-width': 1 });
  }
  add('text', { x: 35, y: 50, fill: '#334e43', 'font-size': compact ? 24 : 25, 'font-weight': 650 }, t('一块灯板，两种控制'));
  const wire = (d: string) => {
    add('path', { d, fill: 'none', stroke: '#40574d', 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    add('path', { d, fill: 'none', stroke: lampOn ? '#5aab91' : '#a3b5a8', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  };
  wire(`M${left},220V${top}H${contactLeft}`);
  // Both electrical connections terminate at the bulb base, never at its glass envelope.
  wire(`M${contactRight},${top}H${right + 35}V326H${right + 24}`);
  wire(`M${right},354V${bottom}H${chipX + 38}`);
  wire(`M${chipX - 38},${bottom}H${returnRight}`);
  wire(`M${returnLeft},${bottom}H${left}V360`);
  if (state.returnIntact) wire(`M${returnLeft},${bottom}H${returnRight}`);
  else {
    add('path', { d: `M${returnLeft},${bottom}l10,-11 M${returnRight},${bottom}l-10,11`, fill: 'none', stroke: '#9d6151', 'stroke-width': 8, 'stroke-linecap': 'round' });
    add('path', { d: `M${returnLeft + 20},${bottom - 16}l9,28 M${returnLeft + 29},${bottom - 16}l-9,28`, stroke: '#9d6151', 'stroke-width': 2 });
  }
  // A real air gap appears when the lever is open; there is no 'open' drawn line across it.
  add('rect', { x: contactLeft - 17, y: top - 26, width: contactRight - contactLeft + 35, height: 52, rx: 10, fill: '#ced9cf', stroke: '#a6b8a9' });
  // A closed horizontal line has a zero-height object bounding box: an objectBoundingBox
  // paint gradient would disappear. Solid metal remains visible in either contact state.
  add('line', { x1: contactLeft, y1: top, x2: state.switchClosed ? contactRight : contactRight - 9, y2: state.switchClosed ? top : top - 40, stroke: '#839387', 'stroke-width': 9, 'stroke-linecap': 'round', id: 'switch-contact' });
  for (const x of [contactLeft, contactRight]) add('circle', { cx: x, cy: top, r: 7, fill: '#c29755', stroke: '#83663d', 'stroke-width': 2 });
  add('text', { x: (contactLeft + contactRight) / 2, y: 194, 'text-anchor': 'middle', fill: '#334e43', 'font-size': compact ? 18 : 20 }, t('供电开关'));
  add('rect', { x: left - 34, y: 218, width: 68, height: 145, rx: 12, fill: '#344640', filter: 'url(#ec-shadow)' });
  for (const x of [left - 22, left + 7]) {
    add('rect', { x, y: 234, width: 18, height: 113, rx: 7, fill: 'url(#ec-cell)', stroke: '#916033' });
    add('rect', { x: x + 5, y: 229, width: 8, height: 6, rx: 2, fill: 'url(#ec-metal)' });
    add('path', { d: `M${x + 4},245h10 M${x + 9},240v10`, stroke: '#744d2b', 'stroke-width': 1.6 });
  }
  add('text', { x: left, y: 210, 'text-anchor': 'middle', fill: '#51685d', 'font-size': 24 }, '+');
  add('text', { x: left, y: 390, 'text-anchor': 'middle', fill: '#51685d', 'font-size': 25 }, '−');
  add('text', { x: left + 90, y: 393, 'text-anchor': 'middle', fill: '#334e43', 'font-size': compact ? 17 : 20 }, t('电池盒'));
  if (lampOn) add('ellipse', { cx: right, cy: 271, rx: 74, ry: 91, fill: 'url(#ec-glow)', id: 'lamp-glow' });
  add('path', { d: `M${right - 20},305C${right - 50},278 ${right - 45},226 ${right},223C${right + 45},226 ${right + 50},278 ${right + 20},305L${right + 18},321H${right - 18}Z`, fill: lampOn ? '#fff0be' : '#edf2ec', 'fill-opacity': .85, stroke: '#94a6a0', 'stroke-width': 2.4 });
  add('path', { d: `M${right - 12},308l-3,-39 8,8 7,-10 7,10 8,-8 -3,39`, fill: 'none', stroke: lampOn ? '#d79629' : '#7c8d83', 'stroke-width': lampOn ? 4 : 2.5 });
  add('path', { d: `M${right - 22},245Q${right - 32},264 ${right - 20},283`, fill: 'none', stroke: '#ffffff', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: .8 });
  add('rect', { x: right - 24, y: 311, width: 48, height: 33, rx: 7, fill: 'url(#ec-metal)', stroke: '#71847b', 'stroke-width': 1.5 });
  for (const y of [317, 325, 333]) add('path', { d: `M${right - 20},${y}h40`, stroke: '#7a8c84', 'stroke-width': 2 });
  add('rect', { x: right - 12, y: 341, width: 24, height: 8, rx: 3, fill: '#52665c' });
  add('rect', { x: right - 7, y: 348, width: 14, height: 8, rx: 3, fill: 'url(#ec-metal)', stroke: '#64796d' });
  add('circle', { cx: right + 24, cy: 326, r: 4, fill: '#c5ac75', stroke: '#7d7956' });
  add('text', { x: right - (compact ? 60 : 80), y: compact ? 214 : 388, 'text-anchor': 'middle', fill: '#334e43', 'font-size': compact ? 19 : 21 }, t('小灯泡'));
  // The semiconductor keeps its shape: changing conductivity is not a moving metal contact.
  add('rect', { x: chipX - 38, y: bottom - 24, width: 76, height: 48, rx: 7, fill: '#3d5147', stroke: '#283d33', 'stroke-width': 2, filter: 'url(#ec-shadow)' });
  add('path', { d: `M${chipX - 27},${bottom}h54`, stroke: electronicConducting ? '#8ae0b7' : '#879a8c', 'stroke-width': 5, 'stroke-dasharray': electronicConducting ? 'none' : '4 5', id: 'electronic-channel' });
  add('text', { x: chipX, y: bottom + 54, 'text-anchor': 'middle', fill: '#334e43', 'font-size': compact ? 18 : 20 }, t('电子开关'));
  add('text', { x: (returnLeft + returnRight) / 2, y: bottom + 51, 'text-anchor': 'middle', fill: state.returnIntact ? '#526a5b' : '#95563f', 'font-size': compact ? 18 : 20 }, t('灯的回线'));
  const signalGroup = add('g', { opacity: state.mode === 'automatic' ? 1 : .38 });
  const signalNodes: SVGElement[] = [];
  const signal = (tag: string, attrs: Attributes = {}, text?: string) => { const node = element(tag, attrs, text); signalNodes.push(node); return node; };
  signal('rect', { x: sensorX - 37, y: signalY - 40, width: controllerX - sensorX + 76, height: 111, rx: 14, fill: '#f8f7ed', stroke: '#cabddd', 'stroke-width': 1.5 });
  signal('circle', { cx: sensorX, cy: signalY, r: 23, fill: '#cbbcdd', stroke: '#78648f', 'stroke-width': 2 });
  signal('circle', { cx: sensorX, cy: signalY, r: 14, fill: sensorReading === null ? '#9a98a0' : `hsl(42 75% ${37 + state.lightLevel * .4}%)`, stroke: '#a49771' });
  signal('path', { d: `M${sensorX - 10},${signalY - 8}l20,16 M${sensorX - 10},${signalY}l20,12 M${sensorX - 4},${signalY - 12}l15,13`, stroke: '#756953', 'stroke-width': 2, fill: 'none' });
  if (sensorReading !== null && state.mode === 'automatic') {
    for (const [dx, dy] of [[-11, -43], [0, -48], [11, -43]]) signal('path', { d: `M${sensorX + dx * 1.4},${signalY + dy - 15}L${sensorX + dx},${signalY + dy}`, stroke: '#d6ae55', 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: .3 + state.lightLevel * .007 });
  }
  signal('rect', { x: controllerX - 31, y: signalY - 23, width: 62, height: 46, rx: 5, fill: '#766786' });
  for (const dy of [-14, 0, 14]) signal('path', { d: `M${controllerX - 31},${signalY + dy}h-7 M${controllerX + 31},${signalY + dy}h7`, stroke: '#aa9bb7', 'stroke-width': 4 });
  signal('path', { d: `M${controllerX - 12},${signalY - 8}l14,8 -14,8`, stroke: '#eee5fa', 'stroke-width': 2.5, fill: 'none' });
  const inputStart = sensorX + 26, inputEnd = controllerX - 38;
  if (state.sensorConnected) signal('path', { d: `M${inputStart},${signalY}H${inputEnd}`, fill: 'none', stroke: '#927ca4', 'stroke-width': 3, 'stroke-dasharray': '5 5' });
  else signal('path', { d: `M${inputStart},${signalY}H${inputStart + 12} M${inputEnd - 12},${signalY}H${inputEnd}`, fill: 'none', stroke: '#a094a7', 'stroke-width': 3, 'stroke-dasharray': '4 4' });
  signal('path', { d: `M${controllerX + 39},${signalY}H${chipX}V${bottom - 24}`, fill: 'none', stroke: observation.commandOn ? '#927ca4' : '#aaa3b3', 'stroke-width': 3, 'stroke-dasharray': '5 5' });
  signal('path', { d: `M${chipX - 5},${bottom - 36}l5,9 5,-9`, fill: 'none', stroke: '#927ca4', 'stroke-width': 2 });
  signal('text', { x: sensorX, y: signalY + 54, 'text-anchor': 'middle', fill: '#665579', 'font-size': compact ? 18 : 20 }, t('感光器'));
  signal('text', { x: controllerX, y: signalY + 54, 'text-anchor': 'middle', fill: '#665579', 'font-size': compact ? 18 : 20 }, t('比较器'));
  signalGroup.replaceChildren(...signalNodes);
  if (compact) {
    add('text', { x: 30, y: 538, fill: '#415f50', 'font-size': 20 }, lampOn ? t('完整回路 → 灯亮') : t('灯回路未导通 → 灯灭'));
    add('text', { x: 30, y: 575, fill: '#72617c', 'font-size': 18 }, state.mode === 'manual' ? t('自动控制的小板暂不参与') : t('虚线传控制信息，不是灯的供能线'));
  } else {
    add('text', { x: 35, y: 533, fill: '#415f50', 'font-size': 20 }, lampOn ? t('完整回路 → 灯亮') : t('灯回路未导通 → 灯灭'));
    add('text', { x: 340, y: 533, fill: '#72617c', 'font-size': 18 }, state.mode === 'manual' ? t('自动控制的小板暂不参与') : t('虚线传控制信息，不是灯的供能线'));
  }
  svg.replaceChildren(...nodes);
}
