import * as THREE from 'three';


const geometry = new THREE.BoxGeometry(120, 120, 120);
const material = new THREE.MeshLambertMaterial({
    color: 0x00ffff,
});
const mesh = new THREE.Mesh(geometry, material);


export default mesh;