import { parcelDisplacement, relativeDensity, sourceDisplacement, packetSpan, receiverArrival, stringProjection } from './model.ts';
import { t } from './i18n.ts';
export class SoundScene {
  private dots: SVGCircleElement[];
  private bands: SVGRectElement[];
  private story: HTMLParagraphElement;
  private sourceLabel: SVGTextElement;
  private receiverLabel: SVGTextElement;
  private tensionLabel: SVGTextElement;
  constructor(private svg: SVGElement, wrap: HTMLElement) {
    const ns = 'http://www.w3.org/2000/svg';
    const air=svg.querySelector('#air-view')!;
    // The same instrument moves into the margin of the air close-up. It never
    // vanishes and is never replaced by a second, unrelated "source" icon.
    const instrument=svg.querySelector('#instrument')!;
    svg.append(instrument);
    // End supports and force arrows carry the explanation. Keep the complete
    // geometry visible at every viewport ratio instead of cropping its ends.
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    const forceLayer=document.createElementNS(ns,'g');
    forceLayer.setAttribute('id','string-forces');
    forceLayer.innerHTML=`<defs><marker id="string-pull-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3" markerHeight="3" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#557580"/></marker><marker id="string-offset-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3" markerHeight="3" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#cfad57"/></marker></defs><path id="string-equilibrium" d="M172 230H728" fill="none" stroke="#dce6df" stroke-width="2" stroke-dasharray="5 6"/><g fill="none" stroke="#557580" stroke-width="4" marker-end="url(#string-pull-head)"><path id="left-pull"/><path id="right-pull"/></g><path id="string-offset" fill="none" stroke="#cfad57" stroke-width="3" marker-end="url(#string-offset-head)"/><circle id="string-middle" cx="450" cy="230" r="7" fill="#edcb72" stroke="#fff1c6" stroke-width="1.5"/><text id="string-tension-caption" x="450" y="112" text-anchor="middle" font-size="17" fill="#405c65"></text>`;
    instrument.insertBefore(forceLayer,svg.querySelector('#string'));
    this.tensionLabel=forceLayer.querySelector('#string-tension-caption')!;
    for(const [tag,attrs] of [
      ['rect',{id:'packet-window',y:'121',height:'218',rx:'8',fill:'#d9ad63',opacity:'.16'}],
      ['path',{id:'packet-front',fill:'none',stroke:'#a86f27','stroke-width':'2.5','stroke-dasharray':'5 6'}],
      ['path',{id:'packet-tail',fill:'none',stroke:'#a86f27','stroke-width':'2','stroke-dasharray':'2 6',opacity:'0'}],
      ['text',{id:'packet-front-label',x:'160',y:'125',fill:'#755226','font-size':'16',opacity:'0'}],
      ['ellipse',{id:'receiver-halo',cx:'816',cy:'230',rx:'18',ry:'76',fill:'#e5b963',stroke:'#b37c29','stroke-width':'2',opacity:'0'}],
    ] as const){const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);air.append(node);}
    air.querySelector('#packet-front-label')!.textContent=t('扰动前沿 · 示意');
    this.bands = Array.from({ length: 42 }, (_, i) => { const r = document.createElementNS(ns, 'rect'); r.setAttribute('x', String(144 + i * 16)); r.setAttribute('y', '138'); r.setAttribute('width', '16'); r.setAttribute('height', '184'); svg.querySelector('#density-bands')!.append(r); return r; });
    this.dots = Array.from({ length: 336 }, (_, i) => { const c = document.createElementNS(ns, 'circle'); c.setAttribute('cy', String(151 + Math.floor(i / 42) * 22)); c.setAttribute('r', '3'); c.setAttribute('fill', '#3c787e'); svg.querySelector('#parcels')!.append(c); return c; });
    const caption=(id:string,x:number,y:number,anchor:'start'|'middle'|'end')=>{
      const node=document.createElementNS(ns,'text');node.setAttribute('id',id);node.setAttribute('x',String(x));node.setAttribute('y',String(y));node.setAttribute('text-anchor',anchor);node.setAttribute('font-size','17');node.setAttribute('fill','#39434a');svg.append(node);return node;
    };
    this.story=document.createElement('p');this.story.id='stage-story';this.story.className='stage-story';wrap.append(this.story);
    this.sourceLabel=caption('source-label',95,291,'middle');
    this.receiverLabel=caption('receiver-label',816,162,'middle');
    this.sourceLabel.textContent=t('同一根橡皮筋');
    this.receiverLabel.textContent=t('鼓膜（示意）');
  }
  draw(time: number, tension: number, amplitude: number, airView: number, showForces=true) {
    const source = sourceDisplacement(time, tension, amplitude);
    const string=stringProjection(source*2,tension);
    const pair=(a:number[],b:number[])=>`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;
    const forces=this.svg.querySelector('#string-forces')!;
    forces.setAttribute('opacity',String(showForces?1-airView:0));
    forces.setAttribute('aria-hidden',String(!showForces||airView>.5));
    this.svg.querySelector('#left-pull')!.setAttribute('d',pair(string.left,string.pullLeft));
    this.svg.querySelector('#right-pull')!.setAttribute('d',pair(string.right,string.pullRight));
    this.svg.querySelector('#string-offset')!.setAttribute('d',pair([450,230],string.middle));
    this.svg.querySelector('#string-offset')!.setAttribute('opacity',Math.abs(source)>.75?'1':'0');
    this.svg.querySelector('#string-middle')!.setAttribute('cy',String(string.middle[1]));
    this.tensionLabel.textContent=t('相对张力 {{tension}} × · 低档仍绷紧',{tension:tension.toFixed(1)});
    this.svg.querySelector('#tuning-grip')!.setAttribute('transform',`rotate(${-45*(tension-1)} 792 230)`);
    const packet = packetSpan(time);
    this.svg.querySelector('#instrument')!.setAttribute('transform',`translate(${-20*airView} ${175*airView}) scale(${1-.76*airView})`);
    this.svg.querySelector('#air-view')!.setAttribute('opacity', String(airView));
    this.sourceLabel.setAttribute('opacity',String(airView));
    this.receiverLabel.setAttribute('opacity',String(airView));
    this.sourceLabel.setAttribute('aria-hidden',String(airView<.5));
    this.receiverLabel.setAttribute('aria-hidden',String(airView<.5));
    this.story.textContent=airView>.5
      ?time===0?t('同一根弦和周围的空气')
        :time<receiverArrival?t('近处先动，扰动正在向右传')
        :time<9?t('前沿已到鼓膜，空气仍在原处往返')
        :time<receiverArrival+9?t('弦已停，后半段扰动还在路上')
        :t('最后一段也通过了鼓膜处')
      :time===0?t('拨动橡皮筋，观察它怎样振动')
        :time<9?t('弦在振动：附近的空气也被带动')
        :t('弦已停；之前发出的扰动还会继续走');
    const window = this.svg.querySelector('#packet-window')!;
    window.setAttribute('x',String(128+packet.tail));window.setAttribute('width',String(Math.max(0,packet.head-packet.tail)));
    const front=this.svg.querySelector('#packet-front')!;
    front.setAttribute('d',`M${128+packet.head} 137V322`);
    front.setAttribute('opacity',packet.visible&&packet.head<688?'0.85':'0');
    const label=this.svg.querySelector('#packet-front-label')!;
    label.setAttribute('x',String(Math.max(138,Math.min(695,128+packet.head-45))));
    label.setAttribute('opacity',packet.visible&&packet.head<688&&time>.5?'1':'0');
    label.setAttribute('aria-hidden',String(!(packet.visible&&packet.head<688&&time>.5)));
    const tail=this.svg.querySelector('#packet-tail')!;
    tail.setAttribute('d',`M${128+packet.tail} 137V322`);
    tail.setAttribute('opacity',packet.visible&&packet.tail>0?'0.8':'0');
    const receiver=this.svg.querySelector('#receiver-halo')!;
    receiver.setAttribute('opacity',String(time>=receiverArrival&&time<receiverArrival+9?0.22+Math.min(.36,Math.abs(parcelDisplacement(688,time,tension,amplitude))/30):0));
    this.svg.querySelector('#string')!.setAttribute('d', Array.from({length: 61}, (_, i) => `${i ? 'L' : 'M'}${172 + i / 60 * 556} ${230 + source * 2 * Math.sin(Math.PI * i / 60)}`).join(''));
    this.svg.querySelector('#piston')!.setAttribute('transform', `translate(${source} 0)`);
    const displacement = parcelDisplacement(336, time, tension, amplitude);
    this.svg.querySelector('#marked-parcel')!.setAttribute('cx', String(128 + 336 + displacement));
    this.svg.querySelector('#marked-guide')!.setAttribute('d', `M464 230H${464 + displacement}`);
    this.svg.querySelector('#receiver')!.setAttribute('d', `M816 171Q${816 + parcelDisplacement(688, time, tension, amplitude) * 2} 230 816 289`);
    this.dots.forEach((dot, i) => dot.setAttribute('cx', String(144 + i % 42 * 16 + parcelDisplacement(16 + i % 42 * 16, time, tension, amplitude))));
    this.bands.forEach((band, i) => { const density = relativeDensity(24 + i * 16, time, tension, amplitude); band.setAttribute('fill', density > 1 ? '#708796' : '#efe4cf'); band.setAttribute('fill-opacity', String(Math.min(.6, Math.abs(density - 1) * 1.4))); });
  }
}
