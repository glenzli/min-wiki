import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t);
mountTopicNavigation('ant-trails');
const el = <T extends Element = HTMLElement>(id: string): T => document.getElementById(id)! as unknown as T;
const report = (n: number, title: string, text: string) => { el('badge').textContent = String(n); el('state-title').textContent = title; el('state-text').textContent = text; };
let mode: 'trail'|'gap'|'detour'='trail';let progress=0;
function render(){const visible=el<HTMLInputElement>('scent').checked;el('trail').setAttribute('visibility',visible&&mode!=='detour'?'visible':'hidden');el('detour').setAttribute('visibility',visible&&mode==='detour'?'visible':'hidden');el('gap').setAttribute('visibility',mode==='gap'?'visible':'hidden');const path=el<SVGPathElement>(mode==='detour'?'detour':'direct');const length=path.getTotalLength();for(let i=0;i<6;i++){let fraction=(i*.12+progress)%1;if(mode==='gap')fraction=Math.min(fraction,.42-i*.035);const p=path.getPointAtLength(length*fraction);const q=path.getPointAtLength(Math.min(length,length*fraction+2));const angle=Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI;el('ant'+i).setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${angle})`);}el<HTMLButtonElement>('erase').disabled=mode!=='trail';el<HTMLButtonElement>('reroute').disabled=mode!=='gap';if(mode==='trail')report(1,t('跟着气味走'),t('一些蚂蚁找到食物后会留下气味痕迹。伙伴用触角探测气味，沿着路线前进。紫色点只是帮我们看见气味。'));else if(mode==='gap')report(2,t('咦，气味小路断了'),t('失去气味线索时，蚂蚁可能在附近寻找。这里把寻找过程停下来，让你看清缺口。'));else report(3,t('找到绕行的小路'),t('侦察蚁找到食物后，沿着新路线留下气味。伙伴可能逐渐跟上新路线。'));}
el('walk').addEventListener('click',()=>{progress+=.075;render();});el('erase').addEventListener('click',()=>{mode='gap';render();});el('reroute').addEventListener('click',()=>{mode='detour';progress=0;render();});el('reset').addEventListener('click',()=>{mode='trail';progress=0;el<HTMLInputElement>('scent').checked=true;render();});el('scent').addEventListener('change',render);render();

mountReadingMode('details:not(.references)');
