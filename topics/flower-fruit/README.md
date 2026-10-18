# 花为什么会变成果实？

已收归 `seed-sprouting/?chapter=reproduction`。旧入口保留，`main.ts` 使用主专题 `plantDestination` 与共享 `languageHref` 做精确迁移；原生实验由 `study.ts` / `study.html` 拥有，并被主专题挂载，不再运行独立旧页面。樱桃是与菜豆、蒲公英/牛蒡并列的比较物种，不是同一植物的后续变化。

Integrated into `seed-sprouting/?chapter=reproduction`. `study.ts` owns the retained native study, controls and camera; `growthScene.ts` owns its SVG organ updates, `model.ts` the morphology projection and pollination, and the parent journey supplies the finite `GrowthPlayback` clock, with explicit pause/dispose. The main topic owns page-level visibility/lifetime. Compatible and incompatible cases keep separate progress; switches do not silently turn a developed fruit back into a flower.

让蜜蜂把合适的花粉带到樱桃花上，再看花里面慢慢发生什么。

以樱桃核果为例：相容花粉落到柱头是授粉，花粉管生长后才可能完成受精。通常受精后的胚珠形成种子，子房壁形成果皮；核果的果皮分化为外果皮、肉质中果皮和坚硬内果皮。硬果核不等于种子。某些果实还包含其他花组织，也存在不经受精形成的无籽果实。

## 教学边界

相容分支假设后续条件也适宜、授粉受精成功；不相容分支的实际模型让花粉管在花柱内受阻，`fertilized=false`、`fruitDevelopment=0`，不会画出种子或果实。没有模拟温度、水分、花粉数量和品种差异；管的受阻长度是示意，不是测量。每次点击压缩了不同长度的真实生长时间。蜜蜂只运送花粉，不能直接制造果实。

## References

- [USDA Forest Service · Seed biology](https://www.fs.usda.gov/rm/pubs_series/wo/wo_ah727.pdf)
- [Kew · Pollination and seed dispersal](https://endeavour.kew.org/taster-resources/ks-2/pollination-and-seed-dispersal-infographics)

Interaction advances only on user input, with finite cancellable playback, no audio or workers. SVG labels and live observation text provide equivalent explanation. The integration removes old duplicate discovery cards/page chrome, retaining the fine-grained native model and controls.

A 24-second, user-started journey follows pollen from bee to stigma, then pollen-tube growth or incompatibility arrest. Only the compatible-success branch develops and ripens fruit. Grain identity remains continuous at contact and on the stigma after bee departure, including the blocked branch. Pause/scrub and reduced-motion steps preserve observation control; timing and fruit growth are not calibrated. Compatibility is necessary in the represented failure comparison, not sufficient for every real-world success. The model does not equate pollination with fertilization.

Added primary source: [Cornell / NYSHS · Sweet cherry pollination](https://nyshs.org/wp-content/uploads/2016/10/Sweet-Cherry-Pollination-Considerations-for-2001.pdf). Both language variants retain the same qualifications.

## Continuous flowering-to-fruit illustration · 2026-10-19

The same five petals curl and drop at staggered intervals; the whole flower is not faded out and replaced by another picture. A small ovary remains behind them and enlarges at one fixed stalk insertion. Its skin ripens continuously without a threshold color switch. In the cutaway, the ovule/seed keeps the same center while the ovary wall expands and the surrounding endocarp hardens. The hard stone and the seed remain distinct. The inset can still be enlarged without resetting progress.

不相容分支仍保留未受精子房和胚珠；花粉管受阻，不显示子房膨大、种子发育或内果皮硬化。本图只画一个示意胚珠，省略樱桃多个胚珠中可能发生的败育、组织分化与生长的复杂时间关系。花瓣脱落轨迹、硬化和变色节奏是压缩的教学编排，不计算风力、组织力学、激素、实际天数或品种颜色。成熟樱桃不保留夸张的绿色花萼。

Primary morphology reference: [University of Minnesota · Fruit morphology](https://open.lib.umn.edu/horticulture/chapter/8-1-fruit-morphology/): the ovule normally becomes the seed, the ovary wall becomes pericarp, and a drupe such as cherry has a hard endocarp surrounding its seed. Compatibility remains the separate, already sourced Cornell model contract.

The blocked case retains an unfertilized ovary and ovule without fruit enlargement, seed development or endocarp hardening. A single illustrative ovule omits the possible abortion of additional cherry ovules and the complexity of tissue differentiation. Petal fall, hardening and color changes use compressed authored timing; the illustration calculates neither wind forces, tissue mechanics, hormones, actual days nor cultivar-specific color. It does not retain a conspicuous green calyx on the ripe cherry.

## Bee flight and articulation · 2026-10-19

`beeMotion.ts` projects the current progress onto a curved approach, deceleration, a brief perch and a forward/upward departure. `model.ts` remains the canonical route and pollen-contact owner. Both pairs of fore/hind wings, abdomen, six jointed legs, pollen basket and antennae are retained SVG parts. Paired wings articulate together with a restrained translucent exposure envelope. On perching the wings fold and feet reach the flower; takeoff reopens the wings before forward flight. Body pitch preserves the tracked pollen site, which stays at the stigma after deposition.

The same finite progress clock drives articulation, small leaf flex and falling-petal flutter. Pause, scrub and chapter changes therefore freeze the whole observation; there are no separate ambient loops. Reduced motion suppresses exposure blur, antenna/abdomen oscillation and decorative leaf flex. The flight path, contact pose, inferred shading, vein detail and motion rhythm are authored illustration, not force calculations or measured kinematics.

蜜蜂的膜翅、绒毛、分节足与接触动作采用固定视角科学插画；翅脉是可辨认的简化纹理，不按翅室数量测绘。振翅以示意节奏配合透明残影表现，不把屏幕上的摆动频率称为真实频率，也不模拟升力、气流或翅钩接合的力学。停靠与离开的时长是教学编排；到达柱头仍只是授粉，相容花粉管随后才能帮助完成受精。

Motion reference: [Altshuler et al., PNAS (2005), honeybee wing strokes](https://pmc.ncbi.nlm.nih.gov/articles/PMC1312389/) describes rapid, short-amplitude honeybee wingbeats. This scene illustrates their visual impression; it does not replay the measured frequency or claim that its projected wing angles reconstruct the paper's kinematics.


## Reader 2D engine integration · 2026-10-19

`createBeeMotion()` uses the Reader's seek-only Anime.js timeline for a finite asymmetric wing stroke, sampled from the original topic time. `petalMotion.ts` interpolates authored compatible-topology curl poses with the same retained base; the scientific morphology still decides when each petal curls/drops. `growthScene.ts` owns these instances and disposes them with the study. The route, fixed pollen contact, compatibility arrest, fruit/seed identity, reduced-motion qualifications and single topic playback clock remain unchanged. This is illustration interpolation, not measured wing/tissue dynamics.
