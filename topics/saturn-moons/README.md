# Saturn satellite compatibility route

The standalone catalog entry has been folded into the solar-system explorer. `entry.ts` redirects old URLs to `/topics/solar-system/?body=saturn&view=moons`, preserving Chinese or English. `model.ts` still supplies the selected satellite dataset to the integrated explorer; legacy scene/controller files are not loaded by this route.

独立入口已并入太阳系探索室。旧链接跳转到土星卫星视图并保留语言；卫星数据继续共用，旧页面渲染器不再加载。
