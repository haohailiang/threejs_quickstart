import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import sceneGroup, { sphere, directionalLight, ambient, mapTexture, displacementTexture } from './model.js';

/**
 * 案例-位移贴图 —— 场景/相机/参数面板
 */

const scene = new THREE.Scene();
scene.add(sceneGroup);

// 坐标辅助
const axesHelper = new THREE.AxesHelper(240);
scene.add(axesHelper);

const width = window.innerWidth;
const height = window.innerHeight;

const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
camera.position.set(230, 250, 420);

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
controls.maxDistance = 1400;
controls.update();

/**
 * GUI
 */
const parms = {
    displacementScale: 12,
    showMap: true,      // 是否显示颜色贴图
    wireframe: false,   // 线框：能看清顶点到底被推成什么样
    textureRepeat: 2,
    intensity: 2.4,
    ambient: 0.35,
    showAxes: true,
    reset() {
        camera.position.set(230, 250, 420);
        controls.target.set(0, 80, 0);
        controls.update();
    },
};

const gui = new GUI({ title: 'displacementMap' });

// 位移强度：0 = 回到光滑球，越大凹凸越夸张
gui.add(parms, 'displacementScale', 0, 40, 0.5).name('位移强度').onChange((v) => {
    sphere.material.displacementScale = v;
    sphere.material.displacementBias = -v / 2; // 保持以原表面为中心鼓/凹
});

gui.add(parms, 'showMap').name('显示颜色贴图').onChange((v) => {
    sphere.material.map = v ? mapTexture : null;
    sphere.material.needsUpdate = true;
});

gui.add(parms, 'wireframe').name('线框模式').onChange((v) => {
    sphere.material.wireframe = v;
});

gui.add(parms, 'textureRepeat', 1, 6, 1).name('贴图平铺次数').onChange((v) => {
    mapTexture.repeat.set(v, v / 2);
    displacementTexture.repeat.set(v, v / 2);
    // 只改了 repeat，贴图本身没变，不需要 needsUpdate
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
const hudText = () => {
    const g = sphere.geometry;
    const verts = g.attributes.position.count;
    hud.innerHTML =
        `位移强度 <b>${sphere.material.displacementScale.toFixed(1)}</b>　` +
        `顶点数 <b>${verts.toLocaleString()}</b>（${g.parameters.widthSegments}×${g.parameters.heightSegments} 段）<br>` +
        `<b>位移贴图是真的移动顶点</b>：亮=往外鼓，暗=往里凹，轮廓会变<br>` +
        `分段太少就没效果 —— 拖到 0 再慢慢加，能看到球"长颗粒"的过程`;
};
hudText();
setInterval(hudText, 500);

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
