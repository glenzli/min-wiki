import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {lessonRoutes,routeNames,lessonSteps,scaleParent,journeyCopy} from '../journeyRoutes.ts';

class Element{
 dataset:Record<string,string>={};className='';textContent='';label='';value='';hidden=false;
 children:Element[]=[];parentElement:Element|null=null;attributes=new Map<string,string>();
 onclick:(()=>void)|null=null;onchange:(()=>void)|null=null;
 constructor(readonly tagName:string){}
 append(...nodes:Element[]){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
 prepend(node:Element){node.remove();node.parentElement=this;this.children.unshift(node);}
 remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(node=>node!==this);this.parentElement=null;}}
 replaceChildren(){for(const child of [...this.children])child.remove();}
 setAttribute(name:string,value:string){this.attributes.set(name,value);}
 getAttribute(name:string){return this.attributes.get(name)??null;}
 closest(){return this;}
 contains(node:Element):boolean{return this===node||this.children.some(child=>child.contains(node));}
}
const descendants=(node:Element):Element[]=>node.children.flatMap(child=>[child,...descendants(child)]);
const visible=(node:Element):boolean=>!node.hidden&&(!node.parentElement||visible(node.parentElement));

function navigation(language:'zh'|'en'){
 const source=readFileSync(new URL('../journeyNavigation.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export class JourneyNavigation','class JourneyNavigation');
 const frames=new Map<number,()=>void>();let next=0,disconnected=false;
 const context=vm.createContext({Element,document:{createElement:(tag:string)=>new Element(tag)},lessonRoutes,routeNames,lessonSteps,scaleParent,journeyCopy,
  MutationObserver:class{observe(){}disconnect(){disconnected=true;}},requestAnimationFrame:(callback:()=>void)=>{frames.set(++next,callback);return next;},cancelAnimationFrame:(id:number)=>frames.delete(id)});
 vm.runInContext(ts.transpileModule(source+'\nglobalThis.NavigationUnderTest=JourneyNavigation;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 const primary=new Element('div'),row=new Element('div'),chosen:any[]=[];
 const nav=new (context as any).NavigationUnderTest(primary,language,(selection:any,step:any,resume:boolean)=>chosen.push({selection,step,resume}),()=>{});
 return {nav,primary,row,chosen,frames,disconnected:()=>disconnected};
}

test('inward navigation distinguishes physical stops from contextual views and emits their original destinations',()=>{
 for(const language of ['zh','en'] as const){
  const {nav,primary,row,chosen,frames,disconnected}=navigation(language);
  const show=(step:string)=>nav.show(row,{route:'inward',step});
  const buttons=()=>descendants(nav.element).filter(node=>node.tagName==='button'&&visible(node));
  const button=(id:string)=>buttons().find(node=>node.dataset.lessonStep===id)!;
  show('families');
  assert.deepEqual(buttons().map(node=>node.dataset.lessonStep),['galaxy','nearby','solar','moon','earth','families','sun','sizes']);
  assert.equal(button('solar').getAttribute('aria-pressed'),'true','the active comparison retains its scale context');
  assert.equal(button('families').getAttribute('aria-pressed'),'true');
  button('solar').onclick!();assert.equal(chosen.at(-1).selection.step,'solar');assert.equal(chosen.at(-1).step.chapter,'zoom');assert.equal(chosen.at(-1).resume,undefined);
  show('galaxy');assert.deepEqual(buttons().filter(node=>node.parentElement!.className==='cosmic-journey-related').map(node=>node.dataset.lessonStep),['clusters']);
  button('clusters').onclick!();assert.equal(chosen.at(-1).step.selected,'star-cluster');
  show('clusters');assert.equal(button('galaxy').getAttribute('aria-pressed'),'true');
  show('moon');assert.equal(buttons().length,5,'unrelated inspections do not follow the reader to another scale');
  const otherRoute=primary.children.find(node=>node.dataset.lessonRoute==='outward')!;otherRoute.onclick!();assert.equal(chosen.at(-1).selection.route,'outward');assert.equal(chosen.at(-1).resume,true,'primary route changes request the retained route snapshot');
  nav.dispose();assert.equal(row.children.length,0);assert.equal(frames.size,0);assert.equal(disconnected(),true);assert.ok(primary.children.every(node=>node.onclick===null));
 }
});

test('phone option groups expose the same parent-child tree, including old linked comparisons',()=>{
 for(const language of ['zh','en'] as const){
  const {nav,row,chosen}=navigation(language);nav.show(row,{route:'inward',step:'sun'});
  const select=descendants(nav.element).find(node=>node.tagName==='select')!;
  assert.equal(select.value,'sun');assert.equal(select.getAttribute('aria-label'),journeyCopy[language].stepChoice);
  const groups=select.children.filter(node=>node.tagName==='optgroup');assert.deepEqual(groups.map(node=>node.label),[lessonSteps.inward.find(step=>step.id==='galaxy')!.name[language],lessonSteps.inward.find(step=>step.id==='solar')!.name[language]]);
  const options=descendants(select).filter(node=>node.tagName==='option');assert.equal(options.length,9);assert.equal(new Set(options.map(node=>node.value)).size,9);
  const families=options.find(node=>node.value==='families')!;assert.equal(families.parentElement,groups[1]);assert.equal(families.textContent,lessonSteps.inward.find(step=>step.id==='families')!.name[language],'the group label supplies context without lengthening the collapsed control');
  select.value='sizes';select.onchange!();assert.equal(chosen.at(-1).selection.step,'sizes');assert.equal(chosen.at(-1).step.chapter,'compare');
  nav.show(row,{route:'inward',step:'families'});assert.equal(select.value,'families');assert.equal(descendants(select).find(node=>node.value==='sun'),options.find(node=>node.value==='sun'),'ordinary updates keep the same native options');
  nav.show(row,{route:'sky',step:'milky'});assert.equal(select.children.length,4);assert.equal(descendants(select).some(node=>node.value==='sun'),false);
  nav.show(row,{route:'flight',step:'continuous'});assert.equal(nav.element.hidden,true);nav.dispose();
 }
});
