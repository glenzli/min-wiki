import { t } from './i18n.ts';
import type { WorldId } from './model.ts';
export const CONTENT = {
  mercury: { name: t("水星"), title: t("撞击留下的岩石世界"), kids: t("灰色地面上有许多撞击坑。水星没有像地球一样浓厚的大气，岩石直接面对太空环境。"), academic: t("水星是类地行星，表面由岩石和风化层构成。它拥有极稀薄的外逸层，不能把它画成具有蓝天、浓云的世界。"), observe: t("坑洼来自撞击，球体轮廓仍由重力维持。") },
  venus: { name: t("金星"), title: t("云层下面仍是岩石"), kids: t("从太空看，厚云遮住了金星的地面。继续往下，才会看到昏黄天空下的岩石平原和火山地貌。"), academic: t("金星有固体地表；二氧化碳大气和硫酸云不能等同于地面。表面约 467°C，气压约为地球海平面的 92 倍，有地面并不代表适合生命或人类着陆。"), observe: t("靠近云下的岩石，再剖开看看可能的内部。") },
  earth: { name: t("地球"), title: t("海洋覆盖的岩石行星"), kids: t("海水覆盖了地球的大部分表面，但海洋下面有岩石海床。地球不是一个从外到内全是水的球。"), academic: t("海洋覆盖约 71% 的地球表面。海面是液体与大气的界面，海床是水与岩石的界面；讨论“表面”时要先说明是哪一种界面。"), observe: t("剖开地球，让标记穿过地壳与地幔，一直走到中心。") },
  mars: { name: t("火星"), title: t("薄大气下的红色荒漠"), kids: t("火星有岩石、沙尘和高低起伏的地形。它的红色主要来自含铁矿物的氧化，地面并不是正在燃烧。"), academic: t("火星属于岩石行星，具有稀薄且以二氧化碳为主的大气。地表颜色并非只有红色，也有棕、灰和金黄；古河道等证据说明它曾拥有更丰富的地表水活动。"), observe: t("比较火星和地球：都有岩石，外部环境却很不同。") },
  jupiter: { name: t("木星"), title: t("条纹是流动的云"), kids: t("木星的条纹和旋涡不是大陆。向下穿过云层，周围会越来越稠密，却不会遇到一个像地球地面那样的着陆面。"), academic: t("木星属于气态巨行星，主要由氢和氦构成。内部压力和温度随深度增加，物质性质逐渐变化。“气态”不表示整个内部都是稀薄气体，也不表示飞行器能穿透它。"), observe: t("观察标记进入云层后，没有停在一条地面线上。") },
  neptune: { name: t("海王星"), title: t("冰巨星不是一个冰球"), kids: t("海王星外面也是大气和云。名字里的“冰”，说的是形成材料的一类，并不意味着外面有可走路的冰壳。"), academic: t("海王星是冰巨星。其内部包含较多水、氨、甲烷等重于氢氦的成分，在高压高温下具有复杂流体状态；内部结构仍有模型不确定性。不能把它当作裸露液态海洋的已知实例。"), observe: t("淡蓝色只是外观，不足以判断那里是不是海水。") },
  titan: { name: t("土卫六"), title: t("冰冷世界里的液体湖"), kids: t("土卫六是绕着土星转的卫星。这里冷极了，水会冻成坚硬的冰，甲烷和乙烷却能流动，聚成湖和海。它们不是可以喝的水，也没有包住整个世界。"), academic: t("卡西尼号的雷达、红外光谱和反射观测支持土卫六表面存在甲烷与乙烷组成的液体湖海，主要分布在极区。约 −179°C 的环境使水冰像岩石一样构成坚实地表；剖面中的冰质湖底是代表性示意，不是对每个湖床成分的直接测量。"), observe: t("比较地球与土卫六的液面，再看湖底：会流动的东西，不一定是水。") },
  cancri: { name: t("巨蟹座 55 e"), title: t("岩石也可能变成一片海"), kids: t("这颗远方行星离自己的恒星非常近。科学家根据它发出的热和光，推测迎着恒星的一面可能热到让岩石熔化，像一片岩浆海。我们还没有拍到这片海的近照。"), academic: t("55 Cancri e 是太阳系外的岩石行星。热辐射和大气光谱研究支持高温表面与挥发性气体大气的解释，向恒星的一侧很可能存在熔融硅酸盐。岩浆海的范围、深度与具体地形仍依赖模型；画面是有证据约束的想象，不是已测绘的海岸，也不宣称整颗行星是液体。"), observe: t("这里橙亮的液体代表熔化的岩石；把它与水、冰冷的甲烷湖分开。") },
} satisfies Record<WorldId, { name: string; title: string; kids: string; academic: string; observe: string }>;

export const DETAILS: Record<WorldId, { material: string; feature: string; evidence: string; source: string }> = {
  mercury: { material: t('固体岩石与碎屑'), feature: t('撞击坑的隆起边缘、阴影与碎石'), evidence: t('依据探测器影像 · 代表性地形'), source: 'https://science.nasa.gov/mercury/facts/' },
  venus: { material: t('厚云下的固体岩石'), feature: t('低矮火山、冷却熔岩与黄褐色雾霭'), evidence: t('雷达地形与着陆影像 · 云下示意'), source: 'https://science.nasa.gov/venus/venus-facts/' },
  earth: { material: t('液态水 / 岩石海床'), feature: t('海岸、浅水颜色与海面反光'), evidence: t('已观测到的水海洋 · 非真实地图'), source: 'https://science.nasa.gov/earth/facts/' },
  mars: { material: t('岩石、沙粒与尘埃'), feature: t('层状台地、暗色岩块与细密沙纹'), evidence: t('依据轨道与火星车影像 · 示意'), source: 'https://science.nasa.gov/mars/facts/' },
  jupiter: { material: t('可见的是云顶'), feature: t('纬向云带、剪切细丝与巨大旋涡'), evidence: t('依据云层影像 · 没有着陆地面'), source: 'https://science.nasa.gov/jupiter/jupiter-facts/' },
  neptune: { material: t('大气 / 深处的稠密流体'), feature: t('较淡的蓝绿色、微弱条带与亮云'), evidence: t('云层已观测 · 深层结构仍靠模型'), source: 'https://science.nasa.gov/neptune/neptune-facts/' },
  titan: { material: t('甲烷与乙烷湖 / 冰质陆地'), feature: t('平静的暗色湖、曲折湖岸与浓雾'), evidence: t('湖海已观测 · 土星的卫星'), source: 'https://science.nasa.gov/saturn/moons/titan/facts/' },
  cancri: { material: t('可能熔融的硅酸盐岩石'), feature: t('炽热液面与较暗的冷却斑块'), evidence: t('熔岩海是科学推测 · 不是实拍'), source: 'https://science.nasa.gov/missions/webb/nasas-webb-hints-at-possible-atmosphere-surrounding-rocky-exoplanet/' },
};
