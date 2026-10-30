import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * 台球：边跳边滚，最后停下 —— 三个力各管一件事
 *   ① 上抛初速度 vy > 0        → 球会离地，出现"边跳"
 *   ② 自旋 angularVelocity.z  → 落地瞬间球在"滑动"，摩擦力把它变成"滚动"
 *   ③ linearDamping / angularDamping → 能量耗尽，球自己停下来
 *
 * 判断纯滚动的公式（沿 X 方向运动时）：
 *   接触点滑移速度 slip = v_x + ω_z · R
 *   slip ≈ 0 → 球在"滚"；slip 很大 → 球在"滑"（球在地上打滑）
 */

export const BALL_R = 0.28;
export const CLOTH_X = 9;   // 台面长（X）
export const CLOTH_Z = 4.5; // 台面宽（Z）
const CUE_START = new THREE.Vector3(-3.4, BALL_R, 0);
const TRAIL_MAX = 900;

export function buildPoolScene(scene) {
    /* ------------------------------ 物理世界 ------------------------------ */
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;

    const matBall = new CANNON.Material('ball');
    const matCloth = new CANNON.Material('cloth');
    const matRail = new CANNON.Material('rail');

    // 球 ~ 台呢：摩擦大（能把滑动磨成滚动），弹性一般
    const cBallCloth = new CANNON.ContactMaterial(matBall, matCloth, { friction: 0.4, restitution: 0.42 });
    // 球 ~ 库边：几乎不摩擦，弹性高（撞库才有力）
    world.addContactMaterial(new CANNON.ContactMaterial(matBall, matRail, { friction: 0.05, restitution: 0.85 }));
    // 球 ~ 球：弹性很高（台球对撞）
    world.addContactMaterial(new CANNON.ContactMaterial(matBall, matBall, { friction: 0.05, restitution: 0.92 }));
    world.addContactMaterial(cBallCloth);

    /* -------------------------------- 台面 -------------------------------- */
    const clothBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: matCloth });
    clothBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(clothBody);

    const clothMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(CLOTH_X + 0.6, CLOTH_Z + 0.6),
        new THREE.MeshStandardMaterial({ color: 0x1c6b46, roughness: 0.95 })
    );
    clothMesh.rotation.x = -Math.PI / 2;
    clothMesh.receiveShadow = true;
    scene.add(clothMesh);

    // 台身（纯装饰，让台面看起来有厚度）
    const frame = new THREE.Mesh(
        new THREE.BoxGeometry(CLOTH_X + 1.5, 0.5, CLOTH_Z + 1.5),
        new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.8 })
    );
    frame.position.y = -0.26;
    frame.receiveShadow = true;
    frame.castShadow = true;
    scene.add(frame);

    /* ------------------------------- 四个库边 ------------------------------- */
    const RAIL_H = 0.45;
    const RAIL_T = 0.35;
    const railMat = new THREE.MeshStandardMaterial({ color: 0x4a2f1e, roughness: 0.75 });
    const railMeshes = [];

    function addRail(halfX, halfZ, px, pz) {
        const body = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(halfX, RAIL_H / 2, halfZ)),
            material: matRail,
            position: new CANNON.Vec3(px, RAIL_H / 2, pz),
        });
        world.addBody(body);

        const mesh = new THREE.Mesh(new THREE.BoxGeometry(halfX * 2, RAIL_H, halfZ * 2), railMat);
        mesh.position.set(px, RAIL_H / 2, pz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        railMeshes.push(mesh);
    }

    const hx = CLOTH_X / 2, hz = CLOTH_Z / 2;
    addRail(hx + RAIL_T, RAIL_T, 0, hz + RAIL_T);   // 前
    addRail(hx + RAIL_T, RAIL_T, 0, -hz - RAIL_T);  // 后
    addRail(RAIL_T, hz, hx + RAIL_T, 0);            // 右
    addRail(RAIL_T, hz, -hx - RAIL_T, 0);           // 左

    /* --------------------------------- 球 --------------------------------- */
    const BALL_DEFS = [
        { color: 0xf5f5f5, pos: [CUE_START.x, BALL_R, CUE_START.z], cue: true },
        { color: 0xf2c94c, pos: [1.6, BALL_R, 1.35] },
        { color: 0xeb5757, pos: [2.4, BALL_R, -1.2] },
        { color: 0x2d9cdb, pos: [3.0, BALL_R, 0.85] },
        { color: 0x9b51e0, pos: [3.6, BALL_R, -0.45] },
        { color: 0x27ae60, pos: [1.9, BALL_R, -1.85] },
    ];

    const balls = BALL_DEFS.map((def) => {
        const body = new CANNON.Body({
            mass: 0.17, // 标准台球约 170g
            shape: new CANNON.Sphere(BALL_R),
            material: matBall,
            linearDamping: 0.18,  // 台呢阻力（比空气大得多）
            angularDamping: 0.22,
            position: new CANNON.Vec3(def.pos[0], def.pos[1], def.pos[2]),
        });
        world.addBody(body);

        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(BALL_R, 26, 18),
            new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.18, metalness: 0.06 })
        );
        mesh.castShadow = true;
        scene.add(mesh);
        return { body, mesh, isCue: !!def.cue };
    });

    const cue = balls[0];

    /* ------------------------------- 轨迹线 ------------------------------- */
    const trailPos = new Float32Array(TRAIL_MAX * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3).setUsage(THREE.DynamicDrawUsage));
    trailGeo.setDrawRange(0, 0);
    scene.add(new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffd23f })));
    let trailCount = 0;

    function clearTrail() {
        trailCount = 0;
        trailGeo.setDrawRange(0, 0);
    }

    /* ------------------------------- 击球 ------------------------------- */
    function strike(speed, up, spin) {
        // 其他球复位
        BALL_DEFS.forEach((def, i) => {
            const b = balls[i].body;
            b.position.set(def.pos[0], def.pos[1], def.pos[2]);
            b.velocity.set(0, 0, 0);
            b.angularVelocity.set(0, 0, 0);
            b.quaternion.set(0, 0, 0, 1);
            b.wakeUp();
        });

        // 母球：水平速度 + 上抛分量 + 后旋（ωz 为负 → 向前滚动）
        cue.body.position.set(CUE_START.x, CUE_START.y, CUE_START.z);
        cue.body.velocity.set(speed, up, 0.5);
        cue.body.angularVelocity.set(0, 0, -spin);
        cue.body.wakeUp();

        clearTrail();
    }

    /* ------------------------------ 每帧计数 ------------------------------ */
    const state = { slip: 0, speed: 0, spin: 0 };

    function tick() {
        const v = cue.body.velocity;
        const w = cue.body.angularVelocity;

        state.speed = Math.hypot(v.x, v.y, v.z);
        state.spin = Math.abs(w.z);
        // 接触点沿 X 的滑移速度
        state.slip = Math.abs(v.x + w.z * BALL_R);

        if (trailCount < TRAIL_MAX) {
            const i = trailCount * 3;
            trailPos[i] = cue.body.position.x;
            trailPos[i + 1] = cue.body.position.y;
            trailPos[i + 2] = cue.body.position.z;
            trailCount++;
            trailGeo.setDrawRange(0, trailCount);
            trailGeo.attributes.position.needsUpdate = true;
        }
    }

    return { world, balls, cue, strike, tick, state, hx, hz };
}
