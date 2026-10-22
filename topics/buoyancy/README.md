> Reader 入口为 `reader.html`、专题控制器 `main.ts` 与双语 `entry.*.md`；独立站点外壳已移除，以下科学模型、素材与观察边界继续适用。

# 水为什么能托住小船？

从一块木头、一团橡皮泥开始，亲眼看看水向上托的力。

面向 4–6 岁，由儿童与成人共同操作。`reader.html` 是演示片段；专题内的 TypeScript、SVG、翻译和样式由本目录维护，导航、界面和预览由 Wiki Reader 提供。

页面提供原生按钮、选择框及可用方向键操作的进度/条件控件。无自动音频或后台播放。儿童讲解随当前条件变化；折叠的家长说明保留科学范围、教学简化和一手来源。

请从生产构建预览中检查中文与英文、直接进入、返回目录及窄屏交互。浮力测试覆盖受力平衡、改形、超载、盐水和浸深。

## 2026-10-22：从物品到水压、再到载货小船

本次问题链依次是：谁会浮起来 → 水怎样从各方向挤压 → 同一团泥改形成船 → 加货物后船沿还有多少余量 → 全浸没后再放低、再换海水。水压视图是当前实验的观察方式，不会新建物品或清空载荷。直接换实验时仍保留各实验条件；把船主动捏回实心球会像原来一样明确卸下货物。

- 核心问题：浮力怎样由表面压力差产生，为什么形状、载荷与液体条件会改变浮沉？
- 可变条件：四种物品；同一 600 g 泥的实心/空心形状；0–12 块 100 g 货物；900–1800 mL 船沿容量；淡水/海水；悬线方块 0–150% 示意浸深。视图、讲解层次和受力标注只改变观察。
- 可观察结果：物体与水面的接触、局部压力的方向/相对大小、净浮力、张力/箱底支持力、排水量、吃水与进水状态。
- 因果：在均匀静水中，局部表压随深度增加，压力垂直向内；同深度的左右贡献相抵，上下差留下净浮力。全浸没后继续降低，局部压强一起上升，净浮力基本不变。
- 防误解：蓝色局部箭头不都向上；绿色浮力不是所有压力图标的可测数值积分；改形不减质量，量杯不取走水，船沿余量不是实际安全载荷。
- 边界与来源：剖面、器皿与网格不作长度/面积/体积标定。数值仍来自原静水停稳模型；不求解流体、倾覆、进水速率或材料力学。触底模型假定水可进入底面，不求解密封接触。

默认画面让完整水箱与当前物体占据主区域，量杯仅在“排水对照”出现。弧形玻璃缸、接触线、玻璃厚边与桌面阴影帮助辨认空间。木料保留顺纹和端面的方向，石块使用确定性不规则轮廓，金属保留倒角反光，空心泥船保留连续船壳、圆润船沿和可见空腔，货物以两列两排的层次摆放。自动观察船形时，镜头随同一保留改形进度逐渐抬高，露出内船底与货物；主动拖转后保留读者的视角。货物保持接触内船底，不为显露而悬空或移出船壳。材质和镜头变化不改变物理读数。

`framing.ts` 拥有按真实可用视口拟合的正交投影；SVG 标注与 GPU 相机共享同一像素映射，桌面不再沿固定宽高比撑高并裁切。`pressure.ts` 拥有无时钟的剖面轮廓与局部压力采样，显式区分 SI 压强公式和未作计量的图形深度；`pressureView.ts` 只把当前物体/载荷/液体/浸深投成可读的 SVG。`scene.ts` 继续统一有限过渡与停稳状态；更换观察方式不启动第二时钟，也不重启进行中的改形。改形中途切换视图、调整标注、缩放窗口或触发 GPU 回退时，都显式保留当前开口进度，避免先跳到完整船形、下一帧再跳回。隐藏页面、减少动态偏好与快速改参数都以最新状态停稳；GPU 不可用或上下文丢失时，三个观察方式仍有 SVG 表达。

