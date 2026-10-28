// 引入three.js
import * as THREE from 'three';

/**
 * 案例-金属度 —— 模型部分
 *
 * MeshStandardMaterial（PBR 标准材质）两个最核心的参数：
 *   metalness 金属度 0~1：0 = 绝缘体（塑料/木头/石头），1 = 金属
 *   roughness 粗糙度 0~1：0 = 镜面，1 = 完全哑光
 *
 * 重点：金属材质几乎不漫反射，全靠【反射环境】表现。
 * 所以没有环境贴图时，metalness=1 的球会变得很暗很"脏" —— 这是最常见的困惑点。
 * 这里用官方的 RoomEnvironment 程序化生成环境，无需任何 HDR 素材。
 */

const ROUGHNESS = 0.25;

// 三个球：金属度 0 / 0.5 / 1，横向排开做对比
const metalnessList = [0, 0.5, 1];
const spheres = metalnessList.map((m, i) => {
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(58, 64, 48),
        new THREE.MeshStandardMaterial({
            color: 0xd9a441,   // 金色固有色，金属度拉满时最像铜/金
            metalness: m,
            roughness: ROUGHNESS,
        })
    );
    mesh.position.set((i - 1) * 170, 70, 0);
    mesh.castShadow = true;
    mesh.userData.metalness = m;
    return mesh;
});

// 地面
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshStandardMaterial({ color: 0x23272f, roughness: 0.8, metalness: 0.1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;

// 平行光（PBR 材质同样需要灯光，但金属的表面主要靠环境反射）
const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(240, 320, 220);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
const sc = directionalLight.shadow.camera;
sc.left = -300; sc.right = 300; sc.top = 300; sc.bottom = -300;
sc.near = 1; sc.far = 1400;

const ambient = new THREE.AmbientLight(0xffffff, 0.2);

const group = new THREE.Group();
group.add(...spheres, ground, directionalLight, ambient);

export { group as default, spheres, ground, directionalLight, ambient, ROUGHNESS };
