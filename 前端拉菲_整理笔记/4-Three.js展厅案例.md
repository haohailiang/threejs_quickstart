# 4 - Three.js 展厅案例（VR 全景革命展览馆）

> 本目录 6 集视频（04~09）：在 Vite 项目骨架上实现多展厅全景漫游——
> **立方体六面贴全景图 → 地面热点标记（透明贴图平面）→ Raycaster 点击切换场景 → 原生 DOM 转 CSS3DObject 标签 → 事件回调**。
> 核心思想贯穿始终：**数据驱动视图**——场景信息全是数据对象，函数只负责把数据映射成 3D 内容。
> 前置工程见《3-Three.js案例初始化.md》（Vite + utils/init.js 三要素 + 适配）。

---

## 04 展厅一的设置

### 本集要点

1. **先静后动**：先把静态场景搭完（贴图、标记摆好），再做交互。
2. **数据影响视图**：场景数据对象 `sceneInfoObj`，每个场景一个属性（`one` / `two` / ...）。
3. 素材：`public/technology/1/` ~ `21/` 共 21 个场景的全景图（每场景 6 张：px/nx/py/ny/pz/nz），`public/other/landmark.png` 热点标记图，`public/video/` 视频。**public 是 Vite 默认静态资源目录**，直接以 `/` 开头的路径访问；拖入时要选"复制文件夹"。
4. 贴图遇两坑：**画面镜像**（立方体 `scale.set(1, 1, -1)` 修）、**颜色发浅**（纹理 `colorSpace = THREE.SRGBColorSpace`）。

### 数据对象（4.1）

```js
const sceneInfoObj = {
  one: { // 第一个场景里数据
    publicPath: 'technology/1/',   // 公共前缀路径（public 目录下）
    // 立方体贴图顺序固定：+x -x +y -y +z -z
    imgUrlArr: ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
    markList: [ // 当前空间中所有标记信息对象（保持数组结构统一，方便扩展多个标记）
      {
        name: 'landMark',              // 名字 = 类型区分（地上热点标记）
        imgUrl: 'other/landmark.png',  // 图片地址（相对 public）
        wh: [0.05, 0.05],              // 平面宽高（立方体边长 1，中心 0，半宽 0.5，标记要小）
        position: [0, 0, 0],           // 位置（待 GUI 调整后回填）
        rotation: [0, 0, 0],           // 旋转角度值
        targetAttr: 'two'              // 下一个场景数据对象的属性名
      }
    ]
  }
}
```

### 贴图函数 setMaterialCube（4.2）

```js
// 4.2 准备创建纹理贴图函数
function setMaterialCube(infoObj) {
  const { publicPath, imgUrlArr, markList } = infoObj   // 解构赋值
  const textureLoader = new THREE.TextureLoader()
  textureLoader.setPath(publicPath)                     // 设置公共前缀

  // 遍历纹理图片 → 映射纹理对象 → 贴到立方体上
  const materialArr = imgUrlArr.map(imgStr => {
    const texture = textureLoader.load(imgStr)
    texture.colorSpace = THREE.SRGBColorSpace           // 修复颜色发浅（r152+）
    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide                            // 相机在盒子内部，双面渲染
    })
  })

  cubeObj.material = materialArr   // 覆盖掉立方体原本的材质（6 面各一张图）
}

const cubeObj = createCube()
setMaterialCube(sceneInfoObj.one) // 默认先渲染第一个场景信息
```

### 镜像修复（createCube 内新增）

```js
cube.scale.set(1, 1, -1)   // 沿 Z 轴缩放 -1，修复全景图镜像
```

> ⚠️ 一个立方体赋 6 个材质：`mesh.material = [m1, m2, m3, m4, m5, m6]`，按面 +x -x +y -y +z -z 对应。

---

## 05 展厅一的地板标记

### 本集要点

1. 遍历 `markList`，按 `name`（= 类型）分发到不同的创建函数。
2. 热点标记 = **透明贴图的 PlaneGeometry**（镂空图要 `transparent: true`）。
3. **Group 统一管理**当前场景所有标记——切换场景时整组清空。
4. 封装 **`utils/gui.js`** 的 `guiMove(obj)`：页面上拖 6 个进度条调位置/角度，调好**回填数据对象**，之后由数据驱动位置。
5. 全景立方体里"地面"其实是 y=-0.5 那面"墙"，平面标记直接往下贴是贴不上的，必须配合旋转。

