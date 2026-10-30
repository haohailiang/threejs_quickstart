import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { buildPhysics, loadSoldier } from './model.js';

let width = window.innerWidth;
let height = window.innerHeight;

/* ============================== 场景基建 ============================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, 35, 90);

const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 300);
camera.position.set(0, 3, 6);
// 相机注视点（平滑跟随用）
const lookTarget = new THREE.Vector3(0, 1.35, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

/* ================================ 灯光 ================================ */
scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x2a2418, 0.8));

const sun = new THREE.DirectionalLight(0xfff2dd, 2.0);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -9;
sun.shadow.camera.right = 9;
sun.shadow.camera.top = 9;
sun.shadow.camera.bottom = -9;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 50;
sun.shadow.bias = -0.0006;
scene.add(sun);
scene.add(sun.target);

/* ============================== 物理 + 人物 ============================== */
const { world, charBody, cubes, resetCubes } = buildPhysics(scene);

const loading = document.getElementById('loading');
const hud = document.getElementById('hud');
let player = null;

loadSoldier(scene).then((res) => {
    player = res;
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 600);
});

/* ================================ 键盘 ================================ */
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

/* ================================= GUI ================================= */
const parms = {
    speed: 3.2,        // 走路速度
    runSpeed: 5.5,     // 按住 Shift 跑
    turnLerp: 10,      // 人转向的平滑度
    camHeight: 2.8,    // 相机高度
    camDist: 5.2,      // 相机距离（越远越"看到后背"）
    camSmooth: 4.5,    // 相机阻尼
    reset: () => {
        resetCubes();
        charBody.position.set(0, 0, 0);
        charBody.velocity.set(0, 0, 0);
        if (player) player.model.position.set(0, 0, 0);
    },
};

const gui = new GUI({ title: '走动参数' });
gui.add(parms, 'speed', 1, 6, 0.2).name('走路速度 (m/s)');
gui.add(parms, 'runSpeed', 3, 9, 0.2).name('跑步速度 (m/s)');
gui.add(parms, 'camDist', 2.5, 10, 0.2).name('相机距离');
gui.add(parms, 'camHeight', 1, 5, 0.1).name('相机高度');
gui.add(parms, 'reset').name('↺ 复位方块和人');

/* ================================= HUD ================================= */
let pushed = 0; // 被撞过的方块数
let hudTimer = 0;

function updateHud() {
    let awake = 0;
    for (const c of cubes) if (c.body.sleepState !== 2) awake++;
    hud.innerHTML = `
        <b>第三人称 · WASD 走动 + 刚体碰撞</b><br>
        位置 <code>(${charBody.position.x.toFixed(1)}, ${charBody.position.z.toFixed(1)})</code>
        ｜ 动作 <code>${player ? player.current : '—'}</code><br>
        方块：撞动过 <code>${pushed}</code> / 还在动 <code>${awake}</code> / 共 ${cubes.length}<br>
        相机在人背后 <code>${parms.camDist}</code>m 处，永远看到后背
    `;
}
updateHud();

/* ================================ 主循环 ================================ */
const clock = new THREE.Clock();
const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    /* ---------- 1. 输入 → 相对镜头的移动方向 ---------- */
    let ix = 0, iz = 0;
    if (keys['KeyW']) iz += 1;
    if (keys['KeyS']) iz -= 1;
    if (keys['KeyA']) ix -= 1;
    if (keys['KeyD']) ix += 1;

    if (player) {
        const model = player.model;

        // 镜头的水平前方向（W 永远是"往画面深处走"）
        camera.getWorldDirection(tmpV);
        tmpV.y = 0;
        tmpV.normalize();
        const fwd = tmpV.clone();
        const right = new THREE.Vector3().crossVectors(UP, fwd).multiplyScalar(-1); // 右手系：up×fwd=左

        const move = new THREE.Vector3()
            .addScaledVector(fwd, iz)
            .addScaledVector(right, ix);
        const moving = move.lengthSq() > 0.001;
        if (moving) move.normalize();

        const speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? parms.runSpeed : parms.speed;

        /* ---------- 2. 主角：运动学刚体驱动 + 朝向平滑 ---------- */
        charBody.velocity.set(
            moving ? move.x * speed : 0,
            0,
            moving ? move.z * speed : 0
        );

        if (moving) {
            // 人物模型面朝 -Z，所以朝向 = 移动方向的 -Z 旋转
            const targetQ = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, -1),
                move
            );
            // 防止绕远路：点积为负时走另一条路（quaternion 双覆盖）
            tmpQ.copy(model.quaternion);
            if (tmpQ.dot(targetQ) < 0) targetQ.set(-targetQ.x, -targetQ.y, -targetQ.z, -targetQ.w);
            model.quaternion.slerp(targetQ, 1 - Math.exp(-parms.turnLerp * dt));
        }

        // 模型跟着刚体走（x/z），y 恒贴地
        model.position.set(charBody.position.x, 0, charBody.position.z);

        // 动作切换
        if (moving) player.fadeTo(speed > parms.speed + 0.5 ? 'Run' : 'Walk');
        else player.fadeTo('Idle');

        player.update(dt);

        /* ---------- 3. 相机：钉在人背后（永远看到后背）---------- */
        // 人的水平前方
        const facing = new THREE.Vector3(0, 0, -1).applyQuaternion(model.quaternion);
        facing.y = 0;
        facing.normalize();
        const desired = model.position.clone()
            .addScaledVector(facing, -parms.camDist)
            .add(new THREE.Vector3(0, parms.camHeight, 0));
        camera.position.lerp(desired, 1 - Math.exp(-parms.camSmooth * dt));

        // 注视点 = 人的胸口，平滑跟随（相机完全手动驱动，不用 OrbitControls）
        const look = model.position.clone().add(new THREE.Vector3(0, 1.35, 0));
        lookTarget.lerp(look, 1 - Math.exp(-parms.camSmooth * dt));
        camera.lookAt(lookTarget);

        /* ---------- 4. 阴影相机跟人 ---------- */
        sun.position.set(model.position.x + 6, 12, model.position.z + 4);
        sun.target.position.copy(model.position);

        /* ---------- 5. 统计被撞的方块 ---------- */
        let awake = 0;
        for (const c of cubes) {
            if (c.body.sleepState !== 2) awake++;
            if (c.body._touched === undefined && c.body.velocity.lengthSquared() > 0.3) c.body._touched = true;
        }
        pushed = cubes.filter((c) => c.body._touched).length;
    }

    /* ---------- 6. 物理推进 + 网格同步 ---------- */
    world.step(1 / 120, dt, 4);
    for (const c of cubes) {
        c.mesh.position.copy(c.body.position);
        c.mesh.quaternion.copy(c.body.quaternion);
    }

    renderer.render(scene, camera);

    hudTimer += dt;
    if (hudTimer > 0.25) { hudTimer = 0; updateHud(); }
}
animate();

/* ================================ 自适应 ================================ */
window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

window.__demo = { scene, camera, renderer, world, charBody, cubes, parms, keys,
    get player() { return player; } };
