import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { buildPoolScene, BALL_R } from './model.js';

let width = window.innerWidth;
let height = window.innerHeight;

/* ============================== 场景基建 ============================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, 22, 55);

const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 200);
camera.position.set(0.5, 5.4, 7.6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.3, 0);
controls.minDistance = 3;
controls.maxDistance = 22;
controls.maxPolarAngle = Math.PI * 0.48;

/* ================================ 灯光 ================================ */
scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x1b2418, 0.75));

// 台球厅常见的"顶灯"，从正上方打，球影正好落在脚下
const top = new THREE.DirectionalLight(0xffffff, 2.4);
top.position.set(2, 12, 3);
top.castShadow = true;
top.shadow.mapSize.set(1024, 1024);
top.shadow.camera.left = -7;
top.shadow.camera.right = 7;
top.shadow.camera.top = 7;
top.shadow.camera.bottom = -7;
top.shadow.camera.near = 1;
top.shadow.camera.far = 30;
top.shadow.bias = -0.0006;
scene.add(top);

const fill = new THREE.DirectionalLight(0x88aaff, 0.5);
fill.position.set(-8, 6, -6);
scene.add(fill);

/* ============================== 物理场景 ============================== */
const { world, balls, cue, strike, tick, state } = buildPoolScene(scene);

/* ================================= GUI ================================= */
const parms = {
    speed: 7.5,   // 击球速度（m/s）
    up: 1.8,      // 上抛分量：>0 就会边跳边滚
    spin: 26,     // 初始自旋
    timeScale: 1,
    hit: () => strike(parms.speed, parms.up, parms.spin),
};

const gui = new GUI({ title: '击球参数' });
gui.add(parms, 'speed', 1, 14, 0.5).name('击球速度 (m/s)').onFinishChange(parms.hit);
gui.add(parms, 'up', 0, 4, 0.1).name('上抛分量 (m/s)').onFinishChange(parms.hit);
gui.add(parms, 'spin', 0, 60, 1).name('自旋 ω').onFinishChange(parms.hit);
gui.add(parms, 'timeScale', 0.1, 1.5, 0.1).name('时间缩放');
gui.add(parms, 'hit').name('▶ 开球');

/* ================================= HUD ================================= */
const hud = document.getElementById('hud');
let hudTimer = 0;

function updateHud() {
    const rolling = state.slip < 0.06 && state.speed > 0.05;
    const stopped = state.speed < 0.06;
    const phase = stopped ? '已停下' : rolling ? '纯滚动' : '滑动/弹跳中';

    hud.innerHTML = `
        <b>CANNON · 台球滚动</b><br>
        速度 <code>${state.speed.toFixed(2)}</code> m/s ｜
        自旋 |ωz| <code>${state.spin.toFixed(1)}</code> rad/s<br>
        接触点滑移 <code>${state.slip.toFixed(3)}</code> m/s
        （≈0 表示纯滚动）<br>
        状态 <code>${phase}</code> ｜ 球半径 <code>${BALL_R}</code> m ｜ 质量 0.17 kg
    `;
}

/* ================================ 主循环 ================================ */
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05) * parms.timeScale;

    // 台球速度快、接触频繁，步长要细，子步要多，否则会"穿模"
    world.step(1 / 180, dt, 6);
    tick();

    for (const b of balls) {
        b.mesh.position.copy(b.body.position);
        b.mesh.quaternion.copy(b.body.quaternion);
    }

    controls.update();
    renderer.render(scene, camera);

    hudTimer += dt;
    if (hudTimer > 0.1) { hudTimer = 0; updateHud(); }
}

strike(parms.speed, parms.up, parms.spin);
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

window.__demo = { scene, camera, renderer, world, cue, parms, state };
