// 引入three.js
import * as THREE from 'three';

/**
 * 案例-位移贴图 —— 模型部分
 *
 * displacementMap 位移贴图：用贴图的明暗去【真正推动顶点】
 *   - 亮的地方顶点往外鼓，暗的地方往里凹
 *   - displacementScale 控制推多远
 *
 * 和凹凸贴图(bumpMap)/法线贴图(normalMap)最本质的区别：
 *   位移贴图是【真的改几何形状】，能改变轮廓；bump/normal 只改光照，轮廓不变。
 *
 * 关键坑：位移只能推动已有的顶点！
 *   几何体必须足够细分（segments 给大），否则再大的 displacementScale 也只是个光滑球。
 *   这里的球用了 256 x 160 段，顶点数约 4 万，才能撑出颗粒感。
 */

const loader = new THREE.TextureLoader();

// 颜色贴图：砖墙表面颜色
const mapTexture = loader.load('../../three.js/examples/textures/brick_diffuse.jpg');
mapTexture.encoding = THREE.sRGBEncoding;
mapTexture.wrapS = mapTexture.wrapT = THREE.RepeatWrapping;
mapTexture.repeat.set(2, 1);

// 位移贴图：用砖块的灰度图（亮=凸起，暗=凹陷）
const displacementTexture = loader.load('../../three.js/examples/textures/brick_bump.jpg');
displacementTexture.wrapS = displacementTexture.wrapT = THREE.RepeatWrapping;
displacementTexture.repeat.set(2, 1);
// 位移是几何数据，保持线性，不要设 sRGB

const sphere = new THREE.Mesh(
    // 分段数给大！这是位移贴图生效的前提
    new THREE.SphereGeometry(70, 256, 160),
    new THREE.MeshStandardMaterial({
        map: mapTexture,
        displacementMap: displacementTexture,
        displacementScale: 12,       // 位移强度（世界单位）
        displacementBias: -6,        // 整体偏移，让鼓/凹以原始表面为中心
        roughness: 0.85,
        metalness: 0.05,
    })
);
sphere.position.set(0, 80, 0);
sphere.castShadow = true;
sphere.receiveShadow = true;
sphere.name = 'displaced-sphere';

// 地面（用于观察阴影和"表面真的变形了"的投影轮廓）
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshStandardMaterial({ color: 0x23272f, roughness: 0.9, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;

// 平行光：侧光最能看出凹凸（正面光会把起伏照平）
const directionalLight = new THREE.DirectionalLight(0xffffff, 2.4);
directionalLight.position.set(-260, 300, 240);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
const sc = directionalLight.shadow.camera;
sc.left = -300; sc.right = 300; sc.top = 300; sc.bottom = -300;
sc.near = 1; sc.far = 1400;
directionalLight.shadow.bias = -0.0008;

const ambient = new THREE.AmbientLight(0xffffff, 0.35);

const group = new THREE.Group();
group.add(sphere, ground, directionalLight, ambient);

export { group as default, sphere, ground, directionalLight, ambient, mapTexture, displacementTexture };
