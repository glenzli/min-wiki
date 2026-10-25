import * as THREE from 'three';
import { basinPoint, eventDrop, eventDropAtFraction, faultInfluence, faultX, fieldNoise, lerp, riftLongitude, terrainHeight, type RiftFrame } from './model';

export type Block = 'left' | 'basin' | 'right';
export type Layer = 'crust' | 'lithosphere' | 'asthenosphere';
export type MutableGeometry = { geometry: THREE.BufferGeometry; update(frame: RiftFrame): void };
const halfDepth = 1.38;
export function beddingPoint(block:Block,u:number,level:number,frame:RiftFrame):[number,number,number]{
  const outer=3.02+frame.extension*.12,base=.15-level*.18+Math.sin(halfDepth*1.7)*.015+(block==='basin'?-frame.basinDrop:frame.thinning*.04);
  if(block==='basin'){const [x,y]=basinPoint(u,base,frame);return[x,y,halfDepth+.018];}
  return[lerp(block==='left'?-outer:faultX(base,frame,'right'),block==='right'?outer:faultX(base,frame,'left'),u),base,halfDepth+.018];
}

export function mantleContact(x: number, frame: RiftFrame): number {
  return -1.1 + frame.upwelling * .3 * Math.exp(-x * x / 1.6);
}
export function blockSurface(block: Block, x: number, z: number, frame: RiftFrame, u?:number): number {
  const base=.43+(block==='basin'?-frame.basinDrop:frame.thinning*.04)+terrainHeight(x,z,block==='basin');
  const influence=u===undefined?faultInfluence(x,frame,base):1-u;
  const bend=frame.quake.strain*.035*Math.exp(-Math.pow(x+.6,2)/.35)*influence**2*(block==='basin'?-1:1);
  return base-(block==='basin'?(u===undefined?eventDrop(x,frame,base):eventDropAtFraction(u,frame)):0)+bend;
}
export function crustContact(block: Block, x: number, z: number, frame: RiftFrame, u?:number): number {
  const base = block === 'basin' ? .43 - frame.basinDrop : .43 + frame.thinning * .04;
  const thickness = block === 'basin' ? .7 - frame.thinning * .35 : .7;
  const y=base-thickness+Math.sin(z*1.7)*.015;
  return y-(block==='basin'?(u===undefined?eventDrop(x,frame,y):eventDropAtFraction(u,frame)):0);
}
function edges(block: Block, y: number, frame: RiftFrame): [number, number] {
  const outer = 3.02 + frame.extension * .12;
  if (block === 'left') return [-outer, faultX(y, frame, 'left')];
  if (block === 'right') return [faultX(y, frame, 'right'), outer];
  return [faultX(y, frame, 'left'), faultX(y, frame, 'right')];
}

/** Closed, retained terrain volumes. Every adjacent layer consumes the same contact. */
export function createBlockGeometry(block: Block, layer: Layer, across: number, along: number): MutableGeometry {
  const samples: { u: number; v: number; w: number }[] = [], uv: number[] = [], indices: number[] = [];
  const groups: [number, number, number][] = [];
  const face = (nx: number, ny: number, material: number, point: (u: number, v: number) => { u: number; v: number; w: number }, reverse = false) => {
    const first = samples.length, start = indices.length;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const a = i / nx, b = j / ny; samples.push(point(a, b)); uv.push(a, b);
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = first + j * (nx + 1) + i, b = a + nx + 1;
      if (reverse) indices.push(a, a + 1, b, a + 1, b + 1, b); else indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    groups.push([start, indices.length - start, material]);
  };
  face(across, along, 0, (u,v) => ({ u, v, w: 0 }));
  face(across, along, 1, (u,v) => ({ u, v, w: 1 }), true);
  face(across, 8, 1, (u,w) => ({ u, v: 0, w }), true);
  face(across, 8, 1, (u,w) => ({ u, v: 1, w }));
  face(along, 8, 1, (v,w) => ({ u: 0, v, w }));
  face(along, 8, 1, (v,w) => ({ u: 1, v, w }), true);
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.Float32BufferAttribute(new Float32Array(samples.length * 3), 3);
  geometry.setAttribute('position', position); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices);
  for (const [start,count,material] of groups) geometry.addGroup(start,count,material);
  function update(frame: RiftFrame) {
    const localFrame=block==='right'?{...frame,quake:{...frame.quake,slip:0,strain:0}}:frame;
    for (let i = 0; i < samples.length; i++) {
      const { u, v, w } = samples[i], z = lerp(-halfDepth, halfDepth, v);
      const extent = (y: number): [number,number] => layer === 'asthenosphere' ? [-3.02-frame.extension*.12,3.02+frame.extension*.12] : edges(block,y,frame);
      let x = lerp(...extent(.1), u), top = 0, bottom = 0;
      for (let iteration = 0; iteration < 3; iteration++) {
        const basinU=block==='basin'?u:undefined;
        top = layer === 'crust' ? blockSurface(block, x, z, localFrame,basinU) : layer === 'lithosphere' ? crustContact(block, x, z, localFrame,basinU) : mantleContact(x, frame);
        bottom = layer === 'crust' ? crustContact(block, x, z, localFrame,basinU) : layer === 'lithosphere' ? mantleContact(x, frame) : -1.85;
        x = lerp(...extent(lerp(top, bottom, w)), u);
      }
      position.setXYZ(i, x, lerp(top, bottom, w), z);
    }
    position.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  }
  return { geometry, update };
}

