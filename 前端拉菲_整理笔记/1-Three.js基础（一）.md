# 1-Three.js基础（一）课程笔记

> 来源：`1-Three.js基础（一）/` 共 13 个视频（01 导学 ~ 11 五颜六色立方体），总时长约 2 小时 20 分
> 环境：Vite + 原生 JS（作者特意不用 Vue/React——three.js 是面向对象的，几乎没有标签与数据的双向绑定需求，用纯 JS 能照顾 0 基础）
> 练习方式：每个视频对应一个练习 js（`01.threejs介绍和环境准备.js` … `10.练习小结.js`），最后整合进 `main.js`

---

## 一、章节总览

| 集 | 标题 | 时长 | 核心内容 |
| --- | --- | --- | --- |
| 01 | 导学 | 10:56 | 三个项目预览 + 课程三阶段规划（无代码） |
| 02 | 三要素 | 18:09 | scene / camera / renderer，透视相机 4 参数详解 |
| 03 | 立方体 | 12:19 | BoxGeometry + 材质 + Mesh + add；相机必须后退 5 个单位 |
| 04 | 轨道控制器 | 13:09 | OrbitControls + 渲染循环 requestAnimationFrame |
| 05 | 坐标轴 | 04:43 | AxesHelper |
| 06 | 控制器-上 | 11:13 | 阻尼 / 自动旋转 / 垂直角度范围 |
| 07 | 控制-下 | 06:46 | 水平角度范围 / 缩放距离范围 |
| 08 | 适配场景大小 | 06:00 | resize 监听 + 投影矩阵 + antialias |
| 09 | 移动立方体 | 12:20 | Object3D 的 position / rotation / scale |
| 10 | GUI 上 | 23:54 | dat.gui 四种控件 + onChange 双向绑定 |
| 11 | GUI 下 | 10:54 | 分组 / 进度条 / 下拉菜单 |
| 12 | 练习小结 | 04:36 | 复习，去掉 moveCube 与 createGUI 重写基础代码 |
| 13 | 五颜六色立方体 | 05:39 | 材质数组：6 个面 6 种颜色 |

**贯穿全章的方法论（作者反复强调）**：想操作 three.js 里的任何东西 → 查官方文档 → 文档没有就 `console.log` 打印对象找属性 → 再不行百度。
**核心认知**：Mesh、Camera、Scene、灯光、精灵**全部继承自 Object3D 基类**，所以 position / rotation / scale 人人都有。

---

## 二、概念层

### 1. three.js / WebGL / GPU 的关系

```
three.js（JS 库，高度封装） → WebGL（浏览器提供的 web 图形库 API） → GPU（显卡硬件，真正画像素）
```

为什么不直接学 WebGL：要自己写着色器、自己算每个顶点和像素，门槛高。three.js 把这些封装成了 `new THREE.Mesh(...)` 这样的 API。

### 2. 三要素

- **场景 Scene**：放置物体的容器（世界）
- **摄像机 Camera**：模拟人的眼睛，决定"从哪看、看多大范围"
- **渲染器 Renderer**：接收场景 + 摄像机，计算后画到浏览器平面上。注意——**浏览器本质是 2D 平面**，只是根据物体位置和相机角度"模拟"出 3D 视觉。

### 3. 透视相机 4 个参数

```js
new THREE.PerspectiveCamera(fov, aspect, near, far)
```

| 参数 | 建议值 | 含义 | 取值理由 |
| --- | --- | --- | --- |
| fov 垂直角度 | 75 | 视野张开范围 | 0° = 闭眼什么都看不见；>180° 失去聚焦；75 接近人眼观感 |
| aspect 宽高比 | `innerWidth / innerHeight` | 物体绘制比例 | 与画布宽高比不一致 → 画面被拉伸/压扁 |
| near 近截面 | 0.1 | 最近可见距离 | 比这更近的物体不渲染 |
| far 远截面 | 1000 | 最远可见距离 | 比这更远的物体不渲染；按场景实际大小调 |

### 4. 为什么立方体初始看不见

