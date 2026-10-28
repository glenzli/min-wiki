import test from 'node:test';
import assert from 'node:assert/strict';
import {MagnificationInput,viewZoom,wheelMagnification,magnifyJourney} from '../viewNavigation.ts';
import {scaleReading} from '../scaleReading.ts';
import {readGalacticState,saveGalacticState,galacticObjects} from '../galacticModel.ts';
import {cameraFrameScale,halfWidthKm,originStart,progressFor,EARTH_RADIUS_KM,SUN_RADIUS_KM,LIGHT_YEAR_KM} from '../model.ts';

test('bounded structural magnification has compatible defaults and persists without changing geometry or other choices',()=>{
 assert.equal(viewZoom(NaN),1);assert.equal(viewZoom(0),.75);assert.equal(viewZoom(Infinity),1);assert.equal(viewZoom(100),1.8);
 assert.equal(readGalacticState('').zoom,1);assert.equal(readGalacticState('?galaxyZoom=invalid').zoom,1);assert.equal(readGalacticState('?galaxyZoom=999').zoom,1.8);
 const before=galacticObjects('milky-way'),state={...readGalacticState('?galaxy=milky-way&galaxyDisk=0&galaxyGuides=1'),zoom:1.5},params=new URLSearchParams();saveGalacticState(params,state);assert.deepEqual(readGalacticState(params.toString()),state);assert.deepEqual(galacticObjects('milky-way'),before);
 assert.ok(wheelMagnification(50)<1&&wheelMagnification(-50)>1);assert.equal(wheelMagnification(NaN),1);assert.equal(wheelMagnification(1000),wheelMagnification(120));assert.equal(wheelMagnification(2,1),wheelMagnification(32));
});

test('physical wheel/pinch uses the existing logarithmic camera and is reversible inside its bounds',()=>{
 for(const origin of ['earth','sun'] as const)for(const progress of [.2,.5,.8])for(const factor of [.8,1.3,2]){
  const next=magnifyJourney(progress,origin,factor);assert.ok(Math.abs(halfWidthKm(next)/(halfWidthKm(progress)/factor)-1)<1e-12);assert.ok(Math.abs(magnifyJourney(next,origin,1/factor)-progress)<1e-12);
 }
 assert.equal(magnifyJourney(1,'earth',.1),1);assert.equal(magnifyJourney(originStart('sun'),'sun',2),originStart('sun'));
 for(const factor of [0,-1,NaN,Infinity])assert.equal(magnifyJourney(.4,'earth',factor),.4);
});

test('reading cues use the actual framed disk diameter and distinguish stars from galaxy distributions',()=>{
 for(const [width,height] of [[1240,600],[1240,300],[390,340]])for(const origin of ['earth','sun'] as const)for(const progress of [originStart(origin),.2,.4,.6,.8,1]){
  const guide=scaleReading(progress,origin,width,height),radius=origin==='earth'?EARTH_RADIUS_KM:SUN_RADIUS_KM,half=halfWidthKm(progress)*cameraFrameScale(progress,width,height);
  assert.equal(guide.diameterPx,radius/half*width);assert.equal(guide.spanKm,half*2);assert.equal(guide.subpixel,guide.diameterPx<1);
 }
 assert.equal(scaleReading(0,'earth',1240,600).subpixel,false);
 assert.equal(scaleReading(progressFor(2*LIGHT_YEAR_KM),'earth',1240,600).kind,'interstellar');
 assert.equal(scaleReading(progressFor(20*LIGHT_YEAR_KM),'earth',1240,600).kind,'stars');
 assert.equal(scaleReading(progressFor(100000*LIGHT_YEAR_KM),'earth',1240,600).kind,'galaxy');
 assert.equal(scaleReading(progressFor(1e9*LIGHT_YEAR_KM),'earth',1240,600).kind,'web');
});

test('production input admits pinch without rotating, ignores inactive views and releases gestures/listeners',()=>{
 class Host extends EventTarget {
  captures=new Set<number>();listeners=0;
  override addEventListener(...args:Parameters<EventTarget['addEventListener']>){this.listeners++;super.addEventListener(...args);}
  override removeEventListener(...args:Parameters<EventTarget['removeEventListener']>){this.listeners--;super.removeEventListener(...args);}
  setPointerCapture(id:number){this.captures.add(id);}hasPointerCapture(id:number){return this.captures.has(id);}releasePointerCapture(id:number){this.captures.delete(id);}closest(){return null;}
 }
 const host=new Host();let active=true,value=1,changes=0,checkpoints=0;
 const input=new MagnificationInput(host as unknown as HTMLElement,()=>active,(factor,checkpoint)=>{const before=value;value=viewZoom(value*factor);changes++;if(checkpoint)checkpoints++;return before!==value;});
 const send=(type:string,fields:Record<string,unknown>)=>{const event=Object.assign(new Event(type,{cancelable:true}),fields);host.dispatchEvent(event);return event;};
 const pointer=(type:string,id:number,x:number)=>send(type,{pointerId:id,button:0,clientX:x,clientY:0});
 pointer('pointerdown',1,0);assert.equal(input.pinching,false);pointer('pointerdown',2,100);assert.equal(input.pinching,true);pointer('pointermove',2,150);assert.equal(value,1.5);pointer('pointermove',1,-50);assert.equal(value,1.8);pointer('pointerup',2,150);assert.equal(input.pinching,false);assert.equal(checkpoints,1);
 input.cancel();assert.equal(host.captures.size,0);
 active=false;const before=changes;send('wheel',{deltaY:20,deltaMode:0});assert.equal(changes,before);
 active=true;assert.equal(send('wheel',{deltaY:50,deltaMode:0}).defaultPrevented,true);send('keydown',{key:'-'});assert.ok(value<1.8);
 input.dispose();assert.equal(host.listeners,0);const after=changes;send('wheel',{deltaY:10});assert.equal(changes,after);assert.equal(host.captures.size,0);
});
