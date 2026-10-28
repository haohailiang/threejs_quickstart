import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 模型：正方体 + 头顶文字
import sceneGroup, { cube, label, COLOR_BLUE, COLOR_RED, SIZE } from './model.js';

/**
 * 案例-点击正方体换色 —— 场景/相机/点击拾取
 */

// 场景
const scene = new THREE.Scene();
scene.add(sceneGroup);

// 世界坐标系辅助线：X 红 / Y 绿 / Z 蓝
const axesHelper = new THREE.AxesHelper(180);
scene.add(axesHelper);

// 地面网格：让"正方体在世界原点"这件事看得见
const grid = new THREE.GridHelper(600, 12, 0x3a4150, 0x232830);
scene.add(grid);

const width = window.innerWidth;
const height = window.innerHeight;

/**
 * 相机：站在第一卦限斜上方看原点（经典 3/4 视角）
 */
const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
camera.position.set(220, 180, 260);
camera.lookAt(0, 20, 0);

/**
 * 渲染器
 */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

/**
 * 轨道控制器
 */
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 20, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 150;
controls.maxDistance = 900;
controls.update();

/**
 * 光源
 */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.4);
directionalLight.position.set(300, 400, 200);
scene.add(directionalLight);

/**
 * ========== 核心：Raycaster 点击拾取 + 红蓝切换 ==========
 */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// 切换状态与目标颜色（渲染循环里做颜色渐变，比瞬间切换更顺眼）
let isRed = false;
let targetColor = COLOR_BLUE;
let clickCount = 0;

const hud = document.getElementById('hud');

function updateHUD() {
    const c = cube.material.color;
    const hex = '#' + c.getHexString();
    hud.innerHTML =
        `正方体位置 <b>(${cube.position.x}, ${cube.position.y}, ${cube.position.z})</b>　世界原点<br>` +
        `当前颜色 <b>${hex}</b><span class="swatch" style="background:${hex}"></span><br>` +
        `点击次数 <b>${clickCount}</b>`;
}

function pick(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    // 屏幕坐标 → NDC 标准设备坐标（-1 ~ 1），y 轴要取反
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    // 只检测正方体（不需要 recursive，因为就一个 mesh）
    const hits = raycaster.intersectObject(cube, false);
    if (hits.length > 0) {
        isRed = !isRed;
        targetColor = isRed ? COLOR_RED : COLOR_BLUE;
        clickCount++;
        // 点一下弹一下：瞬间放大到 1.08，渲染循环里再弹回 1
        cube.scale.setScalar(1.08);
    }
}

const el = renderer.domElement;

// 区分「点击」和「拖拽」：OrbitControls 旋转视角也是按下-移动-抬起，
// 如果不判断移动距离，每次旋转视角只要起点落在正方体上就会误触发换色
let downPos = null;
el.addEventListener('pointerdown', (e) => {
    downPos = { x: e.clientX, y: e.clientY };
});
el.addEventListener('click', (e) => {
    if (downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 5) return;
    pick(e);
});

// 鼠标悬停在正方体上时光标变成"手"，提示可点击
el.addEventListener('pointermove', (e) => {
    const rect = el.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    el.style.cursor = raycaster.intersectObject(cube, false).length > 0 ? 'pointer' : 'default';
});

/**
 * 渲染循环
 */
function render() {
    // 颜色渐变：当前色每帧向目标色靠近 15%
    cube.material.color.lerp(targetColor, 0.15);

    // 弹回动画：scale 从 1.08 平滑回到 1
    cube.scale.lerp(new THREE.Vector3(1, 1, 1), 0.12);

    // 文字跟着呼吸浮动，强化"挂在正方体上方"的感觉
    label.position.y = SIZE / 2 + 35 + Math.sin(Date.now() * 0.002) * 4;

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}
render();
updateHUD();

// 点击后 HUD 会有渐变过程，定时刷新即可
setInterval(updateHUD, 200);

/**
 * 画布跟随窗口变化
 */
window.onresize = function () {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
};
