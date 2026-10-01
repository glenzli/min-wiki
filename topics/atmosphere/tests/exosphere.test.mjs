import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {journeyAtHeight,journeyFrame,radialPoint} from '../model.ts';

// Exercise the actual Canvas paint method without loading browser image assets.
register('data:text/javascript,'+encodeURIComponent(`
 export async function load(url,context,nextLoad){
  if(url.endsWith('.jpg'))return {format:'module',source:'export default "test-image";',shortCircuit:true};
  return nextLoad(url,context);
 }
`),import.meta.url);
const {AtmosphereScene}=await import('../scene.ts');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

function paint(step,progress,height,width){
 const scene=Object.create(AtmosphereScene.prototype),dots=[],curves=[];
 const frame=journeyFrame(journeyAtHeight(height)),scale=width/(2*frame.halfSpan);
 scene.c={beginPath(){},moveTo(x,y){this.start={x,y};},quadraticCurveTo(x,y,bx,by){curves.push({a:this.start,control:{x,y},b:{x:bx,y:by}});},stroke(){},setLineDash(){}};
 scene.point=(x,h)=>{const p=radialPoint(x,h);return {x:width/2+p.x*scale,y:300+(p.y-frame.centerY)*scale};};
 scene.glow=()=>{};scene.dot=(x,y,r)=>dots.push({x,y,r});scene.arrow=()=>{};
 scene.focusExosphere(step,progress);
 return {dots,curves};
}

test('retained particle follows the actual projected Canvas curve at every sampled phase',()=>{
 for(const height of [600,850,1000])for(const width of [360,1200])for(const p of [0,.1,.25,.5,.75,.9,1]){
  const {dots,curves}=paint(1,p,height,width),q=dots.find(d=>d.r===4);
  assert.equal(curves.length,1);assert.ok(q);
  const {a,control,b}=curves[0],u=1-p;
  close(q.x,u*u*a.x+2*u*p*control.x+p*p*b.x);
  close(q.y,u*u*a.y+2*u*p*control.y+p*p*b.y);
 }
});
test('retained particle stays at its curve endpoint when the escape comparison starts',()=>{
 for(const height of [600,850,1000])for(const width of [360,1200]){
  const previous=paint(1,1,height,width),next=paint(2,0,height,width);
  const moving=previous.dots.find(d=>d.r===4),retained=next.dots.at(-1),end=next.curves[0].b;
  close(moving.x,end.x);close(moving.y,end.y);
  close(retained.x,end.x);close(retained.y,end.y);
 }
 assert.equal(paint(0,1,850,1200).curves.length,0);
});
