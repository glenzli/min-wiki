import './daylightLesson.css';
import {daylightExperiment,lightAtDayProgress,daylightDifference,latitudeCirclePoint} from './daylightModel.js';
const TAU=Math.PI*2;
const places=[{name:'北京 · 北纬 39.9°',lat:39.9},{name:'悉尼 · 南纬 33.9°',lat:-33.9},{name:'赤道 · 纬度 0°',lat:0},{name:'北极圈 · 北纬 66.56°',lat:66.56},{name:'北极点 · 北纬 90°',lat:90}];
const seasons=[['春分',0],['夏至',.25],['秋分',.5],['冬至',.75]];
const hours=x=>x===null?'地平线附近':`${x.toFixed(1)} 小时`;
function card(title,subtitle,key) {
 return `<article class="lesson-card" data-comparison="${key}"><header><h3>${title}</h3><small>${subtitle}</small></header><canvas class="lesson-canvas" width="1040" height="540" role="img"></canvas><div class="lesson-measures"><div class="lesson-figures"><strong data-hours></strong><span data-altitude></span></div><div class="lesson-daybar" aria-hidden="true"><span></span></div><div class="lesson-barlabels"><span data-day-label></span><span data-night-label></span></div></div></article>`;
}
function text(ctx,value,x,y,size=12,color='#b1bfd0',align='center') {
 ctx.font=`${size}px system-ui, sans-serif`; ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(value,x,y);
}
function circle(ctx,x,y,r,color) {ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=color;ctx.fill();}
function arrow(ctx,x,y,endX,endY,color='#f6ce77') {
 const angle=Math.atan2(endY-y,endX-x);ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(endX,endY);ctx.stroke();ctx.beginPath();ctx.moveTo(endX,endY);ctx.lineTo(endX-6*Math.cos(angle-.5),endY-6*Math.sin(angle-.5));ctx.lineTo(endX-6*Math.cos(angle+.5),endY-6*Math.sin(angle+.5));ctx.closePath();ctx.fillStyle=color;ctx.fill();
}
function draw(canvas,model,progress) {
 const ctx=canvas.getContext('2d'); if(!ctx)return;
 ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,520,270);
 const cx=222,cy=146,r=56;
 text(ctx,'先看地球',78,26,13,'#e3e9f0');
 text(ctx,'展开这条圈',cx,26,13,'#e3e9f0');
 text(ctx,'阳光从左边来',78,46,10,'#8092ac');
 text(ctx,'黄色越长，白天越长',cx,46,10,'#8092ac');
 const gcx=78,gcy=146,gr=52;
 const gradient=ctx.createRadialGradient(gcx-24,gcy-20,2,gcx,gcy,gr);
 gradient.addColorStop(0,'#39769e');gradient.addColorStop(1,'#17344d');
 circle(ctx,gcx,gcy,gr,gradient);ctx.save();ctx.beginPath();ctx.arc(gcx,gcy,gr,0,TAU);ctx.clip();ctx.fillStyle='#111e32';ctx.fillRect(gcx,gcy-gr,gr,2*gr);ctx.restore();
 for(const y of [gcy-25,gcy,gcy+25])arrow(ctx,2,y,19,y);
 const lean=model.declination*Math.PI/180,ax=-Math.sin(lean),ay=Math.cos(lean)*Math.cos(.35);
 ctx.strokeStyle='#b7d5dc';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(gcx-ax*gr*1.35,gcy+ay*gr*1.35);ctx.lineTo(gcx+ax*gr*1.35,gcy-ay*gr*1.35);ctx.stroke();
 text(ctx,'北',gcx+ax*gr*1.52,gcy-ay*gr*1.52,10,'#d5e7ea');
 for(let j=0;j<120;j++){
  const a=latitudeCirclePoint(model,j/120),b=latitudeCirclePoint(model,(j+1)/120);
  ctx.globalAlpha=a.depth<0?.35:1;ctx.strokeStyle=Math.abs(a.x)<1e-7?'#a3b0bb':a.x<0?'#f6ce77':'#4e72a5';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(gcx+a.x*gr,gcy-a.y*gr);ctx.lineTo(gcx+b.x*gr,gcy-b.y*gr);ctx.stroke();
 }
 ctx.globalAlpha=1;const city=latitudeCirclePoint(model,progress);circle(ctx,gcx+city.x*gr,gcy-city.y*gr,4,'#ef7c69');
 arrow(ctx,137,cy,153,cy,'#899eb8');
 text(ctx,'城市所在的纬度圈',78,227,10,'#b1bfd0');
 // In the plane of a latitude circle, sunlight is a + b cos H.
 // Therefore the day/night boundary is a chord displaced from its centre.
 const phi=model.latitude*Math.PI/180,delta=model.declination*Math.PI/180;
 const a=Math.sin(phi)*Math.sin(delta),b=Math.cos(phi)*Math.cos(delta);
 const boundary=b>1e-10?Math.max(-r,Math.min(r,a/b*r)):a>1e-10?r:a<-1e-10?-r:0;
 circle(ctx,cx,cy,r,'#14253c');ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.clip();ctx.fillStyle='#65502a';
 if(model.daylight!==null)ctx.fillRect(cx-r,cy-r,r+boundary,2*r);
 ctx.restore();
 if(model.daylight!==null && Math.abs(boundary)<r-.1) {
  const y=Math.sqrt(r*r-boundary*boundary);ctx.strokeStyle='#c2ba9e';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(cx+boundary,cy-y);ctx.lineTo(cx+boundary,cy+y);ctx.stroke();ctx.setLineDash([]);
 }
 for(let j=0;j<180;j++) {
  const start=j*TAU/180,side=lightAtDayProgress(model,(j+.5)/180).state;ctx.strokeStyle=side==='horizon'?'#a3b0bb':side==='day'?'#f6ce77':'#4e72a5';ctx.lineWidth=8;ctx.beginPath();ctx.arc(cx,cy,r,Math.PI-start-TAU/180-.003,Math.PI-start+.003);ctx.stroke();
 }
 const h=progress*TAU, mx=cx-r*Math.cos(h),my=cy+r*Math.sin(h),state=lightAtDayProgress(model,progress);
 circle(ctx,mx,my,9,'#0b1422');circle(ctx,mx,my,5,'#ef7c69');
 circle(ctx,cx,cy,3,'#889eb8');text(ctx,'地轴',cx,cy+19,10);
 text(ctx,state.state==='day'?'城市在亮面里 · 白天':state.state==='night'?'城市在暗面里 · 黑夜':'城市在晨昏交界',cx,245,10,state.state==='day'?'#f6ce77':'#9bb6dd');
 ctx.strokeStyle='#26384d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(297,18);ctx.lineTo(297,252);ctx.stroke();
 text(ctx,'正午，太阳有多高？',400,26,13,'#e3e9f0');
 // Local horizon diagram, not a temperature prediction.
 const gx=330,gy=189,R=127,alt=model.noonAltitude*Math.PI/180;
 ctx.strokeStyle='#3b526c';ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(gx,gy,R,-Math.PI/2,0);ctx.stroke();ctx.setLineDash([]);
 ctx.strokeStyle='#9cae96';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(307,gy);ctx.lineTo(492,gy);ctx.stroke();
 text(ctx,'当地地面',421,gy+20,10,'#aeb9ad');
 const sx=gx+R*Math.cos(alt),sy=gy-R*Math.sin(alt);
 if(model.noonAltitude>=0) {
  circle(ctx,sx,sy,11,'#f6ce77');arrow(ctx,sx-15*Math.cos(alt),sy+15*Math.sin(alt),gx+12*Math.cos(alt),gy-12*Math.sin(alt));
  ctx.strokeStyle='#f6ce77';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(gx,gy,35,-alt,0);ctx.stroke();
 } else {circle(ctx,sx,Math.min(233,sy),9,'#516787');text(ctx,'太阳低于地平线',403,76,11,'#9bb6dd');}
 // A small person anchors the diagram at the child's eye level.
 circle(ctx,gx,gy-12,3,'#ef7c69');ctx.strokeStyle='#ef7c69';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(gx,gy-8);ctx.lineTo(gx,gy);ctx.stroke();
 text(ctx,`${model.noonAltitude.toFixed(1)}°`,402,240,18,'#f6ce77');
}

