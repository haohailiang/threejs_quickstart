import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// 模型：木纹球（alphaMap 镂空）+ 背景圆环
import sceneGroup, { sphere, alphaParms, drawAlphaTexture } from './model.js';

/**
 * 案例-透明度贴图 —— 场景/相机/GUI
 */

// 场景
const scene = new THREE.Scene();
scene.add(sceneGroup);

const width = window.innerWidth;
const height = window.innerHeight;

/**
 * 相机
 */
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 3000);
camera.position.set(0, 30, 260);

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
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 120;
controls.maxDistance = 800;
controls.update();

/**
 * 地面网格（参照物：透过镂空能看到的第二层）
 */
const grid = new THREE.GridHelper(600, 24, 0x3a4150, 0x232830);
grid.position.y = -110;
scene.add(grid);

/**
 * GUI：实时调节透明度贴图
 */
const parms = {
    transparent: true,   // 是否允许材质透明（alphaMap 生效的前提）
    opacity: 1.0,        // 整体透明度
    useAlphaMap: true,   // 是否使用透明度贴图
    autoRotate: true,
    reset() {
        camera.position.set(0, 30, 260);
        controls.target.set(0, 0, 0);
        controls.update();
    },
};

const gui = new GUI({ title: '透明度贴图' });

// 最关键的开关：关掉 transparent，即使 alphaMap 还挂着，镂空也会立刻消失
gui.add(parms, 'transparent').name('transparent 透明开关').onChange((v) => {
    sphere.material.transparent = v;
    sphere.material.needsUpdate = true; // transparent 状态变化要重新编译材质
});

// 整体透明度：和 alphaMap 相乘——白色区域的实际透明度就由它决定
gui.add(parms, 'opacity', 0, 1, 0.05).name('opacity 整体透明度').onChange((v) => {
    sphere.material.opacity = v;
});

// alphaMap 的开关：直观对比"有没有透明度贴图"的差别
gui.add(parms, 'useAlphaMap').name('启用 alphaMap').onChange((v) => {
    sphere.material.alphaMap = v ? sphere.userData.alphaMap : null;
    sphere.material.needsUpdate = true; // 贴图增减也要重新编译材质
});

// 条纹对数：重画 Canvas，条纹密度实时变
gui.add(alphaParms, 'stripes', 1, 24, 1).name('条纹数量').onChange(drawAlphaTexture);

// 反转黑白：黑色(透明)和白色(不透明)互换，镂空位置对调
gui.add(alphaParms, 'invert').name('反转黑白').onChange(drawAlphaTexture);

gui.add(parms, 'autoRotate').name('自动旋转');
gui.add(parms, 'reset').name('重置视角');

// 把初始 alphaMap 记下来，GUI 开关要用
sphere.userData.alphaMap = sphere.material.alphaMap;

/**
 * 左下角说明面板
 */
const hud = document.getElementById('hud');
hud.innerHTML =
    `alphaMap 原理：<b>黑色→完全透明</b>，<b>白色→完全不透明</b><br>` +
    `必要条件：材质开 <b>transparent: true</b>；opacity 与 alphaMap 相乘<br>` +
    `试试：<b>关闭 transparent</b>（镂空消失）、<b>反转黑白</b>（镂空互换）、<b>opacity 拉低</b>`;

/**
 * 渲染循环
 */
function render() {
    if (parms.autoRotate) {
        sphere.rotation.y += 0.004;
    }

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}
render();

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
