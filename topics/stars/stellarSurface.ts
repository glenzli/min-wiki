/** Topic-owned emissive photospheres. Stable granules live on the sphere, not in screen space. */
const hash=(x:number,y:number,z:number)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
function noise(x:number,y:number,z:number){
  const a=Math.floor(x),b=Math.floor(y),d=Math.floor(z);x-=a;y-=b;z-=d;
  const sx=x*x*(3-2*x),sy=y*y*(3-2*y),sz=z*z*(3-2*z);let value=0;
  for(let k=0;k<2;k++)for(let j=0;j<2;j++)for(let i=0;i<2;i++)value+=hash(a+i,b+j,d+k)*(i?sx:1-sx)*(j?sy:1-sy)*(k?sz:1-sz);
  return value;
}
export class StellarSurface {
  private maps=new Map<string,{canvas:HTMLCanvasElement; image:ImageData; phase:number}>();
  draw(c:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,time=0,limbVariation=0,activeRegion=0){
    if(r<.8){c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(x-5,y);c.lineTo(x+5,y);c.moveTo(x,y-5);c.lineTo(x,y+5);c.stroke();return;}
    const small=r<45,size=small?64:256,uneven=Math.round(Math.max(0,Math.min(.02,limbVariation))*200)/200,spots=Math.max(0,Math.min(1,activeRegion)),key=`${color}:${size}:${Math.round(uneven*200)}:${spots}`;
    let map=this.maps.get(key);
    if(!map){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;map={canvas,image:canvas.getContext('2d')!.createImageData(size,size),phase:NaN};this.maps.set(key,map);}
    // Update at a bounded cadence; geometry is stable between samples and never random per frame.
    const phase=Math.floor(time*8)/8;
    if(map.phase!==phase){
      map.phase=phase;const p=map.image.data,a=phase*.055,cos=Math.cos(a),sin=Math.sin(a),activity=Math.max(0,Math.min(1,(uneven-.005)/.01));
      const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255);
      for(let py=0;py<size;py++)for(let px=0;px<size;px++){
        const screenX=(px+.5)*2/size-1,screenY=(py+.5)*2/size-1,theta=Math.atan2(screenY,screenX);
        // Keep the giant nearly round. Broad surface patches and a soft limb
        // carry most of the unevenness; the outline only drifts a little.
        const contour=.68*Math.sin(4*theta+phase*.018)+.32*Math.sin(7*theta-1.4-phase*.012);
        const edge=1-uneven*(.35-.35*contour);
        const nx=screenX/edge,ny=screenY/edge,rr=nx*nx+ny*ny,o=(py*size+px)*4;
        if(rr>=1){p[o+3]=0;continue;}
        const nz=Math.sqrt(1-rr),sx=nx*cos+nz*sin,sz=nz*cos-nx*sin;
        const flow=.65*Math.sin(phase*.23+ny*4),granule=noise(sx*75+flow,ny*75+phase*.18,sz*75+phase*.12),broad=noise(sx*9+2+phase*.04,ny*9,sz*9),coarse=noise(sx*3.5+4+phase*.025,ny*3.5,sz*3.5);
        const pulse=.035*Math.sin(phase*.65+sx*13+ny*9);
        const lane=Math.pow(Math.max(0,(granule-.2)/.8),.55);
        let light=(.68+.32*nz)*(.70+.29*lane+(.13+.16*activity)*broad+.17*activity*(coarse-.5)+pulse);
        // Dark active regions appear only in the focused magnetic/flare steps.
        if(spots)for(const [lon,lat,radius]of [[-.4,.22,.038],[-.31,.25,.023],[.55,-.28,.025]]){
          const distance=Math.hypot(sx-Math.sin(lon!)*Math.cos(lat!),ny-Math.sin(lat!),sz-Math.cos(lon!)*Math.cos(lat!));
          light*=1-spots*((.8-.42*activity)*Math.exp(-((distance/radius!)**2))-(.16-.07*activity)*Math.exp(-((distance/(radius!*2.2))**2)));
        }
        p[o]=255*rgb[0]!*light;p[o+1]=255*rgb[1]!*light*(.82+.18*lane);p[o+2]=255*rgb[2]!*light*(.67+.33*lane);p[o+3]=Math.min(255,(1-Math.sqrt(rr))*size*(255-130*activity));
      }
      map.canvas.getContext('2d')!.putImageData(map.image,0,0);
    }
    const halo=c.createRadialGradient(x,y,r*.97,x,y,r*1.14);halo.addColorStop(0,color+'35');halo.addColorStop(.3,color+'0b');halo.addColorStop(1,color+'00');c.fillStyle=halo;c.fillRect(x-r*1.14,y-r*1.14,r*2.28,r*2.28);
    c.drawImage(map.canvas,x-r,y-r,r*2,r*2);
  }
  dispose(){this.maps.clear();}
}
