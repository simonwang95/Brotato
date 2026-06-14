# Vercel 部署清单

## 当前结构

- 前端是静态页面：`index.html`、`styles.css`、`src/*.js`、`data/*.json`、`data/assets/**/*.webp`。
- 图鉴和角色攻略是第一阶段部署核心，完全依赖仓库内静态数据即可运行。
- OCR 接口是可选的 Vercel Serverless Function：`api/parse-screenshot.js`。
- 本地开发服务是 `scripts/dev-server.mjs`，只用于读取 `env.local` 和本地调试。

## 必备准备

1. 提交所有运行时数据。
   - `data/official-catalog.json`
   - `data/official-localization.json`
   - `data/assets/**`
   - 不依赖 Steam 安装目录或 `.pck` 文件。
2. 在 Vercel Project Settings 里配置环境变量。
   - `API_KEY`
   - `API_URL`
   - `MODEL`
   - `MAX_TOKENS`
   - `OCR_TIMEOUT_SECONDS`
   - `USE_RESPONSE_FORMAT_JSON`
   - 环境变量修改后只会作用于新的部署，需要重新部署。
   - 第一阶段如果不启用截图 OCR，可以先不配置这些变量；图鉴和攻略生成器仍可正常使用。
3. 选择线上可访问的 OpenAI 兼容 API。
   - `http://127.0.0.1:1234/v1` 只适合本机 LM Studio，部署到 Vercel 后不可用。
   - 线上需要换成公网可访问的 API 地址，或用官方/云端兼容服务。
4. 确认模型支持图片输入。
   - OCR 功能会发送 `image_url` 格式的 data URL。
   - 如果模型不支持视觉输入，会返回 400 或空结果。
5. 保持 `USE_RESPONSE_FORMAT_JSON=false` 起步。
   - LM Studio 常见后端对 `response_format` 支持不稳定。
   - 只有确认服务支持 JSON mode 后再设为 `true`。

## Vercel 设置建议

- Framework Preset：Other。
- Root Directory：仓库根目录。
- Build Command：`npm run build`。
- Output Directory：`public`。
- Install Command：不需要依赖时可留空；如果 Vercel 要求安装，默认 `npm install` 也可以。
- Node.js Version：建议 20.x 或更高。
- `vercel.json` 已为 `api/parse-screenshot.js` 设置 `maxDuration: 1200`，用于给视觉 OCR 留出响应时间；`OCR_TIMEOUT_SECONDS` 默认也是 1200。

## 本地验证

```bash
npm run start
```

访问 `http://localhost:5174`，在角色场景模拟器里上传截图。

如果出现 `HTTP 400`：

- 先确认 LM Studio 当前模型支持图片输入。
- 确认 `API_URL` 末尾是 `/v1`，例如 `http://127.0.0.1:1234/v1`。
- 保持 `USE_RESPONSE_FORMAT_JSON=false`。
- 查看页面错误信息里的上游 `detail`，通常会说明不支持的字段或模型能力。

## 上线后的限制

- Vercel 无法访问你电脑上的 `127.0.0.1:1234`。
- 上传图片会经过 Vercel Serverless Function 转发到模型 API，注意 API 成本和隐私。
- 大图会增加请求体体积和函数耗时，必要时后续应在前端压缩截图。
