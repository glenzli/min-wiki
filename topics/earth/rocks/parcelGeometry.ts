import * as THREE from 'three';
import {PARCEL_CELLS} from './parcelFrame';

type Face=THREE.Vector3[];
const tolerance=1e-7;
function clip(faces:Face[],normal:THREE.Vector3,distance:number):Face[]{
  const result:Face[]=[],cap:THREE.Vector3[]=[];
  for(const face of faces){
    const clipped:Face=[];
    for(let i=0;i<face.length;i++){
      const a=face[i],b=face[(i+1)%face.length],da=a.dot(normal)-distance,db=b.dot(normal)-distance;
      if(da<=tolerance)clipped.push(a);
      if((da<0)!==(db<0)){
        const point=a.clone().lerp(b,da/(da-db));clipped.push(point);
        if(!cap.some(q=>q.distanceToSquared(point)<tolerance*tolerance))cap.push(point);
      }
    }
    if(clipped.length>=3)result.push(clipped);
  }
  if(cap.length>=3){
    const center=cap.reduce((p,q)=>p.add(q),new THREE.Vector3()).multiplyScalar(1/cap.length);
    const tangent=(Math.abs(normal.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).cross(normal).normalize();
    const second=normal.clone().cross(tangent).normalize();
    cap.sort((a,b)=>Math.atan2(a.clone().sub(center).dot(second),a.clone().sub(center).dot(tangent))-Math.atan2(b.clone().sub(center).dot(second),b.clone().sub(center).dot(tangent)));
    result.push(cap);
  }
  return result;
}

/** Volumetric Voronoi batches share one closed irregular hull, rather than parallel extruded slices. */
export function createParcelGeometries(){
  const hull=new THREE.IcosahedronGeometry(1,2),vertices=hull.getAttribute('position');
  const faces:Face[]=[];
  for(let i=0;i<vertices.count;i+=3){
    const face:Face=[];
    for(let j=0;j<3;j++){
      const p=new THREE.Vector3().fromBufferAttribute(vertices,i+j);
      const relief=1+.028*Math.sin(p.x*8.1+p.z*4.3)*Math.cos(p.y*6.7)+.016*Math.sin(p.z*14+p.y*3);
      face.push(p.multiplyScalar(relief).multiply(new THREE.Vector3(1.32,.9,.86)));
    }
    faces.push(face);
  }
  hull.dispose();
  let hullBottom=Infinity;
  faces.forEach(face=>face.forEach(p=>{hullBottom=Math.min(hullBottom,p.y);}));
  const geometries=PARCEL_CELLS.map(cell=>{
    const origin=new THREE.Vector3(cell.center.x,cell.center.y,cell.center.z);
    let cellFaces=faces;
    for(const other of PARCEL_CELLS){
      if(other.id===cell.id)continue;
      const otherOrigin=new THREE.Vector3(other.center.x,other.center.y,other.center.z);
      const normal=otherOrigin.clone().sub(origin).normalize();
      cellFaces=clip(cellFaces,normal,otherOrigin.clone().add(origin).multiplyScalar(.5).dot(normal));
    }
    const positions:number[]=[],origins:number[]=[];
    for(const face of cellFaces)for(let i=1;i<face.length-1;i++)for(const p of [face[0],face[i],face[i+1]]){
      const local=p.clone().sub(origin);positions.push(local.x,local.y,local.z);origins.push(p.x,p.y,p.z);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('rockOrigin',new THREE.Float32BufferAttribute(origins,3));
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    return geometry;
  });
  return {geometries,hullBottom};
}
