# 案例-位移贴图

> displacementMap：用贴图明暗**真正移动顶点**，做出凹凸不平的表面

## 效果
高细分球体（256×160 段，约 4.1 万顶点）套砖墙位移贴图：亮处顶点外鼓、暗处内凹，
表面凹凸不平，**连轮廓都变形了**。

## 知识点
- `displacementMap` + `displacementScale`（强度）+ `displacementBias`（整体偏移）。
- 与 bumpMap/normalMap 的本质区别：位移**真的改几何形状**（轮廓会变）；bump/normal 只改光照。
- **关键坑：位移只能推动已有顶点**。几何体分段数必须够大，否则毫无效果。
  demo 有"线框模式"开关，可以直观看到顶点被推成什么样。
- 位移贴图是几何数据，保持线性（不要设 sRGB）。

## 运行
Live Server 打开 `案例源码/index.html`。带 AxesHelper 坐标辅助。
