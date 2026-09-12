import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { TEACHING_DIAGONAL_FOV, teachingVerticalFov, updateTeachingLens } from '../teachingCamera.ts';

test('portrait, square and ultrawide viewports keep the same narrow diagonal field', () => {
  for (const aspect of [.4,.65,1,1.6,2.4,4]) {
    const vertical = teachingVerticalFov(aspect)*Math.PI/180;
    const diagonal = 2*Math.atan(Math.tan(vertical/2)*Math.hypot(1,aspect))*180/Math.PI;
    assert.ok(Math.abs(diagonal-TEACHING_DIAGONAL_FOV)<1e-10);
  }
});
test('switching to the teaching lens preserves the target plane and viewing direction', () => {
  for (const aspect of [.6,1,2.4]) {
    const camera=new PerspectiveCamera(42,aspect,.1,10000),focus=new Vector3(2,3,-1);
    camera.position.set(12,-30,60);camera.lookAt(focus);camera.updateMatrixWorld();
    const right=new Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new Vector3(0,1,0).applyQuaternion(camera.quaternion);
    const points=[focus.clone(),focus.clone().addScaledVector(right,12),focus.clone().addScaledVector(up,-8)];
    const before=points.map(p=>p.clone().project(camera));const direction=camera.getWorldDirection(new Vector3());
    updateTeachingLens(camera,focus);camera.updateMatrixWorld();
    points.forEach((p,i)=>{const after=p.clone().project(camera);assert.ok(Math.abs(after.x-before[i].x)<1e-10);assert.ok(Math.abs(after.y-before[i].y)<1e-10);});
    assert.ok(direction.distanceTo(camera.getWorldDirection(new Vector3()))<1e-12);
  }
});
function sphereAxisRatio(camera,center,radius) {
  // Exact tangent circle of a sphere, then the covariance axes of its projected outline.
  const ray=center.clone().sub(camera.position),d=ray.length(),normal=ray.clone().normalize();
  const u=new Vector3(0,1,0).cross(normal).normalize(),v=normal.clone().cross(u);
  const circle=center.clone().addScaledVector(normal,-radius*radius/d),r=radius*Math.sqrt(1-radius*radius/(d*d));
  const points=Array.from({length:720},(_,i)=>{const a=i/720*Math.PI*2,p=circle.clone().addScaledVector(u,r*Math.cos(a)).addScaledVector(v,r*Math.sin(a)).project(camera);return [p.x*camera.aspect,p.y];});
  const mean=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);let xx=0,xy=0,yy=0;
  for(const p of points){const x=p[0]-mean[0],y=p[1]-mean[1];xx+=x*x;xy+=x*y;yy+=y*y;}
  const trace=xx+yy,delta=Math.hypot(xx-yy,2*xy);return Math.sqrt((trace+delta)/(trace-delta));
}
test('an intact sphere near a wide screen corner is no longer stretched by the wide lens', () => {
  const camera=new PerspectiveCamera(42,2.2,.1,10000);camera.position.z=100;camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const halfHeight=100*Math.tan(21*Math.PI/180),center=new Vector3(halfHeight*2.2*.85,halfHeight*.7,0);
  const before=sphereAxisRatio(camera,center,1);
  updateTeachingLens(camera,new Vector3());camera.updateMatrixWorld();
  const after=sphereAxisRatio(camera,center,1);
  assert.ok(before>1.2,`wide lens ratio ${before}`);
  assert.ok(after<1.02,`teaching lens ratio ${after}`);
});
