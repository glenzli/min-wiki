import content from './comparisonContent.json';
import {bodies,lastPair,comparisonFrame,stellarOrbitFrame,stellarEstimateSources,type Chapter} from './comparisonModel.ts';
import {clamp,smooth} from './model.ts';
import earthMap from '../solar-system/assets/2k_earth_daymap.jpg';
import jupiterMap from '../solar-system/assets/2k_jupiter.jpg';

type Words=typeof content.zh;
const make=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const el=document.createElement(tag);el.textContent=text;el.className=className;return el;};
/** Owns the finite comparison animation and schematic membership drawings, independent of the physical camera. */
export class ComparisonJourney {
 private words:Words;private canvas=make('canvas');private ctx:CanvasRenderingContext2D;private observer:ResizeObserver;
 private pair=0;private home=0;private chapter:Chapter='compare';private frame=0;private destination:number|null=null;private disposed=false;
 private title=make('h2');private note=make('p');private boundary=make('p','','comparison-boundary');private cards=make('div','','comparison-readings');
 private slider=make('input');private pairs=make('select');private homes=make('div','','comparison-buttons');
 private solarButton=make('button');private solar=false;private estimate=make('details');private estimateText=make('p');
 private previous=make('button');private next=make('button');private onward=make('button');private source=make('a');
 private maps:HTMLImageElement[]=[];private stellarMaps=new Map<number,HTMLCanvasElement>();private galaxyMaps=new Map<number,HTMLCanvasElement>();
 constructor(private root:HTMLElement,language:string,private changed:(pair:number,home:number)=>void,private navigate:(chapter:Chapter)=>void){
  this.words=language==='en'?content.en:content.zh;const w=this.words;
  this.ctx=this.canvas.getContext('2d')!;this.canvas.className='comparison-canvas';this.canvas.setAttribute('role','img');
  this.pairs.setAttribute('aria-label',w.choosePair);w.pairs.forEach((name,i)=>{const option=make('option',name);option.value=String(i);this.pairs.append(option);});
  this.pairs.onchange=()=>this.animate(Number(this.pairs.value));
  this.solarButton.onclick=()=>{const selected=this.destination??Math.round(this.pair);this.stop();this.solar=!this.solar;if(this.solar){this.pair=selected;this.changed(this.pair,this.home);}this.paint();};
  w.homeNames.forEach((name,i)=>{const b=make('button',name);b.onclick=()=>{this.home=i;this.changed(this.pair,this.home);this.paint();};this.homes.append(b);});
  const heading=make('div','','comparison-heading'),choices=make('div','','comparison-choices');choices.append(this.pairs,this.solarButton);heading.append(this.title,choices,this.homes);
  const label=make('label',w.scrub);this.slider.type='range';this.slider.min='0';this.slider.max=String(lastPair);this.slider.step='any';this.slider.setAttribute('aria-label',w.scrub);label.append(this.slider);
  this.slider.oninput=()=>{this.stop();this.pair=Number(this.slider.value);this.changed(this.pair,this.home);this.paint();};
  this.previous.textContent=w.previous;this.previous.onclick=()=>this.animate(Math.max(0,Math.ceil(this.pair)-1));
  this.next.textContent=w.next;this.next.onclick=()=>this.animate(Math.min(lastPair,Math.floor(this.pair)+1));
  this.onward.onclick=()=>this.navigate(this.chapter==='compare'?'homes':'zoom');
  this.source.textContent=w.source;this.source.target='_blank';this.source.rel='noreferrer';
  const controls=make('div','','comparison-transport');controls.append(this.previous,label,this.next);
  const copy=make('div','','comparison-copy');this.estimate.append(make('summary',w.estimateDetails),this.estimateText);copy.append(this.note,this.estimate,this.source,this.onward);
  const credit=make('a',w.credit,'comparison-credit');credit.href='https://www.solarsystemscope.com/textures/';credit.target='_blank';credit.rel='noreferrer';
  copy.append(credit);root.append(heading,this.canvas,this.cards,controls,this.boundary,copy);
  this.observer=new ResizeObserver(()=>this.paint());this.observer.observe(this.canvas);
  for(const url of [earthMap,jupiterMap]){const image=new Image();image.onload=()=>{if(!this.disposed)this.paint();};image.src=url;this.maps.push(image);}
 }
 show(chapter:Chapter,pair:number,home:number){if(this.chapter!==chapter)this.stop();this.chapter=chapter;this.pair=pair;this.home=home;this.root.hidden=chapter==='zoom';this.paint();}
 stop(){cancelAnimationFrame(this.frame);this.frame=0;this.destination=null;}
 private animate(target:number){this.stop();if(this.solar||matchMedia('(prefers-reduced-motion: reduce)').matches){this.pair=target;this.changed(this.pair,this.home);this.paint();return;}this.destination=target;const from=this.pair;let elapsed=0,last=performance.now();const tick=(now:number)=>{this.frame=0;if(this.disposed||document.hidden){this.destination=null;return;}elapsed+=Math.min(.08,(now-last)/1000);last=now;this.pair=from+(target-from)*smooth(Math.min(1,elapsed/1.1));this.changed(this.pair,this.home);this.paint();if(elapsed<1.1)this.frame=requestAnimationFrame(tick);else this.destination=null;};this.frame=requestAnimationFrame(tick);}
 /** Static, object-bound photosphere illustration; no observed surface map or timed convection is implied. */
 private stellarMap(index:number){
  const cached=this.stellarMaps.get(index);if(cached)return cached;
  const size=640,map=make('canvas');map.width=map.height=size;const context=map.getContext('2d')!,image=context.createImageData(size,size),p=image.data;
  const hash=(x:number,y:number,z:number)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;};
  const noise=(x:number,y:number,z:number)=>{const a=Math.floor(x),b=Math.floor(y),d=Math.floor(z);x-=a;y-=b;z-=d;const u=x*x*(3-2*x),v=y*y*(3-2*y),w=z*z*(3-2*z);let n=0;for(let k=0;k<2;k++)for(let j=0;j<2;j++)for(let i=0;i<2;i++)n+=hash(a+i,b+j,d+k)*(i?u:1-u)*(j?v:1-v)*(k?w:1-w);return n;};
  for(let py=0;py<size;py++)for(let px=0;px<size;px++){
   const x=(px+.5)*2/size-1,y=(py+.5)*2/size-1,rr=x*x+y*y,o=(py*size+px)*4;if(rr>=1)continue;
   const z=Math.sqrt(1-rr),scale=index===2?115:66;
   const broad=noise(x*9+7,y*9,z*9),warp=noise(x*18,y*18+3,z*18);
   const fine=noise(x*scale+warp*2,y*scale,z*scale),micro=noise(x*scale*2,y*scale*2,z*scale*2);
   const cell=clamp((fine-.23)*1.8,0,1),limb=.58+.42*Math.pow(z,.55);
   let light=limb*(.64+.38*cell+.16*broad+.07*micro);
   if(index===2)for(const [sx,sy,r]of [[-.35,.18,.035],[-.28,.22,.018],[.43,-.3,.022]]){const d=Math.hypot(x-sx!,y-sy!);light*=1-.70*Math.exp(-((d/r!)**2))-.16*Math.exp(-((d/(r!*2))**2));}
   p[o]=255*Math.min(1,light*1.18);p[o+1]=(index===2?221:161)*light*(.85+.15*cell);p[o+2]=(index===2?137:75)*light*(.72+.28*cell);p[o+3]=Math.min(255,(1-Math.sqrt(rr))*size*255);
  }
  context.putImageData(image,0,0);this.stellarMaps.set(index,map);return map;
 }
 private disk(x:number,y:number,r:number,index:number){
  const c=this.ctx;if(r<.1)return;
  if(index>=2){const color=index===2?'#ffce74':'#ff9d50',halo=c.createRadialGradient(x,y,r*.99,x,y,r*1.10);halo.addColorStop(0,color+'45');halo.addColorStop(.4,color+'12');halo.addColorStop(1,color+'00');c.fillStyle=halo;c.fillRect(x-r*1.1,y-r*1.1,r*2.2,r*2.2);c.drawImage(this.stellarMap(index),x-r,y-r,r*2,r*2);return;}
  c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();
  const g=c.createRadialGradient(x-r*.35,y-r*.35,r*.1,x,y,r);g.addColorStop(0,index===3?'#ffcb85':index===2?'#fff1ac':'#729ab0');g.addColorStop(1,index===3?'#ad401e':index===2?'#e39b32':'#173748');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
  const image=this.maps[index];if(index<2&&image?.complete&&image.naturalWidth)c.drawImage(image,x-r*2,y-r,r*4,r*2);
  const shade=c.createLinearGradient(x-r,y-r,x+r,y+r);shade.addColorStop(0,'#01091500');shade.addColorStop(.6,'#01091518');shade.addColorStop(1,'#010915c0');c.fillStyle=shade;c.fillRect(x-r,y-r,2*r,2*r);c.restore();
 }
 private paint(){
  if(this.disposed||this.root.hidden)return;const width=this.canvas.clientWidth;if(!width)return;const height=this.canvas.clientHeight||300,dpr=Math.min(devicePixelRatio||1,2),c=this.ctx,w=this.words;
  if(this.canvas.width!==Math.round(width*dpr)||this.canvas.height!==Math.round(height*dpr)){this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);}c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#08111f';c.fillRect(0,0,width,height);
  const comparing=this.chapter==='compare',index=Math.max(0,Math.min(lastPair,Math.round(this.pair))),solar=comparing&&this.solar&&index>=1;
  this.pairs.parentElement!.hidden=!comparing;this.homes.hidden=comparing;this.solarButton.hidden=index<1;this.solarButton.textContent=solar?w.pairView:w.solarView;this.solarButton.setAttribute('aria-pressed',String(solar));
  (this.slider.parentElement!.parentElement!).hidden=!comparing;this.slider.parentElement!.hidden=solar;this.cards.hidden=!comparing||!solar&&Math.abs(this.pair-Math.round(this.pair))>1e-5;
  this.canvas.setAttribute('aria-label',solar?`${w.names[index+1]}. ${w.orbitBoundary}`:comparing?w.compareAlt:w.homeAlt);
  this.title.textContent=comparing?w.pairTitles[index]!:w.homeTitles[this.home]!;
  this.note.textContent=comparing?w.pairNotes[index]!+(solar?' '+w.orbitIntro:''):w.homeNotes[this.home]!;this.boundary.textContent=solar?w.orbitBoundary:comparing?w.boundary:w.homeBoundary;
  this.estimate.hidden=!comparing||index<5&&!solar;this.estimateText.textContent=[index>=5?w.estimateNotes[index-5]:'',solar?w.orbitDetails:''].filter(Boolean).join(' ');
  this.onward.textContent=comparing?w.goHomes:w.goZoom;this.source.href=comparing?(stellarEstimateSources[bodies[index+1]!.id]??'https://science.nasa.gov/sun/facts/'):'https://science.nasa.gov/universe/galaxies/';
  this.slider.value=String(this.pair);this.previous.disabled=this.pair<=0;this.next.disabled=this.pair>=lastPair;
  this.pairs.setAttribute('aria-label',solar?w.chooseStar:w.choosePair);
  [...this.pairs.options].forEach((option,i)=>{option.textContent=solar?w.names[i+1]!:w.pairs[i]!;option.disabled=solar&&i===0;option.hidden=solar&&i===0;});
  this.pairs.value=String(index);[...this.homes.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===this.home)));
  this.cards.classList.toggle('orbit-readings',solar);
  if(solar)this.drawSolarSystem(index+1,width,height);
  else if(comparing){
   for(const [i,b] of comparisonFrame(this.pair,width,height).entries()){if(b.opacity===0)continue;c.globalAlpha=b.opacity;const y=height*.6-b.radius*.2;this.disk(b.x,y,b.radius,i);if(b.opacity>.1&&b.x+b.radius>0&&b.x-b.radius<width){c.font='12px system-ui';c.textAlign='center';c.fillStyle='#e5eef5';c.fillText(w.names[i]!,Math.max(32,Math.min(width-40,b.x)),Math.min(height-16,y+b.radius+20));}c.globalAlpha=1;}
   const entries=[index,index+1].map(i=>{const card=make('div');card.append(make('strong',w.names[i]!),make('span',w.kinds[i]!),make('span',i>=6?w.roughSunDiameters.replace('{{count}}',String(Math.round(bodies[i]!.radius/bodies[2]!.radius))):`${w.diameter} ${(bodies[i]!.radius*2).toLocaleString(undefined,{maximumSignificantDigits:3})} km`));return card;});this.cards.replaceChildren(...entries);
  }else this.drawHome(width,height);
 }
 /** A counterfactual size overlay. Orbital radii and the stellar outline share one linear ruler. */
 private drawSolarSystem(index:number,width:number,height:number){
  const c=this.ctx,w=this.words,geometry=stellarOrbitFrame(index,width,height),cx=width/2,cy=(height-20)/2;
  c.globalAlpha=.68;this.disk(cx,cy,geometry.radius,index);c.globalAlpha=1;
  c.strokeStyle='#ffc896';c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,geometry.radius,0,Math.PI*2);c.stroke();
  const colors=['#b5b7bf','#ecc991','#68c3ed','#d48a66','#ddba89','#edcf9c'];
  for(const [i,orbit]of geometry.orbits.entries()){
   c.strokeStyle=orbit.inside?'#ffe8d3a6':'#83aabc99';c.lineWidth=i===2||i===5?1.5:1;c.setLineDash(orbit.inside?[3,3]:[]);
   c.beginPath();c.arc(cx,cy,orbit.radius,0,Math.PI*2);c.stroke();c.setLineDash([]);
   const angle=[-2.7,-.4,1.6,3.4,-.8,2.1][i]!,x=cx+Math.cos(angle)*orbit.radius,y=cy+Math.sin(angle)*orbit.radius;
   const r=i>=4?7:3.5;c.fillStyle=colors[i]!;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
   if(i===2){c.fillStyle='#83ab62';c.fillRect(x-2,y-1,3,3);}
   if(i===4){c.strokeStyle='#936545';c.lineWidth=1.3;for(const dy of [-3,2]){c.beginPath();c.moveTo(x-5,y+dy);c.lineTo(x+5,y+dy);c.stroke();}}
   if(i===5){c.strokeStyle='#ddc096';c.lineWidth=2;c.beginPath();c.ellipse(x,y,12,4,-.3,0,Math.PI*2);c.stroke();}
   if(i>=4){c.font='12px system-ui';c.textAlign='center';c.fillStyle='#f4eadb';c.fillText(w.planetNames[i]!,x,y+(i===4?-15:24));}
  }
  c.strokeStyle='#ffffff';c.lineWidth=1;c.beginPath();c.moveTo(cx-4,cy);c.lineTo(cx+4,cy);c.moveTo(cx,cy-4);c.lineTo(cx,cy+4);c.stroke();
  c.fillStyle='#f7d7ac';c.font='12px system-ui';c.textAlign='left';c.fillText(`${w.names[index]} · ${w.estimated}`,12,20,width-24);
  c.textAlign='center';c.fillStyle='#aec6d5';c.font='11px system-ui';c.fillText(w.sunPlace,cx,height-7,width-20);
  const planetCards=geometry.orbits.map((orbit,i)=>{
   const card=make('div'),name=make('strong'),icon=make('canvas');icon.width=icon.height=46;icon.setAttribute('aria-hidden','true');const p=icon.getContext('2d')!;p.scale(2,2);
   p.fillStyle=colors[i]!;p.beginPath();p.arc(11.5,11.5,i===5?6:8,0,Math.PI*2);p.fill();
   if(i===2){p.fillStyle='#6c9a50';p.beginPath();p.moveTo(5,6);p.lineTo(12,5);p.lineTo(10,12);p.lineTo(7,14);p.fill();p.fillRect(13,13,5,4);}
   if(i===4){p.strokeStyle='#9b6e50';p.lineWidth=2;for(const dy of [-4,1,5]){p.beginPath();p.moveTo(6,11+dy);p.lineTo(17,11+dy);p.stroke();}}
   if(i===5){p.strokeStyle='#c7a67e';p.lineWidth=2;p.beginPath();p.ellipse(11.5,11.5,10,3,-.4,0,Math.PI*2);p.stroke();}
   card.className=orbit.inside?'inside':'outside';name.append(icon,document.createTextNode(w.planetNames[i]!));card.append(name,make('span',orbit.inside?w.inside:w.outside));return card;
  });
  this.cards.replaceChildren(...planetCards);
 }
 /** Cached structural illustration: diffuse light, spiral populations and dust, not an external photograph. */
 private galaxyMap(kind:number){
  const cached=this.galaxyMaps.get(kind);if(cached)return cached;
  const size=720,map=make('canvas');map.width=map.height=size;const c=map.getContext('2d')!,im=c.createImageData(size,size),p=im.data;
  const hash=(x:number,y:number)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(kind+1,1274126177);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;};
  const noise=(x:number,y:number)=>{const a=Math.floor(x),b=Math.floor(y);x-=a;y-=b;const u=x*x*(3-2*x),v=y*y*(3-2*y);return hash(a,b)*(1-u)*(1-v)+hash(a+1,b)*u*(1-v)+hash(a,b+1)*(1-u)*v+hash(a+1,b+1)*u*v;};
  const arms=kind===2?3:2;
  for(let py=0;py<size;py++)for(let px=0;px<size;px++){
   const x=(px+.5-size/2)/(size*.47),y=(py+.5-size/2)/(size*.47),r=Math.hypot(x,y),o=(py*size+px)*4;if(r>1.05)continue;
   const theta=Math.atan2(y,x),n=noise(x*32+9,y*32+9),fine=noise(x*120+8,y*120+8),phase=arms*(theta-3.6*Math.log(r+.095));
   const spiral=Math.exp(-((Math.sin(phase/2)/.42)**2)),dust=Math.exp(-((Math.sin((phase+.5)/2)/.18)**2));
   const edge=Math.max(0,1-r*r),disk=Math.exp(-r*2.0)*edge,core=Math.exp(-r*r/(kind===2?.011:.025));
   const bar=kind===0?Math.exp(-x*x/.05-y*y/.0018)*.32:0;
   const cloud=(.62+1.6*spiral*(.35+.65*n))*disk*(.5+.5*fine)*(1-.72*dust*(1-core));
   p[o]=Math.min(255,cloud*185+core*255+bar*190);p[o+1]=Math.min(255,cloud*210+core*218+bar*160);p[o+2]=Math.min(255,cloud*255+core*165+bar*120);p[o+3]=Math.min(255,Math.min(1,edge*3)*255);
  }
  c.putImageData(im,0,0);
  // Faint unresolved star light dominates; sparse brighter associations trace the same arms.
  let seed=9181+kind*173;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  c.globalCompositeOperation='screen';
  for(let i=0;i<6500;i++){const r=Math.sqrt(random())*.94,a=3.6*Math.log(r+.095)+(i%arms)*Math.PI*2/arms+(random()-.5)*.5,x=size/2+Math.cos(a)*r*size*.47,y=size/2+Math.sin(a)*r*size*.47,alpha=(1-r)*(.08+random()*.33);c.fillStyle=i%19===0?`rgba(255,173,181,${alpha})`:`rgba(182,211,255,${alpha})`;c.beginPath();c.arc(x,y,.25+random()*.75,0,7);c.fill();}
  c.globalCompositeOperation='source-over';this.galaxyMaps.set(kind,map);return map;
 }
 private drawHome(width:number,height:number){
  const c=this.ctx,w=this.words,cx=width/2,cy=height*.46,span=Math.min(width*.38,height*.7);c.lineWidth=1;c.font='12px system-ui';c.textAlign='center';
  const galaxy=(x:number,y:number,r:number,highlight=false,kind=0)=>{c.save();c.translate(x,y);c.rotate(kind===1?-.24:kind===2?.18:-.10);const flatten=kind===1?.40:kind===2?.72:.64;c.globalCompositeOperation='screen';c.drawImage(this.galaxyMap(kind),-r,-r*flatten,r*2,r*flatten*2);if(highlight){c.strokeStyle='#ffdc9199';c.beginPath();c.ellipse(0,0,r*1.03,r*flatten*1.08,0,0,7);c.stroke();}c.restore();};
  if(this.home===0){for(let i=1;i<=8;i++){const r=span*i/8;c.strokeStyle='#819cad66';c.beginPath();c.ellipse(cx,cy,r,r*.38,0,0,7);c.stroke();const a=i*1.4;c.fillStyle=i===3?'#76cdf7':'#c7b598';c.beginPath();c.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.38,i===3?5:3,0,7);c.fill();}this.disk(cx,cy,18,2);}
  if(this.home===1){galaxy(cx,cy,span);const x=cx+span*.53,y=cy+span*.13;c.strokeStyle='#ffdc91';c.beginPath();c.arc(x,y,8,0,7);c.stroke();c.fillStyle='#ffdc91';c.fillText(w.homeNames[0]!,x,cy+span*.53);}
  if(this.home===2){galaxy(width*.28,height*.29,span*.43,true);galaxy(width*.71,height*.44,span*.53,false,1);galaxy(width*.35,height*.65,span*.26,false,2);c.fillStyle='#d4e5ef';c.fillText(w.homeNames[1]!,width*.28,height*.29+span*.4);c.fillText(w.andromeda,width*.71,height*.44+span*.43);c.fillText(w.triangulum,width*.35,height*.65+span*.3);}
  c.fillStyle='#ffe0a0';c.fillText(w.homeAnchor[this.home]!,cx,height-20);
 }
 dispose(){this.stop();this.disposed=true;this.observer.disconnect();this.maps.forEach(i=>i.onload=null);this.stellarMaps.clear();this.galaxyMaps.clear();this.canvas.width=this.canvas.height=0;}
}
