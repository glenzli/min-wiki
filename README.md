# 小小百科 · Mini Wiki

一系列可以动手观察的双语科学条目。内容、模型和素材由本仓库维护，统一通过独立的 [Wiki Reader](https://github.com/glenzli/wiki-reader) 查看。

目前登记 71 条发布路由，目录展示 41 个主题；整合子条目与暂不收录的条目仍可直接访问。旧链接进入 Reader 中对应的章节，不再构建旧站。

## 本地使用

需要 Node.js 22.12 或更新版本。

```sh
npm ci
npm run dev
```

也可以在安装 Wiki Reader 插件后，在 Codex 中说“预览这个百科”，或调用 `$preview-wiki`。插件会选择可用端口、复用已有预览，并在 Codex 中打开真实地址。

```sh
npm run prepare:entries  # 修改 learning.json 后更新正文与解说导出
npm run check           # 内容、模型与 Reader 的完整门禁
npm run build           # 仅由 Reader 生成 dist/
```

日常启动和构建统一使用 Reader；`reader:*` 命令保留为明确的同义入口。需要使用另一个 Reader 检出版本时，可设置 `WIKI_READER_ROOT`。内容依赖仍在本仓库，渲染工具的源码属于独立项目。

## 条目维护

`wiki.json` 是唯一登记表。每个专题拥有 Markdown、学习数据、科学模型、场景、控件、素材与测试。原生演示片段为 `reader.html`，专题内部已有的 `study.html` 和 `panel.html` 保持各自职责。SVG、Canvas、WebGL 与后台计算可以按题目需要组合。

Markdown 标记区间由 `learning.json` 投影，外部可保留手写说明。静态说明、模型边界、资料与纯口播/分镜文本在没有演示脚本时仍可阅读。图片插画不作为测量或观测证据；各专题 README 保留素材来源、许可和科学条件。

开始修改前阅读 [设计原则](docs/design-principles.md)、[架构](docs/architecture.md) 与 [源码归属](SKELETON.md)。迁移和验证记录见 [Reader 切换说明](docs/reader-migration.md)。