### main.js 新增代码

```js
const group = new THREE.Group() // 当前空间中所有标记

// setMaterialCube 内，贴完纹理后：
markList.forEach(markObj => {
  // 如果是地上的热点标记，调用对应函数传递标记信息对象
  if (markObj.name === 'landMark') createLandMark(markObj)
})
// 等待上边循环往组里加入当前场景所有标记物体后，再把组放到场景中一起渲染
scene.add(group)

// 4.3 准备创建地上热点标记函数
function createLandMark(infoObj) {
  const { imgUrl, wh, position, rotation, targetAttr } = infoObj
  const geometry = new THREE.PlaneGeometry(...wh)   // 扩展运算符：wh 数组展开成 2 个参数
  const material = new THREE.MeshBasicMaterial({
    map: (new THREE.TextureLoader()).load(imgUrl),
    side: THREE.DoubleSide,
    transparent: true   // 透明纹理（镂空图只展示有颜色区域内容）
  })
  const mesh = new THREE.Mesh(geometry, material)   // ⚠️ 视频里曾漏传 geometry
  group.add(mesh)
}
```

### utils/gui.js（4.4，完整文件）

```js
// 封装调整物体位置和旋转角度的，图形用户界面
import * as dat from 'dat.gui'

const gui = new dat.GUI()

export default function guiMove(obj) {
  gui.add(obj.position, 'x', -1, 1, 0.01).name('位移x')
  gui.add(obj.position, 'y', -1, 1, 0.01).name('位移y')
  gui.add(obj.position, 'z', -1, 1, 0.01).name('位移z')

  gui.add(obj.rotation, 'x', 0, 2 * Math.PI, 0.01).name('旋转x')
  gui.add(obj.rotation, 'y', 0, 2 * Math.PI, 0.01).name('旋转y')
  gui.add(obj.rotation, 'z', 0, 2 * Math.PI, 0.01).name('旋转z')
}
```

> - 立方体边长 1、中心为原点 → 位置范围给 -1~1 足够；转一圈 0~2π。
> - gui 只是**临时调试工具**：调好数值 → 截图抄回数据对象 → 注释掉 `guiMove(mesh)`。

### 数据回填 + 生效（main.js）

```js
import guiMove from './utils/gui.js'   // 顶部默认导入

// createLandMark 内新增（gui 调完、数据回填后）：
mesh.position.set(...position)
mesh.rotation.set(...rotation)
// guiMove(mesh)   // 调完注释掉

// one.markList[0] 回填后的数值：
position: [-0.46, -0.11, -0.11], // 位置
rotation: [1.42, 0.68, 1.63],    // 旋转角度值
```

> 调试技巧：OrbitControls **按住鼠标右键可平移摄像机**，侧身观察能发现"地面在墙上"的问题。

---

## 06 展厅二的切换

### 本集要点

1. **切换链路**：点击 → Raycaster 找到标记 → 读 userData 拿目标场景名 → clear 清空旧标记 → setMaterialCube 铺新场景。
2. `intersectObjects` 返回的每个元素里，**`.object` 才是真正碰到的 3D 物体**。
3. 用 `mesh.name = 'mark'` 区分热点标记和立方体；用 `mesh.userData.attr = targetAttr` 给 3D 物体绑自定义数据（类似 DOM 自定义属性）。
4. 没点中标记时 `find` 返回 undefined → **必须 `if (obj)` 判断**，否则访问属性报错。
5. `clear()` 里先 `[...group.children]` **浅拷贝**再遍历删除——否则边删边遍历会跳过元素（数组长度实时变化）。

### 第二个场景数据（注意视频笔误）