The five questions connect specimen comparison, inward pressure, the same clay reshaped into a hull, cargo and rim capacity, and deeper immersion in fresh water or seawater. Lenses retain the current physical settings and an in-progress clay opening. The camera rises with that same opening to reveal cargo resting on the inner floor; object comparison retains its original angle. Resizing and changing annotations preserve the partial hull rather than briefly snapping to its target form. Blue arrows encode local inward pressure; the green force and readings come from the unchanged equilibrium model. The hull, pressure section and vessel geometry are illustrative, so displayed arrow lengths or mesh areas are not a pressure-force integration. Floor contact assumes water can reach beneath the object and does not model a seal. A fully immersed rigid object in uniform water experiences higher pressure deeper down while its net buoyancy stays nearly unchanged.

依据：[OpenStax 14.1：流体、密度与压强](https://openstax.org/books/university-physics-volume-1/pages/14-1-fluids-density-and-pressure)、[OpenStax 14.4：阿基米德原理与浮力](https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy)。前者支持密度、压强与表面力定义，后者支持法线方向、上下压力差、排水关系与改形对照。均在本次修改中核对。

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

水箱、量杯和物品使用同一相机、光照和桌面，可拖转或切换斜看、正面、俯看；重置恢复当前实验的自动观察角度。普通滚轮用于页面滚动，双指或带 Ctrl/Meta 的滚轮用于缩放。微不对称、略向外展开的玻璃缸和水体共用同一轮廓函数；木料、鹅卵石、六角钢块与泥团保留不同形体。玻璃有厚底与缸口，木块区分顺纹和端面，橡皮泥保留细颗粒、圆润船沿与空腔。细小货物标注各自的 100 g；质量、排水量和受力继续由原静水模型计算。量杯水面使用线性示意刻度，水箱水位升幅仍有意放大。网格外形、器皿尺寸和材质纹理不能用于反算实际体积或密度。

`tankScene.ts` 拥有 Three.js 场景、投影及资源释放；`labGeometry.ts` 拥有容器/水边界与样品几何，`specimenMaterials.ts` 拥有材料表面，`waterOptics.ts` 拥有水的实时光学近似，`labNavigation.ts` 拥有观察手势与预设。`scene.ts` 保持有限过渡、停稳状态、受力标注和 SVG 回退。船壳顶点原位更新，水面改形时释放上一份几何。最多显示 12 块货物，不设独立循环。无 WebGL 或上下文丢失时回退到可读的 SVG，离开条目时释放观察器、控制器、纹理、几何和渲染器。

The tank, measuring vessel and samples share a camera, lighting and tabletop. Dragging and three presets change observation without resetting the experiment; reset restores its automatic angle. The curved, slightly asymmetric glass and water share one contour function. Timber, a pebble, a hexagonal steel sample and clay retain distinct geometry. Glass thickness, end grain, a rounded clay rim and a hollow interior clarify material and spatial continuity. Each cargo block represents 100 g. All readings still come from the unchanged equilibrium model, not mesh volume. The comparison vessel uses a linear illustrative scale; the tank's water rise is deliberately enlarged. Mesh dimensions and textures are not calibrated physical measurements.

The GPU view has no separate animation clock. It receives the finite transition frame from `scene.ts`, then renders only for transitions, observation changes, resize or newly available material images. Textures are bounded and reused; replaced water geometry is disposed. A readable SVG view remains available when WebGL is unavailable or its context is lost. The scene does not solve fluid motion, material deformation or capsizing.

### 真实实验参考与光学边界 · 2026-10-22

本轮实际查看了 [Arbor Scientific 浮木实拍](https://www.arborsci.com/blogs/cool/6-experiments-fluid-dynamics)、[Evan Wallace 可交互水体](https://www.madebyevan.com/webgl-water/) 和 [Three.js 玻璃透射示例](https://threejs.org/examples/webgl_materials_physical_transmission.html)。画面采用自然光下桌面实验的方向：清澈的玻璃中央、能读出厚度的缸口、随视角改变的环境反射、细木纹及清楚的水线。参考网页中的实验照片和示例画面不作为项目纹理使用。

水使用 Three.js 透射材质和屏幕取样的折射近似，光学折射率取 1.333；有限扰动改变法线，停稳后恢复平静。玻璃外壁随后叠加同一环境的反射，透明厚底直接贴合桌面，不另设不透明底托。缸壁与物体旁的细小弧面用于提示水的接触，水色用于辨认水体；它们不是毛细高度或吸收率的测量。当前没有求解多层玻璃/水的嵌套光线追踪、焦散或流体动力学，光学厚度也不是可测水深；渲染外观不进入浮力计算。

木料使用 [Poly Haven 的 CC0 实拍纹理](https://polyhaven.com/a/wood_table_001)，颜色、凹凸与粗糙度三张本地 WebP 共 217,256 字节。来源、处理与校验值见 [素材记录](assets/PROVENANCE.md)。三张图全部就绪后才切换材料，加载失败保留程序纹理，离开场景后不会继续回写。纹理不提供木种、质量或密度依据，运行时不请求外站。

The art reference is a naturally lit tabletop experiment, based on the actual photographs and interactive examples linked above. Their demonstration images are not reused as project textures. Water uses Three.js transmission and a screen-sampled refraction approximation with optical IOR 1.333. The finite disturbance changes surface normals, which become calm at rest; an outer glass reflection coat uses the same lighting environment. The transparent base rests directly on the table without an opaque plinth. Small curved contact surfaces and the water tint aid recognition; they are not measurements of capillary height or absorption. This is not nested glass/water ray tracing, a caustics solver or fluid dynamics, and optical thickness is not a calibrated water-depth measurement. These appearance choices do not enter the buoyancy calculation.

Timber uses the CC0 photographed Poly Haven asset linked above. Three local WebP colour, height and roughness maps total 217,256 bytes; provenance, preparation and hashes are recorded in `assets/PROVENANCE.md`. The material switches only when all three images are ready, retains procedural timber on loading failure and rejects late callbacks after disposal. Textures do not establish wood species, mass or density, and the runtime makes no external asset requests.

### 早期清晰度与材料细化记录 · 2026-10-20

以下记录描述当时的程序材质版本；当前实现以上述 2026-10-22 更新为准，旧画面不作为新版本的美术验收。

局部实验不使用距离雾；浅色背景与接触阴影分开处理，避免整幅画面被灰底和叠加透明度压平。玻璃中心接近透明，掠射方向保留反光；水体用克制的蓝色深浅和接触线说明水面。它们是读图线索，不是测得的吸收率或折射求解。

木块六个面采样同一木料纹理场，端面年轮、顺纹、细孔和粗糙度有连续方向；颜色贴图与表面高度/粗糙度数据分开处理。水线附近的色泽变化只提示表面受水位置，不改变木块质量或引入吸水模型。船身与船沿共用连续网格，使用细微的不对称曲率和表面颗粒，保留同一团泥的有限改形过渡。

The local lab has no distance fog. A light background, contact shadows, nearly clear glass centers and stronger grazing reflections preserve separation. Water uses restrained depth tint and contact lines as illustrative optical cues; absorption and refraction are not solved. All six timber faces sample one continuous grain field, with separate color and surface-data maps. Wet surface appearance does not change mass or model water absorption. A single continuous clay mesh joins the hull and rounded rim, with small shape variations and fine grain. The original equilibrium readings, controls and finite transition clock are unchanged.

## Presentation layout

The topic selects its existing scene and controls for the shared viewport-fitted presentation frame. At desktop widths the scene and primary playback stay together, with independently scrollable explanation/settings; immersion can hide and reopen that panel without remounting the experiment. Narrow screens retain normal document flow. Scientific state and geometry remain topic-owned.

## Suspended immersion / 悬线浸深 · 2026-10-01

浸深实验的 1200 g 方块由悬线缓缓放低，不是向下压。模型将绳张力和触底支持力分别归属到实际施力对象；受力箭头统一为 8 示意长度单位/N，显示停稳状态下 `T + F浮 = W`。浸入增加，浮力增大、张力减小；完全浸没后继续降低，两者基本不变。淡水和海水中悬线均保持绷紧。本实验不计算放线或运动中的加速度。

The heavier-than-water block is lowered on a taut cord. Cord tension and tank-floor support are distinct model outputs. All force arrows share one scale and show settled balance, not transition dynamics. Children compare both upward forces; academic readings report their sum and weight. [OpenStax's buoyancy and apparent-weight explanation](https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy) was checked for this relation.
