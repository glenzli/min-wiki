# 使用 Wiki Reader

百科的 71 条发布路由已全部交给独立 [Wiki Reader](https://github.com/glenzli/wiki-reader)，不再保留旧站构建入口。日常使用 `npm run dev`、`npm run check` 和 `npm run build`，输出为 `dist/`。

在 Codex 中可用 Wiki Reader 插件的 `$preview-wiki` 启动当前内容目录；插件自动选端口并复用自己的预览。命令行也可在工具仓库运行：

```sh
node bin/wiki-reader.js start /absolute/path/to/mini-wiki
node bin/wiki-reader.js status /absolute/path/to/mini-wiki
node bin/wiki-reader.js stop /absolute/path/to/mini-wiki
```

清单内的 `base` 为 `/encyclopedia/`。直接访问与语言参数保持同一个条目标识。原生演示的只读链接打开不加载专题模块的新文档；专注观察保留实例。旧子条目由原路由模型选择对应章节。

职责与写作流程见[架构](architecture.md)，切换范围与验证见[迁移记录](reader-migration.md)。早期 [Markdown Book 兼容性验证](reader-validation-20261018.md) 仅保留选型依据，不再包含另一套可启动的试验站点。宿主 glenzli 的同步、点赞和部署需要单独接入，本次任务只授权两个源仓库提交和推送。