```js
two: {
  publicPath: 'technology/2/',
  imgUrlArr: ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
  markList: [
    { // 后退标记（回场景一）
      name: 'landMark',
      url: 'other/landmark.png',   // ⚠️ 视频笔误：这里写成了 url，与 createLandMark 解构的 imgUrl 不一致！
      wh: [0.05, 0.05],
      position: [0.47, -0.2, 0],
      rotation: [1.48, 0.26, -1.78],
      targetAttr: 'one' // 目标场景信息对象属性
    }, { // 前进标记（去场景三）
      name: 'landMark',
      url: 'other/landmark.png',   // ⚠️ 同上，自己复现时应统一为 imgUrl
      wh: [0.05, 0.05],
      position: [-0.46, -0.16, -0.3],
      rotation: [1.21, 0.78, 0],
      targetAttr: 'three'
    }
  ]
}
```

### bindClick（5.2 与 3D 物体交互事件绑定）

```js
function bindClick() {
  const rayCaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  window.addEventListener('click', e => {
    // 屏幕坐标 → WebGL 设备坐标（NDC，-1~1，Y 轴取反）
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1

    rayCaster.setFromCamera(pointer, camera)            // 从相机向点击点发射线
    const list = rayCaster.intersectObjects(scene.children) // 收集射线穿过的所有物体
    // 查找到我点击的热点标记物体
    const obj = list.find(obj => obj.object.name === 'mark')
    if (obj) {
      // 提取物体上绑定的自定义属性，切换场景
      const infoObj = sceneInfoObj[obj.object.userData.attr]
      // 5.4 切换纹理，重新创建当前场景下的热点标记
      setMaterialCube(infoObj)
    }
  })
}

bindClick() // three.js 3D 物体点击事件
```

### createLandMark 内新增（名字 + 自定义属性）

```js
// 给地上热点标记添加名字-方便点击时进行区分
mesh.name = 'mark'
// three.js 3D 物体也可以自定义属性和值（方便后续获取绑定的这个数据）
// 绑定这个地上热点标记，要切换到哪个场景信息对象，对应名字属性
mesh.userData.attr = targetAttr
group.add(mesh)
```

### clear 函数（5.3 准备清除函数，清除当下热点标记）

```js
function clear() {
  // 清除组内物体
  const list = [...group.children]   // 浅拷贝一份！直接遍历 group.children 边删边跳
  list.forEach(obj => {
    obj.geometry.dispose()   // 释放几何体内存
    obj.material.dispose()   // 释放材质内存
    group.remove(obj)        // 从组里移除（会改变 children 长度，所以上面要拷贝）
  })
}
```

### setMaterialCube 开头插入

```js
function setMaterialCube(infoObj) {
  clear() // 清除上个场景空间中的所有标记
  // ...原有贴图、创建标记逻辑
}
```

> 验证：点击后控制台打印 list 有 5 个物体——3 个坐标轴 + 1 个标记平面 + 1 个立方体盒子；按相机到鼠标点的距离排序收集。

---

## 07 展厅三的切换

### 本集要点

- **流水线已打通，只需加数据**。点击、清除、切换、重建的逻辑对任意场景通用——新场景 = 新数据对象。
- 函数调度顺序：`点击 → setMaterialCube（先 clear → 创建 6 面材质 → 遍历 markList 逐个创建标记 → scene.add(group)）`。

### 第三个场景数据

```js
three: {
  publicPath: 'technology/3/',
  imgUrlArr: ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
  markList: [
    { // 后退（回场景二）
      name: 'landMark',
      imgUrl: 'other/landmark.png',
      wh: [0.05, 0.05],
      position: [0.4, -0.18, 0.32],
      rotation: [-1.53, -0.04, -1.26],
      targetAttr: 'two' // 目标场景信息对象属性
    }, { // 前进（去场景四）
      name: 'landMark',
      imgUrl: 'other/landmark.png',
      wh: [0.05, 0.05],
      position: [0.32, -0.16, -0.33],
      rotation: [1.46, 0.1, -0.17],
      targetAttr: 'four'
    }
  ]
}
```

---

## 08 展厅四的内容创建

### 本集要点

