import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// 模型：Lambert 球体 + 地面 + 平行光 + 辅助对象
import sceneGroup, {
    sphere,
    directionalLight,
    ambient,
    lightHelper,
    shadowCamHelper,
} from './model.js';

/**
 * 案例-平行光与阴影 —— 场景/相机/参数面板
 */

// 场景
const scene = new THREE.Scene();
scene.add(sceneGroup);

const width = window.innerWidth;
const height = window.innerHeight;

/**
 * 相机
 */
const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
camera.position.set(320, 260, 420);

/**
 * 渲染器
 * 投影（阴影）默认是关闭的，必须显式开启
 */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;                 // 开启阴影功能
renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // 边缘柔化，比默认的硬边好看
document.body.appendChild(renderer.domElement);

/**
 * 轨道控制器
 */
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 60, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 150;
controls.maxDistance = 1400;
controls.update();

/**
 * GUI 参数面板
 */
const R = 460; // 光源到原点的距离（只影响辅助对象画在哪，不影响光照效果）

const parms = {
    azimuth: 40,      // 方位角：绕 Y 轴转，决定亮面在左还是右
    elevation: 42,    // 高度角：决定光从多高的地方射下来
    intensity: 2.2,
    ambient: 0.12,
    castShadow: true,
    showHelper: true,
    showShadowCam: false,
    reset() {
        camera.position.set(320, 260, 420);
        controls.target.set(0, 60, 0);
        controls.update();
    },
};

// 由方位角/高度角算出平行光的 position，并同步所有辅助对象
function updateLightDirection() {
    const az = THREE.MathUtils.degToRad(parms.azimuth);
    const el = THREE.MathUtils.degToRad(parms.elevation);
    directionalLight.position.set(
        R * Math.cos(el) * Math.sin(az),
        R * Math.sin(el),
        R * Math.cos(el) * Math.cos(az)
    );
    // 辅助对象不会自动跟随，改完位置要手动 update
    lightHelper.update();
    shadowCamHelper.update();
}

const gui = new GUI({ title: '平行光 + Lambert' });

gui.add(parms, 'azimuth', 0, 360, 1).name('光源方位角').onChange(updateLightDirection);
gui.add(parms, 'elevation', 5, 89, 1).name('光源高度角').onChange(updateLightDirection);

gui.add(parms, 'intensity', 0, 4, 0.1).name('平行光强度').onChange((v) => {
    directionalLight.intensity = v;
});

// 环境光越小，明暗对比越强；调到 0 暗面就是纯黑
gui.add(parms, 'ambient', 0, 0.8, 0.02).name('环境光强度').onChange((v) => {
    ambient.intensity = v;
});

// 阴影开关，用来对比"开/关阴影"的差别（也演示 renderer.shadowMap 才是总开关）
gui.add(parms, 'castShadow').name('平行光投影').onChange((v) => {
    directionalLight.castShadow = v;
});

gui.add(parms, 'showHelper').name('光源辅助对象').onChange((v) => {
    lightHelper.visible = v;
});

gui.add(parms, 'showShadowCam').name('阴影相机辅助').onChange((v) => {
    if (v) scene.add(shadowCamHelper);
    else scene.remove(shadowCamHelper);
});

gui.add(parms, 'reset').name('重置视角');

/**
 * 左下角说明面板
 */
const hud = document.getElementById('hud');
function updateHUD() {
    const dir = directionalLight.position.clone().normalize();
    hud.innerHTML =
        `光方向 <b>(${dir.x.toFixed(2)}, ${dir.y.toFixed(2)}, ${dir.z.toFixed(2)})</b><br>` +
        `平行光强度 <b>${directionalLight.intensity.toFixed(1)}</b>　` +
        `环境光 <b>${ambient.intensity.toFixed(2)}</b><br>` +
        `<b>大半个球亮、小半个球暗</b>：亮暗是法线与光线夹角决定的，不是贴图`;
}
updateHUD();
setInterval(updateHUD, 300);

/**
 * 渲染循环
 * 球体本身很慢很慢地自转，方便观察明暗交界随角度变化
 */
function render() {
    sphere.rotation.y += 0.002;

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}
updateLightDirection(); // 初始化光源位置
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
