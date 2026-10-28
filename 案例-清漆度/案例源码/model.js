// 引入three.js
import * as THREE from 'three';

/**
 * 案例-清漆度 —— 模型部分
 *
 * clearcoat = 清漆层，只在 MeshPhysicalMaterial 上有。
 * 现实类比：车漆、钢琴烤漆、可乐瓶、指甲油 ——
 *   底下是一层颜色（可能还是哑光的），
 *   表面再刷一层【透明清漆】，这层清漆自己会反光，而且反光很锐利。
 *
 * 相关参数：
 *   clearcoat          清漆层强度 0~1（0 = 没有清漆层）
 *   clearcoatRoughness 清漆层粗糙度 0~1（越小越像镜面亮油）
 *
 * 本 demo 左右两个球：左 = 无清漆（普通哑光红漆），右 = 有清漆（亮面车漆）。
 */

// 底漆：深红色，本身略微哑光
function makeMaterial(clearcoat) {
    return new THREE.MeshPhysicalMaterial({
        color: 0x6b0d13,        // 深红车漆色
        metalness: 0.05,
        roughness: 0.55,        // 底漆本身比较哑
        clearcoat: clearcoat,   // 清漆层强度
        clearcoatRoughness: 0.08, // 清漆层很光滑 → 锐利的反光
        envMapIntensity: 0.45,  // 压低环境反射：clearcoat 是准镜面，环境太亮会把底色盖成粉白
    });
}

const ballPlain = new THREE.Mesh(new THREE.SphereGeometry(60, 64, 48), makeMaterial(0));
ballPlain.position.set(-90, 78, 0);
ballPlain.castShadow = true;

const ballCoated = new THREE.Mesh(new THREE.SphereGeometry(60, 64, 48), makeMaterial(1));
ballCoated.position.set(90, 78, 0);
ballCoated.castShadow = true;

// 再加一个扁平的车盖一样的曲面，看清漆的"长条高光"更像车漆
const hood = new THREE.Mesh(
    new THREE.SphereGeometry(95, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.32),
    makeMaterial(1)
);
hood.position.set(0, 4, 150);
hood.scale.set(0.75, 0.28, 0.75);
hood.castShadow = true;
hood.receiveShadow = true;

// 地面
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.35, metalness: 0.4 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;

// 平行光（产生主高光）
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(-220, 300, 260);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
const sc = directionalLight.shadow.camera;
sc.left = -300; sc.right = 300; sc.top = 300; sc.bottom = -300;
sc.near = 1; sc.far = 1400;

const ambient = new THREE.AmbientLight(0xffffff, 0.1);

const group = new THREE.Group();
group.add(ballPlain, ballCoated, hood, ground, directionalLight, ambient);

export { group as default, ballPlain, ballCoated, hood, ground, directionalLight, ambient };
