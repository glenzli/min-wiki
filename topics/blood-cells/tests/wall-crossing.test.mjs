import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFragment } from 'parse5';
import { renderBlood } from '../scene.ts';

function drawing(progress){
  const nodes=[];function visit(node){nodes.push(node);node.childNodes?.forEach(visit);}
  visit(parseFragment(`<svg>${renderBlood('defence',progress,s=>s)}</svg>`));
  const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
  const cell=nodes.find(node=>node.tagName==='polygon');
  const contour=attr(cell,'points').split(' ').map(point=>point.split(',').map(Number));
  const opening=nodes.find(node=>node.tagName==='rect'&&attr(node,'fill')==='black');
  const x=Number(attr(opening,'x')),y=Number(attr(opening,'y'));
  return {contour,gap:{left:x,right:x+Number(attr(opening,'width')),top:y,bottom:y+Number(attr(opening,'height'))}};
}
// Independently clip the production polygon to the actual mask's full wall band.
function clipY(polygon,boundary,above){
  const output=[];
  for(let i=0;i<polygon.length;i++){
    const start=polygon[i],end=polygon[(i+1)%polygon.length];
    const a=above?start[1]>=boundary:start[1]<=boundary,b=above?end[1]>=boundary:end[1]<=boundary;
    if(a)output.push(start);
    if(a!==b)output.push([start[0]+(end[0]-start[0])*(boundary-start[1])/(end[1]-start[1]),boundary]);
  }
  return output;
}
test('actual endothelial opening contains the full migrating SVG outline throughout wall thickness, including the late tail',()=>{
  for(let i=0;i<=200;i++){
    const progress=i/200,{contour,gap}=drawing(progress);
    const intersection=clipY(clipY(contour,gap.top-2,true),gap.bottom+2,false);
    for(const [x] of intersection){
      assert.ok(x-2>=gap.left-1e-10,`left edge clear at ${progress}`);
      assert.ok(x+2<=gap.right+1e-10,`right edge clear at ${progress}`);
    }
  }
  const {gap}=drawing(.47);
  // These actual contour points overlapped filled endothelial cells before the fix.
  assert.ok(gap.left<436.19689786605744-2);assert.ok(gap.right>485.80310213394256+2);
});
test('the production wall closes after the whole cell clears it and scrubbing backward restores the same opening',()=>{
  const positions=[0,.18,.26,.36,.47,.52,.56,.77,1];
  const forward=positions.map(progress=>renderBlood('defence',progress,s=>s));
  positions.toReversed().forEach((progress,i)=>assert.equal(renderBlood('defence',progress,s=>s),forward[positions.length-1-i]));
  for(const progress of [0,.56,.77,1]){const {gap}=drawing(progress);assert.equal(gap.right,gap.left);}
  assert.ok(drawing(.47).gap.right>drawing(.47).gap.left);
  assert.ok(drawing(.52).gap.right-drawing(.52).gap.left<drawing(.47).gap.right-drawing(.47).gap.left);
});
