import * as THREE from 'three';

/** Lift the observation angle with the same retained clay opening. Cargo stays
 * on the inner floor; viewing into the hull must not require moving its load. */
export function orientLab(camera:THREE.Camera,opening=0) {
  const amount=Math.max(0,Math.min(1,opening));
  camera.position.set(4.4,8.4+(26-8.4)*amount,12.8);
  camera.lookAt(0,1.65,0);camera.updateMatrixWorld();
}

/** Fit the complete apparatus in its real viewport. This same camera projects
 * the SVG annotations; neither layer stretches a fixed 850:540 photograph. */
export function frameLab(camera:THREE.OrthographicCamera,width:number,height:number,comparison:boolean,held:boolean) {
  const bounds=new THREE.Box3(new THREE.Vector3(held?-3.5:-2.64,-.26,-1.16),new THREE.Vector3(comparison?4.3:2.64,held?4.12:3.48,1.16));
  camera.updateMatrixWorld();
  const local=new THREE.Box3();
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]) {
    local.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  }
  const size=local.getSize(new THREE.Vector3()),center=local.getCenter(new THREE.Vector3()),aspect=Math.max(.1,width/Math.max(1,height));
  const halfHeight=Math.max(size.y,size.x/aspect)*.54,halfWidth=halfHeight*aspect;
  camera.left=center.x-halfWidth;camera.right=center.x+halfWidth;camera.top=center.y+halfHeight;camera.bottom=center.y-halfHeight;
  camera.updateProjectionMatrix();
}

export function projectInViewport(camera:THREE.Camera,point:THREE.Vector3,width:number,height:number):[number,number] {
  point=point.clone().project(camera);
  return [(point.x+1)*width/2,(1-point.y)*height/2];
}
