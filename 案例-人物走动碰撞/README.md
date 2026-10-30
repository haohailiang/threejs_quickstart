# 案例-人物走动碰撞（第三人称 + 推翻立方体）

WASD 走动 + 第三人称相机（永远看到后背）+ CANNON 刚体碰撞，撞方块会把它**撞翻、翻滚、最终停下**；人有实时投影。

## 操作

- `W/A/S/D`：相对镜头方向移动（W 永远是往画面深处走）
- `Shift`：跑步
- 鼠标拖拽：飞行视角（orbit）

## 核心点

- **人 = KINEMATIC 刚体**：不受重力/碰撞力，`velocity` 由代码每帧驱动；
  两个错开的球形碰撞体拼成胶囊——**低球推下半截、高球撞上半截**，
  碰撞点在方块重心以上，方块才会"翻"而不是"滑"
- **方块 = DYNAMIC 刚体**：`linearDamping 0.25 / angularDamping 0.35` + `allowSleep`
  → 翻滚消耗能量后自动停下并休眠（省 CPU）
- 相机永远在人的背后：`desired = 人 - 朝向 × camDist + up × camHeight`，帧率无关阻尼跟随
- 人物转向用 `quaternion.slerp`，且点积为负时翻转目标四元数（避免绕远路）
- 阴影相机跟着人移动

## 运行

Live Server 打开 `案例源码/index.html`。
