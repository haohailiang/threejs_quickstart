# 案例-顶点颜色平面（BufferGeometry + Float32Array）

> 对应课程知识点：2.几何体 BufferGeometry 顶点 —— 用最原始的方式手写几何体

## 效果

一个由 **4 个顶点** 组成的正方形平面，四个角分别是 **红 / 绿 / 蓝 / 黄**，
三角形内部的颜色由 GPU 自动线性插值，整个平面呈现渐变色。

- 4 个顶点本体用 `Points` 画成小圆点，颜色和对应顶点一致
- 每个顶点旁有 CSS2D 标签，显示索引和归一化的 rgb 值
- 右上角 GUI 开关：顶点色开关（关掉变纯色，直观对比）、线框模式（看清 2 个三角形剖分）、顶点显示、坐标辅助

## 核心代码（model.js）

```js
// 1. 顶点坐标：4 个顶点 × (x,y,z) = 12 个浮点数
const positions = new Float32Array([
    -80, 0, -80,   // 顶点 0
     80, 0, -80,   // 顶点 1
     80, 0,  80,   // 顶点 2
    -80, 0,  80,   // 顶点 3
]);

// 2. 顶点颜色：4 个顶点 × (r,g,b)，取值 0~1（THREE.Color 的分量正好是这个范围）
const colors = new Float32Array(12);
colors.set([1, 0.30, 0.19], 0);  // 顶点 0 红
colors.set([0.26, 0.83, 0.57], 3); // 顶点 1 绿
colors.set([0.24, 0.55, 1.00], 6); // 顶点 2 蓝
colors.set([1.00, 0.82, 0.25], 9); // 顶点 3 黄

// 3. 挂到 BufferGeometry 上，第二个参数 3 = 每个顶点 3 个分量
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// 4. 索引：哪 3 个顶点组成一个三角形。四边形拆成 2 个三角形（共用 0、2 两个顶点）
//    不写这步，4 个孤立的点什么面都画不出来
geometry.setIndex([0, 1, 2, 0, 2, 3]);

// 5. 材质必须打开 vertexColors，颜色才会从顶点 attribute 里取
const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide, // 双面可见，从背面看也不消失
});
```

## 要点

| 知识点 | 说明 |
| --- | --- |
| `Float32Array` | GPU 只认这种紧凑的浮点数组，一个顶点 3 个分量连续排列 |
| `BufferAttribute(arr, 3)` | 告诉 three.js 每 3 个数算一个顶点 |
| `setIndex` | 复用顶点拼三角形：4 个顶点就能画 2 个三角形，省显存 |
| 顶点色插值 | 三角形内部每个像素的颜色 = 三个顶点颜色按重心坐标加权，所以是渐变 |
| `vertexColors: true` | 切换该值后必须 `material.needsUpdate = true`，着色器才会重新编译 |
| MeshBasicMaterial | 不受光照影响，所以本场景一盏灯都没放 |

## 细节

- 顶点圆点（`Points`）也支持 `vertexColors`，且用了 `sizeAttenuation: false`，
  圆点大小固定为像素，不随镜头远近缩放
- 圆点和平面 y 都在 0 附近，特意抬高 0.6 避免 z-fighting（深度冲突闪烁）
- 切换「顶点色」开关时颜色变纯白灰，再切回来，可以明显看出顶点色的作用

## 运行

用 Live Server（或任意静态服务器）打开本目录的 `index.html`：

```
http://127.0.0.1:5500/案例-顶点颜色平面/案例源码/index.html
```

> 必须走 http，不能双击 html 直接打开（ES Module 有跨域限制）。
