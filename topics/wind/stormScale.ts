import { t } from './i18n.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { CITY_KM, PLAYGROUND_KM, SCALE_SPANS, scaleProjection, scaleRatios, rulerKm, type ScaleView, type CloudSpan } from './scaleModel.ts';
const random=(i:number)=>{const v=Math.sin(i*127.1+93.7)*43758.5453;return v-Math.floor(v);};
/** A metric, imaginary plan view. No geographic location or hazard footprint is implied. */
export class StormScale{
  private canvas:HTMLCanvasElement;private ctx:CanvasRenderingContext2D|null;private observer:ResizeObserver;
  private view:ScaleView='school';private span=SCALE_SPANS.school;private diameter:CloudSpan=500;private cancel=()=>{};private disposed=false;
  constructor(private host:HTMLElement){
    host.innerHTML=`<div class="scale-heading"><p class="eyebrow">${t('把镜头拉远，才看得见整个风暴')}</p><h2>${t('台风／飓风，到底有多大？')}</h2><p>${t('先认出一个操场，再拉远到城区，最后看整片云系。每次都盯住中央的小点：它还是刚才那个操场。')}</p></div><div class="scale-layout"><div><div class="scale-zoom" role="group" aria-label="${t('选择观察尺度')}"><button data-zoom="school">${t('1 · 操场')}</button><button data-zoom="city">${t('2 · 城区')}</button><button data-zoom="storm">${t('3 · 整片风暴')}</button></div><div class="scale-canvas"><canvas role="img"></canvas><div class="scale-badge" data-badge></div></div><p class="scale-caption">${t('俯视示意 · 全部距离使用同一比例 · 中央定位环不按实际尺寸绘制')}</p></div><aside><h3 data-title></h3><p data-story></p><button data-out></button><div class="size-choice" role="group" aria-label="${t('选择云系跨度示例')}"><button data-diameter="500">500 km</button><button data-diameter="1000">1000 km</button></div><p data-ratio class="scale-ratio"></p><p class="control-note">${t('操场长 100 米、假想城区宽 20 千米，都是本图的参照物。数字比较的是沿直径排成一行的长度，不是面积。')}</p></aside></div><div class="scale-facts"><p>${t('台风和飓风是同类热带气旋在不同海域的称呼。这里的 500 与 1000 千米是云系跨度的教学例子，不是每场风暴的固定大小，也不是最大纪录。')}</p><p>${t('云系边缘、热带风暴级风的范围和飓风级风的范围并不重合。虚线圈只标示所选云系跨度；圈内各处风力不同，范围更大也不等于中心风更强。')}</p><a href="https://repository.library.noaa.gov/view/noaa/12828/noaa_12828_DS1.pdf" target="_blank" rel="noopener">${t('资料：NOAA《Hurricane Basics》')}</a><a href="https://oceanservice.noaa.gov/facts/cyclone.html" target="_blank" rel="noopener">${t('资料：台风与飓风的名称')}</a></div>`;
    this.canvas=host.querySelector('canvas')!;this.ctx=this.canvas.getContext('2d');
    host.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(b=>b.addEventListener('click',()=>this.zoom(b.dataset.zoom as ScaleView)));
    host.querySelectorAll<HTMLButtonElement>('[data-diameter]').forEach(b=>b.addEventListener('click',()=>{this.diameter=Number(b.dataset.diameter) as CloudSpan;this.zoom('storm');}));
    host.querySelector('[data-out]')!.addEventListener('click',()=>this.zoom(this.view==='school'?'city':this.view==='city'?'storm':'school'));
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.canvas);this.update();this.resize();
  }
  private update(){
    const c={school:{title:t('从熟悉的 100 米开始'),body:t('中央的长方形操场长 100 米。想一想：如果风暴也放在这张图里，它的边缘会在哪里？'),next:t('拉远：看看操场所在的城区 →'),badge:t('一个操场 · 长 100 米')},city:{title:t('操场变成一个小点'),body:t('这片假想城区宽 20 千米，相当于 200 个这样的操场首尾相接。中央的定位环帮你找到刚才的操场。'),next:t('再拉远：把整片云系装进画面 →'),badge:t('假想城区 · 宽 20 千米')},storm:{title:t('一整片城区，也只是小小一块'),body:t('现在能看见整片云系了。中央小方框还是那片 20 千米宽的城区；换一个云系跨度，比较两者的大小。'),next:t('回到操场，重新看一次 →'),badge:t('示例云系跨度：{{diameter}} 千米',{diameter:this.diameter})}}[this.view];
    for(const [sel,value] of [['[data-title]',c.title],['[data-story]',c.body],['[data-out]',c.next],['[data-badge]',c.badge]])this.host.querySelector(sel)!.textContent=value;
    const ratio=scaleRatios(this.diameter);
    this.host.querySelector('[data-ratio]')!.textContent=t('{{diameter}} 千米 ≈ {{cities}} 个这样的城区宽度\n也就是 {{grounds}} 个 100 米操场的长度',{diameter:this.diameter,cities:ratio.cities,grounds:ratio.playgrounds});
    this.host.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.zoom===this.view)));
    this.host.querySelectorAll<HTMLButtonElement>('[data-diameter]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.diameter)===this.diameter)));
    (this.host.querySelector('.size-choice') as HTMLElement).hidden=this.view!=='storm';(this.host.querySelector('[data-ratio]') as HTMLElement).hidden=this.view!=='storm';
    this.canvas.setAttribute('aria-label',c.badge+' — '+c.body);
  }
  private zoom(view:ScaleView){
    this.cancel();this.view=view;this.update();
    this.cancel=animateValue({from:Math.log(this.span),to:Math.log(SCALE_SPANS[view]),duration:1400,onUpdate:v=>{this.span=Math.exp(v);this.draw();}});
  }
  private resize(){if(this.disposed)return;const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;const dpr=Math.min(devicePixelRatio,2);this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);this.draw();}
  private draw(){
    if(this.disposed||!this.ctx)return;const c=this.ctx,w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;c.setTransform(this.canvas.width/w,0,0,this.canvas.height/h,0,0);
    const p=scaleProjection(w,h,this.span),rect=(x:number,y:number,dx:number,dy:number,color:string)=>{c.fillStyle=color;c.fillRect(p.x(x),p.y(y+dy),p.size(dx),p.size(dy));};
    const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#d7dfc6');bg.addColorStop(1,'#b7c9ba');c.fillStyle=bg;c.fillRect(0,0,w,h);
    // A fixed imaginary coast and city are retained at every zoom; only detail visibility changes.
    c.fillStyle='#82aeb4';c.beginPath();c.moveTo(p.x(25),-100);c.bezierCurveTo(p.x(10),p.y(20),p.x(40),p.y(-15),p.x(22),h+100);c.lineTo(w+100,h+100);c.lineTo(w+100,-100);c.fill();
    rect(-CITY_KM/2,-CITY_KM/2,CITY_KM,CITY_KM,'#d0d1bf');
    if(this.span>1){
      c.save();c.beginPath();c.rect(p.x(-10),p.y(10),p.size(20),p.size(20));c.clip();
      for(let i=0;i<160;i++){const x=-9.5+random(i)*18.5,y=-9.5+random(i+22)*18.5;rect(x,y,.3+random(i+15)*.8,.3+random(i+2)*.7,i%7===0?'#8fa58a':'#b2b9ad');}
      for(let i=-10;i<=10;i+=2){rect(i,-10,.1,20,'#f4ead8');rect(-10,i,20,.1,'#f4ead8');}c.restore();
    }
    c.strokeStyle='#668d74';c.lineWidth=1.5;c.strokeRect(p.x(-10),p.y(10),p.size(20),p.size(20));
    if(this.span<2){
      rect(-.18,-.16,.36,.32,'#c5d2b4');rect(-.17,.068,.34,.014,'#e6dec7');rect(-.012,-.16,.012,.32,'#e7ddc7');
      rect(.055,.032,.065,.025,'#aaae9c');rect(.055,.03,.065,.004,'#888f82');
      rect(-.12,-.063,.036,.08,'#b4b7a7');
      for(let i=0;i<25;i++){c.fillStyle=i%2?'#7f9b74':'#92aa81';c.beginPath();c.arc(p.x(-.16+random(i)*.32),p.y(.086+random(i+55)*.06),Math.max(.3,p.size(.004+random(i+2)*.003)),0,Math.PI*2);c.fill();}
    }
    // The track's outer horizontal length is exactly 100 m.
    const trackWidth=p.size(PLAYGROUND_KM),trackHeight=p.size(.052);
    if(trackWidth>1){c.fillStyle='#b78769';c.beginPath();c.roundRect(p.x(-.05),p.y(.026),trackWidth,trackHeight,trackHeight/2);c.fill();c.strokeStyle='#f2ddbc';c.lineWidth=Math.min(2,p.size(.001));c.stroke();c.fillStyle='#9eb48a';c.fillRect(p.x(-.027),p.y(.016),p.size(.054),p.size(.032));
      if(this.span<.8){for(let i=0;i<8;i++){c.fillStyle=i%2?'#f2c478':'#466f8a';c.beginPath();c.arc(p.x(-.025+i*.007),p.y(.008+Math.sin(i)*.009),Math.max(.8,p.size(.001)),0,Math.PI*2);c.fill();}}
    }
    if(this.span>55){
      const fade=Math.min(1,(Math.log(this.span)-Math.log(55))/Math.log(3));c.save();c.globalAlpha=fade;
      const r=p.size(this.diameter/2);c.beginPath();c.arc(w/2,h/2,r,0,Math.PI*2);c.clip();
      // Cloud texture is constrained to the chosen illustrative envelope; it is not a wind field.
      for(let i=0;i<300;i++){const u=random(i+543),arm=i%4,a=arm*Math.PI/2+u*5.8,rr=r*(.10+u*.9),x=w/2+Math.cos(a)*rr,y=h/2+Math.sin(a)*rr;
        const radius=r*(.055+random(i+84)*.075),g=c.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,'#fffefa80');g.addColorStop(1,'#fffefa00');c.fillStyle=g;c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.fill();}
      c.restore();c.save();c.globalAlpha=fade;c.strokeStyle='#527887';c.lineWidth=1.5;c.setLineDash([6,6]);c.beginPath();c.arc(w/2,h/2,r,0,Math.PI*2);c.stroke();c.setLineDash([]);
      c.strokeStyle='#3d626d';const y=h/2+r+14;c.beginPath();c.moveTo(w/2-r,y-5);c.lineTo(w/2-r,y+5);c.moveTo(w/2-r,y);c.lineTo(w/2+r,y);c.moveTo(w/2+r,y-5);c.lineTo(w/2+r,y+5);c.stroke();c.fillStyle='#244953';c.font='600 12px sans-serif';c.textAlign='center';c.fillText(`${this.diameter} km`,w/2,y+18);c.restore();
      // Re-outline the same city above the translucent cloud layer.
      c.strokeStyle='#30564a';c.lineWidth=2;c.strokeRect(p.x(-10),p.y(10),p.size(20),p.size(20));
      c.beginPath();c.moveTo(p.x(-10),p.y(-10));c.lineTo(w/2-30,h/2+26);c.stroke();c.fillStyle='#30564a';c.font='11px sans-serif';c.textAlign='right';c.fillText(t('城区宽 20 千米'),w/2-34,h/2+30);
    }
    // Fixed-size locator is explicitly a locator, never a physical city/track boundary.
    if(trackWidth<8){c.strokeStyle='#334e48';c.lineWidth=1.5;c.beginPath();c.arc(w/2,h/2,7,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(w/2+8,h/2);c.lineTo(w/2+30,h/2-20);c.stroke();c.fillStyle='#2b4943';c.textAlign='left';c.font='11px sans-serif';c.fillText(t('刚才的操场'),w/2+34,h/2-20);}
    const km=rulerKm(this.span),length=p.size(km);c.fillStyle='#f4f6eee8';c.fillRect(12,h-51,length+28,39);c.strokeStyle='#38584f';c.lineWidth=2;c.beginPath();c.moveTo(24,h-36);c.lineTo(24+length,h-36);c.stroke();c.fillStyle='#38584f';c.font='11px sans-serif';c.textAlign='left';c.fillText(km<1?`${Math.round(km*1000)} m`:`${km} km`,24,h-21);
  }
  dispose(){this.disposed=true;this.cancel();this.observer.disconnect();}
}
