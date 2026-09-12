# Cover artwork review — 2026-09-12

## Scope

The two coordinated local tasks replaced 28 simplified topic covers with individual built-in imagegen illustrations. Three earlier covers were separately reworked after visual review: leaf colors, rainbow, and stellar tidal disruption. All 42 published topics now have a raster cover. Existing SVG and earlier JPEG versions remain available.

The catalog now displays normal and mobile artwork at 3:2, matching the 1200 × 800 new assets and preserving the full composition. Single-result desktop cards also retain this ratio. Image decoding is asynchronous; native lazy loading remains enabled. The newest available version is selected in the order `cover-v3.jpg`, `cover-v2.jpg`, then `cover.svg`.

## Art direction and review

- Botanical covers emphasize natural leaf edges, veins, scale variation, soft light, and a readable focal subject. The leaf cover removes the competing waterfall and sun.
- Weather and landscape covers use cloud volume, atmospheric depth, irregular terrain, and restrained color. The rainbow is a full single circular arc with softer color and an unevenly visible rain curtain.
- Everyday objects have recognizable materials, contact shadows, reflections, and clear separation at thumbnail scale.
- The stellar-disruption cover shows an elongated stellar remnant and continuous gas flow, distinct from the intact donor star in the companion-binary topic.
- These are illustrative editorial images. They are not documentary photographs, quantitative figures, or screenshots of the simulations. Scientific processes and qualifications remain in the interactive topic pages.

## Assets and prompts

Every new topic cover is saved at `topics/<id>/cover-v2.jpg`; the complete imagegen prompt, source output path and review are in its sibling `COVER.md`. The three revisions are:

- [Leaf colors image](../topics/leaf-colors/cover-v3.jpg) · [full prompt](../topics/leaf-colors/COVER-v3.md)
- [Rainbow image](../topics/rainbow/cover-v3.jpg) · [full prompt](../topics/rainbow/COVER-v3.md)
- [Stellar disruption image](../topics/black-hole/cover-v3.jpg) · [full prompt](../topics/black-hole/COVER-v3.md)

All requested project images were generated with the built-in imagegen tool and copied into the workspace. No external image API fallback was used. JPEG resizing and compression use macOS sips.

## Validation

- Catalog tests: 5 passed.
- Desktop development preview: 3:2 artwork in category grids and the single-result layout; v3 selection verified.
- English mobile preview at 390 pixels: artwork measures 348 × 232 pixels; document scroll width equals viewport width. Leaf, mimosa and hydrangea cover subjects remain visible.
- `npm run build`: passed (strict TypeScript, 4,113 source messages / 43 English namespaces, Vite build). Log: `/tmp/mini-wiki-cover-final-build.log`.
- Packaged preview at `http://127.0.0.1:4173/`: load-more displays 42 cards; all 42 images loaded successfully, no SVG fallback, no failed images, no browser errors or warnings.
- Packaged Chinese desktop and English 390px layouts checked. Image ratio is 1.5; document width equals viewport width.
- The previous 123 model-test results are reused because topic model/scene source did not change during this artwork pass. The changed catalog tests were rerun separately.
- Combined selected-image and catalog-source SHA-256: `c64b9ae989ba934a56b4380605ace15995042d3d99692844fe6122ceb53c0d95`.

No commit, push or external deployment is part of this change.


## Selected asset inventory

