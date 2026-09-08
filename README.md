# 小小百科 · Little Encyclopedia

[English](README.en.md)

一个中英双语的小科普演示集锦，用可以动手探索的页面解释科学现象。每个专题围绕一个小问题展开，配上动画、讲解和参考资料，适合孩子与家长一起观察，也欢迎任何好奇的人。

从宇宙与地球开始，逐步加入自然、生命、物理和工程等主题。

![太阳系演示：八大行星按同一直径尺度排列](docs/images/solar-system.png)

## 现有演示

- [恒星路过黑洞](topics/black-hole/)：换一条路线，观察恒星的不同遭遇。
- [太阳系八大行星](topics/solar-system/)：观察公转，比较行星大小。
- [白天黑夜与四季](topics/earth-seasons/)：探索地球自转与地轴倾角的作用。

页面右上角可切换中文与 English，也支持 `?lang=zh-CN`、`?lang=en` 分享链接。首次访问参考浏览器语言，手动选择会保存在本机；切换语言会重新打开当前专题，动画从头开始。

## 本地开发

需要 Node.js 22.12 或更新版本。

```sh
npm ci
npm run dev
```

打开终端提示的本地地址。`npm run check` 运行测试、严格类型检查、翻译覆盖检查与生产构建；`npm run preview` 预览可静态托管的 `dist/`。

使用 **TypeScript + Vite + Three.js + i18next**，依赖由 npm 与锁文件管理。每个专题独立打包，首页不加载三维引擎。新增演示与翻译维护见 [开发说明](docs/architecture.md)。
