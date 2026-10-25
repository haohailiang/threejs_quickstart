// 引入three.js
import * as THREE from 'three';
// 引入轨道控制器扩展库OrbitControls.js
import {
    OrbitControls
} from 'three/addons/controls/OrbitControls.js';

/**
 * 创建3D场景对象Scene
 */
const scene = new THREE.Scene();

// 创建网格模型
const geometry = new THREE.PlaneGeometry(100, 50);

// // new实例化类THREE.MeshLambertMaterial，创建一个材质对象
// const material = new THREE.MeshLambertMaterial();
// // 可以看到材质对象的属性color、side、opacity、transparent...
// // 通过属性可以看到threejs默认的属性值
// console.log('查看材质对象',material);
// // 查看材质默认属性值
// console.log('material.color',material.color);
// console.log('material.side',material.side);
// console.log('material.transparent',material.transparent);
// console.log('material.opacity',material.opacity);

const material = new THREE.MeshLambertMaterial({
    // 通过选项参数设置材质属性
    color: 0x00ffff, 
    side:THREE.DoubleSide,
    transparent:true,
    opacity:0.5,
});
// 访问对象属性改变属性的值
material.transparent = false;
material.opacity = 1.0

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh); 

console.log('模型位置属性',mesh.position);
mesh.position.x = 50;//访问属性改变位置x坐标
mesh.translateX(50);//执行方法改变位置属性


//辅助观察的坐标系
const axesHelper = new THREE.AxesHelper(100);
scene.add(axesHelper);


//光源设置
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);;
directionalLight.position.set(400, 200, 300);
scene.add(directionalLight);
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
console.log('directionalLight',ambient.intensity);
directionalLight.intensity = 0.1;//改变光源强度




//相机
const width = window.innerWidth;
const height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(30, width / height, 1, 3000);
camera.position.set(292, 223, 185);
camera.lookAt(0, 0, 0);

// WebGL渲染器设置
const renderer = new THREE.WebGLRenderer({
    antialias:true,//开启优化锯齿
});
renderer.setPixelRatio(window.devicePixelRatio);//防止输出模糊
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);


// 设置相机控件轨道控制器OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);


// 渲染循环
function render() {
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}
render();


// 画布跟随窗口变化
window.onresize = function () {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
};