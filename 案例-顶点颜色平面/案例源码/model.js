import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/**
 * 案例目标：只用 4 个顶点 + Float32Array，画出一个"四角四色"的平面
 *
 * 关键点：
 *   1. position 是 4 × 3 = 12 个浮点数（每个顶点 x, y, z）
 *   2. color    是 4 × 3 = 12 个浮点数（每个顶点 r, g, b，范围 0~1）
 *   3. 只有 4 个顶点画不出"面"，必须用 setIndex 告诉 GPU 怎么连成三角形
 *   4. 三角形内部的颜色由三个顶点的颜色自动线性插值，所以中间是渐变色
 */

// 平面半边长：顶点落在 (±HALF, 0, ±HALF)，所以平面是 2*HALF 见方
export const HALF = 80;

// 四个角的颜色（顺序要与下面的顶点顺序一一对应）
export const CORNER_COLORS = [
    0xff4d4f, // 0 左上：红
    0x42d392, // 1 右上：绿
    0x3d8bff, // 2 右下：蓝
    0xffd23f, // 3 左下：黄
];

const CORNER_NAMES = ['顶点 0', '顶点 1', '顶点 2', '顶点 3'];

// 顶点在 XZ 平面上的位置（y 都为 0，所以是一个水平面）
const CORNER_POS = [
    [-HALF, 0, -HALF], // 0 左后
    [HALF, 0, -HALF],  // 1 右后
    [HALF, 0, HALF],   // 2 右前
    [-HALF, 0, HALF],  // 3 左前
];

/** 十六进制 → "rgb(255, 77, 79)" 的字符串，给 CSS2D 标签上色用 */
function hexToCss(hex) {
    const c = new THREE.Color(hex);
    return `rgb(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)})`;
}

/** 生成一个贴在顶点旁边的小标签 */
function makeLabel(text, cssColor) {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.cssText = [
        'padding: 3px 9px',
        'border-radius: 6px',
        'background: rgba(4, 8, 14, .78)',
        `color: ${cssColor}`,
        `border: 1px solid ${cssColor}`,
        'font-size: 12px',
        'font-family: Consolas, "Microsoft YaHei", monospace',
        'white-space: nowrap',
        'pointer-events: none',
        'user-select: none',
    ].join(';');
    return new CSS2DObject(div);
}

export function createPlaneModel() {
    const group = new THREE.Group();

    /* ---------------------------------------------------------------
     * 第 1 步：准备"顶点坐标"数组
     * 4 个顶点 × 3 个分量 = 12 个 float
     * ------------------------------------------------------------- */
    const positions = new Float32Array(4 * 3);
    CORNER_POS.forEach((p, i) => {
        positions[i * 3 + 0] = p[0];
        positions[i * 3 + 1] = p[1];
        positions[i * 3 + 2] = p[2];
    });

    /* ---------------------------------------------------------------
     * 第 2 步：准备"顶点颜色"数组
     * THREE.Color 的 r/g/b 已经是 0~1 的浮点数，正好能直接塞进 Float32Array
     * ------------------------------------------------------------- */
    const colors = new Float32Array(4 * 3);
    CORNER_COLORS.forEach((hex, i) => {
        const c = new THREE.Color(hex);
        colors[i * 3 + 0] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    });

    /* ---------------------------------------------------------------
     * 第 3 步：建 BufferGeometry，把数组挂成 attribute
     * 第二个参数 3 = 每个顶点占 3 个分量（x/y/z 或 r/g/b）
     * ------------------------------------------------------------- */
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    /* ---------------------------------------------------------------
     * 第 4 步：索引 —— 告诉 GPU "哪 3 个顶点组成一个三角形"
     * 一个四边形要拆成 2 个三角形：0-1-2 和 0-2-3（共用顶点 0、2）
     * 不写这一步，4 个孤立的点什么都画不出来
     * ------------------------------------------------------------- */
    geometry.setIndex([
        0, 1, 2, // 第一个三角形
        0, 2, 3, // 第二个三角形
    ]);

    // MeshBasicMaterial 不受光照影响，所以场景里一盏灯都不用放
    // DoubleSide：从背面看也能看到（否则俯视 / 仰视可能一片空）
    const material = new THREE.MeshBasicMaterial({
        vertexColors: true,        // ★ 打开顶点色，颜色才会从 attribute 里取
        side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    /* ---------------------------------------------------------------
     * 辅助展示：把 4 个顶点本身画成小圆点 + 文字标签
     * Points 也支持 vertexColors，所以圆点颜色和对应顶点颜色一致
     * ------------------------------------------------------------- */
    const pointsGeometry = new THREE.BufferGeometry();
    // 这里复制一份，避免和 mesh 共用同一个 typed array 时互相影响
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors.slice(), 3));

    const pointsMaterial = new THREE.PointsMaterial({
        size: 13,
        sizeAttenuation: false, // 尺寸用像素，不随远近缩小
        vertexColors: true,
    });

    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    points.position.y = 0.6; // 抬高一点点，别和平面 z-fighting
    group.add(points);

    // 4 个标签：往外、往上偏移，避免压在平面上看不见
    const labels = [];
    CORNER_POS.forEach((p, i) => {
        const css = hexToCss(CORNER_COLORS[i]);
        const c = new THREE.Color(CORNER_COLORS[i]);
        const rgb = `(${c.r.toFixed(2)}, ${c.g.toFixed(2)}, ${c.b.toFixed(2)})`;
        const label = makeLabel(`${CORNER_NAMES[i]} ${rgb}`, css);

        // 沿对角线向外推 16 个单位，再抬高 10 个
        label.position.set(
            p[0] + Math.sign(p[0]) * 16,
            10,
            p[2] + Math.sign(p[2]) * 16
        );
        labels.push(label);
        group.add(label);
    });

    /* ---------------------------------------------------------------
     * 坐标辅助：AxesHelper 红=X 绿=Y 蓝=Z，GridHelper 铺在平面下方
     * ------------------------------------------------------------- */
    const axesHelper = new THREE.AxesHelper(HALF * 1.25);
    axesHelper.position.y = 0.15;
    group.add(axesHelper);

    const gridHelper = new THREE.GridHelper(HALF * 2.4, 24, 0x2e4257, 0x1c2733);
    gridHelper.position.y = -0.6;
    group.add(gridHelper);

    /* ---------------------------------------------------------------
     * 供 index.js 的外部开关调用
     * ------------------------------------------------------------- */
    function setWireframe(on) {
        material.wireframe = on;
    }

    function setShowVertices(on) {
        points.visible = on;
        labels.forEach((l) => (l.visible = on));
    }

    function setVertexColors(on) {
        // 切换后必须 needsUpdate，否则着色器不会重新编译
        material.vertexColors = on;
        material.color.set(on ? 0xffffff : 0xcfd8e3);
        material.needsUpdate = true;
    }

    const stats = {
        vertexCount: geometry.attributes.position.count,
        triangleCount: geometry.index.count / 3,
        colorCount: geometry.attributes.color.count,
    };

    return {
        group,
        mesh,
        geometry,
        material,
        points,
        labels,
        axesHelper,
        gridHelper,
        stats,
        setWireframe,
        setShowVertices,
        setVertexColors,
    };
}