three.js 用 **WebGL 右手坐标系**（右手：大拇指 = X 向右，食指 = Y 向上，中指指向自己 = Z）。
默认相机和物体**都在原点** → 相机在立方体内部 → 物体默认单面渲染，看不到内面 → 黑屏。
所以必须 `camera.position.z = 5`，把相机沿 Z 正方向拉出去形成视锥体，才能看到正面。

---

## 三、逐集详解与代码

### 02 三要素

```js
// 1. 下载并引入 three 库（npm i three）
// three.js 是【命名导出】，所以用 * as 全部挂到 THREE 对象上
import * as THREE from 'three'

// 场景、摄像机、渲染器
// 定义成全局变量：后续每个功能都是独立函数，都要用它们
let scene, camera, renderer

function init() {
  // 2. 创建场景对象
  scene = new THREE.Scene()

  // 3. 创建摄像机对象（fov, aspect, near, far）
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

  // 4. 创建渲染器；{ antialias: true } 是 08 集加的抗锯齿
  renderer = new THREE.WebGLRenderer({ antialias: true })
  // 设置渲染器画布大小（内部就是 canvas 标签）
  renderer.setSize(window.innerWidth, window.innerHeight)
  // 把 canvas 挂到页面上
  document.body.append(renderer.domElement)
  // 传入场景和摄像机，渲染画面
  renderer.render(scene, camera)
}

init()
```

**要点**：初版 `renderer.render()` 写在 init 里，但加了立方体之后**必须挪到渲染循环**——因为要先把物体加进场景，渲染器才知道该画什么。

### 03 立方体

```js
function createCube() {
  // 1. 创建图形：宽、高、深各 1 个单位
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  // 2. 创建材质：MeshBasicMaterial = 网格基础材质，用纯颜色（线/面）描绘表面
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  // 3. 创建网格物体对象，传入图形和材质
  const cube = new THREE.Mesh(geometry, material)
  // 4. 把物体加入到场景中（不 add 就不会被渲染）
  scene.add(cube)

  // 摄像机与物体默认都在原点 → 相机在盒内看不见，沿 Z 正方向后退 5 个单位
  camera.position.z = 5
}
```

**要点**：
- 这里的"1 个单位"不是 px/vw，是 three.js 特有的无后缀单位，可以当 1 米理解。
- `BoxGeometry` = 立方**缓冲**几何体。"缓冲"指顶点坐标数据先存进内存缓冲区，绘制时再取出来用。
- 文档里还有 PlaneGeometry、SphereGeometry、CircleGeometry 等，用法一致（视频里演示了用文档 Ctrl+F 搜构造函数）。

### 04 轨道控制器 + 渲染循环

```js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

let controls

function controlsCreate() {
  // 参数1：被控制的摄像机对象
  // 参数2：用于监听鼠标事件的 DOM 元素（就是渲染器的 canvas 标签）
  controls = new OrbitControls(camera, renderer.domElement)
}

function renderLoop() {
  // 每帧用最新的场景和摄像机状态渲染一次
  renderer.render(scene, camera)
  // 开了阻尼/自动旋转后，必须每帧调用 update（06 集重点）
  controls.update()
  // 按浏览器刷新帧率递归调度下一次（通常 60 次/秒）
  requestAnimationFrame(renderLoop)
}
```

**要点**：
- OrbitControls **不在 three 主包对象里**，要从 `three/addons/controls/OrbitControls.js` 单独引入（跟 05 集的 Stats 一样属于"附加组件"）。
- 为什么用 `requestAnimationFrame` 而不是 `setInterval`：**切到后台标签页会自动暂停**，`setInterval` 则一直跑、浪费性能。
- 交互效果：左键拖拽 = 旋转相机（绕着物体转），右键拖拽 = 平移相机，滚轮 = 拉远拉近。
- **注意**：动的是**摄像机**，场景里的物体和坐标轴始终不动。

### 05 坐标轴

```js
function createHelper() {
  // 参数：坐标轴三条线段的长度（单位）
  const axesHelper = new THREE.AxesHelper(5)
  // 坐标轴也是物体，要加进场景才显示
  scene.add(axesHelper)
}
```

**要点**：构造函数内部已经内置好图形和材质，直接 new 即可。受浏览器兼容性限制，**线段宽度只能是 1**。红=X、绿=Y、蓝=Z。

