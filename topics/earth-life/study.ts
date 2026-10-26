import type { StudyContext, StudyInstance } from '../earth/studyContract.ts';
import { createFinitePlayback, type FinitePlayback } from '../earth/finitePlayback.ts';
import { BURIALS, COMMUNITIES, DATA, DEPOSITS, FOSSIL_STOPS, LENSES, PLANTS, SAMPLES, VIEWS, communityById, focusedNode, fossilExperiment, fossilSummary, fossilTimeline, nodeStatus, parseState, serializeState, visibleLinks, type FossilRecord, type Lens, type Pair, type RemainKind } from './model.ts';
import './style.css';

const escape = (value: string | number) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
/** Original vector drawings: these are morphology-led illustrations, never fossil photographs. */
function flatIcon(kind: string): string {
  switch (kind) {
    case 'trilobite': return `<path d="M-31-24Q0-51 31-24L27 24Q0 50-27 24Z" fill="#ad8d60" stroke="#554f3e" stroke-width="1.5"/><path d="M-8-28Q0-35 8-28L10 24Q0 39-10 24Z" fill="#c3aa77" stroke="#655b43"/>${Array.from({ length: 9 }, (_, i) => `<path d="M-27 ${-16 + i * 5}q27 9 54 0M-8 ${-16 + i * 5}q8 4 16 0" fill="none" stroke="#6e644c" stroke-width="1.1"/>`).join('')}<path d="M-32-19-43-4M32-19 43-4M-20 29-32 40M20 29 32 40" stroke="#8a7958" stroke-width="2"/><path d="M-24-24q9-9 17 0m14 0q8-9 17 0" fill="none" stroke="#393b31" stroke-width="3"/>`;
    case 'anomalocaris': return `<path d="M-60-13Q-17-34 47-12L71 0 46 15Q-18 31-60 14Z" fill="#a56e52" stroke="#5f5345" stroke-width="1.7"/>${Array.from({ length: 9 }, (_, i) => { const x = -36 + i * 10, h = 21 - i; return `<path d="M${x}-13q-11-20 2-${h}l12 14M${x} 13q-11 20 2 ${h}l12-14" fill="#c59168" stroke="#735a43" stroke-width="1"/>`; }).join('')}<path d="m46-8 30-17-7 18L84 0 69 7l7 18-30-17" fill="#a57b59" stroke="#735a43"/><path d="M-56-11-70-21M-56 10-70 18" stroke="#a8a379" stroke-width="3"/><ellipse cx="-73" cy="-23" rx="6" ry="4" fill="#242e27"/><ellipse cx="-73" cy="20" rx="6" ry="4" fill="#242e27"/><path d="M-56-3q-24 5-22 29 10 7 15-6M-53 7q-8 22 4 34 15-3 9-17" fill="none" stroke="#b18b60" stroke-width="6"/>${[0,1,2,3].map(i => `<path d="m${-76 + i * 3} ${10 + i * 5} 8-3m${-49 + i * 2} ${23 + i * 3} 7-3" stroke="#d5bd82" stroke-width="1.7"/>`).join('')}`;
    case 'dickinsonia': return `<ellipse rx="57" ry="31" transform="rotate(-18)" fill="#b7aa84" stroke="#7b7964" stroke-width="1.4"/><g transform="rotate(-18)"><path d="M-50 0H50" stroke="#7c7b66" fill="none"/>${Array.from({ length: 17 }, (_, i) => { const x = -46 + i * 5.6, h = 28 * Math.sqrt(Math.max(0, 1 - x * x / 2704)); return `<path d="M${x} 0q4-8 2-${h}m-2 ${h}q-4 8-2 ${h}" stroke="#88836b" stroke-width="1" fill="none"/>`; }).join('')}</g>`;
    case 'kimberella': return `<path d="M-47-4Q-45-28-12-29Q25-30 46-5Q31 25-10 27Q-40 25-47-4Z" fill="#b2a27d" stroke="#6e705b" stroke-width="1.7"/><path d="M-37-5Q-33-21-7-21 20-20 34-4Q12 15-13 16-34 14-37-5Z" fill="#c4b891" stroke="#8e8a6b"/>${Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2; return `<path d="M${Math.cos(a) * 39} ${Math.sin(a) * 22}l${Math.cos(a) * 5} ${Math.sin(a) * 4}" stroke="#827d64"/>`; }).join('')}`;
    case 'worm': return `<path d="M-47 8Q-27-31-2-4T48-5" fill="none" stroke="#b59d80" stroke-width="17" stroke-linecap="round"/><path d="M-47 8Q-27-31-2-4T48-5" fill="none" stroke="#d2b695" stroke-width="10" stroke-dasharray="1.5 4" stroke-linecap="round"/>`;
    case 'sponge': return `<path d="M-27 42-29-14Q-29-34-11-32L-5-13 6-40Q20-51 26-32L20 7 35-10Q51-17 45 2L24 42Z" fill="#b3a371" stroke="#746f51" stroke-width="1.7"/><ellipse cx="17" cy="-34" rx="9" ry="4" fill="#63684d" transform="rotate(18 17 -34)"/>${Array.from({ length: 25 }, (_, i) => `<circle cx="${-22 + i * 13 % 48}" cy="${-15 + i * 19 % 51}" r="1.2" fill="#7a7959"/>`).join('')}`;
    case 'coral': return `${[-2,-1,0,1,2].map((i) => `<path d="M${i * 12} 35q${i * 5} -18 ${i * 4}-44q-8-13-18-5l2 20q7 18 16 29Z" fill="#c6b895" stroke="#8c8367"/><ellipse cx="${i * 16-9}" cy="-12" rx="8" ry="4" fill="#8c8161"/>`).join('')}`;
    case 'brachiopod': return `<path d="M-37-3Q0-29 37-3L30 29Q0 48-30 29Z" fill="#baa980" stroke="#786c51" stroke-width="1.5"/>${Array.from({ length: 13 }, (_, i) => `<path d="M0-9q${-34 + i * 5.6} 18 ${-30 + i * 5} 43" stroke="#8b7d5c" stroke-width="1" fill="none"/>`).join('')}<path d="M-34 10Q0 29 34 10M-30 22Q0 41 30 22" fill="none" stroke="#cfc09c"/>`;
    case 'bivalve': case 'shell': return `<path d="M-35 17Q-40-29-5-31 29-32 38 10Q19 36-8 38Z" fill="#c6b797" stroke="#786c53" stroke-width="1.6"/>${[0,1,2,3,4].map(i => `<path d="M${-28+i*4} ${14-i*4}q${2+i} ${-45+i*5} ${52-i*6} ${-10+i*2}" fill="none" stroke="#988b6b" stroke-width="1.2"/>`).join('')}`;
    case 'mat': case 'peat': return `<path d="M-68 12q27-26 63-10 43-25 75 4l-7 23q-30 12-66 0-32 18-67-1Z" fill="${kind === 'peat' ? '#665b41' : '#7e8f53'}" stroke="#4c6552"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${-59 + i * 3} ${13 + i * 1.8}q28-9 52-1t62-1" fill="none" stroke="${i % 2 ? '#a9ab71' : '#526b47'}" stroke-width="1.4"/>`).join('')}`;
    case 'cells': return `${[[-20,-5],[8,-15],[27,6],[-4,18]].map(([x,y],i) => `<g transform="translate(${x} ${y}) rotate(${i*35})"><rect x="-18" y="-8" width="35" height="16" rx="8" fill="#b2b789" stroke="#60745e"/><path d="M-8 0q5-8 13 0" stroke="#7a8559" fill="none"/></g>`).join('')}`;
    case 'oxygen': return `${[[-28,18,11],[0,-14,16],[29,12,9]].map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#a9d8ce" fill-opacity=".3" stroke="#96c7c0" stroke-width="1.5"/><path d="M${x-r*.4} ${y-r*.6}q5-5 10-1" stroke="#d2e6d7" stroke-width="2" fill="none"/>`).join('')}`;
    case 'plankton': return `${Array.from({ length: 18 }, (_, i) => `<g transform="translate(${-45 + i * 31 % 90} ${-25 + i * 23 % 55})"><ellipse rx="${2+i%3}" ry="${1+i%2}" fill="${i%2 ? '#a9b47b' : '#90baac'}" transform="rotate(${i*57})"/></g>`).join('')}`;
    case 'traces': return `<path d="M-74-28Q-42-49-10-36L62-43 76 25Q43 48 8 33L-65 42Z" fill="#9b957b" stroke="#77765f" stroke-width="1.3"/><path d="M-70-26Q-41-45-10-33L60-40" fill="none" stroke="#c2b394" stroke-width="1.5" opacity=".7"/>${[-43,-12].map((x,j)=>`<g transform="translate(${x} ${j?-13:8}) rotate(-22)"><ellipse rx="19" ry="11.5" fill="#837e65" stroke="#6a6752" stroke-width="1.4"/><path d="M-18 3Q0 17 18 3" fill="none" stroke="#c5b697" stroke-width="1.2"/>${Array.from({length:7},(_,i)=>`<path d="M${-13+i*4.3} ${-8+Math.abs(3-i)*1.6}q-2 7 0 ${16-Math.abs(3-i)*3.2}" fill="none" stroke="#b4a687" stroke-width=".9" opacity=".8"/>`).join('')}</g>`).join('')}${Array.from({ length: 7 }, (_, i) => {const end=20+i*6;return `<path d="M15 24Q${26+i*3} 3 ${end}-25m-1 0Q${24+i*3} 4 12 24" fill="none" stroke="#665f4c" stroke-width="1.15"/><path d="M16 26Q${27+i*3} 5 ${end+1}-23" fill="none" stroke="#c6b697" stroke-width=".8"/>`;}).join('')}`;
    case 'lycopsid': return `<path d="M-13 100-10-20-37-64-30-70 0-37 26-76 32-68 9-19 13 100Z" fill="#777451" stroke="#4b543d" stroke-width="1.5"/>${Array.from({ length: 18 }, (_, i) => [-1,0,1].map(col => `<path d="m${col*6+(i%2?3:0)-4} ${-4+i*5.4} 3-3.8 3 3.8-3 3.8Z" fill="#9b9c66" stroke="#626b47" stroke-width=".45"/><path d="m${col*6+(i%2?3:0)-2.5} ${-5+i*5.4} 2.6-.2" stroke="#475b3d" stroke-width=".75"/>`).join('')).join('')}${[-34,29].map((x,j) => `<path d="M${x}-67 ${x+(j?5:-5)}-108" stroke="#788855" stroke-width="3"/>${Array.from({ length: 19 }, (_, i) => { const y=-66-i*2, xx=x+(j?1:-1)*i*.24, side=i%2?1:-1; return `<path d="M${xx} ${y}q${side*(12-i*.25)}-3 ${side*(18-i*.35)}-12" fill="none" stroke="${j?'#6e8950':'#809954'}" stroke-width="1.5"/>`; }).join('')}`).join('')}`;
    case 'calamite': return `<path d="M-5 100-3-81 4-81 8 100" fill="#7f8c5c" stroke="#586947"/>${Array.from({ length: 7 }, (_, i) => `<g transform="translate(0 ${-65+i*23})"><path d="M-5 0H7M-1-18v16M3-18v16" stroke="#abb177"/>${[-1,1].map(side => `<path d="M0 0q${side*18}-3 ${side*34}-22m${-side*17} 13 ${side*3}-16m${side*3} 6 ${side*12}-4" fill="none" stroke="#7f9b58" stroke-width="1.8"/>`).join('')}</g>`).join('')}`;
    case 'seedfern': return `<path d="M0 68Q-7 8 11-65" stroke="#a3a675" stroke-width="3" fill="none"/>${Array.from({ length: 8 }, (_, i) => [-1,1].map(side => `<g transform="translate(${i*.8} ${45-i*13}) rotate(${side*20})"><path d="M0 0 ${side*(43-i*3)}-12" stroke="#8a9d65" fill="none"/>${Array.from({ length: 6 }, (_, j) => {const x=side*(8+j*5),y=-j*1.8;return `<g transform="translate(${x} ${y}) rotate(${side*30})"><path d="M0 8C-6 4-7-3-1-10C5-8 7 1 0 8Z" fill="#8da66c" stroke="#607951" stroke-width=".55"/><path d="M0 8-1-9M-.3 1-3-2m3 3 3-3M-.5-3-3-5m2.5 2 3-3" fill="none" stroke="#bcc08a" stroke-width=".45"/></g>`;}).join('')}</g>`).join('')).join('')}`;
    case 'fungus': return `<path d="m-48 4 30-21 54 13 14 27-51 12-45-13Z" fill="#746d4d" stroke="#555f45"/><path d="M-44 23q16-15 31-8t36-10m-26 12q4 15 29 17m-14-22 16 3 10-8m-35 13-4 12-15 5m-8-16-14-4-7-13M-7 17 0-1l-5-9m27 15 7-14 14-4M0 29l-7 12-20 4m6-28-7-11-16-7" fill="none" stroke="#c1b78f" stroke-width="1.8"/><path d="M-24 25-35 33m24-14 8 9m23-16 11 10M0-1l9-6" fill="none" stroke="#b4b68a" stroke-width="1"/>`;
    case 'broadleaf': return `<path d="M-8 98-6-15-30-43M6 98 7-10 36-43M0-10 0-67" fill="none" stroke="#655e42" stroke-width="11"/>${[[-30,-48,24],[0,-74,28],[35,-46,29],[-7,-37,31],[27,-12,23]].map(([x,y,r]) => `<path d="M${x-r} ${y}q${r*.6}-${r*1.5} ${r*1.4}-${r*.6}q${r*1.4}-${r*.1} ${r*.9} ${r}q-${r*.6} ${r}-${r*1.9} ${r*.6}Z" fill="#718354" stroke="#516444"/>`).join('')}`;
    case 'dinosaur': return `<path d="M-44 8q-8 10-11 34l10 1 13-28M0 8q-7 12-5 34l12 0 7-26" fill="#6e7656" stroke="#525c44" stroke-width="1.1"/><path d="M-62 5C-76-3-93-3-108 1C-94-10-75-14-61-10C-52-31-33-39-10-38C14-39 29-24 38-12L54-9 71-12 88-5 93 3 85 10 63 10 44 5C33 21 12 23-8 19L-31 13-48 16Z" fill="#8c8b65" stroke="#525c44" stroke-width="1.7"/><path d="M-46 9C-51 21-47 30-48 45L-35 46-31 26-25 15M14 13C10 26 15 33 16 47L29 47 33 26 31 11" fill="#8d8e67" stroke="#525c44" stroke-width="1.4"/><path d="M29-13C28-26 33-35 42-39L44-26 55-33 53-18 63-14 51-5 38-4Z" fill="#a1a17b" stroke="#626848" stroke-width="1.3"/><path d="m54-17 13-15-3 18m13 3 9-8-2 10" fill="#d1caa4" stroke="#7f8062" stroke-width="1"/><path d="M-52-14q20-18 46-16M-40 13q4 9 1 17M21 16l2 16M65 3q8 2 17-1" fill="none" stroke="#bec09a" stroke-width="1" opacity=".65"/><circle cx="73" cy="-5" r="1.7" fill="#263b31"/><path d="m-47 44 10 0m54 1 11 0" stroke="#4d5842" stroke-width="2"/>${Array.from({length:24},(_,i)=>`<ellipse cx="${-49+i*17.3%72}" cy="${-21+i*11.7%29}" rx="${1+i%3*.3}" ry=".7" fill="#657653" opacity=".3"/>`).join('')}`;
    case 'bird': return `<path d="M-23 7q-1-24 20-24 12 1 16 9l12 3-10 8q-6 26-31 18l-23 11 10-20Z" fill="#ac9d77" stroke="#655f4a"/><path d="M-17 1q29-8 16 17l-21-2M-5 22l-2 18m10-19 4 16" fill="none" stroke="#736e50" stroke-width="2"/><circle cx="7" cy="-9" r="2" fill="#283c30"/>`;
    case 'mammal': return `<path d="M-37 12q-9-24 18-28 23-6 31 5l14-5 13 13-6 11-18 2-6 16-9-1 1-15-21-1-9 15-8-2 3-14Z" fill="#9b8a6a" stroke="#5e5847"/><path d="M-36 9q-27 17-37 5" stroke="#9b8a6a" stroke-width="5" fill="none"/><ellipse cx="21" cy="-10" rx="7" ry="8" fill="#9b8a6a" stroke="#5e5847"/><circle cx="32" cy="0" r="2" fill="#24382c"/>`;
    case 'mammoth': return `<path d="M-43 0-40 48-29 49-24 5M7-2 11 48 22 48 25-1" fill="#695d48" stroke="#514b3e" stroke-width="1.2"/><path d="M-62 2C-72-18-65-46-43-55C-31-62-17-61-7-62C11-60 23-47 31-34C43-34 53-22 55-5C57 12 68 25 67 36C65 46 57 47 53 39C50 29 49 17 43 8L29 5C18 14-1 17-19 12L-42 13Z" fill="#8f7959" stroke="#584f40" stroke-width="1.8"/><path d="M-49 5C-52 19-49 33-48 47L-36 48C-34 36-30 23-28 11M13 9C10 23 14 35 15 50L28 49C31 31 31 19 33 4" fill="#8a7354" stroke="#5b5140" stroke-width="1.4"/><path d="M-61-4q-14 2-13 17" fill="none" stroke="#695e47" stroke-width="3"/><path d="M29-28q-15-8-17 10t13 20q10-11 4-30" fill="#75634b" stroke="#65583f"/><path d="M42-5C48 16 67 25 79 8C78 32 60 33 46 13" fill="#cbbb96" stroke="#9c9173" stroke-width="1.2"/><path d="M47-3C56 13 78 16 87-2C84 23 65 28 49 12" fill="#dfcfaa" stroke="#aa9b7a" stroke-width="1.1"/><circle cx="40" cy="-22" r="2" fill="#25362a"/><path d="m37-24 6 1" stroke="#bca882" stroke-width="1"/>${Array.from({length:62},(_,i)=>{const x=-58+i*17.3%78,y=-39+i*11.7%47;return `<path d="m${x} ${y}q${-1-i%3} 5 ${-2-i%2} ${10+i%6}" fill="none" stroke="${i%3?'#ae9870':'#665b45'}" stroke-width=".7" opacity=".65"/>`;}).join('')}<path d="m-48 45 11 1m53 2 11-1" stroke="#4c483c" stroke-width="1.5"/>`;
    case 'horse': return `<path d="M-35 5-31 45-23 45-16 6M11 4 20 42 27 43 24 0" fill="#867758" stroke="#655f48"/><path d="M-49-1C-44-15-28-23-7-20L15-14C24-21 24-36 32-44L43-48 51-37 56-29 66-23 62-13 48-14 38-1C35 10 22 18 6 16L-22 12-43 13Z" fill="#ad9873" stroke="#655f48" stroke-width="1.5"/><path d="M-46 7C-49 19-47 28-44 34L-45 51-36 51-31 32-29 12M13 12C18 19 22 24 22 31L18 50 28 51 34 29 29 6" fill="#aa946e" stroke="#655f48" stroke-width="1.3"/><path d="M-48 0C-62 0-54 26-64 31M30-40 23-25 23-10" stroke="#5d5d48" stroke-width="6" fill="none"/><path d="m36-44 0-11 6 10m5 4 5-9 1 16" fill="#9c8967" stroke="#655f48"/><path d="M48-31q-6 12-10 17M-37-13q16-7 31-3M-28 11q4 14-5 21" stroke="#d1bc91" opacity=".55" fill="none" stroke-width="1"/><circle cx="51" cy="-31" r="1.7" fill="#2c392e"/><path d="m59-20 3 1m-45 67 9 0m-59 0 9 0" stroke="#504b3b" stroke-width="2.3"/>`;
    case 'bison': return `<path d="M-35 3-34 46-24 47-19 6M9 3 13 43 22 45 24-1" fill="#6c6048" stroke="#514b39"/><path d="M-54 2C-57-14-44-26-28-27C-19-45-4-48 10-40L25-23C34-24 49-17 55-8L61 8 52 21 35 22C29 30 19 30 9 24L-7 15-29 13-48 15Z" fill="#8b7a58" stroke="#584f3b" stroke-width="1.5"/><path d="M-50 6q-4 15 0 27l-3 17 10 1 6-22 1-17M8 11q4 16 6 22l-1 18 10 1 9-28-2-12" fill="#897552" stroke="#584f3b" stroke-width="1.2"/><path d="M9-39C20-34 28-20 30-8L40 16 34 29 26 32 21 26 17 32 10 25 4 26 0 17-8 18-9 10Z" fill="#695d43"/><path d="M40-13q-8-9-4-19-10 8-4 21M49-10q11-3 10-16 8 13-5 19" fill="#c5b58e" stroke="#7d7458" stroke-width="1.2"/><path d="M-53 3q-15 7-12 19" stroke="#5c5540" stroke-width="3" fill="none"/><circle cx="49" cy="-4" r="1.8" fill="#25372b"/>${Array.from({length:29},(_,i)=>`<path d="m${-17+i*13.7%51} ${-28+i*9.7%43}q1 5-2 11" stroke="${i%2?'#a38e66':'#514c39'}" stroke-width=".8" opacity=".65" fill="none"/>`).join('')}<path d="m-51 48 8 1m56 1 9 1" stroke="#494637" stroke-width="2"/>`;
    case 'grass': return `${Array.from({ length: 17 }, (_, i) => { const x = -45 + i * 6; return `<path d="M${x} 30q${i%2?13:-13}-${20+i%4*9} ${i%2?8:-10}-${34+i%5*7}" fill="none" stroke="${i%2?'#afa16a':'#74864e'}" stroke-width="1.8"/>`; }).join('')}`;
    case 'shrub': return `<path d="M-9 32-5-2-27-25M-5 12 23-20M-4 2 1-36M5 4 37-3M-13 22-39 9" fill="none" stroke="#8d8060" stroke-width="2.5"/>${[[-28,-26],[-18,-15],[1,-34],[1,-20],[23,-20],[12,-9],[37,-3],[25,2],[-39,9],[-26,15]].map(([x,y],i)=>`<ellipse cx="${x}" cy="${y}" rx="8" ry="3.8" transform="rotate(${i%2?35:-35} ${x} ${y})" fill="${i%2?'#8a9867':'#a1a879'}"/>`).join('')}`;
    case 'leaf': return `<path d="M-32 25Q-46-17 28-30Q39 12-32 25Z" fill="#93a267" stroke="#63734c"/><path d="M-37 31 26-28M-19 13-25-4M-5 1-9-16M-4 1 20 3" fill="none" stroke="#bac08a" stroke-width="1.6"/>`;
    case 'wood': return `<path d="m-39-15 69-8 10 40-72 8Z" fill="#a59370" stroke="#675d46"/><ellipse cx="33" cy="-3" rx="8" ry="20" fill="#c0af8a" stroke="#77694f"/><path d="M-34-6 27-14M-30 14 28 6M-22 2 16-3" fill="none" stroke="#786b50" stroke-width="2"/>`;
    case 'bone': return `<path d="M-24-8q-8-16-18-5-8 10 4 17-9 10 1 16 12 6 18-8l40-1q8 17 19 5 8-9-3-16 11-8 0-16-12-7-19 8Z" fill="#c8bea1" stroke="#8e856d" stroke-width="1.5"/>`;
    case 'insect': return `<ellipse rx="9" ry="26" fill="#9d916a" stroke="#655f46"/><circle cy="-29" r="9" fill="#857f59" stroke="#655f46"/><path d="M0-18V24M-7-10-27-23m20 21-29 7M-7 10l-20 24M7-10 27-23M7-2l29 7M7 10l20 24M-3-36l-8-12m14 12 8-12" stroke="#695f45" fill="none" stroke-width="2"/>`;
    default: return `<path d="M-44 15q27-23 80-5l-7 19-65 2Z" fill="#a59a76"/>${Array.from({ length: 13 }, (_, i) => `<path d="m${-38+i*6} ${8+i%3*6} 9-8m-7 2 2-5" stroke="#c6b78a" stroke-width="1.6"/>`).join('')}`;
  }
}


