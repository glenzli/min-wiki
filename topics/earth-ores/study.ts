import './style.css';
import content from './content.json';
import type { StudyContext, StudyInstance } from '../earth/studyContract.ts';
import { createFinitePlayback, type FinitePlayback } from '../earth/finitePlayback.ts';
import type { OreScene } from './scene.ts';
import { EVIDENCE, PROCESSES, bauxiteAt, oreBudget, parseState, placerAt, progressFor, serializeState, veinAt, type OreState, type Process } from './model.ts';
const esc=(v:string|number)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
const num=(v:number)=>v.toFixed(2).replace(/\.?0+$/,'');
const fractionPercent=(fraction:number)=>fraction>0&&fraction<.0001?'<0.01':fraction<1&&fraction>.9999?'>99.99':num(fraction*100);
export function mountStudy(host:HTMLElement,context:StudyContext):StudyInstance{
 const w=(zh:string,en:string)=>context.language==='en'?en:zh,copy=context.language==='en'?content.en:content.zh;
 let state=parseState(context.initialState),disposed=false,epoch=0,loading=false,failed=false,scene:OreScene|undefined,playback:FinitePlayback|undefined,illustrationKey='';
 const events=new AbortController(),root=document.createElement('section');root.className='earth-module ores-study';
 const option=(key:string,label:string,items:readonly(readonly[string,string])[])=>`<label>${esc(label)}<select data-key="${key}">${items.map(([value,text])=>`<option value="${value}">${esc(text)}</option>`).join('')}</select></label>`;
 const range=(key:string,label:string,min=0,max=100,step=1)=>`<label class="ores-range"><span>${esc(label)}<output data-output="${key}"></output></span><input type="range" data-key="${key}" ${key==='progress'?'data-playback-scrub':''} min="${min}" max="${max}" step="${step}"></label>`;
 root.innerHTML=`<details class="ores-route"><summary>${esc(w('选择一条成矿路径','Choose a concentration pathway'))}: <strong data-case-name></strong></summary><nav>${PROCESSES.map((id,i)=>`<button type="button" data-process="${id}" aria-pressed="false"><small>0${i+1}</small> ${esc(copy.cases[id].title)}</button>`).join('')}</nav><p>${esc(copy.scope)}</p></details>
 <header class="ores-heading"><h3 tabindex="-1" data-question></h3><p data-lead></p></header>
 <nav class="ores-views" aria-label="${esc(w('观察方式','Observation mode'))}"><button type="button" data-view="process" aria-pressed="false">${esc(w('回到形成过程','Follow formation'))}</button><button type="button" data-view="specimen" aria-pressed="false">${esc(w('看同址标本','Inspect the specimen'))}</button></nav>
 <div class="ores-exhibit" data-playback-viewport><div class="ores-three-wrap" data-three-wrap hidden><div class="ores-three-host" data-three-host></div><p role="status" data-three-status></p><button type="button" data-three-retry hidden>${esc(w('保留状态并重试3D','Reload 3D with saved state'))}</button></div>
 <div class="ores-stage" data-illustration></div></div><p class="ores-note" data-scene-note></p>
 <div class="ores-controls ores-playback-controls">${range('progress',w('本路径进度（无标定时钟）','Path progress (uncalibrated)'),0,100,.1)}<button type="button" data-playback-toggle aria-pressed="false"></button><button type="button" data-start data-playback-reset>${esc(w('回到来源','Back to source'))}</button><button type="button" data-end>${esc(w('比较终点','Compare the endpoint'))}</button></div>
 <p class="ores-note ores-playback-note" data-playback-note>${esc(w('主动点击才播放；18秒压缩展示过程次序，不能换算真实地质时间。减少动态时按10个阶段推进，也可暂停并手动拖动。切换路径、观察方式或前提会停止播放。','Playback starts only on request. An 18-second compressed sequence shows process order, with no conversion to geological time. Reduced motion uses 10 steps; pause and scrub manually at any time. Changing paths, views or prerequisites stops playback.'))}<span data-playback-status role="status" aria-live="polite"></span></p>
 <div data-cut-controls hidden class="ores-controls">${range('cut',w('观察剖切：外表 → 新露出切面','Observation cut: exterior → newly exposed face'))}<button type="button" data-camera-reset>${esc(w('恢复视角','Reset camera'))}</button></div>
 <p class="ores-result" data-result role="status"></p><p class="ores-identity" data-identity></p>
 <details class="ores-conditions"><summary>${esc(w('改变一个前提，再比较','Change one prerequisite and compare'))}</summary>
 <div data-conditions="vein" class="ores-grid">${option('fracture',w('通道','Pathway'),[['open',w('裂隙连通','Connected fracture')],['sealed',w('这条通道封闭','This pathway sealed')]])}${option('fluid',w('可迁移金属输入','Mobile metal input'),[['rich',w('有金属输入','Metal supplied')],['poor',w('缺少金属输入','Metal-poor supply')]])}</div>
 <div data-conditions="bauxite" class="ores-grid">${option('weathering',w('化学风化','Chemical weathering'),[['intense',w('强烈风化条件','Intense-weathering setting')],['weak',w('较弱风化条件','Weaker weathering')]])}${option('drainage',w('溶解组分能否排出','Export of dissolved components'),[['flushed',w('能够有效排出','Effective export')],['closed',w('排出受到限制','Restricted export')]])}</div>
 <div data-conditions="placer" class="ores-grid">${option('liberation',w('先检查解离','Check liberation first'),[['free',w('允许从母岩解离','Grains can be liberated')],['locked',w('仍锁在母岩中','Still locked in host rock')]])}${option('flow',w('水流情景（不是流速单位）','Flow setting (not a velocity)'),[['weak',w('弱：尚未完成搬运','Weak: little transport')],['sorting',w('适中：选择性搬运','Selective transport')],['strong',w('强：两类都移出窗口','Strong: both leave the window')]])}</div>
 <p class="ores-note">${esc(w('切换条件比较平行情景，保留各路径自己的进度；三条路径没有同一只地质时钟。切换观察方式不重置物质标记。','Conditions compare parallel cases while each path retains its progress. The paths do not share one geological clock. Changing observation mode retains the material tags.'))}</p></details>
 <div class="ores-ledger" data-ledger></div><p class="ores-prompt" data-action></p>
 <details class="ores-evidence" open><summary>${esc(w('从好看，走到有证据','From appearance to evidence'))}</summary><fieldset><legend>${esc(w('打开不同证据窗口','Reveal evidence windows'))}</legend>${EVIDENCE.map(key=>`<label><input type="checkbox" data-evidence="${key}">${esc(({texture:w('结构与产状','Texture & occurrence'),properties:w('性质与矿物','Properties & minerals'),analysis:w('成分与取样','Analysis & sampling')})[key])}</label>`).join('')}</fieldset><div data-evidence-copy></div></details>
 <details class="ores-reading"><summary>${esc(w('这份材料怎样走进生活？','How does this material reach daily life?'))}</summary><p data-use></p><h4>${esc(w('也要记下代价','Account for the costs'))}</h4><p data-environment></p></details>
 <details class="ores-economy"><summary>${esc(w('同一吨原料：含有金属，为什么还不一定值得提取？','One tonne: why does metal content not guarantee viable extraction?'))}</summary><p>${esc(w('这里使用虚构代币、假定目标金属品位与理想分离；参数独立于上面任意标记数，不是这三种矿石的实测数据。','Fictional tokens, an assumed target-metal grade and ideal separation are used here. Parameters are independent of the arbitrary tags above, not measured data for these ores.'))}</p><div class="ores-grid">${range('grade',w('目标金属品位：质量 %','Target-metal grade: mass %'),.1,5,.1)}${range('recovery',w('已有目标金属的回收率 %','Recovery of existing target metal %'),20,95)}${range('price',w('每千克价值（代币）','Value per kg (tokens)'),2,20)}${range('cost',w('每吨总成本（代币）','Total cost per tonne (tokens)'),20,300)}</div><p class="ores-result" data-economy-result></p><p class="ores-note">${esc(w('正收支不证明经济储量、获准开采或环境可接受；地质分布、规模、杂质、基础设施、技术和治理费用等仍需证据。剩余物并不等同于真实尾矿，未计添加水和药剂。','A positive balance proves neither economic reserves, permission nor environmental acceptability. Distribution, scale, impurities, infrastructure, technology and management costs still need evidence. Remaining feed is not equivalent to real tailings; added water and reagents are excluded.'))}</p></details>
 <div data-deeper class="ores-deeper"></div><p class="ores-boundary" data-boundary></p><details class="ores-reading"><summary>${esc(w('矿物、岩石、矿石与宝石怎样关联？','How do minerals, rocks, ores and gems relate?'))}</summary><p>${esc(copy.classification)}</p><p>${esc(copy.scope)}</p></details>`;
 host.append(root);
 const get=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const text=(selector:string,value:string)=>{const node=get(selector);if(node.textContent!==value)node.textContent=value;};
 const fallbackNote=w('当前用形成剖面作为3D回退，同一条矿脉的36个来源标记仍可追踪、播放和回看。切面数值会保存，待3D恢复后使用。图与进度均未标定实物距离或地质时间。','The formation section is the 3D fallback. Its 36 source tags still track this vein during playback and scrubbing. Cut depth is saved for restored 3D. Neither the section nor its progress is calibrated to real distances or geological time.');
 const svg=(body:string,label:string,width=680,height=330)=>`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
 function projectSvg(key:string,body:string,label:string){if(illustrationKey!==key){get('[data-illustration]').innerHTML=svg(body,label);illustrationKey=key;}}
 function processDrawing(paint=true){
  let body='';
  if(state.process==='vein'){
   const s=veinAt(state);body=`<path d="M32 27h570v275H32Z" fill="#b9b1a1"/><path data-vein-gap d="M294 29c-20 51 35 76 7 123s17 95-8 150h65c22-49-20-96 8-140s-13-96 5-133" fill="${s.open?'#526b73':'#a7a293'}" stroke="#758487" stroke-width="2"/>`;
   body+=`<path data-vein-fill d="M320 35c-18 52 31 76 7 123s16 85-7 132" fill="none" stroke="#f1ecda" stroke-width="${4+s.quartz*23}" opacity="${s.quartz>0?.9:0}"/>`;
   body+=`<path d="m64 240 93-39 62-43 48-22" fill="none" stroke="#548e9b" stroke-width="3" stroke-dasharray="7 5"/><path d="M51 72h206M391 100h179M58 171h160M408 223h166" stroke="#918a79" stroke-width="2"/>`;
   for(const p of s.parcels)body+=`<circle data-ore-tag="${p.id}" cx="${p.x}" cy="${p.y}" r="${p.phase==='deposit'?4.4:3.4}" fill="${p.kind==='metal'?'#b88327':'#dce7df'}" stroke="${p.kind==='metal'?'#76571f':'#74909a'}" stroke-width="1"/>`;
   body+=`<circle cx="330" cy="184" r="29" fill="none" stroke="#e2b259" stroke-width="3"/><text x="371" y="189" font-size="18" fill="#78551f">A</text><text x="70" y="319" fill="#556b72" font-size="14">${esc(w('材料来源 → 迁移通道 → 留在裂隙','Material source → pathway → deposition'))}</text>`;
   text('[data-result]',copy.cases.vein.result[s.stage as keyof typeof copy.cases.vein.result]);
   text('[data-ledger]',`${w('同一批来源标记','Same source tags')}: ${s.parcels.filter(p=>p.phase==='source').length} ${w('仍在来源','at source')} + ${s.parcels.filter(p=>p.phase==='flow').length} ${w('迁移/渐次沉淀中','in transit / partly depositing')} + ${s.parcels.filter(p=>p.phase==='deposit').length} ${w('已完成整批沉淀','completed source batches')} = 36 · ${w('批内平均沉淀份额','Mean fraction deposited within source batches')}: ${w('硅质','silica')} ${fractionPercent(s.quartz)}% / ${w('金属','metal')} ${fractionPercent(s.sulfide)}% · ${w('来源批可部分沉淀；教学份额不是单原子、实测质量或品位','source batches can deposit partly; teaching fractions are not single atoms, measured mass or grade')}`);
  }else if(state.process==='bauxite'){
   const s=bauxiteAt(state);body=`<path d="M32 68q125-26 227-3t205-6v241H32Z" fill="#bca990"/><path data-weathered-layer d="M32 83q130-28 230-4t202-9v${35+s.weathered*65}q-100 25-202 5T32 ${118+s.weathered*65}Z" fill="#b85e38" opacity="${.1+s.weathered*.7}"/><path d="M32 213q134-20 248 2t184-9v94H32Z" fill="#a59a8a"/><path d="M34 72q130-25 227-3t205-6" fill="none" stroke="#63775b" stroke-width="6"/>`;
   for(let i=0;i<5;i++)body+=`<path d="M${95+i*65} 24v26m-5-9 5 9 5-9" stroke="#548f9d" fill="none" stroke-width="2"/>`;
   for(const p of s.tags){const fill=p.kind==='al-bearing'?'#e6c067':p.kind==='residual'?'#915337':'#5c9eae';body+=`<circle data-ore-tag="${p.id}" cx="${p.x}" cy="${p.y}" r="5" fill="${fill}" stroke="#625f50" stroke-width="1"/>`;}
   body+=`<path d="M473 196h88m-10-6 10 6-10 6" stroke="#548f9d" fill="none" stroke-width="3"/><text x="477" y="294" fill="#556b72" font-size="13">${esc(w('移出剖面仍记账','Export remains accounted for'))}</text>`;
   text('[data-result]',s.exported>0?w('一些较可迁移组分随水离开；含铝来源标记没有增加，剩余材料的相对组成改变。','Some mobile components leave with water. Aluminum-bearing tags have not increased; the remainder’s relative composition changes.'):w('在这组条件/进度下，尚没有完成显著的选择性移出；风化物不自动等于铝土矿。','These conditions/progress have not completed substantial selective export. Weathered material does not automatically qualify as bauxite.'));
   text('[data-ledger]',`${w('含铝来源标记','Al-bearing source tags')}: ${s.al} / ${s.remaining} ${w('剖面内标记','tags remaining')} · ${s.exported} ${w('已移出','exported')} + ${s.remaining} ${w('留存','remaining')} = 30 · ${w('金色含铝、棕色其他保留、蓝色较可迁移；不是化验品位','gold Al-bearing, brown other retained, blue mobile; not an assay')}`);
  }else{
   const s=placerAt(state);body=`<path d="M25 53q80-40 131 26l48 127 50 18h105l19 24h47l20-24h204v71H25Z" fill="#b6aa90"/><path d="M155 159q64 42 107 39h385v30H250q-67 1-99-27Z" fill="#80adb5" opacity=".65"/><path d="M252 230h108l19 24h47l20-24h202" fill="none" stroke="#8b816a" stroke-width="4"/><path d="M251 211h321m-11-6 11 6-11 6" stroke="#2f7d96" stroke-width="3" fill="none"/><rect x="363" y="226" width="83" height="45" fill="none" stroke="#c18d35" stroke-width="2" stroke-dasharray="5 4"/>`;
   for(const p of s.grains)body+=`<path data-ore-tag="${p.id}" transform="translate(${p.x} ${p.y})" d="m0-5 5 2 1 6-5 3-5-3 0-5Z" fill="${p.kind==='cassiterite'?'#604d3d':'#e4dfc7'}" stroke="#6a6c60" stroke-width="1"/>`;
   body+=`<text x="356" y="308" font-size="14" fill="#805c27">${esc(w('固定观察窗','Fixed bed window'))}</text>`;
   text('[data-result]',state.liberation==='locked'?w('颗粒仍锁在母岩里，不能按两种单矿物的密度自动分开。','Grains remain locked in host rock; the individual minerals do not automatically separate by density.'):state.flow==='weak'?w('这股水流情景尚未完成分选，颗粒多留在来源附近。','This weak-flow case has not sorted the grains; they remain near the source.'):state.flow==='strong'?w('很强的水流也能把重矿物带出窗口；“重”不等于永远搬不动。','Strong flow can carry heavy grains beyond the window; heavy does not mean immovable.'):w('在等代表粒径对照中，较轻颗粒被搬得更远，部分重矿物留在河床低处。','At equal representative size, lighter grains travel farther and heavy grains can remain in the bed depression.'));
   text('[data-ledger]',`${w('固定样本','Fixed set')}: 6 ${w('锡石','cassiterite')} + 18 ${w('石英','quartz')} = 24 · ${w('观察窗内','in window')}: ${s.heavyTrapped} ${w('重矿物','heavy grains')} · ${w('已出窗','exported')}: ${s.exported} · ${w('不把出窗当消失','export is not disappearance')}`);
  }
  if(!paint)return;
  projectSvg(`process:${state.process}`,body,w('三种成矿代表过程的可回退剖面；颜色编码材料标记，A连接同址标本。','Reversible sections of representative ore-forming paths; colors code material tags and A links a specimen site.'));
  if(state.process==='vein'){
   const s=veinAt(state),fill=get('[data-vein-fill]');fill.setAttribute('stroke-width',String(4+s.quartz*23));fill.setAttribute('opacity',s.quartz>0?'.9':'0');get('[data-vein-gap]').setAttribute('fill',s.open?'#526b73':'#a7a293');
   for(const p of s.parcels){const node=get(`[data-ore-tag="${p.id}"]`);node.setAttribute('cx',String(p.x));node.setAttribute('cy',String(p.y));node.setAttribute('r',p.phase==='deposit'?'4.4':'3.4');}
  }else if(state.process==='bauxite'){
   const s=bauxiteAt(state),layer=get('[data-weathered-layer]');layer.setAttribute('d',`M32 83q130-28 230-4t202-9v${35+s.weathered*65}q-100 25-202 5T32 ${118+s.weathered*65}Z`);layer.setAttribute('opacity',String(.1+s.weathered*.7));
   for(const p of s.tags){const node=get(`[data-ore-tag="${p.id}"]`);node.setAttribute('cx',String(p.x));node.setAttribute('cy',String(p.y));}
  }else for(const p of placerAt(state).grains)get(`[data-ore-tag="${p.id}"]`).setAttribute('transform',`translate(${p.x} ${p.y})`);
 }
 function specimenDrawing(){
  if(state.process==='vein')return;
  let body='';
  if(state.process==='bauxite'){
   const s=bauxiteAt(state);body=`<path d="m104 82 97-36 164 26 85 74-17 109-170 30-141-56Z" fill="${s.exported?'#a65c36':'#b3997a'}" stroke="#715b46" stroke-width="3"/>`;
   if(s.exported>0){for(let i=0;i<32;i++){const x=134+(i*67%250),y=104+(i*41%119),r=7+(i%4)*2;body+=`<circle cx="${x}" cy="${y}" r="${r}" fill="${i%3?'#b8784b':'#875438'}" stroke="#dfac72" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${r*.56}" fill="none" stroke="#77503b" stroke-width="1.4"/>`;}}
   else for(let i=0;i<25;i++){const x=134+(i*67%250),y=104+(i*41%119);body+=`<path d="m${x} ${y} 14-7 18 10-8 14-19-4Z" fill="${i%3?'#c6b294':'#8f8b79'}" stroke="#968774"/>`;}
   body+=`<text x="100" y="307" fill="#536a72" font-size="14">${esc(s.exported>0?w('豆状结构代表例；不是纹理形成预测或所有铝土矿的必备外观','A pisolitic example, not a texture prediction or a requirement'):w('尚未完成显著相对富集：母岩 / 风化物代表图','Parent rock / weathered material before substantial enrichment'))}</text>`;
  }else{
   const s=placerAt(state);body=`<rect x="60" y="42" width="538" height="246" rx="22" fill="${state.liberation==='locked'?'#9b9583':'#c3bba6'}" stroke="#8a8978" stroke-width="3"/>`;
   for(let i=0;i<s.grains.length;i++){const p=s.grains[i],x=106+(i%8)*64,y=92+Math.floor(i/8)*70;body+=`<path data-ore-tag="${p.id}" d="m${x} ${y-14} 13 8 2 16-15 10-12-9 0-15Z" fill="${p.kind==='cassiterite'?'#604d3d':'#e8e3cb'}" stroke="#666a5d" stroke-width="2"/><text x="${x}" y="${y+31}" text-anchor="middle" fill="#536a72" font-size="10">${p.id}</text>`;}
   body+=`<text x="90" y="318" fill="#536a72" font-size="14">${esc(w('同一24颗来源标记的观察阵列，不保证已从母岩中解离','The same 24 source tags arranged for inspection, not proof of liberation'))}</text>`;
  }
  projectSvg(`specimen:${state.process}:${state.process==='bauxite'&&bauxiteAt(state).exported>0}`,body,w('代表性标本观察；铝土矿结构为创作示意，砂矿保留同一24个颗粒标记。','Representative specimen observations: authored bauxite texture and the same 24 placer-grain tags.'));
 }
 function destroyScene(){++epoch;loading=false;scene?.dispose();scene=undefined;get('[data-three-host]').replaceChildren();}
 function ensureScene(){
  if(scene){scene.update(state);return;}if(loading||failed)return;loading=true;const ticket=++epoch;
  get<HTMLElement>('[data-three-status]').hidden=false;text('[data-three-status]',w('正在准备同址矿脉3D标本……','Preparing the 3D vein specimen…'));
  const unavailable=()=>{if(disposed||ticket!==epoch)return;failed=true;get<HTMLElement>('[data-three-host]').hidden=true;get<HTMLElement>('[data-three-retry]').hidden=false;get<HTMLElement>('[data-three-status]').hidden=false;text('[data-three-status]',w('3D暂不可用；形成剖面与全部证据仍可观察。重试会保留URL状态重新加载。','3D is unavailable; the formation section and all evidence remain usable. Retry reloads the saved URL state.'));get<HTMLElement>('[data-illustration]').hidden=false;text('[data-scene-note]',fallbackNote);};
  void import('./scene.ts').then(module=>{if(disposed||ticket!==epoch||state.process!=='vein'||state.view!=='specimen')return;scene=module.createOreScene(get('[data-three-host]'),{label:w('自制石英-硫化物矿脉手标本，可旋转和露出新切面；不是实物扫描或勘探结果。','Authored quartz-sulfide vein specimen with rotation and newly exposed cut faces; not a scan or exploration result.'),camera:state.camera,onCamera(value){if(!disposed&&ticket===epoch){state.camera=value;context.onStateChange(serializeState(state));}},onUnavailable:unavailable});scene.update(state);if(!failed)get<HTMLElement>('[data-three-status]').hidden=true;}).catch(unavailable).finally(()=>{if(ticket===epoch)loading=false;});
 }
 function playbackControls(){
  const playing=playback?.isPlaying()??false,atEnd=progressFor(state)>=100,button=get<HTMLButtonElement>('[data-playback-toggle]');
  button.setAttribute('aria-pressed',String(playing));text('[data-playback-toggle]',playing?w('暂停过程','Pause process'):state.process!=='vein'&&state.view==='specimen'?w('回到形成剖面并播放','Play the formation section'):atEnd?w('从来源重播','Replay from source'):w('播放本路径','Play this path'));
  get('[data-result]').setAttribute('aria-live',playing?'off':'polite');
 }
 function renderProgress(){
  if(disposed)return;const progress=progressFor(state);root.dataset.oreProgress=String(progress);get<HTMLInputElement>('[data-key="progress"]').value=String(progress);get<HTMLOutputElement>('[data-output="progress"]').value=String(Math.round(progress*10)/10);
  processDrawing(state.view==='process'||state.process==='vein');if(state.view==='specimen')specimenDrawing();scene?.update(state);playback?.sync();playbackControls();
 }
 function render(){
  if(disposed)return;const page=copy.cases[state.process],is3D=state.process==='vein'&&state.view==='specimen';
  root.dataset.oreProcess=state.process;text('[data-case-name]',page.title);text('[data-question]',page.question);text('[data-lead]',page.lead);text('[data-action]',page.action);text('[data-identity]',page.identity);text('[data-use]',page.use);text('[data-environment]',page.environment);text('[data-boundary]',page.boundary);
  root.querySelectorAll<HTMLButtonElement>('button[data-process]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.process===state.process)));root.querySelectorAll<HTMLButtonElement>('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
  root.querySelectorAll<HTMLElement>('[data-conditions]').forEach(el=>el.hidden=el.dataset.conditions!==state.process);
  for(const input of root.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-key]')){const key=input.dataset.key as keyof OreState;const value=key as string==='progress'?progressFor(state):state[key];input.value=String(value);const output=root.querySelector<HTMLOutputElement>(`[data-output="${key}"]`);if(output)output.value=String(value);}
  root.querySelectorAll<HTMLInputElement>('[data-evidence]').forEach(input=>input.checked=state.evidence.includes(input.dataset.evidence as typeof EVIDENCE[number]));
  renderProgress();get<HTMLElement>('[data-three-wrap]').hidden=!is3D;get<HTMLElement>('[data-three-host]').hidden=failed;get<HTMLElement>('[data-cut-controls]').hidden=!is3D;get<HTMLElement>('[data-illustration]').hidden=is3D&&!failed;
  if(is3D)ensureScene();else if(scene||loading)destroyScene();
  text('[data-scene-note]',is3D&&failed?fallbackNote:is3D?w('A连接同一条矿脉。拖动旋转，双指/滚轮缩放；键盘方向键、±、Home。深色是未充填区域，蓝灰带示意输入迁移，浅色/金属状斑块随沉淀显露。显露次序不是实测流向、流速或晶体生长；切面独立控制，材质场固定。无实物标尺、产地或品位，不求真实孔隙形状。','A links the same vein. Drag, pinch/scroll, or use arrows, ± and Home. Dark areas are unfilled; a blue-gray band codes transport, while pale and metallic-looking patches reveal deposition. Reveal order is not a measured flow direction, speed or crystal-growth solution. Cutting is separate and the material field stays fixed. No measured scale, locality, grade or pore geometry is implied.'):w('各图独立示意，无共同距离、深度或时间尺；材料标记随进度保留，允许回退。','Sections are schematic without shared distance, depth or time scales. Material tags are retained during reversible progress.'));
  get('[data-evidence-copy]').innerHTML=state.evidence.length?state.evidence.map(key=>`<article><h4>${esc(page.evidence[key].label)}</h4><p>${esc(page.evidence[key].record)}</p><p class="ores-note">${esc(page.evidence[key].limit)}</p></article>`).join(''):`<p class="ores-note">${esc(w('先选一种证据窗口。每条线索回答不同的问题，颜色不能单独鉴定。','Choose an evidence window. Each clue answers a different question; color alone is insufficient.'))}</p>`;
  if(get('[data-deeper]').getAttribute('data-case')!==state.process){get('[data-deeper]').setAttribute('data-case',state.process);get('[data-deeper]').innerHTML=page.deeper.map(note=>`<details><summary>${esc(note.title)}</summary><p>${esc(note.body)}</p></details>`).join('');}
  const budget=oreBudget(state);text('[data-economy-result]',`1 000 kg × ${num(state.grade)}% × ${num(state.recovery)}% = ${num(budget.recovered)} kg · ${num(budget.recovered)} × ${num(state.price)} − ${num(state.cost)} = ${num(budget.balance)} ${w('代币/吨原料','tokens/tonne feed')}`);
  context.onStateChange(serializeState(state));
 }
 playback=createFinitePlayback({element:root,id:'ore-formation',durationMs:18000,frameIntervalMs:1000/15,reducedMotionSteps:10,visibilityTarget:get('[data-playback-viewport]'),readProgress:()=>progressFor(state)/100,writeProgress(fraction){if(disposed)return;state[state.process==='vein'?'veinProgress':state.process==='bauxite'?'bauxiteProgress':'placerProgress']=Math.round(fraction*100000)/1000;renderProgress();context.onStateChange(serializeState(state));},onPlayingChange(playing){if(disposed)return;playbackControls();text('[data-playback-status]',playing?w('正在播放；可随时暂停或拖动。','Playing; pause or scrub at any time.'):progressFor(state)>=100?w('已到终点，播放已停止。','Endpoint reached; playback stopped.'):w('已暂停；拖动或继续播放。','Paused; scrub or resume.'));if(!playing)context.onStateChange(serializeState(state));}});
 root.addEventListener('click',event=>{if(disposed||!(event.target instanceof Element))return;
  if(event.target.closest('[data-playback-toggle]')){if(state.process!=='vein'&&state.view==='specimen'){state.view='process';render();}playback!.toggle();return;}
  const process=event.target.closest<HTMLButtonElement>('button[data-process]')?.dataset.process as Process|undefined;if(process&&PROCESSES.includes(process)){playback!.pause();state.process=process;render();get<HTMLDetailsElement>('.ores-route').open=false;get<HTMLElement>('[data-question]').focus({preventScroll:true});return;}
  const view=event.target.closest<HTMLButtonElement>('button[data-view]')?.dataset.view;if(view==='process'||view==='specimen'){playback!.pause();state.view=view;render();return;}
  if(event.target.closest('[data-three-retry]')){playback!.pause();location.reload();return;}if(event.target.closest('[data-camera-reset]'))scene?.resetCamera();if(event.target.closest('[data-start]')){playback!.reset();return;}if(event.target.closest('[data-end]'))playback!.setProgress(1);
 }, {signal:events.signal});
 root.addEventListener('input',event=>{if(disposed||!(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement))return;const input=event.target;
  if(input.dataset.key==='progress'){playback!.setProgress(Number(input.value)/100);return;}
  if(input.dataset.evidence){const key=input.dataset.evidence as typeof EVIDENCE[number];state.evidence=EVIDENCE.filter(e=>e===key?(input as HTMLInputElement).checked:state.evidence.includes(e));}else if(input.dataset.key){playback!.pause();state=parseState({...serializeState(state),[input.dataset.key]:input.value});}else return;render();
 },{signal:events.signal});
 render();return{pause(){playback?.pause();scene?.pause();},dispose(){if(disposed)return;playback?.dispose();disposed=true;events.abort();destroyScene();root.remove();}};
}
