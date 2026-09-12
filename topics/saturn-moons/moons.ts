import { t } from './i18n.ts';
export const MOON_TEXT: Record<string, {name: string; fact: string}> = {
  mimas: { name: t('土卫一 · Mimas'), fact: t('表面有一座相对自身非常大的赫歇尔撞击坑。它很小，却不缺醒目的地形。') },
  enceladus: { name: t('土卫二 · Enceladus'), fact: t('明亮冰壳下有全球海洋，南极附近裂隙会喷出水汽和冰粒。喷流也为土星 E 环提供物质。') },
  tethys: { name: t('土卫三 · Tethys'), fact: t('主要由冰组成，表面有大型撞击坑，也有巨大的伊萨卡峡谷系统。') },
  dione: { name: t('土卫四 · Dione'), fact: t('一颗冰质卫星。早期照片中的明亮细纹，后来被看清是与断裂有关的冰崖。') },
  rhea: { name: t('土卫五 · Rhea'), fact: t('土星第二大的卫星，表面冰冷而布满撞击坑。它仍远小于土卫六。') },
  titan: { name: t('土卫六 · Titan'), fact: t('土星最大的卫星，比水星直径还大。浓厚大气下有甲烷和乙烷的河流、湖泊与海洋，不是地球式的液态水湖。') },
  iapetus: { name: t('土卫八 · Iapetus'), fact: t('一侧很暗，另一侧较亮；赤道附近还有醒目的山脊。近景用明暗两区提示这种差异。') },
};
