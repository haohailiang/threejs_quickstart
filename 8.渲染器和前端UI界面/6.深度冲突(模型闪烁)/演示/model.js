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



export default group;