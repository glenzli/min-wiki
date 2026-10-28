import copy from './explorationContent.json';

/** Places the original Reader controls with the current scene; owns only caption and focus lifetime. */
export class ExplorationGuide {
  private element=document.createElement('div');
  private cue=document.createElement('span');
  private tools=document.createElement('div');
  private back=document.createElement('button');
  private explanation?:HTMLElement;
  private frame=0;
  private disposed=false;
  private words:typeof copy.en;
  constructor(private root:HTMLElement,private control:HTMLButtonElement,depth:HTMLElement,language:string){
    this.words=language==='en'?copy.en:copy.zh;
    this.element.className='cosmic-lesson-guide';this.element.dataset.readerCaption='';this.element.append(this.cue,control);
    this.tools.className='cosmic-explanation-tools';this.back.className='cosmic-return-scene';this.back.textContent=this.words.backToScene;
    for(const button of depth.querySelectorAll<HTMLButtonElement>('button[data-mode]'))button.textContent=button.dataset.mode==='academic'?this.words.readingAcademic:this.words.readingKids;
    this.tools.append(this.back,depth);
    this.back.onclick=()=>{cancelAnimationFrame(this.frame);if(control.getAttribute('aria-expanded')==='true')control.click();this.element.scrollIntoView({block:'start',behavior:'instant'});control.focus({preventScroll:true});};
    control.addEventListener('click',this.reveal);
  }
  private reveal=()=>{
    cancelAnimationFrame(this.frame);this.frame=0;
    if(innerWidth>760||this.control.getAttribute('aria-expanded')!=='true')return;
    const target=this.explanation;
    this.frame=requestAnimationFrame(()=>{this.frame=0;if(this.disposed||document.hidden||this.explanation!==target||this.control.getAttribute('aria-expanded')!=='true')return;target?.scrollIntoView({block:'start',behavior:'instant'});this.back.focus({preventScroll:true});});
  };
  show(row:HTMLElement,explanation:HTMLElement,action:string){
    if(this.disposed)return;
    if(this.element.parentElement!==row)row.append(this.element);
    if(this.tools.parentElement!==explanation)explanation.prepend(this.tools);
    this.explanation=explanation;
    const cue=`${this.words.tryLabel}${this.root.ownerDocument.documentElement.dataset.language==='en'?': ':'：'}${action}`;
    if(this.cue.textContent!==cue)this.cue.textContent=cue;
  }
  dispose(){if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);this.control.removeEventListener('click',this.reveal);}
}
