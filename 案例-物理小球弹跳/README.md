# 案例-物理小球弹跳（CANNON 入门第一课）

> 物理引擎：`libs/cannon-es.js`（cannon-es 0.20.0，ESM 版，importmap 映射为 `"cannon-es"`）

## 效果

小球从 9m 高度落地，按弹性系数反复反弹直至静止；GUI 可实时调弹性 / 空气阻力 / 落下高度 / 时间缩放；HUD 显示高度、竖直速度、反弹次数、刚体休眠状态。

## 核心代码

```js
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

// 摩擦/弹性写在"接触材质"里
const contact = new CANNON.ContactMaterial(matBall, matGround, {
    friction: 0.35,
    restitution: 0.88,   // 0 不弹 ~ 1 完全弹性
});
world.addContactMaterial(contact);

// 静态地面：mass = 0；Plane 默认法线朝 +Z，转 -90° 才是水平面
const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

// 每帧：固定步长 1/120 + 最多 4 次子步（弹性碰撞步长小才稳定）
world.step(1 / 120, dt, 4);
ballMesh.position.copy(ballBody.position);   // ★ 位姿同步
ballMesh.quaternion.copy(ballBody.quaternion);
```

## 要点

- three.js 和 cannon 是两套独立世界，**必须每帧手动同步位姿**
- `world.allowSleep = true`：静止的刚体自动休眠省 CPU，唤醒要 `body.wakeUp()`
- `dt` 上限 0.05：防止切走标签页回来一帧跳太远把物理算崩
- 反弹计数：竖直速度由负变正（<-0.6 → >0.2）即为弹起一次

## 运行

Live Server 打开 `案例源码/index.html`。
