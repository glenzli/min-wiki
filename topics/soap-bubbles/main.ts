import './style.css';
import {translateDocument} from '../../src/platform/i18n.ts';
import {mountTopicNavigation} from '../../src/platform/topicNavigation.ts';
import {mountReadingMode} from '../../src/platform/readingMode.ts';
import {animateValue} from '../../src/visuals/transition.ts';
import {t} from './i18n.ts';
import {bubbleShape,filmThickness} from './model.ts';
import {BubbleScene,type SceneState} from './scene.ts';
translateDocument(t);
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const state:SceneState={deformation:0,drainage:0,zoom:0,sample:-.75,angle:0,light:0};
let scene:BubbleScene|undefined,playing=false,zoomed=false,lit=false;
let cancelShape=()=>{},cancelDrain=()=>{},cancelZoom=()=>{},cancelSample=()=>{},cancelLight=()=>{};
try{scene=new BubbleScene(el<HTMLCanvasElement>('bubble-scene'),el<HTMLCanvasElement>('film-scene'));}catch(error){el('scene-error').hidden=false;console.error(error);}
function render(){
 scene?.draw(state);
 const shape=bubbleShape(state.deformation);
 el<HTMLInputElement>('drainage').value=String(Math.round(state.drainage*100));el('drainage-value').textContent=`${Math.round(state.drainage*100)}%`;
 el<HTMLInputElement>('angle').value=String(Math.round(state.angle*180/Math.PI));el('angle-value').textContent=`${Math.round(state.angle*180/Math.PI)}°`;
 el<HTMLButtonElement>('pause').disabled=!playing;
 el('play').textContent=state.drainage>=1?t('再看一次排液'):t('慢慢观察排液');
 el('zoom').textContent=zoomed?t('回到整个泡泡'):t('放大标记处');el('zoom').setAttribute('aria-pressed',String(zoomed));
 el('light').textContent=lit?t('收起光路'):t('显示两路反射光');el('light').setAttribute('aria-pressed',String(lit));
 const shapeText=state.deformation>.04?t('形状被拉长了。松开后，薄膜会趋向更小的表面积。'):t('自由、静止的小泡泡接近球形。');
 if(el('shape-note').textContent!==shapeText)el('shape-note').textContent=shapeText;
 const filmText=state.drainage<.05?t('先看薄膜，再慢慢推进；上方和下方会变得一样厚吗？'):state.sample<0?t('标记处在上方：液体向下重新分布，这里的薄膜逐渐变薄。'):t('标记处在下方：这里接收到上方流来的液体，薄膜逐渐变厚。');
 if(el('film-note').textContent!==filmText)el('film-note').textContent=filmText;
 el('sample-title').textContent=state.sample<0?t('上方薄膜的切面'):t('下方薄膜的切面');
 el('area-readout').textContent=t('固定空气体积的形状比较：相对球形，表面积增加约 {{percent}}%。',{percent:((shape.relativeArea-1)*100).toFixed(1)});
 el('thickness-readout').textContent=t('选中位置的模型厚度：{{thickness}} nm。数值仅来自本页简化分布，不是实际泡泡的测量结果。',{thickness:Math.round(filmThickness(state.sample,state.drainage))});
}
function stopDrain(){cancelDrain();playing=false;}
function shapeTo(target:number){cancelShape();cancelShape=animateValue({from:state.deformation,to:target,duration:1250,onUpdate:v=>{state.deformation=v;render();}});}
el('stretch').addEventListener('click',()=>shapeTo(1));el('release').addEventListener('click',()=>shapeTo(0));
el('zoom').addEventListener('click',()=>{zoomed=!zoomed;cancelZoom();cancelZoom=animateValue({from:state.zoom,to:zoomed?1:0,duration:1050,onUpdate:v=>{state.zoom=v;render();}});});
el('light').addEventListener('click',()=>{lit=!lit;cancelLight();cancelLight=animateValue({from:state.light,to:lit?1:0,duration:650,onUpdate:v=>{state.light=v;render();}});});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-sample]'))button.addEventListener('click',()=>{
 const target=Number(button.dataset.sample);document.querySelectorAll<HTMLButtonElement>('[data-sample]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 cancelSample();cancelSample=animateValue({from:state.sample,to:target,duration:900,onUpdate:v=>{state.sample=v;render();}});
});
el('drainage').addEventListener('input',()=>{stopDrain();state.drainage=Number(el<HTMLInputElement>('drainage').value)/100;render();});
el('angle').addEventListener('input',()=>{state.angle=Number(el<HTMLInputElement>('angle').value)*Math.PI/180;render();});
el('play').addEventListener('click',()=>{stopDrain();if(state.drainage>=1)state.drainage=0;playing=true;cancelDrain=animateValue({from:state.drainage,to:1,duration:14000*(1-state.drainage),onUpdate:v=>{state.drainage=v;render();},onComplete:()=>{playing=false;render();}});render();});
el('pause').addEventListener('click',()=>{stopDrain();render();});
el('reset').addEventListener('click',()=>{stopDrain();state.drainage=0;render();});
function stopAll(){stopDrain();cancelShape();cancelZoom();cancelSample();cancelLight();}
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAll();render();}});
window.addEventListener('pagehide',event=>{stopAll();if(!event.persisted)scene?.dispose();});
render();mountTopicNavigation('soap-bubbles');mountReadingMode('details.advanced');
