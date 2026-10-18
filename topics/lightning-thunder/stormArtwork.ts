/** Topic-owned, nonmetric illustration layers. The decoded artwork owns neither
 * scientific state nor a second animation clock; every light samples the scene. */
const cloudBounds={x:-350,y:-300,width:720,height:240};
const imageURLs={
 cloud:new URL('./assets/storm-cloud-v2.webp',import.meta.url).href,
 house:new URL('./assets/observer-house-v1.webp',import.meta.url).href,
 terrain:new URL('./assets/storm-terrain-v1.webp',import.meta.url).href,
};
type AssetName=keyof typeof imageURLs;

export class StormArtwork {
 private disposed=false;
 private readonly pending=new Set<AssetName>(['cloud','house','terrain']);
 private readonly failed=new Set<AssetName>();
 private readonly images:HTMLImageElement[]=[];
 private readonly cloud=document.createElement('canvas');
 private readonly cloudLight=document.createElement('canvas');
 private readonly house=document.createElement('canvas');
 private readonly houseLight=document.createElement('canvas');
 private readonly terrain=document.createElement('canvas');
 constructor(private readonly invalidate:()=>void){
  for(const name of Object.keys(imageURLs) as AssetName[]){
   const image=new Image();this.images.push(image);image.decoding='async';
   image.onload=()=>{
    if(this.disposed)return;
    try {this.prepare(name,image);}catch {this.failed.add(name);}
    this.pending.delete(name);this.invalidate();
   };
   image.onerror=()=>{if(this.disposed)return;this.failed.add(name);this.pending.delete(name);this.invalidate();};
   image.src=imageURLs[name];
  }
 }
 get status(){return this.failed.size?'failed':this.pending.size?'loading':'ready';}
 private prepare(name:AssetName,image:HTMLImageElement){
  const target=this[name];target.width=image.naturalWidth;target.height=image.naturalHeight;
  const c=target.getContext('2d')!;c.drawImage(image,0,0);
  if(name==='terrain'){
   // Fade the retained panorama into matching ground on tall/wide canvases.
   // Alpha at the horizon remains the authored irregular hillside silhouette.
   c.globalCompositeOperation='destination-in';
   const edge=c.createLinearGradient(0,0,target.width,0);
   edge.addColorStop(0,'#fff0');edge.addColorStop(.055,'#fff');edge.addColorStop(.945,'#fff');edge.addColorStop(1,'#fff0');
   c.fillStyle=edge;c.fillRect(0,0,target.width,target.height);
   const foot=c.createLinearGradient(0,target.height*.80,0,target.height);
   foot.addColorStop(0,'#fff');foot.addColorStop(1,'#fff0');
   c.fillStyle=foot;c.fillRect(0,0,target.width,target.height);return;
  }
  const mask=name==='cloud'?this.cloudLight:this.houseLight;
  mask.width=target.width;mask.height=target.height;
  const light=mask.getContext('2d')!;light.drawImage(target,0,0);light.globalCompositeOperation='source-in';
  if(name==='cloud'){
   const sx=target.width/cloudBounds.width,sy=target.height/cloudBounds.height;
   const glow=light.createRadialGradient((-67-cloudBounds.x)*sx,(-107-cloudBounds.y)*sy,0,(-67-cloudBounds.x)*sx,(-107-cloudBounds.y)*sy,150*sx);
   glow.addColorStop(0,'#ffffff');glow.addColorStop(.32,'#dae6ffa0');glow.addColorStop(1,'#91a8c400');
   light.fillStyle=glow;
  }else{
   const edge=light.createLinearGradient(0,0,mask.width,mask.height*.55);
   edge.addColorStop(0,'#d9e6efd9');edge.addColorStop(1,'#9ab4cb18');light.fillStyle=edge;
  }
  light.fillRect(0,0,mask.width,mask.height);
 }
 paintLandscape(c:CanvasRenderingContext2D,flash:number,halfWidth:number,bottom:number){
  const width=Math.max(900,halfWidth*2+100),height=this.terrain.width>1?width*this.terrain.height/this.terrain.width:302,y=95-height*.32;
  const base=c.createLinearGradient(0,100,0,340);
  base.addColorStop(0,'#596557');base.addColorStop(.4,'#454f3e');base.addColorStop(1,'#343d30');
  const foot=y+height*.77;
  c.fillStyle=base;c.fillRect(-halfWidth,foot,halfWidth*2,Math.max(0,Math.max(340,bottom)-foot));
  if(this.terrain.width>1){
   c.drawImage(this.terrain,-width/2,y,width,height);
  }
  if(flash<=0)return;
  c.save();c.globalCompositeOperation='screen';c.globalAlpha=flash*.33;
  const glow=c.createRadialGradient(15,141,0,15,141,175);
  glow.addColorStop(0,'#bed4e4');glow.addColorStop(.22,'#9ab9cd99');glow.addColorStop(1,'#8baab800');
  c.fillStyle=glow;c.fillRect(-160,118,350,Math.max(340,bottom)-118);c.restore();
 }
 paintCloud(c:CanvasRenderingContext2D,flash:number){
  if(this.cloud.width<=1)return;
  const a=cloudBounds;c.drawImage(this.cloud,a.x,a.y,a.width,a.height);
  if(flash<=0)return;
  c.save();c.globalCompositeOperation='screen';c.globalAlpha=flash;
  c.drawImage(this.cloudLight,a.x,a.y,a.width,a.height);c.restore();
 }
 paintHouse(c:CanvasRenderingContext2D,x:number,flash:number){
  if(this.house.width<=1)return;
  // Anchor the left ground-floor window to the indoor observation distance.
  // Enlarged illustrative architecture is distinct from the distance mapping;
  // even at .5 km its left silhouette stays separate from the grounded mast.
  const width=62,height=width*this.house.height/this.house.width,left=x-14,top=147-height;
  c.save();c.translate(x+16,147);c.scale(1,.18);
  const contact=c.createRadialGradient(0,0,2,0,0,34);
  contact.addColorStop(0,'#15211cd9');contact.addColorStop(.5,'#17221d77');contact.addColorStop(1,'#17221d00');
  c.fillStyle=contact;c.fillRect(-34,-34,68,68);c.restore();
  c.drawImage(this.house,left,top,width,height);
  if(flash<=0)return;
  c.save();c.globalCompositeOperation='screen';c.globalAlpha=flash*.4;
  c.drawImage(this.houseLight,left,top,width,height);c.restore();
 }
 dispose(){
  this.disposed=true;
  for(const image of this.images){image.onload=image.onerror=null;image.removeAttribute('src');}
  this.images.length=0;this.pending.clear();this.failed.clear();
  for(const layer of [this.cloud,this.cloudLight,this.house,this.houseLight,this.terrain])layer.width=layer.height=0;
 }
}
