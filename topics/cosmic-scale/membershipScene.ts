import content from './comparisonContent.json';
import {drawObservableWeb} from './observableWeb.ts';

type Words = typeof content.zh;
type Point = readonly [number, number];

// A repeatable teaching layout, not a sky survey or a physical position catalogue.
const filaments: readonly (readonly [Point,Point,Point,Point])[] = [
 [[-.06,.16],[.26,-.03],[.36,.48],[1.05,.22]],
 [[-.10,.79],[.27,.93],[.39,.24],[1.06,.69]],
 [[.10,-.10],[.02,.35],[.66,.66],[.80,1.10]],
 [[.73,-.10],[.82,.25],[.17,.36],[.15,1.10]],
 [[.42,-.12],[.98,.10],[.32,.71],[.88,1.10]],
];
const knots: readonly (readonly [number,number,number])[] = [[.17,.27,2],[.29,.47,4],[.42,.24,2],[.58,.39,5],[.81,.27,3],[.25,.75,2],[.75,.67,4]];
const noise=(a:number,b:number,c=0)=>{let h=Math.imul(a+101,374761393)^Math.imul(b+73,668265263)^Math.imul(c+17,1274126177);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;};

/** Bounded, deterministic structural illustrations for the non-metric membership chapter. */
export class MembershipScene {
 private galaxyMaps=new Map<number,HTMLCanvasElement>();
 dispose(){this.galaxyMaps.clear();}

 private galaxyMap(kind:number){
  const cached=this.galaxyMaps.get(kind);if(cached)return cached;
  const size=720,map=document.createElement('canvas');map.width=map.height=size;const c=map.getContext('2d')!,im=c.createImageData(size,size),p=im.data;
  const sample=(x:number,y:number)=>{const a=Math.floor(x),b=Math.floor(y);x-=a;y-=b;const u=x*x*(3-2*x),v=y*y*(3-2*y);return noise(a,b,kind)*(1-u)*(1-v)+noise(a+1,b,kind)*u*(1-v)+noise(a,b+1,kind)*(1-u)*v+noise(a+1,b+1,kind)*u*v;};
  const arms=kind===2?3:2;
  for(let py=0;py<size;py++)for(let px=0;px<size;px++){
   const x=(px+.5-size/2)/(size*.47),y=(py+.5-size/2)/(size*.47),r=Math.hypot(x,y),o=(py*size+px)*4;if(r>1.05)continue;
   const theta=Math.atan2(y,x),n=sample(x*32+9,y*32+9),fine=sample(x*120+8,y*120+8),phase=arms*(theta-3.6*Math.log(r+.095));
   const spiral=Math.exp(-((Math.sin(phase/2)/.42)**2)),dust=Math.exp(-((Math.sin((phase+.5)/2)/.18)**2));
   const edge=Math.max(0,1-r*r),disk=Math.exp(-r*2.0)*edge,core=Math.exp(-r*r/(kind===2?.011:.025));
   const bar=kind===0?Math.exp(-x*x/.05-y*y/.0018)*.32:0;
   const cloud=(.62+1.6*spiral*(.35+.65*n))*disk*(.5+.5*fine)*(1-.72*dust*(1-core));
   p[o]=Math.min(255,cloud*185+core*255+bar*190);p[o+1]=Math.min(255,cloud*210+core*218+bar*160);p[o+2]=Math.min(255,cloud*255+core*165+bar*120);p[o+3]=Math.min(255,Math.min(1,edge*3)*255);
  }
  c.putImageData(im,0,0);c.globalCompositeOperation='screen';
  for(let i=0;i<6500;i++){const r=Math.sqrt(noise(i,1,kind))*.94,a=3.6*Math.log(r+.095)+(i%arms)*Math.PI*2/arms+(noise(i,2,kind)-.5)*.5,x=size/2+Math.cos(a)*r*size*.47,y=size/2+Math.sin(a)*r*size*.47,alpha=(1-r)*(.08+noise(i,3,kind)*.33);c.fillStyle=i%19===0?`rgba(255,173,181,${alpha})`:`rgba(182,211,255,${alpha})`;c.beginPath();c.arc(x,y,.25+noise(i,4,kind)*.75,0,7);c.fill();}
  c.globalCompositeOperation='source-over';this.galaxyMaps.set(kind,map);return map;
 }

