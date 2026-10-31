# 2-Three.js基础（二）课程笔记

> 来源：`2-Three.js基础（二）/` 共 14 个视频（12 多个立方体 ~ 25 鼠标事件），总时长约 2 小时 49 分
> 环境：Vite + 原生 JS，每个视频对应一个练习 js 文件
> 素材：`public/image/{earth,park}/{px..nz}.jpg`、`public/video/mouse_cat.mp4`

---

## 一、章节总览

| 集 | 标题 | 时长 | 核心内容 |
| --- | --- | --- | --- |
| 12 | 多个立方体 | 12:04 | 数据驱动视图：for 循环 + map 生成 5 个随机立方体 |
| 13 | 性能监视器 | 11:20 | Stats 附加组件；2500 个立方体的实测数据 |
| 14 | 删除物体 | 11:58 | dispose 释放内存 + remove 从场景移除 |
| 15 | 物体分组管理 | 09:41 | Group 统一管理 + 批量清理的实测对比 |
| 16 | 多种缓冲几何体 | 15:26 | Circle/Plane/Sphere + DoubleSide 双面渲染 |
| 17 | 介绍点物体 | 10:39 | Points + PointsMaterial + size |
| 18 | 线物体和材质 | 07:10 | Line + LineBasicMaterial |
| 19 | 线物体区别 | 06:19 | Line / LineLoop / LineSegments 三种区别 |
| 20 | 全景图贴图 | 09:28 | TextureLoader + map；全景图宽高比 2:1 |
| 21 | 立方体贴图 | 12:20 | 6 面 6 图 + setPath + colorSpace 修发灰 |
| 22 | 案例-全景公园 | 11:35 | 相机进盒内 + Z 轴 -1 翻转修镜像 |
| 23 | 视频纹理 | 11:27 | VideoTexture + 静音自动播放 |
| 24 | 3D 渲染器 | 14:25 | CSS3DRenderer + CSS3DObject + pointerEvents |
| 25 | 鼠标事件 | 19:12 | 原生 DOM 直接绑 + Raycaster 点击 3D 物体 |

**本章主线**：基础（一）学会"画一个"，基础（二）学会"画多个、删掉、分组、换各种图形和材质、贴图、交互"。核心思想仍然是**数据驱动视图**——数据决定视图长什么样。

---

## 二、12 多个立方体（数据驱动视图）

**需求**：画 5 个互不相同的立方体（颜色、宽高深、位置都不同）。

**思路**：不能把创建立方体的代码复制 5 遍——要 200 个怎么办？先造数据，再用数据影响视图。

```js
// 1. 准备数据：描绘每个立方体的特征属性
const cubeInfoArr = []
for (let i = 0; i < 5; i++) {
  cubeInfoArr.push({
    // 随机颜色：rgb 字符串，红绿蓝各取 0~255
    color: `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`,
    // 随机宽高深：1~3
    w: Math.floor(Math.random() * 3) + 1,
    h: Math.floor(Math.random() * 3) + 1,
    d: Math.floor(Math.random() * 3) + 1,
    // 随机位置：-5 ~ +5（以坐标轴辅助对象的范围为界）
    x: Math.floor(Math.random() * 11) - 5,
    y: Math.floor(Math.random() * 11) - 5,
    z: Math.floor(Math.random() * 11) - 5,
  })
}
console.log(cubeInfoArr)   // 步步为营：先确认数据长什么样

// 2. 遍历数据 -> 创建立方体（数据影响视图）
cubeInfoArr.map(item => {
  const { color, w, h, d, x, y, z } = item   // ES6 解构赋值
  const geometry = new THREE.BoxGeometry(w, h, d)
  const material = new THREE.MeshBasicMaterial({ color })
  const cube = new THREE.Mesh(geometry, material)
  cube.position.set(x, y, z)
  scene.add(cube)
})
```

**要点**：随机数公式 `Math.floor(Math.random() * (max - min + 1)) + min`。立方体只在局部用，**不用定成全局变量**。

---

## 三、13 性能监视器（Stats）

**需求**：实时看 FPS（每秒帧数）、MS（每帧耗时 ms）、MB（内存占用）——辅助判断项目性能。

