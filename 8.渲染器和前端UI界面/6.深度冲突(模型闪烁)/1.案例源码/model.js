import * as THREE from 'three';



// 两个矩形平面Mesh重合，产生闪烁
// 闪烁原因：两个矩形面位置重合，GPU无法分清谁在前谁在后
const geometry = new THREE.PlaneGeometry(250, 250);
const material = new THREE.MeshLambertMaterial({
    color: 0x00ffff,
    side: THREE.DoubleSide,
});
const mesh = new THREE.Mesh(geometry, material);


const geometry2 = new THREE.PlaneGeometry(300, 300); 
const material2 = new THREE.MeshLambertMaterial({
    color: 0xff6666,
    side: THREE.DoubleSide,
});
const mesh2 = new THREE.Mesh(geometry2, material2);
const group = new THREE.Group();
group.add(mesh,mesh2);

// 适当偏移，解决深度冲突，偏移尺寸相对模型尺寸比较小，视觉上两个平面近似还是重合
// mesh2.position.z = 1;
// mesh2.position.z = 0.1;

// 当两个面间隙很小，也可能出现深度冲突。
mesh2.position.z = 0.0000000000000000000001;

export default group;