import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { buildPhysics, loadSoldier } from './model.js';

let width = window.innerWidth;
let height = window.innerHeight;

/* ============================== 场景基建 ============================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, 30, 80);

const camera = new THREE.PerspectiveCamera(70, width / height, 0.08, 300);
camera.position.set(0, 1.62, 0.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

/* ================================ 灯光 ================================ */
scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x2a2418, 0.8));

const sun = new THREE.DirectionalLight(0xfff2dd, 2.0);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -9;
sun.shadow.camera.right = 9;
sun.shadow.camera.top = 9;
sun.shadow.camera.bottom = -9;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 50;
sun.shadow.bias = -0.0006;
scene.add(sun);
scene.add(sun.target);

/* ============================== 物理 + 人物 ============================== */
const { world, charBody, cubes, resetCubes } = buildPhysics(scene);

const loading = document.getElementById('loading');
const hud = document.getElementById('hud');
let player = null;

loadSoldier(scene).then((res) => {
    player = res;
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 600);
});

/* ================================ 键盘 ================================ */
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

/* ======================== 鼠标拖拽转视角（yaw） ======================== */
let dragging = false;
renderer.domElement.addEventListener('pointerdown', () => { dragging = true; });
window.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('pointermove', (e) => {
    if (!dragging || !player) return;
    // 直接转人物本体的 yaw：第一人称的"视线"就是人物朝向
    player.model.rotateY(-e.movementX * 0.0026);
});

/* ================================= GUI ================================= */
const parms = {
    speed: 3.4,
    runSpeed: 6,
    eyeHeight: 1.62,
    reset: () => {
        resetCubes();
        charBody.position.set(0, 0, 0);
        charBody.velocity.set(0, 0, 0);
        if (player) {
            player.model.position.set(0, 0, 0);
            player.model.rotation.set(0, 0, 0);
        }
    },
};

const gui = new GUI({ title: '第一人称' });
gui.add(parms, 'speed', 1, 6, 0.2).name('走路速度 (m/s)');
gui.add(parms, 'runSpeed', 3, 9, 0.2).name('跑步速度 (Shift)');
gui.add(parms, 'eyeHeight', 1.2, 2.1, 0.02).name('眼睛高度 (m)');
gui.add(parms, 'reset').name('↺ 复位');

/* ================================= HUD ================================= */
let pushed = 0;
let hudTimer = 0;

function updateHud() {
    let awake = 0;
    for (const c of cubes) if (c.body.sleepState !== 2) awake++;
    pushed = cubes.filter((c) => c.body._touched).length;
    hud.innerHTML = `
        <b>第一人称 · WASD 走动 + 刚体碰撞</b><br>
        眼睛位置 <code>(${charBody.position.x.toFixed(1)}, ${charBody.position.z.toFixed(1)})</code>
        ｜ 动作 <code>${player ? player.current : '—'}</code><br>
        方块：撞动过 <code>${pushed}</code> / 还在动 <code>${awake}</code><br>
        相机 = 眼睛：位置焊在角色身上（无阻尼，走路不"漂"）
    `;
}
updateHud();

/* ================================ 主循环 ================================ */
const clock = new THREE.Clock();
const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    /* ---------- 1. 输入：相对"视线"的移动 ---------- */
    let ix = 0, iz = 0;
    if (keys['KeyW']) iz += 1;
    if (keys['KeyS']) iz -= 1;
    if (keys['KeyA']) ix -= 1;
    if (keys['KeyD']) ix += 1;

    if (player) {
        const model = player.model;

        // 视线方向 = 人物自身 -Z（第一人称：看到的 == 人物朝向）
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(model.quaternion);
        fwd.y = 0;
        fwd.normalize();
        const right = new THREE.Vector3().crossVectors(UP, fwd).multiplyScalar(-1);

        const move = new THREE.Vector3()
            .addScaledVector(fwd, iz)
            .addScaledVector(right, ix);
        const moving = move.lengthSq() > 0.001;
        if (moving) move.normalize();

        const speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? parms.runSpeed : parms.speed;

        /* ---------- 2. 运动学刚体驱动 ---------- */
        charBody.velocity.set(moving ? move.x * speed : 0, 0, moving ? move.z * speed : 0);
        model.position.set(charBody.position.x, 0, charBody.position.z);

        // 第一人称看不到自己，但走路/待机动画照常播（投影还靠它）
        player.fadeTo(moving ? 'Walk' : 'Idle');
        player.update(dt);

        /* ---------- 3. 相机 = 眼睛（直接焊死，无阻尼）---------- */
        const facing = new THREE.Vector3(0, 0, -1).applyQuaternion(model.quaternion);
        facing.y = 0;
        facing.normalize();
        // 眼睛位置：稍微往前探 0.3m，让头模落在相机后面，不挡视野
        camera.position.copy(model.position)
            .addScaledVector(facing, 0.3)
            .add(new THREE.Vector3(0, parms.eyeHeight, 0));
        camera.lookAt(camera.position.clone().addScaledVector(facing, 3));

        /* ---------- 4. 阴影相机跟人 ---------- */
        sun.position.set(model.position.x + 6, 12, model.position.z + 4);
        sun.target.position.copy(model.position);
    }

    /* ---------- 5. 物理推进 + 网格同步 ---------- */
    world.step(1 / 120, dt, 4);
    for (const c of cubes) {
        c.mesh.position.copy(c.body.position);
        c.mesh.quaternion.copy(c.body.quaternion);
    }

    renderer.render(scene, camera);

    hudTimer += dt;
    if (hudTimer > 0.25) { hudTimer = 0; updateHud(); }
}
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

window.__demo = { scene, camera, renderer, world, charBody, cubes, parms, keys,
    get player() { return player; } };
