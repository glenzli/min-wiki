import { journeyFrame, worlds, type Settings, type World } from './model.ts';
import type content from './content.json';

type Text = typeof content.zh;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const path = (d: string, color: string, width = 3) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const arrow = (d: string, x: number, y: number, color: string, rotate = 0) => path(d,color)+`<path d="M-7 -5 0 0 -7 5" transform="translate(${x} ${y}) rotate(${rotate})" fill="none" stroke="${color}" stroke-width="3"/>`;
// The upper-left light and softer underside make these small clouds read as
// suspended material. The contours are authored illustrations, not cloud data.
const cloud = (x:number,y:number,scale:number,id:string,light='#f4f8f8',shade='#8faebf') => `<defs><linearGradient id="${id}" x1="0" y1="0" x2=".25" y2="1"><stop stop-color="${light}"/><stop offset=".5" stop-color="${light}"/><stop offset="1" stop-color="${shade}"/></linearGradient></defs><g transform="translate(${x} ${y}) scale(${scale})"><path d="M-59 9C-69 4-63-8-50-10C-54-20-42-29-28-26C-27-40-9-45 3-34C10-39 26-35 29-25C44-29 57-17 52-7C65-5 68 6 57 12C41 19 20 16 5 19C-17 18-42 21-59 9Z" fill="url(#${id})"/><path d="M-59 9C-40 14-23 8-10 13C9 19 29 11 50 13C35 22 17 18 4 20C-18 18-44 22-59 9Z" fill="${shade}" opacity=".34"/><path d="M-49-10C-42-19-31-18-24-15M-22-27C-14-35-5-35 2-29M11-27C22-28 30-21 32-15" fill="none" stroke="${light}" stroke-width="2.2" stroke-linecap="round" opacity=".62"/><path d="M-70 14C-46 20-23 20-3 18M27 18L64 16" fill="none" stroke="${light}" stroke-width="1.2" stroke-linecap="round" opacity=".3"/></g>`;
const drops = (color='#bceaff', bottom=153) => Array.from({length:10},(_,i)=>{const x=135+(i%5)*13,y=105+Math.floor(i/5)*25;return path(`M${x} ${y} l-5 ${Math.min(13,bottom-y)}`,color,2)}).join('');
const particles = (count:number,color='#c6e4ed') => Array.from({length:count},(_,i)=>`<circle cx="${20+(i*79%265)}" cy="${18+(i*43%126)}" r="${i%3===0?1.7:.9}" fill="${color}" opacity="${.32+(i%4)*.1}"/>`).join('');
const ground = (world:World,id:string) => {
 if(world==='earth')return `<defs><linearGradient id="${id}-sea" x2=".2" y2="1"><stop stop-color="#5393a2"/><stop offset="1" stop-color="#285c72"/></linearGradient><linearGradient id="${id}-land" x2=".35" y2="1"><stop stop-color="#73917b"/><stop offset=".6" stop-color="#4b715a"/><stop offset="1" stop-color="#354f43"/></linearGradient></defs><path d="M0 115Q55 102 110 115T300 115V170H0Z" fill="url(#${id}-sea)"/><path d="M130 170V134L185 104 209 122 239 82 265 108 300 129V170Z" fill="url(#${id}-land)"/><path d="M185 104 179 128 151 145 194 135 209 122Z" fill="#9bad8c" opacity=".35"/><path d="M239 82 231 116 252 131 265 108Z" fill="#2b544b" opacity=".7"/><path d="M223 103 239 82 252 99 241 96 233 105" fill="#d4e1d6"/><path d="M130 145Q154 141 171 144T204 148Q246 151 300 145V170H130Z" fill="#4a6950"/><path d="M130 137Q144 142 151 148L136 153" fill="none" stroke="#c4d3b3" stroke-width="1.4" opacity=".8"/><path d="M186 137V110m-7 14 7-17 7 17m-15 7 8-17 8 17" stroke="#294c3c" fill="#294c3c" stroke-width="2"/><path d="M186 110 183 117" stroke="#79937b" stroke-width="1"/><circle cx="159" cy="135" r="3.5" fill="#ecdab1"/>${path('M159 139v12m-5-9 5 2 5-2m-5 9-4 8m4-8 4 8','#ecdab1',1.8)}${path('M17 125q23-3 47-1m-25 12q26-3 52-1m-74 14q19-2 37-1m18 8 29-1','#bedbdc',1.1)}<path d="M204 157l13-4m22 8 18-3m20-11 11 2" stroke="#8fa184" stroke-width="1" opacity=".6"/>`;
 const colors=world==='venus'?['#b28c5e','#86603e','#c39961','#8b613f']:world==='mars'?['#aa7966','#805348','#c18b6b','#8c5949']:['#9c8960','#756447','#b19a6b','#756446'];
 const ridge=world==='venus'?'M0 129C18 126 23 115 39 117L61 127 83 119 111 97 125 101 151 119 177 111 201 108 220 118 244 126 270 121 300 118V170H0Z':world==='mars'?'M0 129 30 117 44 120 59 128 96 107 111 98 122 101 154 115 179 110 200 103 220 116 244 128 271 122 300 116V170H0Z':'M0 131C16 127 21 117 37 117S61 128 75 123S100 97 115 96S141 116 156 116S186 105 201 107S228 125 245 126L300 118V170H0Z';
 const grain=Array.from({length:28},(_,i)=>`<path d="M${6+i*67%286} ${151+i*19%17}l${1+i%3} ${i%2===0?.5:-.5}" stroke="${i%3===0?colors[1]:colors[2]}" stroke-width=".7" opacity=".3"/>`).join('');
 const surface=`<defs><linearGradient id="${id}-ridge" x2=".45" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient><linearGradient id="${id}-soil" x2=".25" y2="1"><stop stop-color="${colors[2]}"/><stop offset="1" stop-color="${colors[3]}"/></linearGradient></defs><path d="${ridge}" fill="url(#${id}-ridge)"/><path d="M114 98 106 116 82 131 134 122 154 115Z" fill="${colors[2]}" opacity=".28"/><path d="M200 108 190 131 222 141 245 127Z" fill="${colors[1]}" opacity=".48"/><path d="M0 153C49 138 89 140 125 146S202 155 240 148L300 146V170H0Z" fill="url(#${id}-soil)"/><path d="M10 145 45 137 69 141M77 151 114 148 137 153M218 139 248 142 274 135" fill="none" stroke="${colors[2]}" stroke-width="1.3" opacity=".5"/>${grain}`;
 if(world==='titan')return surface+`<path d="M108 151C116 144 127 148 136 144S154 142 164 146C177 149 190 143 204 146S222 150 240 150C235 157 214 155 204 159S179 162 165 158C150 160 136 155 124 158Z" fill="#354443"/><path d="M111 151C125 148 126 152 137 148S154 146 164 149" fill="none" stroke="#b7a77d" stroke-width="1" opacity=".7"/><path d="M50 138C65 146 84 151 99 149L112 151 103 155C85 155 67 151 50 141Z" fill="#3c4945"/><path d="M16 163 36 159 48 162m212-8 15 3 10-2" fill="none" stroke="#c4ae7d" stroke-width="1" opacity=".45"/>`;
 return surface+`<path d="M25 157 31 152 40 154 45 159Z M169 150 175 145 184 147 188 153Z M252 165 259 158 271 160 275 166Z" fill="${colors[1]}"/><path d="M25 157 31 152 36 155m133-5 6-5 5 3m72 17 7-7 7 3" fill="none" stroke="${colors[2]}" stroke-width="1.2"/><path d="M58 164 91 161m28-6 23 3m59 6 27-2" fill="none" stroke="${colors[1]}" stroke-width=".9" opacity=".65"/>`;
};
const craterSurface = (world:'moon'|'mercury',id:string) => {
 const moon=world==='moon',light=moon?'#c5c4bc':'#baaea0',base=moon?'#93958f':'#94877a',shade=moon?'#545b59':'#5b554f';
 return `<defs><linearGradient id="${id}-regolith" x2=".45" y2="1"><stop stop-color="${light}"/><stop offset=".5" stop-color="${base}"/><stop offset="1" stop-color="${shade}"/></linearGradient><linearGradient id="${id}-floor" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="${shade}"/><stop offset="1" stop-color="${base}"/></linearGradient></defs><path d="M0 104 37 97 66 108 104 94 133 111 179 95 217 104 261 90 300 105V170H0Z" fill="url(#${id}-regolith)"/><path d="M0 144Q49 123 94 146T197 144T300 140V170H0Z" fill="${shade}" opacity=".23"/><path d="M104 94 99 111 82 120m97-25 10 17 22 7m50-29-8 20 24 8" fill="none" stroke="${shade}" stroke-width="1.5" opacity=".38"/>`+[[73,134,32],[221,123,25],[167,158,15]].map(([x,y,r])=>`<g><ellipse cx="${x}" cy="${y+2}" rx="${r+3}" ry="${r*.34}" fill="${shade}" opacity=".25"/><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.31}" fill="url(#${id}-floor)"/><path d="M${x-r} ${y}C${x-r*.7} ${y-r*.45} ${x+r*.42} ${y-r*.43} ${x+r} ${y}" fill="none" stroke="${light}" stroke-width="2.2"/><path d="M${x-r*.73} ${y+1}Q${x} ${y+r*.29} ${x+r*.76} ${y+1}" fill="none" stroke="${light}" stroke-width="1" opacity=".48"/><path d="M${x-r*.85} ${y-1}Q${x-r*.26} ${y-r*.25} ${x+r*.4} ${y-r*.13}" fill="none" stroke="${shade}" stroke-width="2" opacity=".8"/></g>`).join('')+`<path d="M17 153 25 149 35 153m73 5 8-3 10 2m117 5 9-4 12 3" fill="none" stroke="${light}" stroke-width=".9" opacity=".45"/>`;
};
function art(kind:string,identity=kind) {
 const id='atmo-art-'+identity;
 let body='';
 switch(kind) {
 case 'vacuum':body=`<circle cx="82" cy="39" r="1.6" fill="#d2dce7" opacity=".65"/><circle cx="247" cy="128" r="1" fill="#d2dce7" opacity=".4"/>`;break;
 case 'exosphere':body=`<circle cx="51" cy="118" r="1.5" fill="#d2dce7" opacity=".6"/><circle cx="179" cy="47" r="1.5" fill="#d2dce7" opacity=".5"/><circle cx="258" cy="96" r="1" fill="#d2dce7" opacity=".3"/>`;break;
 case 'sunlight':body=`<defs><linearGradient id="${id}-light" x1=".8" y1="0" x2=".2" y2="1"><stop stop-color="#f4e5bd" stop-opacity=".85"/><stop offset="1" stop-color="#f4e5bd" stop-opacity=".22"/></linearGradient></defs><circle cx="237" cy="30" r="9" fill="#f4e8ca"/><circle cx="234" cy="27" r="5" fill="#fff5da" opacity=".6"/>`+path('M219 46 172 103m58-49-27 57m43-58-8 64',`url(#${id}-light)`,1.1);break;
 case 'moon':case 'mercury':body=craterSurface(kind,id);break;
 case 'weather':body=cloud(85,46,.48,id+'-far-cloud')+cloud(184,63,.77,id+'-rain-cloud')+path('M25 21q25-15 57-6m-41 9q25-14 56-6','#deedf1',1.5)+drops('#c5e2ec')+arrow('M47 139C19 114 29 85 52 76',52,76,'#edc596',-25)+arrow('M240 59C275 74 278 118 247 134',247,134,'#a5ccdf',150)+arrow('M23 156H105',105,156,'#cfdee3');break;
 case 'ozone':body=`<defs><linearGradient id="${id}-ozone" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c3a4d9" stop-opacity="0"/><stop offset=".5" stop-color="#c3a4d9" stop-opacity=".22"/><stop offset="1" stop-color="#c3a4d9" stop-opacity="0"/></linearGradient></defs><path d="M0 24Q76 33 154 26T300 29V91Q216 82 151 90T0 87Z" fill="url(#${id}-ozone)"/>`+Array.from({length:8},(_,i)=>`<g fill="#dbc4e7" opacity="${.5+(i%3)*.1}" transform="translate(${25+i*35} ${59+(i%3-1)*7}) rotate(${i%2===0?-14:18})"><circle r="3"/><circle cx="5" cy="-6" r="3"/><circle cx="10" r="3"/></g>`).join('')+arrow('M80 6l-8 12 9 11-8 12 9 11',82,52,'#cdb2e0',65)+arrow('M196 6l-8 12 9 11-8 12 9 11',198,52,'#cdb2e0',65)+arrow('M24 103Q106 91 152 104T276 103',276,103,'#d5e3e8')+arrow('M40 137H244',244,137,'#b4cedd');break;
 case 'polar-cloud':body=Array.from({length:7},(_,i)=>path(`M35 ${40+i*13}q65-27 117-2t105-5`,['#ead0ee','#bcd9f1','#f0dbc1'][i%3],5)).join('');break;
 case 'night-cloud':body=Array.from({length:10},(_,i)=>path(`M20 ${40+i*9}q40-20 76-5t72 0t100-7`,'#bcdcee',2)).join('');break;
 case 'space':body=particles(9)+arrow('M88 131q-4-47 38-82',126,49,'#cfdfed',-50)+arrow('M205 129q18-31 15-68',220,61,'#a9c8e2',-90);break;
 case 'venus-cloud':body=`<defs><linearGradient id="${id}-deck" x1="0" y1="0" x2=".15" y2="1"><stop stop-color="#e6d5af"/><stop offset=".55" stop-color="#ccb88b"/><stop offset="1" stop-color="#a88f64" stop-opacity=".25"/></linearGradient></defs><path d="M-15 64C13 50 39 61 63 52S106 54 128 50S170 62 197 55S248 49 275 57L315 52V113C276 119 250 105 225 111S169 104 148 111S99 104 75 111S23 107-15 113Z" fill="url(#${id}-deck)"/><path d="M-8 73C29 63 48 76 79 68S129 70 156 66S201 79 232 69S277 72 309 66" fill="none" stroke="#f0e3c6" stroke-width="2" opacity=".45"/><path d="M-10 95C22 88 54 99 87 90S139 99 174 92S221 96 249 89S285 96 310 90" fill="none" stroke="#88785c" stroke-width="3" opacity=".23"/><path d="M3 111Q57 101 103 111T199 110T302 108" fill="none" stroke="#d7c298" stroke-width="1.2" opacity=".4"/>`+arrow('M25 30H251',251,30,'#e9d9b3')+arrow('M43 136H278',278,136,'#e9d9b3');break;
 case 'venus-air':body=particles(95,'#ecd0a1')+path('M64 144q-15-21 0-39t0-39m86 83q-15-21 0-39t0-39m86 83q-15-21 0-39t0-39','#d9ad79',1.7);break;
 case 'mars-cloud':body=`<path d="M37 77C72 66 105 65 139 72C105 69 70 73 37 79Z M62 92C105 79 165 80 223 86C162 83 106 88 62 95Z M162 104C193 92 221 92 252 95C221 94 191 99 162 106Z" fill="#e1e8e8" opacity=".7"/>`+path('M50 76q41-18 86-5m-67 19q69-19 152-6m-49 18q26-13 65-9','#c0d0d8',1.1)+particles(9);break;
 case 'mars-air':body=`<path d="M115 45C145 34 166 42 186 35S224 35 252 39C223 37 207 43 187 42S145 45 115 48Z M155 56C178 50 210 46 242 49C215 50 188 56 155 58Z" fill="#dbe3e3" opacity=".68"/>`+path('M128 45q31-8 58-7t54 0','#c4d2d5',.8)+Array.from({length:24},(_,i)=>`<circle cx="${30+i*11%255}" cy="${105+i*17%45}" r="${1+(i%3)*.3}" fill="#d2a27d" opacity="${.38+(i%4)*.1}"/>`).join('')+arrow('M22 135Q97 75 149 118T275 115',275,115,'#d6ae8c');break;
 case 'titan-haze':body=`<defs><linearGradient id="${id}-haze" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d8b078" stop-opacity=".04"/><stop offset=".45" stop-color="#e0b87d" stop-opacity=".35"/><stop offset="1" stop-color="#c29357" stop-opacity=".06"/></linearGradient></defs><rect width="300" height="170" fill="url(#${id}-haze)"/>`+Array.from({length:4},(_,i)=>`<path d="M-10 ${24+i*35}C42 ${10+i*35} 91 ${30+i*35} 144 ${21+i*35}S239 ${16+i*35} 310 ${26+i*35}V${55+i*35}C251 ${41+i*35} 204 ${57+i*35} 154 ${48+i*35}S45 ${54+i*35}-10 ${45+i*35}Z" fill="#e2bd87" opacity="${.055+(i%3)*.02}"/>`).join('')+particles(40,'#e5c28d');break;
 case 'titan-air':body=cloud(140,56,.95,id+'-cloud','#eadfc6','#b29b71')+drops('#e3cda4')+arrow('M20 95Q45 63 56 43',56,43,'#dbc08b',-70);break;
 default:body=ground(kind as World,id);
 }
 return `<svg viewBox="0 0 300 170" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Qualitative, topic-owned illustrated columns. No atmospheric state is solved here.
 * DOM text remains readable and accessible at narrow widths; artwork has no hidden clock. */
export class AtmosphereProfiles {
 private key='';
 private selectedRow=1;
 private selectedWorld:World='venus';
 private readonly selectRow=(event:Event)=>{
  const button=(event.target as Element).closest<HTMLButtonElement>('.world-band[data-row]');
  if(!button||!this.root.contains(button))return;
  this.selectedRow=Number(button.dataset.row);
  this.projectSelection();
 };
 constructor(private root:HTMLElement,private text:Text,private notes?:HTMLElement) {this.root.addEventListener('click',this.selectRow);}
 draw(s:Settings,labels:boolean) {
  this.root.classList.toggle('hide-profile-labels',!labels);
  const frame=journeyFrame(s.journey), key=s.view+':'+s.world+':'+frame.phase+':'+frame.layer;
  if(key===this.key)return;
  this.key=key;
  this.selectedWorld=s.world;
  if(this.notes)this.notes.hidden=s.view!=='worlds';
  this.root.innerHTML=s.view==='worlds'?this.comparison(s.world):frame.phase==='ascent'?this.layerEnrichment(frame.layer):'';
  if(s.view==='worlds')this.projectSelection();
 }
 private projectSelection(){
  this.root.querySelectorAll<HTMLButtonElement>('.world-band[data-row]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.row)===this.selectedRow)));
  if(!this.notes)return;
  const earth=this.text.worlds.earth,other=this.text.worlds[this.selectedWorld];
  const left=earth.column[this.selectedRow]!,right=other.column[this.selectedRow]!;
  this.notes.innerHTML=`<section class="world-focus"><p class="world-focus-kicker">${escape(this.text.diagram.comparePrompt)}</p><h3>${escape(left.title)} / ${escape(right.title)}</h3><p><strong>${escape(earth.name)}</strong> · ${escape(left.body)}</p><p><strong>${escape(other.name)}</strong> · ${escape(right.body)}</p></section>`;
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
  return `<section class="world-column world-${world}" data-side="${side}" data-world="${world}"><header><h2>${escape(w.name)}</h2><p>${escape(w.composition)}</p></header>${w.column.map((row,i)=>`<button class="world-band world-band-${i}" type="button" data-scene-hit-target data-row="${i}" aria-pressed="false"><span class="world-art">${art(kinds[i],`${side}-${world}-${i}`)}</span><span class="world-words"><strong>${escape(row.title)}</strong><span>${escape(row.body)}</span></span></button>`).join('')}<footer><strong>${values.pressure===null?escape(w.pressureNote):values.pressure.toLocaleString()+' hPa'}</strong><span>${values.temperature===null?escape(w.temperatureNote):values.temperature+' °C'}</span></footer></section>`;
 }
 dispose(){this.root.removeEventListener('click',this.selectRow);this.root.replaceChildren();}
}
