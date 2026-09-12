import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t);
mountTopicNavigation('butterfly-life');
const el = <T extends Element = HTMLElement>(id: string): T => document.getElementById(id)! as unknown as T;
const report = (n: number, title: string, text: string) => { el('badge').textContent = String(n); el('state-title').textContent = title; el('state-text').textContent = text; };
const ids = ['egg','larva','pupa','adult'];
const titles = [t('一粒小小的卵'),t('吃叶子，长身体'),t('蛹里面正在大变身'),t('展开翅膀，成为蝴蝶')];
const texts = [t('很多蝴蝶把卵产在适合幼虫吃的植物上。小毛毛虫会从卵里孵出来。'),t('毛毛虫是蝴蝶的幼虫。它吃东西、长大，还会蜕掉旧的外皮。'),t('蛹不是在睡觉。外面很安静，里面的身体正在重新发育，翅膀等成虫结构逐渐形成。'),t('蝴蝶从蛹里出来，翅膀展开、变硬后才能飞。成虫交配产卵，下一代又开始了。')];
let stage = 0;
function render() { ids.forEach((id,i)=>el(id).setAttribute('visibility',i===stage?'visible':'hidden')); document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.stage)===stage))); el('peek-control').hidden = stage!==2; report(stage+1,titles[stage]!,texts[stage]!); }
document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.addEventListener('click',()=>{stage=Number(b.dataset.stage);render();}));
el<HTMLInputElement>('peek').addEventListener('change',()=>el('inside').setAttribute('opacity',el<HTMLInputElement>('peek').checked?'1':'0')); render();

mountReadingMode('details:not(.references)');
