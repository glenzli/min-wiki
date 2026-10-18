import test from 'node:test';
import assert from 'node:assert/strict';
import {createNetworkScene,networkCoordinates,packetPosition} from '../scene.ts';
import {MessageJourney,HOP_COUNT} from '../model.ts';

test('each drawn hop has matching endpoints, including the phone docks in both layouts',()=>{
 for(const compact of [false,true])for(const station of ['a','b'] as const){
  const c=networkCoordinates(90,compact);
  for(let hop=0;hop<HOP_COUNT;hop++)for(const id of [1,2,3]){
   const end=packetPosition({id,hop,station},c,90,1),next=packetPosition({id,hop:hop+1,station},c,90,0);
   assert.deepEqual(end,next);
   const mid=packetPosition({id,hop,station},c,90,.5),start=packetPosition({id,hop,station},c,90,0);
   assert.ok(Math.abs(mid.x-(start.x+end.x)/2)<1e-9);assert.ok(Math.abs(mid.y-(start.y+end.y)/2)<1e-9);
  }
  const launched=packetPosition({id:1,hop:1,station:'a'},c,90,0);
  assert.deepEqual(launched.anchor,c.a,'a launched part keeps its access station when the phone moves');
 }
});

class SvgElement {
 attrs=new Map<string,string>();children:SvgElement[]=[];textContent='';replacements=0;
 constructor(readonly tagName:string){}
 append(child:SvgElement){this.children.push(child);}
 replaceChildren(...children:SvgElement[]){this.replacements++;this.children=children;}
 setAttribute(key:string,value:string){this.attrs.set(key,value);}
 getAttribute(key:string){return this.attrs.get(key)??null;}
 all(predicate:(node:SvgElement)=>boolean):SvgElement[]{return [...(predicate(this)?[this]:[]),...this.children.flatMap(child=>child.all(predicate))];}
}
test('the retained illustration seeks reversibly without rebuilding packet identities or advancing model snapshots',()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElementNS:(_ns:string,tag:string)=>new SvgElement(tag)}});
 try{
  const svg=new SvgElement('svg'),journey=new MessageJourney(),drawing=createNetworkScene(svg as unknown as SVGSVGElement,s=>s);
  const draw=(phase:number,reduced=false)=>drawing.render(journey.state,journey.conditions,journey.blockedAt,phase,false,reduced);
  draw(0);const parts=svg.all(node=>node.getAttribute('data-part')!==null),initial=parts[0]!.getAttribute('transform');
  assert.equal(parts.length,3);draw(.5);const middle=parts[0]!.getAttribute('transform');
  assert.notEqual(middle,initial);assert.equal(journey.state.completedSteps,0);assert.equal(parts[0]!.getAttribute('data-hop'),'0');
  assert.equal(parts[1]!.getAttribute('data-transit'),'0');assert.equal(parts[2]!.getAttribute('data-transit'),'0');
  draw(0);assert.equal(parts[0]!.getAttribute('transform'),initial);draw(.5);assert.equal(parts[0]!.getAttribute('transform'),middle);
  draw(.8,true);assert.equal(parts[0]!.getAttribute('transform'),initial);
  journey.step();draw(0);assert.equal(parts[0]!.getAttribute('data-hop'),'1');assert.equal(parts[0]!.getAttribute('data-station'),'a');
  journey.configure({backboneOnline:false});draw(.5);assert.equal(parts[0]!.getAttribute('data-transit'),'0');
  assert.deepEqual(svg.all(node=>node.getAttribute('data-part')!==null),parts);assert.equal(svg.replacements,1);
  drawing.dispose();
 }finally{if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');}
});
