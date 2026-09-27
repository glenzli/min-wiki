import { language } from '../../src/platform/i18n.ts';
import content from './movementContent.json';
import { flytrapFrame,growthFrame,type PlantCase,type LightDirection } from './movementModel.ts';
import { MovementScene,type MovementDrawing } from './movementScene.ts';
const copy=language==='en'?content.en:content.zh;

/** Owns the two additional experiments and their independent, bounded playback states. */
export function mountMovementStudy(host:HTMLElement,reading:HTMLElement){
  const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const el=document.createElement(tag);el.textContent=text;el.className=className;return el;};
  const states:Record<'flytrap'|'seedling',MovementDrawing>={
    flytrap:{kind:'flytrap',progress:0,detail:false,pattern:'twice',gap:5,direction:'left'},
    seedling:{kind:'seedling',progress:0,detail:false,pattern:'twice',gap:5,direction:'left'},
  };
  let kind:'flytrap'|'seedling'='flytrap',active=false,academic=false,playing=false,frame=0,last=0;
  const theater=node('div','','movement-theater'),notes=node('aside','','movement-notes');
  const heading=node('h2'),latin=node('p','','movement-latin'),views=node('div','','movement-views');
  const whole=node('button',copy.whole),detail=node('button',copy.detail);views.append(whole,detail);
  const canvas=document.createElement('canvas');canvas.setAttribute('role','img');
  const canvasWrap=node('div','','movement-canvas');canvasWrap.append(canvas);
  const error=node('p',copy.error,'error');error.hidden=true;canvasWrap.append(error);
  const controls=node('div','','movement-controls');
  const play=node('button',copy.start,'primary'),pause=node('button',copy.pause),reset=node('button',copy.reset);controls.append(play,pause,reset);
  const progressLabel=node('label',copy.progress,'movement-timeline');
  const progress=document.createElement('input');progress.type='range';progress.min='0';progress.max='1000';progress.value='0';progress.setAttribute('aria-label',copy.progress);
  const elapsed=node('output');progressLabel.append(progress,elapsed);
  const timeNote=node('p','','movement-time-note');
  const options=node('div','','movement-options'),flyOptions=node('div','','movement-presets'),growthOptions=node('div','','movement-presets');
  const presetButtons=[node('button',copy.once),node('button',copy.twice),node('button',copy.late)];flyOptions.append(...presetButtons);
  const lightButtons=([['left',copy.left],['right',copy.right],['both',copy.both]] as const).map(([id,label])=>{const b=node('button',label);b.dataset.direction=id;growthOptions.append(b);return b;});
  const gapLabel=node('label',copy.gap,'movement-gap'),gap=document.createElement('input'),gapValue=node('output');
  gap.type='range';gap.min='1';gap.max='45';gap.value='5';gap.setAttribute('aria-label',copy.gap);gapLabel.append(gap,gapValue);
  options.append(flyOptions,growthOptions,gapLabel);
  const status=node('h3'),story=node('p'),mechanism=node('p','','movement-mechanism'),science=node('p','','movement-science'),formula=node('p','','movement-formula'),hint=node('p',copy.newTrial,'fine');
  const readout=node('p','','movement-readout');readout.setAttribute('aria-live','off');
  notes.append(heading,latin,status,story,mechanism,readout,science,formula,hint);
  theater.append(views,canvasWrap,options,controls,progressLabel,timeNote);host.append(theater,notes);
  let scene:MovementScene|undefined;
  try{scene=new MovementScene(canvas);}catch(errorValue){error.hidden=false;console.error(errorValue);}
  function stop(){playing=false;cancelAnimationFrame(frame);frame=0;}
  function update(){
    const s=states[kind],article=copy[kind];
    heading.textContent=article.question;latin.textContent=article.latin;
    mechanism.textContent=article.mechanism;science.textContent=article.science;science.hidden=!academic;
    formula.hidden=!academic||kind!=='flytrap';formula.textContent=kind==='flytrap'?copy.flytrap.formula:'';
    whole.setAttribute('aria-pressed',String(!s.detail));detail.setAttribute('aria-pressed',String(s.detail));
    flyOptions.hidden=kind!=='flytrap';growthOptions.hidden=kind!=='seedling';gapLabel.hidden=kind!=='flytrap'||s.pattern==='once'||!academic;
    if(kind==='flytrap'){
      const f=flytrapFrame(s.progress,s.pattern,s.gap),text=copy.flytrap.states[f.stage];status.textContent=text[0];story.textContent=text[1];
      elapsed.textContent=`${f.time.toFixed(1)} s`;timeNote.textContent=copy.touchTime;
      readout.textContent=`${copy.touches}: ${f.count} · ${copy.memoryNote}`;
      gap.value=String(s.gap);gapValue.textContent=`${s.gap} s`;
      presetButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===0?s.pattern==='once':s.pattern==='twice'&&(i===1?s.gap<=30:s.gap>30))));
    }else{
      const g=growthFrame(s.progress,s.direction),stage=s.progress===0?'ready':s.direction==='both'?'balanced':s.progress<1?'growing':'grown';
      const text=copy.seedling.states[stage];status.textContent=text[0];story.textContent=text[1];
      elapsed.textContent=`${Math.round(s.progress*100)}%`;timeNote.textContent=copy.growthTime;
      readout.textContent=`${copy.leftSide}: ${g.left.toFixed(2)} · ${copy.rightSide}: ${g.right.toFixed(2)} · ${copy.growthNote}`;
      lightButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.direction===s.direction)));
    }
    play.textContent=s.progress>0&&s.progress<1?copy.resume:copy.start;play.disabled=playing;
    pause.disabled=!playing;progress.value=String(Math.round(s.progress*1000));
    canvas.setAttribute('aria-label',`${article.name}. ${status.textContent}. ${story.textContent}`);
    if(active)scene?.draw(s);
  }
  function tick(now:number){
    frame=0;if(!playing||!active||document.hidden)return;
    const s=states[kind];s.progress=Math.min(1,s.progress+Math.min((now-last)/1000,.1)/12);last=now;
    if(s.progress===1)playing=false;update();if(playing)frame=requestAnimationFrame(tick);
  }
  function trial(){stop();states[kind].progress=0;update();}
  play.addEventListener('click',()=>{if(states[kind].progress===1)states[kind].progress=0;playing=true;last=performance.now();update();frame=requestAnimationFrame(tick);});
  pause.addEventListener('click',()=>{stop();update();});reset.addEventListener('click',trial);
  progress.addEventListener('input',()=>{stop();states[kind].progress=Number(progress.value)/1000;update();});
  whole.addEventListener('click',()=>{states[kind].detail=false;update();});detail.addEventListener('click',()=>{states[kind].detail=true;update();});
  presetButtons.forEach((b,i)=>b.addEventListener('click',()=>{states.flytrap.pattern=i===0?'once':'twice';states.flytrap.gap=i===2?40:5;trial();}));
  gap.addEventListener('input',()=>{states.flytrap.gap=Number(gap.value);trial();});
  lightButtons.forEach(b=>b.addEventListener('click',()=>{states.seedling.direction=b.dataset.direction as LightDirection;trial();}));
  const onVisibility=()=>{if(document.hidden){stop();update();}};document.addEventListener('visibilitychange',onVisibility);
  const onPageHide=(event:PageTransitionEvent)=>{stop();if(!event.persisted)dispose();};window.addEventListener('pagehide',onPageHide);
  function dispose(){stop();scene?.dispose();document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',onPageHide);}
  function select(selected:PlantCase,inDepth:boolean){
    stop();active=selected!=='mimosa';academic=inDepth;
    if(active){kind=selected as 'flytrap'|'seedling';const article=copy[kind];
      const title=node('h2',article.name),intro=node('p',article.intro),boundary=node('p',article.boundary),sources=node('details');sources.append(node('summary',copy.sources));
      for(const ref of content.references){const a=node('a',ref.title);a.href=ref.url;a.target='_blank';a.rel='noreferrer';sources.append(a);}
      reading.replaceChildren(title,intro,boundary,sources);
    }
    update();
  }
  update();return {notes,select,dispose,setAcademic(value:boolean){academic=value;update();}};
}
