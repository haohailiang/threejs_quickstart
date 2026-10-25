// 引入Three.js
import * as THREE from 'three';
// 引入gltf模型加载库GLTFLoader.js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


const loader = new GLTFLoader(); //创建一个GLTF加载器

const model = new THREE.Group(); //声明一个组对象，用来添加加载成功的三维场景

// loader.load("./简易小区.glb", function (gltf) { 
//     // 递归遍历所有模型节点批量修改材质
//     gltf.scene.traverse(function(obj) {
//         if (obj.isMesh) {//判断是否是网格模型
//             console.log('模型节点',obj);
//             console.log('模型节点名字',obj.name);
//             console.log('gltf默认材质',obj.material);
//         }
//     });
//     model.add(gltf.scene);
// })

loader.load("../../工厂.glb", function (gltf) { 
    // 递归遍历所有模型节点批量修改材质
    gltf.scene.traverse(function(obj) {
        if (obj.isMesh) {//判断是否是网格模型
            // 重新设置材质
            obj.material = new THREE.MeshLambertMaterial({
                color:0xffffff,
            });
        }
    });
    model.add(gltf.scene);
})
export default model;