### 06 控制器属性（上）

```js
controls.enableDamping = true     // 阻尼：松手后有缓冲，不会立刻停（默认 false）
// controls.dampingFactor = 0.05 // 阻尼系数，默认 0.05，调大效果更明显
// controls.autoRotate = true    // 自动旋转：俯视看是顺时针带着相机转
// controls.minPolarAngle = 0    // 垂直旋转下限：0 = 正上方
// controls.maxPolarAngle = Math.PI  // 垂直旋转上限：π = 正下方（默认 0~π，能看顶也能看底）
```

**要点**：
- **polar = 垂直方向**，范围 0~π。分不清 0 在上还是在下？视频教的笨办法：把 min 和 max 都设成 0，看画面停在哪——上面。
- 开了阻尼/自动旋转，**必须在渲染循环里调 `controls.update()`**，否则不生效（文档里明确写了 "must be called in the animation loop"）。

### 07 控制器属性（下）

```js
// controls.minAzimuthAngle = 0.5 * Math.PI    // 水平旋转下限
// controls.maxAzimuthAngle = 1.5 * Math.PI    // 水平旋转上限
// controls.minDistance = 2   // 滚轮最近只能缩到离目标 2 个单位
// controls.maxDistance = 10  // 最远 10 个单位（默认无限远）
```

**要点**：
- **azimuth = 水平方向**，范围 -2π ~ +2π（约两圈），写正数更好理解。
- 限制范围的实际用途：只让用户看到正面和左面，看不到右面和背面。
- distance 是**透视相机**用的；文档里还有个 `zoomToCursor` / `minZoom` 是**正交相机**用的，查文档要看全，别搞混。

### 08 适配场景大小

```js
function renderResize() {
  // 1. 监听浏览器窗口尺寸改变
  window.addEventListener('resize', () => {
    // 2. 重新设置渲染器画布宽高
    renderer.setSize(window.innerWidth, window.innerHeight)
    // 3. 同步摄像机的宽高比（否则画面会被拉伸）
    camera.aspect = window.innerWidth / window.innerHeight
    // 4. 更新摄像机的投影矩阵（视锥体空间重新计算）
    camera.updateProjectionMatrix()
  })
}
```

**要点**：三步缺一不可；只改画布不改 aspect，画面会变形。
**附带优化**：`new THREE.WebGLRenderer({ antialias: true })` 开启抗锯齿，解决旋转时立方体边缘的锯齿感。

### 09 移动立方体

```js
function moveCube() {
  // 1. 位移：cube.position 的值是 Vector3 三维向量对象
  cube.position.x = 5              // 写法一：点单个轴属性
  // cube.position.set(5, 0, 0)    // 写法二：set 一次设三个轴

  // 2. 旋转：rotation 的值是 Euler 欧拉角对象【弧度制】
  cube.rotation.x = Math.PI / 4    // 45°（一圈是 0~2π，不是 0~360°）
  // cube.rotation.set(Math.PI / 4, 0, 0)

  // 3. 缩放：scale 的值也是 Vector3
  cube.scale.set(1, 1, 2)          // 沿 Z 轴放大 2 倍
}
```

**要点**：
- 这些属性来自 **Object3D 基类**，Mesh / Camera / Scene / 灯光 / 精灵都有。
- 旋转是**弧度制**；**从轴的正方向看物体，默认绕轴逆时针旋转**。
- 测旋转方向的笨办法：在渲染循环里每帧 `cube.rotation.x += 0.01`，肉眼观察往哪边转。

### 10 GUI 工具（上）

