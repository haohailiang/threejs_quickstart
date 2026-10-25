// 引入Three.js
import * as THREE from 'three';
// 引入gltf模型加载库GLTFLoader.js
import {
    GLTFLoader
} from 'three/addons/loaders/GLTFLoader.js';

import gui from './gui.js';

// 创建材质子菜单
const matFolder1 = gui.addFolder('外壳材质');
matFolder1.close(); //关闭菜单
const matFolder2 = gui.addFolder('玻璃材质');
matFolder2.close(); //关闭菜单




const loader = new GLTFLoader(); //创建一个GLTF加载器

const model = new THREE.Group(); //声明一个组对象，用来添加加载成功的三维场景
// 加载环境贴图
const textureCube = new THREE.CubeTextureLoader()
    .setPath('../../环境贴图/环境贴图1/')
    .load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
textureCube.encoding = THREE.sRGBEncoding; //设置纹理贴图编码方式和WebGL渲染器一致    
loader.load("../车pbr.glb", function (gltf) {
    model.add(gltf.scene);
    // 注意如果车外壳或玻璃共享了材质，修改一个其他的也会变化和影响

    const mesh1 = gltf.scene.getObjectByName('外壳01');
    mesh1.material.envMap = textureCube; //环境贴图
    mesh1.material.envMapIntensity = 1.0; ////环境贴图对Mesh表面影响程度


    const mesh2 = gltf.scene.getObjectByName('玻璃01');
    mesh2.material.envMap = textureCube; //环境贴图
    mesh2.material.envMapIntensity = 1.0; ////环境贴图对Mesh表面影响程度

    // 查看threejs解析的PBR材质
    gltf.scene.traverse(function(obj) {
        if (obj.isMesh) {
            console.log('obj.material',obj.material);
        }
    });
    console.log('外壳',mesh1.material);
    console.log('玻璃',mesh2.material);

    const obj = {
        color1: mesh1.material.color.getHex(), // 外壳颜色
        color2: mesh2.material.color.getHex(), // 玻璃颜色
    };
    // 车壳材质gui界面
    matFolder1.addColor(obj, 'color1').onChange(function (value) {
        mesh1.material.color.set(value);
    });
    matFolder1.add(mesh1.material, 'metalness', 0, 1);
    matFolder1.add(mesh1.material, 'roughness', 0, 1);
    matFolder1.add(mesh1.material, 'clearcoat', 0, 1);
    matFolder1.add(mesh1.material, 'clearcoatRoughness', 0, 1);
    matFolder1.add(mesh1.material, 'envMapIntensity', 0, 10);

    // 玻璃材质gui界面
    matFolder2.addColor(obj, 'color2').onChange(function (value) {
        mesh2.material.color.set(value);
    });
    matFolder2.add(mesh2.material, 'metalness', 0, 1);
    matFolder2.add(mesh2.material, 'roughness', 0, 1);
    matFolder2.add(mesh2.material, 'transmission', 0, 1);
    matFolder2.add(mesh2.material, 'ior', 1, 2.333);
    matFolder2.add(mesh2.material, 'envMapIntensity', 0, 10);
})
export default model;