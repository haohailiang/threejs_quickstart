// 引入three.js
import * as THREE from 'three';

/**
 * 案例-视频纹理 —— 模型部分
 *
 * 核心思路：视频纹理（VideoTexture）= 把 <video> 标签当前这一帧的画面，
 * 当成一张普通贴图交给材质使用。视频在播放，贴图就在变，物体表面也就"动"起来了。
 *
 * 和其他纹理的区别：
 * - 普通贴图：一张静态图片，加载完就不变了
 * - Canvas 纹理：画面变了要手动 texture.needsUpdate = true
 * - 视频纹理：VideoTexture 内部监听了视频的 timeupdate/播放状态，
 *             每一帧自动标记 needsUpdate，**不需要我们手动更新**
 */

// 页面里那个隐藏的 <video>
const video = document.getElementById('video');

/**
 * 1. 创建视频纹理
 */
const videoTexture = new THREE.VideoTexture(video);
// sRGB 色彩空间（r148 写法；r152 之后改名为 videoTexture.colorSpace = THREE.SRGBColorSpace）
videoTexture.encoding = THREE.sRGBEncoding;
// 视频每帧都在变，生成 mipmap 纯属浪费性能，用线性过滤就够
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;

/**
 * 2. 电视机
 */
const BODY_W = 16;
const BODY_H = 9.6;
const BODY_D = 0.9;
// 屏幕最多能占多大（要留出边框）
const SCREEN_MAX_W = 14.6;
const SCREEN_MAX_H = 8.2;

const tv = new THREE.Group();

// 机身
const body = new THREE.Mesh(
    new THREE.BoxGeometry(BODY_W, BODY_H, BODY_D),
    new THREE.MeshStandardMaterial({
        color: 0x14161a,
        roughness: 0.5,
        metalness: 0.45,
    })
);
tv.add(body);

/**
 * 3. 屏幕：一个平面 + 视频纹理
 * 用 MeshBasicMaterial：屏幕是自己在发光的，不需要被场景灯光照亮
 */
const screenMaterial = new THREE.MeshBasicMaterial({
    map: videoTexture,
    toneMapped: false, // 关掉色调映射，屏幕颜色更接近原片
});
const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_MAX_W, SCREEN_MAX_H), screenMaterial);
screenMesh.position.z = BODY_D / 2 + 0.01;
tv.add(screenMesh);

/**
 * 4. 屏幕比例自适应
 * 视频的真实宽高要等元数据加载完才知道（videoWidth / videoHeight），
 * 所以不能在代码里写死 16:9，否则播 2.35:1 的电影会被拉变形
 */
function fitScreen() {
    const vw = video.videoWidth || 1024;
    const vh = video.videoHeight || 436;
    const aspect = vw / vh;
    let w = SCREEN_MAX_W;
    let h = w / aspect;
    if (h > SCREEN_MAX_H) {
        h = SCREEN_MAX_H;
        w = h * aspect;
    }
    screenMesh.geometry.dispose();
    screenMesh.geometry = new THREE.PlaneGeometry(w, h);
    // 顺便把实际播放比例记下来，HUD 里要用
    screenMesh.userData.aspect = aspect;
    screenMesh.userData.size = `${vw}x${vh}`;
}
video.addEventListener('loadedmetadata', fitScreen);
if (video.readyState >= 1) fitScreen(); // 元数据可能已经加载好了

/**
 * 5. 底座
 */
const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 2.4, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.4, metalness: 0.6 })
);
neck.position.y = -BODY_H / 2 - 1.1;
tv.add(neck);

const base = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.35, 3.4),
    new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.3, metalness: 0.7 })
);
base.position.y = -BODY_H / 2 - 2.3;
tv.add(base);

/**
 * 6. 陪衬物体：同一张视频纹理，可以贴到任意几何体上
 * 这是"纹理"最直观的体现——它只是一张图，贴哪儿都行
 */
const decoMaterial = new THREE.MeshBasicMaterial({ map: videoTexture, toneMapped: false });

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.7, 48, 32), decoMaterial);
sphere.position.set(-11.5, -1.6, 1.5);

const cube = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), decoMaterial);
cube.position.set(11.5, -1.4, 1.5);

const torus = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.5, 24, 64), decoMaterial);
torus.position.set(9.2, 4.6, -1.5);

const decos = new THREE.Group();
decos.add(sphere, cube, torus);

/**
 * 7. 地面（让电视"有地方放"，也能看出景深）
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.85, metalness: 0.1 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -BODY_H / 2 - 2.5;

/**
 * 8. 灯光
 * 屏幕本身是自发光（Basic 材质）不受光，但机身、底座、地面需要灯光才有立体感
 */
const ambient = new THREE.AmbientLight(0xffffff, 0.65);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(8, 14, 16);

// 模拟屏幕打在地面和底座上的光
const screenLight = new THREE.PointLight(0x7fc6ff, 20, 40, 2);
screenLight.position.set(0, -1, 5);

/**
 * 9. 组装
 */
const group = new THREE.Group();
group.add(tv, decos, floor, ambient, directionalLight, screenLight);

export { group as default, video, videoTexture, screenMesh, decos };
