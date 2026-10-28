import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import sceneGroup, { ballPlain, ballCoated, hood, directionalLight, ambient } from './model.js';

/**
 * 案例-清漆度 —— 场景/相机/参数面板
 */

const scene = new THREE.Scene();
scene.add(sceneGroup);

// 坐标辅助
const axesHelper = new THREE.AxesHelper(240);
scene.add(axesHelper);

const width = window.innerWidth;
const height = window.innerHeight;

const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
camera.position.set(0, 220, 480);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// 环境反射：清漆层的反光也要有东西可反射，否则看不出"亮油"效果
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 70, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 200;
controls.maxDistance = 1500;
controls.update();

/**
 * GUI
 */
const parms = {
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    roughness: 0.55,   // 底漆粗糙度
    lightAzimuth: -40,
    autoRotate: false,
    showAxes: true,
    reset() {
        camera.position.set(0, 220, 480);
        controls.target.set(0, 70, 0);
        controls.update();
    },
};

const gui = new GUI({ title: 'MeshPhysicalMaterial 清漆' });

// 清漆强度：0 → 右球变得和左球一样；1 → 明显一层"亮油"
gui.add(parms, 'clearcoat', 0, 1, 0.01).name('clearcoat 清漆度').onChange((v) => {
    ballCoated.material.clearcoat = v;
    hood.material.clearcoat = v;
});

// 清漆层粗糙度：越小反光越锐利（镜面亮油），越大越像半哑光保护漆
gui.add(parms, 'clearcoatRoughness', 0, 1, 0.01).name('clearcoat 粗糙度').onChange((v) => {
    ballCoated.material.clearcoatRoughness = v;
    hood.material.clearcoatRoughness = v;
});

// 底漆粗糙度：只影响底下的漆面，不影响清漆层的反光
gui.add(parms, 'roughness', 0, 1, 0.01).name('底漆粗糙度').onChange((v) => {
    ballPlain.material.roughness = v;
    ballCoated.material.roughness = v;
    hood.material.roughness = v;
});

// 转光源方位，看清漆层的高光如何滑动
gui.add(parms, 'lightAzimuth', -180, 180, 1).name('光源方位角').onChange(updateLight);

gui.add(parms, 'autoRotate').name('光源自动旋转');
gui.add(parms, 'showAxes').name('显示坐标轴').onChange((v) => {
    axesHelper.visible = v;
});
gui.add(parms, 'reset').name('重置视角');

const LIGHT_R = 400;
function updateLight() {
    const az = THREE.MathUtils.degToRad(parms.lightAzimuth);
    directionalLight.position.set(LIGHT_R * Math.sin(az), 300, LIGHT_R * Math.cos(az));
}
updateLight();

/**
 * HUD
 */
const hud = document.getElementById('hud');
function updateHUD() {
    const m = ballCoated.material;
    hud.innerHTML =
        `左：<b>clearcoat 0</b>（普通哑光红漆）　右：<b>clearcoat ${m.clearcoat.toFixed(2)}</b>（亮面车漆）<br>` +
        `清漆层粗糙度 <b>${m.clearcoatRoughness.toFixed(2)}</b>　底漆粗糙度 <b>${m.roughness.toFixed(2)}</b><br>` +
        `清漆层是<b>额外一层透明涂层</b>，它有自己的反光：底漆可以哑，表面照样锃亮`;
}
updateHUD();
setInterval(updateHUD, 300);

/**
 * 渲染循环
 */
function render() {
    if (parms.autoRotate) {
        parms.lightAzimuth = ((parms.lightAzimuth + 180 + 0.5) % 360) - 180;
        updateLight();
    }

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
