// 引入Three.js
import * as THREE from 'three';
// 引入gltf模型加载库GLTFLoader.js
import {
    GLTFLoader
} from 'three/addons/loaders/GLTFLoader.js';


const loader = new GLTFLoader(); //创建一个GLTF加载器

const model = new THREE.Group(); //声明一个组对象，用来添加加载成功的三维场景
// 加载环境贴图
// 加载周围环境6个方向贴图
// 上下左右前后6张贴图构成一个立方体空间
// 'px.jpg', 'nx.jpg'：x轴正方向、负方向贴图  p:正positive  n:负negative
// 'py.jpg', 'ny.jpg'：y轴贴图
// 'pz.jpg', 'nz.jpg'：z轴贴图
// CubeTexture表示立方体纹理对象，父类是纹理对象Texture
const textureCube = new THREE.CubeTextureLoader()
    .setPath('../../环境贴图/环境贴图1/')
    // .setPath('../../环境贴图/环境贴图3/')
    .load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
    
loader.load("../工厂.glb", function (gltf) {
    // 递归遍历批量设置环境贴图
    // gltf.scene.traverse(function (obj) {
    //     if (obj.isMesh) { //判断是否是网格模型
    //         obj.material.envMap = textureCube; //设置环境贴图
    //         obj.material.envMapIntensity = 1.0;
    //     }
    // });
    model.add(gltf.scene);
})
export default model;