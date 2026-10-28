# 案例-3D文字

> 对应课程：前端拉菲《Three.js零基础入门》P26「13--24.three.js 3D 渲染器」之后的文字渲染部分
> 手写复刻 demo，基于本项目的 three.js r148 本地文件包（无需联网）

## 效果

展台上方悬浮着金色的 **Hello Three.js** 真·3D 文字（可旋转、有厚度、金属反光），
左侧展板上是中文「三维可视化」（Canvas 纹理方案）。
右侧面板可实时改文字内容、字号、挤出厚度、倒角，几何体即时重建。

## 运行

用 VSCode 的 Live Server 打开 `案例源码/index.html`。

## 核心知识点

| 知识点 | 说明 |
| --- | --- |
| `FontLoader` | 加载 three.js 专属的 `typeface.json` 字体（官方转换工具从 TTF 转来，**只有英文字符集**） |
| `TextGeometry` | 参数：`size` 字号 / `height` 挤出厚度（r163 后改名 `depth`）/ `curveSegments` 曲线分段 / `bevel*` 倒角系列 |
| 文字 = 网格 | "Hello Three.js" 约 1.7 万个三角面，HUD 里实时显示；curveSegments 越大面数越多 |
| 居中 | 文字默认从原点向 +X 排开，用 `computeBoundingBox()` 后 `translate()` 平移到中心 |
| 重建 + dispose | GUI 改参数会重建几何体，旧的必须 `geometry.dispose()`，否则每次修改都泄漏一份顶点数据 |
| 中文方案 | JSON 字体不支持中文 → 把文字画到 Canvas 上做 `CanvasTexture`，贴在面片上（任意语言、任意字体） |
| Canvas 尺寸 | 先 `measureText` 量宽度再定画布大小；canvas 改尺寸后字体状态会被重置，要重新设置 |
| 金属不发黑 | 高 metalness 材质必须有环境反射：用 `RoomEnvironment` + `PMREMGenerator` 程序化生成 `scene.environment`，零素材 |
| 环境强度 | `envMapIntensity` 压不下来时，RoomEnvironment 的白墙会把深色物体"照成白色"（本次实测踩坑） |
| sRGB | r148 写法 `texture.encoding = THREE.sRGBEncoding` + `renderer.outputEncoding`（r152 后改名 `colorSpace`） |

## 文件说明

```
案例源码/
├── index.html   页面骨架 + HUD/字体错误提示样式
├── index.js     场景/environment/灯光/GUI（实时重建文字）/渲染循环
└── model.js     展台 + TextGeometry 3D文字 + Canvas纹理中文展板
```

## 踩坑记录

- **TextGeometry 是非索引几何体**：`geometry.index` 为 `null`，统计三角面数要用
  `geometry.attributes.position.count / 3`，用 `index.count` 会直接 TypeError
- 金属材质只加灯光是黑的，缺的是**环境贴图**（不缺灯，缺反射）
- 展台被照成白色：不是灯太亮，是 `RoomEnvironment` 环境反射没压（`envMapIntensity` 要调低）
