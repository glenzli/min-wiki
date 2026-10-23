import test from 'node:test';
import assert from 'node:assert/strict';
import {StellarSurface} from '../stellarSurface.ts';

function withSurface(check){
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document'),maps=[],draws=[],gradients=[];
  globalThis.document={createElement(){const canvas={width:0,height:0,puts:0,image:undefined,getContext(){return {createImageData:(width,height)=>({data:new Uint8ClampedArray(width*height*4)}),putImageData(image){canvas.image=image;canvas.puts++;}};}};maps.push(canvas);return canvas;}};
  const c={createRadialGradient(...geometry){const stops=[];gradients.push({geometry,stops});return {addColorStop(...stop){stops.push(stop);}};},fillRect(){},drawImage(...args){draws.push(args);}};
  const painter=new StellarSurface();
  try{check({painter,c,maps,draws,gradients});}
  finally{painter.dispose();if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}
}

test('Canvas photospheres replay deterministically while compact surfaces do not invent moving solar granulation',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  const maps=[];
  globalThis.document={createElement(){const canvas={width:0,height:0,puts:0,image:undefined,getContext(){return {createImageData:(width,height)=>({data:new Uint8ClampedArray(width*height*4)}),putImageData(image){canvas.image=image;canvas.puts++;}};}};maps.push(canvas);return canvas;}};
  const c={createRadialGradient:()=>({addColorStop(){}}),fillRect(){},drawImage(){}};
  const painter=new StellarSurface();
  try{
    painter.draw(c,0,0,80,'#ffe5b1',0);const start=maps[0].image.data.slice();
    painter.draw(c,0,0,80,'#ffe5b1',0);assert.equal(maps[0].puts,1);
    painter.draw(c,0,0,80,'#ffe5b1',3);assert.notDeepEqual(maps[0].image.data,start);
    painter.draw(c,0,0,80,'#ffe5b1',0);assert.deepEqual(maps[0].image.data,start);
    painter.draw(c,0,0,80,'#d8eaf1',0,0,0,'compact');const compact=maps[1].image.data.slice();
    painter.draw(c,0,0,80,'#d8eaf1',12,0,0,'compact');assert.deepEqual(maps[1].image.data,compact);assert.equal(maps[1].puts,1);
    painter.draw(c,0,0,80,'#ffe5b1',0,0,1);const active=maps[2].image.data;
    assert.ok(active.some((value,index)=>index%4!==3&&value<start[index]-8),'dark active regions change brightness');
    assert.ok(active.every((value,index)=>index%4!==3||value===start[index]),'active regions cannot cut holes into the stellar disk');
    assert.equal(maps.length,3);
  }finally{painter.dispose();if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}
});

test('Canvas profiles resolve fine solar granules, coarse warmer giant cells and smooth compact emission',()=>withSurface(({painter,c,maps})=>{
  for(const profile of ['solar','red-giant','compact'])painter.draw(c,0,0,80,'#fff0cf',0,0,0,profile);
  const contrast=maps.map(map=>{let light=0,variation=0;
    for(let y=100;y<156;y++)for(let x=70;x<186;x++){const i=(y*256+x)*4;light+=map.image.data[i+1];variation+=Math.abs(map.image.data[i+1]-map.image.data[i+5]);}
    return variation/light;
  });
  assert.ok(contrast[0]>contrast[1]*2,'solar structures are materially finer than giant convection');
  assert.ok(contrast[1]>contrast[2]*10,'compact surfaces do not inherit solar or giant convection');
  const center=(128*256+128)*4;
  assert.ok(maps[1].image.data[center+1]/maps[1].image.data[center]<maps[0].image.data[center+1]/maps[0].image.data[center], 'the giant palette remains warmer at the same input tint');
}));

test('Canvas cooling preserves the disk mask and size while reducing radiance and display glare',()=>withSurface(({painter,c,maps,draws,gradients})=>{
  painter.draw(c,12,23,80,'#dbeaff',0,0,0,'compact',1,1);
  const hot=maps[0].image.data.slice(),hotStops=gradients[0].stops,geometry=draws[0].slice(1);
  painter.draw(c,12,23,80,'#dbeaff',50,0,0,'compact',.08,.3);
  const cool=maps[1].image.data.slice(),coolStops=gradients[3].stops;
  assert.deepEqual(draws[1].slice(1),geometry);
  assert.ok(cool.every((value,index)=>index%4!==3||value===hot[index]),'cooling changes emission rather than disk opacity');
  const center=(128*256+128)*4;
  assert.ok(cool[center+1]<hot[center+1]*.75,'compressed cooling still visibly dims the remnant');
  assert.ok(parseInt(coolStops[0][1].slice(-2),16)<parseInt(hotStops[0][1].slice(-2),16));
  painter.draw(c,12,23,80,'#dbeaff',0,0,0,'compact',.45,.4);
  assert.ok(maps[2].image.data[center+1]>hot[center+1]*.8,'the selected warm cooling endpoint remains visibly luminous');
  assert.ok(maps[2].image.data[center+1]<hot[center+1],'the displayed endpoint remains dimmer than the initial remnant');
  painter.draw(c,12,23,80,'#dbeaff',0,0,0,'compact',1,1);
  assert.equal(draws[3][0],maps[0]);assert.deepEqual(maps[0].image.data,hot);
}));

test('continuous cooling and palette changes keep at most twelve cached Canvas maps',()=>withSurface(({painter,c,maps})=>{
  for(let index=0;index<24;index++)painter.draw(c,0,0,20,'#dbeaff',0,0,0,'compact',1-index/30);
  assert.equal(maps.filter(canvas=>canvas.width>0).length,12);
  assert.ok(maps.slice(0,12).every(canvas=>canvas.width===0&&canvas.height===0));
  painter.dispose();assert.ok(maps.every(canvas=>canvas.width===0&&canvas.height===0));
}));
