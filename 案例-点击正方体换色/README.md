# 案例-点击正方体换色

> 综合练习：世界坐标系 + Canvas 文字 + Raycaster 点击拾取
> 基于本项目的 three.js r148 本地文件包（无需联网）

## 效果

世界坐标系原点处有一个正方体，正上方悬浮"正方体"文字标签；
**点击正方体，颜色在红色和蓝色之间来回切换**（带渐变过渡和弹性缩放）。
坐标轴（X红/Y绿/Z蓝）和地面网格把"世界坐标系"可视化出来。

## 运行

用 VSCode 的 Live Server 打开 `案例源码/index.html`。

## 核心知识点

| 知识点 | 说明 |
| --- | --- |
| 世界坐标系 | 正方体 `position.set(0,0,0)` 即世界原点；文字在它的正上方 = 沿 +Y 偏移；用 `AxesHelper` / `GridHelper` 可视化 |
| 中文文字 | JSON 字体不支持中文 → 文字画到 Canvas → `CanvasTexture` → 贴到 `Sprite`（永远朝向相机） |
| Raycaster 拾取 | 屏幕坐标 → NDC（y 取反）→ `setFromCamera` → `intersectObject(cube, false)` |
| 区分点击/拖拽 | OrbitControls 旋转也是按下-移动-抬起：记录 `pointerdown` 位置，移动超过 5px 不算点击 |
| 颜色渐变切换 | `material.color.lerp(targetColor, 0.15)` 每帧向目标色靠近，比瞬间切换柔和 |
| 弹性缩放 | 点击瞬间 `scale.setScalar(1.08)`，渲染循环里 lerp 回 1，形成"弹一下" |
| 悬停手型光标 | `pointermove` 里持续射线检测，命中正方体时 `cursor = pointer` |

## 文件说明

```
案例源码/
├── index.html   页面骨架 + HUD 样式
├── index.js     场景/相机/Raycaster 点击切换/渲染循环
└── model.js     正方体 + Canvas 文字 Sprite（导出颜色常量供切换）
```

## 已验证

用 CDP（Chrome DevTools Protocol）模拟点击实测：
`#1677ff（蓝）→ 点击 → #f44d4f（红）→ 再点击 → #1677ff（蓝）`，来回切换正常。
