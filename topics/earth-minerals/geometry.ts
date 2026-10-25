export type Point3 = readonly [number, number, number];
export interface Network { points: Point3[]; edges: [number, number][]; }
/** Cubic diamond conventional basis, coordinates in quarter-cell units. Open boundaries. */
export function diamondNetwork(): Network {
  const basis: Point3[] = [[0,0,0],[0,2,2],[2,0,2],[2,2,0],[1,1,1],[1,3,3],[3,1,3],[3,3,1]];
  const points: Point3[] = [];
  for(let x=0;x<2;x++) for(let y=0;y<2;y++) for(let z=0;z<2;z++) for(const p of basis) points.push([p[0]+4*x,p[1]+4*y,p[2]+4*z]);
  const edges: [number,number][] = [];
  for(let a=0;a<points.length;a++) for(let b=a+1;b<points.length;b++) {
    const square=points[a].reduce((sum,v,i)=>sum+(v-points[b][i])**2,0);
    if(square===3) edges.push([a,b]);
  }
  return {points,edges};
}
/** Open honeycomb patch, equal in-plane bond lengths; no fictitious inter-layer bonds. */
export function graphiteSheet(): Network {
  const points: Point3[] = [], edges: [number,number][] = [], keys=new Map<string,number>(), edgeKeys=new Set<string>();
  for(let q=0;q<3;q++) for(let r=0;r<2;r++) {
    const cx=1.5*q, cz=Math.sqrt(3)*(r+q/2);
    const ids:number[]=[];
    for(let k=0;k<6;k++) {
      const p:Point3=[cx+Math.cos(k*Math.PI/3),0,cz+Math.sin(k*Math.PI/3)];
      const key=p.map(x=>Math.round(x*1e6)).join(',');
      let id=keys.get(key); if(id===undefined){id=points.length;keys.set(key,id);points.push(p);} ids.push(id);
    }
    for(let k=0;k<6;k++) {const pair=[ids[k],ids[(k+1)%6]].sort((a,b)=>a-b) as [number,number]; const key=pair.join(','); if(!edgeKeys.has(key)){edgeKeys.add(key);edges.push(pair);}}
  }
  return {points,edges};
}
/** A bounded camera record, shared by the two material views. */
export function parseCamera(value: unknown): { position: [number,number,number]; target: [number,number,number] } | undefined {
  if(typeof value!=='string'||value.length>240)return;
  try {
    const parsed=JSON.parse(value);
    if(!parsed||typeof parsed!=='object')return;
    const valid=(p:unknown):p is [number,number,number]=>Array.isArray(p)&&p.length===3&&p.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=30);
    if(!valid(parsed.position)||!valid(parsed.target))return;
    const distance=Math.hypot(...parsed.position.map((v:number,i:number)=>v-parsed.target[i]));
    if(distance<3||distance>18||Math.hypot(...parsed.target)>0.01)return;
    return {position:parsed.position,target:parsed.target};
  }catch{return;}
}
