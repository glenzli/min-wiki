import test from 'node:test';
import assert from 'node:assert/strict';
import {solarReferenceLayout} from '../scaleIllustrations.ts';

test('solar reference icons keep known diameter order in the measured-orbit and close-up lenses',()=>{
  const descending=['sun','jupiter','saturn','uranus','neptune','earth','venus','mars','mercury'];
  for(const portrait of [false,true]){
    const layout=solarReferenceLayout(portrait);
    const sizes=new Map([['sun',layout.sunRadius],...layout.planets.map(p=>[p.id,p.bodyRadius])]);
    for(let i=1;i<descending.length;i++) assert.ok(sizes.get(descending[i-1])>sizes.get(descending[i]),`${descending[i-1]} must be larger than ${descending[i]}`);
    assert.ok(layout.planets.every(p=>Number.isFinite(p.bodyRadius)&&p.bodyRadius>0));
  }
});
test('icon changes leave the linear Neptune-orbit span and measured orbital ordering intact',()=>{
  const {planets}=solarReferenceLayout(false);
  assert.equal(planets.at(-1).orbitRadius,.5);
  for(let i=0;i<planets.length;i++){
    assert.ok(Math.abs(planets[i].orbitRadius/planets[i].au-.5/30.07)<1e-12);
    if(i) assert.ok(planets[i].orbitRadius>planets[i-1].orbitRadius);
  }
});