1. 第四种场景的前进标记不是地上贴图，而是**原生 DOM 标签**（span）转 3D 物体——用 **CSS3DRenderer / CSS3DObject**。
2. `markList` 遍历时按 `name` 分发：`landMark` → 平面的；`dom` → `createDomMark`。
3. CSS3D 需要**单独的渲染器**：和 WebGL 画布同尺寸、`fixed` 定位铺满屏幕、`pointerEvents: none` 防挡轨道控制器；渲染循环里也要渲染一次。
4. DOM 在 3D 里默认太大 → `tag3d.scale.set(1/800, 1/800, 1/800)`。

### four 数据对象（7.1）

```js
four: {
  publicPath: 'technology/4/',
  imgUrlArr: ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
  markList: [
    { // 后退（回场景三）
      name: 'landMark',
      imgUrl: 'other/landmark.png',
      wh: [0.05, 0.05],
      position: [-0.35, -0.22, 0.4],
      rotation: [-0.85, -0.45, -1.8],
      targetAttr: 'three' // 目标场景信息对象属性
    },
    { // 前进：原生 DOM 标签（下一集再加 active）
      name: 'dom',
      position: [0.49, 0, 0],
      rotation: [0, -0.5 * Math.PI, 0],
      targetAttr: 'five' // 目标场景信息对象属性
    }
  ]
}
```

### style.css 新增

```css
.mark-style {
  padding: 5px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  cursor: pointer;
}
```

### createDomMark（7.2 准备创建 DOM 标记的函数）

```js
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'  // 顶部引入

// setMaterialCube 的遍历里新增分支：
// 原生 DOM 标记
else if (markObj.name === 'dom') createDomMark(markObj)

function createDomMark(infoObj) {
  const { position, rotation } = infoObj
  const tag = document.createElement('span')
  tag.className = 'mark-style'
  tag.innerHTML = '前进'
  tag.style.pointerEvents = 'all'   // 让标签自己能接收鼠标事件（父容器是 none）

  // DOM -> 3D 物体
  const tag3d = new CSS3DObject(tag)
  tag3d.scale.set(1 / 800, 1 / 800, 1 / 800)   // DOM 像素尺寸太大，缩小到 3D 世界尺度
  tag3d.position.set(...position)
  tag3d.rotation.set(...rotation)
  group.add(tag3d)
}
```

### init.js 新增 CSS3DRenderer（7.3）

```js
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'

export let scene, camera, renderer, controls, css3dRenderer;

(function create3dRenderer() {
  css3dRenderer = new CSS3DRenderer()
  css3dRenderer.setSize(window.innerWidth, window.innerHeight)
  css3dRenderer.domElement.style.position = 'fixed'
  css3dRenderer.domElement.style.left = '0'
  css3dRenderer.domElement.style.top = '0'
  css3dRenderer.domElement.style.pointerEvents = 'none'  // ⚠️ s 别忘了写，否则挡轨道控制器
  document.body.appendChild(css3dRenderer.domElement)
})();

// renderLoop 渲染循环里追加：
css3dRenderer.render(scene, camera)
```

---

## 09 展厅四的事件绑定

### 本集要点（修两个遗留问题）

**问题 1：切出第四场景时报错 `Cannot read properties of undefined (reading 'dispose')`**

- 排错方法：读报错冒号后的核心信息 → 看调用栈里**自己写的文件**（main.js:132 行）。
- 原因：clear 遍历组内物体时，**CSS3DObject 没有 geometry/material**，调 dispose 报错。
- 修复：用 `isCSS3DObject` 属性判断，DOM 转的 3D 物体只 remove，不 dispose：

```js
function clear() {
  // 清除组内物体
  const list = [...group.children]
  list.forEach(obj => {
    if (!obj.isCSS3DObject) {
      obj.geometry.dispose()
      obj.material.dispose()
    }
    group.remove(obj)
  })
}
```

**问题 2：DOM 标签的点击交互**

- CSS3DObject 包的是原生 DOM → 直接绑**原生 click 事件**即可，不用 Raycaster。
- 为了让 createDomMark 通用（以后多个 DOM 标记复用），点击逻辑不写死，而是**回调数据对象里的 `active` 函数**并传回事件对象：

```js
// createDomMark 内新增：
const { position, rotation, active } = infoObj
// ...
tag.addEventListener('click', e => {
  active(e)   // 回调数据对象中的函数，传回事件对象
})
```

