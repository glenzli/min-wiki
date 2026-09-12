# 恒星路过黑洞：第三版封面

## 文件与来源

- 项目图像：`topics/black-hole/cover-v3.jpg`。
- 生成方式：Codex 内置 `image_gen.imagegen`（工具调用名 `image_gen__imagegen`）；全新生成，没有输入参考图或编辑目标，没有使用 CLI/API fallback。
- 原始图像：`/Users/g4i/.codex/generated_images/01a0944b-7f2e-7d22-8f4a-818c1ef867c8/exec-43b225af-9edf-4cb0-acfc-735ebe4d6dad.png`，1536 × 1024 RGB PNG。
- 网页文件：1200 × 800 RGB JPEG，使用 macOS `sips` 等比缩小并以质量 85 保存。仅进行格式转换与缩小，没有生成后的内容修图。
- 原始图像保留；本文件与 `cover-v3.jpg` 是独立新版，不覆盖旧封面。

这是 AI 生成的天体物理概念插画，不是实拍、观测数据或本专题模拟的渲染截图。天体尺寸、空间距离、亮度、颜色、气流形态和黑洞暗影均作视觉示意，不能据此测量真实物理量。

## 主题依据

已核对本专题 `README.md` 中的“瓦解后回流”路线和模型边界，以及 `topics/galactic-center/README.md` 中持续伴星供给的不同主题。本图用明显拉长、松散的恒星残余和连续弯曲气流，区分旧封面中接近完整圆形伴星持续供给的视觉印象。

科学背景参考：[NASA — What Happens When Something Gets ‘Too Close’ to a Black Hole?](https://science.nasa.gov/universe/what-happens-when-something-gets-too-close-to-a-black-hole/)。该资料说明近距离潮汐作用可使恒星变形并形成气体流；封面只采用这一概念，不声称图中的全部结构对应某次真实事件。

## 完整生成提示词

```text
Use case: scientific-educational
Asset type: premium natural-science encyclopedia cover, no lettering.
Create one new horizontal 3:2 image, 1536 x 1024 pixels. Astrophysical concept art of a star undergoing tidal disruption during a close flyby of a black hole. This is a one-time disrupted star, visually distinct from an intact round companion continuously feeding a black hole.

Subject and composition: a clearly elongated, partly disintegrating stellar body occupies the upper-left-middle, its glowing gaseous surface stretched into a tapered spindle with a thick warm luminous remnant and progressively thinner streams. One continuous curved ribbon of stellar gas sweeps diagonally toward the lower-right-middle, bends around the black hole, and folds into an irregular returning arc of tenuous gas. Some faint gas extends away along the trajectory. The small but readable black-hole shadow sits within the curved return flow; it is only about one-tenth of the image width, surrounded by a restrained asymmetric luminous arc, not a huge ring or completed perfect disk. All major subjects fit within the central 75 percent of the composition with generous dark margins, readable at small thumbnail size and safe for 16:10 cropping.

Style: exquisite physically inspired astronomical illustration with convincing depth, transparent volumetric gas, fine uneven turbulent filaments, glowing diffuse edges, overlapping wisps, irregular density and natural variation at multiple scales. The star and the flow are gaseous throughout, not hard objects. Dramatic but restrained chiaroscuro, amber to pale ivory stellar material against very dark blue-black space, modest highlights preserving intricate detail, sparse tiny dim background stars, subtle optical bending near the shadow. Concentrate visual detail in the stellar remnant and continuous gas stream; let the empty background breathe.

Constraints: scientifically informed conceptual image, not a photograph or a plotted simulation; no implied scale accuracy. No intact spherical donor star, no solid rocky fragments, no planets, no fireball explosion, no straight suction tube, no laser jets, no symmetrical mechanical rings, no multiple identical concentric hoops, no bright spiral galaxy background, no oversaturated HDR, no blown-out white areas, no lens flare, no text, labels, arrows, grids, UI, border, logo, or watermark.
```

## 检查记录

- 已通过本地 `view_image` 检视原始 PNG 和最终 JPEG；最终 JPEG 中主体完整、无文字、箭头、网格、标志或水印。
- 恒星不是完整球体；主体连接细薄外流及弯回的气体，没有固体岩块或规则机械圆环。黑洞暗影小而可辨，气流为主要视觉线索。
- 对比旧封面：去掉主导全图的大型完整吸积盘及明亮银河背景，采用倾斜的气流构图、稀疏背景和不均匀发光结构。
- 1200 × 800 成图中，恒星残余、主要气流和黑洞位于画面内部。16:10 居中展示会轻微裁去上下背景及最外层暗淡气体，主要叙事主体保留；完整 3:2 展示可保留全部外围气体。
- 局部高光仍较亮，但气流边缘、暗部和主体纹理保留。尺寸及 RGB / 无 Alpha 属性已用 `sips` 核对。
- 本次只新增封面与生成说明；目录接入和页面展示由主任务处理，不修改物理模型。
