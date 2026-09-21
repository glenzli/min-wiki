# 水为什么能托住小船？

从一块木头、一团橡皮泥开始，亲眼看看水向上托的力。

面向 4–6 岁，由儿童与成人共同操作。`index.html` 与专题内的 TypeScript、SVG、翻译和样式构成独立页面；共用平台只负责导航、语言及阅读主题。

页面提供原生按钮、选择框及可用方向键操作的进度/条件控件。无自动音频或后台播放。儿童讲解随当前条件变化；折叠的家长说明保留科学范围、教学简化和一手来源。

请从生产构建预览中检查中文与英文、直接进入、返回目录及窄屏交互。浮力测试覆盖受力平衡、改形、超载、盐水和浸深。

## 同一团橡皮泥的载货挑战

- 核心问题：质量没变，改变船壳围出的空间，能否托住相同货物？
- 条件：600 g 橡皮泥，0–12 块各 100 g 的货物；进水前排水容积 900–1800 mL。
- 结果：改变船宽的示意、吃水、进水/漂浮状态、排开水的质量和进水前载重余量。
- 因果：最大排水量改变了进水前可支撑的总质量；已经漂浮时，浮力仍等于重量。
- 防误解：宽船没有凭空多出橡皮泥；示意船壳变薄。不把船宽单独当作真实适航指标。
- 边界：模型只研究直立船壳的静水承载，不求解倾覆、壳体强度或进水瞬态。

The same 600 g clay sample and cargo are preserved when changing hull capacity. The challenge
loads four blocks into a 900 mL hull; widening it can change the result from flooded to floating.
The fixed hull-capacity model is extended, not replaced by a new dynamics solver. Hull geometry
and water-level motion remain illustrative. A settled floating boat displaces its total mass
in water; the reserve is a theoretical mass margin to the rim, not a real safe load rating.
Reshaping into a ball explicitly removes cargo as before; switching views or focus mode does not.
