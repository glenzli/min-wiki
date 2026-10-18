import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('returning from page cache restores projection observation without restarting camera or backdrop motion',()=>{
 const listeners=new Map(),elements=new Map(),hotspots=[];
 let matrix={a:1,d:1,e:0,f:0},observing=false,cancels=0,starts=0,observer;
 const element=id=>elements.get(id)??make(id);
 function make(id=''){
  const result={value:id==='view'?'all':'',dataset:{},style:{},hidden:false,attributes:{},textContent:'',
   setAttribute(key,value){this.attributes[key]=String(value);},addEventListener(){},
   append(child){hotspots.push(child);},getScreenCTM:()=>matrix,getBoundingClientRect:()=>({left:0,top:0})};
  if(id)elements.set(id,result);return result;
 }
 const source=readFileSync(new URL('../main.ts',import.meta.url),'utf8');
 const ast=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true);
 const standalone=ts.factory.updateSourceFile(ast,ast.statements.filter(s=>!ts.isImportDeclaration(s)));
 const script=ts.transpileModule(ts.createPrinter().printFile(standalone),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(script,{
  document:{getElementById:element,createElement:()=>make(),querySelector:()=>element('container'),querySelectorAll:()=>hotspots},
  window:{addEventListener(type,callback){listeners.set(type,callback);}},
  ResizeObserver:class{constructor(callback){this.callback=callback;observer=this;}observe(){observing=true;}disconnect(){observing=false;}trigger(){if(observing)this.callback();}},
  animateValue({to,onUpdate}){starts++;onUpdate(to);return()=>cancels++;},
  translateDocument(){},mountReadingMode(){},mountPresentationFrame:()=>null,t:s=>s,
 });
 assert.equal(hotspots.length,3);assert.equal(observing,true);
 const before=hotspots[0].style.left,animationStarts=starts;
 listeners.get('pagehide')({persisted:true});assert.equal(observing,false);assert.ok(cancels>0);
 matrix={a:.6,d:.6,e:20,f:10};observer.trigger();assert.equal(hotspots[0].style.left,before);
 assert.equal(typeof listeners.get('pageshow'),'function');listeners.get('pageshow')({persisted:true});
 assert.equal(observing,true);assert.equal(hotspots[0].style.left,`${.6*282+20}px`);
 matrix={a:.8,d:.8,e:30,f:0};observer.trigger();assert.equal(hotspots[0].style.left,`${.8*282+30}px`);
 assert.equal(starts,animationStarts,'restoration only reprojects the same view and does not restart transitions');
});