 private dot(c:CanvasRenderingContext2D,x:number,y:number,r:number,color:string){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
 private tag(c:CanvasRenderingContext2D,value:string,x:number,y:number,width:number){
  c.font=`${width<460?11:12}px system-ui`;c.textAlign='center';const padding=7,tw=Math.min(c.measureText(value).width,width-22),left=Math.max(7,Math.min(width-tw-padding*2-7,x-tw/2-padding));
  c.fillStyle='#071321dc';c.fillRect(left,y-14,tw+padding*2,20);c.fillStyle='#e7edf4';c.fillText(value,left+padding+tw/2,y,tw);
 }
 private marker(c:CanvasRenderingContext2D,x:number,y:number){c.strokeStyle='#ffe29aaa';c.lineWidth=1.5;c.beginPath();c.arc(x,y,8,0,7);c.stroke();this.dot(c,x,y,2.3,'#ffe29a');}
 private galaxy(c:CanvasRenderingContext2D,x:number,y:number,r:number,kind=0,highlight=false){
  c.save();c.translate(x,y);c.rotate(kind===1?-.24:kind===2?.18:-.10);const flatten=kind===1?.40:kind===2?.72:.64;
  const glow=c.createRadialGradient(0,0,r*.12,0,0,r*1.2);glow.addColorStop(0,'#b6c9ef24');glow.addColorStop(1,'#b6c9ef00');c.fillStyle=glow;c.fillRect(-r*1.2,-r*1.2,r*2.4,r*2.4);
  c.globalCompositeOperation='screen';c.drawImage(this.galaxyMap(kind),-r,-r*flatten,r*2,r*flatten*2);
  if(highlight){c.strokeStyle='#ffdc91bb';c.lineWidth=1.2;c.beginPath();c.ellipse(0,0,r*1.03,r*flatten*1.10,0,0,7);c.stroke();}c.restore();
 }
 private dwarf(c:CanvasRenderingContext2D,x:number,y:number,r:number,seed:number){
  const halo=c.createRadialGradient(x,y,0,x,y,r*1.6);halo.addColorStop(0,'#d7dcffc0');halo.addColorStop(.5,'#80acd05a');halo.addColorStop(1,'#80acd000');c.fillStyle=halo;c.beginPath();c.arc(x,y,r*1.6,0,7);c.fill();
  for(let j=0;j<7;j++){const a=noise(seed,j)*Math.PI*2,d=Math.sqrt(noise(seed,j+11))*r*.8;this.dot(c,x+Math.cos(a)*d,y+Math.sin(a)*d,Math.max(.7,r*.08),'#dce6f0b8');}
 }
 private group(c:CanvasRenderingContext2D,x:number,y:number,r:number,seed:number,count:number){
  const glow=c.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,'#9a8bb81f');glow.addColorStop(1,'#6c8eac00');c.fillStyle=glow;c.beginPath();c.arc(x,y,r,0,7);c.fill();
  for(let i=0;i<count;i++){const a=noise(seed,i)*Math.PI*2,rad=r*Math.sqrt(noise(seed+1,i))*.9,px=x+Math.cos(a)*rad,py=y+Math.sin(a)*rad,elliptical=i%11===0;this.dot(c,px,py,elliptical?2.7:1.25,elliptical?'#efdbc0':'#bdd4e7a6');}
  this.dot(c,x,y,Math.max(2.5,r*.06),'#ffdfad');
 }
 private web(c:CanvasRenderingContext2D,width:number,height:number,scale:number){
  const x=(v:number)=>width/2+(v-.5)*width*scale,y=(v:number)=>height*.46+(v-.5)*height*.86*scale;
  for(const [pathIndex,path] of filaments.entries()){
   const p=path.map(([px,py])=>[x(px),y(py)] as Point),[a,b,d,e]=p;
   for(const [lineWidth,color] of [[17*scale,'#456b8a1c'],[5*scale,'#7da6bd1c']] as const){c.strokeStyle=color;c.lineWidth=lineWidth;c.beginPath();c.moveTo(a![0],a![1]);c.bezierCurveTo(b![0],b![1],d![0],d![1],e![0],e![1]);c.stroke();}
   for(let i=0;i<150;i++){
    const t=(i+.5)/150,u=1-t,px=u*u*u*a![0]+3*u*u*t*b![0]+3*u*t*t*d![0]+t*t*t*e![0],py=u*u*u*a![1]+3*u*u*t*b![1]+3*u*t*t*d![1]+t*t*t*e![1];
    for(let j=0;j<2;j++){if(noise(pathIndex,i,j)<.38)continue;const drift=(noise(pathIndex+17,i,j)-.5)*18*scale,offset=(noise(pathIndex+39,i,j)-.5)*13*scale,r=noise(pathIndex+61,i,j)>.94?1.8:.65;this.dot(c,px+drift,py+offset,r,noise(pathIndex+83,i,j)>.84?'#f1d9b6bc':'#a9c9d8a0');}
   }
  }
  for(const [i,p] of knots.entries())this.group(c,x(p[0]),y(p[1]),(8+p[2]*2)*scale,i+40,8+p[2]*5);
 }

