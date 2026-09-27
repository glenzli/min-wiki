import {orbitSystemState,type OrbitCase} from './orbitSystems.ts';
import {StellarSurface} from './stellarSurface.ts';
import words from './content.json';

type Text=(value:{zh:string;en:string})=>string;

/** A complete, curated system overview. Planet paths and stellar disks are visibly schematic. */
export function drawOrbitSystem(c:CanvasRenderingContext2D,kind:OrbitCase,time:number,surfaceTime:number,text:Text,surface:StellarSurface,mobile=false){
 const system=orbitSystemState(kind,time),origin={x:mobile?260:520,y:280},scale=kind==='circumbinary'?48:kind==='circumprimary'?70:23;
 const xy=(point:{x:number;y:number})=>({x:origin.x+point.x*scale,y:origin.y+point.y*scale});
 const ring=(x:number,y:number,r:number,color:string,width=1.2)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();};
 const caption=(value:string,x:number,y:number,color='#d4e0e9',size=15)=>{c.font=`500 ${size}px system-ui`;c.textAlign='center';c.fillStyle=color;c.fillText(value,x,y,mobile?470:940);};
 const dot=(x:number,y:number,r:number,color:string)=>{c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
 const primary=system.stars[0]!,secondary=system.stars[1]!,a=xy(primary),b=xy(secondary);
 const barycenter=xy(system.center);
 caption(text(words.orbitCases[kind].sceneLabel),origin.x,42,'#b9cbd6',17);
 if(kind==='circumbinary'){
  for(const radius of [2.15,3.15,4.2])ring(origin.x,origin.y,radius*scale,'#5d9db67a');
  ring(origin.x,origin.y,Math.hypot(primary.x,primary.y)*scale,'#c6a7885c');
  ring(origin.x,origin.y,Math.hypot(secondary.x,secondary.y)*scale,'#c6a7885c');
 }else if(kind==='circumprimary'){
  ring(origin.x,origin.y,Math.hypot(primary.x,primary.y)*scale,'#c6a7885c');
  ring(origin.x,origin.y,Math.hypot(secondary.x,secondary.y)*scale,'#c6a7885c');
  ring(a.x,a.y,.78*scale,'#5d9db69c',1.5);
 }else{
  const innerCenter={x:(primary.x*primary.mass+secondary.x*secondary.mass)/(primary.mass+secondary.mass),y:(primary.y*primary.mass+secondary.y*secondary.mass)/(primary.mass+secondary.mass)};
  const innerScreen=xy(innerCenter),third=system.stars[2]!,outerRadius=Math.hypot(third.x,third.y)*scale;
  ring(origin.x,origin.y,outerRadius,'#89a3bd78');
  ring(origin.x,origin.y,Math.hypot(innerCenter.x,innerCenter.y)*scale,'#c6a7885c');
  ring(innerScreen.x,innerScreen.y,Math.hypot(primary.x-innerCenter.x,primary.y-innerCenter.y)*scale,'#c6a78880');
  ring(innerScreen.x,innerScreen.y,Math.hypot(secondary.x-innerCenter.x,secondary.y-innerCenter.y)*scale,'#c6a78880');
  c.strokeStyle='#a5b6c077';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
  dot(innerScreen.x,innerScreen.y,2.3,'#e5c9a0');
  caption(text(words.ui.innerPair),innerScreen.x,innerScreen.y-34,'#d9c4aa',14);
 }
 for(const planet of system.planets){const p=xy(planet);
  if(kind==='hierarchical'){ring(a.x,a.y,8,'#68bfd5aa');continue;}
  dot(p.x,p.y,planet.id==='p'?5:4,'#8ad6e5');ring(p.x,p.y,7,'#8ad6e566');
  caption(kind==='circumbinary'?planet.id.toUpperCase():text(words.ui.planet),p.x,p.y-12,'#b9e4ed',13);
 }
 const colors=['#ffdfb1','#e6a786','#b8d7e8'];
 system.stars.forEach((star,i)=>{const p=xy(star),radius=kind==='hierarchical'?[11,8,7][i]!:kind==='circumbinary'?[20,13][i]!:[20,13][i]!;
  surface.draw(c,p.x,p.y,radius,colors[i]!,surfaceTime);
  caption(star.id,p.x,p.y-radius-13,'#f0e8da',16);
 });
 c.strokeStyle='#d9c6a388';c.lineWidth=1;c.beginPath();c.moveTo(barycenter.x-7,barycenter.y);c.lineTo(barycenter.x+7,barycenter.y);c.moveTo(barycenter.x,barycenter.y-7);c.lineTo(barycenter.x,barycenter.y+7);c.stroke();
 caption(text(words.ui.center),barycenter.x,barycenter.y+26,'#b7c4cf',13);
 if(kind==='hierarchical'){
  // A planet close to A is subpixel in the whole-system view, so the inset keeps its host identity.
  const box={x:mobile?123:705,y:mobile?590:352,w:274,h:174},planet=system.planets[0]!,angle=Math.atan2(planet.y-primary.y,planet.x-primary.x);
  c.fillStyle='#0d1d2bdd';c.strokeStyle='#3a5b6a';c.lineWidth=1;c.beginPath();c.roundRect(box.x,box.y,box.w,box.h,13);c.fill();c.stroke();
  caption(text(words.ui.hostDetail),box.x+box.w/2,box.y+26,'#c2d5df',14);
  const ax=box.x+box.w/2,ay=box.y+101,pr=48;
  ring(ax,ay,pr,'#5d9db69c',1.5);surface.draw(c,ax,ay,18,colors[0]!,surfaceTime);
  dot(ax+Math.cos(angle)*pr,ay+Math.sin(angle)*pr,5,'#8ad6e5');
  caption('A',ax-31,ay+6,'#f0e8da',14);
  caption(text(words.ui.planet),ax+Math.cos(angle)*pr,ay+Math.sin(angle)*pr-11,'#b9e4ed',12);
  c.strokeStyle='#72b9ca7a';c.setLineDash([3,5]);c.beginPath();c.moveTo(a.x+9,a.y+8);c.lineTo(box.x+28,box.y+5);c.stroke();c.setLineDash([]);
 }
 caption(text(words.orbitCases[kind].bottomLabel),origin.x,540,'#a8b9c5',14);
}
