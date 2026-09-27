import { createCloudTexture } from '../../src/visuals/cloudTexture.ts';
import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { lightningState, leaderPath, clamp } from './model.ts';
import type { Settings } from './model.ts';
import { t } from './i18n.ts';
const noise=(i:number)=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v);};
// Magnify the first 0.5 km so the indoor house stays separate from the mast.
// The same screen mapping is used for the sound front, so it still reaches
// the house at the model's arrival time. It is illustrative, not a scale bar.
const projectDistance=(km:number)=>35*km+30*(1-Math.exp(-km/.25));
export class TopicScene{
 private cloudTexture=createCloudTexture({bounds:[-424, -284, 706, 234],lobes:[[-99,-210,288,25],[-146,-191,136,45],[-183,-210,68,44],[-80,-180,93,58],[-126,-125,130,51],[-118,-86,77,27],[112,-200,135,17]],seed:77});
 private surface:CanvasSurface;private progress=0;private settings:Settings={distanceKm:3,temperature:20};
 constructor(canvas:HTMLCanvasElement){this.surface=new CanvasSurface(canvas);this.surface.onResize(()=>this.draw(this.progress,this.settings));}
 draw(progress:number,settings:Settings){
  this.progress=progress;this.settings=settings;
  const s=this.surface,c=s.begin('#9db4c8','#dddcca'),state=lightningState(progress,settings),path=leaderPath(),observerX=15+projectDistance(settings.distanceKm);
  const label=(text:string,x:number,y:number,width=300)=>s.label(text,x,y,{width,color:'#304b67',background:'#f1f3eceb'});
  const distant=c.createLinearGradient(0,110,0,250);distant.addColorStop(0,'#9daf9e');distant.addColorStop(1,'#718a70');
  s.path([[-450,142],[-361,113],[-291,131],[-225,107],[-168,120],[-79,111],[10,133],[104,112],[178,130],[291,117],[372,136],[450,119],[450,300],[-450,300]],'#a2b4af');
  s.path([[-450,154],[-322,140],[-237,149],[-131,139],[-40,147],[48,140],[140,149],[231,143],[335,151],[450,143],[450,300],[-450,300]],distant);
  for(let i=0;i<170;i++){const x=-440+noise(i+53)*880,y=155+noise(i+144)*130;s.path([[x,y],[x+2+noise(i)*4,y-2-noise(i+22)*8]],undefined,'#46674438',.8);}
  // An uneven cumulonimbus/anvil; the single flash stays local to its channel.
  const cloud=this.cloudTexture;c.drawImage(cloud.canvas,cloud.x,cloud.y,cloud.width,cloud.height);
  for(let i=0;i<60;i++){const u=(noise(i+131)+progress*1.6)%1,x=-241+noise(i+641)*102-u*5,y=-73+u*222;s.path([[x,y],[x-1,y+8]],undefined,'#5b7f9c33',.8);}
  if(progress<.70){c.save();c.font='600 18px -apple-system,sans-serif';c.textAlign='center';c.textBaseline='middle';
   c.globalAlpha=.12+.88*state.separation;
   for(let i=0;i<15;i++){const x=-224+noise(i+266)*242,y=-211+noise(i+721)*48;c.fillStyle='#a46f40';c.fillText('+',x,y);}
   for(let i=0;i<15;i++){const x=-214+noise(i+300)*204,y=-137+noise(i+174)*40;c.fillStyle='#28598f';c.fillText('−',x,y);}
   for(let i=0;i<4;i++){c.fillStyle='#a46f40';c.fillText('+',-140+i*17,-73-noise(i+940)*8);}
   c.globalAlpha=.12+.88*state.field;
   for(let i=0;i<14;i++){const proximity=1-Math.abs(i-6.5)/7,x=15+(i-6.5)*(12-7*proximity),y=146-36*proximity*proximity;c.fillStyle='#a46f40';c.fillText('+',x,y);}
   c.restore();
  }
  if(progress<.32){
   for(let i=0;i<18;i++){const u=(progress*.9+noise(i+44))%1,x=-205+noise(i+330)*172,y=-87-u*128;s.ellipse(x,y,1.2+i%3*.45,2.4+i%2,'#d7e4e8aa');}
   s.arrow(-205,-120,-190,-186,'#ab7743',2);s.arrow(-52,-183,-38,-124,'#587b9d',2);label(t('碰撞转移电荷，气流再把粒子分开'),-56,9,410);
  }
  if(state.field>0&&progress<.60){
   c.save();c.globalAlpha=state.field*.28;
   for(let i=0;i<7;i++){const x=-150+i*54;s.path([[x,-103],[x*.58+6,118]],undefined,'#6e77a0',.7);}
   c.restore();
   if(progress>.20)label(t('尖端附近电荷更集中，局部电场更强'),107,76,360);
  }
  // A grounded mast provides a visible sharp point for the upward connector.
  s.path([[2,141],[15,103],[28,141]],'#5d6f76','#334a55',1.2);s.path([[15,103],[15,91]],undefined,'#dae4df',1.5);
  if(state.field>.45&&state.leader<.92){const glow=c.createRadialGradient(15,91,0,15,91,9+state.field*7);glow.addColorStop(0,'#d9d0ff99');glow.addColorStop(1,'#c5b8ff00');s.ellipse(15,91,10+state.field*7,10+state.field*7,glow);}
  if(state.leader>0){
   const count=Math.max(2,Math.floor(1+state.leader*(path.length-1))),visible=path.slice(0,count);
   s.path(visible,undefined,'#7761b085',1.25);
   for(const i of [5,9,14,19,23]){if(i>=count)continue;const [x,y]=path[i],sign=i%2?1:-1,length=18+noise(i+65)*21,branch:[number,number][]=[[x,y],[x+sign*12,y+8],[x+sign*19,y+6],[x+sign*length,y+27],[x+sign*(length+10),y+40]];s.path(branch,undefined,progress<.68?'#8770a98c':'#d1cdec42',.9);}
   if(state.leader>.7){const u=clamp((state.leader-.7)/.3);s.path([[15,91],[21,86-13*u],[13,80-24*u]],undefined,'#806bb4b8',1.4);}
   if(progress>.60){const start=Math.floor((1-state.returnStroke)*(path.length-1)),stroke=path.slice(start);c.save();c.shadowColor='#e7ddff';c.shadowBlur=19;c.globalAlpha=progress<.70?1:.42;s.path(stroke,undefined,'#cfc9ff55',9);s.path(stroke,undefined,'#e6e7ff',4.5);s.path(stroke,undefined,'#ffffff',1.55);c.restore();}
   if(progress>.32&&progress<.60){label(t('分步先导'),70,-28,230);if(progress>.50)label(t('向上连接通道'),105,106,250);}
   if(progress>=.60&&progress<.70)label(t('明亮回击向上发展'),111,-14,300);
  }
  // A substantial building marks an indoor observer, not a figure sheltering under a tree.
  c.fillStyle='#dbd5b9';c.fillRect(observerX-17,119,34,27);s.path([[observerX-22,119],[observerX-2,104],[observerX+22,119]],'#6b7d87');c.fillStyle=state.heard?'#f1d591':'#bdd6db';c.fillRect(observerX-9,124,9,10);c.fillStyle='#7b887d';c.fillRect(observerX+5,129,7,17);
  if(progress>=.70){
   const radius=projectDistance(state.soundRadiusKm),frontX=Math.min(observerX,15+radius);
   // The sound front and the same indoor observer share one visual distance map.
   s.path([[15,166],[observerX,166]],undefined,'#e5e9dd93',1.25);
   s.path([[15,166],[frontX,166]],undefined,'#765b9bdc',3.4);
   s.path([[15,161],[15,171]],undefined,'#e5e9dd',1.4);
   s.path([[observerX,161],[observerX,171]],undefined,'#e5e9dd',1.4);
   if(state.heard)s.ellipse(observerX,166,8,8,'#e5cb8547','#d9b96b');
   s.ellipse(frontX,166,3.5,3.5,'#765b9b');
   c.save();c.beginPath();c.rect(-430,-70,870,218);c.clip();
   for(let i=0;i<3;i++){const r=radius-i*7;if(r<=0)continue;c.beginPath();c.arc(15,141,r,Math.PI,Math.PI*2);c.strokeStyle=i===0?'#765b9bbb':'#765b9b35';c.lineWidth=i===0?2:1;c.stroke();}c.restore();
  }
  label(t('室内'),observerX,88,110);
  s.end();
 }
 dispose(){this.surface.dispose();}
}
