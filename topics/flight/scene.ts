import { t } from './i18n.ts';
import { type FlightSnapshot } from './model.ts';
import { flowRoute } from './flowGeometry.ts';
const node = (id: string) => document.getElementById(id)!;
const f = (n: number) => n.toFixed(2);
function arrow(x: number, y: number, dx: number, dy: number, color: string, width = 4) {
 const length = Math.hypot(dx, dy); if (length < .4) return '';
 const ux = dx / length, uy = dy / length, tipX = x + dx, tipY = y + dy;
 const size = Math.min(10, length * .4);
 return `<path d="M${f(x)} ${f(y)}L${f(tipX)} ${f(tipY)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/><path d="M${f(tipX)} ${f(tipY)}L${f(tipX-ux*size-uy*size*.55)} ${f(tipY-uy*size+ux*size*.55)}L${f(tipX-ux*size+uy*size*.55)} ${f(tipY-uy*size-ux*size*.55)}Z" fill="${color}"/>`;
}
export function drawWing(s: FlightSnapshot, progress: number) {
 node('wing-scene').setAttribute('viewBox', matchMedia('(max-width: 600px)').matches ? '180 0 600 390' : '0 0 960 390');
 const pitch = s.pitch * Math.PI / 180, centerX = 480, centerY = 225;
 const point = (x: number, y: number) => [centerX + x * Math.cos(pitch) - y * Math.sin(pitch), centerY + x * Math.sin(pitch) + y * Math.cos(pitch)];
 const xy = (p: readonly number[]) => `${f(p[0]!)} ${f(p[1]!)}`;
 node('wing-profile').setAttribute('transform', `translate(${centerX} ${centerY}) rotate(${s.pitch})`);
 node('wing-chord').setAttribute('transform', `translate(${centerX} ${centerY}) rotate(${s.pitch})`);
 const lead = point(-170, 0), radius = 66, flowAngle = s.pathAngle;
 const start = [lead[0]! + radius * Math.cos(flowAngle), lead[1]! + radius * Math.sin(flowAngle)];
 const end = [lead[0]! + radius * Math.cos(pitch), lead[1]! + radius * Math.sin(pitch)];
 node('angle-arc').setAttribute('d', `M${xy(start)}A${radius} ${radius} 0 0 ${s.angleOfAttack>=0?1:0} ${xy(end)}`);
 node('flow-reference').setAttribute('d', `M${xy(lead)}l${f(180*Math.cos(flowAngle))} ${f(180*Math.sin(flowAngle))}`);
 node('wing-flow').innerHTML = s.airspeed < .1 ? '' : ([-1,1] as const).flatMap(side => [12,42,77].map((offset, index) => {
  const route=flowRoute(s,side,offset),color=route.separated?'#ad6a4c':'#5396a5';
  const d=`M${xy(route.start)}C${xy(route.upstreamControl)} ${xy(route.leadingControl)} ${xy(route.surfaceStart)}C${xy(route.surfaceControl)} ${xy(route.trailingControl)} ${xy(route.trailing)}C${xy(route.downstreamControl)} ${xy(route.exitControl)} ${xy(route.exit)}`;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${index===0?'.88':'.5'}" stroke-width="${index===0?2.8:1.8}" stroke-dasharray="${route.separated?'8 7':'0'}"/><path d="${d}" fill="none" stroke="${color}" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="2 72" stroke-dashoffset="${f(-progress*s.airspeed*9-index*18)}"/>`;
 })).join('');
 node('flow-reference').setAttribute('opacity', s.airspeed > .1 ? '.72' : '.25');
 node('separation').innerHTML = s.stalled && s.airspeed > .1 ? [0,1,2].map(i=>`<path d="M${690+i*52} ${135+i*18}c-30-28-45 23-9 29c27 4 25-25 8-30" fill="none" stroke="#ad6a4c" stroke-width="2" stroke-opacity="${.7-i*.13}"/>`).join('') : '';
 node('wing-force').innerHTML = arrow(505,220,s.liftX*.0032,-s.liftY*.0032,'#478565')+arrow(505,220,s.dragX*.0032,-s.dragY*.0032,'#ad6a4c');
 node('wing-scene').setAttribute('aria-label', s.airspeed < .1 ? t('机翼切面静止，没有流动线和升力箭头。') : s.stalled ? t('机翼翼头抬起，迎角超过模型临界值；上方棕色虚线离开翼面，升力系数从峰值下降、阻力增大。') : t('迎面气流绕过机翼上下两面，尾部整体向下转；绿色升力垂直于相对运动方向。'));
}
export function drawRunway(s: FlightSnapshot) {
 node('runway-scene').setAttribute('viewBox', matchMedia('(max-width: 600px)').matches ? '300 0 660 390' : '0 0 960 390');
 const x = 720 - s.distance*3.2, y = 228 - s.height*5;
 node('plane').setAttribute('transform', `translate(${f(x)} ${f(y)})`);
 node('plane-wing').setAttribute('transform', `translate(-10 15) rotate(${s.pitch})`);
 node('plane-shadow').setAttribute('cx', f(x)); node('plane-shadow').setAttribute('rx', f(Math.max(38,104-s.height*4)));
 node('plane-shadow').setAttribute('opacity', f(Math.max(.05,.22-s.height*.017)));
 const scale=.0032;
 node('plane-forces').innerHTML = arrow(x,y-8,s.liftX*scale,-s.liftY*scale,'#478565')
  +arrow(x-10,y+11,0,s.weight*scale,'#86687d')+arrow(x-72,y-6,-s.thrust*scale,0,'#bd9243')
  +arrow(x+65,y+5,s.dragX*scale,-s.dragY*scale,'#ad6a4c')
  +arrow(x+35,y+55,0,-s.support*scale,'#627887',3);
 node('runway-scene').setAttribute('aria-label', s.height > .01 ? t('飞机已经离开跑道，支持力为零；升力与阻力方向随相对运动改变，重量向下。') : t('飞机轮子仍接触跑道；向上的地面支持力补足空气作用与重量之间的差额。'));
}