Stats 是**附加组件**，文档里没有专门页，要从 three 的 examples 里单独引入：

```js
import Stats from 'three/addons/libs/stats.module.js'

let stats  // 全局：一个函数创建，另一个函数（渲染循环）用

function createStats() {
  stats = new Stats()
  // 默认显示的模式：0 = FPS, 1 = MS, 2 = MB（页面点一下可切换）
  // stats.showPanel(0)
  // 它就是一个 div 原生 DOM（内部 canvas 绘制），要定位再挂到 body
  stats.domElement.style.position = 'absolute'
  stats.domElement.style.left = '0'
  stats.domElement.style.top = '0'
  document.body.appendChild(stats.domElement)
}

function renderLoop() {
  renderer.render(scene, camera)
  controls.update()
  stats.update()   // 场景内容会变，让数值实时刷新
  requestAnimationFrame(renderLoop)
}
```

**实测数据（视频）**：5 个立方体 FPS≈150、帧耗时 6ms、内存 17MB；改成 2500 个后 FPS 掉到 70+、帧耗时 12ms、内存 40+MB。**内容越多，每秒刷新次数越少，画面越卡**。

---

## 四、14 删除物体

**需求**：双击删除一个立方体（防止内存泄露）。

```js
// 创建时给物体起名字，方便后续筛选
cube.name = 'cube'

function removeCube() {
  window.addEventListener('dblclick', () => {
    // scene.children 是场景中所有子物体的数组（包括 AxesHelper！）
    // 用 filter + name 精确筛出要删的立方体
    const arr = scene.children.filter(obj => obj.name === 'cube')
    const cube = arr[0]      // 每次只删一个
    if (!cube) return        // 删完后数组为空，直接 return 防止 undefined 报错

    cube.geometry.dispose()  // 释放几何体的内存数据
    cube.material.dispose()  // 释放材质的内存数据
    scene.remove(cube)       // 从场景中移除（只 dispose 不移除，画面还在）
  })
}
```

**要点**：
- **dispose 只释放内存，画面不消失；remove 只移除画面，不释放内存。两个都要做。**
- 只 dispose 不 remove → 双击没反应；只 remove 不 dispose → 内存泄露。
- scene.children 包含所有子物体（坐标轴辅助对象也是物体，按加入顺序排列）。

---

## 五、15 物体分组管理（Group）

**需求**：把一堆立方体放进一个组统一管理，双击一次性全删。

```js
let group = new THREE.Group()  // 全局：create 里 add，remove 里 remove

function createCube() {
  for (let i = 0; i < 2500; i++) {
    const cube = new THREE.Mesh(geometry, material)
    group.add(cube)      // 加到分组，不是直接加到场景
  }
  scene.add(group)       // 循环结束后，组一次性进场景
}

function removeCube() {
  window.addEventListener('dblclick', () => {
    // 遍历组里每个子物体释放内存
    group.children.forEach(obj => {
      obj.geometry.dispose()
      obj.material.dispose()
      group.remove(obj)
    })
    scene.remove(group)  // 最后把组本身从场景移除
  })
}
```

**要点**：
- **Group 不是具体图形**，没有 geometry/material，只有 position/rotation/scale——因为它继承 Object3D。
- 对组进行位移/旋转/缩放，**组里所有物体跟着一起动**。
- 实测：2500 个立方体 FPS 78、内存 400MB → 双击删除后 FPS 回到 150。物体越少越流畅。

---

## 六、16 多种缓冲几何体

**要点**：所有形状（无论多复杂）都是**三角形拼装**的；分段数越多越光滑。所有图形默认**单面渲染**——转背面看不见，钻进里面也看不见内面。

```js
function createGeometry() {
  // 圆形平面：半径 + 三角形段数（段数>=3，默认 32，3 就是三角形）
  const circleGeo = new THREE.CircleGeometry(1, 32)
  // 平面：宽、高
  const planeGeo = new THREE.PlaneGeometry(1, 1)
  // 球体：半径 + 水平段数 + 垂直段数（水平尽量是垂直的 2 倍）
  const sphereGeo = new THREE.SphereGeometry(1, 32, 16)

  // 材质可复用（颜色相同）
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide   // 双面渲染：背面/内面也能看到
  })

  const circle = new THREE.Mesh(circleGeo, material)
  const plane = new THREE.Mesh(planeGeo, material)
  const sphere = new THREE.Mesh(sphereGeo, material)
  plane.position.set(-2, -2, -2)
  sphere.position.set(2, 2, 2)
  scene.add(circle)
  scene.add(plane)
  scene.add(sphere)
}
```

