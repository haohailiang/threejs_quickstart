import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * 第三人称走动 + 刚体碰撞：
 *   - 人 = KINEMATIC 刚体（不受力但 velocity 由代码驱动），用两个错开的
 *     球形碰撞体拼成"胶囊"：下面的球管"推"，偏上的球管"撞翻"——
 *     碰撞点在方块重心以上，方块才会翻滚而不是平移。
 *   - 方块 = DYNAMIC 刚体，阻尼 + 休眠让它"翻滚之后最终停下"。
 */

export const CHAR_R = 0.4;

/* ------------------------------ 物理世界 ------------------------------ */
export function buildPhysics(scene) {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;

    const matChar = new CANNON.Material('char');
    const matCube = new CANNON.Material('cube');
    const matGround = new CANNON.Material('ground');
    // 人撞方块：摩擦小一点（不然方块粘在人身上），弹性小
    world.addContactMaterial(new CANNON.ContactMaterial(matChar, matCube, { friction: 0.1, restitution: 0.05 }));
    // 方块 ~ 地面：摩擦大（翻滚要能减速停下）
    world.addContactMaterial(new CANNON.ContactMaterial(matCube, matGround, { friction: 0.5, restitution: 0.15 }));

    // 地面
    const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: matGround });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(ground);

    const groundMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(90, 90),
        new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.95 })
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const grid = new THREE.GridHelper(90, 45, 0x3a4a5e, 0x222c38);
    grid.position.y = 0.01;
    scene.add(grid);

    /* ------------------------------ 主角（运动学刚体） ------------------------------ */
    const charBody = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.KINEMATIC, // 不受重力/碰撞力，velocity 由代码驱动
        material: matChar,
        position: new CANNON.Vec3(0, 0, 0),
    });
    // 两球拼胶囊：低球推下半截，高球撞上半截 → 方块会被"掀翻"
    charBody.addShape(new CANNON.Sphere(CHAR_R), new CANNON.Vec3(0, 0.45, 0));
    charBody.addShape(new CANNON.Sphere(CHAR_R), new CANNON.Vec3(0, 1.15, 0));
    world.addBody(charBody);

    /* ------------------------------ 立方体群 ------------------------------ */
    const CUBE_DEFS = [
        [0.55, 0x42d392], [0.7, 0xffd23f], [0.9, 0xff6b57], [0.65, 0x3d8bff],
        [1.1, 0x9b51e0], [0.5, 0x27ae60], [0.8, 0xe67e22], [1.3, 0x34495e],
        [0.6, 0xe84393], [0.75, 0xf1c40f], [1.0, 0x1abc9c], [0.45, 0x7f8c8d],
    ];

    const cubes = CUBE_DEFS.map(([s, color], i) => {
        // 环形摆放，别挡出生点
        const angle = (i / CUBE_DEFS.length) * Math.PI * 2 + 0.35;
        const dist = 4.5 + (i % 4) * 2.4;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;

        const body = new CANNON.Body({
            mass: s * 4,
            shape: new CANNON.Box(new CANNON.Vec3(s / 2, s / 2, s / 2)),
            material: matCube,
            linearDamping: 0.25,  // 能量耗散 → 最终停下
            angularDamping: 0.35,
            position: new CANNON.Vec3(x, s / 2 + 0.02, z),
        });
        body.quaternion.setFromEuler(0, Math.random() * Math.PI, 0);
        world.addBody(body);

        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(s, s, s),
            new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 })
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        return { body, mesh, size: s };
    });

    function resetCubes() {
        CUBE_DEFS.forEach(([s], i) => {
            const angle = (i / CUBE_DEFS.length) * Math.PI * 2 + 0.35;
            const dist = 4.5 + (i % 4) * 2.4;
            const b = cubes[i].body;
            b.position.set(Math.cos(angle) * dist, s / 2 + 0.02, Math.sin(angle) * dist);
            b.quaternion.setFromEuler(0, Math.random() * Math.PI, 0);
            b.velocity.set(0, 0, 0);
            b.angularVelocity.set(0, 0, 0);
            b.wakeUp();
        });
    }

    return { world, charBody, cubes, resetCubes };
}

/* ------------------------------ 士兵模型 ------------------------------ */
export function loadSoldier(scene) {
    return new Promise((resolve, reject) => {
        new GLTFLoader().load(
            '../../three.js/examples/models/gltf/Soldier.glb',
            (gltf) => {
                const model = gltf.scene;
                const box = new THREE.Box3().setFromObject(model);
                model.scale.setScalar(1.8 / (box.max.y - box.min.y));
                model.traverse((o) => {
                    if (o.isMesh) {
                        o.castShadow = true;
                        o.frustumCulled = false;
                    }
                });
                model.position.set(0, 0, 0);
                scene.add(model);

                const mixer = new THREE.AnimationMixer(model);
                const get = (name) => mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, name));
                const actions = { Idle: get('Idle'), Walk: get('Walk'), Run: get('Run') };
                for (const a of Object.values(actions)) {
                    a.play();
                    a.setEffectiveWeight(0);
                }
                actions.Idle.setEffectiveWeight(1);

                let current = 'Idle';
                function fadeTo(name, duration = 0.22) {
                    if (current === name) return;
                    current = name;
                    for (const [key, a] of Object.entries(actions)) {
                        a._fadeTarget = key === name ? 1 : 0;
                        a._fadeSpeed = 1 / duration;
                    }
                }

                resolve({
                    model,
                    mixer,
                    fadeTo,
                    get current() { return current; },
                    update(dt) {
                        for (const a of Object.values(actions)) {
                            if (a._fadeTarget === undefined) continue;
                            const w = a.getEffectiveWeight();
                            const t = a._fadeTarget;
                            if (w !== t) {
                                const step = a._fadeSpeed * dt;
                                a.setEffectiveWeight(t > w ? Math.min(t, w + step) : Math.max(t, w - step));
                            }
                        }
                        mixer.update(dt);
                    },
                });
            },
            undefined,
            reject
        );
    });
}
