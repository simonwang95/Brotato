# 图鉴图片和部署数据约束

## 目标

图鉴后续需要显示角色、武器和物品配图，同时项目需要能在线上静态部署。

运行时不能依赖当前电脑的 Brotato 安装目录。安装目录只允许作为开发/迭代时的资料来源，用来生成项目内的静态数据和图片资源。

## 当前数据状态

`data/official-catalog.json` 已包含：

- `iconResourcePath`：官方资源包里的 icon 路径，例如 `res://items/all/cyberball/cyberball_icon.png`。
- `expectedImageAssetPath`：后续导出到项目内的目标路径，例如 `data/assets/items/item_cyberball.png`。
- `imageAssetPath`：运行时实际可用图片路径；当前先保留为 `null`，避免页面请求尚未导出的文件。

页面运行时只读取：

- `data/official-catalog.json`
- `data/official-localization.json`
- `src/*.js`
- `styles.css`
- 后续导出的 `data/assets/**/*.png`

## 后续图片管线

1. 从安装包读取 `iconResourcePath` 对应的纹理资源。
2. 将角色、武器、物品图标导出或转换成浏览器可直接显示的 PNG/WebP。
3. 写入项目本地目录：
   - `data/assets/characters/*.png`
   - `data/assets/weapons/*.png`
   - `data/assets/items/*.png`
4. 更新 catalog 中对应条目的 `imageAssetPath`。
5. 图鉴 UI 只在 `imageAssetPath` 非空时渲染 `<img>`，否则显示占位。

## 部署规则

- 线上部署只发布仓库内的静态文件。
- `BROTATO_INSTALL_DIR` 只供 `npm run extract:*` 在开发机上使用。
- 不在浏览器端读取本机文件路径、Steam 路径或 `.pck` 文件。
- 每次从安装包重新提取后，需要提交生成的 `data/*.json` 和已导出的 `data/assets/**`。

## 待办

- 实现 `extract:assets` 脚本。
- 确认 Godot `.stex` 到 PNG/WebP 的转换方式。
- 为图鉴卡片接入 `imageAssetPath` 渲染和占位样式。
