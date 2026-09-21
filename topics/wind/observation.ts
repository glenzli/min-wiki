import { t } from './i18n.ts';
import { content } from './content.ts';
import { CONTENT as TYPHOON } from '../typhoon/content.ts';
import { SCIENCE as TYPHOON_SCIENCE } from '../typhoon/science.ts';
import { CONTENT as TORNADO } from '../tornado/content.ts';
import { SCIENCE as TORNADO_SCIENCE } from '../tornado/science.ts';
import { readout as typhoonReadout } from '../typhoon/model.ts';
import { readout as tornadoReadout } from '../tornado/model.ts';
import type { WindSession } from './session.ts';
export function describe(s:WindSession){
  if(s.world==='coast'){
    const zero=Math.abs(s.coast.heat)<.01,day=s.coast.heat>=0;
    const flow=s.coast.obstacle==='open'?t('开阔地面上，先沿着空气走一圈。靠近海面的一段与高处的一段，方向相反。'):content.flow.story;
    return {intro:t('同一片海岸：受热改变环流，环流经过地形，也推动身边的物体。'),scale:t('局地环流 · 海与陆的侧向对比'),
      badge:zero?t('海陆受热相近'):day?t('陆地较暖 · 近地海风'):t('陆地较冷 · 近地陆风'),
      caption:t('海在左，陆在右 · 可以拖动换角度 · 示踪线不是云或尘粒'),
      condition:t('本例只展示受热差异驱动的环流；真实海岸还有背景风、天气与地形影响。'),
      readout:zero?t('本例无持续热力环流'):day?t('近地面：海 → 陆'):t('近地面：陆 → 海'),
      title:s.lens==='cause'?t('从受热差异，追到空气运动'):s.lens==='flow'?t('走完整个环流，再看地形的影响'):t('同一股风，让不同物体回应'),
      body:s.lens==='cause'?content.origin.story+'\n\n'+content.coast.story:s.lens==='flow'?flow:t('不要离开这片海岸：树冠和草向风的一侧弯，帆受到力，风轮转动，种子随空气移动。把受热差异调小，比较这些变化怎样一起减弱；换成夜晚，再看近地风改变方向。'),
      watch:s.lens==='cause'?t('先比较白天与夜晚，再把受热对比移到中间。看近地风，也看高处的返回气流。'):s.lens==='flow'?t('在山坡、房屋和开阔地面之间切换，再转到侧视。气流会绕过地形，不会穿过实体。'):t('关闭气流示踪，只凭树、帆、风轮和种子，还能看出空气在动吗？'),
      science:s.lens==='cause'?content.origin.academic+'\n\n'+content.coast.academic:s.lens==='flow'?content.flow.academic:content.effects.academic,
      limit:t('地形、环流和物体响应为定性示意，尺度与速度未经校准；不计算真实风荷载或发电量。')};
  }
  if(s.world==='typhoon'){
    const features={eye:t('眼：中心的下沉空气增温、变干，云较难维持；近海面风通常比眼墙弱。眼区仍可能有低云，并非真空。'),wall:t('眼墙：围绕眼的深厚雷暴，空气强烈上升、凝结放热，常有最强风雨。斜视或剖面可以看到它的高度。'),bands:t('外围雨带：不均匀的螺旋状对流与降雨区，云间留有空隙；高空外流与近海面向内汇流方向不同。')};
    const r=typhoonReadout(s.typhoon.progress,s.typhoon.settings),specific=TYPHOON.structures[s.typhoon.structure],science=TYPHOON_SCIENCE[r.stage];
    return {intro:t('把视野拉到整个热带气旋：近海面汇入、旋转、上升与高空外流同时存在。'),scale:t('大范围风暴 · 画面独立缩放'),badge:r.limited?t('当前条件不利于组织'):TYPHOON.steps[r.stage],
      caption:t('拖动三维云系，比较风眼、眼墙与雨带 · 暖色示意上升，青绿示意低层汇入'),condition:TYPHOON.explanation,readout:r.limited?t('不利于组织'):t('环流持续活动'),
      title:s.lens==='cause'?TYPHOON.steps[r.stage]:s.lens==='flow'?specific.title:t('风的影响，不止最大风速'),
      body:r.limited&&s.lens!=='effects'?TYPHOON.blocked:s.lens==='cause'?TYPHOON.stories[r.stage]:s.lens==='flow'?specific.body+(s.typhoon.feature in features?'\n\n'+features[s.typhoon.feature as keyof typeof features]:''):t('台风能把热量和水汽带到很大的范围。强风推动海水、卷起浪，也可能损坏建筑；暴雨和风暴潮还会带来淹水风险。风眼里暂时风弱，不能当成风暴已经结束。'),
      watch:s.lens==='cause'?t('保持海面温暖，增大高低空风差，观察云系组织受什么限制；也可以从头看形成。'):s.lens==='flow'?specific.watch:t('比较眼区、眼墙与外围雨带，再选择眼墙置换：受影响的范围与最大风速不是同一件事。'),
      science:s.lens==='flow'?TYPHOON_SCIENCE[s.typhoon.structure==='replacement'?3:1].body:science.body+'\n\n'+science.formula+'\n'+science.terms,limit:TYPHOON.limits};
  }
  const r=tornadoReadout(s.tornado.progress,s.tornado.settings),science=TORNADO_SCIENCE[r.stage];
  return {intro:t('来到雷暴下方：比较高低空的风与上升气流，追踪局部旋转怎样发展。'),scale:t('雷暴局部 · 与台风不按同一比例显示'),badge:TORNADO.steps[r.stage],caption:t('侧面观察雷暴 · 凝结云可隐藏，空气旋转仍需单独观察'),
    condition:TORNADO.limits,readout:r.value==='tornado'?t('触地旋转气柱'):r.value==='weak'?t('较弱的气流'):t('雷暴中的旋转'),
    title:s.lens==='cause'?TORNADO.steps[r.stage]:s.lens==='flow'?t('看得见的漏斗，不是全部空气'):t('小范围，也可能有很强的作用'),
    body:r.limited&&s.lens!=='effects'?TORNADO.blocked:s.lens==='cause'?TORNADO.stories[r.stage]:s.lens==='flow'?t('可见漏斗由凝结的小水滴组成；它的末端不一定显示空气旋转达到的最低位置。关闭凝结云，沿着示踪轨迹观察。雷暴内旋转还不等于触地龙卷风。'):t('龙卷风的强风和飞散物会在局部造成严重破坏。它的危险不能只凭漏斗是否粗大或清楚判断。遇到预警，跟随大人与当地指引避险，不靠近观察。'),
    watch:s.lens==='cause'?science.watch:s.lens==='flow'?t('隐藏漏斗云，然后降低上升气流：区分云的可见性与近地旋转是否发展。'):t('与台风对照：比较形成条件和空间范围，不要根据两幅画面在屏幕上的大小判断真实尺度。'),
    science:science.body+'\n\n'+science.formula+'\n'+science.terms,limit:TORNADO.limits};
}
export function stages(s:WindSession){return s.world==='typhoon'?TYPHOON.steps:s.world==='tornado'?TORNADO.steps:[];}