**解决单面渲染的思路（重点学）**：物体上找不到 side → 不在 Object3D 基类 → 想到是"渲染"相关 → 往**材质基类 Material** 上找 → 找到 `side` 属性（默认 FrontSide，THREE.DoubleSide 双面、THREE.BackSide 背面）。

---

## 七、17 点物体（Points）

**思路**：固定图形（球体），换材质 + 换物体构造函数——**图形与材质是组合关系**。

```js
function createSphere() {
  // 1. 几何图形：球体
  const geometry = new THREE.SphereGeometry(1, 32, 16)
  // 2. 点材质：color 颜色 + size 每个点的大小（默认 1，太大，改小）
  const material = new THREE.PointsMaterial({
    color: 0x6600ff,
    size: 0.05
  })
  // 3. 点物体
  const points = new THREE.Points(geometry, material)
  scene.add(points)
}
```

**要点**：Points 一般用 PointsMaterial 配套（点物体用别的材质出不了点状效果）。文档里点物体的例子是"星空粒子"——用 BufferGeometry 手动塞一堆随机坐标。

---

## 八、18 线物体和材质

```js
function createLine() {
  const geometry = new THREE.SphereGeometry(1, 32, 16)
  // 线基础材质（连续的线；另一种 LineDashedMaterial 是虚线）
  const material = new THREE.LineBasicMaterial({ color: 0x6600ff })
  // 线物体：把球体表面的顶点用线段连起来
  const line = new THREE.Line(geometry, material)
  scene.add(line)
}
```

**要点**：文档里搜 "line" 能同时匹配到 Line / LineLoop / LineSegments 三种物体，以及 LineBasicMaterial / LineDashedMaterial 两种材质。

---

## 九、19 线物体三种区别（学习探索的方法）

**这集重点不是答案，而是"怎么探索区别"**：图形和材质不变，只换物体构造函数，逐个对比效果。

```js
// 准备 3~4 个坐标点
const points = [
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(1, 1, 1),
]
const geometry = new THREE.BufferGeometry().setFromPoints(points)
const material = new THREE.LineBasicMaterial({ color: 0x00ff00 })

// 三种线物体，效果完全不同：
new THREE.Line(geometry, material)         // Line：按顺序连续连接所有点（1→2→3→4）
new THREE.LineLoop(geometry, material)     // LineLoop：Line + 首尾自动闭合（1→2→3→4→1）
new THREE.LineSegments(geometry, material) // LineSegments：两两成对（1-2 一条线，3-4 一条线）
                                           // 奇数个点时，落单的那个不连
```

---

## 十、20 全景图贴图

**概念**：
- **全景图** = 720°（水平环绕 360° + 垂直再 360°），**宽度是高度的 2 倍**，建议用球体承载。
- **贴图原理**：three.js 读取图片每个像素的颜色，按 **UV 坐标**（U 水平 0~1，V 垂直 0~1）映射到物体表面，所以又叫 UV 贴图。

```js
function createSphereMap() {
  const geometry = new THREE.SphereGeometry(1, 32, 16)
  // TextureLoader 是 Texture 的子类，专门加载纹理图片
  const texture = new THREE.TextureLoader().load('image/earth/earth.png')
  // map 属性 = 颜色贴图，把图片颜色贴到网格表面
  const material = new THREE.MeshBasicMaterial({ map: texture })
  const sphere = new THREE.Mesh(geometry, material)
  scene.add(sphere)
}
```

**要点**：Vite 默认把 `public` 作为静态资源根，路径直接从 `image/...` 开始写，不带 public 前缀。

---

## 十一、21 立方体贴图（6 面 6 图）