export function mountDaylightLesson(host) {
 let latitude=39.9,orbit=.25,tilt=23.44,progress=0,playing=false,frame=0,lastTime=0;
 host.className='daylight-lesson';
 host.innerHTML=`<div class="lesson-heading"><div><span class="lesson-kicker">先做一个小实验</span><h2>地球歪一点，白天会变多长？</h2><p>先选一个地方。想象你站在那里，跟着地球转一天：<strong>黄色的路在阳光里，蓝色的路在黑夜里。</strong>两边转得一样快，哪边会在阳光里待得更久？</p></div><button class="lesson-reset" type="button">回到北京夏至</button></div>
 <div class="lesson-controls"><label class="lesson-control"><span>我站在</span><select aria-label="实验观察地点">${places.map(p=>`<option value="${p.lat}">${p.name}</option>`).join('')}</select></label><div class="lesson-control"><span>公转到</span><div class="lesson-seasons" role="group" aria-label="实验节气">${seasons.map(([name,value])=>`<button type="button" data-orbit="${value}" aria-pressed="${value===orbit}">${name}</button>`).join('')}</div></div></div>
 <div class="lesson-comparison">${card('如果地轴不倾斜','倾角 0°','zero')}${card('把地轴倾斜一点','倾角 23.44°','tilted')}</div>
 <div class="lesson-action"><label class="lesson-tilt">慢慢改变右边的倾角 <input aria-label="实验地轴倾角" type="range" min="0" max="23.44" step="0.01" value="23.44"><output>23.44°</output></label><div class="lesson-play"><button type="button" data-walk>▶ 让城市走一天</button><span class="lesson-turn">从正午出发</span></div></div>
 <div class="lesson-explanation" aria-live="polite"><strong data-conclusion></strong><p data-reason></p></div>
 <div class="lesson-read-key"><span><i></i>黄色：在阳光里</span><span><i></i>蓝色：在黑夜里</span><span><i></i>红点：我所在的城市</span></div>
 <p class="lesson-limit">小地球始终把太阳放在左侧，随节气换观察方向；展开的圈表示每天绕行的纬度圈，不是地球公转轨道。一天从正午开始，12 秒走完。不计大气折射，白昼是理想几何值。继续往下，可以在三维地球上观察倾斜的地轴。</p>`;
 const select=host.querySelector('select'),slider=host.querySelector('input'),output=host.querySelector('output'),walk=host.querySelector('[data-walk]'),turn=host.querySelector('.lesson-turn');
 const cards=[...host.querySelectorAll('.lesson-card')]; let models=[];
 function render() {cards.forEach((card,i)=>draw(card.querySelector('canvas'),models[i],progress));turn.textContent=progress===0?'从正午出发':progress>=1?'走完一天，回到正午':`已走过 ${(progress*24).toFixed(1)} 小时`;}
 function stop(){playing=false;cancelAnimationFrame(frame);walk.textContent='▶ 让城市走一天';}
 function refresh(){
  stop();progress=0;models=[daylightExperiment(latitude,orbit,0),daylightExperiment(latitude,orbit,tilt)];
  select.value=String(latitude);slider.value=String(tilt);output.value=`${tilt.toFixed(2)}°`;
  host.querySelectorAll('[data-orbit]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.orbit)===orbit)));
  cards.forEach((card,i)=>{
   const m=models[i],night=m.daylight===null?null:24-m.daylight;
   card.querySelector('small').textContent=`倾角 ${m.tilt.toFixed(2)}°`;
   card.querySelector('[data-hours]').textContent=m.daylight===null?'太阳在地平线附近':`白昼 ${hours(m.daylight)}`;
   card.querySelector('[data-altitude]').textContent=`正午太阳高度 ${m.noonAltitude.toFixed(1)}°`;
   card.querySelector('.lesson-daybar').style.background=m.daylight===null?'#55606c':'#3e5c83';
   card.querySelector('.lesson-daybar span').style.width=m.daylight===null?'0%':`${m.daylight/24*100}%`;
   card.querySelector('[data-day-label]').textContent=m.daylight===null?'极点的特殊情况':`白昼 ${hours(m.daylight)}`;
   card.querySelector('[data-night-label]').textContent=night===null?'普通昼长公式不适用':`黑夜 ${hours(night)}`;
   card.querySelector('canvas').setAttribute('aria-label',`${places.find(p=>p.lat===latitude).name}，倾角 ${m.tilt.toFixed(2)} 度；白昼 ${hours(m.daylight)}，正午太阳高度 ${m.noonAltitude.toFixed(1)} 度。黄色为日侧路程，蓝色为夜侧路程。`);
  });
  const m=models[1],place=latitude>0?'北半球':latitude<0?'南半球':'赤道';
  host.querySelector('[data-conclusion]').textContent=Math.abs(latitude)===90 && m.daylight!==null ? (m.daylight>12?'北极整天都在阳光里：极昼。':'北极整天都在黑夜里：极夜。') : daylightDifference(m);
  let reason;
  if(m.daylight===null)reason='极点不画出普通城市的日出日落：太阳始终沿理想地平线运动。试试北京，更容易比较黄色路段的长短。';
  else if(Math.abs(latitude)===90)reason=`这里的纬度圈已经缩成一个点；大圆只表示一天的时间。${m.daylight>12?'整圈都是黄色，表示太阳整天都在地平线上方。':'整圈都是蓝色，表示太阳整天都在地平线下方。'}极点在不倾斜时是地平线退化情况，不能用 12 小时作为比较基准。`;
  else if(tilt<.1)reason='没有倾角时，城市每天走的圈有一半在亮面里、一半在暗面里。把右边的滑块慢慢拉向 23.44°，观察黄色路段和正午太阳。';
  else if(Math.abs(latitude)<.1)reason='赤道很特别：这个模型里白昼全年约 12 小时，但正午太阳高度仍会变化。换到北京或悉尼，白昼长短的变化会更明显。';
  else if(Math.abs(m.declination)<.01)reason='春分和秋分时，两半球都没有偏向太阳；城市绕行的一圈各有一半在日侧和夜侧。地轴仍然倾斜，只是日地连线换了方向。';
  else if(m.daylight>12)reason=`此时${place}倾向太阳，城市绕行的圈有更大一段落在亮面中。黄色路更长，正午太阳也更高：照得更久、照得更直，一起带来这里夏季的日照特点。换到另一半球，看看结果会不会相反。`;
  else reason=`此时${place}背向太阳倾斜，城市绕行的圈落在亮面中的部分变短。黄色路更短，正午太阳也更低：照得更短、照得更斜，一起带来这里冬季的日照特点。`;
  host.querySelector('[data-reason]').textContent=reason+' 气温还会受海洋、大气等影响，不会只跟着这个角度立即变化。';render();
 }
 select.addEventListener('change',()=>{latitude=Number(select.value);refresh();});
 host.querySelectorAll('[data-orbit]').forEach(b=>b.addEventListener('click',()=>{orbit=Number(b.dataset.orbit);refresh();}));
 slider.addEventListener('input',()=>{tilt=Number(slider.value);refresh();});
 host.querySelector('.lesson-reset').addEventListener('click',()=>{latitude=39.9;orbit=.25;tilt=23.44;refresh();});
 function tick(now){if(!playing)return; if(!document.hidden)progress=Math.min(1,progress+Math.min((now-lastTime)/1000,.1)/12);lastTime=now;render();if(progress>=1)stop();else frame=requestAnimationFrame(tick);}
 walk.addEventListener('click',()=>{if(playing){stop();return;}if(progress>=1)progress=0;playing=true;lastTime=performance.now();walk.textContent='Ⅱ 暂停这一圈';frame=requestAnimationFrame(tick);});
 refresh();return {dispose:stop};
}
