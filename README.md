# 小小百科 · Little Encyclopedia

[English](README.en.md)

一个中英双语的小科普演示集锦，用可以动手探索的页面解释科学现象。每个专题围绕一个小问题展开，配上动画、讲解和参考资料，适合孩子与家长一起观察，也欢迎任何好奇的人。

目前收录 49 个专题，涵盖宇宙与星空、地球与自然、生命与身体、物质与现象、科技与工程五类。

![太阳系演示：八大行星按同一直径尺度排列](docs/images/solar-system.png)

## 探索内容

首页支持分类筛选、关键词搜索和分页，每页最多 24 个演示，可直接点击相邻页。完整专题列表见 [内容目录](content/catalog.json)。

| 分类 | 数量 | 代表专题 |
| --- | ---: | --- |
| 宇宙与星空 | 10 | [恒星路过黑洞](topics/black-hole/)、[太阳系](topics/solar-system/)、[月球陨石坑](topics/lunar-craters/) |
| 地球与自然 | 11 | [四季](topics/earth-seasons/)、[雨的形成](topics/rain-formation/)、[水循环](topics/rain-cycle/) |
| 生命与身体 | 19 | [叶子的颜色](topics/leaf-colors/)、[蝌蚪变青蛙](topics/frog-life/)、[洗手](topics/handwashing/) |
| 物质与现象 | 7 | [彩虹](topics/rainbow/)、[浮力](topics/buoyancy/)、[磁铁](topics/magnets/)、[水的状态](topics/water-states/)、[声音](topics/sound-vibrations/) |
| 科技与工程 | 2 | [自来水](topics/tap-water/)、[乘车安全](topics/car-safety/) |

## 阅读与操作

- **儿童版**：用故事、观察问题和互动帮助孩子理解现象，适合亲子共读。
- **学术版**：补充原理、模型假设和资料，供家长及希望深入了解的读者使用。
- 演示提供各自适用的播放、暂停、进度拖动或条件比较；分子、天体等画面的尺度与简化在专题内说明。
- 支持浅色、深色和跟随内容的外观。目录、导航和控件采用与 glenzli.com 一致的中性色 UI，演示保留各自的科学配色。

页面右上角可切换中文与 English，也支持 `?lang=zh`、`?lang=en` 分享链接。首次访问参考浏览器语言，手动选择会保存在本机；切换语言会重新打开当前专题，动画从头开始。

## 本地开发

需要 Node.js 22.12 或更新版本。

```sh
npm ci
npm run dev
```

打开终端提示的本地地址。`npm run check` 运行测试、严格类型检查、翻译覆盖检查与生产构建；构建后运行 `npm run preview`，预览可静态托管的 `dist/`。修改源码后需重新构建，预览才会更新。

使用 **TypeScript + Vite + Three.js + i18next**，依赖由 npm 与锁文件管理。每个专题独立打包，首页不加载三维引擎。新增演示与翻译维护见 [开发说明](docs/architecture.md)。