| Topic | Saved image | Provenance and prompt | Bytes |
| --- | --- | --- | ---: |
| 恒星路过黑洞 | [cover-v3.jpg](../topics/black-hole/cover-v3.jpg) | [COVER-v3.md](../topics/black-hole/COVER-v3.md) | 210,481 |
| 太阳系八大行星运转与大小比较 | [cover-v2.jpg](../topics/solar-system/cover-v2.jpg) | [COVER.md](../topics/solar-system/COVER.md) | 249,476 |
| 为什么会有白天黑夜与四季更迭 | [cover-v2.jpg](../topics/earth-seasons/cover-v2.jpg) | [COVER.md](../topics/earth-seasons/COVER.md) | 339,148 |
| 彩虹是怎么诞生的 | [cover-v3.jpg](../topics/rainbow/cover-v3.jpg) | [COVER-v3.md](../topics/rainbow/COVER-v3.md) | 313,951 |
| 黑洞与伴星 | [cover-v2.jpg](../topics/galactic-center/cover-v2.jpg) | [COVER.md](../topics/galactic-center/COVER.md) | 361,828 |
| 行星遇到黑洞 | [cover-v2.jpg](../topics/planet-black-hole/cover-v2.jpg) | [COVER.md](../topics/planet-black-hole/COVER.md) | 371,619 |
| 叶子的颜色 | [cover-v3.jpg](../topics/leaf-colors/cover-v3.jpg) | [COVER-v3.md](../topics/leaf-colors/COVER-v3.md) | 239,389 |
| 地球和月亮 | [cover-v2.jpg](../topics/earth-moon/cover-v2.jpg) | [COVER.md](../topics/earth-moon/COVER.md) | 443,187 |
| 土星和它的卫星们 | [cover-v2.jpg](../topics/saturn-moons/cover-v2.jpg) | [COVER.md](../topics/saturn-moons/COVER.md) | 215,870 |
| 月球上的陨石坑 | [cover-v2.jpg](../topics/lunar-craters/cover-v2.jpg) | [COVER.md](../topics/lunar-craters/COVER.md) | 574,801 |
| 火山为什么会喷发 | [cover-v2.jpg](../topics/volcano-eruption/cover-v2.jpg) | [COVER.md](../topics/volcano-eruption/COVER.md) | 335,265 |
| 火山湖是怎样形成的 | [cover-v2.jpg](../topics/volcanic-lakes/cover-v2.jpg) | [COVER.md](../topics/volcanic-lakes/COVER.md) | 412,346 |
| 台风是怎样形成的 | [cover-v2.jpg](../topics/typhoon/cover-v2.jpg) | [COVER.md](../topics/typhoon/COVER.md) | 481,375 |
| 龙卷风是怎样形成的 | [cover-v2.jpg](../topics/tornado/cover-v2.jpg) | [COVER.md](../topics/tornado/COVER.md) | 341,598 |
| 行星的表面是什么样的 | [cover-v2.jpg](../topics/planet-surfaces/cover-v2.jpg) | [COVER.md](../topics/planet-surfaces/COVER.md) | 248,878 |
| 含羞草为什么会合拢？ | [cover-v2.jpg](../topics/mimosa/cover-v2.jpg) | [COVER.md](../topics/mimosa/COVER.md) | 347,304 |
| 绣球花为什么有不同颜色？ | [cover-v2.jpg](../topics/hydrangea/cover-v2.jpg) | [COVER.md](../topics/hydrangea/COVER.md) | 439,640 |
| 雨是怎样形成的 | [cover-v2.jpg](../topics/rain-formation/cover-v2.jpg) | [COVER.md](../topics/rain-formation/COVER.md) | 441,166 |
| 闪电和雷声是怎样形成的 | [cover-v2.jpg](../topics/lightning-thunder/cover-v2.jpg) | [COVER.md](../topics/lightning-thunder/COVER.md) | 342,910 |
| 水为什么能托住小船？ | [cover-v2.jpg](../topics/buoyancy/cover-v2.jpg) | [COVER.md](../topics/buoyancy/COVER.md) | 283,743 |
| 影子为什么变长变短？ | [cover-v2.jpg](../topics/shadows/cover-v2.jpg) | [COVER.md](../topics/shadows/COVER.md) | 204,966 |
| 冰变成水，水又去哪儿了？ | [cover-v2.jpg](../topics/water-states/cover-v2.jpg) | [COVER.md](../topics/water-states/COVER.md) | 312,030 |
| 磁铁会吸住什么？ | [cover-v2.jpg](../topics/magnets/cover-v2.jpg) | [COVER.md](../topics/magnets/COVER.md) | 340,235 |
| 声音是怎样出来的？ | [cover-v2.jpg](../topics/sound-vibrations/cover-v2.jpg) | [COVER.md](../topics/sound-vibrations/COVER.md) | 347,976 |
| 滑出去的玩具为什么会停？ | [cover-v2.jpg](../topics/friction/cover-v2.jpg) | [COVER.md](../topics/friction/COVER.md) | 366,806 |
| 毛毛虫怎样变成蝴蝶？ | [cover-v2.jpg](../topics/butterfly-life/cover-v2.jpg) | [COVER.md](../topics/butterfly-life/COVER.md) | 360,831 |
| 蝌蚪怎样变成青蛙？ | [cover-v2.jpg](../topics/frog-life/cover-v2.jpg) | [COVER.md](../topics/frog-life/COVER.md) | 375,465 |
| 蚂蚁为什么排着队走？ | [cover-v2.jpg](../topics/ant-trails/cover-v2.jpg) | [COVER.md](../topics/ant-trails/COVER.md) | 346,134 |
| 鱼在水里怎样呼吸？ | [cover-v2.jpg](../topics/fish-gills/cover-v2.jpg) | [COVER.md](../topics/fish-gills/COVER.md) | 318,558 |
| 鸭子的脚为什么像船桨？ | [cover-v2.jpg](../topics/duck-feet/cover-v2.jpg) | [COVER.md](../topics/duck-feet/COVER.md) | 365,709 |
| 谁藏在树叶和树枝里？ | [cover-v2.jpg](../topics/camouflage/cover-v2.jpg) | [COVER.md](../topics/camouflage/COVER.md) | 331,196 |
| 一粒豆子怎样发芽？ | [cover-v2.jpg](../topics/seed-sprouting/cover-v2.jpg) | [COVER.md](../topics/seed-sprouting/COVER.md) | 462,546 |
| 种子怎样去远方？ | [cover-v2.jpg](../topics/seed-travel/cover-v2.jpg) | [COVER.md](../topics/seed-travel/COVER.md) | 283,539 |
| 根喝到的水怎样到叶子里？ | [cover-v2.jpg](../topics/plant-water/cover-v2.jpg) | [COVER.md](../topics/plant-water/COVER.md) | 483,695 |
| 花为什么会变成果实？ | [cover-v2.jpg](../topics/flower-fruit/cover-v2.jpg) | [COVER.md](../topics/flower-fruit/COVER.md) | 324,155 |
| 仙人掌怎样留住水？ | [cover-v2.jpg](../topics/cactus-water/cover-v2.jpg) | [COVER.md](../topics/cactus-water/COVER.md) | 421,315 |
| 一滴水的旅行 | [cover-v2.jpg](../topics/rain-cycle/cover-v2.jpg) | [COVER.md](../topics/rain-cycle/COVER.md) | 467,853 |
| 小河为什么弯弯曲曲？ | [cover-v2.jpg](../topics/river-paths/cover-v2.jpg) | [COVER.md](../topics/river-paths/COVER.md) | 642,950 |
| 沙滩上的沙子从哪里来？ | [cover-v2.jpg](../topics/sand-journey/cover-v2.jpg) | [COVER.md](../topics/sand-journey/COVER.md) | 382,721 |
| 雨水落到地上以后呢？ | [cover-v2.jpg](../topics/ground-water/cover-v2.jpg) | [COVER.md](../topics/ground-water/COVER.md) | 555,677 |
| 太阳也是一颗星星吗？ | [cover-v2.jpg](../topics/sun-star/cover-v2.jpg) | [COVER.md](../topics/sun-star/COVER.md) | 311,411 |
| 流星是星星掉下来了吗？ | [cover-v2.jpg](../topics/meteors/cover-v2.jpg) | [COVER.md](../topics/meteors/COVER.md) | 219,060 |
