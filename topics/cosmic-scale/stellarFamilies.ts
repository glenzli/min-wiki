/** Observed system examples. Orbit phases and coplanar viewing orientation are illustrative. */
export const stellarFamilyCases=['kepler-16','cygnus-x1'] as const;
export type StellarFamilyCase=typeof stellarFamilyCases[number];
export const isStellarFamily=(value:string):value is StellarFamilyCase=>(stellarFamilyCases as readonly string[]).includes(value);
export const familyReferences={
 'kepler-16':{massA:.6897,massB:.20255,period:41.07922,a:.22431,e:.15944,planetA:.7048,planetPeriod:228.776,duration:228.776,
 source:'https://academic.oup.com/mnras/article/511/3/3561/6515255'},
 'cygnus-x1':{massA:40.6,massB:21.2,period:5.599829,a:((40.6+21.2)*(5.599829/365.256)**2)**(1/3),e:0,planetA:0,planetPeriod:0,duration:11.199658,
 source:'https://www.nasa.gov/universe/nasas-ixpe-reveals-shape-orientation-of-hot-matter-around-black-hole/'},
} as const;
export type Point3=readonly[number,number,number];
/** Solve the specified two-body ellipse; this is not a fitted observing epoch or an N-body integration. */
export function ellipticalPoint(a:number,e:number,period:number,days:number):Point3{
 const mean=((days/period)%1)*Math.PI*2;let eccentric=mean;
 for(let i=0;i<8;i++)eccentric-=(eccentric-e*Math.sin(eccentric)-mean)/(1-e*Math.cos(eccentric));
 return [a*(Math.cos(eccentric)-e),a*Math.sqrt(1-e*e)*Math.sin(eccentric),0];
}
export function familyPose(selected:StellarFamilyCase,days:number){
 const data=familyReferences[selected],time=Math.max(0,Math.min(data.duration,Number.isFinite(days)?days:0));
 const relative=ellipticalPoint(data.a,data.e,data.period,time),total=data.massA+data.massB;
 return {a:relative.map(v=>-v*data.massB/total) as unknown as Point3,b:relative.map(v=>v*data.massA/total) as unknown as Point3,planet:selected==='kepler-16'?ellipticalPoint(data.planetA,.0069,data.planetPeriod,time+data.planetPeriod*.22):undefined,time};
}
export {default as familyWords} from './stellarFamilyContent.json';