/** Spherical surface patches are authored coastlines, never a modern Earth map. */
export function createContinentGeometry(side: -1 | 0 | 1, rows: number, columns: number): MutableGeometry {
  const positions = new Float32Array((rows + 1) * (columns + 1) * 3), colors=new Float32Array(positions.length),uv: number[] = [], indices: number[] = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
    uv.push(i / columns, j / rows);
    if (i < columns && j < rows) { const a = j * (columns + 1) + i, b = a + columns + 1; indices.push(a,a+1,b,a+1,b+1,b); }
  }
  const geometry = new THREE.BufferGeometry(), position = new THREE.BufferAttribute(positions,3);
  geometry.setAttribute('position',position);geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); geometry.setIndex(indices);
  function update(frame: RiftFrame) {
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
      const u = i / columns, v = j / rows, latitude = lerp(-.83,.83,v), taper = Math.sqrt(Math.max(.002,1-Math.pow(v*2-1,2)));
      const width = (.84 + .16*fieldNoise(v*7,side*17)+.06*Math.sin(v*29+side)) * taper;
      const seam = riftLongitude(v), gap = frame.extension * .16 * taper;
      const longitude = side < 0 ? lerp(-width,seam-gap,u) : side > 0 ? lerp(seam+gap,width,u) : lerp(seam-gap,seam+gap,u);
      const shore = Math.sin(u*Math.PI), ridge = fieldNoise(u*5+side*23,v*11)*.022+fieldNoise(u*13+side*7,v*23)*.007;
      const radius = side === 0 ? 1.812+fieldNoise(u*9,v*17)*.001 : 1.817+(.002+ridge*.17)*shore+.002*taper;
      const k = j*(columns+1)+i;
      position.setXYZ(k, Math.sin(longitude)*Math.cos(latitude)*radius,Math.sin(latitude)*radius,Math.cos(longitude)*Math.cos(latitude)*radius);
      const coast=Math.min(1,(side<0?u:1-u)/.055),variation=fieldNoise(u*11+side*17,v*17)*.035;
      const linear=(s:number)=>s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4);
      colors[k*3]=linear(lerp(.5,.31,coast)+variation);colors[k*3+1]=linear(lerp(.44,.37,coast)+variation);colors[k*3+2]=linear(lerp(.27,.22,coast)+variation*.7);
    }
    position.needsUpdate=true;geometry.getAttribute('color').needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  }
  return {geometry,update};
}

export function grainGeometry(seed: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const positions = geometry.getAttribute('position');
  for (let i=0;i<positions.count;i++) {
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const scale=1+.07*Math.sin(x*9.7+y*7.1+z*13.7+seed*2.3);
    positions.setXYZ(i,x*scale*.82,y*scale*(.86+(seed%3)*.13),z*scale);
  }
  geometry.computeVertexNormals();return geometry;
}

