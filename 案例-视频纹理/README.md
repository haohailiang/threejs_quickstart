# 案例-视频纹理

> 对应课程：前端拉菲《Three.js零基础入门》P25「12--23.three.js 视频纹理」
> 手写复刻 demo，基于本项目的 three.js r148 本地文件包（无需联网）

## 效果

一台"电视机"在播 Sintel 开源动画短片：屏幕是视频画面，旁边的球体、立方体、圆环
贴的是**同一张**视频纹理（直观展示"纹理只是一张图，贴哪儿都行"）。
右侧面板可控制播放/暂停、静音、循环、倍速。

## 运行

用 VSCode 的 Live Server 打开 `案例源码/index.html`。
可加 URL 参数 `?t=秒` 从指定时间开始播（调试用，如 `index.html?t=30`）。

## 核心知识点

| 知识点 | 说明 |
| --- | --- |
| `THREE.VideoTexture` | 把 `<video>` 元素当前帧当贴图，视频在播，贴图就在变 |
| 自动更新 | VideoTexture 内部每帧自动 `needsUpdate`，**不用手动更新**（Canvas 纹理才需要） |
| 自动播放策略 | `muted` + `playsinline` 才能自动播放；被拦时给用户一个可点击的遮罩，点击后 `video.play()` 一定放行 |
| `crossorigin` | 贴别的域名的视频必须带跨域响应头，否则纹理被"污染"，无法上传 GPU（报黑/报错） |
| 宽高比自适应 | 视频真实比例要等 `loadedmetadata` 后读 `videoWidth/videoHeight`，写死 16:9 会拉变形 |
| 跳过黑屏首帧 | 视频开头常是黑帧，贴上去像"代码写错了"；官方案例的做法是 `play` 时 `currentTime = 3` |
| 材质选择 | 屏幕用 `MeshBasicMaterial`（自发光，不受场景灯光影响），机身/地面用 `MeshStandardMaterial` |
| mipmap | 视频每帧都在变，生成 mipmap 纯浪费，`minFilter/magFilter` 用 `LinearFilter` 即可 |
| sRGB | r148 写法 `texture.encoding = THREE.sRGBEncoding` + `renderer.outputEncoding`（r152 后改名 `colorSpace`） |
| 屏幕补光 | 放一盏 `PointLight` 在屏幕前模拟"电视照亮房间"，强度随播放时间微微起伏 |

## 文件说明

```
案例源码/
├── index.html   页面骨架 + 隐藏的 <video> 标签 + HUD/播放遮罩样式
├── index.js     场景/相机/播放控制（GUI）/自动播放兜底/HUD
└── model.js     VideoTexture + 电视机模型 + 屏幕比例自适应 + 陪衬物体
```

视频用的是项目内 three.js 自带的 `examples/textures/sintel.mp4`（Blender 开源电影，
免版权），没有额外下载素材。

## 与原课程 demo 的差异

- 原课程是"平面贴视频"的最小示例，这里加了完整的电视机体、环绕观察、播放控制面板
- 额外演示了同一张视频纹理贴到球体/立方体/圆环上的效果
- 处理了真实浏览器一定会遇到的两个坑：自动播放拦截、首帧黑屏

## 踩坑记录

- headless 截图验证时，`--virtual-time-budget` 会快进页面时间但**不影响视频媒体时钟**，
  进度永远停在 0:00，屏幕全黑像是代码错了——真实浏览器里没有这个问题；
  验证需用 CDP（Chrome DevTools Protocol）真实等待若干秒再截图
