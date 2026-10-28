import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// 模型：公园天空盒 + 景点光点
import panorama, { hotspots, RADIUS } from './model.js';

/**
 * 案例-全景公园 —— 场景/相机/交互部分
 */

// 场景
const scene = new THREE.Scene();
scene.add(panorama);

const width = window.innerWidth;
const height = window.innerHeight;

/**
 * 相机
 * 全景图的相机和普通场景不一样：相机固定在天空盒中心，靠「转头」看四周，不靠移动位置
 * near 给小一点（0.1），far 要大于盒子尺寸（5000）
 */
const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 20000);
camera.position.set(0, 0, 0);

// 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
// r148 的色彩空间标记，配合贴图的 texture.encoding 一起用
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

/**
 * CSS2D 渲染器：专门用来渲染 HTML 标签（景点名字）
 * 它自己不画三维内容，只是把 DOM 元素按三维坐标"投影"到屏幕上
 */
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(width, height);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
// 关键：不让标签拦截鼠标事件，否则拖拽/点击都会失效
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

/**
 * 视角状态：用「经度 lon / 纬度 lat」两个角度描述"在看哪里"
 * 相机永远在球心，只改变 lookAt 的方向
 */
let lon = 90;   // 水平方向，-180 ~ 180（90° 正对荷花池，作为开场画面）
let lat = -4;   // 垂直方向，-85 ~ 85（限制范围，避免看到球体正上/正下方的极点畸变）
const target = { lon: 90, lat: -4 };  // 阻尼动画的目标角度

/**
 * 根据 lon / lat 更新相机的朝向
 * 球坐标：phi 是极角（从 +Y 轴量起），theta 是方位角
 */
const lookDir = new THREE.Vector3();
function updateCamera() {
    lookDir.setFromSphericalCoords(
        1,
        THREE.MathUtils.degToRad(90 - lat),
        THREE.MathUtils.degToRad(lon)
    );
    camera.lookAt(lookDir);
}
updateCamera();

/**
 * 为什么这里不用 OrbitControls？
 * OrbitControls 的原理是「让相机绕着 target 点公转」，
 * 相机离 target 必须有距离才转得动；而全景图的相机必须钉死在天空盒中心，
 * 距离为 0 时球坐标退化，controls 会算不出方向。
 * 所以全景场景一般自己实现拖拽转视角（见下面的 pointerdown / pointermove），
 * 思路就是改 lookAt 的方向向量，而不是改相机的位置。
 */

/**
 * 鼠标拖拽 → 转视角
 */
const el = renderer.domElement;
let dragging = false;
let lastX = 0;
let lastY = 0;
let moveDistance = 0;      // 本次按下后累计移动了多少像素，用来区分「点击」和「拖拽」
let pointerStart = { x: 0, y: 0 };

el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;   // 只响应左键
    dragging = true;
    moveDistance = 0;
    lastX = pointerStart.x = e.clientX;
    lastY = pointerStart.y = e.clientY;
    el.style.cursor = 'grabbing';
    el.setPointerCapture(e.pointerId);
});

el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    moveDistance += Math.abs(dx) + Math.abs(dy);

    // 拖得越快视野转得越多；fov 越小（画面越"长焦"）转得越慢，手感更一致
    const k = 0.09 * (camera.fov / 70);
    target.lon -= dx * k;
    target.lat += dy * k;
    target.lat = THREE.MathUtils.clamp(target.lat, -85, 85);

    // 手动拖拽时暂停自动旋转
    parms.autoRotate = false;
    gui && gui.controllersRecursive().forEach((c) => c.updateDisplay());
});

el.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    el.style.cursor = 'grab';
    el.releasePointerCapture?.(e.pointerId);
    // 移动距离很小 → 认为是"点击"，去做拾取
    if (moveDistance < 6) pick(e);
});

el.addEventListener('pointerleave', () => {
    if (dragging) return;
    el.style.cursor = 'grab';
});
el.style.cursor = 'grab';

/**
 * 滚轮 → 变焦
 * 全景图里不能靠"往前走"来放大（人是站在天空盒中心的），等效的做法是改 fov：
 * fov 小 = 长焦 = 画面被放大；fov 大 = 广角 = 看得更宽
 */