```js
// npm i dat.gui（包名是 dat.gui，不是 dat-gui）
import * as dat from 'dat.gui'

function createGUI() {
  const gui = new dat.GUI()

  // gui.add(参数1, 参数2)：参数1 = 关联的对象（DOM/JS/3D 物体都行）；参数2 = 该对象的某个属性
  gui.add(document, 'title')   // 字符串 → 输入框，改了会直接改浏览器标签栏文字
  gui.add(cube, 'visible')     // 布尔   → 复选框（3.1 控制立方体显示/隐藏）
  gui.add(controls, 'reset')   // 函数   → 按钮（3.2 点击让相机回到初始角度）

  // 3.3 控制立方体颜色
  // 踩坑：cube 上没有 color 属性（会报错！），颜色在 cube.material.color 上，
  // 且它是 three 封装的 Color 对象，直接 addColor 双向不同步。
  // 解法：自定义一个对象，用 getHexString() 拿到 "#xxxxxx" 字符串
  const colorObj = {
    col: `${cube.material.color.getHexString()}`   // 模板字符串补上 #
  }
  gui.addColor(colorObj, 'col').onChange(val => {
    // val 是界面选中的十六进制颜色字符串，如 '#ff00ff'
    cube.material.color = new THREE.Color(val)     // 反向影响立方体
  })
}
```

**要点**：
- **工具类型由属性值的类型自动决定**：字符串→输入框、布尔→复选框、函数→按钮、数字→进度条、第三个参数传对象→下拉菜单。
- 找属性的路径：文档 → 打印 `console.log(cube)` → 百度。**不能靠猜**（视频里就因为猜 `cube.color` 报错）。
- 打印报错对象时，`console.log` 必须写在**报错那一行的上面**，否则报错后不再往下执行。
- `createGUI()` 必须在 `createCube()` **之后**调用，因为它要访问全局的 cube。

### 11 GUI 工具（下）

```js
  // 3.4 分组：把相关工具收进一个可折叠的组
  const folder = gui.addFolder('位移')
  // 数字 → 进度条。参数3 = 最小值，参数4 = 最大值，参数5 = 步长（每拖一次变化多少）
  folder.add(cube.position, 'x', 0, 5, 0.1)
  folder.add(cube.position, 'y', 0, 5, 0.1)
  folder.add(cube.position, 'z', 0, 5, 0.1)

  // 3.5 下拉菜单：关键在【第三个参数是对象】
  // 对象属性名 = 下拉菜单显示的文字；属性值 = onChange 回调收到的值
  gui.add({ type: '1' }, 'type', { '方案1': '1', '方案2': '2' }).onChange(val => {
    if (val === '1') cube.position.set(0, 0, 0)
    if (val === '2') cube.position.set(2, 2, 2)
  })
```

**要点**：
- 初始值会**自动匹配**下拉菜单默认选中项（type 初始为 '1' → 默认显示"方案1"）。
- 进度条的实际用途（作者原话）：后面做 VR 展览馆时，用它调标记物体在三维空间里的位置，调完把数值回填到代码数据里。
- 旋转和缩放也同理，照葫芦画瓢加即可。

### 13 五颜六色立方体

```js
function createCube() {
  const geometry = new THREE.BoxGeometry(1, 1, 1)

  // 1. 定义颜色数组，顺序 = BoxGeometry 六面材质顺序：+X, -X, +Y, -Y, +Z, -Z
  const colorArr = ['red', 'green', 'blue', 'pink', 'orange', 'write']
  // 2. 每个颜色字符串 map 成材质对象，收集为材质数组
  const materialArr = colorArr.map(colorStr => {
    return new THREE.MeshBasicMaterial({ color: colorStr })
  })
  // 3. 材质位置传【数组】而不是单个对象 → 6 个面 6 种颜色
  cube = new THREE.Mesh(geometry, materialArr)
  scene.add(cube)
  camera.position.z = 5
}
```

**要点**：材质可以传数组给 Mesh，顺序严格按六面顺序。`'write'` 是视频里的拼写笔误（应为 `'white'`），three 会警告并按白色处理。

---

## 四、本章整合代码（main.js 最终版）

