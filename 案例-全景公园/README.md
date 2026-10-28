# 案例-全景公园

> 对应课程：前端拉菲《Three.js零基础入门》P24「11--22.案例-全景公园」
> 手写复刻 demo，基于本项目的 three.js r148 本地文件包（无需联网）

## 效果

站在中式园林中央 360° 环顾四周：拖动鼠标转头、滚轮变焦、点击蓝色光点平滑转向景点。

## 运行

用 VSCode 的 Live Server 打开 `案例源码/index.html`（或任意本地静态服务），
直接双击打开会因 ES Module 的跨域限制而报错。

## 核心知识点

| 知识点 | 在哪里体现 |
| --- | --- |
| 全景图原理 | 一张 2:1 的等距柱状投影图（equirectangular）贴在**球体内壁**，相机固定在球心 |
| `THREE.BackSide` | 几何体法线默认朝外，从内部看必须设置 `side: BackSide`，否则什么都看不见（全景案例第一大坑） |
| `MeshBasicMaterial` | 全景图自带光照，用 Basic 材质，不要用 Lambert/Phong 再照一遍 |
| 球坐标 → 直角坐标 | `Vector3.setFromSphericalCoords()`，把「经度/纬度」换算成 `lookAt` 方向 |
| 相机 fov 与变焦 | 全景里不能"往前走"，等效做法是改 `camera.fov`（小=长焦放大，大=广角） |
| Raycaster 射线拾取 | 屏幕坐标 → NDC（y 要取反）→ `setFromCamera` → `intersectObjects` |
| Sprite 精灵 | 永远朝向相机的面片，适合做热点标记；`CanvasTexture` 现画贴图不依赖图片文件 |
| CSS2DRenderer | 把 HTML 元素按三维坐标投影到屏幕上做文字标签，注意 `pointerEvents: none` |
| 阻尼动画 | 每帧 `当前值 += (目标值 - 当前值) * 系数`，形成惯性手感 |
| sRGB 色彩空间 | r148 写法：`texture.encoding = THREE.sRGBEncoding` + `renderer.outputEncoding`（r152 后改名为 `colorSpace`） |

## 文件说明

```
案例源码/
├── index.html          页面骨架 + importmap + HUD/提示样式
├── index.js            场景/相机/拖拽转视角/滚轮变焦/射线拾取/gui
├── model.js            全景球体 + 景点光点（Sprite + CSS2D 标签），导出 group
└── chinese_garden.jpg  4096x2048 全景贴图
```

## 贴图来源

`chinese_garden.jpg` 来自 [Poly Haven](https://polyhaven.com/a/chinese_garden)，
CC0 公共领域许可，可自由使用；原图 8192x4096，已压缩到 4096x2048。

## 与原课程 demo 的差异

- 原课程贴图需向作者索取，这里改用免版权的 Poly Haven 全景图，内容就是"公园"，名副其实
- 在原课程「拖拽环顾」的基础上，额外加了：滚轮变焦、景点热点（点击平滑转向）、
  gui 参数面板、左下角实时视角 HUD
- 因为相机必须钉死在球心，OrbitControls（绕 target 公转）会退化，
  所以拖拽转视角是手写的（约 30 行），`index.js` 里有注释解释原因
