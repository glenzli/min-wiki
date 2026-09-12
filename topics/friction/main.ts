import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation('friction');
const el = (id: string) => document.getElementById(id)!;
const value = (id: string) => Number((el(id) as HTMLInputElement).value);
import { sliding } from './model.ts';
const lanes=[{name:t('木板'),mu:.12,fill:'woodgrain'},{name:t('布面'),mu:.28,fill:'cloth'},{name:t('砂纸'),mu:.5,fill:'rough'}];
function update(){const time=value('time'),speed=value('speed');el('tracks').innerHTML=lanes.map((lane,i)=>{const state=sliding(speed,lane.mu,time),y=115+i*105,x=180+state.distance*150,arrow=state.speed>0&&time>0?`<path d="M${x+5} ${y+18}h-${lane.mu*100+12}l9-6m-9 6l9 6" stroke="#bc6451" stroke-width="4" fill="none"/>`:'';return `<rect x="130" y="${y+21}" width="705" height="38" rx="8" fill="url(#${lane.fill})"/><text x="32" y="${y+23}">${lane.name}</text><path d="M170 ${y-48}V${y+59}" stroke="#68867e" stroke-dasharray="4 5"/><g transform="translate(${x} ${y-34})"><rect x="-29" width="72" height="55" rx="9" fill="#e5b16c" stroke="#a97842" stroke-width="3"/><circle cx="-5" cy="19" r="3" fill="#503d2a"/><circle cx="19" cy="19" r="3" fill="#503d2a"/><path d="M0 34Q8 40 16 34" fill="none" stroke="#503d2a" stroke-width="3"/></g>${arrow}<text x="830" y="${y-25}" text-anchor="end" class="small">${state.speed===0?t('已停下'):t('还在滑')}</text>`;}).join('');el('readout').textContent=lanes.every(l=>sliding(speed,l.mu,time).speed===0)?t('三块木头都停了：同样快出发时，本例摩擦较小的路滑得更远。'):t('时间 {{time}} 秒 · 出发速度 {{speed}} 米/秒。三条路同时比较。',{time:time.toFixed(2),speed:speed.toFixed(1)});}
el('time').addEventListener('input',update);el('speed').addEventListener('input',()=>{(el('time') as HTMLInputElement).value='0';update();});el('finish').addEventListener('click',()=>{(el('time') as HTMLInputElement).value='4';update();});el('reset').addEventListener('click',()=>{(el('time') as HTMLInputElement).value='0';update();});update();

mountReadingMode('details:not(.references)');
