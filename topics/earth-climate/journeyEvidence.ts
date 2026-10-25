import type {ClimateState} from './model';
import type {regionSnapshot} from './journeyModel';

const noise=(n:number)=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v);};
const dots=Array.from({length:260},(_,i)=>({x:45+noise(i*3)*550,y:40+noise(i*3+1)*245,r:.35+noise(i*3+2)*1.2}));
const speckle=(color:string)=>dots.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${color}"/>`).join('');
type Point={x:number;y:number};
function cellField(columns:number,rows:number,seed:number){
  const centers=Array.from({length:columns*rows},(_,id)=>({x:30+(id%columns+.5+(noise(id*7+seed)-.5)*.65)*574/columns,y:25+(Math.floor(id/columns)+.5+(noise(id*11+seed)-.5)*.6)*257/rows}));
  return centers.map((center,id)=>{
    let points:Point[]=[{x:30,y:25},{x:604,y:25},{x:604,y:282},{x:30,y:282}];
    centers.forEach((other,j)=>{
      if(j===id)return;const nx=other.x-center.x,ny=other.y-center.y,limit=(other.x**2+other.y**2-center.x**2-center.y**2)/2,next:Point[]=[];
      for(let k=0;k<points.length;k++){
        const a=points[k],b=points[(k+1)%points.length],da=a.x*nx+a.y*ny-limit,db=b.x*nx+b.y*ny-limit;
        if(da<=0)next.push(a);if(da*db<0){const t=da/(da-db);next.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
      }
      points=next;
    });return{center,points,id};
  });
}
const seaCells=cellField(8,5,17),snowCells=cellField(10,6,43);
function cellPath(cell:typeof seaCells[number],amount:number,round:boolean){
  const points=cell.points.map(p=>({x:cell.center.x+(p.x-cell.center.x)*amount,y:cell.center.y+(p.y-cell.center.y)*amount}));
  if(!round)return points.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')+'Z';
  const mid=(a:Point,b:Point)=>`${(a.x+b.x)/2} ${(a.y+b.y)/2}`;
  return`M${mid(points.at(-1)!,points[0])}`+points.map((p,i)=>`Q${p.x} ${p.y} ${mid(p,points[(i+1)%points.length])}`).join(' ')+'Z';
}
export function evidenceDrawing(mode:ClimateState['evidenceMode'],progress:number) {
  const t=Math.max(0,Math.min(1,progress/100));let drawing='';
  const frame='<path d="M30 25H604L628 46V303H54L30 282Z" fill="#a4a7a0"/><path d="M30 25H604V282H30Z" fill="#dfe7e4"/>';
  if(mode==='seaice'){
    drawing='<path d="M30 25H604V282H30Z" fill="#42788c"/>';
    for(const cell of seaCells){
      const id=cell.id;
      drawing+=`<path data-material-id="A-P1-ice-${id}" d="${cellPath(cell,.22+.775*t,false)}" fill="${['#cfdfdf','#edf4ed','#c1d8de','#deebe8','#d1e5e8'][id%5]}" stroke="#91b6c2" stroke-width="1.2"/>`;
    }
    for(let i=0;i<13;i++){
      const x=55+i*42;
      drawing+=`<path data-material-id="A-P1-brine-${i}" d="M${x} 38q${(noise(i+2)-.5)*50} 48 ${noise(i)*18} 93t${(noise(i+6)-.5)*20} 132" fill="none" stroke="#2d677f" stroke-width="${(i%4===0?7:12)*(1-.68*t)}" opacity=".72"/>`;
      if(i%4===0)drawing+=`<ellipse cx="${x+8}" cy="${105+i*8}" rx="${4+3*t}" ry="${10-4*t}" fill="#29647d" stroke="#98c7d2"/>`;
      if(i%3===0&&t>.45)drawing+=`<circle data-material-id="A-P1-export-${i}" cx="${x}" cy="${284+(t-.45)*36}" r="3.5" fill="#2d6a85"/>`;
    }
    drawing+=speckle('#eef8f326');
  }else if(mode==='snow'){
    drawing='<path d="M30 25H604V282H30Z" fill="#5c8392"/>';
    for(const cell of snowCells){
      const id=cell.id,corner=cell.points[1];
      drawing+=`<path data-material-id="A-P2-grain-${id}" d="${cellPath(cell,.65+.35*t,true)}" fill="${['#e7eeea','#cfdee0','#deece8','#eef5ed'][id%4]}" stroke="#f5fcf5" stroke-width="1.5"/>`;
      if(id%3===0)drawing+=`<ellipse data-material-id="A-P2-air-${id}" cx="${corner.x*.83+cell.center.x*.17}" cy="${corner.y*.83+cell.center.y*.17}" rx="${10*(1-t)+2}" ry="${7*(1-t)+1.8}" fill="#608799" stroke="#b3d0d7" stroke-width="1"/>`;
    }
    drawing+=speckle('#f7fff126');
  }else if(mode==='sediment'){
    drawing='<path d="M30 25H604V282H30Z" fill="#a69b81"/><path d="M30 55Q200 71 604 55V102Q350 123 30 99Z" fill="#c5b99c"/><path d="M30 107Q210 123 604 106V130H30Z" fill="#8b826d"/>';
    for(let i=0;i<120;i++){
      const x=47+noise(i*3)*536,y=143+noise(i*3+1)*122,r=i%11===0?13+noise(i)*14:1+noise(i*3+2)*5;
      drawing+=`<ellipse data-material-id="A-P3-clast-${i}" cx="${x}" cy="${y}" rx="${r}" ry="${r*(.45+noise(i+4)*.4)}" transform="rotate(${noise(i+7)*120} ${x} ${y})" fill="${['#777d75','#d3c7af','#5d6864','#b9b6a5'][i%4]}" stroke="#6e715f" stroke-width=".6"/>`;
    }
    drawing+=speckle('#575b4138');
  }else if(mode==='scratches'){
    drawing='<path d="M30 25H604V282H30Z" fill="#9da8a3"/>'+speckle('#36443c4a');
    for(let i=0;i<49;i++){
      const y=35+i*4.9,dx=noise(i+5)*55;
      drawing+=`<path data-material-id="A-P4-groove-${i}" d="M${45+dx} ${y}Q310 ${y+25} ${570-dx/2} ${y+42}" stroke="${i%4?'#71837d':'#d8e0d7'}" opacity="${.3+.7*t}" stroke-width="${i%7===0?3.1:.8}" fill="none"/>`;
    }
  }else{
    drawing='<path d="M235 37Q320 7 405 37V265Q320 299 235 265Z" fill="#b9d4da" stroke="#7298a5" stroke-width="2"/>';
    for(let i=0;i<40;i++){
      const y=43+i*5.5;
      drawing+=`<path data-material-id="A-P5-layer-${i}" d="M238 ${y}Q319 ${y+20+noise(i)*4} 402 ${y}" fill="none" stroke="${i%6?'#e6f1ec':'#789caa'}" stroke-width="${i%6?1:3}"/>`;
    }
    for(let i=0;i<30;i++)drawing+=`<circle data-material-id="A-P5-bubble-${i}" cx="${246+noise(i*3)*144}" cy="${52+noise(i*3+1)*207}" r="${1.5+noise(i+7)*2.3}" fill="#f1f7f2" stroke="#9ebfc9" opacity="${.4+.6*t}"/>`;
    drawing+='<ellipse cx="320" cy="37" rx="85" ry="19" fill="#d6e9e9" stroke="#7298a5"/>';
  }
  const cover=['sediment','scratches','core'].includes(mode)&&t<1?`<rect data-observation-cover x="${30+574*t}" y="25" width="${574*(1-t)}" height="257" fill="#c7d0c9" opacity=".94"/>`:'';
  return frame+drawing+cover;
}

export function regionDrawing(snapshot:ReturnType<typeof regionSnapshot>) {
  let sea='<path d="M20 124H430V218H20Z" fill="#4b879b"/><path d="M22 125Q200 118 430 125" stroke="#b9d8df" fill="none" stroke-width="3"/>';
  if(snapshot.inside)for(let i=0;i<6;i++){
    const x=30+i*58,y=118+(i%2)*3;
    sea+=`<path data-sea-ice="${i}" d="M${x} ${y}l15 -8 36 3 8 12 -15 7 -36 -3Z" fill="#dcecf0" stroke="#8db7c6"/><path d="M${x+5} ${y+3}l40 1 -9 12 -22 -3Z" fill="#a5c9d6"/>`;
  }
  return `<rect width="760" height="240" fill="#e5efed"/>${sea}<path d="M422 218V127L477 119L536 79L592 42L649 94L734 138V218Z" fill="#a7afa2" stroke="#6e8179"/><path d="M541 78L592 42L628 78L601 69L584 78L569 64Z" fill="#f1f5ec"/><path d="M570 88Q553 126 492 132" stroke="#d8edf0" stroke-width="18" fill="none"/><circle cx="425" cy="123" r="7" fill="#c18a35" stroke="#fff0c7" stroke-width="3"/><text x="422" y="104" font-size="21" fill="#77521e">A</text><path d="M300 190H360M350 181L360 190L350 199" stroke="#d3e6e9" stroke-width="2" fill="none"/><path d="M586 92L558 113M559 103L558 113L568 113" stroke="#6d9dae" fill="none" stroke-width="2"/>`;
}
