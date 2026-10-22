import { t } from './i18n.ts';
import { coefficients, FLIGHT, type FlightSnapshot } from './model.ts';
import { flowRoute } from './flowGeometry.ts';
import { diagramAircraftPose, type Question } from './journey.ts';
import { airfoilContour, airfoilPoint } from './airfoil.ts';
const node = (id: string) => document.getElementById(id)!;
const f = (n: number) => n.toFixed(2);
const sectionPath = airfoilContour().map(([x,y],i)=>`${i?'L':'M'}${f((x-.5)*340)} ${f(-y*340)}`).join('')+'Z';
const surfaceHighlight = (upper: boolean) => Array.from({length:29},(_,i)=> {
 const [x,y]=airfoilPoint(.05+i*.028,upper);return `${i?'L':'M'}${f((x-.5)*340)} ${f(-y*340+(upper?3:-2))}`;
}).join('');
function arrow(x: number, y: number, dx: number, dy: number, color: string, width = 4) {
 const length = Math.hypot(dx, dy); if (length < .4) return '';
 const ux = dx / length, uy = dy / length, tipX = x + dx, tipY = y + dy;
 const size = Math.min(10, length * .4);
 return `<path d="M${f(x)} ${f(y)}L${f(tipX)} ${f(tipY)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/><path d="M${f(tipX)} ${f(tipY)}L${f(tipX-ux*size-uy*size*.55)} ${f(tipY-uy*size+ux*size*.55)}L${f(tipX-ux*size+uy*size*.55)} ${f(tipY-uy*size-ux*size*.55)}Z" fill="${color}"/>`;
}
export function drawWing(s: FlightSnapshot, progress: number, options: { question: Question; labels: boolean; forces: boolean }) {
 node('wing-scene').setAttribute('viewBox', matchMedia('(max-width: 600px)').matches ? '180 0 600 390' : '0 0 960 390');
 const pitch = s.pitch * Math.PI / 180, centerX = 480, centerY = 225;
 const point = (x: number, y: number) => [centerX + x * Math.cos(pitch) - y * Math.sin(pitch), centerY + x * Math.sin(pitch) + y * Math.cos(pitch)];
 const xy = (p: readonly number[]) => `${f(p[0]!)} ${f(p[1]!)}`;
 node('wing-profile').setAttribute('transform', `translate(${centerX} ${centerY}) rotate(${s.pitch})`);
 node('wing-profile').firstElementChild!.setAttribute('d', sectionPath);
 node('wing-profile').children[1]!.setAttribute('d',surfaceHighlight(true));
 node('wing-profile').children[2]!.setAttribute('d',surfaceHighlight(false));
 node('wing-profile').children[3]!.setAttribute('visibility','hidden');
 node('wing-chord').setAttribute('transform', `translate(${centerX} ${centerY}) rotate(${s.pitch})`);
 node('wing-chord').setAttribute('visibility', options.labels ? 'visible' : 'hidden');
 const pressure = options.question === 'forces' && s.airspeed > .1 && !s.stalled && s.cl > 0;
 node('wing-pressure').innerHTML = pressure ? `<g transform="translate(${centerX} ${centerY}) rotate(${s.pitch})"><path d="M-178 3C-178-83 13-83 184 0C77-17-109-20-178 3" fill="#a4c5d1" fill-opacity=".32"/><path d="M-175 14C-90 64 85 49 181 5L170 0C90 14-98 25-164 12Z" fill="#e2be7c" fill-opacity=".31"/></g>` : '';
 const lead = point(-170, 0), radius = 66, flowAngle = s.pathAngle;
 const start = [lead[0]! + radius * Math.cos(flowAngle), lead[1]! + radius * Math.sin(flowAngle)];
 const end = [lead[0]! + radius * Math.cos(pitch), lead[1]! + radius * Math.sin(pitch)];
 node('angle-arc').setAttribute('d', `M${xy(start)}A${radius} ${radius} 0 0 ${s.angleOfAttack>=0?1:0} ${xy(end)}`);
 node('flow-reference').setAttribute('d', `M${xy(lead)}l${f(180*Math.cos(flowAngle))} ${f(180*Math.sin(flowAngle))}`);
 node('flow-reference').setAttribute('visibility', options.labels ? 'visible' : 'hidden');
 node('angle-arc').setAttribute('visibility', options.labels ? 'visible' : 'hidden');
 node('wing-flow').innerHTML = s.airspeed < .1 ? '' : ([-1,1] as const).flatMap(side => [12,42,77].map((offset, index) => {
  const route=flowRoute(s,side,offset),color=route.separated?'#ad6a4c':'#5396a5';
  const d=`M${xy(route.start)}C${xy(route.upstreamControl)} ${xy(route.leadingControl)} ${xy(route.surfaceStart)}C${xy(route.surfaceControl)} ${xy(route.trailingControl)} ${xy(route.trailing)}C${xy(route.downstreamControl)} ${xy(route.exitControl)} ${xy(route.exit)}`;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${index===0?'.88':'.5'}" stroke-width="${index===0?2.8:1.8}" stroke-dasharray="${route.separated?'8 7':'0'}"/><path d="${d}" fill="none" stroke="${color}" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="2 72" stroke-dashoffset="${f(-progress*s.airspeed*9-index*18)}"/>`;
 })).join('');
 node('flow-reference').setAttribute('opacity', s.airspeed > .1 ? '.72' : '.25');
 node('separation').innerHTML = s.stalled && s.airspeed > .1 ? [0,1,2].map(i=>`<path d="M${690+i*52} ${135+i*18}c-30-28-45 23-9 29c27 4 25-25 8-30" fill="none" stroke="#ad6a4c" stroke-width="2" stroke-opacity="${.7-i*.13}"/>`).join('') : '';
 node('wing-force').innerHTML = options.forces ? arrow(505,220,s.liftX*.0032,-s.liftY*.0032,'#478565')+arrow(505,220,s.dragX*.0032,-s.dragY*.0032,'#ad6a4c') : '';
 const text = (x: number, y: number, value: string, color = '#46616d', size = 16) => `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-family="system-ui,sans-serif">${value}</text>`;
 node('wing-labels').innerHTML = options.labels ? text(220,93,t('同一片机翼的切面'))
  +text(220,116,t('蓝线：相对气流路线'), '#357f95', 14)
  +(pressure ? text(315,156,t('常见升力情形：上方相对压力较低'), '#557c8c', 14)+text(430,332,t('下方相对压力较高'), '#947644', 14) : '')
  +(s.airspeed > .1 ? text(220,360,t('迎角 {{n}}°', {n:s.angleOfAttack.toFixed(1)}), '#9a762e', 15) : text(355,326,t('没有相对气流，升力为零'), '#61717b', 15)) : '';
 node('wing-scene').setAttribute('aria-label', s.airspeed < .1 ? t('机翼切面静止，没有流动线和升力箭头。') : s.stalled ? t('机翼翼头抬起，迎角超过模型临界值；上方棕色虚线离开翼面，升力系数从峰值下降、阻力增大。') : t('迎面气流绕过机翼上下两面，尾部整体向下转；绿色升力垂直于相对运动方向。'));
}
export function drawRunway(s: FlightSnapshot, showForces = true) {
 node('runway-scene').setAttribute('viewBox', matchMedia('(max-width: 600px)').matches ? '300 0 660 390' : '0 0 960 390');
 const { x, y, contactX, contactY } = diagramAircraftPose(s);
 node('plane').setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${s.pitch})`);
 node('plane-wing').setAttribute('transform', 'translate(-19.5 6.6)');
 node('plane-wing').firstElementChild!.setAttribute('d',airfoilContour().map(([px,py],i)=>`${i?'L':'M'}${f((px-.38)*60)} ${f(-py*60)}`).join('')+'Z');
 node('plane-shadow').setAttribute('cx', f(x)); node('plane-shadow').setAttribute('rx', f(Math.max(38,104-s.height*4)));
 node('plane-shadow').setAttribute('opacity', f(Math.max(.05,.22-s.height*.017)));
 const scale=.0032;
 node('plane-forces').innerHTML = showForces ? arrow(x,y-8,s.liftX*scale,-s.liftY*scale,'#478565')
  +arrow(x-10,y+11,0,s.weight*scale,'#86687d')+arrow(x-72,y-6,-s.thrust*scale,0,'#bd9243')
  +arrow(x+65,y+5,s.dragX*scale,-s.dragY*scale,'#ad6a4c')
  +arrow(x+contactX,contactY,0,-s.support*scale,'#627887',3) : '';
 node('runway-scene').setAttribute('aria-label', s.height > .01 ? t('飞机已经离开跑道，支持力为零；升力与阻力方向随相对运动改变，重量向下。') : t('飞机轮子仍接触跑道；向上的地面支持力补足空气作用与重量之间的差额。'));
}

/** The plotted curve is exactly the topic's invented coefficient, never wind-tunnel data. */
export function drawCoefficientPlot(s: FlightSnapshot) {
 const x = (a: number) => 34 + a / 26 * 258, y = (cl: number) => 137 - cl * 70;
 const curve = Array.from({length:53},(_,i)=>`${i?'L':'M'}${f(x(i/2))} ${f(y(coefficients(i/2).cl))}`).join('');
 node('coefficient-scene').innerHTML = `<path d="M34 15V137H302" fill="none" stroke="#8e9ba1"/><path d="M${f(x(FLIGHT.stallAngle))} 23V137" stroke="#ad6a4c" stroke-dasharray="4 4"/><path d="${curve}" fill="none" stroke="#478565" stroke-width="2.5"/><circle cx="${f(x(Math.max(0,Math.min(26,s.angleOfAttack))))}" cy="${f(y(s.cl))}" r="5" fill="${s.stalled?'#ad6a4c':'#478565'}" stroke="#fff" stroke-width="2"/><g font-size="11" font-family="system-ui,sans-serif" fill="#697b83"><text x="8" y="18">Cₗ</text><text x="27" y="153">0°</text><text x="${f(x(15)-10)}" y="153">15°</text><text x="280" y="153">26°</text><text x="147" y="169">${t('迎角')}</text><text x="8" y="140">0</text><text x="5" y="40">1.4</text></g>`;
}
