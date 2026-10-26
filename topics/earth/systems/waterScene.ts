import type {waterFrame} from './model';

let serial=0;
const path=(points:{x:number;y:number}[],close=true)=>points.length?points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join('')+(close?'Z':''):'';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

type Point={x:number;y:number};
const offset=(point:Point):Point=>({x:point.x+29,y:point.y-19});
/** Extrude only the existing section contacts; this does not infer a hidden flow field. */
export function waterContactFaces(frame:ReturnType<typeof waterFrame>){
  const edge=(points:Point[],axis:'x'|'y',value:number)=>points.filter(point=>Math.abs(point[axis]-value)<1e-6);
  const face=(points:Point[],axis:'x'|'y',value:number)=>{
    const contact=edge(points,axis,value).sort((a,b)=>axis==='y'?a.x-b.x:a.y-b.y);
    if(contact.length<2)return [];
    const first=contact[0],last=contact[contact.length-1];
    return Math.hypot(first.x-last.x,first.y-last.y)<1e-6?[]:[first,last,offset(last),offset(first)];
  };
  const contact=(axis:'x'|'y',value:number)=>edge(frame.boundary,axis,value).flatMap(point=>[point,offset(point)]);
  return{parcels:frame.parcels.map(parcel=>({id:parcel.id,top:face(parcel.body,'y',76),side:face(parcel.body,'x',516)})),top:contact('y',76),side:contact('x',516)};
}