```js
function createCubeMap() {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  // 顺序 = BoxGeometry 六面顺序：+X, -X, +Y, -Y, +Z, -Z
  const imgUrlArr = ['posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg']

  const textureLoader = new THREE.TextureLoader()
  // 设置公共基础路径，后面 load 只写文件名
  // ⚠ 末尾斜杠必须写：加载器会用它拼接图片路径
  textureLoader.setPath('image/park/')

  const materialArr = imgUrlArr.map(imgUrl => {
    const texture = textureLoader.load(imgUrl)
    // 修颜色发浅：声明纹理颜色空间是 sRGB
    texture.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshBasicMaterial({ map: texture })
  })
  const cube = new THREE.Mesh(geometry, materialArr)
  scene.add(cube)
}
```

**要点**：
- **颜色发浅的坑**：jpg 是 sRGB 编码，three 默认按线性色处理会整体提亮。`texture.colorSpace = THREE.SRGBColorSpace` 声明后颜色还原。
- 颜色通道是"图片每个像素怎么算到 three 场景里"的计算过程。

---

## 十二、22 案例-全景公园

**思路**：把上集的立方体贴图 + 相机挪进盒子内部 + 双面渲染 = VR 全景。

```js
function init() {
  // ...场景/相机/渲染器...
  // 相机放进盒子中心，但不能是 (0,0,0)！
  // OrbitControls 内部要拿相机初始位置做乘法变换，全 0 会让它没法旋转
  camera.position.z = 0.1
}

function createCubeMap() {
  // ...贴图同上（材质数组 + setPath + colorSpace）...
  const cube = new THREE.Mesh(geometry, materialArr)
  // 关键：沿 Z 轴 -1 镜像翻转
  // 从盒子内部看到的每个面是镜像（隔着玻璃看字，左右反了），
  // scale.set(1,1,-1) 把前后对调、侧面翻面，内面就和原图一致了
  cube.scale.set(1, 1, -1)
  scene.add(cube)
}
```

**要点**：
- 镜像原理（PPT 演示）：盒内双面渲染时，每个面是从图片背面看——左右颠倒。
- 全景承载物选择：**6 张图用立方体**（一个面贴一张），**宽是高的 2 倍的全景图用球体**（包裹）——相机都挪到中间即可。

---

## 十三、23 视频纹理

```js
function createPlaneMap() {
  // 1. 平面图形（长方形：宽是高的 2 倍）
  const geometry = new THREE.PlaneGeometry(1, 0.5)

  // 2. 准备视频标签（在 JS 里创建，内聚性更好——改动不用切回 HTML）
  const video = document.createElement('video')
  video.src = 'video/mouse_cat.mp4'
  video.muted = true   // 必须静音才能自动播放（浏览器规定，防止打扰用户）
  video.addEventListener('loadedmetadata', () => {  // 视频元数据加载完成
    video.play()
  })

  // 3. 视频纹理
  const texture = new THREE.VideoTexture(video)

  // 4. 贴到材质
  const material = new THREE.MeshBasicMaterial({ map: texture })

  const plane = new THREE.Mesh(geometry, material)
  scene.add(plane)

  // 5. 想放出声音：准备按钮，点击时关闭静音
  const button = document.createElement('button')
  button.innerHTML = '播放'
  button.style.position = 'fixed'
  button.style.left = '0'
  button.style.bottom = '0'
  button.addEventListener('click', () => { video.muted = false })
  document.body.appendChild(button)
}
```

**要点**：
- 浏览器自动播放策略：**必须先静音**。视频作者第一次写 `muted = false` 翻车，报错 "play() failed because the user didn't interact with the document first"。
- 视频事件名是 **`loadedmetadata`**（加载元数据完成），不是 loadeddata。

---

## 十四、24 3D 渲染器（CSS3DRenderer）

**需求**：把原生 2D DOM 标签放进 3D 空间，跟着相机旋转。

