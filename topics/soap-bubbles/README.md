# 肥皂泡为什么是圆的？ / Why are soap bubbles round?

面向 4–6 岁的屏幕观察：固定空气体积的拉长/回圆比较，球面薄膜的上下排液，选中位置连续放大，两界面反射与三波长干涉对照。整体与切面读取同一局部厚度；儿童解释、学术层、三篇补充学术笔记与四段双语口播均在专题内。

The topic owns its Canvas renderer, finite interaction lifecycle, physical comparison model, narration, translations and cover. Public navigation, reading mode and learning presentation remain platform responsibilities.

## Model boundaries

- Constant-volume prolate ellipsoid comparison: a sphere minimizes area, but wind, contact and gravity can deform real bubbles.
- Drainage redistributes thickness by height on a fixed spherical film and preserves its area mean. This is a qualitative comparison, not a coupled flow/shape simulation; evaporation and rupture are omitted.
- The two-ray optical response includes a reflection phase reversal. Three representative wavelengths show dependence on thickness and incidence, without calibrated colorimetry or complete multiple reflection.
- Markers, film thickness, molecules, timing and optical paths are enlarged. No physical pulling experiment is required.

## Verification

`node --import tsx --test topics/soap-bubbles/tests/model.test.mjs` checks enclosed volume and minimum-area relaxation, nonnegative drainage with conserved spherical mean thickness, and correct cancellation/reinforcement limits of air–film–air reflection.

Check both languages, stretch/release, finite drainage playback/pause, upper/lower selection during zoom, and angle changes with light paths shown. Controls are native keyboard/touch controls; reduced motion resolves finite transitions immediately. Leaving/hiding stops animation work, and non-persisted page departure releases resize observers. Root integration owns catalog registration and the production build.

Sources: Exploratorium's original bubble explanations, Monier et al. (Physical Review Fluids 9, 124001), and Rice University/OpenStax thin-film optics. Exact links are in `index.html` and `learning.json`.
