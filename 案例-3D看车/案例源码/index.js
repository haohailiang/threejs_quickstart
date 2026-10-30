import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadFerrari } from './model.js';

let width = window.innerWidth;
let height = window.innerHeight;

/* ============================== 场景基建 ============================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11151d);
scene.fog = new THREE.Fog(0x11151d, 30, 90);

const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 300);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 0.4;   // 允许凑近看内饰
controls.maxDistance = 25;
controls.maxPolarAngle = Math.PI * 0.495;

/* 环境贴图：车漆是金属+清漆，没有环境反射就是一坨黑
   （金属度 demo 里验证过的结论） */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

/* ================================ 灯光 ================================ */
scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x2a2418, 0.45));

const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
sun.position.set(6, 10, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -7;
sun.shadow.camera.right = 7;
sun.shadow.camera.top = 7;
sun.shadow.camera.bottom = -7;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 40;
sun.shadow.bias = -0.0005;
scene.add(sun);

/* ================================ 地面 ================================ */
const ground = new THREE.Mesh(
    new THREE.CircleGeometry(30, 48),
    new THREE.MeshStandardMaterial({ color: 0x232a35, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(60, 30, 0x3a4a5e, 0x1c2530);
grid.position.y = 0.01;
scene.add(grid);

/* ============================== 加载汽车 ============================== */
const loading = document.getElementById('loading');
const hud = document.getElementById('hud');
let info = '加载中…';

loadFerrari(scene).then((res) => {
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 600);

    // 初始机位 = 外观
    const ext = res.presets.exterior;
    camera.position.copy(ext.camPos);
    controls.target.copy(ext.lookAt);

    buildButtons(res.presets);
    window.__presets = res.presets;
    info = `车体尺寸 ${res.size.x.toFixed(2)} × ${res.size.z.toFixed(2)} m（长×宽）`;
    updateHud();
});

/* ============================== 视角飞行 ============================== */
const fly = {
    active: false, t: 0, dur: 1.3,
    fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(),
    fromTgt: new THREE.Vector3(), toTgt: new THREE.Vector3(),
};

function flyTo(preset) {
    fly.active = true;
    fly.t = 0;
    fly.fromPos.copy(camera.position);
    fly.toPos.copy(preset.camPos);
    fly.fromTgt.copy(controls.target);
    fly.toTgt.copy(preset.lookAt);
    controls.enabled = false;
    setActiveButton(preset.name);
}

const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function updateFly(dt) {
    if (!fly.active) return;
    fly.t = Math.min(1, fly.t + dt / fly.dur);
    const e = easeInOut(fly.t);
    camera.position.lerpVectors(fly.fromPos, fly.toPos, e);
    controls.target.lerpVectors(fly.fromTgt, fly.toTgt, e);
    if (fly.t >= 1) {
        fly.active = false;
        controls.enabled = true;
    }
}

/* ============================ 底部视角按钮 ============================ */
const camsBox = document.getElementById('cams');

function buildButtons(presets) {
    const order = ['exterior', 'driver', 'passenger', 'rear'];
    for (const key of order) {
        const p = presets[key];
        const btn = document.createElement('button');
        btn.textContent = p.name;
        btn.dataset.name = p.name;
        btn.addEventListener('click', () => flyTo(p));
        camsBox.appendChild(btn);
    }
    setActiveButton(presets.exterior.name);
}

function setActiveButton(name) {
    [...camsBox.children].forEach((b) => b.classList.toggle('active', b.dataset.name === name));
}

/* ================================= HUD ================================= */
function updateHud() {
    hud.innerHTML = `
        <b>3D 看车 · 多视角切换</b><br>
        ${info}<br>
        机位 = <code>rim_fl/rim_rr/steering_wheel</code> 三个参照点运行时反推<br>
        （车头方向 = 前后轮连线；主驾位置 = 方向盘上方偏后）
    `;
}
updateHud();

/* ================================ 主循环 ================================ */
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    updateFly(dt);
    controls.update();
    renderer.render(scene, camera);
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

window.__demo = { scene, camera, renderer, flyTo, get car() { return scene.children.find((c) => c.isObject3D && c.type === 'Group'); } };
