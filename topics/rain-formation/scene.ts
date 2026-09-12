import { createCloudTexture } from '../../src/visuals/cloudTexture.ts';
import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { rainState, smooth, evaporatedRadius } from './model.ts';
import type { Settings } from './model.ts';
import { t } from './i18n.ts';
const noise=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
export class TopicScene{
 private cloudTexture=createCloudTexture({bounds:[-355, -242, 431, 216],lobes:[[-161,-91,178,42],[-245,-133,69,61],[-173,-169,61,56],[-97,-135,71,59],[-292,-104,46,35],[5,-89,42,28]],seed:41});
 private surface:CanvasSurface;private progress=0;private settings:Settings={route:'warm',humidity:75};
 constructor(canvas:HTMLCanvasElement){this.surface=new CanvasSurface(canvas);this.surface.onResize(()=>this.draw(this.progress,this.settings));}
 draw(progress:number,settings:Settings){
  this.progress=progress;this.settings=settings;
  const s=this.surface,c=s.begin('#a7c8d8','#e6e8d3'),state=rainState(progress,settings);
  const label=(text:string,x:number,y:number,width=250)=>s.label(text,x,y,{width,color:'#305366',background:'#f5f6eceb'});
  const light=c.createRadialGradient(-300,-230,0,-240,-140,250);light.addColorStop(0,'#fff6cfad');light.addColorStop(1,'#fff7d700');s.ellipse(-240,-140,250,250,light);
  s.path([[-450,143],[-325,106],[-279,114],[-218,75],[-153,106],[-97,98],[-30,131],[44,113],[128,133],[201,101],[284,124],[450,109],[450,300],[-450,300]],'#a0b8ab');
  s.path([[-450,164],[-316,145],[-254,162],[-174,143],[-94,151],[-26,138],[46,149],[149,154],[246,140],[450,153],[450,300],[-450,300]],'#809d82');
  const water=c.createLinearGradient(0,156,0,276);water.addColorStop(0,'#82afbb');water.addColorStop(1,'#476f8a');
  c.beginPath();c.moveTo(-450,171);c.bezierCurveTo(-321,149,-295,175,-227,163);c.bezierCurveTo(-150,151,-108,167,-78,192);c.bezierCurveTo(-25,229,82,246,146,299);c.lineTo(-450,299);c.fillStyle=water;c.fill();
  for(let i=0;i<90;i++){const x=-430+noise(i+36)*350,y=175+noise(i+450)*120;s.path([[x,y],[x+3+noise(i)*26,y]],undefined,'#d6e7df2b',.8);}
  for(let i=0;i<110;i++){const x=45+noise(i+31)*390,y=171+noise(i+57)*110;s.path([[x,y],[x+2+noise(i)*3,y-3-noise(i+11)*9]],undefined,'#3b634342',.8);}
  // A family of uneven cloud lobes blends into one body; cloud opacity follows condensation.
  c.save();c.globalAlpha=state.cloud;
  const cloud=this.cloudTexture;c.drawImage(cloud.canvas,cloud.x,cloud.y,cloud.width,cloud.height);
  c.restore();
  if(progress<.5){for(let k=0;k<3;k++){const x=-274+k*67,pts:[number,number][]=[];for(let j=0;j<26;j++){const u=j/25;pts.push([x+Math.sin(u*4+k)*11,149-u*179]);}c.save();c.globalAlpha=.8*(1-smooth(.35,.52,progress));c.setLineDash([3,5]);s.path(pts,undefined,'#ab793d',2);c.setLineDash([]);s.arrow(...pts[22],...pts[25],'#ab793d',2);c.restore();}label(t('水汽不可见'),-164,110,305);}
  if(progress>.18&&progress<.68)label(t('冷却与凝结'),-148,-214,305);
  if(settings.route==='ice'&&progress>.42){c.save();c.setLineDash([5,8]);s.path([[-320,11],[34,11]],undefined,'#527ca26b',1);c.restore();label(t('暖层：冰融化'),-148,18,300);}
  if(progress>.63){const appear=smooth(.63,.79,progress);for(let i=0;i<100;i++){const u=(noise(i+621)+state.fall*(.65+noise(i+35)*.4))%1,x=-287+noise(i+451)*292+u*7,y=-50+u*204;
    const r=evaporatedRadius(.7,settings.humidity,u*30),opacity=appear*Math.min(1,r/.4)*(.25+noise(i)*.42);if(r<.02)continue;
    c.save();c.globalAlpha=opacity;
    if(settings.route==='ice'&&y<10){s.path([[x-3,y],[x+3,y]],undefined,'#eefaff',1);s.path([[x,y-3],[x,y+3]],undefined,'#eefaff',1);}
    else s.path([[x,y],[x-1,y+4+r*8]],undefined,'#42769c',.7+r*.8);c.restore();
  }if(progress>.86)label(settings.humidity<45?t('干燥空气：雨幡'):t('湿润空气：雨落地'),-142,194,330);}
  // The inset explains growth on a completely different scale from the landscape.
  c.fillStyle='#f4f7eeeb';c.beginPath();c.roundRect(111,-187,247,321,15);c.fill();c.strokeStyle='#688c9933';c.stroke();label(t('云内局部放大'),234,-167,232);
  const ice=settings.route==='ice',growth=state.growth,centerX=236,centerY=-38;
  c.save();c.globalAlpha=state.cloud;
  for(let i=0;i<20;i++){const a=noise(i+960)*6.28,rr=(33+noise(i+235)*64)*(1-growth*.62),x=centerX+Math.cos(a)*rr,y=centerY+Math.sin(a)*rr*.72;const radius=2+noise(i+41)*2;s.ellipse(x,y,radius,radius,'#77a4b792','#dceaf0');}
  if(ice&&progress>.36){const radius=10+growth*28;c.save();c.translate(centerX,centerY);c.rotate(progress*.3);for(let k=0;k<6;k++){c.rotate(Math.PI/3);s.path([[0,0],[0,-radius]],undefined,'#487d9e',2.2);s.path([[-radius*.2,-radius*.63],[0,-radius*.45],[radius*.2,-radius*.63]],undefined,'#6d9bb6',1.5);}c.restore();}
  else {const radius=4+growth*21,g=c.createRadialGradient(centerX-radius*.32,centerY-radius*.4,0,centerX,centerY,radius);g.addColorStop(0,'#f5ffff');g.addColorStop(.3,'#bcdde5');g.addColorStop(.8,'#5d93af');g.addColorStop(1,'#d4f0ee');s.ellipse(centerX,centerY,radius,radius,g,'#6998ad');}
  c.restore();
  if(state.cloud<.08)label(t('水汽不可见'),234,-38,215);
  if(state.cloud>.08){label(ice?t('冰晶与过冷水滴'):t('水滴碰并'),234,70,220);label(t('粒径不按比例'),234,111,220);}
  s.end();
 }
 dispose(){this.surface.dispose();}
}
