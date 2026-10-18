const clamp = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => { const v = clamp(x); return v * v * (3 - 2 * v); };
/** One grain retains its identity through transport and contact. Later phases compress plant development. */
export function pollinationFrame(progress: number, compatible=true) {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(3, progress)) : 0;
  const approach = smooth(p / .42), departure = smooth((p - .65) / .7);
  const beeX = 132 + 102 * approach - 150 * departure;
  const beeY = 252 - 80 * departure;
  const deposited = p >= .42;
  return { beeX, beeY, deposited,
    pollenX: deposited ? 275 : beeX + 41,
    pollenY: deposited ? 250 : beeY - 2,
    tube: compatible?smooth((p - .49) / .51):Math.min(.22,smooth((p - .49) / .51)),
    fertilized: compatible&&p>=1,
    fruitDevelopment: compatible?Math.max(0,p-1):0,
  };
}

/** Retained organ geometry for a cherry, expressed in illustration coordinates.
 * The same ovary expands at a fixed stalk attachment. The cutaway keeps the
 * ovule/seed centered while surrounding ovary-wall layers enlarge and harden. */
export function fruitGeometry(progress:number,compatible=true){
  const p=Number.isFinite(progress)?Math.max(0,Math.min(3,progress)):0;
  const development=pollinationFrame(p,compatible).fruitDevelopment;
  const grow=smooth(development/2),ripe=smooth((development-.85)/1.15);
  const scale=.13+.87*grow;
  return {development,grow,ripe,scale,
    attachment:{x:274,y:265},
    center:{x:274-6*scale,y:265+67*scale},
    sectionCenter:{x:601,y:323},sectionScale:.43+.37*grow,
    seedScale:1+.32*smooth(development/1.4),stone:smooth((development-.24)/1.25),
    wilt:smooth(development/.8),
    petals:Array.from({length:5},(_,i)=>{
      const fall=smooth((development-.18-i*.075)/(1.03+i*.06)),angle=i*72+11;
      const a=angle*Math.PI/180;
      return {x:Math.sin(a)*fall*(58+i*7),y:fall*fall*(174+i*11),angle:angle+(i%2?1:-1)*fall*47,
        curl:smooth((development-i*.035)/.85),
        width:1-.24*smooth(development/.85),length:1-.2*smooth(development/.85),
        opacity:1-smooth((fall-.78)/.22)};
    })};
}
