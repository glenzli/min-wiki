import { language,languageHref } from '../../src/platform/i18n.ts';
import { PLANETS_DATA } from './data/planetsData.ts';
import data from './comparison.json';
import { comparison,readPair,type Metric,type PhysicalWorld } from './comparisonModel.ts';
import './comparison.css';
const text=(v:{zh:string;en:string})=>language==='en'?v.en:v.zh;
const worlds:PhysicalWorld[]=[...PLANETS_DATA.map(p=>({id:p.id,name:p.name,type:p.typeName,radiusKm:p.radiusKm,massKg:p.massKg,color:p.colorHex,source:'https://ssd.jpl.nasa.gov/planets/phys_par.html',note:text(data.solarNote)})),...data.extras.map(p=>({...p,name:text(p.name),type:text(p.type),note:text(p.note)}))];
const state=readPair(location.search,worlds.map(w=>w.id));
const panel=document.createElement('section');panel.className='world-comparison';panel.id='world-comparison';
const heading=document.createElement('header');heading.className='comparison-heading';const title=document.createElement('h2');title.textContent=text(data.title);const intro=document.createElement('p');intro.textContent=text(data.intro);heading.append(title,intro);
const selectors=document.createElement('div');selectors.className='comparison-selectors';
const selects:HTMLSelectElement[]=[];
for(const side of ['left','right'] as const){const label=document.createElement('label');label.append(text(data.ui[side]));const select=document.createElement('select');for(const w of worlds){const opt=document.createElement('option');opt.value=w.id;opt.textContent=w.name+' · '+w.type;select.append(opt);}select.value=state[side];select.onchange=()=>{state[side]=select.value;update(true);};selects.push(select);label.append(select);selectors.append(label);}
const presets=document.createElement('div');presets.className='comparison-presets';presets.setAttribute('aria-label',text(data.ui.preset));
for(const [key,a,b]of [['ice','earth','neptune'],['rock','earth','cancri'],['giants','jupiter','wasp39']] as const){const button=document.createElement('button');button.textContent=text(data.ui[key]);button.onclick=()=>{state.left=a;state.right=b;selects[0]!.value=a;selects[1]!.value=b;update(true);};presets.append(button);}
const metrics=document.createElement('div');metrics.className='comparison-metrics';
for(const metric of ['diameter','mass','density'] as Metric[]){const button=document.createElement('button');button.textContent=text(data.ui[metric]);button.dataset.metric=metric;button.onclick=()=>{state.metric=metric;update(true);};metrics.append(button);}
const canvas=document.createElement('canvas');canvas.width=1040;canvas.height=440;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',text(data.ui.cue));const c=canvas.getContext('2d');
const ratio=document.createElement('p');ratio.className='comparison-ratio';
const results=document.createElement('div');results.className='comparison-results';
const note=document.createElement('p');note.className='comparison-note';
const explanation=document.createElement('div');explanation.className='comparison-explanation';for(const content of [data.classification,data.evidence]){const p=document.createElement('p');p.textContent=text(content);explanation.append(p);}
const links=document.createElement('nav');links.className='comparison-links';for(const [url,label]of [['/topics/stars/',data.ui.other],['/topics/cosmic-scale/',data.ui.scale]] as const){const a=document.createElement('a');a.href=languageHref(url);a.textContent=text(label);links.append(a);}
panel.append(heading,selectors,presets,metrics,canvas,ratio,results,note,explanation,links);
document.querySelector('.page-footer')!.before(panel);
const entry=document.createElement('a');entry.href='#world-comparison';entry.className='comparison-entry';entry.textContent=text(data.title);document.querySelector('.scenario-bar')!.append(entry);
if(!c)canvas.hidden=true;
function update(sync=false){
  const left=worlds.find(w=>w.id===state.left)!,right=worlds.find(w=>w.id===state.right)!,values=comparison(left,right,state.metric);
  for(const b of metrics.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.metric===state.metric));
  ratio.textContent=text(data.ui.ratio)+' · '+text(data.ui[state.metric])+' = '+values.ratio.toPrecision(3);
  note.textContent=text(state.metric==='diameter'?data.diameterNote:data.barNote);
  results.replaceChildren(...[left,right].map((w,index)=>{const article=document.createElement('article'),h=document.createElement('h3'),v=document.createElement('output'),p=document.createElement('p'),source=document.createElement('a');h.textContent=w.name+' · '+w.type;const raw=index?values.right:values.left;v.textContent=(state.metric==='mass'?raw.toExponential(3):raw.toLocaleString(language==='en'?'en-US':'zh-CN',{maximumSignificantDigits:4}))+' '+(state.metric==='diameter'?'km':state.metric==='mass'?'kg':'g/cm³');p.textContent=w.note;source.href=w.source;source.target='_blank';source.rel='noreferrer';source.textContent=text(data.ui.source);article.append(h,v,p,source);if(w.id!=='wasp39'){const explore=document.createElement('a');explore.href=languageHref(w.id==='cancri'?'/topics/planet-surfaces/?world=cancri':'/topics/solar-system/?body='+w.id+'&view=globe');explore.textContent=text(data.ui.view);article.append(explore);}return article;}));
  if(c){c.fillStyle='#09131e';c.fillRect(0,0,1040,440);
    [left,right].forEach((w,index)=>{const x=index?770:270,fraction=values.fractions[index]!;if(state.metric==='diameter'){const r=148*fraction,g=c.createRadialGradient(x-r*.35,190-r*.4,0,x,190,r);g.addColorStop(0,w.color);g.addColorStop(.7,w.color);g.addColorStop(1,'#101c2a');c.fillStyle=g;c.beginPath();c.arc(x,190,r,0,7);c.fill();c.save();c.clip();for(let i=0;i<65;i++){const y=190-r+i*r/32;const wave=Math.sin(i*31.7)*.5+.5;c.fillStyle=w.id==='earth'?'#557f7544':w.id==='cancri'?'#eead5025':'#ffffff0a';c.fillRect(x-r,y,r*2,(1+wave*3)*r/80);}c.restore();}else{const width=340*fraction;const g=c.createLinearGradient(x-170,0,x+170,0);g.addColorStop(0,w.color);g.addColorStop(1,'#9cbec5');c.fillStyle='#182938';c.fillRect(x-170,165,340,52);c.fillStyle=g;c.fillRect(x-170,165,width,52);c.strokeStyle='#5e7181';c.beginPath();c.moveTo(x-170,230);c.lineTo(x+170,230);c.stroke();}
      c.fillStyle='#e1e5e7';c.font=`${Math.max(20,12*1040/(canvas.clientWidth||1040))}px system-ui`;c.textAlign='center';c.fillText(w.name,x,385);});
  }
  if(sync){const url=new URL(location.href);url.searchParams.set('compareA',state.left);url.searchParams.set('compareB',state.right);url.searchParams.set('metric',state.metric);history.replaceState(null,'',url);}
}
window.addEventListener('popstate',()=>{Object.assign(state,readPair(location.search,worlds.map(w=>w.id)));selects[0]!.value=state.left;selects[1]!.value=state.right;update();});update();
const comparisonResize=new ResizeObserver(()=>update());comparisonResize.observe(canvas);
window.addEventListener('pagehide',event=>{if(!event.persisted)comparisonResize.disconnect();});
