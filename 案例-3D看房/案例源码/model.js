import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/**
 * 程序化搭一套两室一厅：全用 Box/Plane 拼，没有任何外部模型依赖。
 *
 * 户型（俯视，X 向右 / Z 向下）：
 *   ┌────────────────┬──────────┐
 *   │                │   主卧    │
 *   │     客厅        ├──────────┤
 *   │                │   次卧    │
 *   └────────────────┴──────────┘
 *   x: -8 ~ 8, z: -6 ~ 6，隔墙 x=1，主次卧隔墙 z=-0.5
 */

const WALL_H = 3;
const WALL_T = 0.24;

export const ROOMS = [
    {
        key: 'living', name: '客厅', tip: '进入客厅',
        cx: -3.5, cz: 0,
        camPos: [-6.8, 1.7, 4.8], lookAt: [-1.0, 1.2, -1.8],
        floorColor: 0x8a6f4d,
    },
    {
        key: 'master', name: '主卧', tip: '进入主卧',
        cx: 4.5, cz: -3.25,
        camPos: [7.0, 1.7, -5.2], lookAt: [2.2, 1.1, -1.6],
        floorColor: 0x6f7f9b,
    },
    {
        key: 'second', name: '次卧', tip: '进入次卧',
        cx: 4.5, cz: 2.75,
        camPos: [7.0, 1.7, 5.2], lookAt: [2.2, 1.1, 1.6],
        floorColor: 0x5f8a6b,
    },
];

export const OVERVIEW = {
    name: '全景',
    camPos: [1.5, 15.5, 14.5],
    lookAt: [0.5, 0.5, 0],
};

/* ------------------------------ 墙体工具 ------------------------------ */
function addWall(scene, x, z, sx, sz, color = 0xcfc8bb) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(sx, WALL_H, sz),
        new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
    );
    mesh.position.set(x, WALL_H / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
}

/** 在 x=1 的隔墙上开门洞：一段一段地砌 */
function buildInnerWallX(scene, x, zFrom, zTo, gaps) {
    // gaps: [[z1,z2], ...] 门洞范围
    const segs = [];
    let cur = zFrom;
    const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
    for (const [g1, g2] of sorted) {
        if (g1 > cur) segs.push([cur, g1]);
        cur = Math.max(cur, g2);
    }
    if (cur < zTo) segs.push([cur, zTo]);
    for (const [a, b] of segs) {
        addWall(scene, x, (a + b) / 2, WALL_T, b - a);
    }
}

/* ------------------------------ 家具工具 ------------------------------ */
function addBox(scene, x, y, z, sx, sy, sz, color, rough = 0.85) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(sx, sy, sz),
        new THREE.MeshStandardMaterial({ color, roughness: rough })
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
}

