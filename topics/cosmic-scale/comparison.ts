import content from './comparisonContent.json';
import {bodies,lastPair,homeRoute,homeSideViews,homeContext,homeRoutePosition,stepHomeRoute,comparisonFrame,stellarOrbitFrame,stellarEstimateSources,type Chapter} from './comparisonModel.ts';
import {clamp,smooth} from './model.ts';
import earthMap from '../solar-system/assets/2k_earth_daymap.jpg';
import jupiterMap from '../solar-system/assets/2k_jupiter.webp';
import { MembershipScene } from './membershipScene.ts';

type Words=typeof content.zh;
const make=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const el=document.createElement(tag);el.textContent=text;el.className=className;return el;};
/** Owns the finite comparison animation and schematic membership drawings, independent of the physical camera. */
export class ComparisonJourney {
 private words:Words;private canvas=make('canvas');private ctx:CanvasRenderingContext2D;private observer:ResizeObserver;
 private pair=0;private home=0;private chapter:Chapter='compare';private frame=0;private destination:number|null=null;private disposed=false;
 private title=make('h2');private note=make('p');private boundary=make('p','','comparison-boundary');private cards=make('div','','comparison-readings');
 private slider=make('input');private pairs=make('select');private homes=make('nav','','comparison-buttons');private sideViews=make('nav','','comparison-side-buttons');
 private homePath=make('div','','comparison-home-path');private homeAside=make('div','','comparison-home-aside');
 private solarButton=make('button');private solar=false;private estimate=make('details');private estimateText=make('p');
 private previous=make('button');private next=make('button');private onward=make('button');private source=make('a');
 private homePrevious=make('button');private homeNext=make('button');private homeProgress=make('span');private homeTransport=make('div','','comparison-transport comparison-home-transport');
 private homeCues=make('div','','comparison-home-cues');
 private childSummary?:()=>string;
 private surfaceButton=make('button');private surfaceTime=0;private surfaceFrame=0;private surfaceLast=0;private surfacePaint=0;private surfacePlaying=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 private maps:HTMLImageElement[]=[];private planetMaps=new Map<number,{canvas:HTMLCanvasElement;image:ImageData;source:ImageData;phase:number}>();private stellarMaps=new Map<number,{canvas:HTMLCanvasElement;image:ImageData;phase:number}>();private membership=new MembershipScene();
 constructor(private root:HTMLElement,language:string,private changed:(pair:number,home:number)=>void,private navigate:(chapter:Chapter)=>void){
  this.words=language==='en'?content.en:content.zh;const w=this.words;
  this.ctx=this.canvas.getContext('2d')!;this.canvas.className='comparison-canvas';this.canvas.setAttribute('role','img');
  this.pairs.setAttribute('aria-label',w.choosePair);w.pairs.forEach((name,i)=>{const option=make('option',name);option.value=String(i);this.pairs.append(option);});
  this.pairs.onchange=()=>this.animate(Number(this.pairs.value));
  this.solarButton.onclick=()=>{const selected=this.destination??Math.round(this.pair);this.stop();this.solar=!this.solar;if(this.solar){this.pair=selected;this.changed(this.pair,this.home);}this.paint();};
  this.homes.setAttribute('aria-label',w.homeRouteLabel);this.sideViews.setAttribute('aria-label',w.homeSideLabel);
  homeRoute.forEach(i=>{const b=make('button',w.homeNames[i]!);b.onclick=()=>{this.home=i;this.changed(this.pair,this.home);this.paint();};this.homes.append(b);});
  homeSideViews.forEach((i,n)=>{const b=make('button',w.homeSideNames[n]!);b.onclick=()=>{this.home=i;this.changed(this.pair,this.home);this.paint();};this.sideViews.append(b);});
  this.homePath.append(make('p',w.homeRouteLabel),this.homes);
  this.homeAside.append(make('p',w.homeSideLabel),this.sideViews);
  const heading=make('div','','comparison-heading'),choices=make('div','','comparison-choices');choices.append(this.pairs,this.solarButton,this.surfaceButton);this.surfaceButton.onclick=()=>this.setSurface(!this.surfacePlaying);heading.append(this.title,choices,this.homePath,this.homeAside);
  const label=make('label',w.scrub);this.slider.type='range';this.slider.min='0';this.slider.max=String(lastPair);this.slider.step='any';this.slider.setAttribute('aria-label',w.scrub);label.append(this.slider);
  this.slider.oninput=()=>{this.stop();this.pair=Number(this.slider.value);this.changed(this.pair,this.home);this.paint();};
  this.previous.textContent=w.previous;this.previous.onclick=()=>this.animate(Math.max(0,Math.ceil(this.pair)-1));
  this.next.textContent=w.next;this.next.onclick=()=>this.animate(Math.min(lastPair,Math.floor(this.pair)+1));
  this.homePrevious.textContent=w.homePrevious;this.homeNext.textContent=w.homeNext;
  const stepHome=(change:number)=>{this.home=stepHomeRoute(this.home,change);this.changed(this.pair,this.home);this.paint();};
  this.homePrevious.onclick=()=>{if(homeSideViews.includes(this.home as typeof homeSideViews[number])){this.home=homeContext(this.home);this.changed(this.pair,this.home);this.paint();}else stepHome(-1);};this.homeNext.onclick=()=>stepHome(1);
  this.homeProgress.className='comparison-home-progress';this.homeTransport.append(this.homePrevious,this.homeProgress,this.homeNext);
  this.onward.onclick=()=>this.navigate(this.chapter==='compare'?'homes':'zoom');
  this.source.textContent=w.source;this.source.target='_blank';this.source.rel='noreferrer';
  const controls=make('div','','comparison-transport');controls.append(this.previous,label,this.next);
  const copy=make('div','','comparison-copy');this.estimate.append(make('summary',w.estimateDetails),this.estimateText);copy.append(this.note,this.estimate,this.source,this.onward);
  const credit=make('a',w.credit,'comparison-credit');credit.href='https://www.solarsystemscope.com/textures/';credit.target='_blank';credit.rel='noreferrer';
  copy.append(credit);root.append(heading,this.canvas,this.cards,controls,this.homeTransport,this.homeCues,this.boundary,copy);
  this.observer=new ResizeObserver(()=>this.paint());this.observer.observe(this.canvas);
  for(const url of [earthMap,jupiterMap]){const image=new Image();image.onload=()=>{if(!this.disposed)this.paint();};image.src=url;this.maps.push(image);}
  this.setSurface(this.surfacePlaying);
 }
 show(chapter:Chapter,pair:number,home:number){if(this.chapter!==chapter)this.stop();this.chapter=chapter;this.pair=pair;this.home=home;this.root.hidden=chapter==='zoom';if(chapter!=='compare')this.pauseSurface();this.paint();}
 setChildSummary(summary:()=>string){this.childSummary=summary;this.paint();}
 pauseSurface(){this.setSurface(false);}
 private setSurface(active:boolean){this.surfacePlaying=active;cancelAnimationFrame(this.surfaceFrame);this.surfaceFrame=0;this.surfaceButton.textContent=active?this.words.pauseSurface:this.words.playSurface;this.surfaceButton.setAttribute('aria-pressed',String(active));if(active&&!this.disposed&&!document.hidden){this.surfaceLast=performance.now();this.surfaceFrame=requestAnimationFrame(now=>this.tickSurface(now));}}
 private tickSurface(now:number){this.surfaceFrame=0;if(!this.surfacePlaying||this.disposed||document.hidden||this.chapter!=='compare')return;this.surfaceTime+=Math.min(.1,(now-this.surfaceLast)/1000);this.surfaceLast=now;if(now-this.surfacePaint>=160){this.surfacePaint=now;this.paint(true);}this.surfaceFrame=requestAnimationFrame(t=>this.tickSurface(t));}
 stop(){cancelAnimationFrame(this.frame);this.frame=0;this.destination=null;}
 private animate(target:number){this.stop();if(this.solar||matchMedia('(prefers-reduced-motion: reduce)').matches){this.pair=target;this.changed(this.pair,this.home);this.paint();return;}this.destination=target;const from=this.pair;let elapsed=0,last=performance.now();const tick=(now:number)=>{this.frame=0;if(this.disposed||document.hidden){this.destination=null;return;}elapsed+=Math.min(.08,(now-last)/1000);last=now;this.pair=from+(target-from)*smooth(Math.min(1,elapsed/1.1));this.changed(this.pair,this.home);this.paint();if(elapsed<1.1)this.frame=requestAnimationFrame(tick);else this.destination=null;};this.frame=requestAnimationFrame(tick);}
 /** Object-bound evolving photosphere illustration; speed and surface detail are not calibrated measurements. */
 private stellarMap(index:number){
  const phase=Math.floor(this.surfaceTime*6)/6,size=320;let cached=this.stellarMaps.get(index);if(cached?.phase===phase)return cached.canvas;
  if(!cached){const canvas=make('canvas');canvas.width=canvas.height=size;cached={canvas,image:canvas.getContext('2d')!.createImageData(size,size),phase:NaN};this.stellarMaps.set(index,cached);}
  const map=cached.canvas,context=map.getContext('2d')!,image=cached.image,p=image.data;cached.phase=phase;
  const hash=(x:number,y:number,z:number)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;};
  const noise=(x:number,y:number,z:number)=>{const a=Math.floor(x),b=Math.floor(y),d=Math.floor(z);x-=a;y-=b;z-=d;const u=x*x*(3-2*x),v=y*y*(3-2*y),w=z*z*(3-2*z);let n=0;for(let k=0;k<2;k++)for(let j=0;j<2;j++)for(let i=0;i<2;i++)n+=hash(a+i,b+j,d+k)*(i?u:1-u)*(j?v:1-v)*(k?w:1-w);return n;};
  for(let py=0;py<size;py++)for(let px=0;px<size;px++){
   const x=(px+.5)*2/size-1,y=(py+.5)*2/size-1,rr=x*x+y*y,o=(py*size+px)*4;if(rr>=1)continue;
   const nz=Math.sqrt(1-rr),a=phase*.05,sx=x*Math.cos(a)+nz*Math.sin(a),z=nz*Math.cos(a)-x*Math.sin(a),scale=index===2?85:55;
   const broad=noise(sx*9+7+phase*.04,y*9,z*9),warp=noise(sx*18,y*18+3+phase*.05,z*18);
   const fine=noise(sx*scale+warp*2,y*scale+phase*.2,z*scale+phase*.12),micro=noise(sx*scale*2,y*scale*2+phase*.15,z*scale*2);
   const cell=clamp((fine-.23)*1.8,0,1),limb=.58+.42*Math.pow(nz,.55);
   let light=limb*(.64+.38*cell+.16*broad+.07*micro);
   if(index===2)for(const [spotX,spotY,r]of [[-.35,.18,.035],[-.28,.22,.018],[.43,-.3,.022]]){const d=Math.hypot(sx-spotX!,y-spotY!,z-Math.sqrt(1-spotX!**2-spotY!**2));light*=1-.70*Math.exp(-((d/r!)**2))-.16*Math.exp(-((d/(r!*2))**2));}
   p[o]=255*Math.min(1,light*1.18);p[o+1]=(index===2?221:161)*light*(.85+.15*cell);p[o+2]=(index===2?137:75)*light*(.72+.28*cell);p[o+3]=Math.min(255,(1-Math.sqrt(rr))*size*255);
  }
  context.putImageData(image,0,0);return map;
 }
 /** Rotating equirectangular maps are projected onto a lit sphere, with the disk radius unchanged. */
 private planetMap(index:number){
  const image=this.maps[index];if(!image?.complete||!image.naturalWidth)return;
  const phase=Math.floor(this.surfaceTime*6)/6,size=320;
  let cached=this.planetMaps.get(index);
  if(!cached){
   const sourceCanvas=make('canvas');sourceCanvas.width=1024;sourceCanvas.height=512;
   const sourceContext=sourceCanvas.getContext('2d')!;sourceContext.drawImage(image,0,0,1024,512);
   const canvas=make('canvas');canvas.width=canvas.height=size;
   cached={canvas,image:canvas.getContext('2d')!.createImageData(size,size),source:sourceContext.getImageData(0,0,1024,512),phase:NaN};
   this.planetMaps.set(index,cached);
  }
  if(cached.phase===phase)return cached.canvas;
  cached.phase=phase;
  const pixels=cached.image.data,source=cached.source.data,angle=phase*(index===0?.11:.17);
  for(let py=0;py<size;py++)for(let px=0;px<size;px++){
   const nx=(px+.5)*2/size-1,ny=(py+.5)*2/size-1,rr=nx*nx+ny*ny,o=(py*size+px)*4;
   if(rr>=1)continue;
   const nz=Math.sqrt(1-rr),longitude=Math.atan2(nx,nz)+angle;
   const u=longitude/(2*Math.PI)+.5,v=.5+Math.asin(ny)/Math.PI;
   const sx=(u-Math.floor(u))*1024,sy=v*511,x0=Math.floor(sx),y0=Math.floor(sy),x1=(x0+1)%1024,y1=Math.min(511,y0+1),tx=sx-x0,ty=sy-y0;
   const a=(y0*1024+x0)*4,b=(y0*1024+x1)*4,d=(y1*1024+x0)*4,e=(y1*1024+x1)*4;
   const light=.23+.77*Math.max(0,-.28*nx-.24*ny+.93*nz),shade=light*(.87+.13*nz);
   for(let channel=0;channel<3;channel++){
    const top=source[a+channel]!*(1-tx)+source[b+channel]!*tx,bottom=source[d+channel]!*(1-tx)+source[e+channel]!*tx;
    pixels[o+channel]=(top*(1-ty)+bottom*ty)*shade;
   }
   pixels[o+3]=255*smooth((1-Math.sqrt(rr))*size/3.2);
  }
  cached.canvas.getContext('2d')!.putImageData(cached.image,0,0);return cached.canvas;
 }
 private disk(x:number,y:number,r:number,index:number){
  const c=this.ctx;if(r<.1)return;
  if(index>=2){const color=index===2?'#ffce74':'#ff9d50',halo=c.createRadialGradient(x,y,r*.99,x,y,r*1.10);halo.addColorStop(0,color+'45');halo.addColorStop(.4,color+'12');halo.addColorStop(1,color+'00');c.fillStyle=halo;c.fillRect(x-r*1.1,y-r*1.1,r*2.2,r*2.2);c.drawImage(this.stellarMap(index),x-r,y-r,r*2,r*2);return;}
  const globe=this.planetMap(index);
  if(globe){c.drawImage(globe,x-r,y-r,r*2,r*2);if(index===0){c.strokeStyle='#9acfe033';c.lineWidth=Math.max(1,r*.018);c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();}return;}
  const g=c.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);g.addColorStop(0,index===0?'#86bad1':'#d9bb9a');g.addColorStop(1,index===0?'#173748':'#775643');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
 }
 private paint(surfaceOnly=false){
  if(this.disposed||this.root.hidden)return;const width=this.canvas.clientWidth;if(!width)return;const height=this.canvas.clientHeight||300,dpr=Math.min(devicePixelRatio||1,2),c=this.ctx,w=this.words;
  if(this.canvas.width!==Math.round(width*dpr)||this.canvas.height!==Math.round(height*dpr)){this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);}c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#08111f';c.fillRect(0,0,width,height);
  const comparing=this.chapter==='compare',index=Math.max(0,Math.min(lastPair,Math.round(this.pair))),solar=comparing&&this.solar&&index>=1;
  if(!surfaceOnly){
  this.surfaceButton.hidden=!comparing;
  this.homeTransport.hidden=comparing;
  this.homeCues.hidden=comparing;
  this.pairs.parentElement!.hidden=!comparing;this.homePath.hidden=comparing;this.homeAside.hidden=comparing;this.solarButton.hidden=index<1;this.solarButton.textContent=solar?w.pairView:w.solarView;this.solarButton.setAttribute('aria-pressed',String(solar));
  (this.slider.parentElement!.parentElement!).hidden=!comparing;this.slider.parentElement!.hidden=solar;this.cards.hidden=!comparing||!solar&&Math.abs(this.pair-Math.round(this.pair))>1e-5;
  this.canvas.setAttribute('aria-label',solar?`${w.names[index+1]}. ${w.orbitBoundary}`:comparing?w.compareAlt:`${w.homeNames[this.home]}. ${w.homeAlt}`);
  this.title.textContent=comparing?w.pairTitles[index]!:w.homeTitles[this.home]!;
  this.note.textContent=this.childSummary?.()??(comparing?w.pairNotes[index]!+(solar?' '+w.orbitIntro:''):w.homeNotes[this.home]!);this.boundary.textContent=solar?w.orbitBoundary:comparing?w.boundary:w.homeBoundary[this.home]!;
  this.estimate.hidden=!comparing||index<5&&!solar;this.estimateText.textContent=[index>=5?w.estimateNotes[index-5]:'',solar?w.orbitDetails:''].filter(Boolean).join(' ');
  this.onward.textContent=comparing?w.goHomes:w.goZoom;this.source.href=comparing?(stellarEstimateSources[bodies[index+1]!.id]??'https://science.nasa.gov/sun/facts/'):w.homeSources[this.home]!;
  this.slider.value=String(this.pair);this.previous.disabled=this.pair<=0;this.next.disabled=this.pair>=lastPair;
  this.pairs.setAttribute('aria-label',solar?w.chooseStar:w.choosePair);
  [...this.pairs.options].forEach((option,i)=>{option.textContent=solar?w.names[i+1]!:w.pairs[i]!;option.disabled=solar&&i===0;option.hidden=solar&&i===0;});
  this.pairs.value=String(index);const routePosition=homeRoutePosition(this.home),side=homeSideViews.includes(this.home as typeof homeSideViews[number]);
  [...this.homes.children].forEach((b,i)=>{b.setAttribute('aria-pressed',String(homeRoute[i]===this.home));(b as HTMLElement).classList.toggle('is-context',side&&i===routePosition);});
  [...this.sideViews.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(homeSideViews[i]===this.home)));
  if(!comparing){const selected=this.homes.children[routePosition] as HTMLElement;this.homes.scrollLeft=selected.offsetLeft-this.homes.offsetLeft-(this.homes.clientWidth-selected.clientWidth)/2;}
  this.homePrevious.textContent=side?w.homeReturn.replace('{{name}}',w.homeNames[homeContext(this.home)]!):w.homePrevious;
  this.homePrevious.disabled=!side&&routePosition===0;this.homeNext.hidden=side;this.homeNext.disabled=routePosition===homeRoute.length-1;
  this.homeProgress.textContent=(side?w.homeSideProgress:w.homeProgress).replace('{{current}}',String(routePosition+1)).replace('{{total}}',String(homeRoute.length));
  if(!comparing)this.homeCues.replaceChildren(...w.homeCues[this.home]!.map(cue=>{const item=make('div');item.append(make('strong',cue.label),make('span',cue.detail));return item;}));
  this.cards.classList.toggle('orbit-readings',solar);
  }
  if(solar)this.drawSolarSystem(index+1,width,height,!surfaceOnly);
  else if(comparing){
   for(const [i,b] of comparisonFrame(this.pair,width,height).entries()){if(b.opacity===0)continue;c.globalAlpha=b.opacity;const y=height*.6-b.radius*.2;this.disk(b.x,y,b.radius,i);if(b.opacity>.1&&b.x+b.radius>0&&b.x-b.radius<width){c.font='12px system-ui';c.textAlign='center';c.fillStyle='#e5eef5';c.fillText(w.names[i]!,Math.max(32,Math.min(width-40,b.x)),Math.min(height-16,y+b.radius+20));}c.globalAlpha=1;}
   if(!surfaceOnly){const entries=[index,index+1].map(i=>{const card=make('div');card.append(make('strong',w.names[i]!),make('span',w.kinds[i]!),make('span',i>=6?w.roughSunDiameters.replace('{{count}}',String(Math.round(bodies[i]!.radius/bodies[2]!.radius))):`${w.diameter} ${(bodies[i]!.radius*2).toLocaleString(undefined,{maximumSignificantDigits:3})} km`));return card;});this.cards.replaceChildren(...entries);}
  }else this.membership.draw(c,width,height,this.home,w);
 }
 /** A counterfactual size overlay. Orbital radii and the stellar outline share one linear ruler. */
 private drawSolarSystem(index:number,width:number,height:number,updateCards=true){
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
  if(!updateCards)return;
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
 dispose(){this.stop();this.pauseSurface();this.disposed=true;this.observer.disconnect();this.maps.forEach(i=>i.onload=null);this.planetMaps.clear();this.stellarMaps.clear();this.membership.dispose();this.canvas.width=this.canvas.height=0;}
}
