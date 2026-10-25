import * as THREE from 'three';
import {
    OrbitControls
} from 'three/addons/controls/OrbitControls.js';

// 引入后处理扩展库EffectComposer.js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// 引入渲染器通道RenderPass
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// 引入OutlinePass通道
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

import {model,mesh} from './model.js'; //模型对象

//场景
const scene = new THREE.Scene();
scene.add(model); //模型对象添加到场景中


//辅助观察的坐标系
const axesHelper = new THREE.AxesHelper(100);
scene.add(axesHelper);


//光源设置
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(100, 60, 50);
scene.add(directionalLight);
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);


//相机
const width = window.innerWidth;
const height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(30, width / height, 1, 3000);
camera.position.set(292, 223, 185);
camera.lookAt(0, 0, 0);

// WebGL渲染器设置
const renderer = new THREE.WebGLRenderer({
    antialias: true, //开启优化锯齿
});
renderer.setPixelRatio(window.devicePixelRatio); //防止输出模糊
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

// 创建后处理对象EffectComposer，WebGL渲染器作为参数
const composer = new EffectComposer(renderer);
// 创建一个渲染器通道，场景和相机作为参数
const renderPass = new RenderPass(scene, camera);
// 设置renderPass通道
composer.addPass(renderPass);

// 创建OutlinePass通道,显示模型外轮廓边框
const v2 = new THREE.Vector2(window.innerWidth, window.innerHeight);
// outlinePass第一个参数v2的尺寸和canvas画布保持一致
const outlinePass = new OutlinePass(v2, scene, camera);
//设置需要高亮发光描边的模型对象
outlinePass.selectedObjects = [mesh];
// 设置OutlinePass通道
composer.addPass(outlinePass);

// 渲染循环
function render() {
    // 使用后处理模块EffectComposer，可通过该对象的render方法调用渲染器的render方法
    composer.render();
    // renderer.render(scene, camera);
    requestAnimationFrame(render);
}
render();


const controls = new OrbitControls(camera, renderer.domElement);

// 画布跟随窗口变化
window.onresize = function () {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
};