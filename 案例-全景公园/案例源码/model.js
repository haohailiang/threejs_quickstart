// 引入three.js
import * as THREE from 'three';
// 引入CSS2DObject，用来给景点标记挂文字标签（标签是HTML元素，永远朝向屏幕）
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/**
 * 案例-全景公园 —— 模型部分
 *
 * 思路：把一张 360° 全景图（等距柱状投影 equirectangular，宽高比 2:1）
 * 贴到一个"翻过来"的球体内壁上，相机站在球心，
 * 就相当于人站在公园中央环顾四周。
 *
 * 贴图：chinese_garden.jpg（中式园林全景，荷花池/凉亭/月亮门）
 * 图源：Poly Haven（CC0 公共领域，可自由使用）https://polyhaven.com
 */

// 球半径：只要比场景里其他物体大得多、又小于相机的 far 就行
const RADIUS = 5000;

/**
 * 1. 加载全景贴图
 */
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('./chinese_garden.jpg');

// 全景图是普通的 sRGB 彩色照片，必须标记色彩空间，否则渲染出来会发灰发暗
// 注意：r148 用的是 texture.encoding（r152 之后改名为 texture.colorSpace）
texture.encoding = THREE.sRGBEncoding;
// 球面很大，贴图会被拉伸，开启各向异性过滤让远处纹理更清晰
texture.anisotropy = 8;

/**
 * 2. 球体几何体
 * 分段数给高一些，否则球面（尤其是两极）会有明显的棱角
 */
const geometry = new THREE.SphereGeometry(RADIUS, 64, 40);

/**
 * 3. 材质：MeshBasicMaterial
 * - 用 Basic 而不是 Lambert/Phong：全景图本身就是"烤"好光照的照片，不需要再被灯光照一遍
 * - side: THREE.BackSide —— 只渲染球的内表面。
 *   几何体默认的法线朝外，从球心往外看看到的是"背面"，
 *   不设 BackSide 就什么都看不见（全景图案例最常见的坑）
 */
const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
});

const sphere = new THREE.Mesh(geometry, material);
sphere.name = 'panorama-sphere';

/**
 * 4. 生成一个"蓝色光点"贴图（用 Canvas 现画，不需要额外的图片文件）
 */
function createSpotTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const c = size / 2;

    // 外发光
    const glow = ctx.createRadialGradient(c, c, 6, c, c, c);
    glow.addColorStop(0, 'rgba(120, 220, 255, 1)');
    glow.addColorStop(0.45, 'rgba(60, 170, 255, 0.75)');
    glow.addColorStop(1, 'rgba(60, 170, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // 中间的实心白点
    ctx.beginPath();
    ctx.arc(c, c, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const t = new THREE.CanvasTexture(canvas);
    t.encoding = THREE.sRGBEncoding;
    return t;
}

const spotTexture = createSpotTexture();

/**
 * 5. 创建一个景点热点
 * @param {string} name 景点名字
 * @param {number} lon  经度（绕 Y 轴转，单位：度，与全景图的横向位置一一对应）
 * @param {number} lat  纬度（上下俯仰，单位：度，-90~90）
 */
function createHotspot(name, lon, lat) {
    const spriteMaterial = new THREE.SpriteMaterial({
        map: spotTexture,
        transparent: true,
        // 关掉深度写入，多个光点叠加时不会互相"挖洞"
        depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);

    // 用球坐标把「经度/纬度」换算成三维坐标，摆在球壁内侧（0.96 倍半径，稍微往里挪一点）
    const dir = new THREE.Vector3().setFromSphericalCoords(
        1,
        THREE.MathUtils.degToRad(90 - lat), // 极角 phi：纬度 0° 在水平线上，所以要 90 - lat
        THREE.MathUtils.degToRad(lon)       // 方位角 theta
    );
    sprite.position.copy(dir.multiplyScalar(RADIUS * 0.96));

    // 文字标签用 CSS2DObject，挂在光点上方
    const div = document.createElement('div');
    div.className = 'spot-label';
    div.textContent = name;
    const label = new CSS2DObject(div);
    label.position.set(0, 1.6, 0);
    sprite.add(label);

    // 把跳转需要的数据挂在 userData 上，点击时直接取
    sprite.userData = { name, lon, lat };

    // 光点在屏幕上的大小：场景很大，用半径的比例来定尺寸才不会显得太小
    sprite.scale.setScalar(RADIUS * 0.05);

    /**
     * 【修复】给光点套一个「隐形拾取代理」
     *
     * 光点 scale 只有 RADIUS*0.05 = 250，在 4800 的距离上、70° fov 的屏幕里，
     * 直径只有 20 像素左右，而且 Raycaster 对 Sprite 是严格按这个四边形边界算的 ——
     * 鼠标允许误差几乎为 0，稍微点偏几个像素就是「完全没反应」。
     * （之前的排查就是因为这个：几个候选点离真实中心 10~40px，全部落在边界外，
     *   于是误判成「Raycaster 对 Sprite 失效」；实际上射线拾取一直是通的。）
     *
     * 解法是图形学里的常规套路：视觉物体和拾取物体分开。
     * 这里再叠一个 3 倍大的 Sprite 当"点击热区"：
     * - opacity: 0 + transparent → 看不见（但 visible 必须留 true，否则不参与拾取）
     * - depthWrite/depthTest 关掉 → 不会干扰其他物体的深度关系
     * - userData 共用同一个对象 → 命中代理就等于命中光点，pick() 里不用做兼容
     * 作为 sprite 的子对象，它跟着光点走，也会被 scale 250 放大，
     * 所以 local scale 写 3 就得到 750 的世界尺寸（屏幕上约 60 像素直径）。
     */
    const hitMaterial = new THREE.SpriteMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
    });
    const hitArea = new THREE.Sprite(hitMaterial);
    hitArea.scale.setScalar(3);
    hitArea.userData = sprite.userData;
    sprite.add(hitArea);

    return sprite;
}

// 公园里的几个景点
// 换算关系：全景图横向位置 u(0~1) → 经度 lon = 360*u - 90（针对默认 SphereGeometry 推导）
const hotspots = [
    createHotspot('石灯笼', 117, -16),   // 池边前景的石灯笼
    createHotspot('荷花池', 90, -10),    // 中央的荷花池
    createHotspot('凉亭', 40, -4),       // 假山上的小凉亭
    createHotspot('水榭长廊', 151, -4),  // 池对岸的主亭
    createHotspot('月亮门', 241, -5),    // 右侧的月亮门
];

/**
 * 6. 组装
 * 用一个 Group 把球体和所有光点包起来，index.js 里只需 scene.add(group)
 */
const group = new THREE.Group();
group.add(sphere);
hotspots.forEach((spot) => group.add(spot));

export { group as default, hotspots, RADIUS };
