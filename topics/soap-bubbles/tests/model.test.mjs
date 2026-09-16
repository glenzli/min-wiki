import test from 'node:test';
import assert from 'node:assert/strict';
import {bubbleShape,filmThickness,reflectedIntensity,filmRayGeometry,filmOptics} from '../model.ts';
test('rounding an imposed shape reduces area while retaining enclosed volume',()=>{
 let previous=1;
 for(let i=0;i<=100;i++){
  const shape=bubbleShape(i/100);
  assert.ok(Math.abs(shape.relativeVolume-1)<1e-12);
  assert.ok(shape.relativeArea>=previous-1e-12);previous=shape.relativeArea;
 }
 assert.equal(bubbleShape(0).relativeArea,1);
 assert.ok(bubbleShape(1).relativeArea>1.07);
});
test('closed-film drainage redistributes liquid downward without negative thickness',()=>{
 for(const progress of [0,.2,.6,1]){
  const top=filmThickness(-1,progress),bottom=filmThickness(1,progress);
  assert.ok(top>0 && bottom>=top);
  let mean=0;
  for(let i=0;i<1000;i++)mean+=filmThickness(-1+(i+.5)*2/1000,progress)/1000;
  assert.ok(Math.abs(mean-430)<1e-9);
 }
 assert.ok(filmThickness(-1,1)<filmThickness(-1,0));
});
test('air-film-air reflection cancels at zero thickness and reinforces at a quarter optical wavelength',()=>{
 for(const wavelength of [460,540,610]){
  assert.equal(reflectedIntensity(0,wavelength),0);
  assert.ok(Math.abs(reflectedIntensity(wavelength/(4*1.333),wavelength)-1)<1e-12);
  assert.ok(reflectedIntensity(wavelength/(2*1.333),wavelength)<1e-12);
 }
});
test('film colors depend on both thickness and viewing geometry, within finite bounds',()=>{
 for(let thickness=0;thickness<1600;thickness+=17)for(const cosine of [0,.3,.8,1]){
  const intensity=reflectedIntensity(thickness,540,cosine);
  assert.ok(Number.isFinite(intensity)&&intensity>=0&&intensity<=1);
 }
 assert.notEqual(reflectedIntensity(300,540,1),reflectedIntensity(300,540,.4));
});

test('drawn film rays obey equal reflection angles and Snell refraction',()=>{
 const unit=(a,b)=>{const x=b[0]-a[0],y=b[1]-a[1],r=Math.hypot(x,y);return [x/r,y/r];};
 for(const cosine of [.1,.3,.6614378278,.9,1])for(const height of [45,90,137]){
  const rays=filmRayGeometry(height,cosine),incoming=unit(...rays.incident),reflected=unit(...rays.reflected);
  const inside=unit(rays.internal[0],rays.internal[1]),emerging=unit(...rays.emerging);
  assert.ok(Math.abs(incoming[0]-reflected[0])<1e-12);
  assert.ok(Math.abs(incoming[1]+reflected[1])<1e-12);
  assert.ok(Math.abs(incoming[0]-1.333*inside[0])<1e-12);
  assert.ok(Math.abs(emerging[0]-reflected[0])<1e-12);
  assert.ok(Math.abs(emerging[1]-reflected[1])<1e-12);
  assert.ok(Math.abs(inside[1]-filmOptics(cosine).transmittedCosine)<1e-12);
 }
});
