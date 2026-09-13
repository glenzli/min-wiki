import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation('sound-vibrations');
const el = (id: string) => document.getElementById(id)!;
const value = (id: string) => Number((el(id) as HTMLInputElement).value);
import { frequency } from './model.ts';
let audio:AudioContext|undefined,osc:OscillatorNode|undefined,frame=0,started=0,serial=0;
let shownTension=value('tension'),stretchFrame=0;
function draw(phase=0,envelope=1){const stretch=(shownTension-1)/3,offset=18*stretch;el('left-anchor').setAttribute('transform',`translate(${-offset} 0)`);el('right-anchor').setAttribute('transform',`translate(${offset} 0)`);el('string').setAttribute('stroke-width',String(8-2.5*stretch));const a=value('amplitude')*envelope;el('string').setAttribute('d',Array.from({length:51},(_,i)=>{const x=172-offset+i/50*(556+offset*2),y=230+a*Math.sin(Math.PI*i/50)*Math.sin(phase);return `${i?'L':'M'}${x} ${y}`;}).join(''));el('pitch').textContent=t('每秒振动约 {{frequency}} 次',{frequency:Math.round(frequency(value('tension')))});el('air').setAttribute('d',envelope<.05?'':`M790 175Q825 230 790 285M811 154Q860 230 811 306`);el('air').setAttribute('opacity',String(Math.abs(Math.sin(phase))*envelope));}
function halt(){cancelAnimationFrame(stretchFrame);stretchFrame=0;el('pull-cues').setAttribute('opacity','0');serial++;cancelAnimationFrame(frame);frame=0;if(osc){try{osc.stop();}catch{/* already ended */}osc.disconnect();osc=undefined;}shownTension=value('tension');draw(0,0);}
async function pluck(){halt();const token=serial;try{audio??=new AudioContext();await audio.resume();if(token!==serial||document.hidden)return;osc=audio.createOscillator();const gain=audio.createGain();osc.type='triangle';osc.frequency.value=frequency(value('tension'));gain.gain.setValueAtTime(value('amplitude')/50*.09,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+1.6);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+1.65);const playing=osc;playing.onended=()=>{playing.disconnect();gain.disconnect();if(osc===playing){osc=undefined;draw(0,0);el('readout').textContent=t('振动停止了，声音也停了。');}};el('readout').textContent=t('正在慢镜头观察振动，同时播放实际音高。');started=performance.now();if(matchMedia('(prefers-reduced-motion: reduce)').matches){draw(Math.PI/2);return;}const tick=(now:number)=>{const seconds=(now-started)/1000;if(seconds>1.65){draw(0,0);frame=0;return;}draw(seconds*frequency(value('tension'))/100*Math.PI*2,Math.exp(-seconds*2.7));frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);}catch{el('readout').textContent=t('声音暂时无法播放，仍可用慢镜头观察振动。');}}
el('pluck').addEventListener('click',()=>{void pluck();});el('stop').addEventListener('click',()=>{halt();el('readout').textContent=t('振动停止了，声音也停了。');});el('tension').addEventListener('input',()=>{
  const from=shownTension;halt();shownTension=from;
  const target=value('tension'),start=performance.now();
  const direction=target>=from?1:-1;
  el('left-pull').setAttribute('transform',`translate(119 230) scale(${direction} 1) translate(-119 -230)`);
  el('right-pull').setAttribute('transform',`translate(781 230) scale(${direction} 1) translate(-781 -230)`);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){shownTension=target;draw(value('phase')/100*Math.PI*2);return;}
  const tick=(now:number)=>{
    const elapsed=now-start,p=Math.min(1,elapsed/180);
    shownTension=from+(target-from)*(1-(1-p)**3);
    draw(value('phase')/100*Math.PI*2);
    el('pull-cues').setAttribute('opacity',String(Math.max(0,1-elapsed/650)*.8));
    if(elapsed<650)stretchFrame=requestAnimationFrame(tick);else stretchFrame=0;
  };
  stretchFrame=requestAnimationFrame(tick);
  el('readout').textContent=t('先拨一下；绷紧程度改变音高，拨动幅度改变响轻。');
});
el('amplitude').addEventListener('input',()=>{halt();draw(value('phase')/100*Math.PI*2);});
el('phase').addEventListener('input',()=>{halt();draw(value('phase')/100*Math.PI*2);el('readout').textContent=t('这是手动慢镜头：拖动滑块，看橡皮筋怎样来回运动。');});document.addEventListener('visibilitychange',()=>{if(document.hidden){halt();void audio?.suspend();}});window.addEventListener('pagehide',event=>{halt();if(event.persisted)void audio?.suspend();else void audio?.close();});draw(0,0);el('readout').textContent=t('先拨一下；绷紧程度改变音高，拨动幅度改变响轻。');

mountReadingMode('details:not(.references)');
