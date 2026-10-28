import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// 模型：贴图球（alphaMap）+ 背景星星
import sceneGroup, { sphere, material, stars, rebuildAlphaMap } from './model.js';

/**
 * 案例-alphaMap透明度贴图 —— 场景/相机/参数面板
 */

// 场景
const scene = new THREE.Scene();
scene.add(sceneGroup);

const width = window.innerWidth;
const height = window.innerHeight;

/**
 * 相机
 */
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
camera.position.set(0, 20, 220);

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
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 100;
controls.maxDistance = 500;
controls.update();

/**
 * GUI 参数面板
 */
const parms = {
    transparent: true,   // 课件"注意"：透明度需要材质开启 transparent 属性
    useAlphaMap: true,
    stripes: 7,
    opacity: 1.0,
    autoRotate: true,
    rotateSpeed: 0.5,
    reset() {
        camera.position.set(0, 20, 220);
        controls.target.set(0, 0, 0);
        controls.update();
    },
};

const gui = new GUI({ title: 'alphaMap 透明度贴图' });

// 开关 transparent：关掉后 alphaMap 失效，球变回实心（直观演示课件的"注意"）
gui.add(parms, 'transparent').name('transparent 透明').onChange((v) => {
    material.transparent = v;
    material.needsUpdate = true;
});

gui.add(parms, 'useAlphaMap').name('启用 alphaMap').onChange((v) => {
    material.alphaMap = v ? material.alphaMap : null;
    material.needsUpdate = true;
});

// 改条纹数量 → 重建 alphaMap（Canvas 重新画）
gui.add(parms, 'stripes', 1, 20, 1).name('条纹数量').onFinishChange((v) => {
    rebuildAlphaMap(Math.round(v));
});

// opacity 整体透明度（课件注释里的 opacity: 0.1，和 alphaMap 是叠加关系）
gui.add(parms, 'opacity', 0, 1, 0.05).name('整体 opacity').onChange((v) => {
    material.opacity = v;
});

gui.add(parms, 'autoRotate').name('球体自转');
gui.add(parms, 'rotateSpeed', 0.1, 3, 0.1).name('自转速度');
gui.add(parms, 'reset').name('重置视角');

/**
 * 左下角说明面板
 */
const hud = document.getElementById('hud');
function updateHUD() {
    hud.innerHTML =
        `alphaMap 原理：<b>黑色 → 完全透明</b>　<b>白色 → 完全不透明</b><br>` +
        `transparent: <b>${material.transparent ? 'true' : 'false'}</b>（关掉就不透明了）　` +
        `opacity: <b>${material.opacity.toFixed(2)}</b><br>` +
        `透过条纹看到的是背景的<b>星星</b>，说明那是真的透明`;
}
updateHUD();
setInterval(updateHUD, 300);

/**
 * 渲染循环
 */
function render() {
    if (parms.autoRotate) {
        sphere.rotation.y += parms.rotateSpeed * 0.01;
        // 星星反向慢转，增强穿透感
        stars.rotation.y -= 0.0004;
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
