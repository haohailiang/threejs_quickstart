import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// 模型：电视机 + 视频纹理 + 陪衬物体
import sceneGroup, { video, screenMesh, decos } from './model.js';

/**
 * 案例-视频纹理 —— 场景/相机/播放控制
 */

// 场景
const scene = new THREE.Scene();
scene.add(sceneGroup);

const width = window.innerWidth;
const height = window.innerHeight;

/**
 * 相机
 */
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
camera.position.set(0, 3, 32);

/**
 * 渲染器
 */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

/**
 * 轨道控制器：绕着电视看
 */
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.5, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 10;
controls.maxDistance = 90;
controls.maxPolarAngle = Math.PI / 2 + 0.15; // 不让相机钻到地面以下
controls.update();

/**
 * ========== 视频播放控制 ==========
 */

// 自动播放策略：浏览器默认禁止"有声音 + 用户没交互"的自动播放
// 所以 <video> 上必须先 muted 才能 play() 成功
const playMask = document.getElementById('playMask');

function tryPlay() {
    const p = video.play();
    if (p && typeof p.then === 'function') {
        p.then(() => {
            playMask.classList.remove('on');
        }).catch((err) => {
            // 被拦截了，给用户一个可点的遮罩（点击属于"用户交互"，之后就能播了）
            console.warn('[视频纹理] 自动播放被拦截：', err.name, err.message);
            playMask.classList.add('on');
        });
    }
}

// 页面首次加载就尝试播放
tryPlay();

// 跳过片头（官方案例 webgl_materials_video 的同款处理）：
// 视频最开头经常是黑屏帧，贴到屏幕上就是一块黑板，很像是代码写错了；
// 跳到第 3 秒，第一眼就能看到画面。只做一次，不干扰后续的暂停/继续
let seekedToIntro = false;
video.addEventListener('play', () => {
    if (!seekedToIntro) {
        seekedToIntro = true;
        video.currentTime = 3;
    }
});

// 支持 URL 参数 ?t=秒：从指定时间开始播（调试/教学用，比如 index.html?t=30）
const urlStartAt = parseFloat(new URLSearchParams(location.search).get('t'));
if (urlStartAt > 0) {
    video.addEventListener(
        'loadedmetadata',
        () => {
            video.currentTime = urlStartAt;
        },
        { once: true }
    );
}

// 遮罩点击 → 播放（这次是用户手势，一定放行）
playMask.addEventListener('click', () => {
    video.muted = false;
    parms.muted = false;
    tryPlay();
});

// 兜底：任何一次点击画布也尝试播放
renderer.domElement.addEventListener('pointerdown', () => {
    if (video.paused) tryPlay();
});

/**
 * GUI 参数面板
 */
const parms = {
    playing: true,
    muted: true,
    loop: true,
    playbackRate: 1,
    showDecos: true,
    reset() {
        camera.position.set(0, 3, 32);
        controls.target.set(0, 0.5, 0);
        controls.update();
    },
};

const gui = new GUI({ title: '视频纹理' });

gui.add(parms, 'playing').name('播放').onChange((v) => {
    if (v) {
        tryPlay();
    } else {
        video.pause();
    }
});

gui.add(parms, 'muted').name('静音').onChange((v) => {
    video.muted = v;
    // 取消静音时如果被浏览器拦了，就把开关弹回去
    if (!v && video.paused) tryPlay();
});

gui.add(parms, 'loop').name('循环播放').onChange((v) => {
    video.loop = v;
});

gui.add(parms, 'playbackRate', 0.25, 2, 0.25).name('播放速度').onChange((v) => {
    video.playbackRate = v;
});

gui.add(parms, 'showDecos').name('显示陪衬物体').onChange((v) => {
    decos.visible = v;
});

gui.add(parms, 'reset').name('重置视角');

// 视频自身的状态变化，反同步到面板（比如播放结束、被系统暂停）
video.addEventListener('pause', () => {
    parms.playing = false;
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
});
video.addEventListener('play', () => {
    parms.playing = true;
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
});

/**
 * 左下角信息面板
 */
const hud = document.getElementById('hud');

function formatTime(sec) {
    if (!isFinite(sec)) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

let frameCount = 0;
function updateHUD() {
    const size = screenMesh.userData.size || '加载中…';
    const aspect = screenMesh.userData.aspect;
    hud.innerHTML =
        `视频 <b>${size}</b>${aspect ? `（${aspect.toFixed(2)}:1）` : ''}<br>` +
        `进度 <b>${formatTime(video.currentTime)}</b> / ${formatTime(video.duration)}　` +
        `状态 <b>${video.paused ? '暂停' : '播放中'}</b><br>` +
        `倍速 <b>${video.playbackRate.toFixed(2)}x</b>　静音 <b>${video.muted ? '是' : '否'}</b>`;
}

/**
 * 渲染循环
 */
function render() {
    // 陪衬物体慢慢转，能更明显看出"纹理在动"（注意：动的是贴图，不是物体）
    decos.children.forEach((obj, i) => {
        obj.rotation.y += 0.003 + i * 0.001;
        obj.rotation.x += 0.0015;
    });

    // 视频纹理不需要手动 texture.needsUpdate = true，VideoTexture 内部已经处理
    // 这里只是让屏幕的光晕有一点点"呼吸"感
    const t = video.currentTime;
    if (isFinite(t)) {
        const l = sceneGroup.children.find((o) => o.isPointLight);
        if (l) l.intensity = 18 + Math.sin(t * 2.2) * 5;
    }

    controls.update();
    renderer.render(scene, camera);

    if (++frameCount % 6 === 0) updateHUD();

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
