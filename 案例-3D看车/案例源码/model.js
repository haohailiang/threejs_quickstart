import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/**
 * 法拉利 458 看车视角切换。
 *
 * 相机机位不写死：模型里正好有 rim_fl（前左轮）、rim_rr（后右轮）、
 * steering_wheel（方向盘）三个参照节点 —— 运行时用它们反推：
 *   车头方向  = rim_fl - rim_rr 的水平分量
 *   左侧方向  = up × 车头方向
 *   主驾位置  = 方向盘上方偏后（眼睛高度）
 * 这样不管模型朝哪个方向摆，机位都是对的。
 */

const CAR_PATH = '../../models/ferrari.glb';

function findByName(root, name) {
    let hit = null;
    root.traverse((o) => { if (o.name === name) hit = o; });
    return hit;
}

export function loadFerrari(scene) {
    return new Promise((resolve, reject) => {
        // ferrari.glb 是 KHR_draco_mesh_compression 压缩的，必须挂解码器
        const draco = new DRACOLoader();
        draco.setDecoderPath('../../three.js/examples/jsm/libs/draco/gltf/');

        const loader = new GLTFLoader();
        loader.setDRACOLoader(draco);
        loader.load(
            CAR_PATH,
            (gltf) => {
                const car = gltf.scene;
                car.traverse((o) => {
                    if (o.isMesh) {
                        o.castShadow = true;
                        o.receiveShadow = true;
                    }
                });

                /* ------------------ 车漆（清漆度，车漆 demo 里学过）------------------ */
                const body = findByName(car, 'body');
                if (body) {
                    body.material = new THREE.MeshPhysicalMaterial({
                        color: 0xd0111b,        // 法拉利红
                        metalness: 0.9,
                        roughness: 0.4,
                        clearcoat: 1.0,         // 清漆层
                        clearcoatRoughness: 0.03,
                    });
                }
                const glass = findByName(car, 'glass');
                if (glass) {
                    glass.material = new THREE.MeshPhysicalMaterial({
                        color: 0xffffff,
                        metalness: 0.25,
                        roughness: 0,
                        transmission: 0.9,      // 透射玻璃
                        transparent: true,
                        opacity: 0.5,
                    });
                }

                scene.add(car);

                /* ------------------ 参照点 → 机位计算 ------------------ */
                const box = new THREE.Box3().setFromObject(car);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                const pFL = findByName(car, 'rim_fl')?.getWorldPosition(new THREE.Vector3());
                const pRR = findByName(car, 'rim_rr')?.getWorldPosition(new THREE.Vector3());
                const pSteer = findByName(car, 'steering_wheel')?.getWorldPosition(new THREE.Vector3());

                let forward = new THREE.Vector3(0, 0, 1);
                if (pFL && pRR) {
                    forward.subVectors(pFL, pRR);
                    forward.y = 0;
                    forward.normalize();
                }
                const left = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

                /* 机位：都是"相对车体"的偏移，跟模型朝向无关 */
                // 方向盘偏离车体中心平面的横向距离（主驾在左还是右就看它的符号）
                const latSteer = pSteer ? (pSteer.x - center.x) * left.x + (pSteer.z - center.z) * left.z : 0.38;
                const eyeH = 1.55; // 坐在座椅上的眼睛高度

                const driverEye = center.clone()
                    .addScaledVector(left, latSteer)
                    .addScaledVector(forward, -0.15)
                    .setY(eyeH);
                const passengerEye = center.clone()
                    .addScaledVector(left, -latSteer)
                    .addScaledVector(forward, -0.15)
                    .setY(eyeH);
                const lookFrom = (eye) => eye.clone().addScaledVector(forward, 2.2).setY(eyeH - 0.45);

                const presets = {
                    exterior: {
                        name: '外观',
                        camPos: center.clone().addScaledVector(forward, 4.6).addScaledVector(left, 2.6).setY(1.7),
                        lookAt: center.clone().setY(0.55),
                    },
                    driver: {
                        name: '主驾驶位',
                        camPos: driverEye,
                        lookAt: lookFrom(driverEye),
                    },
                    passenger: {
                        name: '副驾驶位',
                        camPos: passengerEye,
                        lookAt: lookFrom(passengerEye),
                    },
                    rear: {
                        name: '后排',
                        camPos: center.clone().addScaledVector(forward, -1.05).setY(1.3),
                        lookAt: center.clone().addScaledVector(forward, 1.8).setY(0.75),
                    },
                };

                resolve({ car, presets, box, size });
            },
            undefined,
            (err) => reject(err)
        );
    });
}
