# 案例-3D看车（四视角切换）

模型：`models/ferrari.glb`（**Draco 压缩**，必须挂 `DRACOLoader`，解码器用本地
`three.js/examples/jsm/libs/draco/gltf/`）。

## 功能

- 底部按钮：外观 / 主驾驶位 / 副驾驶位 / 后排，点击后相机飞行 1.3s，结束可自由环绕
- 车漆 = `MeshPhysicalMaterial`（metalness 0.9 + clearcoat 1.0，"清漆度"demo 的实战应用）
- 车窗 = transmission 透射玻璃
- 环境 = `RoomEnvironment` + PMREM（金属车漆没有环境反射就是黑的）

## 机位怎么算（本案例最值的点）

不写死坐标，运行时用三个参照节点反推：

- `rim_fl`（前左轮）- `rim_rr`（后右轮）→ **车头方向**
- `up × 车头方向` → **车左侧方向**
- `steering_wheel`（方向盘）相对车体中心的横向偏移 → **主驾在哪一侧**

四个机位全部表达成"车体坐标的偏移"，模型随便怎么转都正确。

## 运行

Live Server 打开 `案例源码/index.html`。
