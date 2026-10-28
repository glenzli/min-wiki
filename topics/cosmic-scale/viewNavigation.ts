import {clamp,halfWidthKm,originStart,progressFor,type Origin} from './model.ts';

/** View magnification belongs to the non-metric studies, never to their objects. */
export const VIEW_ZOOM={min:.75,max:1.8} as const;
export const viewZoom=(value=1)=>Number.isFinite(value)?Math.max(VIEW_ZOOM.min,Math.min(VIEW_ZOOM.max,value)):1;
export const wheelMagnification=(delta:number,mode=0)=>Math.exp(-Math.max(-120,Math.min(120,Number.isFinite(delta)?delta*(mode===1?16:mode===2?320:1):0))*.002);
/** Physical zoom consumes a ratio by moving the existing kilometre ruler. */
export function magnifyJourney(progress:number,origin:Origin,factor:number){
 if(!Number.isFinite(factor)||factor<=0)return progress;
 return Math.max(originStart(origin),clamp(progressFor(halfWidthKm(progress)/factor)));
}

/** Wheel, keyboard and two-pointer input; no animation, camera or scientific state. */
export class MagnificationInput {
 private pointers=new Map<number,{x:number;y:number}>();private distance=0;
 constructor(private host:HTMLElement,private active:()=>boolean,private change:(factor:number,checkpoint:boolean)=>boolean){
  host.addEventListener('wheel',this.wheel,{passive:false});host.addEventListener('keydown',this.key);
  host.addEventListener('pointerdown',this.down,true);host.addEventListener('pointermove',this.move,true);
  host.addEventListener('pointerup',this.end,true);host.addEventListener('pointercancel',this.end,true);host.addEventListener('lostpointercapture',this.end,true);
 }
 get pinching(){return this.pointers.size>=2;}
 private gap(){const points=[...this.pointers.values()];return points.length<2?0:Math.hypot(points[0]!.x-points[1]!.x,points[0]!.y-points[1]!.y);}
 private wheel=(event:WheelEvent)=>{if(this.active()&&this.change(wheelMagnification(event.deltaY,event.deltaMode),true))event.preventDefault();};
 private key=(event:KeyboardEvent)=>{if(!this.active()||event.target!==this.host||!['+','=','-','_'].includes(event.key))return;if(this.change(event.key==='-'||event.key==='_'?1/1.15:1.15,true))event.preventDefault();};
 private down=(event:PointerEvent)=>{
  if(!this.active()||event.button!==0||(event.target as HTMLElement)?.closest?.('button'))return;
  this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});this.host.setPointerCapture(event.pointerId);
  if(this.pinching){this.distance=this.gap();event.preventDefault();}
 };
 private move=(event:PointerEvent)=>{
  if(!this.active()||!this.pointers.has(event.pointerId))return;
  this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(!this.pinching)return;
  const distance=this.gap();if(this.distance>4&&distance>4)this.change(distance/this.distance,false);this.distance=distance;event.preventDefault();
 };
 private end=(event:PointerEvent)=>{const pinching=this.pinching;if(!this.pointers.delete(event.pointerId))return;this.distance=this.gap();if(this.host.hasPointerCapture(event.pointerId))this.host.releasePointerCapture(event.pointerId);if(pinching&&this.active())this.change(1,true);};
 cancel(){const ids=[...this.pointers.keys()];this.pointers.clear();this.distance=0;for(const id of ids)if(this.host.hasPointerCapture(id))this.host.releasePointerCapture(id);}
 dispose(){this.cancel();this.host.removeEventListener('wheel',this.wheel);this.host.removeEventListener('keydown',this.key);this.host.removeEventListener('pointerdown',this.down,true);this.host.removeEventListener('pointermove',this.move,true);this.host.removeEventListener('pointerup',this.end,true);this.host.removeEventListener('pointercancel',this.end,true);this.host.removeEventListener('lostpointercapture',this.end,true);}
}

export type ZoomWords={zoomIn:string;zoomOut:string;resetZoom:string;zoomLabel:string};
/** One compact, keyboard-accessible control shared by the two structural viewers. */
export class ViewZoomControls {
 readonly element=document.createElement('div');private out=document.createElement('button');private reset=document.createElement('button');private into=document.createElement('button');
 constructor(words:ZoomWords,change:(factor:number)=>void,reset:()=>void){
  this.element.className='view-zoom-controls';this.element.setAttribute('role','group');this.element.setAttribute('aria-label',words.zoomLabel);
  this.out.textContent='−';this.out.setAttribute('aria-label',words.zoomOut);this.out.onclick=()=>change(1/1.15);
  this.into.textContent='+';this.into.setAttribute('aria-label',words.zoomIn);this.into.onclick=()=>change(1.15);
  this.reset.setAttribute('aria-label',words.resetZoom);this.reset.onclick=reset;this.element.append(this.out,this.reset,this.into);this.update(1);
 }
 update(value:number,enabled=true){value=viewZoom(value);this.reset.textContent=`${Math.round(value*100)}%`;this.out.disabled=!enabled||value<=VIEW_ZOOM.min;this.into.disabled=!enabled||value>=VIEW_ZOOM.max;this.reset.disabled=!enabled;}
 dispose(){this.out.onclick=this.reset.onclick=this.into.onclick=null;this.element.remove();}
}
