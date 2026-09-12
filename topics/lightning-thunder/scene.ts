import { createCloudTexture } from '../../src/visuals/cloudTexture.ts';
import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { lightningState, leaderPath, clamp } from './model.ts';
import type { Settings } from './model.ts';
import { t } from './i18n.ts';
const noise=(i:number)=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export class TopicScene{
 private cloudTexture=createCloudTexture({bounds:[-424, -284, 706, 234],lobes:[[-99,-210,288,25],[-146,-191,136,45],[-183,-210,68,44],[-80,-180,93,58],[-126,-125,130,51],[-118,-86,77,27],[112,-200,135,17]],seed:77});
 private surface:CanvasSurface;private progress=0;private settings:Settings={distanceKm:3,temperature:20};
 constructor(canvas:HTMLCanvasElement){this.surface=new CanvasSurface(canvas);this.surface.onResize(()=>this.draw(this.progress,this.settings));}
 draw(progress:number,settings:Settings){
  this.progress=progress;this.settings=settings;
  const s=this.surface,c=s.begin('#9db4c8','#dddcca'),state=lightningState(progress,settings),path=leaderPath(),observerX=15+settings.distanceKm*37;
  const label=(text:string,x:number,y:number,width=300)=>s.label(text,x,y,{width,color:'#304b67',background:'#f1f3eceb'});
  const distant=c.createLinearGradient(0,110,0,250);distant.addColorStop(0,'#9daf9e');distant.addColorStop(1,'#718a70');
  s.path([[-450,142],[-361,113],[-291,131],[-225,107],[-168,120],[-79,111],[10,133],[104,112],[178,130],[291,117],[372,136],[450,119],[450,300],[-450,300]],'#a2b4af');
  s.path([[-450,154],[-322,140],[-237,149],[-131,139],[-40,147],[48,140],[140,149],[231,143],[335,151],[450,143],[450,300],[-450,300]],distant);
  for(let i=0;i<170;i++){const x=-440+noise(i+53)*880,y=155+noise(i+144)*130;s.path([[x,y],[x+2+noise(i)*4,y-2-noise(i+22)*8]],undefined,'#46674438',.8);}
  // An uneven cumulonimbus/anvil; the single flash stays local to its channel.
  const cloud=this.cloudTexture;c.drawImage(cloud.canvas,cloud.x,cloud.y,cloud.width,cloud.height);
  for(let i=0;i<60;i++){const u=(noise(i+131)+progress*1.6)%1,x=-241+noise(i+641)*102-u*5,y=-73+u*222;s.path([[x,y],[x-1,y+8]],undefined,'#5b7f9c33',.8);}
  if(progress<.68){c.save();c.font='600 18px -apple-system,sans-serif';c.textAlign='center';c.textBaseline='middle';
   for(let i=0;i<11;i++){const x=-217+noise(i+266)*228,y=-205+noise(i+721)*41;c.fillStyle='#936746';c.fillText('+',x,y);}
   for(let i=0;i<10;i++){const x=-208+noise(i+300)*182,y=-124+noise(i+174)*32;c.fillStyle='#335b91';c.fillText('−',x,y);}
   for(let i=0;i<3;i++){c.fillStyle='#936746';c.fillText('+',-134+i*17,-74-noise(i+940)*7);}
   for(let i=0;i<8;i++){c.fillStyle='#936746';c.fillText('+',-104+i*29,146);}
   c.restore();
  }
  if(progress<.29){s.arrow(-205,-120,-190,-186,'#ab7743',2);s.arrow(-52,-183,-38,-124,'#587b9d',2);label(t('冰晶与霰交换电荷'),-72,10,370);}
  if(state.leader>0){
   const count=Math.max(2,Math.floor(1+state.leader*(path.length-1))),visible=path.slice(0,count);
   s.path(visible,undefined,'#7761b085',1.25);
   for(const i of [5,9,14,19,23]){if(i>=count)continue;const [x,y]=path[i],sign=i%2?1:-1,length=18+noise(i+65)*21,branch:[number,number][]=[[x,y],[x+sign*12,y+8],[x+sign*19,y+6],[x+sign*length,y+27],[x+sign*(length+10),y+40]];s.path(branch,undefined,progress<.68?'#8770a98c':'#d1cdec42',.9);}
   if(state.leader>.7){const u=clamp((state.leader-.7)/.3);s.path([[15,141],[21,136-17*u],[13,131-28*u]],undefined,'#806bb493',1.4);}
   if(progress>.58){const start=Math.floor((1-state.returnStroke)*(path.length-1)),stroke=path.slice(start);c.save();c.shadowColor='#e7ddff';c.shadowBlur=16;c.globalAlpha=progress<.68?1:.42;s.path(stroke,undefined,'#e6e7ff',5);s.path(stroke,undefined,'#ffffff',1.8);c.restore();}
   if(progress>.3&&progress<.56){label(t('分步先导'),70,-28,230);if(progress>.48)label(t('向上连接通道'),105,106,250);}
   if(progress>=.56&&progress<.68)label(t('明亮回击向上发展'),111,-14,300);
  }
  // A substantial building marks an indoor observer, not a figure sheltering under a tree.
  c.fillStyle='#dbd5b9';c.fillRect(observerX-17,119,34,27);s.path([[observerX-22,119],[observerX-2,104],[observerX+22,119]],'#6b7d87');c.fillStyle=state.heard?'#f1d591':'#bdd6db';c.fillRect(observerX-9,124,9,10);c.fillStyle='#7b887d';c.fillRect(observerX+5,129,7,17);
  if(progress>=.68){
   const radius=state.soundRadiusKm*37;c.save();c.beginPath();c.rect(-430,-70,870,218);c.clip();
   for(let i=0;i<3;i++){const r=radius-i*7;if(r<=0)continue;c.beginPath();c.arc(15,141,r,Math.PI,Math.PI*2);c.strokeStyle=i===0?'#765b9bbb':'#765b9b35';c.lineWidth=i===0?2:1;c.stroke();}c.restore();
   label(state.heard?t('雷声到达室内观察者'):t('声波还在路上'),-90,-14,430);
   label(t('声音传播 {{elapsed}} s',{elapsed:state.soundSeconds.toFixed(1)}),-139,63,330);
  }
  label(t('室内观察点'),Math.min(observerX,267),176,180);
  label(t('{{distance}} km · {{delay}} s',{distance:settings.distanceKm.toFixed(1),delay:state.delay.toFixed(1)}),-169,205,310);
  s.end();
 }
 dispose(){this.surface.dispose();}
}