- 数据对象里准备 `active` 方法（为第五个场景铺垫）：

```js
{ // four.markList[1]
  name: 'dom',
  position: [0.49, 0, 0],
  rotation: [0, -0.5 * Math.PI, 0],
  targetAttr: 'five', // 目标场景信息对象属性
  active(e) {
    alert('将要切换到第五个场景')
    setMaterialCube(sceneInfoObj.five)   // 下一集准备 five 数据后生效
  }
}
```

> 设计思想：假如 3D 空间里有 10 个 DOM 标记，每个数据对象的 `active` 各不同，遍历创建时各自绑定各自的点击逻辑。后端接口没给函数时，也可以 JS 侧给对象补 `active` 方法。

---

## 章末整合：完整代码

### 最终目录结构

```
vr-project/
├─ index.html
├─ main.js
├─ style.css
├─ package.json
├─ public/
│  ├─ technology/1~21/   ← 每场景 6 张全景图 px/nx/py/ny/pz/nz.jpg
│  ├─ other/landmark.png ← 地面热点标记图（镂空）
│  └─ video/             ← 视频素材
└─ utils/
   ├─ init.js            ← 三要素 + 控制器 + 适配 + 渲染循环 + CSS3DRenderer
   └─ gui.js             ← guiMove 调试工具
```

### utils/init.js（完整）

```js
// 目标：初始化 three.js 基础环境
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'

export let scene, camera, renderer, controls, css3dRenderer;

(function init() {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = 0.1
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)
})();

(function createControls() {
  controls = new OrbitControls(camera, renderer.domElement)
})();

(function createHelper() {
  const axesHelper = new THREE.AxesHelper(5)
  scene.add(axesHelper)
})();

(function resizeRender() {
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  })
})();

// CSS3D 渲染器：渲染原生 DOM 转 3D 的标签
(function create3dRenderer() {
  css3dRenderer = new CSS3DRenderer()
  css3dRenderer.setSize(window.innerWidth, window.innerHeight)
  css3dRenderer.domElement.style.position = 'fixed'
  css3dRenderer.domElement.style.left = '0'
  css3dRenderer.domElement.style.top = '0'
  css3dRenderer.domElement.style.pointerEvents = 'none'
  document.body.appendChild(css3dRenderer.domElement)
})();

(function renderLoop() {
  renderer.render(scene, camera)
  css3dRenderer.render(scene, camera)
  controls.update()
  requestAnimationFrame(renderLoop)
})();
```

### utils/gui.js（完整）

```js
// 封装调整物体位置和旋转角度的，图形用户界面
import * as dat from 'dat.gui'

const gui = new dat.GUI()

export default function guiMove(obj) {
  gui.add(obj.position, 'x', -1, 1, 0.01).name('位移x')
  gui.add(obj.position, 'y', -1, 1, 0.01).name('位移y')
  gui.add(obj.position, 'z', -1, 1, 0.01).name('位移z')
  gui.add(obj.rotation, 'x', 0, 2 * Math.PI, 0.01).name('旋转x')
  gui.add(obj.rotation, 'y', 0, 2 * Math.PI, 0.01).name('旋转y')
  gui.add(obj.rotation, 'z', 0, 2 * Math.PI, 0.01).name('旋转z')
}
```

### main.js（完整，含四个场景数据 + 全部函数）

