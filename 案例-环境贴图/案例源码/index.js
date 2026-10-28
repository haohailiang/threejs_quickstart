import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import sceneGroup, { cubeTexture, metalBall, satellites, ground, directionalLight, ambient } from './model.js';

/**
 * 案例-环境贴图 —— 场景/相机/参数面板
 */

const scene = new THREE.Scene();
scene.add(sceneGroup);

// 把同一个立方体纹理直接当场景背景：四周就能看到"对应的环境"本身
scene.background = cubeTexture;

// 坐标辅助
const axesHelper = new THREE.AxesHelper(240);
scene.add(axesHelper);

const width = window.innerWidth;
const height = window.innerHeight;

const camera = new THREE.PerspectiveCamera(50, width / height, 1, 4000);
camera.position.set(260, 190, 380);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 80, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 150;
controls.maxDistance = 1800;
controls.update();

/**
 * GUI
 */
const parms = {
    envIntensity: 1,
    roughness: 0.05,
    metalness: 1,
    showBackground: true,
    showAxes: true,
    autoRotateCamera: false,
    reset() {
        camera.position.set(260, 190, 380);
        controls.target.set(0, 80, 0);
        controls.update();
    },
};

const gui = new GUI({ title: 'CubeTexture 环境贴图' });

// 环境反射强度：0 = 金属球变黑（因为金属不漫反射，全靠反射环境）
gui.add(parms, 'envIntensity', 0, 3, 0.05).name('环境反射强度').onChange((v) => {
    metalBall.material.envMapIntensity = v;
    satellites.forEach((s) => (s.material.envMapIntensity = v));
    ground.material.envMapIntensity = v;
});

gui.add(parms, 'roughness', 0, 1, 0.01).name('中央球粗糙度').onChange((v) => {
    metalBall.material.roughness = v;
});

gui.add(parms, 'metalness', 0, 1, 0.01).name('中央球金属度').onChange((v) => {
    metalBall.material.metalness = v;
});

gui.add(parms, 'showBackground').name('显示环境背景').onChange((v) => {
    scene.background = v ? cubeTexture : new THREE.Color(0x0b0d12);
});

gui.add(parms, 'autoRotateCamera').name('相机自动环绕');
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
        `环境贴图：<b>CubeTexture</b>（6 张面图，顺序 px/nx/py/ny/pz/nz）<br>` +
        `中央球 metalness <b>${metalBall.material.metalness.toFixed(2)}</b>　` +
        `roughness <b>${metalBall.material.roughness.toFixed(2)}</b>　` +
        `反射强度 <b>${metalBall.material.envMapIntensity.toFixed(2)}</b><br>` +
        `球的镜面上看到的是<b>四周环境</b>；粗糙度越大反射越模糊（像磨砂金属）`;
}
updateHUD();
setInterval(updateHUD, 300);

/**
 * 渲染循环
 */
let autoAngle = 0;
function render() {
    // 三个环面结慢慢自转，反射的高光会流动
    satellites.forEach((s, i) => {
        s.rotation.x += 0.004 + i * 0.001;
        s.rotation.y += 0.006;
    });

    if (parms.autoRotateCamera) {
        autoAngle += 0.003;
        const r = Math.hypot(camera.position.x, camera.position.z);
        camera.position.x = Math.sin(autoAngle) * r;
        camera.position.z = Math.cos(autoAngle) * r;
        camera.lookAt(controls.target);
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
