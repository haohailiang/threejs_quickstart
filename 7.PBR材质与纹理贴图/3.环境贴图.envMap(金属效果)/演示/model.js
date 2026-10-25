// 引入Three.js
import * as THREE from 'three';
// 引入gltf模型加载库GLTFLoader.js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


const loader = new GLTFLoader(); //创建一个GLTF加载器

const model = new THREE.Group(); //声明一个组对象，用来添加加载成功的三维场景

const textureCube = new THREE.CubeTextureLoader()
.setPath('../../环境贴图/环境贴图0/')
.load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);

loader.load("../../金属.glb", function (gltf) { 
    // 递归遍历所有模型节点批量修改材质
    gltf.scene.traverse(function(obj) {
        if (obj.isMesh) {//判断是否是网格模型
            // console.log('obj.material',obj.material);
            // 重新设置材质的金属度和粗糙度属性
            obj.material.metalness = 1.0;//金属度
            obj.material.roughness = 0.35;//表面粗糙度

        }
    });
    model.add(gltf.scene);
})
export default model;
