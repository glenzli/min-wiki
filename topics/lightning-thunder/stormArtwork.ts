/** Topic-owned, nonmetric illustration layers. The decoded artwork owns neither
 * scientific state nor a second animation clock; every light samples the scene. */
const cloudBounds={x:-350,y:-300,width:720,height:240};
const imageURLs={
 cloud:new URL('./assets/storm-cloud-v2.webp',import.meta.url).href,
 house:new URL('./assets/observer-house-v1.webp',import.meta.url).href,
 terrain:new URL('./assets/storm-terrain-v1.webp',import.meta.url).href,
};
type AssetName=keyof typeof imageURLs;
const linear=Array.from({length:256},(_,i)=>{const v=i/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
const encoded=(v:number)=>255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055);
const mixColor=(base:string,lit:string,amount:number)=>{
 const values=[0,2,4].map(i=>{const a=parseInt(base.slice(i+1,i+3),16),b=parseInt(lit.slice(i+1,i+3),16);return Math.round(a+(b-a)*amount);});
 return `rgb(${values.join(',')})`;
};

export class StormArtwork {
 private disposed=false;
 private readonly pending=new Set<AssetName>(['cloud','house','terrain']);
 private readonly failed=new Set<AssetName>();
 private readonly images:HTMLImageElement[]=[];
 private readonly cloud=document.createElement('canvas');
 private readonly cloudLight=document.createElement('canvas');
 private readonly cloudDiagram=document.createElement('canvas');
 private readonly house=document.createElement('canvas');
 private readonly houseLight=document.createElement('canvas');
 private readonly terrain=document.createElement('canvas');
 private readonly terrainLight=document.createElement('canvas');
 private readonly blend=document.createElement('canvas');
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
  const c=target.getContext('2d')!;
  // Background-only grading is baked once. Keep relief/site identity while
  // suppressing high-frequency grass/hedge detail behind the teaching layers.
  if(name==='terrain')c.filter='saturate(55%) contrast(72%) blur(1.1px)';
  c.drawImage(image,0,0);c.filter='none';
  if(name==='terrain'){
   c.globalCompositeOperation='source-atop';
   const haze=c.createLinearGradient(0,0,0,target.height);
   haze.addColorStop(0,'#6a7b8b77');haze.addColorStop(.65,'#7886804d');haze.addColorStop(1,'#53696a66');
   c.fillStyle=haze;c.fillRect(0,0,target.width,target.height);
   // Fade the retained panorama into matching ground on tall/wide canvases.
   // Alpha at the horizon remains the authored irregular hillside silhouette.
   c.globalCompositeOperation='destination-in';
   const edge=c.createLinearGradient(0,0,target.width,0);
   edge.addColorStop(0,'#fff0');edge.addColorStop(.055,'#fff');edge.addColorStop(.945,'#fff');edge.addColorStop(1,'#fff0');
   c.fillStyle=edge;c.fillRect(0,0,target.width,target.height);
   const foot=c.createLinearGradient(0,target.height*.80,0,target.height);
   foot.addColorStop(0,'#fff');foot.addColorStop(1,'#fff0');
   c.fillStyle=foot;c.fillRect(0,0,target.width,target.height);
  }
  this.prepareLight(name,target);
  this.blend.width=Math.max(this.blend.width,target.width);
  this.blend.height=Math.max(this.blend.height,target.height);
  if(name==='cloud'){
   const shade=this.cloudDiagram;shade.width=target.width;shade.height=target.height;
   const pixels=c.getImageData(0,0,target.width,target.height),d=pixels.data;
   // Preserve the exact cloud alpha and volume: the diagram tint has no
   // rectangular edge or invented cloud section, and adds no opaque backing.
   for(let i=0;i<d.length;i+=4){d[i]*=.46;d[i+1]*=.53;d[i+2]*=.62;}
   shade.getContext('2d')!.putImageData(pixels,0,0);
  }
 }
 private prepareLight(name:AssetName,source:HTMLCanvasElement){
  const target=name==='cloud'?this.cloudLight:name==='house'?this.houseLight:this.terrainLight;
  target.width=source.width;target.height=source.height;
  const pixels=source.getContext('2d')!.getImageData(0,0,source.width,source.height),d=pixels.data;
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
   const i=(y*source.width+x)*4;if(!d[i+3])continue;
   const u=x/source.width,v=y/source.height;
   const r=linear[d[i]],g=linear[d[i+1]],b=linear[d[i+2]],luma=.2126*r+.7152*g+.0722*b;
   let exposure:number;
   if(name==='cloud'){
    const wx=cloudBounds.x+u*cloudBounds.width,wy=cloudBounds.y+v*cloudBounds.height;
    const near=Math.exp(-1.5*(((wx+67)/205)**2+((wy+112)/130)**2));
    exposure=.22+2.15*near;
   }else if(name==='terrain'){
    const near=Math.exp(-(((u-.51)/.33)**2+((v-.59)/.44)**2));
    exposure=.18+.95*near;
   }else{
    // Channel-facing roof/wall receives more light than the far facade.
    const facing=Math.exp(-(((u-.22)/.64)**2)),roof=1-.4*v;
    exposure=.22+1.55*facing*roof;
   }
   // A soft exposure shoulder retains shadow pockets and highlight texture;
   // this is illustrative material grading, not a measured lighting solution.
   const gain=2**(exposure*(.4+.6*Math.sqrt(luma)));
   const lift=(value:number,tint:number)=>{
    const scale=1+(gain-1)*tint;
    return encoded(value*scale/(1+value*(scale-1)));
   };
   d[i]=lift(r,.94);d[i+1]=lift(g,1);d[i+2]=lift(b,1.07);
  }
  target.getContext('2d')!.putImageData(pixels,0,0);
 }
 private paintMaterial(c:CanvasRenderingContext2D,base:HTMLCanvasElement,lit:HTMLCanvasElement,x:number,y:number,width:number,height:number,flash:number,diagram=0){
  const name=base===this.cloud?'cloud':base===this.house?'house':'terrain';
  if(this.failed.has(name)||(flash<=0&&diagram<=0)){c.drawImage(base,x,y,width,height);return;}
  // One reusable buffer blends premultiplied pixels before compositing onto
  // the scene. Partial-alpha cloud/roof edges retain exactly the source alpha.
  const b=this.blend.getContext('2d')!;b.clearRect(0,0,base.width,base.height);b.save();
  b.globalCompositeOperation='lighter';
  for(const [image,weight] of [[base,(1-flash)*(1-diagram)],[lit,flash],[this.cloudDiagram,(1-flash)*diagram]] as const){
   if(weight<=0)continue;b.globalAlpha=weight;b.drawImage(image,0,0);
  }
  b.restore();c.drawImage(this.blend,0,0,base.width,base.height,x,y,width,height);
 }
 paintLandscape(c:CanvasRenderingContext2D,flash:number,halfWidth:number,bottom:number){
  const width=Math.max(900,halfWidth*2+100),height=this.terrain.width>1?width*this.terrain.height/this.terrain.width:302,y=95-height*.32;
  const base=c.createLinearGradient(0,100,0,340);
  base.addColorStop(0,mixColor('#626f70','#718186',flash));base.addColorStop(.4,mixColor('#58655f','#708177',flash));base.addColorStop(1,mixColor('#4f5b58','#63766d',flash));
  const foot=y+height*.77;
  c.fillStyle=base;c.fillRect(-halfWidth,foot,halfWidth*2,Math.max(0,Math.max(340,bottom)-foot));
  if(this.terrain.width>1){
   this.paintMaterial(c,this.terrain,this.terrainLight,-width/2,y,width,height,flash);
  }
 }
 paintCloud(c:CanvasRenderingContext2D,flash:number,diagram:number){
  if(this.cloud.width<=1)return;
  const a=cloudBounds;this.paintMaterial(c,this.cloud,this.cloudLight,a.x,a.y,a.width,a.height,flash,diagram);
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
  this.paintMaterial(c,this.house,this.houseLight,left,top,width,height,flash);
 }
 dispose(){
  this.disposed=true;
  for(const image of this.images){image.onload=image.onerror=null;image.removeAttribute('src');}
  this.images.length=0;this.pending.clear();this.failed.clear();
  for(const layer of [this.cloud,this.cloudLight,this.cloudDiagram,this.house,this.houseLight,this.terrain,this.terrainLight,this.blend])layer.width=layer.height=0;
 }
}
