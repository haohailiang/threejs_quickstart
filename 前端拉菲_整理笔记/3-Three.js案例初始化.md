# 3 - Three.js 案例初始化（VR 全景革命展览馆项目）

> 本目录 3 集视频：从 0 用 **Vite** 搭建工程 → 准备 three.js 三要素（模块化写法）→ 窗口适配 + 第一个立方体。
> 这是后续「展厅案例」「VR 全景」项目的**地基工程**，本项目最终效果是「VR 全景革命纪念馆」（点地面热点切换场景、3D 标签、场景内贴视频）。
> 与前面「基础（一/二）」的最大区别：**从 Live Server + importmap 换成了 Vite 工程化 + ES 模块**。

---

## 01 项目开始 - Vite 项目初始化

### 本集要点

1. **项目预览**：最终成品是类似 VR 全景看房的革命纪念馆——点击地上热点标记切换场景、有 div 信息标签指向展品、场景内还能贴宣传视频。
2. **本视频任务**：准备 Vite 前端构建工具环境，后续视频再准备 three.js 三要素、轨道控制器、坐标轴辅助、适配和立方体。
3. **模块化编程思想**：把三要素初始化抽到 `utils/init.js` 独立作用域管理，不再全部堆在 main.js 里。

### 创建 Vite 项目（终端命令）

在目标文件夹的地址栏输入 `cmd` 打开终端，依次执行：

```bash
npm create vite@latest     # 用最新版 Vite 创建项目
# 交互问答：
#   ? Project name: » vr-project        ← 输入项目名
#   ? Select a framework: » Vanilla     ← 默认第一个（纯 HTML+CSS+JS）
#   ? Select a variant:   » JavaScript  ← 原生 JS
```

### 清理模板

Vite 默认模板带一些演示内容，删掉多余的 `public/`、`src/`（以及 `counter.js`、`javascript.svg` 等），只保留：

```
vr-project/
├─ index.html        ← 入口 HTML
├─ main.js           ← JS 入口（清空）
├─ style.css         ← 样式（清空）
└─ package.json      ← npm 包配置清单
```

清理后的 `index.html`：

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VR 全景革命展览馆</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <script type="module" src="/main.js"></script>
  </body>
</html>
```

> - 删掉了 `<div id="app"></div>` 和 vite.svg 图标的 `<link>`。
> - `<link rel="stylesheet" href="/style.css">` 手动加回，因为模板的样式是在 JS 里 import 的，清空 main.js 后样式就丢了。
> - `main.js` 必须保留 `type="module"`——Vite 靠它做 ES 模块入口。

清理后的 `style.css`（去掉 body 默认 8px 外边距，也可以额外引入 reset.css）：

```css
body {
  margin: 0;
}
```

### 安装依赖并启动

```bash
npm i          # 安装 package.json 里的清单（含 vite），一定要在项目文件夹下执行
npm run dev    # 启动开发服务器 → Local: http://127.0.0.1:5173/
```

清理后 `package.json` 内容（frame 核对，Vite 4.x 时代）：

```json
{
  "name": "vr-project",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^4.4.5"
  }
}
```

> ⚠️ 注意：`npm i` 前确认终端所在文件夹下有 `package.json`，否则装错位置。

---

## 02 three.js 基本要素准备

### 本集要点

1. 安装项目依赖：`three` 本体 + `dat.gui`（后面调热点标记位置和角度用）。
2. 新建 `utils/` 文件夹，在其中 `init.js` 里用**模块化思想**初始化三要素。
3. 用**带名字的立即执行函数（具名自调用函数）**组织代码，每个职责一个函数：`init` / `createControls` / `createHelper` / `renderLoop`。
4. 关键认知：**只有 `index.html` 里引入的 `main.js` 才是 JS 入口**，`utils/init.js` 必须被 main.js import 才会执行。

### 安装依赖

```bash
npm i three dat.gui
```

### `utils/init.js`（本集写完的完整内容）

```js
// 目标：初始化 three.js 基础环境
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

let scene, camera, renderer, controls;

// ① 三要素
(function init() {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = 0.1                    // 相机在立方体内部（参考全景公园）
  renderer = new THREE.WebGLRenderer({ antialias: true })  // 抗锯齿
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)
})();

// ② 轨道控制器（addons 单独引入，不是 THREE.OrbitControls！）
(function createControls() {
  controls = new OrbitControls(camera, renderer.domElement)
})();

// ③ 坐标轴辅助对象
(function createHelper() {
  const axesHelper = new THREE.AxesHelper(5)
  scene.add(axesHelper)
})();

