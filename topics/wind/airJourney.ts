import { t } from './i18n.ts';
import { guidePoint, guidePhase, type RouteStage, journeyOrder } from './journeyModel.ts';
import type { WindSession, World } from './session.ts';
const colors=['#347d8a','#b57425','#8472a3'];
const content={
  coast:{title:t('先找到空气来去的路'),bridge:t('从海岸开始：低处的空气流过来，在较暖的一侧上升，高处又返回。把地面和天空一起看，才能看到这个环流。'),extra:t('记住这三个问题：空气从哪里来？在哪里上升？到了高处又去哪里？'),steps:[t('低处：空气流过来'),t('暖处：空气升上去'),t('高处：返回，再下沉')],notes:[t('白天的海风从海面吹向陆地。换到夜晚，陆地可能更冷，近地风会反向。'),t('较暖一侧的空气上升；不是只有你身边那一层空气在运动。'),t('高处有返回的气流，另一侧有下沉。这是海陆风的理想化环流，不是每一阵风都必须绕成的圈。')]},
  typhoon:{title:t('带着三个问题，走进台风'),bridge:t('还记得“低处来、往上走、高处去”吗？在台风里也能找到这条线索；这次低层空气一边向内汇入，一边绕着中心旋转。'),extra:t('新条件：暖海供给热量和水汽，凝结释放热量，地球自转影响大范围气流转向。海岸环流不会直接变成台风。'),steps:[t('低处：旋转着汇入'),t('眼墙：空气向上走'),t('高处：向外散开')],notes:[t('近海面的空气从外围螺旋向内走。只俯视云图，容易漏掉它向内和向上的运动。'),t('很多暖湿空气在眼墙中上升；风眼中心则可有下沉。环流里不同位置的运动不同。'),t('空气在高处向外流出。周围环境还会与风暴交换空气，不是同一团空气在一个封闭小圈里无限绕行。')]},
  tornado:{title:t('再问一次：雷暴里的空气怎样走？'),bridge:t('同样先找进入和上升的空气，再看旋转集中在哪里。龙卷风是雷暴中的局部强涡旋；它不是把整个台风缩小。'),extra:t('新条件：不同高度的风和雷暴上升气流参与旋转的发展。并非每个旋转的雷暴都会产生触地龙卷风。'),steps:[t('低处：空气进入涡旋'),t('局部：旋转着上升'),t('上方：连接雷暴')],notes:[t('这里观察已形成的近地面涡旋：空气可以向内汇入。形成过程另需观察风切变、上升气流与近地面条件。'),t('一条上升路线加上旋转，看起来像绕着轴走的螺旋；真实龙卷风内部还可能有下沉和多个小涡旋。'),t('龙卷风与上方雷暴相连，雷暴还包含其他上升和下沉气流。侧面的简图没有画出全部三维运动。')]}
};
/** One diagram vocabulary follows the selected environment; the main playback owns its clock. */
export class AirJourney{
  private world:World='coast';private playing=false;private selected:RouteStage|3=3;private key='';
  constructor(private host:HTMLElement,private observe:(play:boolean)=>void,private visit:(world:World)=>void,private lookDown:()=>void){
    host.innerHTML=`<div class="journey-heading"><div><p class="eyebrow">${t('把刚学会的线索带到下一站')}</p><h2 data-title></h2></div><button data-follow>${t('连起来看空气的路')}</button></div><p data-bridge></p><div class="journey-body"><div><svg viewBox="0 0 600 205" role="img" aria-label="${t('空气进入、上升与去向的侧面简图')}"><defs>${colors.map((c,i)=>`<marker id="route-arrow-${i}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="${c}"/></marker>`).join('')}</defs><path d="M35 181 H565" stroke="#c6c9b9" stroke-width="3"/>${colors.map((c,i)=>`<path data-route="${i}" fill="none" stroke="${c}" stroke-width="3" marker-end="url(#route-arrow-${i})"/>`).join('')}<circle data-dot r="7" fill="#c17e32" stroke="#fff" stroke-width="3"/></svg><p class="diagram-note">${t('路线简图 · 颜色标记同一种运动 · 不是同一比例')}</p></div><div><div class="journey-steps">${colors.map((c,i)=>`<button data-route-step="${i}" aria-pressed="false" style="--route-color:${c}"><b>${i+1}</b><span></span></button>`).join('')}</div><p data-note aria-live="polite"></p></div></div><p class="journey-extra" data-extra></p><div class="journey-actions"><button data-prev>${t('回看海岸的环流')}</button><button data-next></button><button data-turn>${t('从上方看旋转')}</button><button data-size>${t('它到底有多大？')}</button></div>`;
    host.querySelectorAll<HTMLButtonElement>('[data-route-step]').forEach(b=>b.addEventListener('click',()=>{this.selected=Number(b.dataset.routeStep) as RouteStage;this.key='';this.observe(false);}));
    host.querySelector('[data-follow]')!.addEventListener('click',()=>{const running=!this.playing||this.selected!==3;this.selected=3;this.key='';this.observe(running);});
    host.querySelector('[data-prev]')!.addEventListener('click',()=>this.visit('coast'));
    host.querySelector('[data-next]')!.addEventListener('click',()=>this.visit(journeyOrder[(journeyOrder.indexOf(this.world)+1)%3]));
    host.querySelector('[data-turn]')!.addEventListener('click',()=>this.lookDown());
    host.querySelector('[data-size]')!.addEventListener('click',()=>{const target=document.getElementById('storm-scale')!;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});});
  }
  update(s:WindSession){
    this.playing=s.playing;const follow=this.host.querySelector('[data-follow]')!,following=s.playing&&this.selected===3;
    const label=following?t('暂停追踪'):t('连起来看空气的路');if(follow.textContent!==label)follow.textContent=label;follow.setAttribute('aria-pressed',String(following));
    if(this.world!==s.world){this.world=s.world;this.selected=3;this.key='';}
    const time=s.world==='coast'?s.coast.time:s[s.world].time;
    const phase=this.selected===3?guidePhase(s.world,time,s.coast.travel):(this.selected+.5)/3;
    const point=guidePoint(s.world,phase,s.coast.heat),active=point.stage;
    const c=content[s.world],key=`${s.world}:${this.selected}:${active}:${s.coast.heat<0}`;
    if(key!==this.key){
      this.key=key;const text=(selector:string,value:string)=>{this.host.querySelector(selector)!.textContent=value;};
      text('[data-title]',c.title);text('[data-bridge]',c.bridge);text('[data-extra]',c.extra);text('[data-note]',c.notes[active]);
      this.host.querySelectorAll<HTMLButtonElement>('[data-route-step]').forEach((b,i)=>{b.querySelector('span')!.textContent=c.steps[i];b.setAttribute('aria-pressed',String(i===this.selected));b.dataset.current=String(i===active);});
      this.host.querySelectorAll<SVGPathElement>('[data-route]').forEach((path,i)=>{const points=Array.from({length:61},(_,j)=>guidePoint(s.world,(i+j/60)/3,s.coast.heat));path.setAttribute('d',points.map((p,j)=>`${j?'L':'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '));path.setAttribute('opacity',String(this.selected===3||this.selected===i?1:.2));});
      (this.host.querySelector('[data-prev]') as HTMLElement).hidden=s.world==='coast';
      text('[data-next]',s.world==='coast'?t('下一站：台风／飓风 →'):s.world==='typhoon'?t('下一站：龙卷风 →'):t('回到海岸，再找一次 →'));
      (this.host.querySelector('[data-size]') as HTMLElement).hidden=s.world!=='typhoon';
      (this.host.querySelector('[data-turn]') as HTMLElement).hidden=s.world!=='typhoon';
      this.host.querySelector('.diagram-note')!.textContent=s.world==='coast'?t('路线简图 · 颜色标记同一种运动 · 不是同一比例'):t('已形成风暴的侧面路线简图 · 不展示全部气流 · 各图不同比例');
    }
    const p=point,dot=this.host.querySelector('[data-dot]')!;
    dot.setAttribute('cx',String(p.x));dot.setAttribute('cy',String(p.y));dot.setAttribute('opacity',String(p.opacity));dot.setAttribute('fill',colors[p.stage]);
  }
}