/** Retained, fixed-view water section. Colored regions encode identity, not measured temperature. */
export function mountWaterScene(host:HTMLElement,copy:{diagram:string;top:string;bottom:string}){
  const id=`systems-water-${++serial}`;
  host.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 355" role="img" aria-label="${escape(copy.diagram)}">
    <defs>
      <linearGradient id="${id}-air" x2="0" y2="1"><stop stop-color="#edf3ef"/><stop offset="1" stop-color="#d5e2dc"/></linearGradient>
      <linearGradient id="${id}-a" x2="0" y2="1"><stop stop-color="#9bc9c5"/><stop offset="1" stop-color="#497c87"/></linearGradient>
      <linearGradient id="${id}-b" x2="0" y2="1"><stop stop-color="#77b0b9"/><stop offset="1" stop-color="#315f75"/></linearGradient>
      <linearGradient id="${id}-edge" x2="1" y2="0"><stop stop-color="#609198" stop-opacity=".28"/><stop offset="1" stop-color="#d6ebe4" stop-opacity=".68"/></linearGradient>
      <linearGradient id="${id}-depth" x2="0" y2="1"><stop stop-color="#f1fff3" stop-opacity=".08"/><stop offset=".65" stop-color="#133d51" stop-opacity="0"/><stop offset="1" stop-color="#143b4b" stop-opacity=".3"/></linearGradient>
      <radialGradient id="${id}-shadow"><stop stop-color="#506f6b" stop-opacity=".24"/><stop offset="1" stop-color="#506f6b" stop-opacity="0"/></radialGradient>
      <clipPath id="${id}-window"><path d="M84 76H516V285Q516 296 505 296H95Q84 296 84 285Z"/></clipPath>
    </defs>
    <rect width="600" height="355" fill="url(#${id}-air)"/>
    <path d="M0 72Q130 49 241 66T600 53V355H0Z" fill="#d7e2da" opacity=".55"/>
    <ellipse cx="316" cy="318" rx="249" ry="24" fill="url(#${id}-shadow)"/>
    <g data-water-faces="top"><path data-water-top="A" fill="url(#${id}-a)"/><path data-water-top="B" fill="url(#${id}-b)"/><path d="M84 76 113 57H545L516 76Z" fill="#e4f3e8" fill-opacity=".3" stroke="#78a5a8" stroke-width="1.2"/></g>
    <g data-water-faces="side"><path data-water-side="A" fill="url(#${id}-a)"/><path data-water-side="B" fill="url(#${id}-b)"/><path d="M516 76 545 57V277L516 296Z" fill="url(#${id}-edge)" stroke="#82a7a9" stroke-width="1.2"/></g>
    <path data-water-top-contact fill="none" stroke="#edf9f1" stroke-width="1.4" stroke-dasharray="3 3"/>
    <path data-water-side-contact fill="none" stroke="#dcece2" stroke-width="1.4" stroke-dasharray="3 3"/>
    <g clip-path="url(#${id}-window)">
      <path data-water-body="A" fill="url(#${id}-a)"/>
      <path data-water-body="B" fill="url(#${id}-b)"/>
      <path d="M84 76H516V296H84Z" fill="url(#${id}-depth)"/>
      <g fill="none" stroke="#e1f5eb" stroke-width="1.2" opacity=".22">
        <path d="M91 99Q155 91 225 100T365 98 507 100M88 132Q161 125 233 134T378 131 514 132"/>
        <path d="M104 260Q144 251 182 259M380 275Q437 263 501 273M198 283Q240 275 292 281"/>
      </g>
      <path data-water-boundary fill="none" stroke="#dcece2" stroke-width="1.5" stroke-dasharray="3 5" opacity=".6"/>
      <g data-water-marks="A" fill="#a56532" stroke="#f1dbc2" stroke-width="1.1">${Array.from({length:16},(_,i)=>`<circle data-tracer="A-${i}" r="3.3"/>`).join('')}</g>
      <g data-water-marks="B" fill="#d4e6e0" stroke="#204b63" stroke-width="1.15">${Array.from({length:16},(_,i)=>`<path data-tracer="B-${i}" d="M0 -4.2 4.2 0 0 4.2-4.2 0Z"/>`).join('')}</g>
      <g data-water-label="A"><rect x="-18" y="-19" width="36" height="38" rx="18" fill="#fff4e2" fill-opacity=".9" stroke="#9f6331" stroke-width="1.2"/><text x="0" y="8" text-anchor="middle" font-size="23" font-weight="700" style="fill:#754a2c">A</text></g>
      <g data-water-label="B"><path d="M0-24 24 0 0 24-24 0Z" fill="#e1f0eb" fill-opacity=".92" stroke="#2d5b6d" stroke-width="1.2"/><text x="0" y="8" text-anchor="middle" font-size="23" font-weight="700" style="fill:#254e60">B</text></g>
    </g>
    <path d="M84 76V285Q84 296 95 296H505Q516 296 516 285V76" fill="none" stroke="#7ba1a3" stroke-width="2"/>
    <path d="M84 77H516M115 62H535" fill="none" stroke="#edf9f1" stroke-width="2" opacity=".82"/>
    <path d="M91 85V280Q91 288 100 288M523 91V276" fill="none" stroke="#ecf4e9" stroke-width="1.5" opacity=".45"/>
    <g font-size="17" style="fill:#506e70"><text x="49" y="105" text-anchor="middle">${escape(copy.top)}</text><text x="49" y="281" text-anchor="middle">${escape(copy.bottom)}</text></g>
    <path d="M50 122V250m-4-6 4 6 4-6" fill="none" stroke="#7e9a99" stroke-width="1.2"/>
  </svg>`;
  const get=(selector:string)=>host.querySelector<SVGElement>(selector)!;
  const bodies=['A','B'].map(id=>({body:get(`[data-water-body="${id}"]`),top:get(`[data-water-top="${id}"]`),side:get(`[data-water-side="${id}"]`),label:get(`[data-water-label="${id}"]`),marks:Array.from({length:16},(_,i)=>get(`[data-tracer="${id}-${i}"]`))}));
  const boundary=get('[data-water-boundary]');
  const topContact=get('[data-water-top-contact]'),sideContact=get('[data-water-side-contact]');
  return{update(frame:ReturnType<typeof waterFrame>){
    const faces=waterContactFaces(frame);
    frame.parcels.forEach((parcel,i)=>{
      const view=bodies[i];view.body.setAttribute('d',path(parcel.body));view.label.setAttribute('transform',`translate(${parcel.x.toFixed(3)} ${parcel.y.toFixed(3)})`);
      view.top.setAttribute('d',path(faces.parcels[i].top));view.side.setAttribute('d',path(faces.parcels[i].side));
      parcel.tracers.forEach((tracer,j)=>view.marks[j].setAttribute('transform',`translate(${tracer.x.toFixed(3)} ${tracer.y.toFixed(3)})`));
    });
    topContact.setAttribute('d',path(faces.top,false));sideContact.setAttribute('d',path(faces.side,false));
    boundary.setAttribute('d',path(frame.boundary,false));boundary.setAttribute('opacity',frame.tendency==='neutral'?'.18':'.6');
    host.dataset.waterTendency=frame.tendency;host.dataset.waterProgress=String(frame.progress);host.dataset.waterTracers='32';
  }};
}
