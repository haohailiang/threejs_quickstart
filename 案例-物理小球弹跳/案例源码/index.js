import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import * as CANNON from 'cannon-es';
import { buildBounceScene, START_Y } from './model.js';

let width = window.innerWidth;
let height = window.innerHeight;

/* ============================ 场景 / 相机 / 渲染器 ============================ */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, 45, 110);

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
camera.position.set(11, 7.5, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 3, 0);
controls.maxPolarAngle = Math.PI * 0.49; // 别钻到地面下面
controls.minDistance = 6;
controls.maxDistance = 60;

/* ================================ 灯光 ================================ */
scene.add(new THREE.HemisphereLight(0x9fc6ff, 0x2a2418, 0.85));

const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
dirLight.position.set(12, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.left = -16;
dirLight.shadow.camera.right = 16;
dirLight.shadow.camera.top = 16;
dirLight.shadow.camera.bottom = -16;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 60;
dirLight.shadow.bias = -0.0006; // 消除阴影"痤疮"条纹
scene.add(dirLight);

/* ============================== 物理场景 ============================== */
const { world, contact, ballBody, ballMesh, drop } = buildBounceScene(scene);

/* ================================= GUI ================================= */
const parms = {
    restitution: 0.88,
    linearDamping: 0.02,
    dropHeight: START_Y,
    timeScale: 1,
    reset: () => drop(parms.dropHeight),
};

const gui = new GUI({ title: '物理参数' });
gui.add(parms, 'restitution', 0, 1, 0.01).name('弹性 restitution').onChange((v) => {
    contact.restitution = v; // 改接触材质即可，物理引擎立刻生效
});
gui.add(parms, 'linearDamping', 0, 0.4, 0.01).name('空气阻力').onChange((v) => {
    ballBody.linearDamping = v;
});
gui.add(parms, 'dropHeight', 3, 16, 0.5).name('落下高度 (m)').onChange((v) => drop(v));
gui.add(parms, 'timeScale', 0.1, 1.5, 0.1).name('时间缩放');
gui.add(parms, 'reset').name('重新落下');

/* ================================= HUD ================================= */
const hud = document.getElementById('hud');
let prevVy = 0;
let bounces = 0;
let peakY = START_Y;
let hudTimer = 0;

function updateHud() {
    const y = ballBody.position.y;
    const vy = ballBody.velocity.y;
    const state = ballBody.sleepState === CANNON.Body.SLEEPING ? '休眠中' : '活动';
    hud.innerHTML = `
        <b>CANNON 刚体 · 小球弹跳</b><br>
        高度 <code>${y.toFixed(2)}</code> m ｜ 竖直速度 <code>${vy.toFixed(2)}</code> m/s<br>
        本次最高 <code>${peakY.toFixed(2)}</code> m ｜ 反弹次数 <code>${bounces}</code><br>
        刚体状态 <code>${state}</code> ｜ 弹性系数 <code>${parms.restitution.toFixed(2)}</code>
    `;
}

/* ================================ 主循环 ================================ */
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    // dt 上限 0.05，防止切走标签页回来时一帧跳太远把物理算崩
    const dt = Math.min(clock.getDelta(), 0.05) * parms.timeScale;

    // 固定步长 1/120 + 最多 4 次子步：弹性碰撞用较小的步长才稳定
    world.step(1 / 120, dt, 4);

    // ★ 核心：把刚体的位姿抄给网格
    ballMesh.position.copy(ballBody.position);
    ballMesh.quaternion.copy(ballBody.quaternion);

    // 统计：竖直速度由负变正 = 刚被地面弹起来
    const vy = ballBody.velocity.y;
    if (prevVy < -0.6 && vy > 0.2) bounces++;
    prevVy = vy;
    peakY = Math.max(peakY, ballBody.position.y);

    controls.update();
    renderer.render(scene, camera);

    hudTimer += dt;
    if (hudTimer > 0.15) { hudTimer = 0; updateHud(); }
}

// 参数变了要重置统计
const rawReset = parms.reset;
parms.reset = () => {
    rawReset();
    bounces = 0;
    prevVy = 0;
    peakY = ballBody.position.y;
};
updateHud();
animate();

/* ================================ 自适应 ================================ */
window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

window.__demo = { scene, camera, renderer, world, ballBody, parms };
