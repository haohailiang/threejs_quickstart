# 案例-平行光与阴影

> 综合练习：MeshLambertMaterial + DirectionalLight 明暗交界 + Shadow Map 投影 + 光源辅助对象
> 基于本项目的 three.js r148 本地文件包（无需联网）

## 效果

蓝色 Lambert 球体被右前上方的平行光照亮：**大半边亮、小半边暗**，明暗交界清晰；
地面上有球体的真实投影；黄色 **DirectionalLightHelper** 画出光的起点和方向线。
右侧面板可实时调整光源方位角/高度角/强度，明暗交界会跟着转。

## 运行

用 VSCode 的 Live Server 打开 `案例源码/index.html`。

## 核心知识点

| 知识点 | 说明 |
| --- | --- |
| MeshLambertMaterial | 只算漫反射、没有高光；亮度 ∝ 法线与光线夹角 → 明暗交界是"算出来的"，不是贴图 |
| DirectionalLight | 只有方向没有位置概念：从 `position` 指向 `target`（默认原点），光线全部平行（像太阳） |
| 一大半亮一小半暗 | 光源方位角/高度角决定亮面朝向；`AmbientLight` 越小对比越强，调到 0 暗面纯黑 |
| 阴影三件套 | `renderer.shadowMap.enabled = true` + `light.castShadow = true` + 物体 `castShadow`/`receiveShadow`，缺一个都不出阴影 |
| 平行光阴影相机 | 平行光的阴影用**正交相机**渲染，必须手动设置 `shadow.camera` 的 left/right/top/bottom 框住投影区域 |
| shadow.bias | 微小负值（-0.0008）消除自阴影条纹（shadow acne） |
| PCFSoftShadowMap | 阴影边缘柔化，比默认硬边好看 |
| DirectionalLightHelper | 画出光源方块 + 指向目标的方向线；**改光位置后要手动 `helper.update()`** |
| CameraHelper(shadow.camera) | 把"看不见的阴影相机"视锥体画成虚线框，直观理解阴影只在框内渲染 |

## 文件说明

```
案例源码/
├── index.html   页面骨架 + HUD 样式
├── index.js     场景/相机/阴影开关/光源方位控制（球坐标）/GUI
└── model.js     Lambert 球体 + 地面 + 平行光（阴影配置）+ 两个辅助对象
```

## 常见坑（本 demo 已处理）

1. 阴影不出：三个开关（renderer / light / mesh）任何一个没开都不行
2. 阴影缺失或只出现一半：平行光阴影相机范围太小，要覆盖整个投影区
3. 球体表面出现明暗条纹：shadow.bias 没调，自阴影 acne
4. 改了 light.position 但辅助线不动：`DirectionalLightHelper` 要手动 `update()`
