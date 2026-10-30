# 案例-GSAP小球滚动

GSAP 驱动小球在平面上**来回滚动**，**点击小球**切换滚动/暂停；平行光始终照着小球并绕球慢慢转动，**DirectionalLightHelper（平行光辅助对象）跟着一起转**，小球在地面留下清晰的投影。

## 运行方式

VS Code 安装 Live Server 插件 → 右键 `index.html` → Open with Live Server；
或任意静态服务器（如 `python -m http.server`）从本仓库根目录启动后访问本目录。

依赖：
- three.js r148（`../../three.js/`，importmap 引入）
- GSAP 3.12.5（`../../libs/gsap/index.js`，本地 ESM 版，importmap 引入，无需联网）

## 核心实现

### 1. GSAP 只产生数值，滚动效果手动写回

不直接 tween `ball.position.x`，而是 tween 一个纯净对象，在 `onUpdate` 里同时推导**位移**和**转角**：

```js
const roll = { x: -ROLL_SPAN };
let prevX = roll.x;

function applyRoll() {
    const dx = roll.x - prevX;          // 本帧位移（yoyo 反向时为负）
    prevX = roll.x;
    ball.position.x = roll.x;
    ball.rotation.z -= dx / BALL_R;     // 纯滚动：转角 = 弧长 / 半径
}

const rollTimeline = gsap.timeline({
    repeat: -1,                          // 无限循环
    yoyo: true,                          // 到终点原路返回 → "来回"
    defaults: { duration: 2.8, ease: 'none' },  // 匀速滚动
});
rollTimeline.to(roll, { x: ROLL_SPAN, onUpdate: applyRoll });
```

**为什么这样设计**：转角必须由相邻帧的位移差推导，而不是和位移并行写两套动画。
好处是——不管 ease 怎么变、yoyo 怎么反向，`Δ角度 = Δ位移 / R` 永远严格成立，
反向滚动时 `dx` 为负，转角自动反向，**一行判断都不用写**。

### 2. 点击小球 → 暂停 / 继续

Raycaster 命中检测 + timeline 的 `pause()/resume()`：

```js
renderer.domElement.addEventListener('pointerdown', e => { down = {x: e.clientX, y: e.clientY}; });
renderer.domElement.addEventListener('pointerup', e => {
    // 拖拽旋转视角时鼠标会移动超过 6px，这种情况不算点击
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    // 屏幕坐标 → NDC → 射线 → 只检测球体
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.intersectObject(ball, false).length) {
        isPaused ? (rollTimeline.resume(), isPaused = false)
                 : (rollTimeline.pause(),  isPaused = true);
    }
});
```

`pause()` 之后 `onUpdate` 不再触发，球的**位移和转角一起停住**；
`resume()` 从暂停处继续，不会回到起点。

### 3. 平行光始终照着小球 + 辅助对象跟着转

平行光只有方向、没有位置概念：它从 `position` 沿直线射向 `target`。让光"追着球照"就是每帧重设这两个点：

```js
function updateLight(elapsed) {
    const a = elapsed * LIGHT_ORBIT.speed;   // 光绕球的方位角，随时间转
    light.position.set(
        ball.position.x + Math.cos(a) * LIGHT_ORBIT.radius,  // 光跟着球平移
        LIGHT_ORBIT.height,
        Math.sin(a) * LIGHT_ORBIT.radius,
    );
    light.target.position.copy(ball.position);               // 光永远指向球心
    light.target.updateMatrixWorld();
    lightHelper.update();                                    // 辅助对象重算位置和方向线
}
```

三个易错点：
- `light.target` **必须 add 进场景图**，否则 `matrixWorld` 不更新，方向不会变；
- 少了 `lightHelper.update()`，辅助对象会僵在初始位置（它不会自动感知光的变化）；
- 光的方位角用 `elapsed` 驱动而非帧数，帧率高低不影响转速。

### 4. 阴影跟随，既清晰又省

阴影相机是正交相机，必须手动框范围。因为 target 跟着球走，框只需要罩住球周围 ±7：

```js
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
const sc = light.shadow.camera;
sc.left = -7; sc.right = 7; sc.top = 7; sc.bottom = -7; sc.near = 1; sc.far = 45;
light.shadow.bias = -0.0009;      // 消除自阴影条纹
light.shadow.normalBias = 0.02;   // 球面曲率大，配合使用更干净
```

如果框住整个 44×44 的地面，同样的 2048 贴图分给每个方向，阴影会糊；
现在窗口跟着球移动，分辨率全部用在球周围 —— **阴影窗口跟着球走，边缘始终锐利**。

## 原理速查表

| 需求 | 实现手段 | 关键 API |
| --- | --- | --- |
| 来回滚动 | timeline 无限循环 + 原路返回 | `gsap.timeline({repeat:-1, yoyo:true})` |
| 滚动（而非平移） | 转角 = 位移差 / 半径 | `ball.rotation.z -= dx / BALL_R` |
| 点击切换 | 射线拾取 + 暂停/恢复 | `Raycaster` / `timeline.pause()` / `resume()` |
| 区分点击与拖拽 | 按下→抬起位移 < 6px 才算点击 | `pointerdown` + `pointerup` |
| 光始终照球 | 每帧重设 position 与 target | `light.target.position.copy(ball.position)` |
| 光方向转动 | 光位置绕球心做圆周运动 | `cos/sin(elapsed · speed)` |
| 辅助对象跟随 | 光变化后手动同步 | `DirectionalLightHelper.update()` |
| 球有阴影 | 投影三件套 + 正交阴影相机跟球 | `castShadow` / `receiveShadow` / `shadow.camera` |
| 看得出球在转 | 程序化棋盘格纹理 | `CanvasTexture` |

## 一个容易忽略的细节

纯色球滚动时，画面上完全看不出"球在转"——只能看到平移。
所以本案例给球贴了一张 canvas 程序化生成的**棋盘格纹理**（`makeCheckerTexture()`），
格子随球面翻滚，"滚动"才成立。做任何滚动演示都别用纯色球。

## 文件结构

```
案例-GSAP小球滚动/
├── README.md
└── 案例源码/
    ├── index.html   页面骨架 + importmap（three / three/addons / gsap）
    ├── model.js     场景搭建：球、棋盘纹理、地面、平行光、辅助对象
    └── index.js     GSAP 动画、点击交互、光跟随、渲染循环
```

## 性能参考（960×540 headless 实测）

draw calls ≈ 5，三角形 ≈ 3000，阴影贴图 2048×2048 一张 —— 非常轻。
