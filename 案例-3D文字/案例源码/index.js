import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// 模型：展台 + 3D 文字 + 中文展板
import stage, { textMesh, textParms, rebuildText, plaque } from './model.js';

/**
 * 案例-3D文字 —— 场景/相机/参数面板
 */

// 场景
const scene = new THREE.Scene();
scene.add(stage);

const width = window.innerWidth;
const height = window.innerHeight;

/**
 * 渲染器
 */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

/**
 * 环境贴图：用官方的 RoomEnvironment 程序化生成一个小房间的环境反射
 * 金属材质（metalness 高）没有 environment 反射时会几乎是全黑的，
 * 这也是"金属文字不亮"最常见的原因——不缺灯，缺环境
 */
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
pmremGenerator.dispose();

/**
 * 相机
 */
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
camera.position.set(0, 4.5, 19);

/**
 * 轨道控制器
 */
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.6, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 6;
controls.maxDistance = 40;
controls.maxPolarAngle = Math.PI / 2 + 0.1;
controls.update();

/**
 * 灯光：environment 负责反射，这里再加两盏彩色点光做"氛围高光"
 */
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

const warm = new THREE.PointLight(0xffb14d, 10, 60, 2);
warm.position.set(-8, 6, 8);
scene.add(warm);

const cool = new THREE.PointLight(0x4db8ff, 10, 60, 2);
cool.position.set(9, 5, 6);
scene.add(cool);

/**
 * GUI：实时调整 3D 文字
 * 文字内容用 onFinishChange（输完再重建），数值参数用 onChange（拖动实时重建）
 */
const parms = {
    autoRotate: true,
    showPlaque: true,
    reset() {
        camera.position.set(0, 4.2, 19);
        controls.target.set(0, 1.6, 0);
        controls.update();
    },
};

const gui = new GUI({ title: '3D 文字' });

gui.add(textParms, 'text').name('文字内容（英文）').onFinishChange(rebuildText);
gui.add(textParms, 'size', 0.5, 3, 0.1).name('字号 size').onChange(rebuildText);
gui.add(textParms, 'height', 0, 2, 0.05).name('挤出厚度 height').onChange(rebuildText);
gui.add(textParms, 'curveSegments', 2, 24, 1).name('曲线分段').onChange(rebuildText);
gui.add(textParms, 'bevelEnabled').name('倒角').onChange(rebuildText);
gui.add(textParms, 'bevelThickness', 0, 0.2, 0.01).name('倒角厚度').onChange(rebuildText);
gui.add(textParms, 'bevelSize', 0, 0.15, 0.005).name('倒角尺寸').onChange(rebuildText);
gui.add(parms, 'autoRotate').name('自动旋转');
gui.add(parms, 'showPlaque').name('显示中文展板').onChange((v) => (plaque.visible = v));
gui.add(parms, 'reset').name('重置视角');

/**
 * 左下角信息面板
 */
const hud = document.getElementById('hud');
let frameCount = 0;
function updateHUD() {
    const loaded = !!textMesh.geometry?.attributes?.position?.count;
    hud.innerHTML =
        `真3D文字（TextGeometry）<b>${loaded ? '已加载' : '字体加载中…'}</b><br>` +
        (loaded
            ? `包围盒 <b>${textMesh.userData.size}</b>　三角面数 <b>${textMesh.userData.tris}</b><br>`
            : '') +
        `中文文字（Canvas纹理）<b>三维可视化</b>　展板贴图尺寸随文字宽度自适应<br>` +
        `改参数会重建几何体（旧的已 dispose，不会内存泄漏）`;
}

/**
 * 渲染循环
 */
function render() {
    if (parms.autoRotate) {
        textMesh.rotation.y += 0.006;
        // 呼吸式上下浮动
        textMesh.position.y = 2.8 + Math.sin(Date.now() * 0.0012) * 0.25;
    }

    controls.update();
    renderer.render(scene, camera);

    if (++frameCount % 12 === 0) updateHUD();

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