 draw(c:CanvasRenderingContext2D,width:number,height:number,home:number,w:Words){
  const cx=width/2,cy=height*.46,span=Math.min(width*.38,height*.7);c.save();c.font=`${width<460?11:12}px system-ui`;c.textAlign='center';c.lineWidth=1;
  const back=c.createRadialGradient(cx,cy,0,cx,cy,Math.max(width,height)*.55);back.addColorStop(0,'#20364b42');back.addColorStop(1,'#07101c00');c.fillStyle=back;c.fillRect(0,0,width,height);
  if(home===0){
   for(let i=1;i<=8;i++){const r=span*i/8;c.strokeStyle=i===3?'#89b9d299':'#819cad66';c.beginPath();c.ellipse(cx,cy,r,r*.38,0,0,7);c.stroke();const a=i*1.4;this.dot(c,cx+Math.cos(a)*r,cy+Math.sin(a)*r*.38,i===3?5:3,i===3?'#76cdf7':'#c7b598');}
   const sun=c.createRadialGradient(cx-5,cy-5,0,cx,cy,19);sun.addColorStop(0,'#ffedab');sun.addColorStop(.7,'#ffbb60');sun.addColorStop(1,'#bd6420');c.fillStyle=sun;c.beginPath();c.arc(cx,cy,18,0,7);c.fill();
  }
  if(home===1){
   this.galaxy(c,cx,cy,span,0);const x=cx+span*.53,y=cy+span*.13;this.marker(c,x,y);this.tag(c,w.homeNames[0]!,x,cy+span*.53,width);
   c.strokeStyle='#b2c4d044';c.setLineDash([3,6]);c.beginPath();c.ellipse(cx,cy,span*1.07,span*.72,0,0,7);c.stroke();c.setLineDash([]);
  }
  if(home===2){
   const mw:[number,number]=[width*.24,height*.34],m31:[number,number]=[width*.73,height*.40],m33:[number,number]=[width*.46,height*.67];
   this.galaxy(c,...mw,span*.30,0,true);this.galaxy(c,...m31,span*.37,1);this.galaxy(c,...m33,span*.19,2);
   const dwarfs:Point[]=[[.13,.55],[.18,.60],[.08,.39],[.31,.57],[.35,.22],[.52,.23],[.58,.74],[.67,.69],[.79,.63],[.86,.34],[.83,.19],[.61,.13]];
   dwarfs.forEach(([x,y],i)=>this.dwarf(c,width*x,height*y,i<2?7:3.6,i+10));
   this.tag(c,w.homeNames[1]!,mw[0],height*.55,width);this.tag(c,w.andromeda,m31[0],height*.60,width);this.tag(c,w.triangulum,m33[0],height*.83,width);
   this.tag(c,w.dwarfGalaxies,cx,height*.12,width);
  }
  if(home===3){
   const lx=width*.25,vx=width*.73,vy=height*.44,r=Math.min(width*.18,height*.25);
   this.group(c,lx,vy,r*.92,3,18);this.galaxy(c,lx,vy,r*.45,0,true);
   const gas=c.createRadialGradient(vx,vy,0,vx,vy,r*1.12);gas.addColorStop(0,'#7f9dd929');gas.addColorStop(.6,'#6796cd1a');gas.addColorStop(1,'#6796cd00');c.fillStyle=gas;c.beginPath();c.arc(vx,vy,r*1.12,0,7);c.fill();
   this.group(c,vx,vy,r,73,95);this.galaxy(c,vx-r*.21,vy+r*.06,r*.24,1);this.galaxy(c,vx+r*.19,vy-r*.17,r*.17,0);
   this.marker(c,lx,vy);this.tag(c,w.homeNames[2]!,lx,vy+r+19,width);this.tag(c,w.virgoCluster,vx,vy+r+19,width);
   this.tag(c,w.clusterGas,vx,vy-r-7,width);
  }
  if(home===4){
   this.web(c,width,height,.77);
   c.strokeStyle='#a9c7a077';c.lineWidth=1.5;c.setLineDash([6,6]);c.beginPath();c.ellipse(cx,cy,width*.37,height*.31,-.15,0,7);c.stroke();c.setLineDash([]);
   this.marker(c,width*.27,height*.42);this.tag(c,w.homeNames[2]!,width*.24,height*.42-20,width);
   this.tag(c,w.virgoCluster,width*.66,height*.61,width);
  }
  if(home===5){
   this.web(c,width,height,1);
   this.marker(c,width*.30,height*.45);this.tag(c,w.homeNames[2]!,width*.30,height*.45-19,width);
   c.strokeStyle='#91abc350';c.setLineDash([3,5]);c.beginPath();c.ellipse(width*.58,height*.71,width*.14,height*.08,-.2,0,7);c.stroke();c.setLineDash([]);
   this.tag(c,w.cosmicVoid,width*.59,height*.72,width);
  }
  if(home===6){
   const radius=Math.min(width*.43,height*.40);drawObservableWeb(c,cx,cy,radius);
   c.strokeStyle='#e9d39abc';c.lineWidth=1.6;c.setLineDash([4,6]);c.beginPath();c.arc(cx,cy,radius,0,7);c.stroke();c.setLineDash([]);
   for(let i=0;i<12;i++){const a=i*Math.PI/6;const x=Math.cos(a),y=Math.sin(a);c.strokeStyle='#f5dfaa66';c.beginPath();c.moveTo(cx+x*(radius+2),cy+y*(radius+2));c.lineTo(cx+x*(radius+6),cy+y*(radius+6));c.stroke();}
   this.marker(c,cx,cy);this.tag(c,w.observer,cx,cy-18,width);this.tag(c,w.horizon,cx,cy+radius-13,width);
  }
  c.fillStyle='#ffe0a0';c.font=`${width<460?10:11}px system-ui`;c.textAlign='center';c.fillText(w.homeAnchor[home]!,cx,height-19,width-20);c.restore();
 }
}
