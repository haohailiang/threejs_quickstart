# 案例-Phong材质

> MeshPhongMaterial：漫反射 + 镜面高光（Phong 光照模型）

## 效果
蓝色球体带白色高光斑，GUI 可实时调 `shininess`（高光锐度）和 `specular`（高光颜色），带阴影。

## 知识点
- `shininess`：高光锐度。越大 → 高光斑越小越锐（塑料/瓷器感）；越小 → 越散（哑光）。0 时接近 Lambert。
- `specular`：高光颜色。设为固有色 → 高光融入表面；白色 → 最像塑料。
- 高光位置由「光线反射方向」和「视线方向」共同决定。
- 与 Lambert 的区别：Lambert 只有漫反射没有高光。

## 运行
Live Server 打开 `案例源码/index.html`。带 AxesHelper 坐标辅助。
