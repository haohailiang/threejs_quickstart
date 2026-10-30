# 案例-3D看房（点击房间切换视角 + 悬停 tooltip）

纯程序化户型（无外部模型）：客厅 + 主卧 + 次卧，墙体用 Box 拼、门洞是隔墙上留的缺口。

## 功能

- 每个房间中心一枚 `CSS2DObject` 标识牌
- **悬停标识牌 → tooltip**（"进入客厅 / 进入主卧 / 进入次卧"，纯 CSS `:hover` 实现）
- **点击标识牌（或右上角 GUI）→ 相机飞行**：位置和注视点同时用 easeInOut 插值 1.4s，飞行中禁用 OrbitControls，落地后恢复
- 当前房间的标识牌高亮（`.active`）

## 核心点

- 标识牌的 `pointer-events: auto`（CSS2DRenderer 容器默认要能穿透）
- 视角飞行 = `camera.position.lerpVectors` + `controls.target.lerpVectors`，两段同步插值才不会"转头"
- 没有屋顶：平行光直接照进室内，家具才有影子

## 运行

Live Server 打开 `案例源码/index.html`。