// ④ 渲染循环：等待浏览器下一次刷新时重绘最新画面
(function renderLoop() {
  renderer.render(scene, camera)
  controls.update()                          // 让 JS 改的属性（如阻尼）持续生效
  requestAnimationFrame(renderLoop)
})();
```

### `main.js`（入口，必须引入 init.js）

```js
// 入门
import './utils/init.js'
```

### 本集踩坑点（重点）

| 坑 | 说明 |
|---|---|
| 自调用函数间的分号 | `(function(){})();` 后面一个还是自调用函数时，前一个**末尾必须加分号**，否则两个函数会被连成一句报语法错误 |
| OrbitControls 没有 `THREE.` 前缀 | 它是 addons 里的模块，单独 `import { OrbitControls } from 'three/addons/...'`，new 时直接用 |
| `utils/init.js` 不自动执行 | Vite 只加载 `index.html` → `main.js` 这条链上的模块；想让哪个模块执行，必须从入口 import 进去 |
| 写完三要素页面还是黑的 | 三要素之间还没建立关系，必须有 `renderer.render(scene, camera)` 放进渲染循环里才有画面 |
| 相机位置 z = 0.1 | 沿用全景公园的做法——相机在场景中心，向后看是 -z，全景图贴在立方体内壁上围着相机 |

### 运行效果

`npm run dev` 打开页面：黑色背景 + 红(X)绿(Y)蓝(Z) 三色坐标轴，鼠标可拖拽旋转、滚轮缩放——证明三要素、轨道控制器、辅助对象全部就位。

---

## 03 three.js 适配和立方体

### 本集要点

1. 加窗口适配：浏览器放大缩小时场景跟着变（resize 三件套）。
2. 在 main.js 里创建第一个立方体，验证基础环境。
3. **跨模块取数据**：init.js 里的 `scene` 通过 `export` 导出，main.js 用命名导入 `import { scene }` 拿到。
4. **内聚式写法**：`createCube()` 把创建的立方体 `return` 出去，不再依赖全局变量接收——函数拿走即用，可移植性更好。
5. 相机在立方体内部时看不见立方体（在它肚子里），需要 `side: THREE.DoubleSide` 双面渲染。

### init.js 新增：适配函数（第 5 个函数）

```js
(function resizeRender() {
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight)   // 更新画布大小
    camera.aspect = window.innerWidth / window.innerHeight    // 更新宽高比
    camera.updateProjectionMatrix()                           // 更新视锥体投影矩阵
  })
})();
```

> 三步缺一不可：只 setSize 不改 aspect 画面会拉伸/压缩；改了 aspect 不 updateProjectionMatrix 则不生效。

### init.js 顶部改成导出（第 4 行）

```js
export let scene, camera, renderer, controls;
// ↑ 命名导出：别的模块想用本模块的变量，前面加 export 即可
```

### main.js 最终内容（本集结束）

```js
// 入门
import { scene } from './utils/init.js'   // 命名导入：大括号 + 同名变量
import * as THREE from 'three'

function createCube() {
  const geometry = new THREE.BoxGeometry(1, 1, 1)                    // 宽高深各 1
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide,      // 双面渲染：相机在立方体内部也能看见内壁
  })
  const cube = new THREE.Mesh(geometry, material)
  scene.add(cube)
  return cube                       // 内聚：把立方体 return 出去
}

const cubeObj = createCube()
```

### 命名导出 / 导入 速查

```js
// init.js（导出方）：一个一个导
export let scene, camera, renderer, controls;

// main.js（导入方）：大括号 + 同名
import { scene } from './utils/init.js'
```

### 本集踩坑点

| 现象 | 原因 | 解决 |
|---|---|---|
| 创建立方体后页面什么都没有 | 相机 z=0.1，立方体半径 0.5，**相机在立方体内部**，且默认只渲染外表面 | 材质加 `side: THREE.DoubleSide` 双面渲染 |
| 双面渲染后看到的是全屏色块 | 离内壁太近 | 滚轮把相机拉远即可 |

---

## 章末整合：完整代码

### 最终目录结构

```
vr-project/
├─ index.html
├─ main.js            ← JS 入口
├─ style.css
├─ package.json
└─ utils/
   └─ init.js         ← three.js 基础环境（5 个自调用函数）
```

### `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VR 全景革命展览馆</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <script type="module" src="/main.js"></script>
  </body>
</html>
```

### `style.css`

```css
body {
  margin: 0;
}
```

### `utils/init.js`（三要素 + 控制器 + 辅助 + 适配 + 渲染循环）

```js
// 目标：初始化 three.js 基础环境
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export let scene, camera, renderer, controls;

// ① 三要素：场景 / 相机 / 渲染器
(function init() {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = 0.1
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)
})();

// ② 轨道控制器
(function createControls() {
  controls = new OrbitControls(camera, renderer.domElement)
})();

// ③ 坐标轴辅助对象
(function createHelper() {
  const axesHelper = new THREE.AxesHelper(5)
  scene.add(axesHelper)
})();

// ④ 窗口适配
(function resizeRender() {
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  })
})();

// ⑤ 渲染循环
(function renderLoop() {
  renderer.render(scene, camera)
  controls.update()
  requestAnimationFrame(renderLoop)
})();
```

### `main.js`（入口 + 第一个立方体）

```js
// 入门
import { scene } from './utils/init.js'
import * as THREE from 'three'

function createCube() {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide,
  })
  const cube = new THREE.Mesh(geometry, material)
  scene.add(cube)
  return cube
}

const cubeObj = createCube()
```

### 启动命令

```bash
npm create vite@latest   # 创建项目（仅首次）
npm i                    # 安装依赖
npm i three dat.gui      # 安装 three 和 dat.gui
npm run dev              # 启动 → http://127.0.0.1:5173/
```

---

## 本章速查表

| 需求 | 代码 / 命令 |
|---|---|
| 创建 Vite 项目 | `npm create vite@latest` |
| 启动开发服务器 | `npm run dev` |
| 装 three + gui | `npm i three dat.gui` |
| 三要素 | `Scene` / `PerspectiveCamera(75, w/h, 0.1, 1000)` / `WebGLRenderer({antialias:true})` |
| 全景相机位置 | `camera.position.z = 0.1` |
| 抗锯齿 | `new THREE.WebGLRenderer({ antialias: true })` |
| 轨道控制器 | `new OrbitControls(camera, renderer.domElement)`（addons 引入，无 THREE. 前缀） |
| 坐标轴 | `new THREE.AxesHelper(5)` |
| 窗口适配三件套 | `setSize` + `aspect` + `updateProjectionMatrix()` |
| 渲染循环 | `requestAnimationFrame(renderLoop)` 里 `render` + `controls.update()` |
| 跨模块传 scene | `export let scene` + `import { scene } from './utils/init.js'` |
| 相机在物体内部看不见 | 材质 `side: THREE.DoubleSide` |
