import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import sceneGroup, {
    sphereSmooth,
    sphereNormal,
    directionalLight,
    warmLight,
    coolLight,
    ambient,
    normalTexture,
} from './model.js';

/**
 * 案例-法线贴图 —— 场景/相机/参数面板
 */

const scene = new THREE.Scene();
scene.add(sceneGroup);

// 坐标辅助
const axesHelper = new THREE.AxesHelper(240);
scene.add(axesHelper);

const width = window.innerWidth;
const height = window.innerHeight;

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 3000);
camera.position.set(0, 180, 420);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// 环境反射（金属球没环境反射就是黑的）
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 70, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 180;
controls.maxDistance = 1400;
controls.update();

/**
 * GUI
 */
const parms = {
    normalScale: 1,
    lightAzimuth: 45,   // 光源方位角：转动它，观察两个球高光的差异
    lightIntensity: 2.6,
    autoRotateLight: true,
    showAxes: true,
    reset() {
        camera.position.set(0, 180, 420);
        controls.target.set(0, 70, 0);
        controls.update();
    },
};

const gui = new GUI({ title: 'normalMap 法线贴图' });

// 法线强度：0 = 等于没有法线贴图（两球变一样），越大凹凸越夸张
gui.add(parms, 'normalScale', 0, 4, 0.05).name('法线强度 normalScale').onChange((v) => {
    // normalScale 是 Vector2，直接影响光照里法线的 xy 分量
    sphereNormal.material.normalScale.set(v, v);
});

// 方位角：光源绕着场景转
gui.add(parms, 'lightAzimuth', 0, 360, 1).name('光源方位角').onChange(updateLight);

gui.add(parms, 'lightIntensity', 0, 6, 0.1).name('平行光强度').onChange((v) => {
    directionalLight.intensity = v;
});

gui.add(parms, 'autoRotateLight').name('光源自动旋转');

gui.add(parms, 'showAxes').name('显示坐标轴').onChange((v) => {
    axesHelper.visible = v;
});

gui.add(parms, 'reset').name('重置视角');

// 由方位角计算平行光位置（顺时针绕 Y 轴转）
const LIGHT_R = 420;
const LIGHT_H = 300;
function updateLight() {
    const az = THREE.MathUtils.degToRad(parms.lightAzimuth);
    directionalLight.position.set(
        LIGHT_R * Math.sin(az),
        LIGHT_H,
        LIGHT_R * Math.cos(az)
    );
    // 两盏彩色点光跟着反向转，保证总有彩色的反射落在球上
    warmLight.position.set(-LIGHT_R * 0.7 * Math.cos(az), 180, LIGHT_R * 0.7 * Math.sin(az));
    coolLight.position.set(LIGHT_R * 0.7 * Math.cos(az), 160, -LIGHT_R * 0.7 * Math.sin(az));
}
updateLight();

/**
 * HUD
 */
const hud = document.getElementById('hud');
function updateHUD() {
    hud.innerHTML =
        `左：<b>无法线贴图</b>（光滑，一个大高光）　右：<b>有法线贴图</b>（高光被打碎）<br>` +
        `normalScale <b>(${sphereNormal.material.normalScale.x.toFixed(2)}, ${sphereNormal.material.normalScale.y.toFixed(2)})</b>　` +
        `光源方位角 <b>${parms.lightAzimuth.toFixed(0)}°</b><br>` +
        `法线贴图改的是<b>每个像素的法线方向</b> → 反射方向不同 → 看起来有凹凸，但轮廓仍是光滑球`;
}
updateHUD();
setInterval(updateHUD, 300);

/**
 * 渲染循环
 */
function render() {
    if (parms.autoRotateLight) {
        parms.lightAzimuth = (parms.lightAzimuth + 0.4) % 360;
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
