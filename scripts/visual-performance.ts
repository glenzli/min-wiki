/** Standalone local diagnostic, never imported by a reader entry. Bundle this
 * with the same browser/size for before/after runs. It counts actual GL draws
 * across a finite camera+snapshot burst; it does not report production FPS. */
import {StellarSpace3D} from '../topics/stars/spaceScene3d.ts';
import {Eruption3DScene} from '../topics/volcano-eruption/eruption3d.ts';
import {scenarioSettings} from '../topics/volcano-eruption/eruptionScenarios.ts';
import {LandHistoryScene} from '../topics/volcano-eruption/landscape3d.ts';
import {OmuroScene} from '../topics/volcano-eruption/omuroScene.ts';
import {HydrothermalScene} from '../topics/volcano-eruption/hydrothermalScene.ts';
import {DEFAULT_HYDROTHERMAL_SETTINGS} from '../topics/volcano-eruption/hydrothermalModel.ts';
import {Lake3DScene} from '../topics/volcanic-lakes/scene3d.ts';
import {SubmarineScene} from '../topics/submarine-volcanoes/scene3d.ts';

document.body.innerHTML='<h1>Visual scene benchmark</h1><p>Finite, local camera and snapshot updates. Same canvas and pixel ratio for both runs.</p><button id="run">Run benchmark</button><section id="stage"></section><pre id="result">Ready</pre>';
const style=document.createElement('style');style.textContent='body{font:14px system-ui;margin:16px}canvas{width:800px;height:450px;display:block;max-width:none}#stage{width:800px}button{padding:12px}pre{white-space:pre-wrap}';document.head.append(style);
const nextFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]!;
const output=document.querySelector<HTMLPreElement>('#result')!,stage=document.querySelector<HTMLElement>('#stage')!,button=document.querySelector<HTMLButtonElement>('#run')!;
button.onclick=async()=>{
  button.disabled=true;output.dataset.state='running';const results=[];
  const cases=new URLSearchParams(location.search).get('suite')==='nebula'?['pillars']:['flow','ash','shield','composite','ecology','scoria','lake-crater','lake-caldera','heat','ocean-deep','ocean-shallow','ocean-island'];
  for(const kind of cases){
    let dispose=()=>{};
    try{
      output.textContent=JSON.stringify({status:'running',case:kind,results},null,2);
      let canvas=document.createElement('canvas');canvas.tabIndex=0;stage.replaceChildren(canvas);
      const start=performance.now();let draw:(i:number)=>void,stopCamera=()=>{};
      if(kind==='pillars'){
        const scene=new StellarSpace3D(canvas,()=>{throw Error('WebGL context lost');});dispose=()=>scene.dispose();
        draw=()=>scene.draw({chapter:'nebulae',nebula:'nursery',reference:'pillars',illumination:'emission',track:'solar',progress:0},0,false);
      }else if(kind==='shield'||kind==='composite'||kind==='ecology'){
        const scene=new LandHistoryScene(canvas,kind==='shield'?'shield':'composite');dispose=()=>scene.dispose();scene.setDetailMotion(false);stopCamera=()=>scene.stopMotion();
        draw=i=>scene.draw((kind==='ecology'?.76:.55)+i*.0001,{chapter:kind==='ecology'?'life':'landscape',aftermath:'green',habitat:'wet'});
      }else if(kind==='scoria'){
        const scene=new OmuroScene(canvas);dispose=()=>scene.dispose();stopCamera=()=>scene.stopMotion();draw=i=>scene.draw(.68+i*.0001,'wet','journey');
      }else if(kind.startsWith('lake-')){
        const scene=new Lake3DScene(canvas);dispose=()=>scene.dispose();stopCamera=()=>scene.stopMotion();draw=i=>scene.draw(.85+i*.0001,{basin:kind==='lake-caldera'?'caldera':'crater',supply:.7,leak:'low'});
      }else if(kind==='heat'){
        const scene=new HydrothermalScene(canvas);dispose=()=>scene.dispose();scene.setDetailMotion(false);stopCamera=()=>scene.stopMotion();draw=i=>scene.draw(.85+i*.0001,DEFAULT_HYDROTHERMAL_SETTINGS);
      }else if(kind.startsWith('ocean-')){
        const scene=new SubmarineScene(canvas,'Diagnostic fallback');dispose=()=>scene.dispose();stopCamera=()=>scene.stopMotion();
        // Diagnostic only: keep independent sea/visitor/material phase fixed.
        // Production admission and geological clocks are left unchanged.
        (scene as unknown as {gpu?:{detailMotion?:{setEnabled(enabled:boolean):void}}}).gpu?.detailMotion?.setEnabled(false);
        const weights:[number,number,number]=kind==='ocean-deep'?[1,0,0]:kind==='ocean-shallow'?[0,1,0]:[0,0,1];
        scene.setView(kind==='ocean-island'?'landscape':'vent');
        draw=i=>scene.draw({progress:.88+i*.0001,weights,supplyMix:0,section:0,camera:[0,0,1000,666.667],ecology:'bare'});
      }else{
        const scene=new Eruption3DScene(canvas);dispose=()=>scene.dispose();scene.setDetailMotion(false);
        stopCamera=()=>scene.stopMotion();
        const settings=scenarioSettings(kind==='ash'?'strong-ash':'gentle-flow',{landform:'composite'});
        scene.setView('exterior');scene.stopMotion();draw=i=>scene.draw(.88+i*.0001,settings);
      }
      draw(0);stopCamera();canvas=stage.querySelector<HTMLCanvasElement>('canvas')!;
      await nextFrame();await nextFrame();
      const gl=canvas.getContext('webgl2')!;gl.finish();const prepareMs=performance.now()-start;
      let calls=0;
      for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced'] as const){
        const original=gl[name].bind(gl) as (...args:unknown[])=>unknown;
        (gl as unknown as Record<string,unknown>)[name]=(...args:unknown[])=>{calls++;return original(...args);};
      }
      const cpu=[],cycles=[],totalStart=performance.now();
      for(let i=0;i<16;i++){
        const start=performance.now();draw(i);
        canvas.dispatchEvent(new KeyboardEvent('keydown',{key:i%2?'ArrowLeft':'ArrowRight',bubbles:true}));
        draw(i);cpu.push(performance.now()-start);
        await nextFrame();gl.finish();cycles.push(performance.now()-start);
      }
      const totalMs=performance.now()-totalStart,activeCalls=calls;calls=0;
      await nextFrame();await nextFrame();gl.finish();
      results.push({case:kind,css:[canvas.clientWidth,canvas.clientHeight],buffer:[canvas.width,canvas.height],dpr:devicePixelRatio,prepareMs,updates:16,glCalls:activeCalls,idleCalls:calls,cpuMedianMs:median(cpu),cycleMedianMs:median(cycles),totalMs});
    }catch(error){results.push({case:kind,error:String(error)});}
    finally{dispose();await nextFrame();}
  }
  stage.replaceChildren();output.textContent=JSON.stringify({at:new Date().toISOString(),results},null,2);output.dataset.state='done';button.disabled=false;
};