let drawingSerial = 0;
/** Object-bound pigment shading; the authored colors carry no fossil color claim. */
function icon(kind: string): string {
  const drawing = flatIcon(kind), prefix = `life-material-${++drawingSerial}`;
  const colors = [...new Set([...drawing.matchAll(/fill="(#[0-9a-f]{6})"/g)].map(match => match[1]))];
  const mix = (hex: string, target: number, amount: number) => `#${[1, 3, 5].map(at => Math.round(parseInt(hex.slice(at, at + 2), 16) * (1 - amount) + target * amount).toString(16).padStart(2, '0')).join('')}`;
  const defs = colors.map((color, i) => `<linearGradient id="${prefix}-${i}" x1=".12" y1="0" x2=".72" y2="1"><stop stop-color="${mix(color, 255, .19)}"/><stop offset=".42" stop-color="${color}"/><stop offset="1" stop-color="${mix(color, 15, .24)}"/></linearGradient>`).join('');
  return `<defs>${defs}</defs>${drawing.replace(/fill="(#[0-9a-f]{6})"/g, (_, color: string) => `fill="url(#${prefix}-${colors.indexOf(color)})"`)}`;
}

export function mountStudy(host: HTMLElement, context: StudyContext): StudyInstance {
  const zh = context.language === 'zh';
  const w = (chinese: string, english: string) => zh ? chinese : english;
  const p = (pair: Pair) => pair[context.language];
  const viewName = (id: typeof VIEWS[number]) => ({ community: w('群落现场', 'Community fieldwork'), fossils: w('化石筛选实验', 'Fossil filters'), plants: w('植物形态工坊', 'Plant morphology'), animal: w('瓦普塔虫3D', 'Waptia in 3D') })[id];
  const lensName = (id: Lens) => ({ reconstruction: w('现场复原', 'Reconstruction'), body: w('身体化石', 'Body fossils'), trace: w('遗迹', 'Traces'), chemistry: w('地球化学', 'Geochemistry'), inference: w('对比与推断', 'Comparison & inference') })[id];
  const depositName = (id: typeof DEPOSITS[number]) => ({ marine: w('邻岸海底', 'Nearshore seafloor'), river: w('河漫滩', 'River floodplain'), peat: w('积水泥炭地', 'Waterlogged peatland') })[id];
  const burialName = (id: typeof BURIALS[number]) => ({ rapid: w('快速埋藏，特殊细节窗口', 'Rapid burial, exceptional detail window'), exposed: w('久露、腐解与风化', 'Long exposure, decay & weathering'), transported: w('搬运、磨损后埋藏', 'Transport & abrasion before burial') })[id];
  const sampleName = (id: typeof SAMPLES[number]) => ({ small: w('小范围采样', 'Small search'), wide: w('扩大同一地点采样', 'Wider search at the same site') })[id];
  const remainName = (id: RemainKind) => ({ shell: w('海生硬壳', 'Marine shell'), worm: w('海生软体', 'Marine soft body'), leaf: w('陆生叶片', 'Land leaf'), wood: w('陆生枝干', 'Land stem'), bone: w('陆生骨骼', 'Land bone'), insect: w('陆生昆虫', 'Land insect') })[id];
  const fateName = (id: string) => ({ 'source-gap': w('未进入此沉积', 'Did not reach deposit'), destroyed: w('未留下本模型可辨残体', 'No recognizable modeled remains'), uncollected: w('保存了，尚未采到', 'Preserved, not collected'), found: w('找到记录', 'Record found') })[id] ?? '';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let state = parseState(context.initialState), disposed = false, sceneLoading = false, sceneFailed = false, generation = 0;
  let scene: ReturnType<typeof import('./scene3d.ts')['createPlantScene']> | undefined;
  let animal: StudyInstance | undefined, animalLoading = false, animalFailed = false, animalGeneration = 0;
  let playback: FinitePlayback | undefined, visualFossilProgress = state.fossilProgress, fossilRecords: FossilRecord[] = [];
  let fossilColumn = (index: number) => 170 + index * 132, lastFossilStats = '', fossilDraws = 0;
  const fossilActors = new Map<string, { group: SVGGElement; damage: SVGGElement; marker: SVGGElement }>();
  const abort = new AbortController(), root = host.ownerDocument.createElement('section');
  root.className = 'earth-module life-study'; root.dataset.readerWorkbench = '';
  const find = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const text = (selector: string, value: string) => { find(selector).textContent = value; };
  const refs = (ids: string[]) => ids.map(id => { const r = DATA.references[id]; return `<li><a href="${escape(r.url)}" target="_blank" rel="noopener noreferrer">${escape(r.title)}</a><span>${escape(p(r.supports))}</span></li>`; }).join('');
  root.innerHTML = `
    <div class="life-workbenches" data-reader-menu="chapters" role="group" aria-label="${escape(w('观察工作台', 'Observation workbench'))}">${VIEWS.map(id => `<button type="button" data-view="${id}" aria-label="${escape(viewName(id))}">${escape(viewName(id))}</button>`).join('')}</div>
    <section data-panel="community" data-earth-presentation>
      <div class="life-community-heading" data-reader-prose><p class="life-eyebrow" data-age></p><h2 class="life-heading" data-reader-caption data-question></h2><p data-setting></p></div>
      <details class="life-choices" data-earth-choices><summary><span>${escape(w('群落与证据', 'Community & evidence'))}</span> · <strong data-current-community></strong></summary><div class="earth-controls" data-reader-controls><label>${escape(w('选择另一处时空', 'Choose another place and time'))}<select data-key="community">${COMMUNITIES.map(id => `<option value="${id}">${escape(p(communityById(id).title))}</option>`).join('')}</select></label><label>${escape(w('证据镜头', 'Evidence lens'))}<select data-key="lens">${LENSES.map(id => `<option value="${id}">${escape(lensName(id))}</option>`).join('')}</select></label></div><p class="earth-note">${escape(w('换群落会换到另一处时空；同一群落内换证据镜头保留生物身份与焦点。', 'Changing community visits another place and time. Evidence lenses preserve identities and focus within a community.'))}</p></details>
      <div class="life-phase-controls earth-controls" data-phases data-earth-transport role="group" aria-label="${escape(w('比较前后代表景', 'Compare representative snapshots'))}" data-reader-controls><button type="button" data-phase="0" data-before-label></button><button type="button" data-phase="1" data-after-label></button></div>
      <div class="life-field-grid"><div><figure class="life-figure"><div class="earth-stage life-community-stage" data-reader-stage data-earth-visual data-community-scene></div><figcaption class="life-caption" data-scene-caption data-reader-caption></figcaption></figure><div class="life-node-controls" data-earth-transport data-nodes role="group" aria-label="${escape(w('追踪一个对象', 'Track one object'))}" data-reader-actions></div><p class="life-lens-readout earth-readout" data-lens-note data-reader-readout></p></div>
        <article class="life-evidence" aria-live="polite" data-reader-prose><p class="life-eyebrow">${escape(w('追踪同一个对象', 'Follow the same object'))}</p><h3 data-focus-title></h3><p class="life-latin" data-latin></p><p class="life-status" data-node-status data-reader-readout></p><dl><div><dt>${escape(w('可核对的记录', 'Checkable record'))}</dt><dd data-record></dd></div><div><dt>${escape(w('从记录到解释', 'From record to interpretation'))}</dt><dd data-inference></dd></div><div><dt>${escape(w('不能补成确定事实', 'What cannot become certainty'))}</dt><dd data-node-uncertainty></dd></div></dl></article></div>
      <details class="earth-deeper" open><summary>${escape(w('这个生态网怎样运作？', 'How does this ecological web work?'))}</summary><p data-mechanism></p><p data-change></p><ul class="life-relationships" data-links></ul><p class="earth-note">${escape(w('箭头表示食物、材料、栖息空间或环境影响的方向；每条都有证据类型。它们不是亲缘连线，也不表示测得的通量。点选对象只强调与它相连的关系。', 'Arrows show food, material, habitat or environmental influence. Each has an evidence type. They are neither ancestry links nor measured fluxes. Selecting an object emphasizes its own connections.'))}</p></details>
      <details class="earth-deeper"><summary>${escape(w('分支，不是通向人类的梯子', 'Branches, not a ladder toward humans'))}</summary><div class="life-branching"><p>${escape(w('动物的众多分支中，本图只挑几支；折线长度不表示时间。三叶虫与脊椎动物不是前后升级关系。鸟位于恐龙内部；哺乳类在恐龙灭绝前已经存在。', 'Only a few animal branches are selected here; line lengths do not encode time. Trilobites do not upgrade into vertebrates. Birds belong within dinosaurs, and mammals existed before the extinction.'))}</p><div data-branch-diagram></div><p class="earth-note">${escape(w('植物、真菌、细菌与古菌还有各自的演化历史，未塞进这张动物分支图。不能把本馆七处时空当作祖先接力赛。', 'Plants, fungi, bacteria and archaea have their own histories, omitted from this animal sketch. The seven settings are not an ancestor relay.'))}</p></div></details>
      <details class="earth-deeper"><summary>${escape(w('复原边界与本景来源', 'Reconstruction limits & sources'))}</summary><p data-community-uncertainty></p><p class="earth-note" data-community-boundary></p><ul class="life-sources" data-community-sources></ul></details>
    </section>
    <section data-panel="fossils" data-earth-presentation hidden><p class="life-eyebrow">${escape(w('从生态群落到我们找到的记录', 'From living community to recovered record'))}</p><h2 class="life-heading" data-reader-caption>${escape(w('留下的少，就代表活着的少吗？', 'Does a sparse record mean sparse life?'))}</h2><p>${escape(w('固定海岸邻近的12份来源残体，不让它们随选择凭空换身份。依次改变进入哪种沉积、埋藏前发生什么、我们搜寻多大范围。', 'Hold 12 remains from adjacent coastal sources fixed. Change which deposit receives them, what happens before burial, and how widely we search. Their identities stay fixed.'))}</p>
      <details class="life-choices" data-earth-choices><summary>${escape(w('实验条件', 'Experiment conditions'))} · <strong data-fossil-conditions></strong></summary><div class="earth-controls life-filter-controls" data-reader-controls><label>${escape(w('沉积地点', 'Depositional setting'))}<select data-key="deposit">${DEPOSITS.map(id => `<option value="${id}">${escape(depositName(id))}</option>`).join('')}</select></label><label>${escape(w('埋藏过程', 'Burial pathway'))}<select data-key="burial">${BURIALS.map(id => `<option value="${id}">${escape(burialName(id))}</option>`).join('')}</select></label><label>${escape(w('采样范围', 'Search coverage'))}<select data-key="sample">${SAMPLES.map(id => `<option value="${id}">${escape(sampleName(id))}</option>`).join('')}</select></label></div></details>

      <div class="life-fossil-grid"><figure class="life-figure"><div class="earth-stage life-fossil-stage" data-reader-stage data-earth-visual data-fossil-scene></div><div class="life-fossil-player" data-fossil-player data-reader-transport data-earth-transport><div class="life-playback-actions" data-reader-actions><button type="button" data-playback-toggle></button><button type="button" data-playback-reset>${escape(w('回到来源', 'Return to source'))}</button><button type="button" data-fossil-back>${escape(w('上一站', 'Previous stage'))}</button><button type="button" data-fossil-next>${escape(w('下一站', 'Next stage'))}</button></div><label class="life-progress-label" data-reader-scrub><span>${escape(w('讲解进度', 'Explanation progress'))}</span><input type="range" data-playback-scrub min="0" max="100" step="1" aria-label="${escape(w('拖动保存与采样讲解进度', 'Scrub the preservation and sampling explanation'))}"><output data-fossil-progress aria-live="off"></output></label><div class="life-fossil-stops" role="group" aria-label="${escape(w('四站筛选过程', 'Four-stage filtering sequence'))}" data-reader-actions>${FOSSIL_STOPS.map((stop,index) => `<button type="button" data-fossil-stop="${stop}"><small>${index+1}</small>${escape([w('来源', 'Source'),w('进入沉积', 'Deposition'),w('留下残体', 'Preserved'),w('采到记录', 'Collection')][index])}</button>`).join('')}</div><p class="life-sr-only" data-fossil-announcement aria-live="polite" aria-atomic="true"></p></div><figcaption class="life-caption" data-reader-caption>${escape(w('每一行只有一份材料；圆点是过程参照。淡去的形态表示未留下本模型可辨残体，停在保留处的材料可能尚未采到。', 'Each row has one remain; dots mark stages. A faded shape means no recognizable modeled remains, while material waiting at preservation may not have been collected.'))}</figcaption><div class="life-fossil-key" data-reader-legend><span>› ${escape(w('未进入此沉积', 'Did not reach deposit'))}</span><span>× ${escape(w('失去可辨形态', 'Recognizable form lost'))}</span><span>− ${escape(w('保存但未采到', 'Preserved, not collected'))}</span></div></figure><div><div class="life-filter-result earth-readout" data-fossil-result aria-live="off" data-reader-readout></div><p class="life-fossil-current" data-fossil-current data-reader-caption></p><dl class="life-filter-ledger" data-fossil-ledger data-reader-readout></dl><p class="earth-note">${escape(w('进度与移动距离只安排讲解顺序，不表示真实腐解速率、搬运距离或地质时长。回拖是在重看同一份教学记录。十二份材料的计数不是自然丰度或保存概率；扩大采样也找不回未进入该地点或失去可辨形态的材料。', 'Progress and travel distance arrange the explanation; they do not measure decay, transport distance or geological duration. Scrubbing revisits the same teaching record. Counts are neither natural abundance nor preservation probabilities; wider collection cannot recover material that never arrived or lost recognizable form.'))}</p><div class="life-presets" data-reader-actions><button type="button" data-compare-burial>${escape(w('只对比快速埋藏 / 久露', 'Compare rapid burial / exposure'))}</button><button type="button" data-compare-sample>${escape(w('只对比小范围 / 扩大采样', 'Compare small / wider search'))}</button></div></div></div>
      <details class="earth-deeper" open><summary>${escape(w('三道不同的筛子', 'Three different filters'))}</summary><p>${escape(w('第一道是地点：本模型的近岸海底接受海生残体及部分漂来的枝叶，陆地地点不接受海生残体。第二道是保存：硬壳、骨、木质部分通常较耐久；本教学的特殊快速埋藏窗口也允许一些软体留下细节，现实中还需合适化学与成岩条件。积水泥炭地偏向保存陆生植物材料。第三道是采样：同一地点扩大搜索会包含原来的小样本，但仍不能消除前两道筛选。', 'The first filter is location: this nearshore deposit receives marine remains and some drifting foliage, whereas land deposits do not receive marine remains. The second is preservation: shell, bone and wood are usually more durable; this exceptional rapid-burial window also retains some soft detail, though real preservation additionally needs suitable chemistry and diagenesis. Waterlogged peat favors land-plant material. The third is collection: wider coverage includes the small search but cannot undo the earlier filters.'))}</p><p>${escape(w('软组织也可通过印痕、碳膜、矿物复制等特殊方式保存；“软”不等于永不保存。“未找到”可能来自地点、腐解、岩层缺失或采样，并不自动证明那个生物从未存在。只有把许多地点、时间和证据合在一起，才能更可靠地讨论生物消失。', 'Soft tissues may survive as impressions, carbon films or mineral replicas; soft does not mean never preserved. Absence can reflect location, decay, missing strata or sampling rather than absence of the organism. Multiple sites, ages and evidence types make extinction inferences stronger.'))}</p><ul class="life-sources">${refs(['taphonomy', 'decay'])}</ul></details>
    </section>
    <section data-panel="plants" data-earth-presentation hidden><p class="life-eyebrow">${escape(w('石炭纪形态，不是现代树木换标签', 'Carboniferous morphology, built from fossil clues'))}</p><h2 class="life-heading" data-reader-caption data-plant-title></h2><p class="life-observation" data-plant-observe data-reader-caption></p><details class="life-choices life-plant-choices" data-earth-choices><summary>${escape(w('形态与观察', 'Form & view'))} · <strong data-current-plant></strong></summary><div class="earth-controls" data-reader-controls><label>${escape(w('代表植物', 'Representative plant'))}<select data-key="plant">${PLANTS.map(id => `<option value="${id}">${escape(p(DATA.plants[id].title))}</option>`).join('')}</select></label><label>${escape(w('观察范围', 'Observation extent'))}<select data-key="detail"><option value="whole">${escape(w('整体构造 / 复叶片段', 'Architecture / compound frond'))}</option><option value="surface">${escape(w('形态细节', 'Morphological detail'))}</option></select></label><button type="button" data-reset-camera>${escape(w('恢复观察镜头', 'Reset camera'))}</button></div></details>
      <figure class="life-figure"><div class="life-three-wrap" data-reader-stage data-earth-visual data-reader-fit="natural"><div class="life-three-host" data-reader-stage data-reader-fit="available" data-three-host></div><div class="life-three-status" data-three-status role="status"></div></div><figcaption class="life-caption" data-reader-caption>${escape(w('可拖动旋转，滚轮缩放；键盘方向键与 + / − 也可操作，Home 恢复。原创程序复原，无实物扫描；局部观察会放大细节，模型没有实测长度标尺。', 'Drag to rotate; wheel to zoom. Arrow keys and + / − also work; Home resets. Original procedural reconstruction, without a specimen scan. Detail views enlarge features; no measured length scale is provided.'))}</figcaption></figure><button type="button" data-three-retry hidden>${escape(w('保留当前地址并重新载入3D', 'Reload 3D with the current URL'))}</button>
      <div class="life-plant-evidence" data-reader-prose><div><h3>${escape(w('形态依据', 'Morphological evidence'))}</h3><p data-plant-evidence></p></div><div><h3>${escape(w('补全与限制', 'Completion & limits'))}</h3><p data-plant-limits></p></div></div>
      <details class="earth-deeper" data-flat><summary>${escape(w('二维形态对照与来源', '2D morphology & sources'))}</summary><div class="life-flat-plant" data-flat-plant></div><p class="earth-note">${escape(w('二维、三维是同一类形态的解释图。即使3D无法显示，仍可核对叶座、节点和复叶分枝；艺术色彩不是化石鉴定特征。', 'The 2D and 3D images explain the same morphological forms. Leaf cushions, nodes and compound branching remain checkable without 3D. Artistic colors are not fossil identification traits.'))}</p><ul class="life-sources" data-plant-sources></ul></details>
    </section>
    <section data-panel="animal" hidden><p data-animal-load role="status">${escape(w('正在准备化石与动物复原工作台……', 'Preparing the fossil and animal reconstruction workbench…'))}</p><div data-animal-host></div><div data-animal-recovery hidden><p>${escape(w('工作台暂未加载。完整正文仍有形态、化石依据与来源可读。', 'The workbench did not load. The complete manuscript retains morphology, fossil evidence and sources.'))}</p><button type="button" data-animal-retry>${escape(w('保留当前地址并重新载入', 'Reload with the current URL'))}</button></div></section>`;
  host.append(root);

  function svg(body: string, label: string, width = 900, height = 500) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(label)}">${body}</svg>`;
  }
  function communityScene() {
    const c = communityById(state.community), focus = focusedNode(state);
    let body = `<defs><linearGradient id="life-water" x2="0" y2="1"><stop stop-color="#244e59"/><stop offset="1" stop-color="#122c35"/></linearGradient><linearGradient id="life-sky" x2="0" y2="1"><stop stop-color="#c6cbb5"/><stop offset="1" stop-color="#e0d8b4"/></linearGradient><linearGradient id="life-earth" x2="0" y2="1"><stop stop-color="#6a7351"/><stop offset="1" stop-color="#343f31"/></linearGradient></defs>`;
    if (c.theme === 'sea') {
      body += `<path d="M0 0H900V500H0Z" fill="url(#life-water)"/><path d="m0 370 170-28 210 34 210-17 310 37v104H0Z" fill="#657465"/><path d="m0 403 235-12 190 24 221-7 254 25v67H0Z" fill="#6b7260"/><path d="M0 446q290-20 540 5t360-2" stroke="#9e9c7b" fill="none" stroke-width="2" opacity=".4"/>`;
      for (let i = 0; i < 25; i++) body += `<path d="m${i*83%900} ${395+i*37%95} 8-2 9 2" stroke="#b0a78a" fill="none" opacity=".35"/>`;
      for (let i = 0; i < 140; i++) {
        const x = (i * 67.13) % 900, y = 380 + (i * 43.79) % 117;
        body += `<ellipse cx="${x}" cy="${y}" rx="${.65 + i % 4 * .48}" ry="${.3 + i % 3 * .18}" fill="${i % 3 ? '#b8b29a' : '#273d38'}" opacity="${.13 + i % 4 * .035}"/>`;
      }
      body += `<path d="M50 0 335 0 190 335 120 340Z M365 0 490 0 390 330 325 340Z" fill="#bfd7bf" opacity=".035"/>`;
      if (state.community === 'microbial') body += `<path d="M0 336q90-56 175-20l58 50 98 28H0Z" fill="#667955"/><path d="M0 337q74-43 169-20M0 348q74-41 183-20M0 360q86-36 193-17" fill="none" stroke="#a2a77a" stroke-width="2" opacity=".6"/>`;
    } else {
      body += `<path d="M0 0H900V500H0Z" fill="url(#life-sky)"/><path d="M0 277q190-80 430-18t470-13v254H0Z" fill="#9caa85"/><path d="M0 339q250-33 430 19t470-35v177H0Z" fill="url(#life-earth)"/>`;
      if (c.theme === 'forest') {
        for (let i = 0; i < 6; i++) body += `<g opacity=".21" transform="translate(${42+i*164} 220) scale(${.65+i%2*.2})">${icon(state.community === 'coal' ? (i%2 ? 'calamite' : 'lycopsid') : 'broadleaf')}</g>`;
        body += `<path d="M0 468q200-27 405-13t495-20v65H0Z" fill="#374b40"/><path d="M680 351q-130 29-61 63t281 40v46H535q76-61-25-93t170-56Z" fill="#748f87" opacity=".65"/>`;
      } else {
        body += `<path d="M0 432q220-12 410 8t490-15" fill="none" stroke="#b4a371" stroke-width="18" opacity=".25"/>`;
        for (let i = 0; i < 80; i++) body += `<path d="m${i*73%900} ${380+i*37%115} 3-10 4 8m-3-5 5-11" stroke="${i%2 ? '#a99f6b' : '#7c8754'}" stroke-width="1.5" fill="none"/>`;
      }
    }
    const links = visibleLinks(state), node = (id: string) => c.nodes.find(n => n.id === id)!;
    for (const link of links) {
      const a = node(link.from), b = node(link.to), highlighted = a.id === focus.id || b.id === focus.id;
      const midX = (a.x + b.x) / 2, midY = Math.min(a.y, b.y) - 38;
      const color = link.type === 'energy' ? '#cfb978' : link.type === 'habitat' ? '#9fc4b1' : '#aac4cb';
      const show = state.lens === 'reconstruction' || state.lens === link.support;
      const t = .6, ax = (1-t)**2*a.x+2*(1-t)*t*midX+t*t*b.x, ay = (1-t)**2*a.y+2*(1-t)*t*midY+t*t*b.y;
      const angle = Math.atan2(2*(1-t)*(midY-a.y)+2*t*(b.y-midY),2*(1-t)*(midX-a.x)+2*t*(b.x-midX))*180/Math.PI;
      body += `<g opacity="${show ? highlighted ? .88 : .25 : .07}"><path d="M${a.x} ${a.y}Q${midX} ${midY} ${b.x} ${b.y}" stroke="${color}" stroke-width="${highlighted?2.8:1.4}" stroke-dasharray="${link.support === 'inference' ? '7 5' : 'none'}" fill="none"/><path d="M-7-4 3 0-7 4Z" transform="translate(${ax} ${ay}) rotate(${angle})" fill="${color}"/></g>`;
    }
    const groundAt: Record<string, number> = { trilobite: 32, dickinsonia: 20, kimberella: 20, sponge: 41, coral: 34, brachiopod: 35, bivalve: 30, mat: 25, peat: 25, lycopsid: 100, calamite: 100, seedfern: 68, fungus: 30, broadleaf: 98, dinosaur: 45, mammal: 25, mammoth: 51, horse: 54, bison: 49, grass: 30, shrub: 32 };
    for (const n of c.nodes) {
      const lost = nodeStatus(state, n) === 'lost', reduced = nodeStatus(state, n) === 'reduced';
      const relevant = state.lens === 'reconstruction' || n.evidence.includes(state.lens as Exclude<Lens,'reconstruction'>);
      if (groundAt[n.icon] !== undefined && !lost) body += `<ellipse cx="${n.x}" cy="${n.y + groundAt[n.icon] * n.size}" rx="${(n.icon === 'mammoth' || n.icon === 'dinosaur' ? 67 : 38) * n.size}" ry="${5 * n.size}" fill="#152c27" opacity="${relevant ? .18 : .05}"/>`;
      body += `<g data-life-node="${n.id}" class="life-organism ${n.id===focus.id?'is-selected':''}" transform="translate(${n.x} ${n.y})" opacity="${lost?.22:relevant?(reduced?.62:1):.25}"><title>${escape(p(n.name))}</title>${n.id === focus.id ? `<ellipse rx="${n.icon==='anomalocaris'?150:95}" ry="${n.icon==='lycopsid'?165:82}" class="life-focus-ring"/>` : ''}<g transform="scale(${n.size})">${icon(n.icon)}</g>${lost?'<path d="m-26-26 52 52m0-52-52 52" stroke="#e6d1b0" stroke-width="3"/>':''}</g>`;
      // Numbers are anchors to external labels, never specimen abundance or scale.
      body += `<g transform="translate(${n.x+(n.icon==='anomalocaris'?120:55)} ${Math.max(30,n.y-65)})"><circle r="13" fill="#e8dec1" stroke="#465e50"/><text text-anchor="middle" y="5" font-size="14" fill="#2c433a">${c.nodes.indexOf(n)+1}</text></g>`;
    }
    find('[data-community-scene]').innerHTML = svg(body, `${p(c.title)}. ${p(c.boundary)}`);
  }
  function drawCommunity() {
    const c = communityById(state.community), n = focusedNode(state);
    text('[data-age]', c.phases && state.phase ? p(c.afterAge) : p(c.age)); text('[data-question]', p(c.question));
    text('[data-setting]', p(c.setting)); text('[data-current-community]', p(c.title));
    text('[data-scene-caption]', `${w('原创解释性复原，非化石照片；大小与数量不作统计。当前镜头', 'Original interpretive reconstruction, not a fossil photograph; sizes and counts are not data. Current lens')}: ${lensName(state.lens)}${state.community === 'ediacaran' ? w('。遗迹小图并列放大重复压痕与成对扇状刮痕；不是一块化石板的测绘，也不指定每条痕迹的唯一制造者。', '. The trace inset enlarges repeated impressions and paired fan scratches side by side; it is not a mapped fossil slab or a unique maker assignment for every trace.') : ''}`);
    find('[data-phases]').hidden = !c.phases;
    text('[data-before-label]', state.community === 'microbial' ? w('大气氧持续积累之前', 'Before sustained oxygen accumulation') : w('危机之前的代表景', 'Representative pre-crisis scene'));
    text('[data-after-label]', state.community === 'microbial' ? w('大氧化期间的环境', 'Conditions during oxygenation') : w('危机之后的代表景', 'Representative post-crisis scene'));
    root.querySelectorAll('[data-phase]').forEach(b => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.phase === String(state.phase))));
    communityScene();
    find('[data-nodes]').innerHTML = c.nodes.map((n,i) => `<button type="button" data-node="${n.id}" aria-pressed="${n.id===state.focus[state.community]}"><span>${i+1}</span> ${escape(p(n.name))}${nodeStatus(state,n)==='lost'?` · ${escape(w('支系终止','lineage ends'))}`:''}</button>`).join('');
    text('[data-focus-title]', p(n.name)); text('[data-latin]', n.latin); text('[data-record]', p(n.record)); text('[data-inference]', p(n.inference)); text('[data-node-uncertainty]', p(n.uncertainty));
    text('[data-node-status]', nodeStatus(state,n) === 'lost' ? w('此支系在危机中终止。虚影仅保留比较位置，不表示幸存。', 'This lineage ends in the crisis. Its ghost preserves a comparison position, not survival.') : nodeStatus(state,n) === 'reduced' ? w('后一个代表景仍有相关分支或功能，部分受到限制或损失；淡化不表示实测比例。', 'Related branches or functions persist in the later snapshot, with some restriction or losses; fading is not a measured fraction.') : w('当前代表景中的角色；不是一个个体跨越数百万年。', 'A role in this snapshot, not an individual crossing millions of years.'));
    const lensNotes = {
      reconstruction: w('把身体、环境和行为线索组合成现场：颜色、姿态与间距为艺术补全。点选一个编号，逐层核对它的依据。', 'A scene combines clues about bodies, environment and behavior. Colors, poses and spacing are artistic. Select a numbered object to check its evidence.'),
      body: w('亮起的是有身体或器官化石记录的对象。化石直接约束某些形态，不能让整张彩色复原变成观测照片；没亮起也不证明从未存在。', 'Highlighted objects have body or organ records. Fossils constrain some anatomy; they do not turn the colored reconstruction into an observation. Unhighlighted does not mean absent.'),
      trace: w('亮起的是与遗迹记录有关的对象。遗迹记录活动或底面变化，不总能唯一认出制造者；身体与遗迹必须交叉对比。', 'Highlights mark associations with trace records. Traces record activity or substrate change, not always a unique maker; compare them with body evidence.'),
      chemistry: w('化学证据可约束氧化还原、食物或生物来源等问题；通常不能独自还原一个物种的形状。点状“资源”与气泡仍是示意。', 'Chemical evidence constrains redox conditions, diet or biological sources; it usually cannot reconstruct a species’ shape alone. Resource dots and bubbles remain symbols.'),
      inference: w('虚线联系来自形态功能、现代对照或模型等推断。推断可以有强证据，但不是古海洋或古森林中直接拍到的行为。', 'Dashed links express inference from functional anatomy, living comparisons or models. Inference can be strongly supported without directly filmed ancient behavior.'),
    };
    text('[data-lens-note]', lensNotes[state.lens]); text('[data-mechanism]', p(c.mechanism)); text('[data-change]', p(c.change));
    const links = visibleLinks(state).filter(l => l.from === n.id || l.to === n.id);
    find('[data-links]').innerHTML = links.length ? links.map(l => `<li><strong>${escape(p(l.label))}</strong><small>${escape(lensName(l.support))}</small><p>${escape(p(l.caveat))}</p></li>`).join('') : `<li>${escape(w('当前前后景中，与此角色相连的代表性联系已经断开；这不代表整个生态系统没有其他联系。', 'This role’s illustrated links are absent in this snapshot; the wider ecosystem still has other relationships.'))}</li>`;
    text('[data-community-uncertainty]', p(c.uncertainty)); text('[data-community-boundary]', p(c.boundary)); find('[data-community-sources]').innerHTML = refs(c.refs);
  }
  function drawFossils() {
    fossilRecords = fossilExperiment(state); lastFossilStats = ''; fossilActors.clear();
    const labels = [w('来源', 'Source'), w('到达', 'Arrives'), w('保留', 'Retained'), w('找到', 'Found')];
    const narrow = innerWidth < 650, width = narrow ? 420 : 650, column = (i: number) => narrow ? 115+i*90 : 170+i*132;
    fossilColumn = column;
    const compact = (id: RemainKind) => ({ shell: w('海壳', 'Shell'), worm: w('海软体', 'Soft body'), leaf: w('叶片', 'Leaf'), wood: w('枝干', 'Stem'), bone: w('骨骼', 'Bone'), insect: w('昆虫', 'Insect') })[id];
    let body = `<defs><linearGradient id="life-fossil-paper" x2="0" y2="1"><stop stop-color="#f3efdf"/><stop offset="1" stop-color="#e7e4d1"/></linearGradient></defs><path d="M0 0h${width}v570H0Z" fill="url(#life-fossil-paper)"/>`;
    labels.forEach((label,i) => { body += `<rect x="${column(i)-(narrow?25:31)}" y="43" width="${narrow?50:62}" height="508" rx="18" fill="${['#bbc6a4','#a6c3bc','#c5b695','#9db89d'][i]}" opacity=".18"/><text x="${column(i)}" y="27" text-anchor="middle" fill="#344b41" font-size="16">${escape(label)}</text>`; });
    for (const [i, r] of fossilRecords.entries()) {
      const y = 68+i*41;
      body += `<g data-remain-id="${r.remain.id}"><text x="${narrow?7:10}" y="${y+5}" fill="#586555" font-size="${narrow?16:13}">${escape(narrow?compact(r.remain.kind):remainName(r.remain.kind))} ${r.remain.id.endsWith('1')?'A':'B'}</text>`;
      for (let col = 0; col < 4; col++) {
        const x = column(col);
        if (col) body += `<path d="M${column(col-1)+22} ${y}h${narrow?46:88}" fill="none" stroke="#adae95" stroke-width="1.2" stroke-dasharray="2 4" opacity=".65"/>`;
        body += `<circle cx="${x}" cy="${y}" r="${col?3:2}" fill="#9da88d" opacity=".5"/>`;
      }
      body += `<g data-token="${r.remain.id}" transform="translate(${column(0)} ${y})"><g transform="scale(${narrow?.38:.35})">${icon(r.remain.kind)}<g data-token-damage opacity="0"><path d="m-32-23 61 45m-45-25 31 25" stroke="#eae6d5" stroke-width="7"/><path d="m-42 18-10 5m83-15 9 5m-26 20 5 4" stroke="#9b967e" stroke-width="2"/></g></g></g><g data-token-marker="${r.remain.id}" opacity="0"><circle r="18" fill="none" stroke="#8b7250" stroke-width="1.2" stroke-dasharray="2 3"/><path d="m-5-5 10 10m0-10-10 10" stroke="#8b7250" stroke-width="1.4"/></g><title>${escape(`${r.remain.id}: ${remainName(r.remain.kind)}`)}</title></g>`;
    }
    find('[data-fossil-scene]').innerHTML = svg(body, w('十二份固定身份残体依次经过沉积地点、保存过程和采样筛选。', 'Twelve fixed remains pass through depositional, preservation and collection filters.'),width,570);
    for (const r of fossilRecords) {
      const group = root.querySelector<SVGGElement>(`[data-token="${r.remain.id}"]`)!;
      fossilActors.set(r.remain.id, { group, damage: group.querySelector<SVGGElement>('[data-token-damage]')!, marker: root.querySelector<SVGGElement>(`[data-token-marker="${r.remain.id}"]`)! });
    }
    const shortDeposit = { marine: w('近岸海底', 'Nearshore'), river: w('河漫滩', 'Floodplain'), peat: w('积水泥炭地', 'Peatland') }[state.deposit];
    const shortBurial = { rapid: w('快速埋藏', 'Rapid burial'), exposed: w('久露腐解', 'Long exposure'), transported: w('搬运磨损', 'Transport / abrasion') }[state.burial];
    const shortSample = state.sample === 'small' ? w('小范围采样', 'Small search') : w('扩大采样', 'Wider search');
    text('[data-fossil-conditions]', `${shortDeposit} · ${shortBurial} · ${shortSample}`);
    updateFossilFrame(); updatePlaybackControls(); playback?.sync();
  }
  function updateFossilFrame() {
    if (disposed || state.view !== 'fossils') return;
    const frame = fossilTimeline(fossilRecords, visualFossilProgress), counts = fossilSummary(fossilRecords);
    find('[data-fossil-scene]').dataset.fossilDraws = String(++fossilDraws);
    for (const [i, token] of frame.tokens.entries()) {
      const actor = fossilActors.get(token.id); if (!actor) continue;
      const x = fossilColumn(0) + token.column * (fossilColumn(1)-fossilColumn(0)), y = 68+i*41;
      actor.group.setAttribute('transform', `translate(${x.toFixed(2)} ${y})`);
      actor.group.setAttribute('opacity', String(token.opacity)); actor.group.dataset.fate = token.assessed ? token.fate : 'pending';
      actor.damage.setAttribute('opacity', String(token.damage));
      actor.marker.setAttribute('transform', `translate(${x.toFixed(2)} ${y})`);
      actor.marker.setAttribute('opacity', String(token.assessed && token.fate !== 'found' ? .72 : 0));
      actor.marker.dataset.fate = token.assessed ? token.fate : 'pending';
      const mark = actor.marker.querySelector('path')!;
      mark.setAttribute('d', token.fate === 'uncollected' ? 'M-5 0H5' : token.fate === 'source-gap' ? 'm-5-4 8 4-8 4' : 'm-5-5 10 10m0-10-10 10');
    }
    const stageNames = [w('来源就位', 'Sources ready'), w('进入沉积', 'Deposited'), w('留下可辨残体', 'Recognizable remains'), w('采到记录', 'Records collected')];
    find<HTMLButtonElement>('[data-fossil-back]').disabled = visualFossilProgress <= 0;
    find<HTMLButtonElement>('[data-fossil-next]').disabled = visualFossilProgress >= 100;
    find<HTMLButtonElement>('[data-playback-reset]').disabled = visualFossilProgress <= 0;
    find<HTMLInputElement>('[data-playback-scrub]').value = String(state.fossilProgress);
    text('[data-fossil-progress]', `${state.fossilProgress}%`);
    find<HTMLInputElement>('[data-playback-scrub]').setAttribute('aria-valuetext', `${stageNames[frame.stage]} · ${state.fossilProgress}%`);
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-fossil-stop]')) button.setAttribute('aria-pressed', String(Number(button.dataset.fossilStop) === FOSSIL_STOPS[frame.stage]));
    const signature = `${frame.stage}:${state.deposit}:${state.burial}:${state.sample}`;
    if (signature !== lastFossilStats) {
      lastFossilStats = signature;
      const amount = [12, frame.arrived, frame.retained, frame.found][frame.stage]!;
      find('[data-fossil-result]').innerHTML = `<strong>${amount} / 12</strong><span>${escape(stageNames[frame.stage])}</span><p>${escape(frame.stage === 3 ? w('找到的是经过筛选的记录。', 'Recovered records have passed through several filters.') : w('尚未走完后续筛选，终点计数暂不揭晓。', 'Later filters are still ahead; the final count is not yet revealed.'))}</p>`;
      const messages = [
        w('同一批海陆来源材料已就位。先看哪些进入这个沉积地点，再看能否留下可辨残体。', 'The same coastal source material is ready. First check which items enter this deposit, then whether recognizable remains persist.'),
        w('没有进入该地点的材料停在来源处。进入这里并不保证保存，下一道筛子处理的是腐解、风化或搬运后的可辨形态。', 'Material that does not reach this site stays at its source. Arrival does not ensure preservation; the next filter concerns recognizable form after decay, weathering or transport.'),
        w('只留下可辨残体的材料继续到采样阶段。淡去的虚影保留身份；保存下来的材料也还可能没有被采到。', 'Recognizable remains continue toward collection. Faded ghosts preserve identity; even preserved material may remain uncollected.'),
        w('停在“保留”一站的材料仍在地层中，只是本次没采到。扩大同一地点采样可增加记录，但不会消除更早的筛选。', 'Material waiting at preservation remains in the deposit but was missed by this search. Wider coverage may add records without undoing earlier filters.'),
      ];
      text('[data-fossil-current]', messages[frame.stage]);
      find('[data-fossil-ledger]').innerHTML = Object.entries(counts).map(([fate,count]) => {
        const known = fate === 'source-gap' ? frame.stage >= 1 : fate === 'destroyed' ? frame.stage >= 2 : frame.stage >= 3;
        return `<div><dt>${escape(fateName(fate))}</dt><dd>${known?count:w('待观察','Pending')}</dd></div>`;
      }).join('');
    }
  }
  function updatePlaybackControls() {
    const playing = playback?.isPlaying() ?? false;
    const button = find<HTMLButtonElement>('[data-playback-toggle]');
    if (button.getAttribute('aria-pressed') !== String(playing)) button.setAttribute('aria-pressed', String(playing));
    const label = playing ? w('暂停筛选', 'Pause filtering') : state.fossilProgress >= 100 ? w('重新播放', 'Replay sequence') : w('播放筛选过程', 'Play filtering sequence');
    if (button.textContent !== label) button.textContent = label;
    find('[data-fossil-announcement]').setAttribute('aria-live', playing ? 'off' : 'polite');
  }
  function announceFossil() {
    if (state.view !== 'fossils') return;
    const result = find('[data-fossil-result]');
    const line = `${result.querySelector('span')?.textContent ?? ''}: ${result.querySelector('strong')?.textContent ?? ''}.`;
    if (find('[data-fossil-announcement]').textContent !== line) text('[data-fossil-announcement]', line);
  }
  function destroyScene() { ++generation; sceneLoading = false; scene?.dispose(); scene = undefined; find('[data-three-host]').replaceChildren(); }
  function destroyAnimal() { ++animalGeneration; animalLoading = false; animal?.dispose(); animal = undefined; find('[data-animal-host]').replaceChildren(); }
  function ensureAnimal() {
    if (animal || animalLoading || animalFailed) return;
    const ticket = ++animalGeneration; animalLoading = true; find('[data-animal-load]').hidden = false;
    void import('./burgess/study.ts').then(module => {
      if (disposed || ticket !== animalGeneration || state.view !== 'animal') return;
      animal = module.mountBurgess(find('[data-animal-host]'), { language: context.language, initial: state.animal,
        onStateChange(next) { if (disposed || ticket !== animalGeneration) return; state.animal = next; context.onStateChange(serializeState(state)); } });
      find('[data-animal-load]').hidden = true;
    }).catch(() => {
      if (disposed || ticket !== animalGeneration) return;
      animalFailed = true; find('[data-animal-load]').hidden = true; find('[data-animal-recovery]').hidden = false;
    }).finally(() => { if (ticket === animalGeneration) animalLoading = false; });
  }
  function ensureScene() {
    if (scene) { scene.update(state.plant, state.detail); scene.resume(); return; }
    if (sceneLoading || sceneFailed) return;
    const ticket = ++generation; sceneLoading = true; find('[data-three-status]').hidden = false;
    text('[data-three-status]', w('正在准备植物形态……', 'Preparing plant morphology…'));
    const unavailable = () => {
      if (disposed || ticket !== generation) return;
      sceneFailed = true; find('[data-three-status]').hidden = false; find('[data-three-retry]').hidden = false; find<HTMLDetailsElement>('[data-flat]').open = true;
      text('[data-three-status]', w('本次3D未能显示。下方二维形态、证据与其他实验仍可使用。', '3D is unavailable in this session. The 2D morphology, evidence and other experiments remain usable.'));
    };
    void import('./scene3d.ts').then(module => {
      if (disposed || ticket !== generation || state.view !== 'plants') return;
      scene = module.createPlantScene(find('[data-three-host]'), { plant: state.plant, detail: state.detail,
        label: w('石炭纪代表植物的原创程序形态复原，可旋转；非扫描，没有实测长度标尺。', 'Rotatable original procedural reconstruction of representative Carboniferous plant morphology; not a scan and without a measured length scale.'), onUnavailable: unavailable });
      if (!sceneFailed) find('[data-three-status]').hidden = true;
    }).catch(unavailable).finally(() => { if (ticket === generation) sceneLoading = false; });
  }
  function drawPlants() {
    const plant = DATA.plants[state.plant];
    text('[data-plant-title]', p(plant.title)); text('[data-current-plant]', p(plant.title)); text('[data-plant-observe]', p(plant.observation));
    text('[data-plant-evidence]', p(plant.evidence)); text('[data-plant-limits]', p(plant.uncertainty));
    find('[data-plant-sources]').innerHTML = refs(plant.refs);
    find('[data-flat-plant]').innerHTML = svg(`<path d="M0 0H400V360H0Z" fill="#e8e9d8"/><g transform="translate(200 175) scale(${state.plant==='seedfern'?1.7:1.45})">${icon(state.plant)}</g>`, p(plant.observation),400,360);
    ensureScene();
  }
  function drawBranch() {
    find('[data-branch-diagram]').innerHTML = `<ul class="life-tree"><li>${escape(w('动物：只展示少数分支', 'Animals: selected branches only'))}<ul><li>${escape(w('节肢动物分支', 'Arthropod branches'))}<ul><li>${escape(w('三叶虫：支系终止 ×', 'Trilobites: lineage ends ×'))}</li><li>${escape(w('其他节肢动物分支继续…', 'Other arthropod branches continue…'))}</li></ul></li><li>${escape(w('脊索动物的部分分支', 'Some chordate branches'))}<ul><li>${escape(w('哺乳动物分支', 'Mammal branches'))}</li><li>${escape(w('恐龙内部的分支', 'Branches within dinosaurs'))}<ul><li>${escape(w('非鸟恐龙：多个分支终止 ×', 'Non-avian dinosaurs: branches end ×'))}</li><li>${escape(w('鸟：部分谱系继续 →', 'Birds: some lineages continue →'))}</li></ul></li></ul></li></ul></li></ul>`;
  }
  function render(emit = true) {
    if (disposed) return;
    root.dataset.view = state.view;
    for (const panel of root.querySelectorAll<HTMLElement>('[data-panel]')) panel.hidden = panel.dataset.panel !== state.view;
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
    for (const input of root.querySelectorAll<HTMLSelectElement>('[data-key]')) input.value = String(state[input.dataset.key as keyof typeof state]);
    if (state.view !== 'fossils') playback?.pause();
    if (state.view === 'community') drawCommunity();
    if (state.view === 'fossils') drawFossils();
    if (state.view === 'plants') drawPlants(); else if (scene || sceneLoading) destroyScene();
    if (state.view === 'animal') ensureAnimal(); else if (animal || animalLoading) destroyAnimal();
    if (emit) context.onStateChange(serializeState(state));
  }
  root.addEventListener('click', event => {
    if (disposed || !(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLElement>('button,[data-life-node]');
    if (!target) return;
    if (target.hasAttribute('data-playback-toggle')) { playback?.toggle(); updatePlaybackControls(); return; }
    if (target.hasAttribute('data-playback-reset')) { playback?.reset(); return; }
    if (target.hasAttribute('data-fossil-back')) { playback?.setProgress(([...FOSSIL_STOPS].reverse().find(stop => stop < visualFossilProgress-1e-5) ?? 0)/100); return; }
    if (target.hasAttribute('data-fossil-next')) { playback?.setProgress((FOSSIL_STOPS.find(stop => stop > visualFossilProgress+1e-5) ?? 100)/100); return; }
    if (target.dataset.fossilStop !== undefined) { playback?.setProgress(Number(target.dataset.fossilStop)/100); return; }
    if (target.dataset.view && VIEWS.includes(target.dataset.view as typeof VIEWS[number])) { playback?.pause(); state.view = target.dataset.view as typeof VIEWS[number]; }
    const id = target.dataset.node ?? target.dataset.lifeNode;
    if (id && communityById(state.community).nodes.some(n => n.id === id)) state.focus[state.community] = id;
    if (target.dataset.phase === '0' || target.dataset.phase === '1') state.phase = target.dataset.phase === '1' ? 1 : 0;
    if (target.hasAttribute('data-reset-camera')) scene?.resetCamera();
    if (target.hasAttribute('data-three-retry')) { location.reload(); return; }
    if (target.hasAttribute('data-animal-retry')) { location.reload(); return; }
    if (target.hasAttribute('data-compare-burial')) { playback?.pause(); state.burial = state.burial === 'rapid' ? 'exposed' : 'rapid'; }
    if (target.hasAttribute('data-compare-sample')) { playback?.pause(); state.sample = state.sample === 'small' ? 'wide' : 'small'; }
    render();
  }, { signal: abort.signal });
  root.addEventListener('input', event => {
    if (disposed || !(event.target instanceof HTMLInputElement) || !event.target.hasAttribute('data-playback-scrub')) return;
    playback?.setProgress(Number(event.target.value)/100);
  }, { signal: abort.signal });
  root.addEventListener('change', event => {
    if (disposed || !(event.target instanceof HTMLSelectElement) || !event.target.dataset.key) return;
    playback?.pause(); state = parseState({ ...serializeState(state), [event.target.dataset.key]: event.target.value });
    visualFossilProgress = state.fossilProgress; render();
  }, { signal: abort.signal });
  root.ownerDocument.addEventListener('visibilitychange', () => { if (!root.ownerDocument.hidden && state.view === 'plants') scene?.resume(); }, { signal: abort.signal });
  playback = createFinitePlayback({ element: find('[data-fossil-player]'), id: 'life-fossil-filters', durationMs: 9000,
    readProgress: () => visualFossilProgress/100, visibilityTarget: find('[data-fossil-scene]'), frameIntervalMs: 40, reducedMotionSteps: 3,
    writeProgress(fraction) {
      if (disposed) return;
      visualFossilProgress = reducedMotion.matches ? Math.round(fraction*100) : fraction*100; state.fossilProgress = Math.round(visualFossilProgress);
      updateFossilFrame(); updatePlaybackControls(); if (!playback?.isPlaying()) announceFossil(); context.onStateChange(serializeState(state));
    },
    onPlayingChange(playing) {
      if (disposed) return;
      updatePlaybackControls(); if (playing) text('[data-fossil-announcement]', ''); else announceFossil();
      context.onStateChange(serializeState(state));
    },
  });
  drawBranch(); render();
  return { pause() { playback?.pause(); scene?.pause(); animal?.pause(); }, dispose() { if (disposed) return; disposed = true; playback?.dispose(); abort.abort(); fossilActors.clear(); destroyScene(); destroyAnimal(); root.remove(); } };
}
