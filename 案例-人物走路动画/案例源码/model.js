import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Soldier.glb 自带 4 段动画：Idle / Walk / Run / TPose
 * AnimationMixer + AnimationAction.crossFadeTo 实现"淡入淡出"式动作切换，
 * 比瞬间切换自然得多（走路→跑步时腿部动作是慢慢过渡的）。
 */

// Soldier 模型朝向 -Z（面朝 -Z），所以"向前"就是 -Z 方向
export const FORWARD_SIGN = -1;

export function loadSoldier(scene) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(
            '../../three.js/examples/models/gltf/Soldier.glb',
            (gltf) => {
                const model = gltf.scene;

                // 统一成 1.8m 身高：先量包围盒，再按比例缩
                const box = new THREE.Box3().setFromObject(model);
                const rawH = box.max.y - box.min.y;
                model.scale.setScalar(1.8 / rawH);

                model.traverse((o) => {
                    if (o.isMesh) {
                        o.castShadow = true;
                        o.receiveShadow = false;
                        o.frustumCulled = false; // 蒙皮网格容易被包围盒误裁，直接关掉
                    }
                });

                model.position.set(0, 0, 0);
                scene.add(model);

                // ---------------- 动画状态机 ----------------
                const mixer = new THREE.AnimationMixer(model);
                const clips = gltf.animations;
                const find = (name) => {
                    const c = THREE.AnimationClip.findByName(clips, name);
                    if (!c) throw new Error('找不到动画: ' + name);
                    const a = mixer.clipAction(c);
                    a.enabled = true;
                    return a;
                };

                const actions = {
                    Idle: find('Idle'),
                    Walk: find('Walk'),
                    Run: find('Run'),
                };

                // 所有动作先都 play 一遍再立即权重归零 —— three.js 官方
                // 混合示例的技巧，保证 crossFade 时骨骼状态连续
                for (const a of Object.values(actions)) {
                    a.play();
                    a.setEffectiveWeight(0);
                }
                actions.Idle.setEffectiveWeight(1);

                // 权重渐变式切换：比 crossFadeTo 更可控（不会被互相打断），
                // 效果同样是"腿部动作平滑过渡"
                function fadeTo(name, duration = 0.25) {
                    for (const [key, a] of Object.entries(actions)) {
                        a._fadeTarget = key === name ? 1 : 0;
                        a._fadeSpeed = 1 / duration;
                    }
                }

                resolve({
                    model,
                    mixer,
                    actions,
                    fadeTo,
                    // 每帧：mixer.update(dt) + 权重渐变
                    update(dt) {
                        for (const a of Object.values(actions)) {
                            if (a._fadeTarget === undefined) continue;
                            const w = a.getEffectiveWeight();
                            const t = a._fadeTarget;
                            if (w !== t) {
                                const step = a._fadeSpeed * dt;
                                const nw = t > w ? Math.min(t, w + step) : Math.max(t, w - step);
                                a.setEffectiveWeight(nw);
                            }
                        }
                        mixer.update(dt);
                    },
                });
            },
            undefined,
            (err) => reject(err)
        );
    });
}
