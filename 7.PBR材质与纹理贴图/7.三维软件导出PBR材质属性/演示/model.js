// 引入Three.js
import * as THREE from 'three';
// 引入gltf模型加载库GLTFLoader.js
import {
    GLTFLoader
} from 'three/addons/loaders/GLTFLoader.js';

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
    // mesh1.material.envMap = textureCube; //环境贴图
    // mesh1.material.envMapIntensity = 1.0; //环境贴图对Mesh表面影响程度


    const mesh2 = gltf.scene.getObjectByName('玻璃01');
    // mesh2.material.envMap = textureCube; //环境贴图
    // mesh2.material.envMapIntensity = 1.0; //环境贴图对Mesh表面影响程度
})
export default model;