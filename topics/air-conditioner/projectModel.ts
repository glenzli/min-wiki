export type Chapter='air'|'fridge'|'room';
export function readChapter(search:string):Chapter {
 const value=new URLSearchParams(search).get('chapter');
 return value==='fridge'||value==='room'?value:'air';
}
/** Preserve unknown parameters and hash; deployment base is supplied by the platform. */
export function coolingHref(chapter:Chapter,search='',hash=''){
 const params=new URLSearchParams(search);params.set('chapter',chapter);
 return '/topics/air-conditioner/?'+params.toString()+hash;
}
export type HeatPlacement='outside'|'same-room';
/** Independent cycle-accounting example, not either appliance's fluid or room-temperature model. */
export function boundaryBalance(work:number,placement:HeatPlacement){
 const w=Math.max(0,Math.min(3,Number.isFinite(work)?work:1)),cold=3*w,hot=cold+w;
 return {cold,work:w,hot,roomNet:placement==='outside'?-cold:hot-cold};
}
