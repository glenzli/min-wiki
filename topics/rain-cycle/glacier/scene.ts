import { glacierHead, glacierFoot } from '../watershedModel.ts';
import { columnVolumes, iceTracers, type GlacierState, type Climate } from './model.ts';
const point=(q:number):[number,number]=>[glacierHead[0]+q*(glacierFoot[0]-glacierHead[0])*1.85,glacierHead[1]+q*(glacierFoot[1]-glacierHead[1])*1.42];
const geometry=(extent:number,width:number)=>{
 const top=Array.from({length:40},(_,i)=>{const q=i/39*extent,[x,y]=point(q),w=Math.sin(i/39*Math.PI)**.55*width;return [x-w*.3,y-w*.67];});
 const bottom=Array.from({length:40},(_,i)=>{const q=(39-i)/39*extent,[x,y]=point(q),w=Math.sin((39-i)/39*Math.PI)**.55*width;return [x+w*.3,y+w*.18];});
 return [...top,...bottom].map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join('')+'Z';
};
const colors={snow:'#f6faf0',firn:'#c9ddda',ice:'#75aabd'};
export function glacierPicture(state:GlacierState,climate:Climate){
 const iceWidth=Math.min(22,3+Math.sqrt(state.stores.ice)*3),firnExtent=Math.min(.38,state.stores.firn*.08),snowExtent=Math.min(.27,state.stores.snow*.09);
 const traces=iceTracers(state.year,climate).filter(p=>p.visible).map(p=>{const [x,y]=point(p.distance);return `<path data-ice-tracer="${p.id}" d="M${x-2} ${y-4}l4 3" stroke="#f4fcf6" stroke-width="1.3"/>`;}).join('');
 const end=point(state.extent),previous=point(state.previousExtent);
 const material=state.stores.ice>0?`<path d="${geometry(state.extent,iceWidth)}" fill="url(#glacier-ice)" stroke="#6e97a3" stroke-width=".7"/>`:'';
 return `<defs><linearGradient id="glacier-sky" x2=".3" y2="1"><stop stop-color="#c3dbe3"/><stop offset="1" stop-color="#eee9d5"/></linearGradient><linearGradient id="glacier-rock" x2="1" y2=".7"><stop stop-color="#c7cdbb"/><stop offset=".7" stop-color="#8ea298"/><stop offset="1" stop-color="#657e78"/></linearGradient><linearGradient id="glacier-ice" x2=".8" y2=".5"><stop stop-color="#e1f0ec"/><stop offset=".5" stop-color="#bddadf"/><stop offset="1" stop-color="#71a2b6"/></linearGradient></defs>
 <rect x="80" y="145" width="365" height="220" fill="url(#glacier-sky)"/>
 <path d="M80 273L108 208L177 242L274 158L388 277L450 239V370H80Z" fill="#b2c3b9" opacity=".55"/>
 <path d="M80 355L95 291L182 184L234 219L314 315L404 319L445 371H80Z" fill="url(#glacier-rock)"/>
 <path d="M182 184L210 254L285 297L314 315L234 219Z" fill="#677f7b" opacity=".38"/>
 <path d="M186 212Q216 226 244 263T356 326" fill="none" stroke="#666f6338" stroke-width="35"/>
 <path d="M193 219L208 237L244 267M219 228L258 275M273 282L304 309M300 306L332 334" fill="none" stroke="#dce0c5" stroke-width="1.1" opacity=".5"/>
 <path d="M274 291Q302 308 285 327T365 354" fill="none" stroke="#739fa5" stroke-width="2.5" opacity=".6"/>
 ${material}
 ${state.stores.firn>0?`<path d="${geometry(firnExtent,Math.min(15,2+state.stores.firn*2))}" fill="${colors.firn}"/>`:''}
 ${state.stores.snow>0?`<path d="${geometry(snowExtent,Math.min(15,2+state.stores.snow*3))}" fill="${colors.snow}"/>`:''}
 ${traces}
 ${state.activeIce?`<path d="M${end[0]-7} ${end[1]+7}l16-5" stroke="#376c7d" stroke-width="1.4"/><circle data-terminus cx="${end[0]}" cy="${end[1]}" r="2.2" fill="#274c60"/>`:''}
 ${state.retreating?`<path d="M${previous[0]-7} ${previous[1]+7}l16-5" stroke="#b07753" stroke-width="1.2" stroke-dasharray="2 2"/>`:''}
 <circle cx="227" cy="187" r="7" fill="#fff8e7" stroke="#658990"/><text x="227" y="190" text-anchor="middle" font-size="8" fill="#335c62">5</text>`;
}
export function budgetPicture(state:GlacierState){
 const bars=[...state.history];if(state.year%1>0)bars.push(state.current);
 return `<path d="M16 75H584" stroke="#859e9f" stroke-width="1"/>${bars.map((b,i)=>{const height=Math.abs(b.net)*10,positive=b.net>=0;return `<rect data-budget-year="${b.year}" x="${19+i*14}" y="${positive?75-height:75}" width="9" height="${height}" rx="1.5" fill="${positive?'#509e9f':'#bc825e'}"/>`;}).join('')}<text x="20" y="149" font-size="11" fill="#537273">0</text><text x="563" y="149" font-size="11" fill="#537273">40</text>`;
}
export function layerPicture(state:GlacierState){
 const volumes=columnVolumes(state.stores),scale=1.25;
 let bottom=220;
 const layers=(['ice','firn','snow'] as const).map(kind=>{const height=volumes[kind]*scale;bottom-=height;return `<g data-material="${kind}"><rect x="35" y="${bottom}" width="103" height="${height}" fill="${colors[kind]}" stroke="#65878b" stroke-width=".6"/>${Array.from({length:kind==='snow'?12:kind==='firn'?8:3},(_,i)=>`<circle cx="${44+i%5*20}" cy="${bottom+height*(.15+Math.floor(i/5)*.3)}" r="${Math.min(height*.1,kind==='snow'?3:kind==='firn'?1.8:.6)}" fill="#fbfff7" opacity=".8"/>`).join('')}</g>`;});
 return `<rect x="20" y="20" width="240" height="220" rx="18" fill="#edf1e8"/>${layers.join('')}<path d="M35 224H138" stroke="#817865" stroke-width="4"/>${(['snow','firn','ice'] as const).map((kind,i)=>`<rect x="165" y="${55+i*48}" width="${volumes[kind]*.65}" height="15" fill="${colors[kind]}" stroke="#65878b" stroke-width=".7"/>`).join('')}`;
}
