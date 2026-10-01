# Saturn satellite compatibility route

The standalone catalog entry has been folded into the solar-system explorer. `entry.ts` redirects old URLs to `/topics/solar-system/?body=saturn&view=moons`, preserving Chinese or English. `model.ts` still supplies the selected satellite dataset to the integrated explorer; legacy scene/controller files are not loaded by this route.

独立入口已并入太阳系探索室。旧链接跳转到土星卫星视图并保留语言；卫星数据继续共用，旧页面渲染器不再加载。

`learning.json` is still read by `scripts/export-narration.mjs`, which exports every published entry, including compatibility children. The shared learning loader can resolve it, but this redirect does not mount it and the Solar System page mounts its own notes. The retained bilingual scripts therefore refer to the integrated member selection, orbital-period and diameter readouts. Distinctive atmospheres, oceans and plumes are spacecraft discoveries described in text; current spheres do not offer those close-ups or a common true-scale moon-size workbench.

旧教学文件仍进入所有已发布专题的口播与分镜导出；重定向页面不挂载它，太阳系页面加载自己的教学说明。保留稿件已按现有成员选择、周期与直径读数修订，区分探测器发现和当前简化图示，不再要求尚未实现的表面或喷流近观、共同真实比例大小工作台。
