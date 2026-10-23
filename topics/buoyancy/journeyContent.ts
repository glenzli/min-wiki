import { t } from './i18n.ts';
import type { JourneyChapter, JourneyFrame, JourneyObject } from './journeyModel.ts';

export const CHAPTERS: JourneyChapter[] = ['shore', 'water', 'pressure', 'metal'];
export const chapterName = (chapter: JourneyChapter) => ({ shore: t('看浮沉'), water: t('水托住水'), pressure: t('水怎样推'), metal: t('金属变成船') })[chapter];
export const objectName = (object: JourneyObject) => ({ log: t('圆木'), stone: t('石头'), coin: t('硬币'), boat: t('小船') })[object];
export function moments(chapter: JourneyChapter) {
  if (chapter === 'water') return [{ p: .12, label: t('圈出一份水') }, { p: .43, label: t('换回物体') }, { p: 1, label: t('看看浮沉') }];
  if (chapter === 'metal') return [{ p: .12, label: t('实心下沉') }, { p: .43, label: t('压成薄片') }, { p: .63, label: t('抬起船沿') }, { p: 1, label: t('重新入水') }];
  if (chapter === 'shore') return [{ p: 0, label: t('先猜一猜') }, { p: .5, label: t('正在入水') }, { p: 1, label: t('停在哪里') }];
  return [];
}
export function journeyCopy(frame: JourneyFrame) {
  const { chapter, lens, object } = frame.settings;
  if (chapter === 'pressure' && frame.comparison < 1) return { title: t('先看周围的水怎样推这份水'), body: t('观察的位置没有改变。回到“水托住水”，换回物体后，再放大物体与水的接触处。'), hint: t('换一种观察方法，不会提前推进替换过程。') };
  if (chapter === 'pressure') return lens === 'micro'
    ? { title: t('水看起来不动，分子一直在活动'), body: t('放大同一物体的 A、B 接触处：许多小小的分子不断运动、彼此作用，把力传到物体上。'), hint: t('深处更强的是平均水压；这里没有把深处的分子画得更快或更密。') }
    : { title: t('水从四周推，合起来向上托'), body: t('先看蓝色箭头：水垂直推每一小块表面。水有重量，深处平均挤压更强；合起来留下向上的浮力。'), hint: t('切到接触处，继续追问：安静的水为什么仍然能推？') };
  if (chapter === 'metal') {
    if (frame.beat === 'metal.solid') return { title: t('同一份金属，先看实心的样子'), body: t('这份金属重 780 克，实体只有 100 毫升。即使全部入水，也排不开足够重的水来托住它。'), hint: t('全过程保留同一份金属，重量没有偷偷改变。') };
    if (frame.beat === 'metal.lift') return { title: t('把这份金属取出来'), body: t('接下来只改变形状。先拿到水面上，金属仍然是 780 克。'), hint: t('拖动进度，可以停在取出、压薄和围起船沿之间。') };
    if (frame.beat === 'metal.flatten') return { title: t('压薄、展开，金属还是那么多'), body: t('同一份材料变宽、变薄。下一步抬起边缘，围出一个能把水挡在外面的空腔。'), hint: t('面积变大只是成形的一步，关键还要有能挡住水的船壳。') };
    if (frame.beat === 'metal.bend') return { title: t('抬起船沿，围出干燥的空腔'), body: t('沿着同一片金属看：底部留下来，边缘渐渐抬高。材料没有增加，里面却有了可挡水的空间。'), hint: t('这里把加工过程放慢、简化，方便看清形状怎么变。') };
    if (frame.beat === 'metal.lower' && !frame.hydro.flooded) return { title: t('让船壳重新进入水中'), body: t('船壳把水挡在外面。水面以下的干燥空腔也占住水的位置，随着入水，向上的托力增加。'), hint: t('想想上一段：这块更大的水下空间，原来能装多重的水？') };
    return frame.hydro.flooded
      ? { title: t('水越过船沿，空腔进水了'), body: t('船里已经装着水的地方，不再把水挡在外面。可用的排水空间减少，水的托力不够，船会沉下去。'), hint: t('减少货物，再看船沿重新留在水面上。') }
      : { title: t('同一份金属，这次浮住了'), body: frame.settings.cargo > 0 ? t('加货后，船会多沉入一些，排开更多水来托住新增的重量。继续观察船沿离水面还有多远。') : t('金属仍重 780 克。船壳现在能挡开足够的水，停稳时，水的托力与它的重量一样大。'), hint: t('试着逐块加货，再回到“水托住水”看看船下那份水。') };
  }
  if (chapter === 'water') {
    if (frame.beat === 'water.flooded') return { title: t('进水的小船，哪些地方还在排水？'), body: t('已经装着水的空腔不再算排水。这里只比较金属和货物真正占住的水下空间。'), hint: t('先减少货物，可再观察保持干燥的船舱。') };
    if (frame.beat === 'water.parcel') return { title: t('先看这里原来的一份水'), body: t('我们只在水里圈出一个形状。这份水能停在这里，因为周围的水正好托住了它的重量。'), hint: t('轮廓是想象画的，没有薄膜，也没有额外的小容器。') };
    if (frame.beat === 'water.replace') return { title: t('在同一个位置，换回物体'), body: t('水位和接触边界没变，周围水的托力也没变；换了的是里面东西的重量。'), hint: t('看清两种力：周围的水向上托，里面的东西向下重。') };
    if (frame.beat === 'water.release') return frame.hydro.floating
      ? { title: t('一样重，就这样浮住了'), body: t('这只船和同形水一样重。换回船再放开，向上的托力仍正好抵住它的重量。'), hint: t('如果加上货物，船需要再多排开一些水。') }
      : { title: t('放开以后，比较谁更重'), body: t('物体比同形的水重，就往下走；比同形的水轻，就往上走。水一直在托着它。'), hint: object === 'log' ? t('漂浮时，露出水面的部分增加，排水量随之减少，直到两种力平衡。') : t('下沉不等于没有浮力。下一段比较物体与同形水的重量。') };
  }
  if (frame.beat === 'shore.observe') return { title: t('{{name}}会停在哪里？', { name: objectName(object) }), body: t('先猜一猜，再让它轻轻进入水里。可以随时停下来，看看水面上下的部分。'), hint: t('这些物体分别取景，画面大小不代表真实尺寸一样大。') };
  if (frame.beat === 'shore.release') return { title: t('跟着它，看看水面以下'), body: t('进入水里的部分会把水让开。下沉和上浮的过程中，水都在向上托。'), hint: t('下一段把这个空间换回水，就能看清托力有多大。') };
  return frame.hydro.floating
    ? { title: t('{{name}}停在水面上', { name: objectName(object) }), body: t('停稳时，水向上托的力，正好抵住物体向下的重量。'), hint: t('继续看“水托住水”：这里原来那份水有多重？') }
    : { title: t('沉到底，也一直有浮力'), body: t('水的托力还不够抵住它的重量。碰到底部后，底面再一起托住它。'), hint: t('下沉不等于没有浮力。下一段比较物体与同形水的重量。') };
}
