# 案例-人物走路动画（AnimationMixer 动作切换）

> 模型：`three.js/examples/models/gltf/Soldier.glb`（自带 Idle / Walk / Run / TPose 四段动画）

## 操作

- 按住 `W` → Walk（走路），按住 `R` → Run（跑步），松开 → Idle
- `A / D` 转向
- 相机第三人称跟随（阻尼）

## 核心点

- `AnimationMixer` + 每个动作一个 `AnimationAction`
- **动作切换不用 `crossFadeTo`**（会被互相打断），改用"权重渐变"：
  所有 action 先 `play()` 再把权重压到 0，切换时目标权重渐变到 1（`_fadeTarget / _fadeSpeed`，每帧 `setEffectiveWeight`），
  过渡时长由 GUI 的 `fadeTime` 控制
- 模型朝向 -Z，"向前"= `new Vector3(0,0,-1).applyQuaternion(model.quaternion)`
- 阴影相机跟着人走（`dirLight.position` + `dirLight.target` 每帧更新）
- 蒙皮网格 `frustumCulled = false`，防止被包围盒误裁

## 运行

Live Server 打开 `案例源码/index.html`。
