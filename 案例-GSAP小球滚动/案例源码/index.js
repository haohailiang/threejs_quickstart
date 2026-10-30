// 引入three.js
import * as THREE from 'three';
// 引入轨道控制器
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// 引入gsap（本地 ESM 版，importmap 里已映射）
import { gsap } from 'gsap';
// 引入场景（model.js 负责搭场景，本文件负责动起来）
import scene, {
    ball,
    light,
    lightHelper,
    LIGHT_ORBIT,
    BALL_R,
    ROLL_SPAN,
} from './model.js';

/**
 * 案例-GSAP小球滚动
 *
 * 本文件做四件事：
 *   1. 用 GSAP timeline 让小球沿 X 轴来回滚动（repeat: -1 + yoyo）
 *   2. 用"位移差 ÷ 半径"推导球的转角，让平移看起来是真的在滚
 *   3. 点击小球，切换 滚动 / 暂停
 *   4. 每帧让平行光绕球转、target 跟着球走，并同步辅助对象
 */

/* ------------------------------------------------------------------ */
/* 1. 渲染器                                                           */
/* ------------------------------------------------------------------ */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;              // 总开关：不开阴影贴图就完全不渲染阴影
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 阴影边缘柔和一点
renderer.outputEncoding = THREE.sRGBEncoding;   // 颜色空间（r148 的写法）
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

/* ------------------------------------------------------------------ */
/* 2. 场景 & 相机                                                      */
/* ------------------------------------------------------------------ */
const scene3d = new THREE.Scene();
scene3d.background = new THREE.Color(0x0d1119);
scene3d.add(scene);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(16, 15, 26);   // 斜上方 3/4 视角，能同时看到球的位移和地面的阴影

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);      // 看向球心高度，不是原点
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 70;
controls.maxPolarAngle = Math.PI / 2 - 0.04; // 别让相机钻到地面以下

/* ------------------------------------------------------------------ */
/* 3. GSAP：让小球来回滚动                                              */
/* ------------------------------------------------------------------ */
/**
 * 为什么不直接 tween ball.position.x？
 * 因为除了位置，我们还要让球"滚起来"。而滚动的转角必须由【位移变化量】推导，
 * 用 onUpdate 读到的每一帧 dx 去累加，才和位移严格一致（匀速、ease、反向都自动正确）。
 *
 * 所以这里 tween 一个纯净的数据对象 roll，GSAP 只负责产生数值，
 * 位移和转角都在 onUpdate 里手动写回球体。
 */
const roll = { x: -ROLL_SPAN };
let prevX = roll.x;

function applyRoll() {
    const dx = roll.x - prevX;  // 本帧相对上一帧的位移，可能为负（yoyo 反向时）
    prevX = roll.x;

    ball.position.x = roll.x;

    /**
     * 纯滚动关系：球滚过弧长 s 时转过的角度 θ = s / R。
     * 这里 s 就是 dx，所以 Δθ = dx / R。
     *
     * 方向：沿 +X 前进时，从 +Z 方向看球是顺时针转 → rotation.z 减小，取负号。
     * yoyo 反向播放时 dx 为负，减负等于加，转角自动反向 —— 不需要额外判断。
     */
    ball.rotation.z -= dx / BALL_R;
}

/**
 * timeline 参数说明：
 * - repeat: -1     无限循环
 * - yoyo: true     到终点后原路返回（反向播放），形成"来回"
 * - ease: 'none'   匀速。滚动应该是匀速的，用缓动会看起来像"有人在推拉"，
 *                  想更柔和可以改成 'sine.inOut'
 * - duration: 2.8  单程 2.8 秒，28m 的距离 → 约 10m/s，配合半径 1m 转得比较舒服
 */
const rollTimeline = gsap.timeline({
    repeat: -1,
    yoyo: true,
    defaults: { duration: 2.8, ease: 'none' },
});
rollTimeline.to(roll, { x: ROLL_SPAN, onUpdate: applyRoll });

