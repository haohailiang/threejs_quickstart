// 引入three.js
import * as THREE from 'three';

/**
 * 案例-环境贴图 —— 模型部分
 *
 * 环境贴图：模拟四周环境，在物体表面反射出来的画面
 *
 * 用法（对应课程）：
 *   1. 创建 CubeTextureLoader 立方体纹理加载器
 *   2. 加载 6 个面的图片（注意顺序），得到纹理对象
 *   3. 把纹理对象给材质当 envMap（或直接 scene.environment 全局生效）
 *
 * 六面顺序（数组下标 → 面）：
 *   0: px（+X 右）  1: nx（-X 左）
 *   2: py（+Y 上）  3: ny（-Y 下）
 *   4: pz（+Z 前）  5: nz（-Z 后）
 * 顺序错了会出现"上下颠倒/左右镜像"的诡异反射，这是环境贴图最常见的坑。
 */

/**
 * 1. CubeTextureLoader 立方体纹理加载器
 */
const cubeTextureLoader = new THREE.CubeTextureLoader();

/**
 * 2. 加载 6 个面（SwedishRoyalCastle 是 three.js 自带的一套城堡六面图）
 * 这里用 setPath 指定目录，再按【右、左、上、下、前、后】的顺序传文件名
 */
const cubeTexture = cubeTextureLoader
    .setPath('../../three.js/examples/textures/cube/SwedishRoyalCastle/')
    .load([
        'px.jpg', // +X 右
        'nx.jpg', // -X 左
        'py.jpg', // +Y 上
        'ny.jpg', // -Y 下
        'pz.jpg', // +Z 前
        'nz.jpg', // -Z 后
    ]);

// 环境贴图是 sRGB 色彩空间的照片（r148 写法；r152 后改为 colorSpace）
cubeTexture.encoding = THREE.sRGBEncoding;

/**
 * 3. 中央的金属球：表面倒映出四周的环境
 * 金属度 1 + 粗糙度很低 → 像镜子一样把 cubeTexture 反射出来
 */
const metalBall = new THREE.Mesh(
    new THREE.SphereGeometry(60, 64, 48),
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 1,     // 纯金属
        roughness: 0.05,  // 几乎镜面
        envMap: cubeTexture, // 把立方体纹理作为环境贴图
    })
);
metalBall.position.set(0, 80, 0);
metalBall.castShadow = true;
metalBall.name = 'metal-ball';

/**
 * 4. 四周摆几个物体，让"环境"和"反射"的关系更直观
 * 它们也用同一张环境贴图，只是粗糙度不同 → 反射的清晰度不同
 */
const roughList = [0.15, 0.45, 0.85];
const satellites = roughList.map((rough, i) => {
    const angle = (i / roughList.length) * Math.PI * 2;
    const mesh = new THREE.Mesh(
        new THREE.TorusKnotGeometry(16, 5.5, 128, 24),
        new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 1,
            roughness: rough,
            envMap: cubeTexture,
        })
    );
    mesh.position.set(Math.cos(angle) * 190, 70, Math.sin(angle) * 190);
    mesh.castShadow = true;
    return mesh;
});

// 地面（也反射一点点环境，地毯式的暗色）
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshStandardMaterial({
        color: 0x2a2f38,
        metalness: 0.6,
        roughness: 0.35,
        envMap: cubeTexture,
    })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;

// 平行光：金属主要靠环境反射，灯光只是点缀（让地面有阴影）
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(240, 320, 220);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
const sc = directionalLight.shadow.camera;
sc.left = -320; sc.right = 320; sc.top = 320; sc.bottom = -320;
sc.near = 1; sc.far = 1400;

const ambient = new THREE.AmbientLight(0xffffff, 0.15);

const group = new THREE.Group();
group.add(metalBall, ...satellites, ground, directionalLight, ambient);

export { group as default, cubeTexture, metalBall, satellites, ground, directionalLight, ambient };
