import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFragment } from 'parse5';
import { renderCell } from '../scene.ts';
import { muscleState, MUSCLE_APPARATUS } from '../model.ts';

function drawing(progress,options){
  const nodes=[];
  function visit(node){nodes.push(node);node.childNodes?.forEach(visit);}
  visit(parseFragment(`<svg>${renderCell('muscle',progress,s=>s,options)}</svg>`));
  const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
  const find=(name,value)=>nodes.find(node=>attr(node,name)===value);
  return {attr,find,nodes};
}
test('actual SVG fibres, tendons and external spring follow the solved endpoint without gaps',()=>{
  for(const mode of ['shortening','isometric'])for(const load of [0,.5,1])for(const progress of [0,.25,.5,.75,1]){
    const s=muscleState(progress,{mode,load}),d=drawing(progress,{mode,load}),a=MUSCLE_APPARATUS;
    assert.equal(Number(d.attr(d.find('data-muscle-fibre','0'),'width')),s.length);
    assert.ok(d.attr(d.find('data-tendon','left'),'d').startsWith(`M${a.leftAnchor} 238`));
    assert.ok(d.attr(d.find('data-tendon','right'),'d').startsWith(`M${s.right} 174`));
    assert.ok(d.attr(d.find('data-tendon','right'),'d').includes(`${s.junction} 238`));
    const path=d.attr(d.find('data-load-spring','true'),'d');
    assert.ok(path.startsWith(`M${s.junction} 241`));assert.ok(path.endsWith(`L${a.springAnchor} 241`));
    assert.equal(Number(d.attr(d.find('data-force-junction','true'),'cx')),s.junction);
    assert.equal(Boolean(d.find('data-endpoint-clamp','true')),mode==='isometric');
  }
});
test('actual force-arrow directions and lengths depict total balance rather than activation alone',()=>{
  for(const mode of ['shortening','isometric'])for(const load of [0,.5,1])for(const progress of [0,.3,.5,.8,1]){
    const s=muscleState(progress,{mode,load}),d=drawing(progress,{mode,load});
    for(const [id,value,direction,y] of [['muscle',s.tension,-1,92],['spring',s.springForce,1,116],['clamp',s.clampForce,1,140]]){
      const group=d.find('data-force',id),path=group.childNodes.find(node=>node.tagName==='path');
      assert.equal(d.attr(path,'d'),`M${s.junction} ${y}H${s.junction+direction*value*70}`);
      assert.equal(d.attr(group,'opacity'),value>1e-8?'1':'0');
    }
  }
});
test('fixed-end SVG keeps sarcomeres still while free-end shortening increases overlap without shortening filaments',()=>{
  for(const load of [0,.5,1]){
    const options={mode:'isometric',load},start=drawing(0,options),peak=drawing(.5,options);
    assert.equal(start.attr(start.find('data-z-discs','true'),'d'),peak.attr(peak.find('data-z-discs','true'),'d'));
    assert.notEqual(start.attr(start.find('data-force','muscle').childNodes[0],'d'),peak.attr(peak.find('data-force','muscle').childNodes[0],'d'));
    const free={mode:'shortening',load},a=muscleState(0,free),b=muscleState(.5,free),d=drawing(.5,free);
    const left=490-b.sarcomereSpan/2,right=490+b.sarcomereSpan/2;
    assert.equal(d.attr(d.find('data-z-discs','true'),'d'),`M${left} 382v81M${right} 382v81`);
    assert.ok(b.sarcomereSpan<a.sarcomereSpan);
    const thin=d.nodes.filter(node=>d.attr(node,'d')?.includes('h178M'));
    assert.equal(thin.length,3);
    thin.forEach(node=>assert.match(d.attr(node,'d'),/h178M.*h-178$/));
  }
});
