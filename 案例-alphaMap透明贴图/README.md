# 案例-alphaMap透明贴图

> 对应课件：前端拉菲《Three.js零基础入门》「基础网格材质 - 透明度贴图」
> 手写复刻 demo，基于本项目的 three.js r148 本地文件包（无需联网）

## 效果

贴图球体套一层黑白竖条纹的透明度贴图（alphaMap）：**黑色条纹处完全透明，
能直接看到背后的星星；白色处完全不透明**。右侧面板可实时开关 transparent、
启停 alphaMap、改条纹数量、调整体 opacity——直观对照课件每一个知识点。

## 运行

用 VSCode 的 Live Server 打开 `案例源码/index.html`。

## 核心知识点（对照课件）

| 课件内容 | demo 体现 |
| --- | --- |
| `material.alphaMap` 属性，值为纹理对象 | `alphaMap: alphaTexture`（Canvas 现画的黑白条纹） |
| 贴图黑色部分 → 完全透明 | 黑条纹处能看到背景星星（真穿透） |
| 贴图白色部分 → 完全不透明 | 白色区域砖墙纹理完整显示 |
| **注意：透明度需要材质开启 transparent 属性** | GUI 里可现场关掉 `transparent`，球立刻变回实心 |
| 课件注释 `opacity: 0.1` | opacity 滑杆：整体透明度，与 alphaMap 叠加生效 |

## 与课件的差异 / 说明

- 课件的 `opacity.jpg`（黑白竖条纹）用 Canvas 现画替代，效果相同且零素材依赖；
  改条纹数量 = 重建 Canvas 纹理（旧的 `dispose()` 防泄漏，换贴图记得 `needsUpdate = true`）
- 课件里 `alphaTexture.colorSpace = THREE.SRGBColorSpace` 是 r152+ 写法；
  本项目是 r148，且规范上 alphaMap 是数据图（读绿色通道），应保持线性，不设 sRGB
- 课件背景纯黑看不出穿透感，demo 加了一层星星粒子（Points）在球体外壳，
  透过透明条纹能看到它们，"透明"肉眼可见
- 球体加了 `side: DoubleSide`：透明后能看到球内壁，转起来更好看

## 文件说明

```
案例源码/
├── index.html   页面骨架 + HUD 样式
├── index.js     场景/相机/GUI（transparent / alphaMap / 条纹数 / opacity）
└── model.js     颜色贴图 + Canvas 黑白条纹 alphaMap + 星星背景
```
