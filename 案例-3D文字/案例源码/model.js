// 引入three.js
import * as THREE from 'three';
// FontLoader：加载 typeface.json 字体（three.js 专属的 JSON 字体格式，由官方转换工具从 TTF 转来）
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
// TextGeometry：把文字"画"成真三维几何体（可挤出厚度、倒角）
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

/**
 * 案例-3D文字 —— 模型部分
 *
 * 文字上屏一共有两条路线，这个 demo 两条都做：
 * ① TextGeometry 真·3D 文字：字体被转成三角网格，有厚度、能倒角、能被光照，
 *    但 three.js 的 JSON 字体只有英文字符集，**不支持中文**
 * ② Canvas 纹理文字：把文字画到 2D 画布上再当贴图，任意语言都行，但本质是"平的"
 */

/**
 * 展台
 */
const stage = new THREE.Group();

const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(11, 11, 0.6, 64),
    new THREE.MeshStandardMaterial({
        color: 0x1c1f26,
        roughness: 0.8,
        metalness: 0.15,
        envMapIntensity: 0.15, // 不压低的话，RoomEnvironment 的白墙会把深色展台照成白色
    })
);
floor.position.y = -0.3;
stage.add(floor);

// 展台上的一圈发光描边
const rim = new THREE.Mesh(
    new THREE.TorusGeometry(10.6, 0.1, 12, 128),
    new THREE.MeshBasicMaterial({ color: 0x3d9fd6 })
);
rim.rotation.x = Math.PI / 2;
rim.position.y = 0.05;
stage.add(rim);

/**
 * ============ 路线①：TextGeometry 真 3D 文字 ============
 */

// 3D 文字的可调参数（gui 可以实时改，改完要重建几何体）
const textParms = {
    text: 'Hello Three.js',
    size: 1.25,           // 字号（世界单位，不是像素）
    height: 0.45,         // 挤出厚度（r163 之后改名叫 depth）
    curveSegments: 8,     // 曲线（字母 O、e 的圆弧）的分段数，越大越圆滑
    bevelEnabled: true,   // 倒角：让边缘有斜切面，金属高光才好看
    bevelThickness: 0.06, // 倒角厚度
    bevelSize: 0.04,      // 倒角向外扩的量（太大会让笔画粘连）
    bevelSegments: 4,
};

// 文字材质：金属感，靠 scene.environment（RoomEnvironment）提供反射
const textMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb84d,
    metalness: 0.9,
    roughness: 0.28,
    envMapIntensity: 0.85, // environment 反射强度，太高会"洗白"金属色
});

const textMesh = new THREE.Mesh(undefined, textMaterial);
textMesh.name = 'text3d';

/**
 * 重建 3D 文字几何体
 * 注意点：换文字/改参数时必须把旧 geometry dispose 掉，
 * 否则每改一次就泄漏一份顶点数据，这是文字类 demo 最常见的内存泄漏
 */
function rebuildText() {
    const old = textMesh.geometry;
    if (old) old.dispose();

    const geometry = new TextGeometry(textParms.text, {
        font: textParms.font,
        size: textParms.size,
        height: textParms.height,
        curveSegments: textParms.curveSegments,
        bevelEnabled: textParms.bevelEnabled,
        bevelThickness: textParms.bevelThickness,
        bevelSize: textParms.bevelSize,
        bevelSegments: textParms.bevelSegments,
    });

    // 居中：文字默认从 (0,0,0) 向 +X 排开，先算包围盒再平移到中心
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    geometry.translate(
        -(bb.max.x + bb.min.x) / 2,
        -(bb.max.y + bb.min.y) / 2,
        -(bb.max.z + bb.min.z) / 2
    );

    textMesh.geometry = geometry;
    textMesh.userData.size = `${(bb.max.x - bb.min.x).toFixed(1)} x ${(bb.max.y - bb.min.y).toFixed(1)}`;
    // 注意：TextGeometry（ExtrudeGeometry）是非索引几何体，没有 index，只能数 position 顶点数
    textMesh.userData.tris = Math.round(geometry.attributes.position.count / 3);
}

// 字体是异步加载的，加载完成后才能第一次建模
new FontLoader().load(
    '../../three.js/examples/fonts/helvetiker_bold.typeface.json',
    (font) => {
        textParms.font = font;
        rebuildText();
        stage.add(textMesh);
    },
    undefined,
    (err) => {
        // 字体加载失败时给出明显提示，而不是默默黑屏
        const el = document.getElementById('fontError');
        el.style.display = 'block';
        el.textContent = '字体 helvetiker_bold.typeface.json 加载失败，请检查 three.js 文件包路径';
        console.error(err);
    }
);

// 让文字悬在展台上方，后续由 index.js 驱动缓转
textMesh.position.y = 2.8;

/**
 * ============ 路线②：Canvas 纹理文字（支持中文） ============
 */

/**
 * 把文字画到 canvas 上，返回纹理
 * 关键点：canvas 尺寸必须是 2 的幂（或接近），且先量宽度再定画布大小，
 * 否则文字会被截断或四周留白比例不对
 */
function makeTextTexture(text, { fontSize = 110, color = '#eaf6ff', bg = null, fontFamily = '"Microsoft YaHei", "PingFang SC", sans-serif' } = {}) {
    const measure = document.createElement('canvas').getContext('2d');
    const font = `bold ${fontSize}px ${fontFamily}`;
    measure.font = font;
    const textWidth = measure.measureText(text).width;

    const padding = fontSize * 0.5;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(textWidth + padding * 2);
    canvas.height = Math.ceil(fontSize * 1.8);

    const ctx = canvas.getContext('2d');
    if (bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // canvas 尺寸一旦改变，字体等状态会被重置，必须重新设置
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding; // r148 写法；r152 后改为 colorSpace
    texture.anisotropy = 8;
    return { texture, canvas };
}

// 中文展板：一块石板 + 贴在上面的文字面片（摆在展台左后方，斜对镜头，避免和3D文字重叠）
const plaque = new THREE.Group();

const board = new THREE.Mesh(
    new THREE.BoxGeometry(7, 3.6, 0.3),
    new THREE.MeshStandardMaterial({
        color: 0x262b34,
        roughness: 0.7,
        metalness: 0.2,
        envMapIntensity: 0.15,
    })
);
plaque.add(board);

const title = makeTextTexture('三维可视化', { fontSize: 130, color: '#ffe9a8' });
const titleMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6 * (title.canvas.height / title.canvas.width)),
    new THREE.MeshBasicMaterial({ map: title.texture, transparent: true, toneMapped: false })
);
titleMesh.position.set(0, 0.35, 0.17);
plaque.add(titleMesh);

const sub = makeTextTexture('Text 3D · WebGL · CanvasTexture', { fontSize: 56, color: '#9fd4ff' });
const subMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 5.6 * (sub.canvas.height / sub.canvas.width)),
    new THREE.MeshBasicMaterial({ map: sub.texture, transparent: true, toneMapped: false })
);
subMesh.position.set(0, -0.95, 0.17);
plaque.add(subMesh);

plaque.position.set(-7.2, 2.0, -4);
plaque.rotation.y = Math.PI / 7; // 转向镜头
stage.add(plaque);

export { stage as default, textMesh, textParms, rebuildText, plaque, makeTextTexture };
