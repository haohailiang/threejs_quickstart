# 案例-环境贴图

> CubeTextureLoader 立方体纹理：模拟四周环境，在物体表面反射出来

## 效果
**中央金属球**像镜子一样倒映出四周环境；`scene.background` 也用同一张立方体纹理，
**四周直接看到环境本身**；三个环面结粗糙度递增（0.15/0.45/0.85），展示反射从清晰到磨砂。

## 知识点（对应课程）
1. `new THREE.CubeTextureLoader()` 创建立方体纹理加载器
2. `setPath(目录).load([6个面])` —— **注意顺序**：
   `px(+X右) → nx(-X左) → py(+Y上) → ny(-Y下) → pz(+Z前) → nz(-Z后)`
   顺序错了反射会上下颠倒/左右镜像（环境贴图第一大坑）
3. 用法两种：`material.envMap = cubeTexture`（单个材质）或 `scene.environment`（全局）；
   本 demo 两者都演示了（背景 + 材质反射）
4. `scene.background = cubeTexture` 可直接把环境当天空盒背景

## 运行
Live Server 打开 `案例源码/index.html`。带 AxesHelper 坐标辅助。
贴图：项目内自带的 `cube/SwedishRoyalCastle/`（瑞典皇家城堡六面图）。