```js
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'

let labelRenderer  // 全局：渲染循环要用

function createDOM() {
  // 1. 准备原生 DOM
  const tag = document.createElement('span')
  tag.innerHTML = '我是文字'
  tag.style.color = 'white'   // 默认黑色，在黑背景里看不见

  // 2. DOM 转成 3D 物体（无 geometry/material，纯数据的 3D 物体）
  const tag3d = new CSS3DObject(tag)
  // CSS 像素单位会平移到 3D 空间：16px 文字 = 16 个单位，太大 → 缩成 1/16
  tag3d.scale.set(1 / 16, 1 / 16, 1 / 16)
  scene.add(tag3d)

  // 3. 专门的标签渲染器（覆盖在 WebGL canvas 上层，透明叠加）
  labelRenderer = new CSS3DRenderer()
  labelRenderer.setSize(window.innerWidth, window.innerHeight)
  labelRenderer.domElement.style.position = 'fixed'
  labelRenderer.domElement.style.left = '0'
  labelRenderer.domElement.style.top = '0'
  document.body.appendChild(labelRenderer.domElement)
}

function renderLoop() {
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)   // 标签渲染器也要每帧刷新
  controls.update()
  requestAnimationFrame(renderLoop)
}
```

**两大坑（视频里当场翻车）**：
1. **文字太大**：16px 被平移成 16 个单位 → `scale.set(1/16, 1/16, 1/16)`。
2. **轨道控制器失效**：labelRenderer 的 div 盖在 canvas 上面，挡住了鼠标事件 → `labelRenderer.domElement.style.pointerEvents = 'none'`（不挡鼠标，穿透到 canvas）。

---

## 十五、25 鼠标事件（两种类型）

### 类型一：原生 DOM 转成的 3D 物体 → 直接绑原生事件

```js
tag.addEventListener('click', e => {
  e.stopPropagation()      // 防止冒泡
  alert('DOM 被点击了')
})
// 关键：CSS3DRenderer 的容器 div 设了 pointerEvents: none，
// 子标签要单独加回 all 才能接收鼠标事件
tag.style.pointerEvents = 'all'
```

### 类型二：three.js 创建的物体 → Raycaster 光线投射

```js
function bindClick() {
  window.addEventListener('click', e => {
    // 1. 光线投射对象 + 二维向量对象
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    // 2. 屏幕坐标 → WebGL 设备坐标（NDC，-1 ~ +1）
    // 推导：除以宽高归一到 0~1，再 *2-1 变 -1~1
    // Y 取负号：屏幕坐标 Y 向下为正，WebGL 设备坐标 Y 向上为正
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1

    // 3. 从相机原点向鼠标位置算出射线
    raycaster.setFromCamera(pointer, camera)

    // 4. 收集射线穿过的所有物体（默认递归，包含组内子物体）
    const list = raycaster.intersectObjects(scene.children)
    console.log(list)
    // 每个收集对象的关键属性是 .object（真正的 mesh）
  })
}
```

**要点**：
- 点击立方体一次，可能收集到 4 个对象（3 条坐标轴辅助线 + 1 个 Mesh）——射线穿过的是一条线，不是点。
- 坐标轴辅助对象也会被收集，后面要按 `name` 或 `type` 过滤。
- 设备坐标系原点 = 画布中心 (0, 0)，左 -1 右 +1、上 +1 下 -1，跟 three.js 物体的位置单位**无关**，纯粹用于鼠标拾取计算。

---

## 十六、本章常见坑速查

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| 贴图颜色发浅发灰 | jpg 是 sRGB，three 按线性处理 | `texture.colorSpace = THREE.SRGBColorSpace` |
| 盒内全景图左右镜像 | 从图片背面看 | `cube.scale.set(1, 1, -1)` |
| 相机挪到盒子中心后旋转不动 | OrbitControls 内部用相机位置做乘法 | `camera.position.z = 0.1`（别给 0） |
| 视频不自动播放 | 浏览器要求静音 | `video.muted = true` |
| 转背面物体消失 | 默认单面渲染 | `side: THREE.DoubleSide` |
| dispose 后画面还在 | dispose 只释放内存不移除 | 再调 `scene.remove(obj)` |
| 加 CSS3DRenderer 后相机转不动 | 标签容器 div 挡住鼠标事件 | `labelRenderer.domElement.style.pointerEvents = 'none'` |
| 删完所有物体再双击报错 | 数组取到 undefined | `if (!cube) return` |

## 十七、r148 兼容性

唯一差异仍是颜色空间一行（r148 用 `texture.encoding = THREE.sRGBEncoding`，r152+ 用 `texture.colorSpace = THREE.SRGBColorSpace`）。其余（Points、Line、VideoTexture、CSS3DRenderer、Raycaster、Group、dispose）r148 全兼容。
