# 案例-清漆度

> MeshPhysicalMaterial 的 clearcoat：车漆 / 钢琴烤漆效果

## 效果
左右两个红球对比：**左边 clearcoat=0**（普通哑光红漆），**右边 clearcoat=1**（亮面车漆，
有清漆层特有的锐利高光点）；前方一个车盖曲面看"长条高光"。

## 知识点
- `clearcoat`：清漆层强度 0~1，**只在 MeshPhysicalMaterial 上有**（Standard 没有）。
- `clearcoatRoughness`：清漆层自己的粗糙度，越小越像镜面亮油。
- 物理含义：在底漆上面再叠一层**透明涂层**，这层涂层独立反光——
  所以底漆可以是哑光的，表面照样锃亮。
- **坑**：clearcoat 是准镜面，环境太亮会把底色整个盖成粉白；
  需要压低 `envMapIntensity`（本 demo 设 0.45）并收敛灯光，深红底色才透得出来。

## 运行
Live Server 打开 `案例源码/index.html`。带 AxesHelper 坐标辅助。
颜色/亮度不喜欢可在 GUI 里调（清漆度、清漆粗糙度、底漆粗糙度、光源方位角）。