/* ------------------------------ 房间搭建 ------------------------------ */
export function buildHouse(scene) {
    /* 地板：每个房间一块，颜色不同，方便一眼分清 */
    for (const r of ROOMS) {
        const w = r.key === 'living' ? 9 : 7;
        const d = r.key === 'living' ? 12 : 5.5;
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(w, d),
            new THREE.MeshStandardMaterial({ color: r.floorColor, roughness: 0.9 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(r.cx, 0.01, r.cz);
        floor.receiveShadow = true;
        scene.add(floor);
    }

    /* 外墙 */
    addWall(scene, 0, -6, 16.5, WALL_T);
    addWall(scene, 0, 6, 16.5, WALL_T);
    addWall(scene, -8, 0, WALL_T, 12.5);
    addWall(scene, 8, 0, WALL_T, 12.5);

    /* 隔墙 x=1：主卧门洞 z[-3.5,-2.5]，次卧门洞 z[2,3] */
    buildInnerWallX(scene, 1, -6, 6, [[-3.5, -2.5], [2, 3]]);
    /* 主卧 / 次卧隔墙 z=-0.5 */
    addWall(scene, 4.5, -0.5, 7, WALL_T);

    /* ---------------- 客厅家具 ---------------- */
    addBox(scene, -7.2, 0.35, -3.2, 0.9, 0.7, 3.4, 0x4a5d7e);          // 三人沙发座
    addBox(scene, -7.7, 0.85, -3.2, 0.25, 0.7, 3.4, 0x42537a);         // 沙发背
    addBox(scene, -7.2, 0.55, -4.7, 0.9, 0.35, 0.3, 0x42537a);         // 扶手
    addBox(scene, -7.2, 0.55, -1.7, 0.9, 0.35, 0.3, 0x42537a);
    addBox(scene, -5.4, 0.25, -3.2, 1.6, 0.5, 1.0, 0x7a5230);          // 茶几
    addBox(scene, -3.2, 0.25, -3.2, 2.0, 0.5, 0.5, 0x5a4632);          // 电视柜
    addBox(scene, -3.2, 1.15, -3.35, 1.8, 1.1, 0.12, 0x10151d, 0.4);   // 电视
    addBox(scene, -5.4, 0.012, -3.2, 3.4, 0.02, 2.4, 0x9b4f3f).receiveShadow = true; // 地毯

    // 绿植：圆柱盆 + 球冠
    const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.16, 0.4, 12),
        new THREE.MeshStandardMaterial({ color: 0xa9683f, roughness: 0.9 })
    );
    pot.position.set(-7.2, 0.2, 0.8); pot.castShadow = true; scene.add(pot);
    const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x3f7d46, roughness: 0.95 })
    );
    leaf.position.set(-7.2, 0.75, 0.8); leaf.castShadow = true; scene.add(leaf);

    /* ---------------- 主卧家具 ---------------- */
    addBox(scene, 6.6, 0.3, -4.4, 2.2, 0.6, 2.6, 0x6b4a2f);            // 床架
    addBox(scene, 6.6, 0.75, -4.4, 2.0, 0.3, 2.4, 0xd8d3c8, 0.95);     // 床垫
    addBox(scene, 6.6, 0.95, -5.2, 1.8, 0.14, 0.5, 0xffffff, 0.95);    // 枕头
    addBox(scene, 7.6, 0.9, -1.6, 0.5, 1.8, 1.8, 0x54402c);            // 衣柜
    addBox(scene, 5.2, 0.3, -5.4, 0.6, 0.6, 0.6, 0x6b4a2f);            // 床头柜
    const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xffe9b8, emissive: 0xffc766, emissiveIntensity: 0.9 })
    );
    lamp.position.set(5.2, 0.75, -5.4); scene.add(lamp);

    /* ---------------- 次卧家具 ---------------- */
    addBox(scene, 6.8, 0.28, 4.6, 1.8, 0.56, 2.2, 0x6b4a2f);           // 单人床
    addBox(scene, 6.8, 0.68, 4.6, 1.6, 0.26, 2.0, 0xcfe0e8, 0.95);     // 床垫
    addBox(scene, 6.8, 0.85, 5.35, 1.4, 0.12, 0.45, 0xffffff, 0.95);   // 枕头
    addBox(scene, 2.4, 0.4, 5.3, 1.6, 0.08, 0.7, 0x8a6f4d);            // 书桌
    addBox(scene, 2.4, 0.25, 5.8, 0.08, 0.5, 0.08, 0x8a6f4d);
    addBox(scene, 1.8, 0.25, 5.8, 0.08, 0.5, 0.08, 0x8a6f4d);
    addBox(scene, 2.4, 0.75, 5.3, 0.5, 0.5, 0.06, 0x222b38);           // 显示器

    /* ---------------- 标识牌（CSS2D）---------------- */
    const tags = [];
    for (const r of ROOMS) {
        const div = document.createElement('div');
        div.className = 'room-tag';
        div.innerHTML = `<span class="tag-text">${r.name}</span><span class="tag-tip">${r.tip}</span>`;
        const label = new CSS2DObject(div);
        label.position.set(r.cx, 2.1, r.cz);
        scene.add(label);
        tags.push({ room: r, div, label });
    }

    return { tags };
}
