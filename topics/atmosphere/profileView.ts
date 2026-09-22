import { journeyFrame, worlds, type Settings, type World } from './model.ts';
import type content from './content.json';

type Text = typeof content.zh;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const path = (d: string, color: string, width = 3) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const arrow = (d: string, x: number, y: number, color: string, rotate = 0) => path(d,color)+`<path d="M-7 -5 0 0 -7 5" transform="translate(${x} ${y}) rotate(${rotate})" fill="none" stroke="${color}" stroke-width="3"/>`;
const cloud = (x: number, y: number, scale=1, color='#eef7fa') => `<g transform="translate(${x} ${y}) scale(${scale})" fill="${color}"><path d="M-51 10 C-74 5 -67 -18 -46 -18 C-46 -45 -10 -50 2 -25 C24 -44 49 -25 44 -10 C72 -6 66 17 44 18 L-40 18Z"/><path d="M-47 12 Q0 25 46 13" fill="none" stroke="#6b8da3" stroke-opacity=".35" stroke-width="5"/></g>`;
const drops = (color='#bceaff', bottom=153) => Array.from({length:10},(_,i)=>{const x=135+(i%5)*13,y=105+Math.floor(i/5)*25;return path(`M${x} ${y} l-5 ${Math.min(13,bottom-y)}`,color,2)}).join('');
const particles = (count:number,color='#c6e4ed') => Array.from({length:count},(_,i)=>`<circle cx="${20+(i*79%265)}" cy="${18+(i*43%126)}" r="${i%3===0?2:1}" fill="${color}" opacity=".6"/>`).join('');
const ground = (world:World) => world==='earth' ? `<path d="M0 115 Q55 102 110 115 T300 115 V170H0Z" fill="#448ca4"/><path d="M130 170V134L185 104 209 122 239 82 300 129V170Z" fill="#456f5a"/><path d="M223 103 239 82 252 99 241 96 233 105" fill="#d4e3db"/><path d="M186 137V107m-8 14 8-20 8 20m-16 7 8-20 8 20" stroke="#244c3f" fill="#244c3f" stroke-width="3"/><circle cx="159" cy="135" r="4" fill="#ffe7aa"/>${path('M159 140v12m-6-9 6 2 6-2m-6 9-5 8m5-8 5 8','#ffe7aa',2)}${path('M20 129h42m-19 14h47m-72 9h22','#9fd4df',2)}` : `<path d="M0 130 37 114 63 128 114 91 154 115 200 103 245 127 300 116V170H0Z" fill="${world==='venus'?'#9d633c':world==='mars'?'#995b4b':'#81714c'}"/><path d="M0 153Q100 130 190 150T300 146V170H0Z" fill="${world==='venus'?'#c28c4f':world==='mars'?'#bf7855':'#a79365'}"/>${world==='titan'?'<ellipse cx="174" cy="150" rx="70" ry="12" fill="#394d4c"/><path d="M50 138Q95 157 120 148" fill="none" stroke="#394d4c" stroke-width="5"/>':''}`;
function art(kind:string) {
 let body='';
 switch(kind) {
 case 'vacuum':body=`<circle cx="82" cy="39" r="1.6" fill="#d2dce7" opacity=".65"/><circle cx="247" cy="128" r="1" fill="#d2dce7" opacity=".4"/>`;break;
 case 'exosphere':body=`<circle cx="51" cy="118" r="1.5" fill="#d2dce7" opacity=".6"/><circle cx="179" cy="47" r="1.5" fill="#d2dce7" opacity=".5"/><circle cx="258" cy="96" r="1" fill="#d2dce7" opacity=".3"/>`;break;
 case 'sunlight':body=`<circle cx="237" cy="30" r="10" fill="#fff4d0"/>`+path('M219 46 172 103m58-49-27 57m43-58-8 64','#ffe2a0',1);break;
 case 'moon':case 'mercury':body=`<path d="M0 104 37 97 66 108 104 94 133 111 179 95 217 104 261 90 300 105V170H0Z" fill="${kind==='moon'?'#aaa9a5':'#a79788'}"/><path d="M0 144q49-29 94 2t103-2t103-4v30H0Z" fill="${kind==='moon'?'#7e7e7b':'#827365'}"/>`+[ [73,134,32],[221,123,25],[167,158,15] ].map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.31}" fill="#494b4c"/><path d="M${x-r} ${y}a${r} ${r*.31} 0 0 1 ${r*2} 0" fill="none" stroke="#d0c9bd" stroke-width="3"/>`).join('');break;
 case 'weather':body=cloud(85,46,.48)+cloud(184,63,.77)+path('M25 21q25-15 57-6m-41 9q25-14 56-6','#f4f9fd',3)+drops()+arrow('M47 139C19 114 29 85 52 76',52,76,'#ffcc91',-25)+arrow('M240 59C275 74 278 118 247 134',247,134,'#a5dbff',150)+arrow('M23 156H105',105,156,'#dceef5');break;
 case 'ozone':body=`<ellipse cx="150" cy="58" rx="138" ry="29" fill="#ac90ce" opacity=".24"/>`+Array.from({length:8},(_,i)=>`<g fill="#dfc3ef" opacity=".7"><circle cx="${25+i*35}" cy="62" r="3"/><circle cx="${30+i*35}" cy="56" r="3"/><circle cx="${35+i*35}" cy="62" r="3"/></g>`).join('')+arrow('M80 6l-8 12 9 11-8 12 9 11',82,52,'#d9afff',65)+arrow('M196 6l-8 12 9 11-8 12 9 11',198,52,'#d9afff',65)+arrow('M24 103Q106 91 152 104T276 103',276,103,'#d9eaf1')+arrow('M40 137H244',244,137,'#b0d4e9');break;
 case 'polar-cloud':body=Array.from({length:7},(_,i)=>path(`M35 ${40+i*13}q65-27 117-2t105-5`,['#ead0ee','#bcd9f1','#f0dbc1'][i%3],5)).join('');break;
 case 'night-cloud':body=Array.from({length:10},(_,i)=>path(`M20 ${40+i*9}q40-20 76-5t72 0t100-7`,'#bcdcee',2)).join('');break;
 case 'space':body=particles(9)+arrow('M88 131q-4-47 38-82',126,49,'#cfdfed',-50)+arrow('M205 129q18-31 15-68',220,61,'#a9c8e2',-90);break;
 case 'venus-cloud':body=cloud(90,56,1.1,'#ead3a0')+cloud(215,83,1.35,'#dac28f')+arrow('M25 30H251',251,30,'#fff0cd')+arrow('M43 136H278',278,136,'#fff0cd');break;
 case 'venus-air':body=particles(95,'#ffdca2')+path('M64 144q-15-21 0-39t0-39m86 83q-15-21 0-39t0-39m86 83q-15-21 0-39t0-39','#efb978',2);break;
 case 'mars-cloud':body=path('M50 76q41-18 86-5m-67 19q69-19 152-6m-49 18q26-13 65-9','#dcecf3',5)+particles(9);break;
 case 'mars-air':body=cloud(190,43,.65,'#dce7ed')+Array.from({length:24},(_,i)=>`<circle cx="${30+i*11%255}" cy="${105+i*17%45}" r="2" fill="#d8a57b"/>`).join('')+arrow('M22 135Q97 75 149 118T275 115',275,115,'#e4b98d');break;
 case 'titan-haze':body=Array.from({length:8},(_,i)=>path(`M10 ${30+i*15}q78-17 145 0t140 0`,'#e4b66e',8)).join('')+particles(40,'#ffdca2');break;
 case 'titan-air':body=cloud(140,56,.95,'#f5dfb2')+drops('#f8dfae')+arrow('M20 95Q45 63 56 43',56,43,'#f5cf8b',-70);break;
 default:body=ground(kind as World);
 }
 return `<svg viewBox="0 0 300 170" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Qualitative, topic-owned illustrated columns. No atmospheric state is solved here.
 * DOM text remains readable and accessible at narrow widths; artwork has no hidden clock. */
export class AtmosphereProfiles {
 private key='';
 constructor(private root:HTMLElement,private text:Text,private notes?:HTMLElement) {}
 draw(s:Settings,labels:boolean) {
  this.root.classList.toggle('hide-profile-labels',!labels);
  const frame=journeyFrame(s.journey), key=s.view+':'+s.world+':'+frame.phase+':'+frame.layer;
  if(key===this.key)return;
  this.key=key;
  if(this.notes){this.notes.hidden=s.view!=='worlds';this.notes.innerHTML=s.view==='worlds'?this.text.worlds.earth.column.map((row,i)=>`<details class="world-note"><summary>${escape(row.title)} / ${escape(this.text.worlds[s.world].column[i]!.title)}</summary><p><strong>${escape(this.text.worlds.earth.name)}</strong> · ${escape(row.body)}</p><p><strong>${escape(this.text.worlds[s.world].name)}</strong> · ${escape(this.text.worlds[s.world].column[i]!.body)}</p></details>`).join(''):'';}
  this.root.innerHTML=s.view==='worlds'?this.comparison(s.world):frame.phase==='ascent'?this.layerEnrichment(frame.layer):'';
 }
 private layerEnrichment(layer:number){
  if(layer===3)return this.energyExplanation();
  if(layer===1||layer===2)return `<section class="high-clouds"><h3>${escape(this.text.diagram.rare)}</h3><div>${this.text.highClouds.map((c,i)=>`<article>${art(i===0?'polar-cloud':'night-cloud')}<h4>${escape(c.name)}</h4><p>${escape(c.body)}</p></article>`).join('')}</div></section>`;
  return '';
 }
 private energyExplanation(){
  const energy=this.text.energy;
  const target=(x:number,y:number,lit=false)=>`<circle cx="${x}" cy="${y}" r="10" fill="${lit?'#9aefc3':'#173449'}" stroke="${lit?'#cdffe5':'#9ccde2'}" stroke-width="2"/>`;
  const drawings=[
   arrow('M18 50H96',96,50,'#f5d49a',0)+target(128,50)+path('M40 45l10 10m0-10L40 55','#ffe2ae',2),
   target(92,50,true)+`<circle cx="92" cy="50" r="23" fill="none" stroke="#9aefc3" stroke-width="1" stroke-dasharray="2 5"/>`+arrow('M18 50H76',76,50,'#f5d49a',0),
   target(51,50)+path('M66 50q6-13 12 0t12 0t12 0t12 0t12 0','#a0f3c8',2)+`<path d="M124 45l7 5-7 5" stroke="#a0f3c8" fill="none" stroke-width="2"/>`
  ];
  return `<section class="energy-explanation"><h3>${escape(energy.title)}</h3><p>${escape(energy.intro)}</p><ol>${energy.steps.map((step,i)=>`<li><svg viewBox="0 0 164 100" aria-hidden="true">${drawings[i]}</svg><strong>${i+1}. ${escape(step.title)}</strong><span>${escape(step.body)}</span></li>`).join('')}</ol><p class="energy-key">${escape(energy.key)}</p></section>`;
 }
 private comparison(world:World){
  return `<div class="paired-profiles">${this.column('earth','left')}${this.column(world,'right')}</div>`;
 }
 private column(world:World,side:string){
  const w=this.text.worlds[world],values=worlds[world];
  const kinds={earth:['space','ozone','weather','earth'],venus:['space','venus-cloud','venus-air','venus'],mars:['space','mars-cloud','mars-air','mars'],titan:['space','titan-haze','titan-air','titan'],moon:['vacuum','exosphere','sunlight','moon'],mercury:['vacuum','exosphere','sunlight','mercury']}[world];
  return `<section class="world-column world-${world}" data-side="${side}" data-world="${world}"><header><h2>${escape(w.name)}</h2><p>${escape(w.composition)}</p></header>${w.column.map((row,i)=>`<div class="world-band world-band-${i}"><div class="world-art">${art(kinds[i])}</div><div class="world-words"><h3>${escape(row.title)}</h3><p>${escape(row.body)}</p></div></div>`).join('')}<footer><strong>${values.pressure===null?escape(w.pressureNote):values.pressure.toLocaleString()+' hPa'}</strong><span>${values.temperature===null?escape(w.temperatureNote):values.temperature+' °C'}</span></footer></section>`;
 }
 dispose(){this.root.replaceChildren();}
}