el.addEventListener('wheel', (e) => {
    e.preventDefault();
    camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.05, 25, 95);
    camera.updateProjectionMatrix();
    parms.fov = camera.fov;
    gui && gui.controllersRecursive().forEach((c) => c.updateDisplay());
}, { passive: false });

/**
 * 射线拾取：点击景点光点，平滑地转过去
 */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const toast = document.getElementById('toast');
let toastTimer = null;

function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function pick(e) {
    // 参数面板关掉「显示景点」之后就别再响应点击了
    // （r148 的 Raycaster 不检查 object.visible，隐藏了照样能命中，所以手动挡一下）
    if (!parms.showHotspots) return;

    const rect = el.getBoundingClientRect();
    // 屏幕坐标 → NDC 标准设备坐标（-1 ~ 1），注意 y 轴要取反
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    // 第二个参数要传 true：每个光点下面挂着一个「隐形拾取代理」Sprite 当点击热区，
    // 不递归就只测光点本体（屏幕直径才 20px，几乎点不中）
    const hits = raycaster.intersectObjects(hotspots, true);
    if (hits.length > 0) {
        const { name, lon: tLon, lat: tLat } = hits[0].object.userData;
        // 走最近的等价经度，避免绕远路（比如从 170° 转到 -170°，只该转 20°）
        let delta = ((tLon - target.lon + 540) % 360) - 180;
        target.lon = target.lon + delta;
        target.lat = tLat;

        /**
         * 【修复】点击景点后必须把自动旋转关掉
         *
         * render() 里有一句 `if (parms.autoRotate && !dragging) target.lon += autoRotateSpeed`，
         * 每帧都在给 target.lon 加 0.06°。点景点时我们刚把 target.lon 设成景点的经度，
         * 下一帧就被这句又推走了 —— 阻尼动画永远追不上一个还在跑的目标，
         * 表现就是「镜头转过去、然后继续往同一方向滑开，停在景点上是不可能的」。
         * 60fps 下每秒偏 3.6°，一两秒就滑出画面中心，所以看起来像"点击无效"。
         * 拖拽时会关自动旋转，点击转向同理（要恢复自动旋转用参数面板的开关或「重置视角」）。
         */
        parms.autoRotate = false;
        gui && gui.controllersRecursive().forEach((c) => c.updateDisplay());

        showToast('正在前往：' + name);
    }
}

/**
 * 参数面板
 */
const parms = {
    autoRotate: true,
    autoRotateSpeed: 0.06,
    fov: 70,
    showHotspots: true,
    reset() {
        target.lon = 90;
        target.lat = -4;
        camera.fov = 70;
        camera.updateProjectionMatrix();
        parms.fov = 70;
        parms.autoRotate = true;
        gui.controllersRecursive().forEach((c) => c.updateDisplay());
    },
};

const gui = new GUI({ title: '全景公园' });
gui.add(parms, 'autoRotate').name('自动旋转');
gui.add(parms, 'autoRotateSpeed', 0, 0.5, 0.01).name('旋转速度');
gui.add(parms, 'fov', 25, 95, 1).name('视场角 fov').onChange((v) => {
    camera.fov = v;
    camera.updateProjectionMatrix();
});
gui.add(parms, 'showHotspots').name('显示景点').onChange((v) => {
    hotspots.forEach((s) => (s.visible = v));
});
gui.add(parms, 'reset').name('重置视角');

/**
 * 左下角参数 HUD
 */
const hud = document.getElementById('hud');
let frameCount = 0;
function updateHUD() {
    const lonNorm = (((lon + 180) % 360) + 360) % 360 - 180;
    hud.innerHTML =
        `经度 <b>${lonNorm.toFixed(1)}°</b>　纬度 <b>${lat.toFixed(1)}°</b><br>` +
        `视场角 fov <b>${camera.fov.toFixed(0)}°</b>　球半径 <b>${RADIUS}</b>`;
}

/**
 * 渲染循环
 * lon / lat 每帧向 target 插值，形成阻尼（惯性）的手感
 */
function render() {
    if (parms.autoRotate && !dragging) target.lon += parms.autoRotateSpeed;

    lon += (target.lon - lon) * 0.12;
    lat += (target.lat - lat) * 0.12;
    lat = THREE.MathUtils.clamp(lat, -85, 85);

    updateCamera();

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);

    if (++frameCount % 5 === 0) updateHUD();

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
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
};
