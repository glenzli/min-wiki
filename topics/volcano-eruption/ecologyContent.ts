import { t } from './i18n.ts';
import type { EcologyState } from './ecologyModel.ts';
export const LIFE_STEPS = [t('先让岩石凉下来'), t('裂缝里留下什么'), t('种子来到山坡'), t('为什么有绿有秃')];
export function ecologyStory(state: EcologyState) {
  if (state.stage === 0) return t('喷发结束了，小山还在。刚留下的岩石可能很热，小苗还不能在这里安家。先看红光慢慢退去：表面变暗了，里面也不一定已经冷透。');
  if (state.stage === 1) return t('雨水、冷热变化和生物活动慢慢改变岩石。裂缝接住碎粒、风吹来的尘土和水；枯叶等有机物后来也会加入。小小的落脚处，常常先出现在这些缝隙里。');
  if (state.stage === 2) return t('风或动物把种子带来，一些孢子也能远行。来到这里还不够：需要合适的温度、水和能够扎根的地方。看近处的小苗，它先从有条件的斑块长起，并不会让整座山同时变绿。');
  if (state.habitat === 'dry') return t('种子来了，水却留不住。干旱、薄土和容易漏水的碎屑，让许多小苗难以活下来。看到大片裸岩，不一定说明那里刚喷发过；变绿可能非常慢。');
  if (state.habitat === 'cold') return t('高处太冷，能生长的季节很短。这里仍可能有耐寒的小植物，但很难长成连片绿坡。有的山脚已经很绿，山顶却仍然光秃。');
  if (state.habitat === 'buried') return t('刚长起的小苗又被厚厚的新火山灰盖住了，一部分植被和原来的表土被埋在下面。新的熔岩、厚灰和不稳定的坡面都可能打断恢复；这不是一个只会一直向前的过程。');
  return t('水分和温度合适，地面也较稳定，小苗逐渐增多，枯落物又帮助土壤积累。绿色先连成斑块，再慢慢扩大。但每座山需要的时间不同，也不一定最后长成森林。');
}
export const LIFE_WATCH = t('把进度放到最后，再换环境：同一座山、同样经过一段时间，植物一定长得一样吗？');
export const OMURO_NOTE = t('大室山为什么像一顶草帽？它先由火山渣堆成山，后来才有植物。今天的草坡还受到长期人为山烧管理，不能只用“火山死了，所以长草”解释。这里比较的是通用环境条件，并非大室山的实测恢复过程。');
export function ecologyClue(state: EcologyState) {
  if (state.stage === 0) return t('先等地面冷却，种子还没有在这里发芽。');
  if (state.stage === 1) return t('看棕色细土怎样留在岩缝上；土壤需要慢慢积累。');
  if (state.stage === 2) return t('种子到了，但只有一部分落脚处能养活小苗。');
  return state.habitat === 'wet' ? t('有水、有合适温度，也有扎根处，绿斑慢慢扩大。')
    : state.habitat === 'dry' ? t('种子同样到了，缺水却让绿斑很难扩大。')
    : state.habitat === 'cold' ? t('能生长的温暖日子太少，植被仍然稀疏。')
    : t('新的厚灰盖住旧土层和小苗，恢复被打断。');
}
