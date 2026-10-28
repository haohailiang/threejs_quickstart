import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import sceneGroup, { sphere, directionalLight, ambient } from './model.js';

/**
 * 案例-Phong材质 —— 场景/相机/参数面板
 */

const scene = new THREE.Scene();
scene.add(sceneGroup);

// 坐标辅助：看清世界坐标系（X红 / Y绿 / Z蓝）
const axesHelper = new THREE.AxesHelper(220);
scene.add(axesHelper);

const width = window.innerWidth;
const height = window.innerHeight;

const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
camera.position.set(280, 240, 380);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 60, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 150;
controls.maxDistance = 1200;
controls.update();

/**
 * GUI
 */
const parms = {
    shininess: 60,
    specular: '#ffffff',
    intensity: 2,
    ambient: 0.25,
    showAxes: true,
    reset() {
        camera.position.set(280, 240, 380);
        controls.target.set(0, 60, 0);
        controls.update();
    },
};

const gui = new GUI({ title: 'MeshPhongMaterial' });

// 高光锐度：0 = 几乎没高光（接近 Lambert），200 = 又小又亮的瓷亮点
gui.add(parms, 'shininess', 0, 300, 1).name('shininess 高光锐度').onChange((v) => {
    sphere.material.shininess = v;
});

// 高光颜色：改成和物体同色，高光就"融"进表面；改成白色最像塑料
gui.addColor(parms, 'specular').name('specular 高光颜色').onChange((v) => {
    sphere.material.specular.set(v);
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
    hud.innerHTML =
        `shininess <b>${sphere.material.shininess.toFixed(0)}</b>　` +
        `高光色 <b>#${sphere.material.specular.getHexString()}</b><br>` +
        `<b>Phong = 漫反射 + 镜面高光</b>：高光斑的位置由"光线反射方向"和"视线方向"决定<br>` +
        `shininess 越大 → 高光斑越小越锐（塑料/瓷器感）；越小 → 越散（哑光）`;
}
updateHUD();
setInterval(updateHUD, 300);

/**
 * 渲染循环
 */
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
