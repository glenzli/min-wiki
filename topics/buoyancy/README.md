> Reader 入口为 `reader.html`、专题控制器 `main.ts` 与双语 `entry.*.md`；独立站点外壳已移除，以下科学模型、素材与观察边界继续适用。

# 水为什么能托住小船？

从一块木头、一团橡皮泥开始，亲眼看看水向上托的力。

面向 4–6 岁，由儿童与成人共同操作。`reader.html` 是演示片段；专题内的 TypeScript、SVG、翻译和样式由本目录维护，导航、界面和预览由 Wiki Reader 提供。

页面提供原生按钮、选择框及可用方向键操作的进度/条件控件。无自动音频或后台播放。儿童讲解随当前条件变化；折叠的家长说明保留科学范围、教学简化和一手来源。

请从生产构建预览中检查中文与英文、直接进入、返回目录及窄屏交互。浮力测试覆盖受力平衡、改形、超载、盐水和浸深。

## 同一团橡皮泥的载货挑战

- 核心问题：质量没变，改变船壳围出的空间，能否托住相同货物？
- 条件：600 g 橡皮泥，0–12 块各 100 g 的货物；进水前排水容积 900–1800 mL。
- 结果：改变船宽的示意、吃水、进水/漂浮状态、排开水的质量和进水前载重余量。
- 演示：球与船在同一水箱中经过取出、压成空心、再放回的有限视觉过渡；同一条空箱水位参照线贯穿三种实验。水位升幅有意放大，数字仍来自停稳模型。
- 对照：四块货物挑战将窄船设为 900 mL；调宽时四块货物不变，图内船沿至水线的间隔和进水状态随条件更新。儿童版呈现结果与一句原因，学术版显示质量、排水量、船沿容积关系和适用前提。
- 因果：最大排水量改变了进水前可支撑的总质量；已经漂浮时，浮力仍等于重量。
- 防误解：宽船没有凭空多出橡皮泥；示意船壳变薄。不把船宽单独当作真实适航指标。
- 边界：模型只研究直立船壳的静水承载，不求解倾覆、壳体强度或进水瞬态。

The same 600 g clay sample and cargo are preserved when changing hull capacity. The challenge
loads four blocks into a 900 mL hull; widening it can change the result from flooded to floating.
The fixed hull-capacity model is extended, not replaced by a new dynamics solver. Hull geometry
and water-level motion remain illustrative. A settled floating boat displaces its total mass
in water; the reserve is a theoretical mass margin to the rim, not a real safe load rating.
Reshaping into a ball explicitly removes cargo as before; switching views or focus mode does not.
The animated clay outline is a continuity cue, not a mechanics solver or a timed account of molding. The rim marker uses the same illustrative cross-section as the waterline, while academic readings come from the settled-state displacement model.

## 材质与空间 / Material study

水箱、量杯和物品使用同一固定视角、光照和桌面：玻璃有厚底、杯口与接缝，木块区分顺纹和端面，橡皮泥保留细颗粒、圆润船沿与真实空腔。细小货物标注各自的 100 g；质量、排水量和受力继续由原静水模型计算。量杯水面使用线性示意刻度，水箱水位升幅仍有意放大。网格外形、器皿尺寸和材质纹理不能用于反算实际体积或密度。

`tankScene.ts` 只拥有 Three.js 场景、材质、投影及资源释放；`scene.ts` 保持有限过渡、停稳状态、受力标注和 SVG 回退。程序纹理生成一次；船壳顶点原位更新，水面改形时释放上一份几何。最多显示 12 块货物，不设独立循环。无 WebGL 或上下文丢失时回退到可读的 SVG，离开条目时释放观察器、纹理、几何和渲染器。

The tank, measuring vessel and samples share a fixed camera, lighting and tabletop. Glass thickness, end grain, a rounded clay rim and a hollow interior clarify material and spatial continuity. Each cargo block represents 100 g. All readings still come from the unchanged equilibrium model, not mesh volume. The comparison vessel uses a linear illustrative scale; the tank's water rise is deliberately enlarged. Mesh dimensions and textures are not calibrated physical measurements.

The GPU view has no separate animation clock. It receives the finite transition frame from `scene.ts`, then stops rendering at rest except on resize. Generated textures are bounded and reused; replaced water geometry is disposed. A readable SVG view remains available when WebGL is unavailable or its context is lost. The scene does not solve fluid motion, refraction, material deformation or capsizing.

### 清晰度与材料细化 · 2026-10-20

局部实验不使用距离雾；浅色背景与接触阴影分开处理，避免整幅画面被灰底和叠加透明度压平。玻璃中心接近透明，掠射方向保留反光；水体用克制的蓝色深浅和接触线说明水面。它们是读图线索，不是测得的吸收率或折射求解。

木块六个面采样同一木料纹理场，端面年轮、顺纹、细孔和粗糙度有连续方向；颜色贴图与表面高度/粗糙度数据分开处理。水线附近的色泽变化只提示表面受水位置，不改变木块质量或引入吸水模型。船身与船沿共用连续网格，使用细微的不对称曲率和表面颗粒，保留同一团泥的有限改形过渡。

The local lab has no distance fog. A light background, contact shadows, nearly clear glass centers and stronger grazing reflections preserve separation. Water uses restrained depth tint and contact lines as illustrative optical cues; absorption and refraction are not solved. All six timber faces sample one continuous grain field, with separate color and surface-data maps. Wet surface appearance does not change mass or model water absorption. A single continuous clay mesh joins the hull and rounded rim, with small shape variations and fine grain. The original equilibrium readings, controls and finite transition clock are unchanged.

## Presentation layout

The topic selects its existing scene and controls for the shared viewport-fitted presentation frame. At desktop widths the scene and primary playback stay together, with independently scrollable explanation/settings; immersion can hide and reopen that panel without remounting the experiment. Narrow screens retain normal document flow. Scientific state and geometry remain topic-owned.

## Suspended immersion / 悬线浸深 · 2026-10-01

浸深实验的 1200 g 方块由悬线缓缓放低，不是向下压。模型将绳张力和触底支持力分别归属到实际施力对象；受力箭头统一为 8 示意长度单位/N，显示停稳状态下 `T + F浮 = W`。浸入增加，浮力增大、张力减小；完全浸没后继续降低，两者基本不变。淡水和海水中悬线均保持绷紧。本实验不计算放线或运动中的加速度。

The heavier-than-water block is lowered on a taut cord. Cord tension and tank-floor support are distinct model outputs. All force arrows share one scale and show settled balance, not transition dynamics. Children compare both upward forces; academic readings report their sum and weight. [OpenStax's buoyancy and apparent-weight explanation](https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy) was checked for this relation.
