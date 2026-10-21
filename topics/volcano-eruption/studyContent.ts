import { t } from './i18n.ts';
import type { Study } from './studyModel.ts';

export const UNIT_CONTENT = {
  eruption: t("喷发的原因与形式"),
  mountain: t("山体怎样形成"),
  later: t("喷发留下的风景"),
  heat: t("地下的热与水"),
};
export const STUDY_CONTENT: Record<Study, { title: string; short: string; introduction: string; clock: string; cue: string; bridge: string }> = {
  mechanism: { title: t("岩浆为什么能喷出来？"), short: t("为什么会喷发"), introduction: t("先追踪地下的补给和裂隙，再看这次岩浆能否通到地表。"), clock: t("一次地下活动 · 时间压缩"), cue: t("喷口贯通之前，地表没有来自这条通道的喷出物。"), bridge: t("接着比较：通到地表以后，为什么喷发看起来不一样？") },
  styles: { title: t("为什么有的流熔岩，有的喷出灰？"), short: t("喷发有什么不同"), introduction: t("从已贯通的喷口开始，选择溢流、喷溅、喷泉或灰柱，再保持同一座山、进度和镜头比较小喷发与大喷发。"), clock: t("一次地表喷发 · 时间压缩"), cue: t("在画面下选择喷发情境；用小喷发、大喷发比较同类现象，再追踪移动的流头或抛起的碎屑。"), bridge: t("一次喷发留下的岩石，怎样在更长时间里建成山？") },
  building: { title: t("火山怎样一层层长高、变宽？"), short: t("火山怎样长大"), introduction: t("先看地下的岩浆补给，再看熔岩和碎屑怎样留下山体。局部鼓胀与新岩石堆积是两种不同变化，可在本题内比较三种山形。"), clock: t("地下补给与多次堆积 · 时间压缩"), cue: t("这里只追踪建山；土壤、植物和湖水留到后面的问题。"), bridge: t("相同的堆积原理到了海底，会发生哪些变化？") },
  submarine: { title: t("海底的岩石怎样堆成山，甚至成岛？"), short: t("海底怎样成山"), introduction: t("先看熔岩在海水中留下岩石，再比较持续供给与较早停止；水下山体不一定长到海面。"), clock: t("海底堆积或喷发 · 分别压缩时间"), cue: t("深水、浅水和成岛是不同条件的观察，不是每座火山必经的三步。"), bridge: t("换到一段已成形的火山坡面，看看喷发之后为什么有绿有秃。") },
  ecology: { title: t("为什么有的火山坡长草，有的仍裸露？"), short: t("山坡为什么有绿有秃"), introduction: t("山体已经留下。这一题从岩石冷却开始，只追踪细土、种子与植物能否留下来。"), clock: t("已有山坡的变化 · 时间压缩"), cue: t("先看同一座山，再换水分、寒冷或厚灰条件，比较绿色能留下多少。"), bridge: t("山坡的变化之外，火山留下的凹地怎样才能成为湖？") },
  lake: { title: t("有了火山凹地，为什么不一定有湖？"), short: t("火山湖怎样形成"), introduction: t("先追踪塌陷岩体的去向，保留凹盆，再改变进水和渗漏，判断水能否留下。"), clock: t("塌陷与后来积水 · 分段压缩时间"), cue: t("塌陷可能发生在喷发期间；积水还需要后来的补给，湖泊也不代表火山熄灭。"), bridge: t("即使没有熔岩喷出来，地下的热与水还会怎样活动？") },
  heat: { title: t("温泉的水从哪里来，又怎样变热？"), short: t("温泉与地下热水"), introduction: t("追踪来自降水的水：渗入裂隙、经过热岩石、受热上升，最后在地表出露。"), clock: t("地下水循环 · 时间压缩"), cue: t("水一直是水，热量来自岩石；温泉水不是岩浆变出来的。"), bridge: t("把热源、地下水和裂隙连通放在一起理解；热液活动可以与火山活动共存。") },
};
export const BUILDING_STEPS = [t("地下补给与最初堆积"), t("新层叠在旧层上"), t("山坡继续长高、变宽"), t("留下已建成的山体")];
export const STYLES_STEPS = [t("物质从喷口出来"), t("流动、喷泉或碎裂"), t("物质沿途留下来"), t("喷发减弱，岩石冷却")];
export const HEAT_STEPS = [t("降水渗入裂隙"), t("水经过地下热岩石"), t("受热的水沿裂隙上升"), t("水在地表出露")];
