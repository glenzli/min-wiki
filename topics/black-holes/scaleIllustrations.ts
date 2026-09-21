/** Recognition drawings. The caller supplies the exact physical span, or labels a separate inset.
 * City buildings and orbital position symbols identify objects; only their marked span is a ruler. */
export function drawReference(c: CanvasRenderingContext2D, id: string, x: number, y: number, span: number, portrait = false) {
  c.save(); c.translate(x, y); c.scale(span, span); c.lineWidth = 1 / span;
  const circle = (x: number, y: number, r: number, color: string) => {
    c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  };
  if (id === 'journey') {
    // Straight-down aerial illustration. Only the full horizontal span is a physical ruler;
    // streets, roofs and landmarks are enlarged recognition details, not a measured map.
    c.beginPath(); c.roundRect(-.5, -.41, 1, .82, .025); c.clip();
    c.fillStyle = '#648371'; c.fillRect(-.5, -.41, 1, .82);
    for (let n = 0; n < 90; n++) {
      const px = -.49 + ((n * 37) % 97) / 98, py = -.4 + ((n * 29) % 79) / 98;
      circle(px, py, .013 + (n % 4) * .007, n % 2 ? '#79917d' : '#547762');
    }
    // City blocks retain a recognisable street pattern even in the small reference card.
    const block = .115;
    for (let row = 0; row < 6; row++) for (let col = 0; col < 8; col++) {
      const bx = -.46 + col * block, by = -.345 + row * block;
      const park = (row === 1 && col === 1) || (row === 4 && col === 5) || (row === 0 && col === 6);
      c.fillStyle = park ? '#438367' : '#a6aa9c'; c.fillRect(bx, by, .097, .096);
      if (park) {
        c.strokeStyle = '#c7c7a0'; c.lineWidth = .008;
        c.beginPath(); c.moveTo(bx+.01,by+.08); c.lineTo(bx+.07,by+.02); c.stroke();
        for (let tree=0; tree<5; tree++) circle(bx+.018+(tree%3)*.029,by+.02+Math.floor(tree/3)*.048,.014,'#396e54');
      } else {
        for (let roof=0; roof<6; roof++) {
          const rx=bx+.011+(roof%3)*.03, ry=by+.012+Math.floor(roof/3)*.043;
          const rw=.016+(col+roof)%2*.007, rh=.024+(row+roof)%2*.008;
          c.fillStyle='#586569'; c.fillRect(rx+.005,ry+.005,rw,rh);
          c.fillStyle=['#e0d5ba','#c6c8bf','#b79b85'][(row+col+roof)%3]!; c.fillRect(rx,ry,rw,rh);
          c.fillStyle='#edf0d630'; c.fillRect(rx,ry,rw,.006);
        }
      }
    }
    // Main avenues and a curving river, seen from above; bridges connect both banks.
    const road = (y: number, width: number, color: string) => {
      c.strokeStyle=color; c.lineWidth=width; c.beginPath(); c.moveTo(-.5,y); c.lineTo(.5,y); c.stroke();
    };
    for (const ay of [-.19, .155]) {
      road(ay,.031,'#53676a'); road(ay,.021,'#d4d1b6');
    }
    c.strokeStyle='#d4d1b6'; c.lineWidth=.016; c.beginPath(); c.moveTo(-.245,-.41); c.lineTo(-.245,.41); c.stroke();
    const river = () => {
      c.beginPath(); c.moveTo(.12,-.46); c.bezierCurveTo(-.08,-.2,.26,-.12,.1,.08);
      c.bezierCurveTo(-.04,.26,.11,.33,.04,.46);
    };
    river(); c.strokeStyle='#789781'; c.lineWidth=.11; c.stroke();
    river(); c.strokeStyle='#437f96'; c.lineWidth=.075; c.stroke();
    river(); c.strokeStyle='#69a4b3'; c.lineWidth=.044; c.stroke();
    for (const [bx,by] of [[.09,-.19],[.072,.155]]) {
      c.strokeStyle='#465b60'; c.lineWidth=.034; c.beginPath(); c.moveTo(bx!-.075,by!); c.lineTo(bx!+.075,by!); c.stroke();
      c.strokeStyle='#e9dcc0'; c.lineWidth=.021; c.stroke();
    }
    // A large green sports ground is an orientation landmark rather than another size ruler.
    c.fillStyle='#e4d8b9'; c.beginPath(); c.ellipse(-.3,.26,.071,.041,0,0,Math.PI*2); c.fill();
    c.fillStyle='#4a8b68'; c.fillRect(-.346,.237,.092,.046);
    c.strokeStyle='#d2e2c1'; c.lineWidth=.003; c.strokeRect(-.34,.241,.08,.038);
    c.beginPath(); c.moveTo(-.3,.241); c.lineTo(-.3,.279); c.stroke();
  } else if (id === 'neptune-orbit') {
    // Circular teaching orbits, using rounded semimajor axes in AU. Only the separately
    // labelled recognition portraits spread the inner orbits out; the measured view is linear.
    // Phases are fixed illustrative positions, not an ephemeris. Icons are not physical disks.
    const planets = [
      { id:'mercury', au:.387, angle:-2.2, color:'#b9b4a9', size:.023 },
      { id:'venus', au:.723, angle:.65, color:'#e8c47f', size:.029 },
      { id:'earth', au:1, angle:2.4, color:'#66b9e7', size:.033 },
      { id:'mars', au:1.524, angle:-.6, color:'#df8968', size:.025 },
      { id:'jupiter', au:5.203, angle:-1.35, color:'#e0b994', size:.051 },
      { id:'saturn', au:9.537, angle:2.8, color:'#dec899', size:.042 },
      { id:'uranus', au:19.191, angle:.9, color:'#91d4dd', size:.034 },
      { id:'neptune', au:30.07, angle:-.1, color:'#719de3', size:.036 },
    ];
    const portraitRadii = [.09,.145,.20,.25,.31,.375,.435,.5];
    for (const [i,planet] of planets.entries()) {
      const radius = portrait ? portraitRadii[i]! : .5*planet.au/30.07;
      c.strokeStyle = i === 7 ? '#a6d4ff' : '#8facdf70';
      c.lineWidth = (i === 7 ? 1.5 : .7) / span;
      c.beginPath(); c.arc(0,0,radius,0,Math.PI*2); c.stroke();
    }
    const sunRadius = portrait ? .047 : .009;
    const glow=c.createRadialGradient(0,0,0,0,0,sunRadius*2.5);
    glow.addColorStop(0,'#ffdb83aa'); glow.addColorStop(1,'#ffdb8300');
    c.fillStyle=glow; c.fillRect(-sunRadius*2.5,-sunRadius*2.5,sunRadius*5,sunRadius*5);
    circle(0,0,sunRadius,'#ffdc83');
    for (const [i,planet] of planets.entries()) {
      const radius = portrait ? portraitRadii[i]! : .5*planet.au/30.07;
      const px=Math.cos(planet.angle)*radius, py=Math.sin(planet.angle)*radius;
      const r=portrait ? planet.size : i<4 ? .004 : planet.size*.65;
      if (planet.id === 'earth' || planet.id === 'jupiter') drawReference(c,planet.id,px,py,r*2);
      else {
        const surface=c.createRadialGradient(px-r*.3,py-r*.3,r*.1,px,py,r);
        surface.addColorStop(0,planet.color); surface.addColorStop(.65,planet.color); surface.addColorStop(1,'#334657');
        c.fillStyle=surface; c.beginPath(); c.arc(px,py,r,0,Math.PI*2); c.fill();
      }
      if (planet.id === 'saturn') {
        c.strokeStyle='#e5d5b6'; c.lineWidth=r*.37;
        c.beginPath(); c.ellipse(px,py,r*1.8,r*.55,-.35,0,Math.PI*2); c.stroke();
      }
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
