# 毛毛虫怎样变成蝴蝶？

现归入 `frog-life` 的「变态发育：动物怎样长大」主线。本目录保留蝶的原始精细 `specimen.svg`、纯 `model.ts` 翼展开模型、`scene.ts` 根节点内渲染及模型测试；主控制器与并排比较归 `frog-life`。`main.ts` 将旧入口跳转到 `chapter=butterfly`，保留有效 stage、wing、peek、view、aspect、lang、部署 base 和 hash；目录片段声明 `parentTopic=frog-life`。不是把旧页面用 iframe 嵌入主入口。

这是蝴蝶完全变态的四阶段示意。插画不对应一种特定蝴蝶；不同种类的体形、食物和时间不同。蛹的透明视图是帮助理解的示意，并非真实透视；发育过程也并非缩小的完整蝴蝶躲在壳里。阶段按钮用于回看，不表示动物能倒着长大。

- [Florida Museum · Butterfly life cycle](https://www.floridamuseum.ufl.edu/discover-butterflies/faq/)

Original SVG illustrations; no external media or runtime dependencies. Controls use native buttons and ranges. Adult wing preparation is a finite, user-started 12-second observation with pause, scrubbing and preserved progress; reduced motion uses discrete observations. Whole/detail cameras share the same anatomy. No autoplay, flight simulation or audio. Wing expansion uses simplified geometry and is not an anatomical reconstruction.

The legacy URL now opens the butterfly chapter of the integrated frog-life metamorphosis journey. This directory remains the scientific/rendering owner of the butterfly specimen and wing model. Its retained scene is mounted once by the parent topic, with separate remembered wing/stage/view state. The parent controller handles chapter pausing, disposal and independent comparison; tests under frog-life exercise that real controller and route contract.

2026-09-21：`butterflyGrowth()` 统一连续成长的形态、透明度与附着点；`renderButterfly()` 接收连续进度，兼容原 stage/wing 调用。完整成长播放为 32 秒（时间压缩），从孵化到展翅可暂停或回退；共用一片寄主叶与保留的蛹壳，不再只切四张阶段图。蝴蝶翼新增裁剪内鳞片细纹；身体在展翅阶段保持原位。此处仍为通用插画，蜕皮与羽化交接有简化，不是特定物种的解剖或运动重建。主入口 README 记录科学来源及完整控制边界。
