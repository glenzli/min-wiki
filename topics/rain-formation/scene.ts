import { createCloudTexture } from '../../src/visuals/cloudTexture.ts';
import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { rainState, smooth, cloudStudy, rainParticle } from './model.ts';
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
  const compact=s.width<560;
  if(compact)c.translate(0,(140-s.height*.54)/s.scale);
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
  c.save();c.globalAlpha=state.cloud*.65;c.strokeStyle='#416e8a';c.lineWidth=1.2;c.setLineDash([3,5]);c.beginPath();c.ellipse(-171,-103,25,17,0,0,Math.PI*2);c.stroke();
  if(!compact)s.path([[-145,-106],[88,-137],[111,-137]],undefined,'#69899b',1);
  c.restore();
  const molecule=(x:number,y:number,size:number,opacity=1)=>{
    c.save();c.globalAlpha=opacity;
    s.path([[x-size*.75,y+size*.6],[x,y],[x+size*.75,y+size*.6]],undefined,'#8b8e83',size*.35);
    s.ellipse(x,y,size*.65,size*.65,'#b47d66');
    s.ellipse(x-size*.75,y+size*.6,size*.36,size*.36,'#fff9e7','#b5aa93');
    s.ellipse(x+size*.75,y+size*.6,size*.36,size*.36,'#fff9e7','#b5aa93');c.restore();
  };
  if(progress<.43){
    for(let i=0;i<18;i++){
      const f=smooth(i*.004,.28+i*.006,progress),x=-320+noise(i+22)*170;
      molecule(x+Math.sin(i)*f*32,183-f*(210+noise(i+9)*80),3.6,(1-smooth(.28,.43,progress))*.7);
    }
    label(t('水分子离开水面 · 放大示意'),-174,110,305);
  }
  if(!compact&&progress>.18&&progress<.68)label(t('冷却与凝结'),-148,-214,305);
  if(settings.route==='ice'&&progress>.42){c.save();c.setLineDash([5,8]);s.path([[-320,11],[34,11]],undefined,'#527ca26b',1);c.restore();label(t('暖层：冰融化'),-148,18,300);}
  if(progress>.65){for(let i=0;i<56;i++){
    const drop=rainParticle(progress,i,settings.humidity),{x,y,radius:r}=drop;
    if(drop.outcome==='unborn'||drop.outcome==='evaporated')continue;
    if(drop.outcome==='landed'){
      const fresh=1-smooth(0,.055,drop.afterLanding),spread=smooth(0,.055,drop.afterLanding);
      c.save();c.globalAlpha=.16+r*.25;s.ellipse(x,y,2.6+r*4,1.1,'#547e9166');
      if(fresh>0){c.globalAlpha=fresh*.65;c.strokeStyle='#d8eceb';c.lineWidth=.8;c.beginPath();c.ellipse(x,y,2+spread*9,1+spread*3,0,0,Math.PI*2);c.stroke();
        for(const side of [-1,1])s.ellipse(x+side*(2+spread*5),y-Math.sin(spread*Math.PI)*4,1,.7,'#bddde5');}
      c.restore();continue;
    }
    const ice=settings.route==='ice'?1-drop.melt:0;
    c.save();c.globalAlpha=smooth(0,.07,drop.age)*Math.min(1,r/.3)*(.48+noise(i)*.3);
    if(ice>0){c.save();c.globalAlpha*=ice;c.translate(x,y);for(let arm=0;arm<3;arm++){c.rotate(Math.PI/3);s.path([[-3,0],[3,0]],undefined,'#f1fbfc',1.2);}c.restore();}
    if(ice<1){c.globalAlpha*=1-ice;s.path([[x,y-2-r*3],[x,y]],undefined,'#42769c99',.8+r);s.ellipse(x,y,1+r,1.15+r,'#5893b3','#d9eef1');}
    c.restore();
  }if(progress>.86)label(rainParticle(1,0,settings.humidity).outcome==='evaporated'?t('干燥空气：雨幡'):t('湿润空气：雨落地'),-142,151,330);}
  // One representative population condenses into droplets, then merges.
  const originalScale=s.scale;
  c.save();
  if(compact){
    const factor=(s.width-38)/(247*originalScale);
    c.translate(-234*factor,(315-140)/originalScale+187*factor);c.scale(factor,factor);s.scale*=factor;
  }
  const study=cloudStudy(progress),centerX=236,centerY=-55;
  c.fillStyle='#f9f8eeed';c.beginPath();c.roundRect(111,-187,247,321,18);c.fill();c.strokeStyle='#688c9933';c.stroke();
  label(progress>.8?t('雨滴与空气中的水分子'):study.zoom<.5?t('放大看水分子'):t('再看云滴怎样长大'),234,-165,232);
  c.save();c.beginPath();c.rect(120,-140,228,185);c.clip();
  const centers=[[centerX,centerY],[177,centerY-53],[294,centerY-53],[172,centerY+51],[297,centerY+51]];
  if(study.zoom<1)for(let i=0;i<30;i++){
    const group=Math.floor(i/6),angle=i*2.399,r=3+noise(i+8)*15;
    const startX=135+noise(i+400)*197,startY=-126+noise(i+502)*160;
    const targetX=centers[group]![0]!+Math.cos(angle)*r,targetY=centers[group]![1]!+Math.sin(angle)*r;
    molecule(startX+(targetX-startX)*study.condensation,startY+(targetY-startY)*study.condensation,5.5,1-study.zoom);
  }
  const droplet=(x:number,y:number,r:number,alpha:number)=>{
    if(r<.05)return;
    const g=c.createRadialGradient(x-r*.3,y-r*.4,0,x,y,r);
    g.addColorStop(0,'#ffffff');g.addColorStop(.28,'#ceeaf0');g.addColorStop(.8,'#6da5bd');g.addColorStop(1,'#e7f7ef');
    c.save();c.globalAlpha=alpha;s.ellipse(x,y,r,r,g,'#739cac');c.restore();
  };
  const magnification=1+state.growth*.8;
  for(let i=0;i<4;i++)droplet(centerX+study.positions[i]!.x*magnification,centerY+study.positions[i]!.y*magnification,study.remaining[i]!*magnification,study.zoom);
  const icy=settings.route==='ice'?smooth(.33,.43,progress)*(1-study.melt):0;
  const remaining=state.radiusMm>0?state.remainingRadiusMm/state.radiusMm:1;
  droplet(centerX,centerY,study.radius*magnification*remaining,study.zoom*(1-icy));
  if(state.fall>0){
    const lost=1-remaining**3;
    for(let i=0;i<30;i++){
      const f=smooth(i/30,(i+5)/30,lost),angle=i*2.399;
      if(f>0)molecule(centerX+Math.cos(angle)*(14+f*(20+noise(i+98)*55)),centerY+Math.sin(angle)*(14+f*(18+noise(i+29)*45)),4.5,f*.8);
    }
  }
  if(icy>0){const radius=study.radius*magnification;c.save();c.globalAlpha=icy;c.translate(centerX,centerY);s.path([[0,-radius],[-radius*.23,-radius*.25],[-radius*.83,-radius*.45],[-radius*.33,0],[-radius*.83,radius*.45],[-radius*.23,radius*.25],[0,radius],[radius*.23,radius*.25],[radius*.83,radius*.45],[radius*.33,0],[radius*.83,-radius*.45],[radius*.23,-radius*.25]],'#cadfe3aa','#97bccf',.8);for(let k=0;k<6;k++){c.rotate(Math.PI/3);s.path([[0,0],[0,-radius]],undefined,'#487d9e',1.5);s.path([[-radius*.2,-radius*.63],[0,-radius*.45],[radius*.2,-radius*.63]],undefined,'#edf8f4',1.3);}c.restore();}
  c.restore();
  label(progress>.8?t('下落时，部分水分子又回到空气'):progress<.28?t('分散的分子，逐渐聚在一起'):progress<.42?t('许多分子组成一滴水'):settings.route==='ice'&&study.melt<.5?t('过冷水滴附着冰晶，随后融化'):t('小水滴接触后，才并入大水滴'),234,69,220);
  label(t('放大倍数变化；大小不按比例'),234,111,220);
  c.restore();s.scale=originalScale;
  s.end();
 }
 dispose(){this.surface.dispose();}
}
