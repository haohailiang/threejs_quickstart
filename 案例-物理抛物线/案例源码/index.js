import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { buildProjectileScene, START } from './model.js';

let width = window.innerWidth;
let height = window.innerHeight;

/* ============================== 场景基建 ============================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, 60, 140);

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
camera.position.set(0, 11, 42);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 6, 0);
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 8;
controls.maxDistance = 120;

/* ================================ 灯光 ================================ */
scene.add(new THREE.HemisphereLight(0x9fc6ff, 0x2a2418, 0.8));

const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(-6, 24, 16);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.left = -30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 24;
dirLight.shadow.camera.bottom = -24;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 80;
dirLight.shadow.bias = -0.0008;
scene.add(dirLight);

/* ============================== 物理场景 ============================== */
const { world, ballBody, ballMesh, launch, tick, state } = buildProjectileScene(scene);

/* ================================= GUI ================================= */
const parms = { vx: 9, vy: 11, timeScale: 1, launch: () => launch(parms.vx, parms.vy) };

const gui = new GUI({ title: '抛射参数' });
gui.add(parms, 'vx', 2, 18, 0.5).name('水平初速 vx (m/s)').onFinishChange(() => launch(parms.vx, parms.vy));
gui.add(parms, 'vy', 2, 18, 0.5).name('竖直初速 vy (m/s)').onFinishChange(() => launch(parms.vx, parms.vy));
gui.add(parms, 'timeScale', 0.1, 1.5, 0.1).name('时间缩放');
gui.add(parms, 'launch').name('▶ 发射');

/* ================================= HUD ================================= */
const hud = document.getElementById('hud');
let hudTimer = 0;

function updateHud() {
    const th = state.theory;
    if (!th.t) return;
    hud.innerHTML = `
        <b>CANNON · 抛物线（公式 vs 物理引擎）</b><br>
        初速度 <code>vx=${parms.vx.toFixed(1)}</code> /
        <code>vy=${parms.vy.toFixed(1)}</code> m/s ｜ 起点 x=<code>${START.x}</code><br>
        理论：飞行 <code>${th.t.toFixed(2)}</code>s ｜ 最高点 <code>${th.peak.toFixed(2)}</code>m
        ｜ 射程 <code>${th.range.toFixed(2)}</code>m<br>
        实测：飞行 <code>${state.landed ? state.actualTime.toFixed(2) : '—'}</code>s ｜
        当前高度 <code>${ballBody.position.y.toFixed(2)}</code>m
    `;
}

/* ================================ 主循环 ================================ */
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05) * parms.timeScale;

    world.step(1 / 120, dt, 4);
    tick(dt);

    // 刚体位姿 → 网格
    ballMesh.position.copy(ballBody.position);
    ballMesh.quaternion.copy(ballBody.quaternion);

    controls.update();
    renderer.render(scene, camera);

    hudTimer += dt;
    if (hudTimer > 0.1) { hudTimer = 0; updateHud(); }
}

launch(parms.vx, parms.vy);
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

window.__demo = { scene, camera, renderer, world, ballBody, parms, state };
