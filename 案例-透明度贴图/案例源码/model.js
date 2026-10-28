// 引入three.js
import * as THREE from 'three';

/**
 * 案例-透明度贴图（alphaMap）—— 模型部分
 *
 * 原理（对应课程「基础网格材质-透明度贴图」）：
 * alphaMap 是一张"黑白图"，它不参与上色，只决定每个像素**透不透光**：
 *   - 贴图黑色部分（暗）→ 完全透明，能看穿
 *   - 贴图白色部分（亮）→ 完全不透明，显示 map 的颜色
 *
 * 两个必要条件：
 *   1. 材质必须开 transparent: true，否则 alphaMap 不生效
 *   2. alphaMap 采样的是**绿色通道**的亮度，所以黑白图/灰度图都适用
 *
 * 和 opacity 的区别：opacity 是"整块材质一个透明度"，
 * alphaMap 是"每个像素各自的透明度"，可以做出镂空、破洞、渐隐等效果。
 *
 * 黑白条纹贴图用 Canvas 程序生成，不用额外图片素材。
 */

/**
 * 1. 木纹贴图（map）：决定球体"是什么颜色"
 * 用项目内 three.js 自带的木纹，免素材
 */
const textureLoader = new THREE.TextureLoader();
const woodTexture = textureLoader.load('../../three.js/examples/textures/hardwood2_diffuse.jpg');
woodTexture.encoding = THREE.sRGBEncoding; // r148 写法；r152 后改为 colorSpace
// 让贴图在球上平铺 2x2 次，条纹更密更有"蒙皮"感
woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
woodTexture.repeat.set(2, 2);

/**
 * 2. 透明度贴图（alphaMap）：决定球体"哪里被镂空"
 * 用 Canvas 现画黑白竖条纹：白 = 不透明，黑 = 透明
 *
 * 注意：alphaMap 只看亮度（绿色通道），不要给它设 sRGB，
 * 按线性色彩处理亮度才是"所见即所得"（课程里设 SRGB 是 r152+ 的写法，r148 下不必）
 */
const alphaCanvas = document.createElement('canvas');
alphaCanvas.width = 1024;
alphaCanvas.height = 512;

const alphaTexture = new THREE.CanvasTexture(alphaCanvas);

const alphaParms = {
    stripes: 8,     // 条纹对数（一黑一白算一对）
    invert: false,  // 反转黑白：镂空位置互换
};

function drawAlphaTexture() {
    const ctx = alphaCanvas.getContext('2d');
    const w = alphaCanvas.width;
    const h = alphaCanvas.height;

    // 先铺"不透明"的白色
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // 再画"透明"的黑色竖条
    const barW = w / (alphaParms.stripes * 2);
    ctx.fillStyle = '#000000';
    for (let i = 0; i < alphaParms.stripes; i++) {
        ctx.fillRect(i * barW * 2, 0, barW, h);
    }

    // 反转 = 黑白互换（镂空的位置换到另一边）
    if (alphaParms.invert) {
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
    }

    // 重画完必须手动标记更新，CanvasTexture 才会把新画面传给 GPU
    alphaTexture.needsUpdate = true;
}
drawAlphaTexture();

/**
 * 3. 球体：木纹 + 透明度贴图
 * 用 MeshBasicMaterial（和课程一致）：不受灯光影响，颜色就是贴图本身
 */
const RADIUS = 60;
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS, 64, 48),
    new THREE.MeshBasicMaterial({
        map: woodTexture,          // 颜色贴图
        alphaMap: alphaTexture,    // 透明度贴图：黑透明、白不透明
        transparent: true,         // 必须开启，否则 alphaMap 不生效！
        // opacity: 0.5,           // 整体透明度，配合 alphaMap 使用（alpha 是"每像素"的）
        side: THREE.DoubleSide,    // 双面渲染：透过镂空能看到球体内壁，更真实
    })
);
sphere.name = 'alpha-sphere';

/**
 * 4. 背景参照物：一个蓝色圆环放在球体后面
 * 透过镂空条纹能看到它，"透明"效果一目了然
 */
const ring = new THREE.Mesh(
    new THREE.TorusGeometry(90, 8, 24, 96),
    new THREE.MeshBasicMaterial({ color: 0x1677ff })
);
ring.position.z = -180;

/**
 * 5. 组装
 */
const group = new THREE.Group();
group.add(sphere, ring);

export { group as default, sphere, alphaParms, drawAlphaTexture, alphaTexture };