type Polygon = THREE.Vector3[];
/** Convex cell clipping creates fitted grain domains rather than a pile of spheres. */
export function materialCells():{geometry:THREE.BufferGeometry;center:THREE.Vector3}[] {
  const halton=(index:number,base:number)=>{let value=0,fraction=1;while(index>0){fraction/=base;value+=fraction*(index%base);index=Math.floor(index/base);}return value;};
  const seeds=Array.from({length:20},(_,i)=>new THREE.Vector3((halton(i+1,2)-.5)*1.4,(halton(i+1,3)-.5)*1.2,(halton(i+1,5)-.5)*.85));
  seeds.sort((a,b)=>(a.x+a.z*.9)-(b.x+b.z*.9));
  const initial:Polygon[]=[
    [[-.83,-.7,-.52],[.83,-.7,-.52],[.83,.7,-.52],[-.83,.7,-.52]],
    [[-.83,-.7,.52],[-.83,.7,.52],[.83,.7,.52],[.83,-.7,.52]],
    [[-.83,-.7,-.52],[-.83,.7,-.52],[-.83,.7,.52],[-.83,-.7,.52]],
    [[.83,-.7,-.52],[.83,-.7,.52],[.83,.7,.52],[.83,.7,-.52]],
    [[-.83,-.7,-.52],[-.83,-.7,.52],[.83,-.7,.52],[.83,-.7,-.52]],
    [[-.83,.7,-.52],[.83,.7,-.52],[.83,.7,.52],[-.83,.7,.52]],
  ].map(face=>face.map(v=>new THREE.Vector3(...v as [number,number,number])));
  const clip=(faces:Polygon[],normal:THREE.Vector3,offset:number):Polygon[]=>{
    const next:Polygon[]=[],cap:THREE.Vector3[]=[];
    for(const face of faces){const polygon:Polygon=[];
      for(let i=0;i<face.length;i++){
        const a=face[i],b=face[(i+1)%face.length],da=normal.dot(a)-offset,db=normal.dot(b)-offset;
        if(da<=1e-8)polygon.push(a);
        if((da<0&&db>0)||(da>0&&db<0)){const point=a.clone().lerp(b,da/(da-db));polygon.push(point);if(!cap.some(v=>v.distanceToSquared(point)<1e-12))cap.push(point);}
      }if(polygon.length>=3)next.push(polygon);
    }
    if(cap.length>=3){const center=cap.reduce((sum,v)=>sum.add(v),new THREE.Vector3()).multiplyScalar(1/cap.length),n=normal.clone().normalize();
      const u=new THREE.Vector3(Math.abs(n.y)<.9?0:1,Math.abs(n.y)<.9?1:0,0).cross(n).normalize(),v=n.clone().cross(u);
      cap.sort((a,b)=>Math.atan2(a.clone().sub(center).dot(v),a.clone().sub(center).dot(u))-Math.atan2(b.clone().sub(center).dot(v),b.clone().sub(center).dot(u)));next.push(cap);
    }return next;
  };
  return seeds.map((center,index)=>{
    let faces=initial.map(face=>face.map(v=>v.clone()));
    for(const x of [-1,0,1])for(const y of [-1,0,1])for(const z of [-1,0,1])if(x||y||z){const n=new THREE.Vector3(x,y,z).normalize(),offset=Math.hypot(n.x*.85,n.y*.72,n.z*.56);faces=clip(faces,n,offset);}
    faces=clip(faces,new THREE.Vector3(0,0,1),.39);
    for(let j=0;j<seeds.length;j++)if(j!==index){const normal=seeds[j].clone().sub(center),offset=(seeds[j].lengthSq()-center.lengthSq())/2;faces=clip(faces,normal,offset);}
    const positions:number[]=[],uvs:number[]=[];
    for(const polygon of faces){const face=[...polygon],middle=face.reduce((sum,v)=>sum.add(v),new THREE.Vector3()).multiplyScalar(1/face.length);
      if(new THREE.Vector3().crossVectors(face[1].clone().sub(face[0]),face[2].clone().sub(face[0])).dot(middle.clone().sub(center))<0)face.reverse();
      for(let j=0;j<face.length;j++)for(const p of [middle,face[j],face[(j+1)%face.length]]){const local=p.clone().sub(center);positions.push(local.x,local.y,local.z);uvs.push(local.x*1.7+local.z*.7,local.y*1.7+local.z*.4);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();geometry.computeBoundingSphere();
    return{geometry,center};
  });
}
