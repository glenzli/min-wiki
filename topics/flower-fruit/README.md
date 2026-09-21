# 花为什么会变成果实？

已收归 `seed-sprouting/?chapter=reproduction`。旧入口保留，`main.ts` 使用主专题 `plantDestination` 与共享 `languageHref` 做精确迁移；原生实验由 `study.ts` / `study.html` 拥有，并被主专题挂载，不再运行独立旧页面。樱桃是与菜豆、蒲公英/牛蒡并列的比较物种，不是同一植物的后续变化。

Integrated into `seed-sprouting/?chapter=reproduction`. `study.ts` owns the retained native scene, controls, camera and finite playback, with explicit pause/dispose. The main topic owns page-level visibility/lifetime. Compatible and incompatible cases keep separate progress; switches do not silently turn a developed fruit back into a flower.

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
