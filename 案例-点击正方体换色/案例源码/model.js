// 引入three.js
import * as THREE from 'three';

/**
 * 案例-点击正方体换色 —— 模型部分
 *
 * 世界坐标系（World Space）就是 three.js 的原点坐标系：
 * 场景里所有物体的 position 都是相对"世界原点 (0,0,0)"而言的。
 * 这里把正方体放在世界原点，文字放在它的正上方（+Y 方向），
 * 再用 AxesHelper / GridHelper 把坐标系可视化出来。
 */

const SIZE = 100; // 正方体边长

// 正方体的两种颜色（点击时在两者之间切换）
const COLOR_BLUE = new THREE.Color(0x1677ff);
const COLOR_RED = new THREE.Color(0xff4d4f);

/**
 * 1. 正方体：放在世界原点
 */
const cube = new THREE.Mesh(
    new THREE.BoxGeometry(SIZE, SIZE, SIZE),
    new THREE.MeshLambertMaterial({ color: COLOR_BLUE.clone() })
);
cube.position.set(0, 0, 0); // 世界原点
cube.name = 'main-cube';

/**
 * 2. 头顶文字："正方体"
 * 中文不能 JSON 字体转 3D 文字，用 Canvas 纹理方案：
 * 把字画到画布上 → CanvasTexture → 贴到 Sprite（永远朝向相机的面片）上
 */
function makeTextSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.font = 'bold 64px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 白字 + 深色描边，在任何背景上都看得清
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding; // r148 写法；r152 后改为 colorSpace

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
    }));

    // Sprite 的 scale 就是它在场景中的显示尺寸（世界单位）
    sprite.scale.set(70, 35, 1);
    return sprite;
}

const label = makeTextSprite('正方体');
// "正上方" = 沿世界坐标系的 +Y 轴偏移（半个正方体高 + 一点间隙）
label.position.set(0, SIZE / 2 + 35, 0);
label.name = 'cube-label';

/**
 * 3. 组装
 */
const group = new THREE.Group();
group.add(cube, label);

export { group as default, cube, label, COLOR_BLUE, COLOR_RED, SIZE };
