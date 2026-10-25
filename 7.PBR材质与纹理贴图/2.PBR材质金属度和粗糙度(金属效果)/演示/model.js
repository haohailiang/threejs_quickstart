// 引入Three.js
import * as THREE from 'three';
// 引入gltf模型加载库GLTFLoader.js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


const loader = new GLTFLoader(); //创建一个GLTF加载器

const model = new THREE.Group(); //声明一个组对象，用来添加加载成功的三维场景

loader.load("../../金属.glb", function (gltf) { 
    // 递归遍历所有模型节点批量修改材质
    gltf.scene.traverse(function(obj) {
        if (obj.isMesh) {//判断是否是网格模型
        
        }
    });
    model.add(gltf.scene);
})
export default model;
