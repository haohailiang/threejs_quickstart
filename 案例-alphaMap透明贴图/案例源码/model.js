// 引入three.js
import * as THREE from 'three';

/**
 * 案例-alphaMap透明度贴图 —— 模型部分
 *
 * 课件原话：贴图黑色部分→完全透明，白色部分→完全不透明
 *
 * 两个关键点：
 * 1. alphaMap 读取的是贴图的【绿色通道】明暗，所以黑白图最常用
 * 2. 必须开 material.transparent = true，透明度贴图才生效（课件"注意"那条）
 */

/**
 * 1. 颜色贴图：球体表面的"照片"（用本地自带的砖墙纹理）
 */
const mapTexture = new THREE.TextureLoader().load('../../three.js/examples/textures/brick_diffuse.jpg');
mapTexture.encoding = THREE.sRGBEncoding; // r148 写法；r152 后改为 colorSpace（课件里那行 SRGBColorSpace）
mapTexture.anisotropy = 8;

/**
 * 2. 透明度贴图：黑白竖条纹
 * 课件里是现成的 opacity.jpg；这里用 Canvas 现画，效果一样且不依赖图片文件
 */
let stripeCount = 7; // 条纹数量（gui 可调）

function makeAlphaTexture(count) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 白色 = 完全不透明的底
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 黑色竖条纹 = 完全透明
    ctx.fillStyle = '#000000';
    const stripeW = canvas.width / (count * 2); // 黑白各占一半，黑白相间
    for (let i = 0; i < count; i++) {
        ctx.fillRect(i * stripeW * 2, 0, stripeW, canvas.height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    // 注意：alphaMap 是数据图，不要设 sRGB（课件里给 alphaTexture 设了 SRGBColorSpace，
    // 那是 r152+ 的写法；对黑白图来说影响不大，但规范上 alphaMap 应保持线性）
    texture.anisotropy = 8;
    return texture;
}

let alphaTexture = makeAlphaTexture(stripeCount);

/**
 * 3. 材质：MeshBasicMaterial（课件同款）
 * map 负责颜色，alphaMap 负责哪里透哪里不透
 */
const material = new THREE.MeshBasicMaterial({
    map: mapTexture,
    alphaMap: alphaTexture, // 透明度贴图
    transparent: true,      // 是否允许材质透明 —— 不开这个，alphaMap 不生效（课件"注意"）
    side: THREE.DoubleSide, // 透明后能看到球内壁的另一面，双面渲染更好看
});

const sphere = new THREE.Mesh(new THREE.SphereGeometry(60, 64, 48), material);
sphere.name = 'alpha-sphere';

/**
 * 4. 背景星星：透过透明的条纹能直接看到它们，让"透明"肉眼可见
 * （课件背景是纯黑，透明区域看着就是黑的，其实看不出穿透效果）
 */
const starCount = 800;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    // 星星撒在一个半径 200~600 的球壳上，包住贴图球
    const r = 200 + Math.random() * 400;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
    color: 0x9fd4ff,
    size: 1.6,
    sizeAttenuation: true,
}));

/**
 * 5. 组装
 */
const group = new THREE.Group();
group.add(sphere, stars);

/** 重建透明度贴图（改条纹数量时调用） */
function rebuildAlphaMap(count) {
    stripeCount = count;
    alphaTexture.dispose(); // 旧纹理释放，防止泄漏
    alphaTexture = makeAlphaTexture(count);
    material.alphaMap = alphaTexture;
    material.needsUpdate = true; // 换贴图必须标记，否则 shader 不更新
}

export { group as default, sphere, material, stars, stripeCount, rebuildAlphaMap };