/* ------------------------------------------------------------------ */
/* 4. 平行光跟随小球 + 辅助对象同步                                     */
/* ------------------------------------------------------------------ */
/**
 * 每帧做三件事：
 *   ① light.position = 球心 + 一个绕 Y 轴旋转的偏移向量  → 光的位置跟着球走，且方向在慢慢转
 *   ② light.target.position = 球心                        → 光永远"照着球"
 *   ③ lightHelper.update()                               → 辅助对象的方块和方向线跟着重新算
 *
 * 少了第①步，球滚到两端时光会变成侧着打，阴影被拉得极长；
 * 少了第③步，辅助对象会僵在原地不动（它不会自动感知光的变化）。
 */
const orbitOffset = new THREE.Vector3();

function updateLight(elapsed) {
    const angle = elapsed * LIGHT_ORBIT.speed;

    orbitOffset.set(
        Math.cos(angle) * LIGHT_ORBIT.radius,
        LIGHT_ORBIT.height,
        Math.sin(angle) * LIGHT_ORBIT.radius
    );

    // 光源 = 球心 + 偏移
    light.position.copy(ball.position).add(orbitOffset);

    // 光照目标 = 球心（target 在场景图里，改完要更新矩阵）
    light.target.position.copy(ball.position);
    light.target.updateMatrixWorld();

    // 辅助对象按新的位置/方向重绘
    lightHelper.update();
}

/* ------------------------------------------------------------------ */
/* 5. 点击小球 → 切换 滚动 / 暂停                                       */
/* ------------------------------------------------------------------ */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDownAt = null;   // 记录按下位置，用来区分"点击"和"拖动视角"
let isPaused = false;

const hud = document.getElementById('hud');
const badge = document.getElementById('paused-badge');

function setPaused(next) {
    isPaused = next;
    if (isPaused) {
        rollTimeline.pause();       // 暂停后 onUpdate 不再触发，球的位移和转角一起停住
    } else {
        rollTimeline.resume();      // 从暂停处继续，不回从头开始
    }
    badge.classList.toggle('show', isPaused);
    updateHud();
}

function toggleRoll() {
    setPaused(!isPaused);
}

function updateHud() {
    hud.innerHTML =
        `状态：<b>${isPaused ? '已暂停' : '滚动中'}</b><br>` +
        `点击小球 → ${isPaused ? '继续滚动' : '暂停'}<br>` +
        `球心 X：<b>${ball.position.x.toFixed(2)}</b> ｜ 转角 Z：<b>${ball.rotation.z.toFixed(2)}</b>`;
}

renderer.domElement.addEventListener('pointerdown', (e) => {
    pointerDownAt = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('pointerup', (e) => {
    if (!pointerDownAt) return;

    // 鼠标移动超过 6px 视为"拖拽视角"，不触发点击
    const moved = Math.hypot(e.clientX - pointerDownAt.x, e.clientY - pointerDownAt.y);
    pointerDownAt = null;
    if (moved > 6) return;

    // 屏幕坐标 → NDC 坐标（-1 ~ 1）
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    // 只检测球体本身，命中才切换
    if (raycaster.intersectObject(ball, false).length > 0) {
        toggleRoll();
    }
});

// 鼠标移到球上时变成手型，暗示"可以点"
let hoverThrottle = 0;
renderer.domElement.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - hoverThrottle < 60) return;   // 简单的节流，避免每帧都做射线检测
    hoverThrottle = now;

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster.intersectObject(ball, false).length > 0;
    renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
});

/* ------------------------------------------------------------------ */
/* 6. 渲染循环                                                         */
/* ------------------------------------------------------------------ */
const clock = new THREE.Clock();
let hudTimer = 0;

function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // 光绕球转 + 辅助对象同步（暂停时也继续转，方便观察辅助对象的转动）
    updateLight(elapsed);

    controls.update();

    // HUD 里的 X / 转角在变，但没必要每帧刷 DOM，150ms 一次足够
    hudTimer += 1;
    if (hudTimer % 9 === 0) updateHud();

    renderer.render(scene3d, camera);
}

updateHud();
animate();

/* ------------------------------------------------------------------ */
/* 7. 自适应窗口                                                        */
/* ------------------------------------------------------------------ */
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 方便在控制台里调试/演示
window.__demo = {
    rollTimeline, ball, light, lightHelper, camera, renderer, setPaused,
    get isPaused() { return isPaused; },
};