```js
// 入门
import { camera, scene } from './utils/init.js'
import * as THREE from 'three'
import guiMove from './utils/gui.js'
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'

const group = new THREE.Group() // 当前空间中所有标记

// 4.1 定义数据对象相关属性和值
const sceneInfoObj = {
  one: { // 第一个场景里数据
    publicPath: 'technology/1/',
    imgUrlArr: ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
    markList: [ // 当前空间中所有标记信息对象
      {
        name: 'landMark',
        imgUrl: 'other/landmark.png',
        wh: [0.05, 0.05],               // 平面宽高
        position: [-0.46, -0.11, -0.11],// 位置
        rotation: [1.42, 0.68, 1.63],   // 旋转角度值
        targetAttr: 'two'               // 下一个场景数据对象的属性名
      }
    ]
  },
  two: {
    publicPath: 'technology/2/',
    imgUrlArr: ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
    markList: [
      {
        name: 'landMark',
        imgUrl: 'other/landmark.png',
        wh: [0.05, 0.05],
        position: [0.47, -0.2, 0],
        rotation: [1.48, 0.26, -1.78],
        targetAttr: 'one'
      }, {
        name: 'landMark',
        imgUrl: 'other/landmark.png',
        wh: [0.05, 0.05],
        position: [-0.46, -0.16, -0.3],
        rotation: [1.21, 0.78, 0],
        targetAttr: 'three'
      }
    ]
  },
  three: {
    publicPath: 'technology/3/',
    imgUrlArr: ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
    markList: [
      {
        name: 'landMark',
        imgUrl: 'other/landmark.png',
        wh: [0.05, 0.05],
        position: [0.4, -0.18, 0.32],
        rotation: [-1.53, -0.04, -1.26],
        targetAttr: 'two'
      }, {
        name: 'landMark',
        imgUrl: 'other/landmark.png',
        wh: [0.05, 0.05],
        position: [0.32, -0.16, -0.33],
        rotation: [1.46, 0.1, -0.17],
        targetAttr: 'four'
      }
    ]
  },
  four: {
    publicPath: 'technology/4/',
    imgUrlArr: ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
    markList: [
      {
        name: 'landMark',
        imgUrl: 'other/landmark.png',
        wh: [0.05, 0.05],
        position: [-0.35, -0.22, 0.4],
        rotation: [-0.85, -0.45, -1.8],
        targetAttr: 'three'
      },
      {
        name: 'dom',
        position: [0.49, 0, 0],
        rotation: [0, -0.5 * Math.PI, 0],
        targetAttr: 'five',
        active(e) {
          alert('将要切换到第五个场景')
          setMaterialCube(sceneInfoObj.five)
        }
      }
    ]
  }
}

// 3.2 在 main.js 中创建立方体对象并返回立方体对象到全局常量上
function createCube() {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide })
  const cube = new THREE.Mesh(geometry, material)
  cube.scale.set(1, 1, -1)   // 沿 Z 轴镜像翻转，修复全景图反向
  scene.add(cube)
  return cube
}

// 5.3 准备清除函数，清除当下热点标记
function clear() {
  // 清除组内物体
  const list = [...group.children]
  list.forEach(obj => {
    if (!obj.isCSS3DObject) {
      obj.geometry.dispose()
      obj.material.dispose()
    }
    group.remove(obj)
  })
}

// 4.2 准备创建纹理贴图函数
function setMaterialCube(infoObj) {
  clear() // 清除上个场景空间中的所有标记

  const { publicPath, imgUrlArr, markList } = infoObj
  const textureLoader = new THREE.TextureLoader()
  textureLoader.setPath(publicPath)

  // 遍历纹理图片->映射纹理对象->贴到立方体上
  const materialArr = imgUrlArr.map(imgStr => {
    const texture = textureLoader.load(imgStr)
    texture.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide
    })
  })
  cubeObj.material = materialArr // 覆盖掉立方体原本的材质

  // 4.3 准备创建地上热点标记函数
  markList.forEach(markObj => {
    // 地板标记
    if (markObj.name === 'landMark') createLandMark(markObj)
    // 原生 DOM 标记
    else if (markObj.name === 'dom') createDomMark(markObj)
  })
  // 等待循环往组里加入当前场景所有标记物体后，再把组放到场景中一起渲染
  scene.add(group)
}

function createLandMark(infoObj) {
  const { imgUrl, wh, position, rotation, targetAttr } = infoObj
  const geometry = new THREE.PlaneGeometry(...wh)
  const material = new THREE.MeshBasicMaterial({
    map: (new THREE.TextureLoader()).load(imgUrl),
    side: THREE.DoubleSide,
    transparent: true // 透明纹理（镂空图只展示白色区域内容）
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)

  // 给地上热点标记添加名字-方便点击时进行区分
  mesh.name = 'mark'
  // three.js 3D 物体也可以自定义属性和值（方便后续获取绑定的这个数据）
  mesh.userData.attr = targetAttr

  group.add(mesh)
  // guiMove(mesh) // 4.4 临时调试位置用，调完回填数据后注释掉
}

function createDomMark(infoObj) {
  const { position, rotation, active } = infoObj
  const tag = document.createElement('span')
  tag.className = 'mark-style'
  tag.innerHTML = '前进'
  tag.style.pointerEvents = 'all'
  tag.addEventListener('click', e => {
    active(e) // 回调数据对象中的函数，传回事件对象
  })

  // DOM -> 3D 物体
  const tag3d = new CSS3DObject(tag)
  tag3d.scale.set(1 / 800, 1 / 800, 1 / 800)
  tag3d.position.set(...position)
  tag3d.rotation.set(...rotation)
  group.add(tag3d)
}

function bindClick() {
  const rayCaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  // 5.2 与 3D 物体交互事件绑定
  window.addEventListener('click', e => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1

    rayCaster.setFromCamera(pointer, camera)
    const list = rayCaster.intersectObjects(scene.children)
    // 查找到我点击的热点标记物体
    const obj = list.find(obj => obj.object.name === 'mark')
    if (obj) {
      // 提取物体上绑定的自定义属性，切换场景
      const infoObj = sceneInfoObj[obj.object.userData.attr]
      // 5.4 切换纹理，重新创建当前场景下的热点标记
      setMaterialCube(infoObj)
    }
  })
}

const cubeObj = createCube()
setMaterialCube(sceneInfoObj.one) // 默认先渲染第一个场景信息
bindClick() // three.js 3D 物体点击事件
```

