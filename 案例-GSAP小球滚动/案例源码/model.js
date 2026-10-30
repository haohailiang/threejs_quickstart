// 引入three.js
import * as THREE from 'three';

/**
 * 案例-GSAP小球滚动
 *
 * 这个文件只负责"把场景搭出来"，动画交给 index.js 里的 GSAP 做。
 *
 * 需求对应关系：
 * - 小球在平面上来回滚动        → ball + ground（球贴地，y = 半径）
 * - 小球在平面上有阴影          → ball.castShadow + ground.receiveShadow + 平行光开投影
 * - 平行光始终照着小球          → light.target 跟随球；light.position 也以球为圆心绕圈
 * - 平行光辅助对象跟着转动      → DirectionalLightHelper（每帧 update 由 index.js 调用）
 */

/**
 * 1. 常量
 * 半径和滚动幅度都集中在这里，index.js 里算转角要用到 BALL_R
 */
const BALL_R = 1;        // 球半径
const ROLL_SPAN = 14;    // 来回滚动的幅度：从 x = -14 滚到 x = +14
const GROUND_SIZE = 44;  // 地面边长

/**
 * 2. 棋盘格纹理（程序化生成，不依赖图片文件）
 *
 * 为什么必须要它：纯色球在滚动时，从画面上完全看不出"球在转"——
 * 只能看到球在平移。给球贴一张有明显图案的纹理，格子随球面一起翻滚，
 * "滚动"这件事才成立。
 *
 * 这里用 canvas 画一张 8×8 的棋盘，再作为纹理贴到球面上。
 * wrapS 设为 RepeatWrapping，让纹理在 U 方向环绕接缝自然。
 */
function makeCheckerTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cells = 8;
    const cell = size / cells;

    ctx.fillStyle = '#f5f8ff';           // 浅色底
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#2d7ef7';           // 蓝色格
    for (let y = 0; y < cells; y++) {
        for (let x = 0; x < cells; x++) {
            if ((x + y) % 2 === 0) {
                ctx.fillRect(x * cell, y * cell, cell, cell);
            }
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;                  // 斜看球面时纹理更清晰
    // r148 里颜色纹理要标成 sRGB，否则贴图会偏暗（渲染器的 outputEncoding 是 sRGBEncoding）
    tex.encoding = THREE.sRGBEncoding;
    return tex;
}

/**
 * 3. 小球
 * 起始位置放在左端：y 抬到半径高度，正好"坐"在地面上
 */
const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_R, 48, 32),
    new THREE.MeshStandardMaterial({
        map: makeCheckerTexture(),
        roughness: 0.42,
        metalness: 0.05,
    })
);
ball.position.set(-ROLL_SPAN, BALL_R, 0);
ball.castShadow = true;   // 投影的物体必须开
ball.name = 'roll-ball';

/**
 * 4. 地面
 * 浅色、粗糙，接收阴影最清楚；球和阴影的对比度足够高
 */
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
    new THREE.MeshStandardMaterial({
        color: 0xe9eef7,
        roughness: 0.94,
        metalness: 0.02,
    })
);
ground.rotation.x = -Math.PI / 2;  // 平面默认竖直，转成水平地面
ground.receiveShadow = true;       // 接收阴影的物体必须开
ground.name = 'ground';

/**
 * 5. 网格辅助线（贴在地面上一丁点）
 * 有网格才能一眼看出球是在"位移"还是"原地打转"，也方便判断滚动幅度
 */
const grid = new THREE.GridHelper(GROUND_SIZE, GROUND_SIZE, 0xb9c6da, 0xd3dcea);
grid.position.y = 0.002;
grid.material.transparent = true;
grid.material.opacity = 0.6;

/**
 * 6. 平行光（主光 + 投影）
 *
 * 平行光只有方向、没有"距离衰减"：它从 position 指向 target 的方向射出光线。
 * 所以"让光始终照着球"的做法不是调方向向量，而是：
 *   - target 永远 = 球的位置
 *   - position 也以球为圆心绕圈（index.js 每帧算）
 * 这样球走到哪儿，光就跟到哪儿，并且光的方向还在慢慢转 —— 辅助对象看着就在转。
 */
const LIGHT_ORBIT = {
    radius: 9,     // 光离球心的水平距离
    height: 12,    // 光离球的高度
    speed: 0.45,   // 绕球转动的角速度（rad/s），越小越慢
};

const light = new THREE.DirectionalLight(0xffffff, 2.6);
light.position.set(LIGHT_ORBIT.radius, LIGHT_ORBIT.height, 0); // 初值，之后每帧由 index.js 更新
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048); // 阴影贴图分辨率，越大越清晰也越吃显存

/**
 * 平行光的阴影相机是【正交相机】，必须手动框住要投影的范围。
 *
 * 这里是本案例的一个关键点：因为 target 跟着球走，所以这个框只需要罩住
 * "球周围一小片区域"就够了（±7），不需要把整个 44×44 的地面都罩进去。
 * 好处是同样的 2048 贴图，分辨率利用率高得多 —— 阴影边缘清晰、不发虚。
 */
const shadowCam = light.shadow.camera;
shadowCam.left = -7;
shadowCam.right = 7;
shadowCam.top = 7;
shadowCam.bottom = -7;
shadowCam.near = 1;
shadowCam.far = 45;

light.shadow.bias = -0.0009;     // 消除自阴影条纹
light.shadow.normalBias = 0.02;  // 球面曲率大，配合 bias 一起用更干净

/**
 * 7. 平行光辅助对象
 * 画出光的"位置方块"和"指向 target 的方向线"。
 * 它的几何体不会自己动，必须在光变化后调用 helper.update()（index.js 每帧调用）。
 */
const lightHelper = new THREE.DirectionalLightHelper(light, 2.2, 0xffc83d);

/**
 * 8. 半球光（补一点环境色，避免暗面纯黑）
 * 主光在转，暗面位置一直在变，给一点点环境光让暗面还有轮廓
 */
const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x3a4252, 0.45);

/**
 * 9. 组装
 * 注意：light.target 必须进场景图，否则它的 matrixWorld 不更新，光的方向就不会跟着变
 */
const group = new THREE.Group();
group.add(ball, ground, grid, light, light.target, lightHelper, hemi);

export {
    group as default,
    ball,
    ground,
    light,
    lightHelper,
    LIGHT_ORBIT,
    BALL_R,
    ROLL_SPAN,
    GROUND_SIZE,
};
