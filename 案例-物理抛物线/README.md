# 案例-物理抛物线（公式 vs 物理引擎）

小球以 `(vx, vy)` 初速度抛出，画面同时画两条轨迹：

- **蓝色虚线**：用 `s = v·t + ½g·t²` 公式算出的理想曲线 + 落点标记圈
- **黄色实线**：物理引擎每帧真实位置连成的轨迹

两条线重合 = 引擎算得对。

## 核心公式

```
飞行时间  t = (vy + √(vy² + 2g·(y0-R))) / g
最高点    h = y0 + vy²/(2g)
射程      s = vx · t
```

## 核心代码

```js
ballBody.velocity.set(vx, vy, 0);   // "抛"就是给一个初速度，其他交给重力
```

轨迹线用预分配 `Float32Array` + `BufferGeometry.setDrawRange` 动态追加，
`LineDashedMaterial` 必须调 `computeLineDistances()` 才会显示虚线。

## GUI

vx / vy 初速（改完自动重抛）、时间缩放、发射按钮。

## 运行

Live Server 打开 `案例源码/index.html`。

> 注：headless 软渲染下帧率极低会看到实际轨迹"变慢"（dt 被 clamp），
> 真机 60fps 时两条轨迹严丝合缝。
