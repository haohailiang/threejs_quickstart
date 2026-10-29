import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { createPlaneModel, HALF } from './model.js';

let width = window.innerWidth;
let height = window.innerHeight;

/* ============================ 1. 基础三件套 ============================ */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
// 远处淡出，避免平面边缘生硬地切在屏幕上
scene.fog = new THREE.Fog(0x0b0d12, HALF * 4, HALF * 9);

const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
camera.position.set(150, 130, 190);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

/* CSS2D 渲染器：专门把 HTML 元素（4 个顶点标签）贴在三维坐标上 */
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(width, height);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.left = '0px';
labelRenderer.domElement.style.pointerEvents = 'none'; // 别挡住鼠标拖拽
document.body.appendChild(labelRenderer.domElement);

/* ============================ 2. 控制器 ============================ */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 90;
controls.maxDistance = 700;
// 别让镜头翻到平面下面去，不然只能看到一片背面（虽然开了 DoubleSide 也能看）
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 0, 0);

/* ============================ 3. 模型（本案例主角） ============================ */
const model = createPlaneModel();
scene.add(model.group);

/* 光源：MeshBasicMaterial 不吃光照，这里故意一盏灯都不加 —— 说明 Basic 材质
   的颜色完全由 material.color / 顶点色 / 贴图决定，跟光照无关。 */

/* ============================ 4. GUI 开关 ============================ */
const parms = {
    wireframe: false,   // 线框模式：能直接看到 2 个三角形的剖分
    showVertices: true, // 4 个顶点圆点 + 标签
    vertexColors: true, // ★ 关掉就变纯色，能直观对比"顶点色"的作用
    showAxis: true,     // 坐标辅助
};

const gui = new GUI({ title: '顶点颜色平面' });
gui.add(parms, 'vertexColors').name('顶点色 vertexColors').onChange((v) => {
    model.setVertexColors(v);
    updateHud();
});
gui.add(parms, 'wireframe').name('线框模式 wireframe').onChange((v) => {
    model.setWireframe(v);
});
gui.add(parms, 'showVertices').name('显示 4 个顶点').onChange((v) => {
    model.setShowVertices(v);
});
gui.add(parms, 'showAxis').name('坐标辅助').onChange((v) => {
    model.axesHelper.visible = v;
    model.gridHelper.visible = v;
});

/* ============================ 5. HUD 代码要点 ============================ */
const hud = document.getElementById('hud');
const { vertexCount, triangleCount, colorCount } = model.stats;

function updateHud() {
    hud.innerHTML = `
        <b>BufferGeometry + Float32Array 四色平面</b><br>
        ① <code>positions = new Float32Array(12)</code> —— 4 个顶点 × (x,y,z)<br>
        ② <code>colors = new Float32Array(12)</code> —— 4 个顶点 × (r,g,b)，取值 0~1<br>
        ③ <code>setAttribute('position' | 'color', new THREE.BufferAttribute(arr, 3))</code><br>
        ④ <code>setIndex([0,1,2, 0,2,3])</code> —— 4 个顶点连成 2 个三角形，才成"面"<br>
        ⑤ 材质 <code>vertexColors: true</code> —— 三角形内部颜色由三个顶点自动插值<br>
        当前：顶点 <code>${vertexCount}</code> 个 / 三角面 <code>${triangleCount}</code> 个 /
        颜色分量 <code>${colorCount * 3}</code> 个 ｜ 顶点色：<code>${parms.vertexColors ? '开' : '关'}</code>
    `;
}
updateHud();

/* ============================ 6. 渲染循环 ============================ */
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
animate();

/* ============================ 7. 自适应 ============================ */
window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    labelRenderer.setSize(width, height);
});

// 方便在控制台里玩
window.__demo = { scene, camera, renderer, model, parms };
