import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * 抛物线：CANNON 里"抛物线"不是特例，就是
 *   重力恒定 + 一个水平初速度
 * 之后引擎按 a = F/m 逐步积分，自然会画出抛物线。
 *
 * 本案例同时画两条线做对比：
 *   - 虚线：用 s = v·t + ½·g·t² 公式算出来的理想曲线
 *   - 实线：物理引擎每帧真实位置连成的轨迹
 * 两条线应当几乎重合 —— 重合就说明物理引擎算得对。
 */

export const R = 0.6;
export const G = 9.82;
export const START = new THREE.Vector3(-14, R, 0);
const TRAIL_MAX = 1500;

export function buildProjectileScene(scene) {
    /* ------------------------------ 物理世界 ------------------------------ */
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -G, 0) });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;

    const matBall = new CANNON.Material('ball');
    const matGround = new CANNON.Material('ground');
    world.addContactMaterial(new CANNON.ContactMaterial(matBall, matGround, {
        friction: 0.8,
        restitution: 0.12, // 落地基本不弹，方便看清落点
    }));

    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: matGround });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    const groundMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 60),
        new THREE.MeshStandardMaterial({ color: 0x243040, roughness: 0.95 })
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const grid = new THREE.GridHelper(80, 40, 0x3a4a5e, 0x222c38);
    grid.position.y = 0.01;
    scene.add(grid);
    scene.add(new THREE.AxesHelper(6));

    /* -------------------------------- 小球 -------------------------------- */
    const ballBody = new CANNON.Body({
        mass: 2,
        shape: new CANNON.Sphere(R),
        material: matBall,
        linearDamping: 0.01,
        angularDamping: 0.2,
        position: new CANNON.Vec3(START.x, START.y, START.z),
    });
    world.addBody(ballBody);

    const ballMesh = new THREE.Mesh(
        new THREE.SphereGeometry(R, 32, 24),
        new THREE.MeshStandardMaterial({ color: 0x3d8bff, roughness: 0.3, metalness: 0.2 })
    );
    ballMesh.castShadow = true;
    scene.add(ballMesh);

    /* ------------------------------ 实际轨迹线 ------------------------------ */
    const trailPos = new Float32Array(TRAIL_MAX * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3).setUsage(THREE.DynamicDrawUsage));
    trailGeo.setDrawRange(0, 0);
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffd23f }));
    scene.add(trail);
    let trailCount = 0;

    function pushTrail() {
        if (trailCount >= TRAIL_MAX) return;
        const i = trailCount * 3;
        trailPos[i] = ballBody.position.x;
        trailPos[i + 1] = ballBody.position.y;
        trailPos[i + 2] = ballBody.position.z;
        trailCount++;
        trailGeo.setDrawRange(0, trailCount);
        trailGeo.attributes.position.needsUpdate = true;
    }

    function clearTrail() {
        trailCount = 0;
        trailGeo.setDrawRange(0, 0);
    }

    /* ------------------------------ 公式预测线 ------------------------------ */
    const PRED_N = 90;
    const predPos = new Float32Array(PRED_N * 3);
    const predGeo = new THREE.BufferGeometry();
    predGeo.setAttribute('position', new THREE.BufferAttribute(predPos, 3).setUsage(THREE.DynamicDrawUsage));
    const predLine = new THREE.Line(predGeo, new THREE.LineDashedMaterial({
        color: 0x8ab4f8, dashSize: 0.5, gapSize: 0.35,
    }));
    scene.add(predLine);

    // 落点标记圈
    const markGeo = new THREE.RingGeometry(0.45, 0.6, 32);
    const markMat = new THREE.MeshBasicMaterial({ color: 0x8ab4f8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const mark = new THREE.Mesh(markGeo, markMat);
    mark.rotation.x = -Math.PI / 2;
    mark.position.y = 0.03;
    scene.add(mark);

    /* ------------------------------ 发射逻辑 ------------------------------ */
    const state = { flightTime: 0, landed: false, actualTime: 0, theory: {} };

    function launch(vx, vy) {
        ballBody.position.set(START.x, START.y, START.z);
        ballBody.velocity.set(vx, vy, 0);
        // 给一点自转，看起来像被抛出去的球在滚
        ballBody.angularVelocity.set(0, 0, -vx / R);
        ballBody.quaternion.set(0, 0, 0, 1);
        ballBody.wakeUp();

        clearTrail();
        pushTrail();

        state.flightTime = 0;
        state.landed = false;
        state.actualTime = 0;

        // ---- 理论值：y(t) = y0 + vy·t - ½g t²，落地时 y = R ----
        const tFlight = (vy + Math.sqrt(vy * vy + 2 * G * (START.y - R))) / G;
        state.theory = {
            t: tFlight,
            peak: START.y + (vy * vy) / (2 * G),
            range: vx * tFlight,
            peakAt: vy / G,
        };

        // ---- 画预测曲线 ----
        for (let i = 0; i < PRED_N; i++) {
            const t = (i / (PRED_N - 1)) * tFlight;
            predPos[i * 3] = START.x + vx * t;
            predPos[i * 3 + 1] = START.y + vy * t - 0.5 * G * t * t;
            predPos[i * 3 + 2] = 0;
        }
        predGeo.attributes.position.needsUpdate = true;
        predGeo.computeBoundingSphere();
        predLine.computeLineDistances(); // 虚线必须重算线段距离，否则不显示

        mark.position.x = START.x + state.theory.range;
    }

    /* ---------------------------- 每帧推进时间 ---------------------------- */
    function tick(dt) {
        if (!state.landed) {
            state.flightTime += dt;
            pushTrail();
            // 稍微弹起后速度变小，y 回到接近 R 且不再上升 → 视为落地
            if (state.flightTime > 0.15 && ballBody.position.y <= R + 0.05 && ballBody.velocity.y <= 0.05) {
                state.landed = true;
                state.actualTime = state.flightTime;
            }
        }
    }

    return { world, ballBody, ballMesh, launch, tick, state, predLine, mark };
}
