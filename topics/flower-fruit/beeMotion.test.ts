import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createBeeMotion} from './beeMotion.ts';
const motion=createBeeMotion(),beeMotion=motion.sample;
after(()=>motion.dispose());
import {BEE_VISIT,pollinationFrame} from './model.ts';
function numbers(value:unknown):number[]{return typeof value==='number'?[value]:Array.isArray(value)?value.flatMap(numbers):value&&typeof value==='object'?Object.values(value).flatMap(numbers):[];}

test('flight approaches a fixed contact, rests with folded wings and takes off forward',()=>{
 const flying=beeMotion(.1),rest=beeMotion(.5),launch=beeMotion(.85);
 assert.ok(flying.blur>0);assert.equal(rest.blur,0);assert.equal(rest.contact,1);assert.ok(Math.abs(rest.pitch)<1e-12);
 assert.equal(rest.nearWing.angle,-57);assert.equal(rest.farWing.angle,-60);assert.deepEqual(rest.legs[0]!.f,{x:41,y:-2});
 assert.ok(launch.blur>0);assert.ok(launch.x>rest.x);assert.ok(launch.y<rest.y);assert.ok(launch.pitch<0);
 assert.equal(beeMotion(BEE_VISIT.exit).opacity,0);
 let previous=beeMotion(BEE_VISIT.departure);
 for(let p=BEE_VISIT.departure+.001;p<BEE_VISIT.exit;p+=.005){const next=beeMotion(p);assert.ok(next.x>=previous.x);assert.ok(next.y<=previous.y);previous=next;}
});
test('the single carried pollen site reaches the stigma continuously and stays there after departure',()=>{
 const before=pollinationFrame(BEE_VISIT.contact-1e-7),contact=pollinationFrame(BEE_VISIT.contact);
 assert.ok(Math.hypot(before.pollenX-contact.pollenX,before.pollenY-contact.pollenY)<1e-5);
 assert.equal(contact.pollenX,275);assert.equal(contact.pollenY,250);
 for(const p of [0,.1,.27,.35,.419]){const grain=pollinationFrame(p),pose=beeMotion(p);assert.equal(grain.pollenX,pose.x+41);assert.equal(grain.pollenY,pose.y-2);}
 for(const compatible of [true,false])for(const p of [.42,.5,.8,1.42,3]){const grain=pollinationFrame(p,compatible);assert.equal(grain.pollenX,275);assert.equal(grain.pollenY,250);}
});
test('all joints and exposure values remain finite and continuous through touchdown and takeoff',()=>{
 for(const p of [0,.27,.42,.62,.72,.77,1.12,1.42,3]){
  const a=numbers(beeMotion(Math.max(0,p-1e-8))),b=numbers(beeMotion(Math.min(3,p+1e-8)));
  assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert.ok(Number.isFinite(a[i])&&Math.abs(a[i]!-b[i]!)<.002,`pose discontinuity at ${p}, ${i}`);
 }
 for(const p of [NaN,Infinity,-1,7])assert.ok(numbers(beeMotion(p)).every(Number.isFinite));
 for(let p=0;p<=3;p+=.003){const m=beeMotion(p);assert.ok(m.nearWing.y>0&&m.farWing.y>0);assert.ok(m.blur>=0&&m.blur<=.13);assert.ok(m.opacity>=0&&m.opacity<=1);}
});
test('reduced motion uses a clear static wing pose without blur or decorative oscillation',()=>{
 const a=beeMotion(.08,true),b=beeMotion(.18,true);assert.deepEqual(a.nearWing,b.nearWing);
 for(const p of [.1,.4,.5,.9]){const m=beeMotion(p,true);assert.equal(m.blur,0);assert.equal(m.antenna,0);assert.equal(m.abdomenPitch,0);assert.equal(m.leafSway,0);assert.equal(m.contactFlex,0);}
});
