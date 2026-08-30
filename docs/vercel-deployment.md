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
   - **生产环境默认关闭 OCR**（`VERCEL=1` 或存在 `VERCEL_ENV` 时 `OCR_ENABLED` 默认为 `false`）。不配置 `OCR_ENABLED=true` 时，线上页面不展示上传入口，接口返回 503。
   - 如需线上启用：`OCR_ENABLED=true`，并配置 `API_KEY`、`API_URL`、`MODEL`、`MAX_TOKENS`、`OCR_TIMEOUT_SECONDS`、`USE_RESPONSE_FORMAT_JSON`。
   - **必须配置共享限流**：`UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`。也可使用 `OCR_RATE_LIMIT_REST_URL/TOKEN` 或 Vercel KV 的 `KV_REST_API_URL/TOKEN` 兼容变量；REST URL 必须是 HTTPS。
   - 可选保护参数：`OCR_MAX_IMAGE_BYTES`、`OCR_MAX_IMAGE_DIMENSION`、`OCR_MAX_IMAGE_PIXELS`、`OCR_MAX_REQUESTS_PER_MINUTE`、`OCR_DAILY_QUOTA`、`OCR_MAX_CONCURRENCY`、`OCR_MAX_TOTAL_CONCURRENCY`、`OCR_RATE_LIMIT_TIMEOUT_MS`（均有默认值）。
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
- `vercel.json` 为 `api/parse-screenshot.js` 设置 `maxDuration: 300`，兼容当前 Vercel 套餐限制。
- `vercel.json` 对全部响应发送同源 Content-Security-Policy（`script-src 'self'` 等，无 `unsafe-inline`），与 `index.html` 的 CSP meta 一致。
- `OCR_TIMEOUT_SECONDS` 本地默认是 1200；在 Vercel 环境中会自动限制为最多 285 秒，为函数返回错误和清理请求预留 15 秒。
- Vercel Functions 的请求体平台上限是 4.5 MB，超过的请求在函数代码运行前就被平台拒绝。服务端与本地开发服务器都把请求体上限设为 4.5 MB，客户端把 data URL 限制在 4 MB 以内（自适应压缩），保证正常请求不会被平台丢弃。

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
- **生产环境默认关闭 OCR**；只有显式设置 `OCR_ENABLED=true` 后接口才可用。
- 启用后，上传图片会经过 Vercel Serverless Function 转发到外部模型 API，注意 API 成本和隐私；页面会向用户展示这一说明。
- 客户端上传前会验证格式结构与像素上限，再把横向截图（宽高比 >1.2）裁剪为右侧属性面板区域（右侧 40%）并自适应压缩（JPEG，data URL 上限 4MB）。只支持 PNG/JPEG/WebP，单文件不超过 25MB、单条边长不超过 12000 像素、总像素不超过 2000 万。
- 服务端对图片做严格校验：规范 base64、PNG/JPEG/WebP 格式结构、像素尺寸，超限或格式不符的请求在调用上游模型前就被拒绝。
- 服务端按 IP 做滑动窗口限流、每日额度、每 IP 并发和全局并发（默认 10 次/分钟、100 次/天、每 IP 并发 2、全局并发 4），通过共享 Redis 的原子 Lua 脚本跨实例生效。超限返回 429；共享限流未配置或不可用时返回 503。两种情况都不会调用上游模型。
- 线上仍建议叠加 Vercel Firewall（IP 速率限制）或 Attack Challenge，对 `/api/parse-screenshot` 的未认证流量做平台层纵深防御。
- 生产错误响应只返回稳定错误码，不透传上游 `detail`。
