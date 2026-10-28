import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
// RoomEnvironment：程序化生成一个"小房间"环境，给金属提供反射，不需要 HDR 素材
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import sceneGroup, { spheres, directionalLight, ambient } from './model.js';

/**
 * 案例-金属度 —— 场景/相机/参数面板
 */

const scene = new THREE.Scene();
scene.add(sceneGroup);

// 坐标辅助
const axesHelper = new THREE.AxesHelper(240);
scene.add(axesHelper);

const width = window.innerWidth;
const height = window.innerHeight;

const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
camera.position.set(0, 220, 520);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/**
 * 环境贴图：没有它，metalness=1 的球会是一团黑
 * PMREMGenerator 把房间场景烘焙成环境贴图
 */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 70, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 200;
controls.maxDistance = 1600;
controls.update();

/**
 * GUI
 */
const parms = {
    metalness: 0.5,   // 三个球同步调整
    roughness: 0.25,
    envIntensity: 1,
    intensity: 2,
    ambient: 0.2,
    showAxes: true,
    reset() {
        camera.position.set(0, 220, 520);
        controls.target.set(0, 70, 0);
        controls.update();
    },
};

const gui = new GUI({ title: 'MeshStandardMaterial' });

gui.add(parms, 'metalness', 0, 1, 0.01).name('metalness 金属度').onChange((v) => {
    spheres.forEach((s) => (s.material.metalness = v));
});

gui.add(parms, 'roughness', 0, 1, 0.01).name('roughness 粗糙度').onChange((v) => {
    spheres.forEach((s) => (s.material.roughness = v));
});

// 环境反射强度：调到 0 就能看到"金属球变黑"的经典现象
gui.add(parms, 'envIntensity', 0, 3, 0.05).name('环境反射强度').onChange((v) => {
    spheres.forEach((s) => (s.material.envMapIntensity = v));
});

gui.add(parms, 'intensity', 0, 5, 0.1).name('平行光强度').onChange((v) => {
    directionalLight.intensity = v;
});

gui.add(parms, 'ambient', 0, 1, 0.02).name('环境光强度').onChange((v) => {
    ambient.intensity = v;
});

gui.add(parms, 'showAxes').name('显示坐标轴').onChange((v) => {
    axesHelper.visible = v;
});

gui.add(parms, 'reset').name('重置视角');

/**
 * HUD
 */
const hud = document.getElementById('hud');
function updateHUD() {
    const m = spheres[0].material;
    hud.innerHTML =
        `左 <b>metalness 0</b>（绝缘体：塑料）　中 <b>0.5</b>（混合）　右 <b>1</b>（纯金属）<br>` +
        `当前 metalness <b>${m.metalness.toFixed(2)}</b>　roughness <b>${m.roughness.toFixed(2)}</b>　` +
        `环境反射 <b>${m.envMapIntensity.toFixed(2)}</b><br>` +
        `把"环境反射强度"拖到 0：金属球会变黑 —— PBR 金属靠<b>反射环境</b>，不靠漫反射`;
}
updateHUD();
setInterval(updateHUD, 300);

function render() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}
render();

window.onresize = function () {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
};
