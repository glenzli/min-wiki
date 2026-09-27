import copy from './content.json';
import { DEFAULT_EXPERIMENT, createLiveComparison, frameAt, separation, STEP, type Experiment } from './model.ts';
import { type Comparison } from './runner.ts';
import { ThreeBodyScene } from './scene.ts';
type Text=(value:{zh:string;en:string})=>string;
const element=<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text='')=>{const node=document.createElement(tag);node.className=className;node.textContent=text;return node;};
const PRESETS=['eight','triangle','wander'] as const;

/** Owns user-started live integration, bounded history review, and visible-page lifetime. */
export class ThreeBodyExperiment {
  readonly root=element('section','observatory three-body');
  readonly notes=element('aside','stellar-notes');
  private draft:Experiment={...DEFAULT_EXPERIMENT};
  private result?:Comparison;
  private scene?:ThreeBodyScene;
  private active=false;
  private disposed=false;
  private live?:ReturnType<typeof createLiveComparison>;
  private playing=false;
  private frame=0;
  private index=0;
  private clock=0;
  private last=0;
  private lastReadout=0;
  private status=element('p','three-status');
  private compareNote=element('p','three-compare-note');
  private presetNote=element('p','scale-note');
  private readings=element('div','readouts three-readouts');
  private conditions=element('div','three-conditions');
  private scrub=element('input');
  private overlay=element('input');
  private play=element('button');
  private rewind=element('button');
  private presets:HTMLButtonElement[]=[];
  constructor(private text:Text){
    const heading=element('div','scene-heading'),titles=element('div');titles.append(element('p','eyebrow',this.u('context')),element('h2','',this.u('title')));heading.append(titles);const intro=element('p','scale-note',this.u('intro'));this.root.append(heading,intro);
    const controls=element('div','three-presets');
    for(const preset of PRESETS){const button=element('button','',this.u(preset));button.onclick=()=>{this.draft={...DEFAULT_EXPERIMENT,preset};this.overlay.checked=preset==='wander';this.syncInputs();this.invalidate();};this.presets.push(button);controls.append(button);}
    heading.append(controls);

    this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');this.root.append(this.status);
    const canvas=element('canvas','three-canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',this.u('legend'));this.root.append(canvas);
    const fallback=element('p','scale-note',this.u('fallback'));fallback.hidden=true;
    try{this.scene=new ThreeBodyScene(canvas,this.u('center'),this.u('preview'));}catch{canvas.hidden=true;fallback.hidden=false;}
    const playback=element('div','controls three-playback');this.play.textContent=this.u('play');this.play.onclick=()=>this.toggle();this.rewind.textContent=this.u('rewind');this.rewind.onclick=()=>this.invalidate();const time=element('label','three-time',this.u('scrub'));this.scrub.type='range';this.scrub.min='0';this.scrub.step='1';this.scrub.value='0';this.scrub.oninput=()=>{const index=Number(this.scrub.value);this.pause();this.index=index;this.paint();};time.append(this.scrub);playback.append(this.play,this.rewind,time);
    const compare=element('label','three-overlay');this.overlay.type='checkbox';this.overlay.checked=false;this.overlay.onchange=()=>this.paint();compare.append(this.overlay,this.u('compare'));playback.append(compare);
    this.compareNote.textContent=this.u('compareNote');
    const legend=element('p','scale-note',this.u('legend')),scale=element('p','scale-note',this.u('scale'));
    const crossing=element('p','three-encounter',this.u('crossing'));
    this.root.append(playback,legend,crossing,scale,this.readings);
    const explanation=element('article','explanation');for(const key of ['units','method','limits','interpretation','errorDefinition'] as const)explanation.append(element('p',key==='limits'||key==='interpretation'?'boundary':'',this.u(key)));
    explanation.append(element('p','boundary',this.u('collision')));const collisionSource=element('a','',this.u('collisionSource'));collisionSource.href='https://science.nasa.gov/asset/hubble/too-close-for-comfort/';collisionSource.target='_blank';collisionSource.rel='noreferrer';explanation.append(collisionSource);
    const details=element('details','three-initial'),summary=element('summary','',this.u('initial'));details.append(summary,element('p','',this.u('initialNote')),this.conditions);explanation.append(details);
    const sources=element('p','three-sources',this.u('sources')+': ');for(const [label,url]of [['Montgomery / Simó','https://people.ucsc.edu/~rmont/Nbdy/NbdyC1.html'],['Chenciner & Montgomery (2000)','https://arxiv.org/abs/math/0011268'],['Stone & Leigh (2019)','https://www.nature.com/articles/s41586-019-1833-8'],['Velocity-Verlet','https://fb15.pages.uni-marburg.de/ag-von-domaros/teaching/molecular-dynamics/core_algorithms.html']]){const link=element('a','',label);link.href=url!;link.target='_blank';link.rel='noreferrer';sources.append(link,' ');}explanation.append(sources);this.root.append(explanation);
    const stage=element('div','stellar-stage');
    this.notes.append(intro,this.presetNote,this.readings,explanation);
    stage.append(heading,this.status,this.compareNote,canvas,fallback,playback,legend,crossing,scale);this.root.append(stage,this.notes);
    this.syncInputs();this.invalidate();
  }
  private u(key:keyof typeof copy){return this.text(copy[key]);}
  private syncInputs(){this.presets.forEach((b,i)=>b.setAttribute('aria-pressed',String(this.draft.preset===PRESETS[i])));this.presetNote.textContent=this.u(this.draft.preset==='wander'?'wanderNote':'presetNote');}
  private invalidate(){
    this.pause();this.live=createLiveComparison(this.draft);this.result=this.live.result;this.index=0;this.clock=0;
    this.scene?.setData(this.result,this.draft.preset==='wander'?400:180);this.status.textContent=this.u('modified');this.play.disabled=false;this.rewind.disabled=false;
    this.showConditions();this.paint();
  }
  private showConditions(){const result=this.result;if(!result)return;this.conditions.replaceChildren(...([['base',result.base],['perturbed',result.perturbed]] as const).map(([name,trajectory])=>{const group=element('div');group.append(element('h4','',this.u(name)));for(const [i,b]of trajectory.initial.entries()){const row=element('pre');row.textContent=String.fromCharCode(65+i)+'  m='+b.mass.toFixed(2)+'\n(x, y)   '+b.x.toFixed(8)+', '+b.y.toFixed(8)+'\n(vx, vy) '+b.vx.toFixed(8)+', '+b.vy.toFixed(8);group.append(row);}return group;}));}
  private paint(refresh=true){const result=this.result;if(!result)return;this.index=Math.max(0,Math.min(result.count-1,this.index));this.scrub.max=String(result.count-1);this.scrub.disabled=result.count<2;this.scrub.value=String(this.index);this.play.disabled=Boolean(this.live?.done&&this.index===result.count-1);this.compareNote.hidden=!this.overlay.checked;this.scene?.show(this.index,this.overlay.checked);if(!refresh)return;const a=frameAt(result.base,this.index),b=frameAt(result.perturbed,this.index),format=(v:number)=>v===0?'0':v.toExponential(2);
    const pair=(n:number)=>this.u('base')+' '+format(a[n]!)+' / '+this.u('perturbed')+' '+format(b[n]!);
    const maximum=(which:'base'|'perturbed')=>{let max=0;for(let i=0;i<=this.index;i++)max=Math.max(max,frameAt(result[which],i)[14]!);return max;};
    const rows:[string,string][]= [[this.u('time'),a[0]!.toFixed(2)+' / '+frameAt(result.base,result.count-1)[0]!.toFixed(2)+' T₀'],[this.u('energy'),this.u('base')+' '+format(a[14]!)+' / '+format(maximum('base'))+' · '+this.u('perturbed')+' '+format(b[14]!)+' / '+format(maximum('perturbed'))],[this.u('momentum'),pair(15)],[this.u('drift'),pair(16)],[this.u('separation'),format(separation(a,b))],[this.u('distance'),pair(17)]];
    this.readings.replaceChildren(...rows.map(([label,value])=>{const div=element('div');div.append(element('span','',label),element('strong','',value));return div;}));
  }
  private toggle(){if(this.playing){this.pause();return;}if(!this.result||!this.active||this.disposed||document.hidden)return;if(this.live?.done&&this.index>=this.result.count-1)return;this.status.textContent=this.u('ready');this.playing=true;this.clock=0;this.last=performance.now();this.play.textContent=this.u('pause');this.play.setAttribute('aria-pressed','true');this.frame=requestAnimationFrame(now=>this.tick(now));}
  private tick(now:number){
    this.frame=0;if(!this.playing||!this.active||!this.result||!this.live||document.hidden){this.pause();return;}
    this.clock+=Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;
    if(this.index<this.result.count-1){
      const frames=Math.floor(this.clock/.02);this.clock-=frames*.02;this.index=Math.min(this.result.count-1,this.index+frames);
    }else if(!this.live.done){
      const steps=Math.min(50,Math.floor(this.clock/STEP));this.clock-=steps*STEP;if(steps>0)this.live.advance(steps);
      this.index=this.result.count-1;
    }else{this.pause();return;}
    const refresh=now-this.lastReadout>=200||this.live.done;this.paint(refresh);if(refresh)this.lastReadout=now;
    if(this.live.done&&this.index===this.result.count-1){this.pause();this.status.textContent=this.u([this.result.base.reason,this.result.perturbed.reason].includes('close-encounter')?'close':'accuracy');}
    if(this.playing)this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  pause(){if(this.playing)this.status.textContent=this.u('paused');this.playing=false;cancelAnimationFrame(this.frame);this.frame=0;this.play.textContent=this.u('play');this.play.setAttribute('aria-pressed','false');if(this.result)this.paint();}
  setActive(active:boolean){this.active=active;this.root.hidden=!active;if(!active)this.suspend();else this.paint();}
  setSurfaceTime(time:number){if(this.active)this.scene?.setSurfaceTime(time);}
  suspend(){this.pause();}
  dispose(){this.disposed=true;this.suspend();this.scene?.dispose();this.result=undefined;this.live=undefined;}
}
