# 图鉴图片和部署数据约束

## 目标

图鉴后续需要显示角色、武器和物品配图，同时项目需要能在线上静态部署。

运行时不能依赖当前电脑的 Brotato 安装目录。安装目录只允许作为开发/迭代时的资料来源，用来生成项目内的静态数据和图片资源。

## 当前数据状态

`data/official-catalog.json` 已包含：

- `iconResourcePath`：官方资源包里的 icon 路径，例如 `res://items/all/cyberball/cyberball_icon.png`。
- `expectedImageAssetPath`：导出到项目内的目标路径，例如 `data/assets/items/item_cyberball.webp`。
- `imageAssetPath`：运行时实际可用图片路径。已提取成功的条目会写入项目本地 WebP 路径，页面不会读取安装目录。

页面运行时只读取：

- `data/official-catalog.json`
- `data/official-localization.json`
- `src/*.js`
- `styles.css`
- 已导出的 `data/assets/**/*.webp`

## 图片管线

1. 从安装包读取 `iconResourcePath` 对应的 `.png.import` 元数据。
2. 解析元数据指向的 Godot `.stex` 文件，并抽取其中浏览器可直接显示的 WebP 数据。
3. 写入项目本地目录：
   - `data/assets/characters/*.webp`
   - `data/assets/weapons/*.webp`
   - `data/assets/items/*.webp`
4. 更新 catalog 中对应条目的 `imageAssetPath`。
5. 图鉴 UI 只在 `imageAssetPath` 非空时渲染 `<img>`，否则显示占位。

重新生成顺序：

```bash
npm run extract:catalog
npm run extract:assets
```

## 部署规则

- 线上部署只发布仓库内的静态文件。
- `BROTATO_INSTALL_DIR` 只供 `npm run extract:*` 在开发机上使用。
- 不在浏览器端读取本机文件路径、Steam 路径或 `.pck` 文件。
- 每次从安装包重新提取后，需要提交生成的 `data/*.json` 和已导出的 `data/assets/**`。

## 待办

- 为图鉴图片补充更细的尺寸规范，避免后续接入高清图时破坏卡片布局。
- 如果未来官方资源出现非 WebP `.stex`，为 `extract:assets` 增加对应格式分支。
- 后续线上部署时确认静态托管会正确设置 `.webp` MIME type。
