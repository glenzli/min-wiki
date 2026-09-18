import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t);
mountTopicNavigation('camouflage');
const el = <T extends Element = HTMLElement>(id: string): T => document.getElementById(id)! as unknown as T;
const report = (n: number, title: string, text: string) => { el('badge').textContent = String(n); el('state-title').textContent = title; el('state-text').textContent = text; };
const found = new Set<number>();let plain=false; let forestOpacity=1; let cancelBackground: () => void = () => {};
const names=[t('找到竹节虫了'),t('找到叶䗛了'),t('找到蛾了')];const facts=[t('细长的身体和褐色让竹节虫像一根树枝。除了颜色，身体的形状也在帮忙。'),t('叶䗛的身体像一片叶子，还带着像叶脉的纹路。这样的拟态让它更难被发现。'),t('这只蛾的褐色和斑纹与背景接近。颜色、花纹和背景一起影响它是否显眼。')];
const positions=[[28.2,60],[72.9,27.3],[53.3,70]];
positions.forEach(([x,y],i)=>{const b=document.createElement('button');b.className='hotspot';b.style.left=x+'%';b.style.top=y+'%';b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',t('查看藏身处 {{number}}',{number:i+1}));b.addEventListener('click',()=>{found.add(i);el('ring'+i).setAttribute('visibility','visible');b.setAttribute('aria-pressed','true');report(found.size,names[i]!,facts[i]!);});document.querySelector('.scene')!.append(b);});
function background(){cancelBackground(); el('forest').setAttribute('visibility','visible'); cancelBackground=animateValue({from:forestOpacity,to:plain?0:1,duration:700,onUpdate:value=>{forestOpacity=value;el('forest').setAttribute('opacity',String(value));el<HTMLInputElement>('contrast').value=String(Math.round(value*1000));}});el('forest-button').setAttribute('aria-pressed',String(!plain));el('plain-button').setAttribute('aria-pressed',String(plain));report(found.size,plain?t('动物没变，背景变了'):t('找一找三位躲藏高手'),plain?t('同样的颜色和形状，放到素色背景上就容易看见。伪装有没有用，要看周围是什么样。'):t('慢慢找，不用比赛。留意树枝上的细腿、叶子边的触角，还有展开的翅膀。'));}
el('forest-button').addEventListener('click',()=>{plain=false;background();});el('plain-button').addEventListener('click',()=>{plain=true;background();});el('reveal').addEventListener('click',()=>{for(let i=0;i<3;i++){found.add(i);el('ring'+i).setAttribute('visibility','visible');}document.querySelectorAll('.hotspot').forEach(b=>b.setAttribute('aria-pressed','true'));report(3,t('原来它们都在这里'),t('点点三个圈，认识它们各自的藏身办法。它们没有真的变成树枝或树叶。'));});el('reset').addEventListener('click',()=>{el<HTMLSelectElement>('view').value='all';changeView();found.clear();for(let i=0;i<3;i++)el('ring'+i).setAttribute('visibility','hidden');document.querySelectorAll('.hotspot').forEach(b=>b.setAttribute('aria-pressed','false'));plain=false;background();});background();

const svg=el<SVGSVGElement>('scene');const container=document.querySelector<HTMLElement>('.scene')!;
let camera=[0,0,1000,480],cancelCamera:()=>void=()=>{};
function anchors(){const matrix=svg.getScreenCTM();if(!matrix)return;const rect=container.getBoundingClientRect();document.querySelectorAll<HTMLButtonElement>('.hotspot').forEach((b,i)=>{const [x,y]=positions[i]!;const px=x!*10,py=y!*4.8;b.style.left=(matrix.a*px+matrix.e-rect.left)+'px';b.style.top=(matrix.d*py+matrix.f-rect.top)+'px';b.style.width=Math.max(48,matrix.a*200)+'px';b.style.height=Math.max(48,matrix.d*130)+'px';b.hidden=px<camera[0]!||px>camera[0]!+camera[2]!||py<camera[1]!||py>camera[1]!+camera[3]!;});}
function changeView(){cancelCamera();const selected=el<HTMLSelectElement>('view').value;const index=['stick','leaf','moth'].indexOf(selected);const position=positions[index];const target=position?[position[0]!*10-175,position[1]!*4.8-84,350,168]:[0,0,1000,480];const from=[...camera];cancelCamera=animateValue({from:0,to:1,duration:900,onUpdate:u=>{camera=from.map((v,i)=>v+(target[i]!-v)*u);svg.setAttribute('viewBox',camera.join(' '));anchors();}});}
el('view').addEventListener('change',changeView);
el('contrast').addEventListener('input',()=>{cancelBackground();forestOpacity=Number(el<HTMLInputElement>('contrast').value)/1000;el('forest').setAttribute('opacity',String(forestOpacity));el('forest-button').setAttribute('aria-pressed',String(forestOpacity===1));el('plain-button').setAttribute('aria-pressed',String(forestOpacity===0));report(found.size,t('动物没变，背景变了'),t('慢慢移走周围的枝叶，看看轮廓在哪里开始显眼。动物的颜色、大小和形状保持不变。'));});
const observer=new ResizeObserver(anchors);observer.observe(svg);anchors();
window.addEventListener('pagehide',()=>{cancelCamera();cancelBackground();observer.disconnect();});
mountReadingMode('details:not(.references)');
