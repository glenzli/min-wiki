import content from './comparisonContent.json';
import navigationWords from './content.json';
import {bodies,lastPair,homeRoute,homeSideViews,homeContext,homeRoutePosition,stepHomeRoute,comparisonFrame,stellarOrbitFrame,stellarEstimateSources,diameterComparison,type Chapter} from './comparisonModel.ts';
import {clamp,smooth} from './model.ts';
import earthMap from '../solar-system/assets/2k_earth_daymap.webp';
import jupiterMap from '../solar-system/assets/2k_jupiter.webp';
import { MembershipScene } from './membershipScene.ts';
import { drawPlanetGlyph } from './planetGlyph.ts';
import type {Membership3D} from './membership3d.ts';
import {paintSolarDisk,solarSurfacePhase,SOLAR_SURFACE_STYLE} from './solarSurfaceModel.ts';

type Words=typeof content.zh;
const make=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const el=document.createElement(tag);el.textContent=text;el.className=className;return el;};
/** Owns the finite comparison animation and schematic membership drawings, independent of the physical camera. */
export class ComparisonJourney {
 readonly visual=make('div','','comparison-visual');
 private words:Words;private canvas=make('canvas');private ctx:CanvasRenderingContext2D;private observer:ResizeObserver;
 private pair=0;private home=0;private chapter:Chapter='compare';private frame=0;private destination:number|null=null;private disposed=false;
 private title=make('h2');private note=make('p');private boundary=make('p','','comparison-boundary');private cards=make('div','','comparison-readings');
 private slider=make('input');private pairs=make('select');private homes=make('nav','','comparison-buttons');private sideViews=make('nav','','comparison-side-buttons');
 private homePath=make('div','','comparison-home-path');private homeAside=make('div','','comparison-home-aside');
 readonly caseNavigation=make('div','','comparison-case-navigation');
 private solarButton=make('button');private solar=false;private estimate=make('details');private estimateText=make('p');
 private previous=make('button');private next=make('button');private onward=make('button');private source=make('a');
 private homePrevious=make('button');private homeNext=make('button');private homeProgress=make('span');private homeTransport=make('div','','comparison-transport comparison-home-transport');
 private fullReference=make('button');
 private homeCues=make('div','','comparison-home-cues');
 private childSummary?:()=>string;
 private membershipGpu?:Membership3D;private membershipModule?:typeof import('./membership3d.ts');private membershipLoading=false;private membershipFailed=false;
 private membershipStatus=make('div','','membership-status');private membershipStatusText=make('span');private membershipRetry=make('button');private membershipHint=make('p','','membership-hint');private homeReset=make('button');
 private homeTop=make('button');private homeEdge=make('button');private homeViews=make('div','','membership-views');
 private ratioTask=make('div','','comparison-ratio-task');private ratioQuestion=make('span');private ratioButton=make('button');private ratioResult=make('span');private checkedPairs=new Set<number>();
 private surfaceButton=make('button');private surfaceTime=0;private surfaceFrame=0;private surfaceLast=0;private surfacePaint=0;private surfacePlaying=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 private maps:HTMLImageElement[]=[];private planetMaps=new Map<number,{canvas:HTMLCanvasElement;image:ImageData;source:ImageData;phase:number}>();private stellarMaps=new Map<number,{canvas:HTMLCanvasElement;image:ImageData;phase:number}>();private membership=new MembershipScene();
 constructor(private root:HTMLElement,language:string,private changed:(pair:number,home:number)=>void,private navigate:(chapter:Chapter,target?:'trappist-1'|'galaxy-comparison')=>void){
  this.words=language==='en'?content.en:content.zh;const w=this.words;this.caseNavigation.dataset.readerActions='';this.homes.dataset.readerControls='';this.sideViews.dataset.readerControls='';
  this.ctx=this.canvas.getContext('2d')!;this.canvas.className='comparison-canvas';this.canvas.setAttribute('role','img');
  this.visual.tabIndex=0;this.visual.setAttribute('role','group');this.visual.append(this.canvas,this.membershipStatus);this.membershipStatus.setAttribute('role','status');this.membershipStatus.append(this.membershipStatusText,this.membershipRetry);this.membershipRetry.textContent=w.membershipRetry;this.membershipRetry.onclick=()=>{if(this.membershipGpu)this.membershipGpu.retry();else{this.membershipFailed=false;this.ensureMembership();}this.paint();};this.membershipHint.id='membership-view-hint';this.membershipHint.textContent=(language==='en'?navigationWords.navigation.en:navigationWords.navigation.zh).viewHint;
  this.pairs.setAttribute('aria-label',w.choosePair);w.pairs.forEach((name,i)=>{const option=make('option',name);option.value=String(i);this.pairs.append(option);});
  this.pairs.onchange=()=>this.animate(Number(this.pairs.value));
  this.solarButton.onclick=()=>{const selected=this.destination??Math.round(this.pair);this.stop();this.solar=!this.solar;if(this.solar){this.pair=selected;this.changed(this.pair,this.home);}this.paint();};
  this.homes.setAttribute('aria-label',w.homeRouteLabel);this.sideViews.setAttribute('aria-label',w.homeSideLabel);
  homeRoute.forEach(i=>{const b=make('button',w.homeNames[i]!);b.onclick=()=>{this.home=i;this.changed(this.pair,this.home);this.paint();};this.homes.append(b);});
  homeSideViews.forEach((i,n)=>{const b=make('button',w.homeSideNames[n]!);b.onclick=()=>{this.home=i;this.changed(this.pair,this.home);this.paint();};this.sideViews.append(b);});
  this.homePath.append(make('p',w.homeRouteLabel),this.homes);
  this.homeAside.append(make('p',w.homeSideLabel),this.sideViews);
  const heading=make('div','','comparison-heading'),choices=make('div','','comparison-choices');choices.dataset.readerActions='';choices.dataset.readerControls='';choices.append(this.pairs,this.solarButton);this.surfaceButton.onclick=()=>this.setSurface(!this.surfacePlaying);heading.append(this.title);this.caseNavigation.append(choices,this.homePath,this.homeAside);
  const label=make('label',w.scrub);this.slider.type='range';this.slider.min='0';this.slider.max=String(lastPair);this.slider.step='any';this.slider.setAttribute('aria-label',w.scrub);label.append(this.slider);
  this.slider.oninput=()=>{this.stop();this.pair=Number(this.slider.value);this.changed(this.pair,this.home);this.paint();};
  this.previous.textContent=w.previous;this.previous.onclick=()=>this.animate(Math.max(0,Math.ceil(this.pair)-1));
  this.next.textContent=w.next;this.next.onclick=()=>this.animate(Math.min(lastPair,Math.floor(this.pair)+1));
  this.homePrevious.textContent=w.homePrevious;this.homeNext.textContent=w.homeNext;
  const stepHome=(change:number)=>{this.home=stepHomeRoute(this.home,change);this.changed(this.pair,this.home);this.paint();};
  this.homePrevious.onclick=()=>{if(homeSideViews.includes(this.home as typeof homeSideViews[number])){this.home=homeContext(this.home);this.changed(this.pair,this.home);this.paint();}else stepHome(-1);};this.homeNext.onclick=()=>stepHome(1);
  this.homeProgress.className='comparison-home-progress';this.homeReset.textContent=w.membershipReset;this.homeReset.onclick=()=>this.membershipGpu?.reset();
  this.homeTop.textContent=w.membershipTop;this.homeTop.onclick=()=>this.membershipGpu?.setView('top');this.homeEdge.textContent=w.membershipEdge;this.homeEdge.onclick=()=>this.membershipGpu?.setView('edge');
  this.homeViews.setAttribute('role','group');this.homeViews.setAttribute('aria-label',w.membershipAngles);this.homeViews.append(this.homeTop,this.homeEdge,this.homeReset);this.homeTransport.append(this.homePrevious,this.homeProgress,this.homeNext,this.homeViews);
  this.fullReference.onclick=()=>this.navigate('galaxies',this.home===0?'trappist-1':'galaxy-comparison');this.homeTransport.append(this.fullReference);
  this.onward.onclick=()=>this.navigate(this.chapter==='compare'?'systems':'zoom');
  this.source.textContent=w.source;this.source.target='_blank';this.source.rel='noreferrer';
  const controls=make('div','','comparison-transport');controls.append(this.previous,label,this.next,this.surfaceButton);
  this.ratioResult.setAttribute('aria-live','polite');this.ratioButton.onclick=()=>{const index=Math.round(this.pair);if(this.checkedPairs.has(index))this.checkedPairs.delete(index);else this.checkedPairs.add(index);this.paint();};this.ratioTask.append(this.ratioQuestion,this.ratioButton,this.ratioResult);
  const copy=make('div','','comparison-copy');copy.dataset.readerSupport='';this.estimate.append(make('summary',w.estimateDetails),this.estimateText);copy.append(this.note,this.estimate,this.source,this.onward);
  const credit=make('a',w.credit,'comparison-credit');credit.href='https://www.solarsystemscope.com/textures/';credit.target='_blank';credit.rel='noreferrer';
  copy.append(credit);root.append(heading,this.caseNavigation,this.visual,this.cards,this.ratioTask,controls,this.homeTransport,this.membershipHint,this.homeCues,this.boundary,copy);
  this.observer=new ResizeObserver(()=>this.paint());this.observer.observe(this.canvas);
  for(const url of [earthMap,jupiterMap]){const image=new Image();image.onload=()=>{if(!this.disposed)this.paint();};image.src=url;this.maps.push(image);}
  this.setSurface(this.surfacePlaying);
 }
 show(chapter:Chapter,pair:number,home:number){if(this.chapter!==chapter)this.stop();this.chapter=chapter;this.pair=pair;this.home=home;this.root.hidden=chapter!=='compare'&&chapter!=='homes';this.pairs.parentElement!.hidden=chapter!=='compare';this.homePath.hidden=chapter!=='homes';this.homeAside.hidden=chapter!=='homes';if(chapter==='homes')this.membershipGpu?.setSolarPhase(this.solarPhase);this.membershipGpu?.setActive(chapter==='homes'&&!document.hidden);if(chapter!=='compare')this.pauseSurface();this.paint();}
 setChildSummary(summary:()=>string){this.childSummary=summary;this.paint();}
 get solarPhase(){return solarSurfacePhase(this.surfaceTime);}
 pauseSurface(){this.setSurface(false);}
 private ensureMembership(){
  if(this.membershipGpu||this.membershipLoading||this.membershipFailed||this.chapter!=='homes'||document.hidden||this.disposed)return;
  if(this.membershipModule){this.membershipLoading=true;this.membershipGpu=new this.membershipModule.Membership3D(this.visual,this.words,this.words===content.en?'en':'zh',failed=>{this.membershipFailed=failed;this.membershipStatusText.textContent=failed?this.words.membershipFallback:this.words.membership3d;this.membershipRetry.hidden=!failed;for(const button of [this.homeTop,this.homeEdge,this.homeReset])button.disabled=failed;if(failed)this.paint();},this.homeViews);this.membershipLoading=false;this.membershipGpu.setSolarPhase(this.solarPhase);this.membershipGpu.setActive(true);this.membershipGpu.show(this.home);return;}
  this.membershipLoading=true;void import('./membership3d.ts').then(module=>{if(this.disposed)return;this.membershipModule=module;this.membershipLoading=false;this.ensureMembership();this.paint();}).catch(()=>{if(this.disposed)return;this.membershipLoading=false;this.membershipFailed=true;this.paint();});
 }
 private setSurface(active:boolean){this.surfacePlaying=active;cancelAnimationFrame(this.surfaceFrame);this.surfaceFrame=0;this.surfaceButton.textContent=active?this.words.pauseSurface:this.words.playSurface;this.surfaceButton.setAttribute('aria-pressed',String(active));if(active&&!this.disposed&&!document.hidden){this.surfaceLast=performance.now();this.surfaceFrame=requestAnimationFrame(now=>this.tickSurface(now));}}
 private tickSurface(now:number){this.surfaceFrame=0;if(!this.surfacePlaying||this.disposed||document.hidden||this.chapter!=='compare')return;this.surfaceTime+=Math.min(.1,(now-this.surfaceLast)/1000);this.surfaceLast=now;if(now-this.surfacePaint>=160){this.surfacePaint=now;this.paint(true);}this.surfaceFrame=requestAnimationFrame(t=>this.tickSurface(t));}
 stop(){cancelAnimationFrame(this.frame);this.frame=0;this.destination=null;}
 private animate(target:number){this.stop();if(this.solar||matchMedia('(prefers-reduced-motion: reduce)').matches){this.pair=target;this.changed(this.pair,this.home);this.paint();return;}this.destination=target;const from=this.pair;let elapsed=0,last=performance.now();const tick=(now:number)=>{this.frame=0;if(this.disposed||document.hidden){this.destination=null;return;}elapsed+=Math.min(.08,(now-last)/1000);last=now;this.pair=from+(target-from)*smooth(Math.min(1,elapsed/1.1));this.changed(this.pair,this.home);this.paint();if(elapsed<1.1)this.frame=requestAnimationFrame(tick);else this.destination=null;};this.frame=requestAnimationFrame(tick);}
 /** Object-bound evolving photosphere illustration; speed and surface detail are not calibrated measurements. */
 private stellarMap(index:number){
  const phase=Math.floor(this.surfaceTime*6)/6,size=320;let cached=this.stellarMaps.get(index);if(cached?.phase===phase)return cached.canvas;
  if(!cached){const canvas=make('canvas');canvas.width=canvas.height=size;cached={canvas,image:canvas.getContext('2d')!.createImageData(size,size),phase:NaN};this.stellarMaps.set(index,cached);}
  const map=cached.canvas,context=map.getContext('2d')!,image=cached.image,p=image.data;cached.phase=phase;
  if(index===2){paintSolarDisk(p,size,phase);context.putImageData(image,0,0);return map;}
  const hash=(x:number,y:number,z:number)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;};
  const noise=(x:number,y:number,z:number)=>{const a=Math.floor(x),b=Math.floor(y),d=Math.floor(z);x-=a;y-=b;z-=d;const u=x*x*(3-2*x),v=y*y*(3-2*y),w=z*z*(3-2*z);let n=0;for(let k=0;k<2;k++)for(let j=0;j<2;j++)for(let i=0;i<2;i++)n+=hash(a+i,b+j,d+k)*(i?u:1-u)*(j?v:1-v)*(k?w:1-w);return n;};
  for(let py=0;py<size;py++)for(let px=0;px<size;px++){
   const x=(px+.5)*2/size-1,y=(py+.5)*2/size-1,rr=x*x+y*y,o=(py*size+px)*4;if(rr>=1)continue;
   const nz=Math.sqrt(1-rr),a=phase*.05,sx=x*Math.cos(a)+nz*Math.sin(a),z=nz*Math.cos(a)-x*Math.sin(a),scale=55;
   const broad=noise(sx*9+7+phase*.04,y*9,z*9),warp=noise(sx*18,y*18+3+phase*.05,z*18);
   const fine=noise(sx*scale+warp*2,y*scale+phase*.2,z*scale+phase*.12),micro=noise(sx*scale*2,y*scale*2+phase*.15,z*scale*2);
   const cell=clamp((fine-.23)*1.8,0,1),limb=.58+.42*Math.pow(nz,.55);
   let light=limb*(.64+.38*cell+.16*broad+.07*micro);
   p[o]=255*Math.min(1,light*1.18);p[o+1]=161*light*(.85+.15*cell);p[o+2]=75*light*(.72+.28*cell);p[o+3]=Math.min(255,(1-Math.sqrt(rr))*size*255);
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
  if(index>=2){const s=SOLAR_SURFACE_STYLE,colour=index===2?s.haloColour:[255,157,80],halo=c.createRadialGradient(x,y,r*s.haloInner,x,y,r*s.haloOuter);for(const [stop,alpha]of s.haloStops)halo.addColorStop(stop,`rgba(${colour.join(',')},${alpha})`);c.fillStyle=halo;c.fillRect(x-r*s.haloOuter,y-r*s.haloOuter,r*2*s.haloOuter,r*2*s.haloOuter);c.drawImage(this.stellarMap(index),x-r,y-r,r*2,r*2);return;}
  const globe=this.planetMap(index);
  if(globe){c.drawImage(globe,x-r,y-r,r*2,r*2);if(index===0){c.strokeStyle='#9acfe033';c.lineWidth=Math.max(1,r*.018);c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();}return;}
  const g=c.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);g.addColorStop(0,index===0?'#86bad1':'#d9bb9a');g.addColorStop(1,index===0?'#173748':'#775643');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
 }
 private paint(surfaceOnly=false){
  if(this.disposed||this.root.hidden)return;const width=this.visual.clientWidth;if(!width)return;const height=this.visual.clientHeight||300,dpr=Math.min(devicePixelRatio||1,2),c=this.ctx,w=this.words;
  if(this.canvas.width!==Math.round(width*dpr)||this.canvas.height!==Math.round(height*dpr)){this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);}c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#030812';c.fillRect(0,0,width,height);
  const comparing=this.chapter==='compare',index=Math.max(0,Math.min(lastPair,Math.round(this.pair))),solar=comparing&&this.solar&&index>=1;
  if(!comparing)this.ensureMembership();
  if(!surfaceOnly){
  this.surfaceButton.hidden=!comparing;
  this.homeTransport.hidden=comparing;
  this.fullReference.hidden=comparing||this.home>1;this.fullReference.textContent=this.home===0?w.otherSystems:w.otherGalaxies;
  this.homeCues.hidden=comparing;
  this.membershipStatus.hidden=comparing;this.membershipHint.hidden=comparing;this.visual.classList.toggle('membership-active',!comparing);this.visual.setAttribute('aria-label',comparing?w.compareAlt:`${w.homeNames[this.home]}. ${w.membershipStage}`);if(comparing)this.visual.removeAttribute('aria-describedby');else this.visual.setAttribute('aria-describedby',this.membershipHint.id);
  this.membershipStatusText.textContent=this.membershipFailed?w.membershipFallback:w.membership3d+(this.membershipLoading?'…':'');this.membershipRetry.hidden=!this.membershipFailed;for(const button of [this.homeTop,this.homeEdge,this.homeReset])button.disabled=!this.membershipGpu?.ready;
  this.pairs.parentElement!.hidden=!comparing;this.homePath.hidden=comparing;this.homeAside.hidden=comparing;this.solarButton.hidden=index<1;this.solarButton.textContent=solar?w.pairView:w.solarView;this.solarButton.setAttribute('aria-pressed',String(solar));
  (this.slider.parentElement!.parentElement!).hidden=!comparing;this.slider.parentElement!.hidden=solar;this.cards.hidden=!comparing||!solar&&Math.abs(this.pair-Math.round(this.pair))>1e-5;
  this.canvas.setAttribute('aria-label',solar?`${w.names[index+1]}. ${w.orbitBoundary}`:comparing?w.compareAlt:`${w.homeNames[this.home]}. ${w.homeAlt}`);
  this.title.textContent=comparing?w.pairTitles[index]!:w.homeTitles[this.home]!;
  this.note.textContent=this.childSummary?.()??(comparing?w.pairNotes[index]!+(solar?' '+w.orbitIntro:''):w.homeNotes[this.home]!);this.boundary.textContent=solar?w.orbitBoundary:comparing?w.boundary:w.homeBoundary[this.home]!;
  this.estimate.hidden=!comparing||index<5&&!solar;this.estimateText.textContent=[index>=5?w.estimateNotes[index-5]:'',solar?w.orbitDetails:''].filter(Boolean).join(' ');
  this.onward.textContent=comparing?w.goSystems:w.goZoom;this.source.href=comparing?(stellarEstimateSources[bodies[index+1]!.id]??'https://science.nasa.gov/sun/facts/'):w.homeSources[this.home]!;
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
  const stable=Math.abs(this.pair-index)<1e-5,checked=this.checkedPairs.has(index),trial=diameterComparison(index);
  this.ratioTask.hidden=!comparing||solar||!stable;
  this.ratioQuestion.textContent=w.ratioQuestion.replace('{{small}}',w.names[index]!).replace('{{large}}',w.names[index+1]!);
  this.ratioButton.textContent=checked?w.estimateAgain:w.checkRatio;this.ratioButton.setAttribute('aria-pressed',String(checked));
  this.ratioResult.hidden=!checked;this.ratioResult.textContent=checked?w.ratioResult.replaceAll('{{small}}',w.names[index]!).replaceAll('{{large}}',w.names[index+1]!).replace('{{ratio}}',trial.ratio.toLocaleString(undefined,{maximumSignificantDigits:3})):'';
  }
  if(solar)this.drawSolarSystem(index+1,width,height,!surfaceOnly);
  else if(comparing){
   const frame=comparisonFrame(this.pair,width,height);
   for(const [i,b] of frame.entries()){if(b.opacity===0)continue;c.globalAlpha=b.opacity;const y=height*.6-b.radius*.2;this.disk(b.x,y,b.radius,i);if(b.opacity>.1&&b.x+b.radius>0&&b.x-b.radius<width){c.font='13px system-ui';c.textAlign='center';c.fillStyle='#e5eef5';c.fillText(w.names[i]!,Math.max(32,Math.min(width-40,b.x)),Math.min(height-16,y+b.radius+20));}c.globalAlpha=1;}
   if(this.checkedPairs.has(index)&&Math.abs(this.pair-index)<1e-5){const unit=frame[index]!.radius*2;for(const [j,color] of [[index,'#99deea'],[index+1,'#ffe2a0']] as const){const body=frame[j]!,left=body.x-body.radius,right=body.x+body.radius,y=Math.max(10,height*.6-body.radius*1.2-9);c.strokeStyle=color;c.lineWidth=1.5;c.beginPath();c.moveTo(left,y);c.lineTo(right,y);for(let x=left;x<right-.5;x+=unit){c.moveTo(x,y-4);c.lineTo(x,y+4);}c.moveTo(right,y-4);c.lineTo(right,y+4);c.stroke();}}
   if(!surfaceOnly){const entries=[index,index+1].map(i=>{const card=make('div');card.append(make('strong',w.names[i]!),make('span',w.kinds[i]!),make('span',i>=6?w.roughSunDiameters.replace('{{count}}',String(Math.round(bodies[i]!.radius/bodies[2]!.radius))):`${w.diameter} ${(bodies[i]!.radius*2).toLocaleString(undefined,{maximumSignificantDigits:3})} km`));return card;});this.cards.replaceChildren(...entries);}
  }else{if(!this.membershipGpu?.ready)this.membership.draw(c,width,height,this.home,w,this.solarPhase);this.membershipGpu?.show(this.home);}
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
   // These marks locate unresolved planets; a filled disk would invent a diameter on this ruler.
   c.strokeStyle=colors[i]!;c.lineWidth=1.5;c.beginPath();c.moveTo(x-3,y);c.lineTo(x+3,y);c.moveTo(x,y-3);c.lineTo(x,y+3);c.stroke();
   if(i>=4){c.font='13px system-ui';c.textAlign='center';c.fillStyle='#f4eadb';c.fillText(w.planetNames[i]!,x,y+(i===4?-15:24));}
  }
  c.strokeStyle='#ffffff';c.lineWidth=1;c.beginPath();c.moveTo(cx-4,cy);c.lineTo(cx+4,cy);c.moveTo(cx,cy-4);c.lineTo(cx,cy+4);c.stroke();
  c.fillStyle='#f7d7ac';c.font='13px system-ui';c.textAlign='left';c.fillText(`${w.names[index]} · ${w.estimated}`,12,20,width-24);
  c.textAlign='center';c.fillStyle='#aec6d5';c.font='12px system-ui';c.fillText(w.sunPlace,cx,height-7,width-20);
  if(!updateCards)return;
  const planetCards=geometry.orbits.map((orbit,i)=>{
   const card=make('div'),name=make('strong'),icon=make('canvas');icon.width=icon.height=46;icon.setAttribute('aria-hidden','true');const p=icon.getContext('2d')!;p.scale(2,2);
   drawPlanetGlyph(p,11.5,11.5,i,6);
   card.className=orbit.inside?'inside':'outside';name.append(icon,document.createTextNode(w.planetNames[i]!));card.append(name,make('span',orbit.inside?w.inside:w.outside));return card;
  });
  this.cards.replaceChildren(...planetCards);
 }
 dispose(){this.stop();this.pauseSurface();this.disposed=true;this.observer.disconnect();this.maps.forEach(i=>i.onload=null);this.planetMaps.clear();this.stellarMaps.clear();this.membership.dispose();this.membershipGpu?.dispose();this.canvas.width=this.canvas.height=0;}
}