### style.css（完整）

```css
body {
  margin: 0;
}

.mark-style {
  padding: 5px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  cursor: pointer;
}
```

---

## 本章速查表

| 需求 | 代码 |
|---|---|
| 6 面贴图 | `mesh.material = [6 个 MeshBasicMaterial]`，顺序 px nx py ny pz nz |
| 全景镜像 | `cube.scale.set(1, 1, -1)` |
| 贴图发浅 | `texture.colorSpace = THREE.SRGBColorSpace`（r148 用 `texture.encoding = THREE.sRGBEncoding`） |
| 镂空 PNG | `transparent: true` + `side: THREE.DoubleSide` |
| 数组展开传参 | `new THREE.PlaneGeometry(...wh)` / `mesh.position.set(...position)` |
| 点击 3D 物体 | `Raycaster` + `setFromCamera(pointer, camera)` + `intersectObjects(scene.children)` |
| NDC 坐标 | `x = (clientX/innerWidth)*2-1`；`y = -(clientY/innerHeight)*2+1` |
| 找到目标物体 | `list.find(o => o.object.name === 'mark')` + `if (obj)` 防空 |
| 物体绑数据 | `mesh.userData.attr = 'two'` |
| 切换前清空 | `[...group.children]` 浅拷贝 → `dispose()` + `group.remove()` |
| DOM 转 3D | `new CSS3DObject(tag)` + `scale.set(1/800,1/800,1/800)` + CSS3DRenderer |
| CSS3D 容器 | `fixed` + `left/top: 0` + `pointerEvents: none`；标签自身 `pointerEvents: 'all'` |
| CSS3D 判断 | `obj.isCSS3DObject`（无 geometry/material，不能 dispose） |
| DOM 点击 | 原生 `tag.addEventListener('click', e => active(e))`，逻辑放数据对象 `active` 里 |
| 调位置神器 | `guiMove(obj)`（dat.gui），调好回填数据后注释掉 |
| 平移相机观察 | OrbitControls 按住鼠标右键拖拽 |

## 视频笔误记录（复现时注意）

1. **two 数据对象里图片字段写成了 `url`**，而 createLandMark 解构的是 `imgUrl`——会导致场景二的标记贴图加载失败，复现时应统一为 `imgUrl`（three/four 里用的都是 imgUrl）。
2. 05 集 createLandMark 里 `new THREE.Mesh(material)` 漏传 `geometry`，视频中已当场修复为 `new THREE.Mesh(geometry, material)`。
