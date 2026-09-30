import { t } from './i18n.ts';
import type { MagmaState } from './magmaSystem.ts';
export const MECHANISM_STEPS = [t('深部补给'), t('储存与增压'), t('裂隙中上升'), t('通达地表'), t('供给减弱'), t('留下的岩石')];
export function mechanismStory(state: MagmaState) {
  if (state.stage === 0) return t('深部岩石发生部分熔融，熔体汇集后沿裂隙上升。画面下边缘是从更深处进入的补给；这里没有画出整个地幔，也不是地核把熔岩送上来。');
  if (state.stage === 1) return t('新的岩浆进入已有储存区，改变局部压力并挤压周围岩石。储存区包含熔体和晶体，有不同深度的透镜状岩床与连通部分，并非一个装满液体的圆球。');
  if (state.stage === 2) return t('岩浆沿有利的裂隙侵入，把岩脉尖端向前推进；短分支可以停在地下。围岩应力、结构阻碍和浮力都影响路径。上升时压力降低，气泡会析出、膨胀。');
  if (state.stage === 3) return t('这一次岩脉终于通达地表，喷出物才开始出现。气体能否顺利逸出、岩浆黏度和补给共同影响它是流淌、喷泉还是富灰爆发；岩浆排出也会降低储存区的过压。');
  if (!state.connected) return state.front > .005
    ? t('这次岩浆停在了地下，未贯通地表。补给减弱后，侵入的岩脉与岩床逐渐冷却结晶；有增压、裂隙和地下活动，也不一定发生喷发。')
    : t('这次补给不足以推动岩浆贯通地表。岩浆仍可留在储存区，随后缓慢冷却；地面保持安静，不能据此判定整个火山系统已经熄灭。');
  return state.stage === 4 ? t('这一情境中，深部补给逐渐减弱，排出与散失使过压下降，喷发随之减弱。已经喷出的碎屑继续飞行、落地，熔岩仍保留在坡面。')
    : t('喷出的熔岩与碎屑留下新的岩石；未喷出的部分留在地下。暗色表皮不代表内部已经冷透，地下结晶和地表冷却都需要时间。');
}
export function mechanismKidStory(state: MagmaState) {
  if (state.stage === 0) return t('地下的岩浆得到新的补给，先在岩石里汇集。');
  if (state.stage === 1) return t('更多岩浆挤进来，周围的岩石开始承受更大的压力。');
  if (state.stage === 2) return t('岩浆沿裂隙向上走；它也可能停在地下。');
  if (!state.connected) return t('这次岩浆没有到达地面，所以没有这次的喷出物。');
  if (state.stage === 3) return t('岩脉通到地面，岩浆和气体才从喷口出来。');
  if (state.stage === 4) return t('补给渐渐少了，喷发减弱；飞出的碎屑还会落下。');
  return t('地上留下新岩石，地下也还有没有喷出的岩浆。');
}
export function mechanismStatus(state: MagmaState) {
  return state.connected ? t('已贯通地表') : state.p > .8 ? t('未贯通 · 留在地下') : state.front > .005 ? t('岩脉正在扩展') : t('岩浆正在汇集');
}
