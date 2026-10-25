// 引入Three.js
import * as THREE from 'three';
// 引入gltf模型加载库GLTFLoader.js
import {
    GLTFLoader
} from 'three/addons/loaders/GLTFLoader.js';


const loader = new GLTFLoader(); //创建一个GLTF加载器

const model = new THREE.Group(); //声明一个组对象，用来添加加载成功的三维场景


// loader.load("./简易小区.glb", function (gltf) { 
//     gltf.scene.traverse(function(obj){
//         // 只获取所有mesh节点
//         if(obj.isMesh){
//             // 查看threejs渲染gltf默认材质
//             console.log('obj.material',obj.material);
//         }
//     })
//     model.add(gltf.scene);
// })

loader.load("../../工厂.gltf", function (gltf) { //gltf加载成功后返回一个对象
    // console.log('控制台查看gltf对象结构', gltf);
    // console.log('场景3D模型数据', gltf.scene);
    gltf.scene.traverse(function (obj) {
        // 只获取所有mesh节点
        if (obj.isMesh) {
            obj.material = new THREE.MeshLambertMaterial({
                color:0xffffff,
            })
        }
    })
    model.add(gltf.scene); //三维场景添加到model组对象中
})



export default model;