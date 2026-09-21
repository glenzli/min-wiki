export type MotionChapter='slide'|'contact'|'braking'|'restraints';
export function readMotionChapter(search:string):MotionChapter{
 const chapter=new URLSearchParams(search).get('chapter');
 return chapter==='contact'||chapter==='braking'||chapter==='restraints'?chapter:'slide';
}
export function motionHref(chapter:MotionChapter,search='',hash=''){
 const params=new URLSearchParams(search);params.set('chapter',chapter);
 return '/topics/friction/?'+params.toString()+hash;
}
export function legacyCarChapter(hash:string):MotionChapter{
 return /belt|fit|seat|protection|restraint/i.test(hash)?'restraints':'braking';
}
export type ContactMode='rolling'|'sliding';
/** Kinematic contact comparison only: no road coefficient or brake-force prediction. */
export function wheelContact(progress:number,mode:ContactMode){
 const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0)),radius=60,distance=250*p;
 const angle=mode==='rolling'?distance/radius:0;
 return {distance,radius,angle,centerX:120+distance,markX:120+distance-radius*Math.sin(angle),markY:125+radius*Math.cos(angle),slipRatio:mode==='rolling'?0:1};
}
