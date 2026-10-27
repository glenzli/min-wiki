/** Presentation choices for the retained anatomy scene, without a second clock. */
export function anatomyGuideState(part:string,guides:boolean){return {geometry:part==='horizon',shadow:guides&&(part==='horizon'||part==='shadow'),disk:guides&&(part==='disk'||part==='lensing'),source:guides&&part==='lensing',path:part==='lensing'};}

export interface LightPathWords {title:string;geometry:string;image:string;source:string;observer:string;note:string;description:string;}
const escapes:Record<string,string>={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const escape=(text:string)=>text.replace(/[&<>"']/g,char=>escapes[char]!);

/** A labelled qualitative side-section, separate from the ray-rendered main image. */
export function lightPathFigure(words:LightPathWords){
 const figure=document.createElement('figure');figure.className='anatomy-light-path';figure.hidden=true;
 const caption=document.createElement('figcaption');caption.textContent=words.title;
 const drawing=document.createElementNS('http://www.w3.org/2000/svg','svg');drawing.setAttribute('viewBox','0 0 360 155');drawing.setAttribute('role','img');drawing.setAttribute('aria-label',words.description);
 drawing.innerHTML=`<defs><marker id="anatomy-ray-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L8 4L0 8" fill="#ffe2a0"/></marker></defs>
  <text x="119" y="18" text-anchor="middle" fill="#c8dae6">${escape(words.geometry)}</text><text x="311" y="18" text-anchor="middle" fill="#c8dae6">${escape(words.image)}</text>
  <path d="M18 83H191" stroke="#8aaaba" stroke-width="3"/><circle cx="117" cy="83" r="17" fill="#030812" stroke="#89aabb"/>
  <path d="M34 83C72 14 173 17 231 83M34 83C72 151 173 148 231 83" fill="none" stroke="#ffe2a0" stroke-width="2" marker-end="url(#anatomy-ray-arrow)"/>
  <circle cx="34" cy="83" r="4.5" fill="#ffe2a0"/><text x="19" y="114" fill="#ffe2a0">${escape(words.source)}</text>
  <path d="M225 83Q235 72 245 83Q235 94 225 83Z" fill="#162b3a" stroke="#c8dae6"/><circle cx="235" cy="83" r="3" fill="#c8dae6"/><text x="234" y="114" text-anchor="middle" fill="#c8dae6">${escape(words.observer)}</text>
  <path d="M266 28V132" stroke="#334b5b" stroke-dasharray="3 4"/><circle cx="312" cy="83" r="23" fill="#030812" stroke="#759bad"/>
  <path d="M286 83H337" stroke="#759bad"/><circle cx="312" cy="49" r="4.5" fill="#ffe2a0"/><circle cx="312" cy="117" r="4.5" fill="#ffe2a0"/><text x="324" y="53" fill="#ffe2a0">A′</text><text x="324" y="121" fill="#ffe2a0">A′</text>`;
 const note=document.createElement('p');note.textContent=words.note;figure.append(caption,drawing,note);return figure;
}
