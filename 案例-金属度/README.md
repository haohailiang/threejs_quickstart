# 案例-金属度

> MeshStandardMaterial（PBR）核心参数：metalness / roughness

## 效果
三个金色球并排，metalness 分别为 **0（绝缘体/塑料）、0.5（混合）、1（纯金属）**，外观差异一目了然。

## 知识点
- `metalness`：0 = 绝缘体（漫反射为主），1 = 金属（几乎不漫反射，全靠反射环境）。
- `roughness`：0 = 镜面，1 = 完全哑光。
- **金属没环境贴图会变黑**：PBR 金属靠反射环境表现。demo 用 RoomEnvironment 程序化生成环境；
  把 GUI 里"环境反射强度"拖到 0 就能看到金属球变黑的经典现象。
- 环境生成：`PMREMGenerator` + `RoomEnvironment`（`three/addons/environments/`），零素材。

## 运行
Live Server 打开 `案例源码/index.html`。带 AxesHelper 坐标辅助。
