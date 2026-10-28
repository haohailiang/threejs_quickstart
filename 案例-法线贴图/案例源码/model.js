// 引入three.js
import * as THREE from 'three';

/**
 * 案例-法线贴图 —— 模型部分
 *
 * 法线贴图(normalMap) 存的是"每个像素的法线方向"（RGB 三个通道分别对应 XYZ）。
 * 光照计算时用贴图里的法线替代几何体本身的法线，
 * 于是同一个平面上，不同像素的**反射方向就不一样**，看起来就有凹凸起伏 ——
 * 但几何体本身没变（轮廓还是光滑的，这就是和位移贴图的区别）。
 *
 * 本 demo：左右两个一模一样的金属球，
 * 左边【没有】法线贴图 → 表面光滑，只有一个大高光；
 * 右边【有】法线贴图   → 高光被打碎成许多细小的反射，光斑随光源转动而流动。
 */

const loader = new THREE.TextureLoader();

// 水波法线贴图（蓝紫色的那种图，就是法线图的标准长相）
const normalTexture = loader.load('../../three.js/examples/textures/water/Water_1_M_Normal.jpg');
normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
normalTexture.repeat.set(3, 3); // 平铺几次，让波纹更密
// 法线贴图是数据图，保持线性，不能设 sRGB（设了法线就会被"提亮"，光照全错）

// 共享的金属材质参数
function makeMaterial(withNormal) {
    const mat = new THREE.MeshStandardMaterial({
        color: 0x8fa3b8,
        metalness: 0.95,   // 高金属度：靠反射环境，法线的变化会非常明显
        roughness: 0.18,   // 低粗糙度：镜面感强，高光锐利
    });
    if (withNormal) {
        mat.normalMap = normalTexture;
        mat.normalScale = new THREE.Vector2(1, 1); // 法线强度，xy 分别对应 u/v 方向
    }
    return mat;
}

// 左球：无法线贴图
const sphereSmooth = new THREE.Mesh(new THREE.SphereGeometry(60, 64, 48), makeMaterial(false));
sphereSmooth.position.set(-90, 75, 0);
sphereSmooth.castShadow = true;

// 右球：有法线贴图
const sphereNormal = new THREE.Mesh(new THREE.SphereGeometry(60, 64, 48), makeMaterial(true));
sphereNormal.position.set(90, 75, 0);
sphereNormal.castShadow = true;

// 地面
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshStandardMaterial({ color: 0x23272f, roughness: 0.85, metalness: 0.1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;

// 平行光：位置可绕 Y 轴转（gui 里调方位角），观察两个球高光的变化差异
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(200, 300, 200);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
const sc = directionalLight.shadow.camera;
sc.left = -300; sc.right = 300; sc.top = 300; sc.bottom = -300;
sc.near = 1; sc.far = 1400;

// 加两盏彩色点光，让金属球上有"环境感"的彩色反射，法线效果更直观
const warmLight = new THREE.PointLight(0xff9a3c, 60, 800, 2);
warmLight.position.set(-260, 180, -160);
const coolLight = new THREE.PointLight(0x3c9aff, 60, 800, 2);
coolLight.position.set(260, 160, -160);

const ambient = new THREE.AmbientLight(0xffffff, 0.05);

const group = new THREE.Group();
group.add(sphereSmooth, sphereNormal, ground, directionalLight, warmLight, coolLight, ambient);

export {
    group as default,
    sphereSmooth,
    sphereNormal,
    ground,
    directionalLight,
    warmLight,
    coolLight,
    ambient,
    normalTexture,
};
