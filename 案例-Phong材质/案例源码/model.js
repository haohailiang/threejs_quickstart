// 引入three.js
import * as THREE from 'three';

/**
 * 案例-Phong材质 —— 模型部分
 *
 * MeshPhongMaterial = 漫反射 + 镜面高光（Phong 光照模型）
 * 和 Lambert 的区别：Lambert 只有漫反射没有高光，Phong 多了一个"亮点"
 * 关键参数：
 *   shininess  —— 高光的锐利程度，越大高光斑越小越亮越像瓷器/塑料
 *   specular   —— 高光的颜色
 */

// 球体
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(60, 64, 48),
    new THREE.MeshPhongMaterial({
        color: 0x3b82f6,      // 材质固有色（漫反射颜色）
        shininess: 60,        // 高光锐度
        specular: 0xffffff,   // 高光颜色
    })
);
sphere.position.set(0, 70, 0);
sphere.castShadow = true;

// 地面
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshPhongMaterial({ color: 0x22262f, shininess: 10 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;

// 平行光：高光要有明确的"点光源感"，平行光也能产生高光斑
const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(220, 300, 200);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
const sc = directionalLight.shadow.camera;
sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260;
sc.near = 1; sc.far = 1200;

const ambient = new THREE.AmbientLight(0xffffff, 0.25);

const group = new THREE.Group();
group.add(sphere, ground, directionalLight, ambient);

export { group as default, sphere, ground, directionalLight, ambient };
