// 引入three.js
import * as THREE from 'three';

/**
 * 案例-平行光与阴影
 *
 * 目标：
 * - MeshLambertMaterial（只算漫反射，没有高光）的球体
 * - 一盏平行光（DirectionalLight）照亮它，形成"一大半亮、一小半暗"的明暗交界
 * - 球体在地面上投下真实阴影（Shadow Map）
 * - 用 DirectionalLightHelper 把光的"方向"可视化出来
 */

/**
 * 1. 球体：MeshLambertMaterial
 * Lambert 材质的特点：只有漫反射，没有镜面高光，表面亮度 ∝ 法线与光线夹角
 * 所以正对光的一面最亮，逐渐过渡到背光的暗面 —— 这条明暗交界线就是"体积感"的来源
 */
const SPHERE_R = 60;
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_R, 64, 48),
    new THREE.MeshLambertMaterial({ color: 0x4f9dff })
);
sphere.position.set(0, SPHERE_R, 0); // 球心抬到 y=半径，正好"坐"在地面上
sphere.castShadow = true;            // 球体要投影，必须开
sphere.name = 'lambert-sphere';

/**
 * 2. 地面：接收阴影
 * 只有材质是受光材质（Lambert/Phong/Standard）时，才能看到明暗和阴影
 */
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshLambertMaterial({ color: 0x2a2f3a })
);
ground.rotation.x = -Math.PI / 2; // 平面默认竖直的，转成水平地面
ground.receiveShadow = true;      // 地面要接收阴影，必须开
ground.name = 'ground';

/**
 * 3. 平行光
 * 平行光只有"方向"没有"位置概念"：它从 position 指向 target（默认世界原点），
 * 光线全部平行射出，像太阳光一样，所以整个场景受光方向一致，不会被距离衰减
 */
const directionalLight = new THREE.DirectionalLight(0xffffff, 2.2);
directionalLight.position.set(260, 320, 200); // 右前上方 → 球体右前方亮、左后方暗
directionalLight.target.position.set(0, 0, 0);

// 开启投影
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048); // 阴影贴图分辨率，越大越清晰也越吃性能
// 平行光的阴影相机是【正交相机】，必须手动框住要投影的区域，否则阴影会缺失或糊成一团
const sc = directionalLight.shadow.camera;
sc.left = -260;
sc.right = 260;
sc.top = 260;
sc.bottom = -260;
sc.near = 1;
sc.far = 1200;
// 消除自阴影产生的条纹（shadow acne）
directionalLight.shadow.bias = -0.0008;

/**
 * 4. 环境光（很小的一点点）
 * 完全不给环境光，暗面就是纯黑；给一点点能让暗面还有轮廓。
 * 数值越小，明暗对比越强 —— gui 里可以实时调，直观感受
 */
const ambient = new THREE.AmbientLight(0xffffff, 0.12);

/**
 * 5. 辅助对象
 */
// 平行光辅助：画出光的起点方块 + 指向目标的方向线
const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 120, 0xffcc33);
// 阴影相机辅助：画出平行光"看不见的那台相机"的视锥体（虚线框），
// 地面的阴影只在这个框内才被渲染出来
const shadowCamHelper = new THREE.CameraHelper(directionalLight.shadow.camera);

/**
 * 6. 组装
 */
const group = new THREE.Group();
group.add(sphere, ground, directionalLight, directionalLight.target, ambient, lightHelper);

export {
    group as default,
    sphere,
    ground,
    directionalLight,
    ambient,
    lightHelper,
    shadowCamHelper,
    SPHERE_R,
};
