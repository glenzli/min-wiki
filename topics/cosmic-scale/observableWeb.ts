/** Shared, deterministic teaching texture for the observable-region views. It is not a sky survey. */
type Point=readonly [number,number];

const noise=(a:number,b:number,c=0)=>{let h=Math.imul(a+101,374761393)^Math.imul(b+73,668265263)^Math.imul(c+17,1274126177);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;};
const webDensity=(x:number,y:number)=>{
 const gx=(x+1)*2.5,gy=(y+1)*2.5,ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy;
 const a=noise(ix,iy,1401)*(1-fx)+noise(ix+1,iy,1401)*fx;
 const b=noise(ix,iy+1,1401)*(1-fx)+noise(ix+1,iy+1,1401)*fx;
 return a*(1-fy)+b*fy;
};

// Normalized positions are shared by the structural address and the physical camera's final horizon.
const nodes:Point[]=[];
for(let i=0;i<420;i++){
 const x=(noise(i,1501)*2-1)*1.04,y=(noise(i,1502)*2-1)*1.04;
 if(x*x+y*y>.94**2||noise(i,1503)>.13+.82*webDensity(x,y))continue;
 nodes.push([x,y]);
}
const links:(readonly [number,number,number])[]=[];
for(let i=0;i<nodes.length;i++){
 const a=nodes[i]!;
 const neighbors=nodes.map((b,j)=>({j,d:(a[0]-b[0])**2+(a[1]-b[1])**2}))
  .filter(({j,d})=>j!==i&&d<.29**2).sort((p,q)=>p.d-q.d).slice(0,4);
 for(const {j} of neighbors)if(i<j&&noise(i,j,1504)<.76)links.push([i,j,(noise(i,j,1505)-.5)*.08]);
}

export function drawObservableWeb(c:CanvasRenderingContext2D,cx:number,cy:number,radius:number,opacity=1){
 if(radius<1||opacity<=0)return;
 c.save();c.globalAlpha*=opacity;c.beginPath();c.arc(cx,cy,radius,0,Math.PI*2);c.clip();
 const field=c.createRadialGradient(cx,cy,0,cx,cy,radius);
 field.addColorStop(0,'#14283a');field.addColorStop(.72,'#102235');field.addColorStop(1,'#091829');
 c.fillStyle=field;c.fillRect(cx-radius,cy-radius,radius*2,radius*2);
 // Faint off-filament points make the voids sparse rather than literally empty.
 for(let i=0;i<3300;i++){
  const x=noise(i,1601)*2-1,y=noise(i,1602)*2-1;
  if(x*x+y*y>1||noise(i,1603)>.15+.42*webDensity(x,y))continue;
  c.fillStyle=noise(i,1604)>.91?'#dfcda64d':'#93bed04a';
  c.fillRect(cx+x*radius,cy+y*radius,.55,.55);
 }
 for(const [linkIndex,[i,j,bend]] of links.entries()){
  const a=nodes[i]!,b=nodes[j]!,dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  const control:Point=[(a[0]+b[0])/2-dy/length*bend,(a[1]+b[1])/2+dx/length*bend];
  const curve=()=>{c.beginPath();c.moveTo(cx+a[0]*radius,cy+a[1]*radius);c.quadraticCurveTo(cx+control[0]*radius,cy+control[1]*radius,cx+b[0]*radius,cy+b[1]*radius);};
  c.strokeStyle='#5e94ad1c';c.lineWidth=Math.max(4,radius*.035);curve();c.stroke();
  c.strokeStyle='#a4c9d25e';c.lineWidth=.8;curve();c.stroke();
  for(let k=0;k<35;k++){
   const t=(k+noise(linkIndex,k,1605))/35,u=1-t;
   const x=u*u*a[0]+2*u*t*control[0]+t*t*b[0]+(noise(linkIndex,k,1606)-.5)*.026;
   const y=u*u*a[1]+2*u*t*control[1]+t*t*b[1]+(noise(linkIndex,k,1607)-.5)*.026;
   c.fillStyle=noise(linkIndex,k,1608)>.9?'#e8d8baa8':'#b4d2df9a';
   const size=noise(linkIndex,k,1609)>.96?1.5:.7;c.fillRect(cx+x*radius,cy+y*radius,size,size);
  }
 }
 for(const [i,[x,y]] of nodes.entries()){
  const px=cx+x*radius,py=cy+y*radius,glowRadius=Math.max(2,Math.min(12,radius*(.017+noise(i,1701)*.028)));
  const glow=c.createRadialGradient(px,py,0,px,py,glowRadius);
  glow.addColorStop(0,i%9===0?'#eedcb687':'#b3cbd478');glow.addColorStop(1,'#7da9c400');
  c.fillStyle=glow;c.beginPath();c.arc(px,py,glowRadius,0,Math.PI*2);c.fill();
  c.fillStyle='#c8dce5c0';c.beginPath();c.arc(px,py,i%9===0?1.8:1,0,Math.PI*2);c.fill();
 }
 c.restore();
}
