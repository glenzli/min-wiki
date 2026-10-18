const clamp = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => { const v = clamp(x); return v * v * (3 - 2 * v); };
export const BEE_VISIT={contact:.42,departure:.72,exit:1.42} as const;
/** One grain retains its identity through transport and contact. Later phases compress plant development. */
export function pollinationFrame(progress: number, compatible=true) {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(3, progress)) : 0;
  const approach = smooth(p / BEE_VISIT.contact);
  const departure = smooth((p-BEE_VISIT.departure)/(BEE_VISIT.exit-BEE_VISIT.departure));
  // A curved approach settles onto the stigma, followed by a forward/upward
  // departure. The reference point carrying pollen stays identical at contact.
  const hover=1-smooth((p-.27)/.15);
  const beeX = 132 + 102 * approach + 205 * departure;
  const beeY = 252-18*Math.sin(Math.PI*approach)-135*departure-22*Math.sin(Math.PI*departure)
    +2.8*hover*Math.sin(p*8*Math.PI*2*.78);
  const deposited = p >= BEE_VISIT.contact;
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
      const flutter=Math.sin(Math.PI*fall);
      return {x:Math.sin(a)*fall*(58+i*7)+Math.sin(fall*5+i)*fall*flutter*9,
        y:fall*fall*(174+i*11),angle:angle+(i%2?1:-1)*fall*47+Math.sin(fall*9+i)*flutter*7,
        curl:smooth((development-i*.035)/.85),
        width:1-.24*smooth(development/.85),length:1-.2*smooth(development/.85),
        opacity:1-smooth((fall-.78)/.22)};
    })};
}
