/** Recognition drawings. The caller supplies the exact physical span, or labels a separate inset.
 * City buildings and orbital position symbols identify objects; only their marked span is a ruler. */
export function drawReference(c: CanvasRenderingContext2D, id: string, x: number, y: number, span: number, portrait = false) {
  c.save(); c.translate(x, y); c.scale(span, span); c.lineWidth = 1 / span;
  const circle = (x: number, y: number, r: number, color: string) => {
    c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  };
  if (id === 'journey') {
    // A stipulated city width, not a map or scale model of individual buildings.
    c.fillStyle = '#234c4e'; c.fillRect(-.5, .16, 1, .08);
    c.fillStyle = '#708895'; c.fillRect(-.5, .24, 1, .05);
    c.strokeStyle = '#e9d9ab'; c.setLineDash([.03, .03]);
    c.beginPath(); c.moveTo(-.5, .265); c.lineTo(.5, .265); c.stroke(); c.setLineDash([]);
    for (let i = 0; i < 10; i++) {
      const left = -.46 + i * .094, height = [.13,.22,.18,.36,.48,.33,.2,.29,.16,.12][i]!;
      c.fillStyle = ['#83b1b8','#c5b392','#739aa6'][i % 3]!; c.fillRect(left, .16-height, .07, height);
      if (i === 0 || i === 8 || i === 9) {
        c.fillStyle = '#c78268'; c.beginPath(); c.moveTo(left-.01,.16-height); c.lineTo(left+.035,.11-height); c.lineTo(left+.08,.16-height); c.fill();
      }
      c.fillStyle = '#ffdda0';
      for (let row = .035; row < height-.01; row += .06) for (const col of [.016,.043]) c.fillRect(left+col,.16-row,.012,.024);
    }
    for (const tx of [-.49,-.27,.23,.48]) { c.fillStyle='#ad9976'; c.fillRect(tx-.006,.1,.012,.1); circle(tx,.075,.029,'#7faf87'); }
  } else if (id === 'neptune-orbit') {
    c.strokeStyle = '#8facdf';
    for (const orbit of [1,5.203,9.537,19.191,30.07]) { c.beginPath(); c.arc(0,0,.5*orbit/30.07,0,Math.PI*2); c.stroke(); }
    // Marker symbols, not inflated physical disks in the measured view.
    if (portrait) { circle(0,0,.055,'#ffdb83'); circle(.5,0,.048,'#719de3'); }
    else {
      c.strokeStyle='#ffe2a4'; c.beginPath(); c.moveTo(-.025,0); c.lineTo(.025,0); c.moveTo(0,-.025); c.lineTo(0,.025); c.stroke();
      c.strokeStyle='#90c4ff'; c.beginPath(); c.arc(.5,0,.025,0,Math.PI*2); c.stroke();
    }
  } else if (id === 'milky-way') {
    const haze = c.createRadialGradient(0,0,0,0,0,.5);
    haze.addColorStop(0,'#ffe0adaf'); haze.addColorStop(.2,'#ceb49666'); haze.addColorStop(.75,'#99bbdb30'); haze.addColorStop(1,'#99bbdb00');
    c.fillStyle=haze; c.fillRect(-.5,-.5,1,1);
    for (let n=0;n<550;n++) {
      const q=(n+.5)/550,r=.48*Math.sqrt(q),a=n*2.39996323,arm=.5+.5*Math.cos(a*3-r*30);
      circle(Math.cos(a)*r,Math.sin(a)*r,.0035,`rgba(185,207,231,${(.15+.65*arm)*(1-q)})`);
    }
  } else {
    const colors: Record<string,string> = {earth:'#66b9e7',jupiter:'#e0b994',sun:'#ffde89',arcturus:'#efb36e',antares:'#ed8860','vy-canis-majoris':'#ed8860'};
    const g=c.createRadialGradient(-.13,-.15,.02,0,0,.5); g.addColorStop(0,colors[id]??'#ffe29c'); g.addColorStop(.8,colors[id]??'#ffe29c'); g.addColorStop(1,'#583c32');
    c.beginPath(); c.arc(0,0,.5,0,Math.PI*2); c.clip(); c.fillStyle=g; c.fillRect(-.5,-.5,1,1);
    if (id === 'earth') {
      c.fillStyle='#90b66b';
      for (const points of [[[-.4,-.24],[-.13,-.35],[.03,-.2],[-.1,-.06],[-.02,.09],[-.2,.3],[-.28,.1]],[[.22,-.34],[.47,-.15],[.31,.09],[.4,.25],[.16,.15],[.08,-.02]]]) {
        c.beginPath(); points.forEach(([px,py],i)=>i?c.lineTo(px!,py!):c.moveTo(px!,py!)); c.fill();
      }
      c.strokeStyle='#ffffff65'; c.lineWidth=.035; c.beginPath(); c.ellipse(0,.02,.43,.15,-.4,0,Math.PI*2); c.stroke();
    } else if (id === 'jupiter') {
      for (let n=0;n<9;n++) { c.fillStyle=n%2?'#b7795766':'#f4d5b980'; c.fillRect(-.5,-.46+n*.11,1,.06); }
      c.fillStyle='#ac634e'; c.beginPath(); c.ellipse(.16,.15,.12,.065,0,0,Math.PI*2); c.fill();
    } else {
      for (let n=0;n<200;n++) { const r=.49*Math.sqrt((n+.5)/200),a=n*2.39996323; circle(Math.cos(a)*r,Math.sin(a)*r,.011+(n%4)*.006,n%2?'#ffdcaa30':'#7d362526'); }
    }
  }
  c.restore();
}

export function referencePortrait(id: string) {
  const canvas=document.createElement('canvas'); canvas.width=128; canvas.height=88;
  canvas.setAttribute('aria-hidden','true');
  drawReference(canvas.getContext('2d')!,id,64,44,76,true);
  return canvas;
}
