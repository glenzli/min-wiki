import {lessonRoutes,routeNames,lessonSteps,scaleParent,journeyCopy,type LessonSelection,type LessonRoute,type LessonStep} from './journeyRoutes.ts';

/** Four questions own navigation; renderers retain their objects, clocks and exact old routes. */
export class JourneyNavigation{
 readonly element=document.createElement('nav');
 private routes=new Map<LessonRoute,HTMLButtonElement>();
 private steps=new Map<string,HTMLButtonElement>();
 private main=document.createElement('div');
 private related=document.createElement('div');
 private relatedCaption=document.createElement('span');
 private mobile=document.createElement('select');
 private mobileRoute?:LessonRoute;
 private captionFrame=0;
 private captionObserver:MutationObserver;
 private words:typeof journeyCopy.en;
 constructor(primary:HTMLElement,language:string,private choose:(selection:LessonSelection,step:LessonStep,resume?:boolean)=>void,private refreshCaption:()=>void){
  const lang=language==='en'?'en':'zh';this.words=journeyCopy[lang];this.element.className='cosmic-journey-steps';this.element.dataset.readerControls='';this.element.dataset.readerActions='single-line';this.element.setAttribute('aria-label',this.words.steps);
  for(const route of lessonRoutes){const button=document.createElement('button');button.textContent=routeNames[route][lang];button.dataset.lessonRoute=route;button.onclick=()=>{if(button.getAttribute('aria-pressed')!=='true')this.choose({route,step:lessonSteps[route][0]!.id},lessonSteps[route][0]!,true);};primary.append(button);this.routes.set(route,button);}
  this.main.className='cosmic-journey-main';this.related.className='cosmic-journey-related';this.related.setAttribute('role','group');this.related.setAttribute('aria-label',this.words.related);this.related.append(this.relatedCaption);
  for(const route of lessonRoutes)for(const step of lessonSteps[route]){const button=document.createElement('button');button.textContent=step.name[lang];button.dataset.lessonStep=step.id;button.onclick=()=>this.choose({route,step:step.id},step);this.steps.set(`${route}:${step.id}`,button);(step.parent?this.related:this.main).append(button);}
  this.mobile.className='cosmic-journey-mobile';this.mobile.setAttribute('aria-label',this.words.stepChoice);this.mobile.onchange=()=>{const step=lessonSteps[this.mobileRoute!].find(item=>item.id===this.mobile.value)!;this.choose({route:this.mobileRoute!,step:step.id},step);};
  this.element.append(this.main,this.related,this.mobile);
  // The shared header can reparent the original chooser after a panel switch.
  // Refresh through its public owner once its visibility/ownership really changes.
  this.captionObserver=new MutationObserver(records=>{if(records.some(record=>record.type==='attributes'?(record.target as Element).contains(primary):[...record.addedNodes].some(node=>node instanceof Element&&node.contains(primary))))this.queueCaption();});
  this.captionObserver.observe(primary.closest('[data-reader-workbench]')!,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 }
 private queueCaption(){cancelAnimationFrame(this.captionFrame);this.captionFrame=requestAnimationFrame(()=>{this.captionFrame=0;this.refreshCaption();});}
 show(row:HTMLElement,selection:LessonSelection){
  const moved=this.element.parentElement!==row;if(moved)row.prepend(this.element);
  const parent=scaleParent(selection),hasRelated=lessonSteps[selection.route].some(step=>step.parent===parent.id),lang=this.words===journeyCopy.en?'en':'zh';
  for(const [route,button] of this.routes){const pressed=String(route===selection.route);if(button.getAttribute('aria-pressed')!==pressed)button.setAttribute('aria-pressed',pressed);}
  for(const route of lessonRoutes)for(const step of lessonSteps[route]){const button=this.steps.get(`${route}:${step.id}`)!;const hidden=route!==selection.route||!!step.parent&&step.parent!==parent.id;if(button.hidden!==hidden)button.hidden=hidden;const pressed=String(route===selection.route&&step.id===(step.parent?selection.step:parent.id));if(button.getAttribute('aria-pressed')!==pressed)button.setAttribute('aria-pressed',pressed);}
  if(this.related.hidden===hasRelated)this.related.hidden=!hasRelated;const caption=`${parent.name[lang]} · ${this.words.related}`;if(this.relatedCaption.textContent!==caption)this.relatedCaption.textContent=caption;const hidden=selection.route==='flight';if(this.element.hidden!==hidden)this.element.hidden=hidden;
  if(this.mobileRoute!==selection.route){this.mobileRoute=selection.route;this.mobile.replaceChildren();for(const root of lessonSteps[selection.route].filter(step=>!step.parent)){const children=lessonSteps[selection.route].filter(step=>step.parent===root.id),group=document.createElement('optgroup');group.label=root.name[lang];for(const step of [root,...children]){const option=document.createElement('option');option.value=step.id;option.textContent=step.name[lang];(children.length?group:this.mobile).append(option);}if(children.length)this.mobile.append(group);}}
  this.mobile.value=selection.step;
  if(moved)this.queueCaption();
 }
 dispose(){this.captionObserver.disconnect();cancelAnimationFrame(this.captionFrame);this.mobile.onchange=null;for(const button of [...this.routes.values(),...this.steps.values()])button.onclick=null;this.element.remove();}
}
