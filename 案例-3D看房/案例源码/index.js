import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { buildHouse, ROOMS, OVERVIEW } from './model.js';

let width = window.innerWidth;
let height = window.innerHeight;

/* ============================== 场景基建 ============================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11151d);

const camera = new THREE.PerspectiveCamera(50, width / height, 0.05, 300);
camera.position.set(...OVERVIEW.camPos);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

/* CSS2D 渲染器：标识牌用的就是它，pointer-events 必须留给标签点击用 */
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(width, height);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.left = '0px';
document.body.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(...OVERVIEW.lookAt);
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 1.2;
controls.maxDistance = 40;

/* ================================ 灯光 ================================ */
// 没有屋顶，光从上方斜射进来，室内家具都有影子
scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x3a2f22, 0.5));

const sun = new THREE.DirectionalLight(0xfff2dd, 1.7);
sun.position.set(10, 16, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14;
sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 60;
sun.shadow.bias = -0.0005;
scene.add(sun);

/* ============================== 房子 + 标识牌 ============================== */
const { tags } = buildHouse(scene);

/* ============================== 视角飞行 ============================== */
// 简易补间：起飞时记录起点，飞行中按缓动曲线插值位置和注视点
const fly = {
    active: false,
    t: 0,
    dur: 1.4,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTgt: new THREE.Vector3(),
    toTgt: new THREE.Vector3(),
};

function flyTo(preset) {
    fly.active = true;
    fly.t = 0;
    fly.fromPos.copy(camera.position);
    fly.toPos.set(...preset.camPos);
    fly.fromTgt.copy(controls.target);
    fly.toTgt.set(...preset.lookAt);
    controls.enabled = false; // 飞行中禁止用户拖拽，避免打架

    // 高亮当前标签
    tags.forEach(({ div, room }) => div.classList.toggle('active', room.key === preset.key));
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

/* 标识牌点击 → 飞入房间；tooltip 由 CSS :hover 负责 */
for (const { room, div } of tags) {
    div.addEventListener('click', () => flyTo(room));
}

/* ================================= GUI ================================= */
const parms = { room: '全景', back: () => flyTo({ ...OVERVIEW, key: 'overview' }) };

const gui = new GUI({ title: '视角' });
const roomNames = { living: '客厅', master: '主卧', second: '次卧' };
for (const r of ROOMS) {
    gui.add({ go: () => flyTo(r) }, 'go').name('▶ ' + roomNames[r.key]);
}
gui.add(parms, 'back').name('↩ 返回全景');

/* ================================= HUD ================================= */
const hud = document.getElementById('hud');
hud.innerHTML = `
    <b>3D 看房 · 视角切换</b><br>
    标识牌 = <code>CSS2DObject</code>（HTML 元素贴在 3D 坐标上）<br>
    tooltip = 纯 CSS <code>:hover</code> ｜ 切换 = 相机位置 + 注视点同时插值<br>
    户型：客厅 + 主卧 + 次卧（墙体 Box 拼的，门洞是墙上留的缺口）
`;

/* ================================ 主循环 ================================ */
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    updateFly(dt);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
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
    labelRenderer.setSize(width, height);
});

window.__demo = { scene, camera, renderer, flyTo, ROOMS, tags };