```js
// 1. 下载并引入 three 库：npm i three / npm i dat.gui
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import * as dat from 'dat.gui'

// 场景、摄像机、渲染器（全局：所有功能函数都要用）
let scene, camera, renderer
let controls   // 轨道控制器
let cube       // 立方体

/* ---------- 02 三要素 ---------- */
function init() {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  renderer = new THREE.WebGLRenderer({ antialias: true })   // 08: 抗锯齿
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.append(renderer.domElement)
}

/* ---------- 04 轨道控制器 ---------- */
function controlsCreate() {
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true   // 06: 阻尼
  // controls.dampingFactor = 0.05
  // controls.autoRotate = true
  // controls.minPolarAngle = 0      // 06: 垂直 0=上
  // controls.maxPolarAngle = Math.PI // 06: π=下
  // controls.minAzimuthAngle = 0.5 * Math.PI  // 07: 水平
  // controls.maxAzimuthAngle = 1.5 * Math.PI
  // controls.minDistance = 2        // 07: 缩放范围
  // controls.maxDistance = 10
}

/* ---------- 05 坐标轴 ---------- */
function createHelper() {
  const axesHelper = new THREE.AxesHelper(5)
  scene.add(axesHelper)   // 线段宽度只能是 1
}

/* ---------- 03 + 13 立方体（六面不同色） ---------- */
function createCube() {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const colorArr = ['red', 'green', 'blue', 'pink', 'orange', 'white']
  const materialArr = colorArr.map(colorStr => new THREE.MeshBasicMaterial({ color: colorStr }))
  cube = new THREE.Mesh(geometry, materialArr)
  scene.add(cube)
  camera.position.z = 5   // 相机后退，否则在盒子内部看不见
}

/* ---------- 08 适配窗口 ---------- */
function renderResize() {
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  })
}

/* ---------- 09 位移/旋转/缩放 ---------- */
function moveCube() {
  cube.position.x = 5              // 或 cube.position.set(5, 0, 0)
  cube.rotation.x = Math.PI / 4    // 弧度制；从轴正方向看是逆时针
  cube.scale.set(1, 1, 2)          // 沿 Z 轴放大 2 倍
}

/* ---------- 10/11 GUI ---------- */
function createGUI() {
  const gui = new dat.GUI()
  gui.add(document, 'title')        // 字符串 → 输入框
  gui.add(cube, 'visible')          // 布尔   → 复选框
  gui.add(controls, 'reset')        // 函数   → 按钮

  const colorObj = { col: `${cube.material.color.getHexString()}` }
  gui.addColor(colorObj, 'col').onChange(val => {
    cube.material.color = new THREE.Color(val)
  })

  const folder = gui.addFolder('位移')
  folder.add(cube.position, 'x', 0, 5, 0.1)   // 数字 → 进度条（min, max, step）
  folder.add(cube.position, 'y', 0, 5, 0.1)
  folder.add(cube.position, 'z', 0, 5, 0.1)

  gui.add({ type: '1' }, 'type', { '方案1': '1', '方案2': '2' }).onChange(val => {
    if (val === '1') cube.position.set(0, 0, 0)
    if (val === '2') cube.position.set(2, 2, 2)
  })
}

/* ---------- 04 渲染循环 ---------- */
function renderLoop() {
  renderer.render(scene, camera)
  controls.update()                  // 有阻尼/自动旋转时必须调用
  requestAnimationFrame(renderLoop)  // 按刷新帧率递归；切后台自动暂停
}

/* ---------- 调用顺序：先环境 → 再内容 → 再交互 → 最后循环 ---------- */
init()
controlsCreate()
createHelper()
createCube()
renderResize()
moveCube()
createGUI()      // 必须在 createCube 之后（要访问 cube）
renderLoop()     // render 语句从 init 挪到这里
```

---

## 五、dat.gui 速查表

| 属性值类型 | 生成的工具 | 写法 |
| --- | --- | --- |
| 字符串 | 输入框 | `gui.add(document, 'title')` |
| 布尔 | 复选框 | `gui.add(cube, 'visible')` |
| 函数 | 按钮 | `gui.add(controls, 'reset')` |
| 数字 | 进度条 | `folder.add(cube.position, 'x', 0, 5, 0.1)` |
| 第三个参数传对象 | 下拉菜单 | `gui.add(obj, 'type', {'方案1': '1', '方案2': '2'})` |
| `addColor` 方法 | 颜色选择器 | `gui.addColor(colorObj, 'col')` |

---

## 六、three.js r148 兼容性

本章代码在你本地 three.js **r148 上无需任何修改**（OrbitControls、AxesHelper、dat.gui、requestAnimationFrame、材质数组都是老 API，r148 全支持）。
