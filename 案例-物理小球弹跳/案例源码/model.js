import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * 小球落地反弹：CANNON 刚体物理的最小可用组合
 *
 * 三件事缺一不可：
 *   1. World（世界）：设定重力，每帧 step 一次
 *   2. Body（刚体）：有质量 / 形状 / 位置，负责"算"
 *   3. Mesh（网格）：只负责"看"，每帧把 body 的位姿抄过来
 *
 * 注意：three.js 和 cannon 是两套独立坐标系（都是右手系，但各存各的），
 * 所以必须每帧同步 position + quaternion，不能指望它俩自动关联。
 */

export const BALL_R = 1.2;
export const START_Y = 9;

export function buildBounceScene(scene) {
    /* ------------------------------ 物理世界 ------------------------------ */
    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0), // 地球重力，单位 m/s²
    });
    // SAP 宽相：物体少时和 Naive 差不多，但物体一多优势明显
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true; // 静止的刚体自动休眠，省 CPU

    /* --------------------------- 材质与接触材质 --------------------------- */
    // Material 本身不存参数，参数写在"两个材质接触时的规则"里
    const matBall = new CANNON.Material('ball');
    const matGround = new CANNON.Material('ground');

    const contact = new CANNON.ContactMaterial(matBall, matGround, {
        friction: 0.35,    // 摩擦：影响它落地后是否会滚起来
        restitution: 0.88, // 弹性：0 完全不会弹，1 完全弹性（不会损失能量）
    });
    world.addContactMaterial(contact);

    /* ------------------------------- 地面 ------------------------------- */
    // Plane 是数学上无限大的平面，默认法线朝 +Z，所以要绕 X 轴转 -90° 变成水平面
    const groundBody = new CANNON.Body({
        mass: 0, // mass = 0 表示静态物体，永远不动，也不参与受力计算
        shape: new CANNON.Plane(),
        material: matGround,
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    const groundMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 60),
        new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.92, metalness: 0 })
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // 网格 + 坐标轴，方便看清球在世界坐标系里的高度
    const grid = new THREE.GridHelper(60, 30, 0x3a4a5e, 0x222c38);
    grid.position.y = 0.01;
    scene.add(grid);

    const axes = new THREE.AxesHelper(7);
    scene.add(axes);

    /* -------------------------------- 小球 -------------------------------- */
    const ballBody = new CANNON.Body({
        mass: 1,                                        // 1 kg
        shape: new CANNON.Sphere(BALL_R),               // 球体半径
        material: matBall,
        linearDamping: 0.02,                            // 空气阻力（速度越衰减）
        angularDamping: 0.1,
        position: new CANNON.Vec3(0, START_Y, 0),
    });
    world.addBody(ballBody);

    const ballMesh = new THREE.Mesh(
        new THREE.SphereGeometry(BALL_R, 40, 28),
        new THREE.MeshStandardMaterial({ color: 0xff6b57, roughness: 0.35, metalness: 0.15 })
    );
    ballMesh.castShadow = true;
    scene.add(ballMesh);

    /* ---------------------------- 复位 / 重新落下 ---------------------------- */
    function drop(height = START_Y) {
        ballBody.position.set(0, height, 0);
        ballBody.velocity.set(0, 0, 0);
        ballBody.angularVelocity.set(0, 0, 0);
        ballBody.quaternion.set(0, 0, 0, 1);
        ballBody.force.set(0, 0, 0);
        ballBody.wakeUp(); // 休眠过的刚体必须唤醒，否则它躺在那儿不动
    }

    return { world, contact, ballBody, ballMesh, drop };
}
