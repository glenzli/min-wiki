import test from 'node:test';
import assert from 'node:assert/strict';
import {beltGeometry,beltLoad,restraintAt,RESTRAINT_GEOMETRY as geometry,RESTRAINT_PARAMETERS as parameters,RESTRAINT_WINDOW as window} from '../restraintModel.ts';
const close=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
function segmentDistance(point,a,b){
 const dx=b.x-a.x,dy=b.y-a.y;
 const p=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy)));
 return Math.hypot(point.x-a.x-p*dx,point.y-a.y-p*dy);
}
test('a continuous front-side band is tangent to the same hip and fixed car anchors at every state',()=>{
 for(let i=0;i<=400;i++){
  const s=restraintAt(i/400),g=s.belt;
  for(const [contact,anchor] of [[g.upper,geometry.upperAnchor],[g.lower,geometry.lowerAnchor]]){
   close(Math.hypot(contact.x-g.center.x,contact.y-g.center.y),geometry.radius);
   const radius={x:contact.x-g.center.x,y:contact.y-g.center.y};
   close((contact.x-anchor.x)*radius.x+(contact.y-anchor.y)*radius.y,0);
   close(segmentDistance(g.center,anchor,contact),geometry.radius);
  }
  close(g.upper.x,g.lower.x);close(g.upper.y+g.lower.y,2*geometry.hip.y);
  assert.ok(g.upper.y<g.center.y&&g.lower.y>g.center.y);
  assert.ok(g.upper.x>g.center.x,'front short arc rather than rear or through-body path');
  assert.ok(g.arcLength>0&&g.arcLength<Math.PI*geometry.radius);
  assert.equal(g.path,`M135 210L${g.upper.x} ${g.upper.y}A18 18 0 0 1 ${g.lower.x} ${g.lower.y}L135 270`);
 }
});
test('band tension follows actual path extension and pulls backward, with balanced vertical components',()=>{
 const rest=beltGeometry(0).length;let previous=0;
 for(let i=0;i<=400;i++){
  const g=beltLoad(window.maxDisplacement*i/400);
  close(g.extension,g.length-rest);close(g.tension,parameters.stiffness*g.extension);
  assert.ok(g.tension>=previous);previous=g.tension;
  const epsilon=1e-4;
  const derivative=(beltGeometry(g.center.x-geometry.hip.x+epsilon).length-beltGeometry(g.center.x-geometry.hip.x-epsilon).length)/(2*epsilon);
  close(g.horizontalFactor,derivative,1e-7);close(g.horizontalForce,g.tension*derivative,1e-5);
  const fy=g.tension*((geometry.upperAnchor.y-g.upper.y)/g.segmentLength+(geometry.lowerAnchor.y-g.lower.y)/g.segmentLength);
  close(fy,0);assert.ok(g.horizontalForce>=0);
 }
 assert.equal(beltLoad(0).tension,0);assert.equal(beltLoad(-1).tension,0,'an elastic flexible band cannot push');
});
test('relative motion has the correct work and energy balance without pretending the turning point is a completed stop',()=>{
 let previousX=0;
 for(let i=0;i<=500;i++){
  const s=restraintAt(i/500);
  const energy=.5*parameters.mass*s.relativeSpeed*s.relativeSpeed+.5*parameters.stiffness*s.belt.extension*s.belt.extension-parameters.mass*parameters.carDeceleration*s.displacement;
  close(energy,0,1e-7);assert.ok(s.displacement>=previousX);previousX=s.displacement;
  assert.ok(s.freeDisplacement>=s.displacement-1e-8);
  if(i>0&&i<500)assert.ok(s.relativeSpeed>0);
 }
 const last=restraintAt(1);close(last.relativeSpeed,0);assert.ok(last.belt.horizontalForce>parameters.mass*parameters.carDeceleration);
 assert.ok(last.freeDisplacement>last.displacement*2);
 assert.equal(last.phase,'turning');assert.equal(restraintAt(0).phase,'fitted');
 // Selected geometry fits without clipping body motion to the visual frame.
 assert.ok(last.displacement<70&&last.freeDisplacement+318<520);
});
test('replay, backward scrubbing and clamping retain the exact same trajectory and geometry',()=>{
 const expected=restraintAt(.58);
 for(const p of [0,1,.9,.1,.58])restraintAt(p);
 assert.deepEqual(restraintAt(.58),expected);
 assert.deepEqual(restraintAt(-.1),restraintAt(0));assert.deepEqual(restraintAt(1.1),restraintAt(1));
 const p=.43,epsilon=1e-4,a=restraintAt(p-epsilon),b=restraintAt(p+epsilon),mid=restraintAt(p);
 close((b.displacement-a.displacement)/(b.time-a.time),mid.relativeSpeed,2e-6);
 close((b.relativeSpeed-a.relativeSpeed)/(b.time-a.time),parameters.carDeceleration-mid.belt.horizontalForce/parameters.mass,2e-6);
});
