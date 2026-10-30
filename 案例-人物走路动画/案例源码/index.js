import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { loadSoldier, FORWARD_SIGN } from './model.js';

let width = window.innerWidth;
let height = window.innerHeight;

/* ============================== 场景基建 ============================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, 30, 90);

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 300);
camera.position.set(0, 4, -7);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding; // glb 的贴图是 sRGB，不开会发灰
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.2, 0);
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 3;
controls.maxDistance = 30;

/* ================================ 灯光 ================================ */
scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x2a2418, 0.9));

// 阴影相机要跟着人走（第 7 个 demo 也是这么干的）
const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
dirLight.position.set(6, 12, 4);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.left = -8;
dirLight.shadow.camera.right = 8;
dirLight.shadow.camera.top = 8;
dirLight.shadow.camera.bottom = -8;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 40;
dirLight.shadow.bias = -0.0006;
scene.add(dirLight);
scene.add(dirLight.target);

/* ================================ 地面 ================================ */
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(80, 40, 0x3a4a5e, 0x222c38);
grid.position.y = 0.01;
scene.add(grid);

// 活动范围参照：一个圆圈，走到圈外自动掉头
const ring = new THREE.Mesh(
    new THREE.RingGeometry(11.7, 12, 64),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.02;
scene.add(ring);

/* ============================== 加载人物 ============================== */
const parms = {
    walkSpeed: 1.6,   // 走路 m/s
    runSpeed: 4.2,    // 跑步 m/s
    turnSpeed: 2.2,   // 转向 rad/s
    fadeTime: 0.25,   // 动作切换过渡时长
    followSmooth: 5,  // 相机跟随阻尼
};

const loading = document.getElementById('loading');
const hud = document.getElementById('hud');
const state = { mode: 'Idle', moving: false };

let player = null;   // { model, mixer, actions, fadeTo, update }
let mixer = null;

loadSoldier(scene).then((res) => {
    player = res;
    mixer = res.mixer;
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 600);
});

/* ================================ 键盘 ================================ */
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // 防止方向键滚动页面
    if (['KeyW', 'KeyR', 'KeyA', 'KeyD', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

function setMode(mode) {
    if (state.mode === mode || !player) return;
    state.mode = mode;
    player.fadeTo(mode, parms.fadeTime);
}

/* ================================ GUI ================================ */
const gui = new GUI({ title: '动作参数' });
gui.add(parms, 'walkSpeed', 0.5, 3, 0.1).name('走路速度 (m/s)');
gui.add(parms, 'runSpeed', 2, 8, 0.1).name('跑步速度 (m/s)');
gui.add(parms, 'turnSpeed', 0.5, 5, 0.1).name('转向速度 (rad/s)');
gui.add(parms, 'fadeTime', 0.05, 1, 0.05).name('切换过渡 (s)');

/* ================================= HUD ================================= */
function updateHud() {
    hud.innerHTML = `
        <b>AnimationMixer · 动作切换</b><br>
        当前动作 <code>${state.mode}</code> ｜ 位置
        <code>(${player ? player.model.position.x.toFixed(1) : 0}, ${player ? player.model.position.z.toFixed(1) : 0})</code><br>
        按住 <code>W</code> → Walk ｜ 按住 <code>R</code> → Run ｜
        <code>A/D</code> 转向 ｜ 松开 → Idle<br>
        切换方式：权重渐变（fadeTime=${parms.fadeTime}s），不是瞬间硬切
    `;
}
updateHud();
let hudTimer = 0;

/* ================================ 主循环 ================================ */
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (player) {
        const model = player.model;

        /* ---------- 输入 → 动作状态 ---------- */
        const wantRun = keys['KeyR'];
        const wantWalk = keys['KeyW'];
        let speed = 0;

        if (wantRun) { speed = parms.runSpeed; setMode('Run'); }
        else if (wantWalk) { speed = parms.walkSpeed; setMode('Walk'); }
        else setMode('Idle');

        /* ---------- 转向（A / D）---------- */
        if (keys['KeyA']) model.rotation.y += parms.turnSpeed * dt;
        if (keys['KeyD']) model.rotation.y -= parms.turnSpeed * dt;

        /* ---------- 前进（沿自身朝向）---------- */
        if (speed > 0) {
            // 模型默认面朝 -Z，用 FORWARD_SIGN 把"本地前方"转成世界方向
            const forward = new THREE.Vector3(0, 0, FORWARD_SIGN).applyQuaternion(model.quaternion);
            model.position.addScaledVector(forward, speed * dt);

            // 走出圆圈就掉头，保证永远在镜头附近
            const dist = Math.hypot(model.position.x, model.position.z);
            if (dist > 12) model.rotation.y += Math.PI * dt * 1.5;
        }

        /* ---------- 动画推进（含权重渐变）---------- */
        player.update(dt);

        /* ---------- 第三人称相机跟随 ---------- */
        const forward = new THREE.Vector3(0, 0, FORWARD_SIGN).applyQuaternion(model.quaternion);
        const desiredPos = model.position.clone()
            .addScaledVector(forward, -4.2)   // 站到人的背后
            .add(new THREE.Vector3(0, 2.4, 0));
        // 帧率无关的阻尼
        camera.position.lerp(desiredPos, 1 - Math.exp(-parms.followSmooth * dt));
        controls.target.lerp(
            model.position.clone().add(new THREE.Vector3(0, 1.4, 0)),
            1 - Math.exp(-parms.followSmooth * dt)
        );

        /* ---------- 阴影相机跟人 ---------- */
        dirLight.position.set(model.position.x + 6, 12, model.position.z + 4);
        dirLight.target.position.copy(model.position);
    }

    controls.update();
    renderer.render(scene, camera);

    hudTimer += dt;
    if (hudTimer > 0.2) { hudTimer = 0; updateHud(); }
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

window.__demo = { scene, camera, renderer, get player() { return player; }, parms, state };
