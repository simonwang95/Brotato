# Brotato Number Lab 修复与优化计划

审查日期：2026-08-30

本文档记录当前项目尚需修复或优化的事项。每项均包含问题、证据、建议方案和验收标准；只有验收标准全部满足后，才可将对应复选框标记为完成。

## 当前稳定基线

- `npm test`：14 个测试脚本全部通过。
- `npm run verify:catalog`：攻略资料 93/93 可映射到官方目录。
- `npm run verify:effects`：79 个武器、244 个物品的展示文本校验通过。
- `npm run verify:unlocks`：54 条静态解锁记录均已维护，0 warning、0 pending-text。
- `npm run localization:coverage`：武器 79/79、物品 244/244、角色 64/64。
- `npm run official-data:diff`：与 `HEAD` 相比无语义差异。
- `npm run build`：构建成功，`public/` 约 5.9 MB。
- 审查结束时 Git 工作区干净。

以上结果说明官方数据链和核心计算测试已有良好基线，但并不覆盖浏览器入口、本地服务器、生产 OCR 接口、安全边界和完整用户流程。

## 量化审查结果

| 区域 | 审查时实测 |
| --- | ---: |
| 默认 Ranger 攻略页 | 约 12,500 px 高、35 张推荐卡、258 条评分理由 |
| 武器图鉴 | 79 张卡、79 张阶级表、内部内容约 52,800 px 高 |
| 物品图鉴 | 244 张卡、约 12,297 个 DOM 元素、内部内容约 64,700 px 高 |
| 模拟器桌面端 | 约 68 个数字输入 |
| 模拟器移动端 | 约 74 个输入/选择控件、页面约 11,200 px 高 |
| 静态构建 | 约 5.9 MB，其中目录 JSON 约 1.5 MB、图片约 3.7 MB |
| 复杂效果边界 | 128 条：43 条已解码、71 条部分解码、14 条待运行时解码 |

这些数值用于衡量优化前后的变化，不应成为脱离真实体验的唯一目标。

## 修复项速查

| ID | 优先级 | 内容 | 推荐批次 |
| --- | --- | --- | --- |
| P0-1 | P0 | 本地服务器文件和网络暴露 | 第一批 |
| P0-2 | P0 | 生产 OCR 安全、成本和上传边界 | 第一批 |
| P1-1 | P1 | DOM 注入 | 第一批 |
| P1-2 | P1 | OCR 输入、输出和标签 Schema | 第二批 |
| P1-3 | P1 | 数字输入范围与错误反馈 | 第二批 |
| P1-4 | P1 | CI、发布门禁和入口测试 | 第一至三批 |
| P1-5 | P1 | 攻略页信息分层 | 第四批 |
| P1-6 | P1 | 图鉴分页/虚拟化 | 第四批 |
| P1-7 | P1 | 模拟器基础/高级模式 | 第四批 |
| P1-8 | P1 | 静态数据和缓存策略 | 第四批 |
| P1-9 | P1 | 推荐模型校准和置信度 | 第五批 |
| P2-1 | P2 | 路由、加载和错误语义 | 第二批 |
| P2-2 | P2 | 可访问性和动态反馈 | 第四批 |
| P2-3 | P2 | 状态保存、分享和撤销 | 第四批 |
| P2-4 | P2 | 数据抽取原子性 | 第三批 |
| P2-5 | P2 | 模块拆分与版本治理 | 第三批以后 |

## 优先级定义

- **P0**：可能泄露秘密、原始素材或产生明显外部成本，必须优先修复；修复前应限制使用范围。
- **P1**：会导致错误结果、安全注入、假绿验证、严重性能或主要体验问题，应在下一阶段处理。
- **P2**：可靠性、可访问性、可维护性和长期产品能力优化，可在 P0/P1 稳定后推进。

## P0：立即处理

### [x] P0-1 限制本地开发服务器的文件与网络暴露范围

问题：

- `scripts/dev-server.mjs` 以仓库根目录作为静态根目录，对任意存在路径直接读取文件。
- `server.listen(port)` 未指定 host，审查时实际监听 `*:5174`，但日志显示的是 `127.0.0.1`。
- 审查时只检查响应状态和大小，确认 `/env.local`、`/.git/config` 和原始素材路径可被请求；未读取或记录秘密内容。
- `startsWith(rootDir)` 不是可靠的路径边界检查，同前缀兄弟目录、符号链接和目录请求仍存在风险。
- `decodeURIComponent`、目录 `readFileSync` 等异常没有统一捕获，畸形路径或目录请求可能打崩开发服务器。
- `npm run start:static` 同样从仓库根目录启动 Python 静态服务器，并默认监听所有网卡。

主要证据：

- `scripts/dev-server.mjs:7-8,20-23,68-89,92-108`
- `package.json:22-23`

建议方案：

1. 显式绑定 `127.0.0.1`，日志输出真实监听地址。
2. 静态根目录改为构建后的 `public/`，或使用严格 allowlist，仅允许运行时需要的 `index.html`、CSS、浏览器 JS、公开 JSON 和图片。
3. 显式拒绝 dotfile、`env.local`、`.git/**`、`source/**`、`tests/**`、`scripts/**` 等非公开路径。
4. 使用 `path.relative`、`realpath` 和路径分隔符校验目录边界；只读取 `stat.isFile()` 的普通文件。
5. 对坏 URL、坏编码、目录、缺失文件和内部异常分别返回 400/403/404/500，不让单个请求终止进程。
6. 调整 `start:static`，只服务 `public/` 并绑定回环地址。

验收标准：

- 服务只监听 `127.0.0.1:<port>`。
- `/env.local`、`/.git/config`、`/source/*`、`/scripts/*` 均返回 403 或 404。
- 正常首页、JS、CSS、JSON 和 WebP 资源仍返回 200。
- 路径穿越、同前缀目录、畸形 URI 和目录请求均不会退出进程。
- 新增 HTTP 集成测试覆盖上述允许与拒绝路径。

完成说明（2026-08-30，分支 fix/security-batch-1）：

- `scripts/dev-server.mjs` 重写为严格 allowlist（`/index.html`、`/styles.css`、`/src/**`、`/data/**`），依次执行 dotfile 拒绝、allowlist、`path.relative` 逻辑边界、`realpath` 符号链接边界（含对真实路径的二次 allowlist 检查，符号链接不能指向仓库内非公开文件）、`stat.isFile()` 普通文件检查。
- 显式绑定 `127.0.0.1`，日志输出 `server.address()` 的真实地址；顶层请求处理包裹 try/catch，单个请求异常不再终止进程。
- 错误语义：坏 URL/坏编码 400，非 allowlist 403，缺失/目录 404，内部异常 500，非 GET/HEAD 405。
- `start:static` 改为 `python3 -m http.server 5174 --bind 127.0.0.1 --directory public`。
- 新增 `tests/devServer.test.mjs` HTTP 集成测试：正常资源 200、`/env.local`、`/.git/config`、`/source/*`、`/scripts/*`、`/tests/*`、`/api/*`、`/package.json` 等拒绝、编码穿越、同前缀目录、符号链接逃逸、畸形 URI、超大请求体、进程存活。
- 浏览器/移动端/键盘手工验收随 P1-4（第三批 CI 与入口烟测）统一执行。

临时措施：在该项完成前，不要把开发端口暴露到不可信局域网或公网；不需要服务时停止当前开发进程。

### [x] P0-2 关闭或保护未设防的生产 OCR 代理

问题：

- `api/parse-screenshot.js` 接受任意 POST 后直接使用服务端 API Key 调用视觉模型，没有认证、限流、配额或并发控制。
- 生产接口没有与本地服务等价的请求大小限制，也未严格验证图片协议、MIME、字节数和像素尺寸。
- 客户端会把整张原图编码为 Data URL；没有只裁剪右侧属性栏，也没有压缩。
- `imageDataUrl` 只检查为字符串，外部 URL 或非图片内容仍可能被传给上游模型。
- 快速重复点击可以并发发起最长 285 秒的请求，旧响应还可能覆盖新响应。
- 线上图片会经 Vercel 转发给外部模型，但页面仍主要使用“本地 LM Studio”文案，缺少明确的隐私和成本说明。

主要证据：

- `api/parse-screenshot.js:3-20`
- `src/ocrService.js:124-175`
- `src/app.js:1203-1209,1516-1575,1652-1654`
- `docs/vercel-deployment.md:62-66`

建议方案：

1. 增加显式 `OCR_ENABLED` 开关；未完成保护时，生产环境默认关闭 OCR 接口和入口。
2. 前端只裁剪属性栏并压缩；前后端同时限制允许的图片 MIME、编码、字节数和像素尺寸。
3. 服务端只接受 `data:image/png|jpeg|webp;base64,...`，拒绝外部 URL、SVG 和其他内容。
4. 增加按 IP/令牌的速率限制、每日额度、并发上限和请求超时。
5. 请求期间禁用按钮，提供取消能力，并使用请求序号或 `AbortController` 忽略过期响应。
6. 生产错误不透传完整上游 `detail`；返回 request id 和稳定错误码。
7. 上传前说明图片发送目标、裁剪范围、数据用途和保留策略。

验收标准：

- 未启用 OCR 时，生产接口明确返回 404/503，页面不展示可用上传入口。
- 非允许 MIME、外部 URL、超大图片和畸形 Base64 分别返回 400/413/415。
- 超额或并发请求返回 429，且不会调用上游模型。
- 双击上传只产生一个有效请求；取消或新请求后，旧响应不能覆盖当前状态。
- 页面清楚区分本地模式和线上代理模式，并展示隐私说明。
- API 合约测试覆盖成功、坏输入、限流、超时、上游非 JSON 和上游错误。

完成说明（2026-08-30，分支 fix/security-batch-1）：

- 新增 `OCR_ENABLED` 显式开关：本地默认开启，生产（`VERCEL=1` 或存在 `VERCEL_ENV`）默认关闭；关闭时接口返回 503 `OCR_DISABLED`，页面隐藏上传入口并说明原因。
- 服务端只接受 `data:image/png|jpeg|webp;base64,...`：外部 URL 400、非允许 MIME 415、非 base64 编码 400、坏 Base64 400、超过 `OCR_MAX_IMAGE_BYTES`（默认 4MB）413；请求体超过 4.5MB 直接 413。
- 按 IP 的滑动窗口限流（`OCR_MAX_REQUESTS_PER_MINUTE`，默认 10）、每日额度（`OCR_DAILY_QUOTA`，默认 100）、每 IP 并发（默认 2）与全局并发（默认 4），超限返回 429 且不调用上游模型；本地使用内存态，生产使用共享 Redis 原子限流。
- 客户端：上传前验证格式与像素上限，横向截图（宽高比 >1.2）取右侧 40% 并逐级压缩（maxDim 1600/1120/784/512，data URL 上限 4MB）；只提交角色 id（名称由服务端从内部表解析）；请求期间禁用按钮，`AbortController` + 单调请求序号忽略过期响应；清空按钮可取消在途请求。
- 生产错误不透传上游 `detail`，返回稳定错误码；本地保留 detail 便于调试。
- 页面区分本地模式与线上代理模式，并展示隐私说明（`#screenshot-privacy`）。
- 新增 `tests/apiContract.test.mjs`（成功、坏输入、限流、并发、额度、超时、上游非 JSON、上游错误语义）与 `tests/ocrService.test.mjs` 扩展用例。
- 浏览器/移动端/键盘手工验收随 P1-4（第三批 CI 与入口烟测）统一执行。

验收修复说明（2026-08-30，分支 fix/security-batch-1，验收反馈轮）：

- 接口同时支持 Vercel 自动解析出的对象型请求体（此前只处理字符串 body，Vercel 上正常上传会被当成空对象而返回 MISSING_IMAGE）；数组与 JSON 原始值 body 返回 400 `INVALID_JSON`。
- 客户端裁剪规则由“宽高比 >2.2”改为“宽高比 >1.2”：16:9、4:3、超宽屏横向截图都裁剪为右侧 40% 属性面板，与隐私说明一致；画布处理失败时横向图片直接拒绝（不发送未裁剪原图）；压缩改为自适应阶段（1600/0.85 → 1120/0.8 → 784/0.75 → 512/0.6），data URL 上限 4MB。
- 服务端图片校验收紧：严格 base64 填充、格式魔数（PNG/JPEG/WebP）、像素尺寸解析（PNG IHDR / JPEG SOF / WebP VP8L/VP8X/VP8），新增 `OCR_MAX_IMAGE_DIMENSION`（默认 12000）；`OCR_MAX_IMAGE_BYTES` 默认改为 4MB；新增错误码 `EMPTY_IMAGE` / `INVALID_IMAGE_DATA` / `IMAGE_DIMENSIONS_TOO_LARGE`。
- 限流新增全局并发上限 `OCR_MAX_TOTAL_CONCURRENCY`（默认 4），防止多 IP 聚合滥用。
- 尺寸口径对齐：请求体上限统一为 4.5MB（Vercel Functions 平台限制），客户端 data URL 上限 4MB。
- 生产共享限流补充修复：支持 Upstash Redis REST（以及兼容的 Vercel KV 变量），通过原子 Lua 脚本一次完成滑动窗口、每日额度、每 IP 并发和全局并发判断/占位；缺配置时状态接口返回 `enabled:false`，POST 返回 503 `OCR_SHARED_RATE_LIMIT_REQUIRED`；后端故障时 fail closed 为 503 `RATE_LIMIT_BACKEND_UNAVAILABLE`。
- 图片校验补充修复：data URL 头必须精确匹配 `;base64`；PNG 校验 chunk 边界、CRC、IDAT 与 IEND，JPEG 校验 scan 与 EOI，WebP 校验 RIFF 大小和 chunk 边界；新增 `OCR_MAX_IMAGE_PIXELS`（默认 2000 万）并在客户端解码前同步拦截，避免超大像素图造成资源耗尽。
- 请求体补充修复：`request.body` 的读取也纳入异常边界，平台 JSON getter 抛错时稳定返回 400 `INVALID_JSON`。
- 结论：生产 OCR 只有在显式启用且共享限流配置完整时才可用；平台级防护仍建议作为纵深防御。

## P1：高优先级修复

### [x] P1-1 消除用户输入和模型输出造成的 DOM 注入

问题：

- 用户可编辑武器名，结果区通过 `metric()` 将武器名直接拼接进 `innerHTML`。
- OCR 解析路径也可以写入武器名；如果接入不可信模型或兼容服务，会扩大注入边界。

主要证据：

- `src/app.js:180-190,358-364,1125-1127`
- `src/app.js:1341-1497`

建议方案：

1. 用户或模型可控文本一律通过 DOM `textContent` 写入，或在进入 HTML 模板前统一转义。
2. 将允许包含结构化标记的内部模板与纯文本参数分离，避免 `metric(label, value, hint)` 接受混合信任级别。
3. 为部署增加合理的 Content Security Policy，禁止内联脚本和未知源资源。
4. 增加武器名、OCR 文本和路由参数的注入回归测试。

验收标准：

- 输入 HTML 标签、事件属性或脚本片段时，页面只显示普通文本，不创建额外 DOM 节点，也不发起外部请求。
- OCR 返回同类内容时仍不可执行。
- 浏览器安全回归测试和 CSP 检查通过。

完成说明（2026-08-30，分支 fix/security-batch-1）：

- 新增 `src/renderUtils.js`：`escapeHtml`、`metric`、`metricDelta`、`renderList`、`renderPills` 全部按纯文本转义参数，样式类只来自固定集合；`src/app.js` 的 8 处 `innerHTML` 渲染点全部改为这些助手，移除调用点的手工预转义。
- `index.html` 增加同源 CSP meta（`script-src 'self'` 等，无 `unsafe-inline`）；`vercel.json` 与本地开发服务器对全部响应发送同一 CSP 头。
- 新增 `tests/renderSecurity.test.mjs`：覆盖 `metric`/`metricDelta`/`renderList`/`renderPills` 的注入回归与三处 CSP 声明检查。
- 浏览器/移动端/键盘手工验收随 P1-4（第三批 CI 与入口烟测）统一执行。

### [ ] P1-2 为 OCR 输入、模型输出和文本兜底建立严格 Schema

问题：

- 提示词要求模型只返回 `statsOcr`，但服务端会把任意 JSON 原样作为 `parsed` 返回。
- 前端解析器可以应用角色、武器、道具变化、场景参数和取整模式，超过了当前 OCR 产品边界。
- `selectedCharacter` 由客户端提交并直接进入提示词；直接调用 API 时可以注入任意长文本。
- 文本兜底采用子串匹配，较宽的“生命”“伤害”“速度”等别名可能把生命再生、近战伤害和攻击速度误写到其他字段。

主要证据：

- `src/ocrService.js:41-48,135-155,188-193`
- `src/app.js:1212-1290,1341-1497,1550-1553`
- `docs/recommendation-logic.md:157-168`

建议方案：

1. 服务端定义唯一 OCR 响应 Schema，只接受 `statsOcr[]` 中的已知 label 和有限数字。
2. 丢弃未知字段、重复字段、非有限数和越界数；当前阶段禁止 OCR 修改角色、武器、道具或场景。
3. 客户端只提交角色 id，服务端从内部表查名称，不接受任意角色文本。
4. 文本兜底改为规范化后的完整标签匹配，最长别名优先，并确保一行只消费一次。
5. 把 OCR label、模拟器 stat key、显示名和范围放入共用 registry。

验收标准：

- 含 `weapon`、`itemDelta`、`combatContext` 等额外字段的模型响应不会修改相应状态。
- `生命再生 7` 不会同时写入最大生命；`近战伤害 12` 不会写入总伤害；`攻击速度 30` 不会写入移速。
- 未知、重复、空值、`NaN`、`Infinity` 和越界数据会被拒绝或明确忽略。
- Schema 和标签映射有正向、负向、乱序及缺字段测试。

说明（2026-09-01）：按用户要求，OCR 相关暂不作为重点——本地可用 MTPLX 部署的 Qwen3.8 测试，线上保持关闭（`api/parse-screenshot.js` 默认禁用）。本项保留为待办，待 OCR 重新纳入优先级后再实施。

### [x] P1-3 统一数字输入范围与错误反馈

问题：

- 数字输入没有 `min`、`max`、整数或单位约束，也没有内联错误提示。
- 计算层会把负冷却夹到 0.05、暴击倍率夹到至少 1 等，造成页面显示值与实际计算值不一致。
- 部分场景参数组合可能产生无穷大、负倍率或无意义结果，界面又会把非有限数静默显示成 0。

主要证据：

- `src/app.js:163-174,229-337`
- `src/calculator.js:96-135`
- `src/scenarioCalculator.js:1036-1086`

建议方案：

1. 建立统一字段 Schema，定义默认值、单位、步长、最小值、最大值和是否必须为整数。
2. 输入不合法时停止对应计算，保留原输入并展示明确错误，而不是静默夹值。
3. OCR、手动输入、示例载入和未来导入配置全部复用同一验证器。
4. 对分母、倍率和概率增加显式有限性检查。

验收标准：

- 非法输入会被准确标记，结果区说明无法计算的字段。
- 页面显示值与传入计算器的值一致。
- 冷却、概率、次数、倍率、诅咒和结构物参数的边界测试通过。
- 最终结果不会出现未解释的 `NaN`、`Infinity` 或静默 0。

完成说明（2026-09-01，分支 fix/p1-remediation，提交 7e75b74）：

- 新增 `src/fieldSchema.js` 作为全部数字字段约束的唯一事实来源：`STAT_FIELD_SCHEMAS`、`WEAPON_FIELD_SCHEMAS`、`SCALING_FIELD_SCHEMAS`、`ITEM_DELTA_FIELD_SCHEMAS`、`COMBAT_CONTEXT_FIELD_SCHEMAS`，每个字段含 `label/unit/step/min/max/integer/default`；导出 `labelMap`、`toNumeric`、`validateNumberValue`。
- `src/app.js` 的 `createNumberField` 复用 `validateNumberValue`：设置 `min/max/step`，输入不合法时保留原文、内联 `.field-error`、记入 `state.invalidFields` 并用最近一次有效值渲染，结果区顶部显示 `.input-warning` 汇总；`formatNumber` 对 `NaN` 显示 “—”、对 `±Infinity` 显示 “∞”。
- `src/calculator.js` 与 `src/scenarioCalculator.js` 对分母/倍率/概率增加 `finiteOr` 显式有限性检查，不再把非有限数静默显示成 0。
- 新增 `tests/fieldSchema.test.mjs`（14 组：合法/空/非数字/越界/边界/整数/负值/倍率/诅咒-结构物/`toNumeric` 解析/键集一致性/默认值一致性/`labelMap`），并加入 `npm test`。
- 桌面与移动端（390×844）浏览器验收：合法输入即时更新 DPS；非法输入（如暴击率 150）保留原文、内联 “不能大于 100” + 顶部警告，DPS 保持最近有效值；修正后清除错误。

### [x] P1-4 建立 CI、发布门禁和入口级测试

问题：

- 仓库没有 CI workflow，本地通过的测试和校验不会自动保护主分支或部署。
- `src/app.js`、Vercel handler、开发服务器、构建脚本和大部分抽取器没有入口级覆盖。
- `tests/ocrService.test.mjs` 当前只覆盖 3 个超时配置断言。
- `npm run verify:names` 当前报告 167/168、`Bag / 袋子` 需手工检查，但默认退出 0；只有 `--strict` 才失败。
- 构建脚本只复制文件，没有校验数据 Schema、模块引用、图片引用和部署入口。

主要证据：

- `package.json:7-23`
- `tests/ocrService.test.mjs:1-22`
- `scripts/verify-official-names.mjs:92-107`
- `scripts/build-static.mjs:1-14`

建议方案：

1. 增加 CI，运行语法/格式检查、测试、portable verifier、干净构建和 `git diff --check`。
2. 在 CI 中验证全部 JSON Schema、模块/fetch 路径、569 条图片引用和构建产物非空。
3. 增加最小浏览器烟测：三个路由、数据加载、角色切换、图鉴搜索、模拟器计算和错误降级。
4. 增加开发服务器与 API 合约测试，覆盖 HTTP 状态和安全拒绝路径。
5. 将 `verify:names --strict` 设为正式门禁，或明确重命名/废弃这条弱校验；先查清 `Bag / 袋子` 的来源差异。
6. 发布后检查首页、JS、JSON、WebP 和可选 API 健康状态。

验收标准：

- 每次提交和部署前均自动运行统一检查，失败时阻止合并或部署。
- 干净检出环境可以重复构建出完整站点。
- `verify:names` 不再出现“有缺失但成功退出”的假绿语义。
- 浏览器、服务器、API、OCR 和安全关键路径至少各有一组自动测试。

完成说明（2026-09-01，分支 fix/p1-remediation）：

- **查清并修正 `Bag / 袋子` 来源差异**：本机 `Brotato.pck` 中不存在 “袋子”（0 次），官方中文名为 “背包”（`data/official-localization.json` 与 `.pck` 均确认，4 次）；`src/scenarioData.js` 中 `bag` 的 `cnName` 由误写的 “袋子” 修正为 “背包”。修正后 `verify:names` 报告 168/168、0 缺失。
- **`verify:names` 消除假绿**：默认即为严格门禁，存在缺失的官方中文名称时以退出码 2 阻止；新增 `--warn` 供排查时临时非阻断。该检查依赖本机游戏安装包，属本地发布前门禁，不在 CI 干净检出环境运行。
- **CI（`.github/workflows/ci.yml`）**：push/PR 到 main 时自动运行——语法检查（`node --check` 全部 52 个 src/scripts/tests 文件）、`git diff --check`、`npm test`（18 个 portable 单测）、6 个 portable 校验器（catalog/recommendations/effects/unlocks/localization/official-data:diff）、干净构建、构建产物校验、浏览器烟测；失败即阻止合并。依赖用 `package-lock.json` 锁定（新增 `playwright` devDependency），`npm ci` 可复现。
- **构建产物校验（`scripts/verify-build.mjs`）**：校验构建产物存在且非空、6 个 JSON 数据文件可解析且顶层结构完整、全部 569 条资产图片引用可解析（跳过 `res://` 源路径元数据）、构建后 `app.js` 的 fetch 路径与模块引用可解析、总体积不超预算（12 MiB）。
- **浏览器烟测（`tests/browserSmoke.test.mjs`，Playwright）**：优先自带 Chromium、回退系统 Chrome/Edge（本地未装浏览器时跳过、CI 中显式安装故为真实门禁）。覆盖三路由（`#guide`/`#compendium/characters`/`#simulator`）、官方数据加载、图鉴卡片渲染与搜索过滤（65→1）、角色切换（64 角色下拉）、模拟器计算（68 数字输入）、错误降级（无未捕获异常、404 仅限预期资源、控制台干净）。10 项全部通过。
- **发布后健康检查（`scripts/health-check.mjs`）**：`npm run health:check -- --base <url> [--api]` 体检首页/样式/入口脚本/核心 JS 模块/JSON 数据/抽样 WebP/可选 API，关键资源失败即非零退出，可作发布后门禁。
- 服务器（`devServer.test.mjs`）、API（`apiContract.test.mjs`）、OCR（`ocrService.test.mjs`，372 行含超时/开关/图片校验/角色解析/限流）、安全（`renderSecurity.test.mjs`）测试组均已存在；浏览器组为本批新增，五类关键路径各有一组自动测试。

复核修正（2026-09-02，F1/F2/F4/F6，分支 fix/p1-remediation）：

- **F1 负例测试自包含（消除对 gitignored `public/` 的依赖）**：原 `tests/healthCheckNegative.test.mjs` 依赖本地已构建的 `public/`（gitignored），干净 CI 检出直接 ENOENT。重写为完全自包含：在临时目录生成最小确定性构建产物（index.html + 固定哈希 CSS/JS + manifest + 4 个数据 JSON + 6 张采样图片），13 个用例（完整产物通过；缺失 JS/坏 manifest/缺 manifest/缺首页/首页 404+合法正文失败；API 503 契约通过、500/503 非 JSON/200 非 JSON/200 空对象/200 字段类型错误失败、200 合法状态对象通过），全部通过。
- **F2 首页非 200 计入失败（消除假绿）**：原实现把首页非 200（含 404+合法正文）静默跳过，首页损坏时仍报"通过"。现首页任何非 200 状态都计入失败（`indexChecked` 标志保证恰好计一次），且非 200 时跳过 CSS/入口脚本引用解析（避免对错误正文解析出假引用）。
- **F4 浏览器烟测进入武器页验证完整导入（消除静默跳过）**：原"带入模拟器"检查停留在角色页（无武器卡片）→ 恒走"跳过"分支，导入从未被验证。现导航到 `#compendium/weapons`，"带入模拟器"按钮改为强制断言（不存在即失败），读取 `data-import-weapon` nameKey，Node 侧按最低阶级查官方记录（与 `findCatalogWeaponRecord` 同源），点击后断言：跳转 `#simulator`、`#sim-weapon-source` 含"已带入官方武器参数"+武器名、13 个模拟器字段（9 核心 + 4 缩放）与官方记录一致（展示层 2 位小数）。
- **F6 API 200 契约校验（消除假绿）**：原实现把任何 200 响应当作契约合法。现 200 必须返回合法 JSON 状态对象（`enabled` 布尔 + `mode` 为 local|production），503 必须携带稳定错误码 `OCR_DISABLED`；404 仍按"未部署"跳过（可选 API 语义不变），其余状态计入失败。

### [x] P1-5 降低攻略页的信息密度

问题：

- 推荐理由最多保留 12 条并全部展开。
- 攻略默认展示手写推荐、额外 5 个官方武器和最多 24 个官方道具候选。
- 审查时默认 Ranger 页面约有 35 张推荐卡、258 条理由，桌面页面高度约 12,500 px；移动端更长。
- 单一“推荐评分”会让近似模型显得过度精确，用户很难区分核心路线与研究候选。

主要证据：

- `src/strategyGenerator.js:2248-2260,2395-2402`
- `src/app.js:397-407,930-977`

建议方案：

1. 首屏只展示核心路线和 Top 5～8 个关键候选。
2. 将候选分为“核心”“替代”“研究候选”，官方补充项放入“展开更多”。
3. 评分理由默认折叠，摘要只显示最重要的 2～3 条。
4. 显示证据等级：官方精确参数、静态近似、手写策略、待校验。
5. 分数展示改为相对排序或等级，避免暗示跨角色、跨场景可直接比较。

验收标准：

- 默认攻略首屏可在不展开详情时快速看到角色路线、主武器、关键道具和属性优先级。
- 完整解释仍可按需展开，且不丢失现有评分理由。
- 桌面和移动端均无横向溢出，键盘可以操作所有展开控件。
- 用户能够直接区分核心推荐与低置信度候选。

完成说明（2026-09-01，分支 fix/p1-remediation）：

- **首屏降密**：`strategyGenerator.js` 为每个候选附加 `rank`/`tier`/`evidenceLevel`/`grade`；`app.js` 的攻略页首屏只渲染“核心”候选，替代 / 研究候选放入原生 `<details>`“展开更多”。Ranger 默认页从约 35 张卡片、258 条理由、约 12,500 px 降为首屏 9 张核心卡片、页面约 3,800 px（降幅约 70%）。
- **评分理由折叠**：`renderRecommendationBreakdown` 改为只显示最重要的 3 条 + “展开全部 N 条理由”折叠控件，全部 258 条理由保留、不丢失。
- **证据等级**：每张卡片显示证据等级徽章（官方精确参数 / 静态近似 / 手写策略 / 待校验），手写候选为“手写策略”，官方候选按是否有可靠评分归为“静态近似”或“待校验”；攻略顶部新增图例说明。
- **相对排序代替原始分**：卡片显示“候选排序 #N”与相对等级（A/B/C，按当前候选池内分位），并标注“仅在当前角色候选池内可比”，避免暗示跨角色 / 跨场景可直接比较。
- **分类与可访问性**：候选按核心 / 替代 / 研究候选着色（边框 + 徽章）；所有展开控件用原生 `<details>`/`<summary>`，键盘可 Tab 聚焦并 Enter/Space 切换；桌面与移动端均无横向溢出。

### [x] P1-6 为图鉴增加分页或虚拟化，并移除嵌套长滚动

问题：

- 图鉴对全部搜索结果直接 `.map()` 生成完整 HTML。
- 物品页一次渲染 244 张卡；审查时约有 12,297 个 DOM 元素，内部内容高度约 64,700 px。
- 图鉴容器固定为 720 px 并使用内部滚动，形成页面滚动与区域滚动叠加。
- 隐藏页面仍会被初始化和渲染，增加无用 DOM 与计算。

主要证据：

- `src/app.js:722-788,1745-1756`
- `styles.css:828-839`

建议方案：

1. 使用分页、“加载更多”或虚拟列表，首批只渲染少量卡片。
2. 卡片默认只展示摘要，阶级表和完整效果按需展开。
3. 移除固定高度的嵌套滚动，优先使用页面自然滚动。
4. 根据当前路由按需渲染攻略、图鉴和模拟器，避免构建隐藏页面内容。
5. 增加 DLC、阶级、解锁状态、套装和属性筛选，减少用户依赖长列表浏览。

验收标准：

- 初始图鉴 DOM 数量不再随全部 244 个物品线性增长。
- 搜索、筛选和翻页后结果数、焦点与滚动位置行为清晰。
- 移动端不存在双重滚动陷阱。
- 低端设备上切换分类、搜索和展开卡片没有明显卡顿。

完成说明（2026-09-01，分支 fix/p1-remediation）：

- **分页 / 加载更多**：`app.js` 图鉴详情首批只渲染 24 张卡片，底部“加载更多”按钮每点一次增加 24 张；搜索、切换分类、改筛选都会重置回首批。物品页初始 DOM 从约 12,297 节点 / 244 张卡降到约 1,157 节点 / 24 张卡（降幅约 90%），不再随全部条目线性增长。
- **移除嵌套滚动**：删除 `.compendium-grid` 的 `max-height: 720px; overflow: auto`，改用页面自然滚动；移动端不再出现页面滚动 + 区域滚动叠加的双重滚动陷阱。
- **卡片摘要化**：`renderCatalogCompendiumCard` 默认只展示价格 / 阶级 / 记录 / 官方状态 / 套装 / 标签，详细属性（阶级表）与功能说明收进原生 `<details>`“展开详细属性与功能说明”，按需展开。
- **按需渲染**：新增 `renderActivePageContent()`，`render()` / `syncAppRoute()` 与官方数据加载回调只渲染当前激活页面（攻略 / 图鉴），不再构建隐藏页面内容。
- **筛选**：武器 / 物品图鉴新增来源（官方 / DLC）、阶级（T1–T5）、解锁状态（默认解锁 / 需解锁）筛选与“清除筛选”；`compendium.js` 为条目补充 `tiers` 字段以支持阶级筛选。

### [x] P1-7 简化模拟器并改善移动端反馈

问题：

- 当前桌面约有 68 个数字输入；移动端约有 74 个输入/选择控件，页面高度超过 11,000 px。
- 高级场景参数全部展开，结果位于所有输入之后；移动端修改顶部数值后很难立即看到结果。
- 模拟器只能手动录入单种武器，攻略、图鉴和模拟器之间缺少“带入参数”能力。

主要证据：

- `index.html:115-169`
- `src/app.js:196-355`
- `styles.css:1023-1077`

建议方案：

1. 提供“基础 / 高级”模式，高级场景参数默认折叠并按燃烧、诅咒、结构物等分组。
2. 增加官方武器、阶级和常用场景预设，可从攻略或图鉴一键带入模拟器。
3. 移动端增加吸底或置顶结果摘要；桌面结果栏可在合理范围内 sticky。
4. 提供“恢复默认”“清空当前组”和可见的输入来源说明。
5. 在不误导公式边界的前提下，后续再评估多武器组合和多候选道具比较。

验收标准：

- 新用户只使用基础模式也能完成一次有效比较。
- 高级参数不会阻塞核心流程，展开后仍保留当前值。
- 从攻略或图鉴进入模拟器时，可自动载入对应官方武器参数并显示来源。
- 移动端修改输入后无需滚动到页面底部即可看到关键结果变化。

完成说明（2026-09-01，分支 fix/p1-remediation）：

- **基础 / 高级模式**：模拟器顶部新增“基础模式 / 高级模式”切换 + 模式说明 + “恢复默认”。基础模式只保留核心输入（角色属性 15 + 核心武器 7 + 场景预设/特殊道具 2 + 道具变化 15 + 取整 1 ≈ 41 个控件）；高级模式额外显示高级武器参数（穿透/弹射/爆炸/缩放，折叠）与按“基础场景 / 燃烧 / 诅咒 / 结构物 / 移速规避”分组折叠的高级场景参数（22 项）。切换模式只改变可见性，不改变当前值（展开保留原值）。
- **移动端吸底结果摘要**：`#sim-sticky-summary` 在移动端固定吸底，实时显示“当前 / 购买后 / 场景变化%”，修改输入后无需滚动到底部即可看到关键结果；桌面端结果栏改为 sticky（`top: 16px`）滚动时始终可见。
- **从攻略/图鉴带入官方武器**：图鉴武器卡与攻略武器卡（有 `officialNameKey` 时）新增“带入模拟器”按钮，点击后按官方目录 `stats`（damage/cooldown/nb_projectiles/crit/piercing/bounce/scalingStats）映射到模拟器武器状态，自动切到高级模式并显示来源说明（`#sim-weapon-source`）。
- **恢复默认**：`#sim-restore-defaults` 一键重置角色属性/武器/道具变化/场景/战斗上下文/取整模式到默认值。

复核修正（2026-09-02，F5，分支 fix/p1-remediation）：

- **完整帧精度 + 展示层舍入分离**：原 `weaponRecordToSimulator` 对冷却做 2 位小数舍入（`r2(frames/60)`），2 帧武器 0.0333… 秒被舍入成 0.03 秒，DPS 虚增约 11.1%（4 帧武器 0.0667→0.07 约 5.0%）。现计算层保留完整帧精度（`framesToSeconds` 原值）：`src/weaponImport.js` 去掉冷却的 `r2`；`src/app.js` `createNumberField` 在展示层四舍五入到 2 位小数（`input.value = Number(Number(value).toFixed(2))`），state 保留完整精度。`src/strategyGenerator.js` 导出 `calculatorWeaponFromRecord` 供测试对比。`tests/weaponImport.test.mjs` 改为严格相等（SMG=4/60、Spear=45/60、Chain Gun=2/60 不再用 0.005 容差）、全目录 258 个武器记录"模拟器带入 vs 攻略模型"双路径冷却严格一致、双路径 DPS 严格相等，并加突变敏感性检查（2 帧武器舍入到 2 位小数必须造成 >5% DPS 偏差，实测 11.1%，证明旧 bug 可被捕获）。

### [x] P1-8 修正静态数据与图片缓存策略

问题：

- 三个静态 JSON 使用 `cache: "no-store"`，每次访问都会绕过正常浏览器缓存。
- 构建仅原样复制文件；运行时目录 JSON 约 1.5 MB，前端代码和其他 JSON 还会继续增加首载体积。
- 图片使用稳定 id 文件名覆盖更新，但 Vercel 对图片设置一年 `immutable`；官方图片更新后，旧客户端可能继续使用旧版本一年。

主要证据：

- `src/app.js:1759-1804`
- `scripts/build-static.mjs:1-14`
- `vercel.json:7-17`

建议方案：

1. 从完整审计数据生成精简的运行时目录，只保留页面需要的字段。
2. 为 JS、CSS、JSON 和图片生成内容哈希，或使用明确的数据版本 URL。
3. 移除 `no-store`；哈希资源使用长期 immutable，非哈希入口使用短缓存和 revalidate。
4. 构建时验证引用完整性，并输出按类型统计的体积预算。
5. 避免把浏览器不会使用的服务端模块复制到公开 `src/`。

验收标准：

- 更新同名逻辑或图片后，客户端能够获取新版本，不受旧 immutable 缓存阻塞。
- 重复访问时静态数据可以命中缓存；入口更新仍能及时生效。
- 构建报告包含 JS、CSS、JSON、图片和总大小，并在超预算时失败或告警。
- 首次加载和路由切换不重复构建相同的完整图鉴数据。

完成说明（2026-09-01，分支 fix/p1-remediation）：

- **移除 no-store**：`src/app.js` 三个数据 fetch 不再用 `cache:"no-store"`；新增 `loadManifest()` + `loadDataFile()`，优先读取构建生成的 `data/manifest.json`（逻辑名→内容哈希路径），本地 dev-server 无 manifest 时回退稳定文件名。
- **内容哈希 + 版本化**：`scripts/build-static.mjs` 重写——CSS/数据 JSON/图片按内容哈希（`<名>.<10位hex>.<ext>`）；浏览器 JS 放入 `/src/v<整体版本>/` 版本化目录（任一模块变化即整体换 URL，模块间相对 import 无需改写、无循环依赖）；index.html 自动改写 CSS/入口 JS/硬编码图片引用为哈希名。
- **manifest 机制**：构建生成 `data/manifest.json`（含 version + 逻辑名→哈希路径映射），数据 JSON 内图片引用同步替换为哈希路径；客户端经 manifest 取新数据，旧 immutable 缓存不阻塞更新。
- **缓存头（vercel.json）**：index.html `no-cache`（入口更新及时生效）；manifest `max-age=60, must-revalidate`；内容哈希资源（JS/CSS/JSON/图片）`max-age=31536000, immutable`。
- **排除服务端模块**：public 只复制 12 个浏览器可达 src 模块，`ocrService.js`（仅 api/dev-server 使用）不再泄漏到公开目录。
- **体积预算**：构建输出 JS/CSS/JSON/图片/总大小报告，超单项预算告警、超总硬上限（10 MiB）失败；`verify-build.mjs` 同步改为 manifest/版本目录感知（27 项检查）。当前产物约 4.8 MiB（JS 443 KB / JSON 1.8 MB / 图片 2.6 MB / CSS 24 KB）。

### [x] P1-9 扩展推荐模型校准与不确定性表达

问题：

- `data/official-effect-decoding.json` 当前有 128 条复杂效果记录，其中 14 条 `pending-runtime-decode`、71 条 `partial-static-decode`。
- 当前固定 Top-N 重点覆盖 Lucky、Knight、Ghost、Engineer、Druid、Beast Master、Wounded；其他角色虽有结构性检查，但缺少同等强度的排名质量基线。
- 现有回归主要证明输出没有意外变化，不能单独证明推荐本身足够合理。

主要证据：

- `data/official-effect-decoding.json`
- `tests/recommendationRegression.test.mjs:10-193,407-419`
- `docs/strategy-generator.md` 的“仍待校准”章节

建议方案：

1. 继续处理砖块破损、减速区域、粒子加速器减速和 Gangster 商店机制等 14 条待解码记录。
2. 为燃烧传播、额外投射物、结构物覆盖和宠物链路保留明确的不确定性，不把未知命中率或触发率伪造成精确 DPS。
3. 为全部 64 个官方角色建立最小专家基准：必须包含、必须排除、允许区间和关键模式差异。
4. 扩展普通/无尽、危险、DLC、默认池和偏好组合的正向、负向回归。
5. 对评分变化记录原因，区分官方数据变化、公式变化、权重变化和基线更新。

验收标准：

- 每条推荐都能显示数据来源和置信等级。
- 64 个角色至少都有核心武器/道具的正向与禁用项负向基准。
- 更新评分权重时，测试能明确列出受影响角色和排序原因。
- 待解码或部分解码项不会被展示为未经说明的精确收益。

完成说明（2026-09-02，分支 fix/p1-remediation）：

- **不确定性表达**：`src/app.js` 新增第 4 个数据加载器 `loadOfficialEffectDecoding()`（经 manifest 取内容哈希的 `official-effect-decoding.json`）；`strategyGenerator.js` 新增 `buildDecodeStatusMap()`（nameKey→最差解码状态）与 `DECODE_STATUS_LABELS`，`annotateCandidates` 为每个候选附加 `decodeStatus`，`evidenceLevelFor` 对待解码候选降级为"待校验"；卡片新增 `renderDecodeStatus()` 标注（待解码/部分解码时显示"收益为近似，非精确 DPS"）。待解码的 14 条（砖块破损、鱼叉枪/电击枪减速区、粒子加速器减速、Gangster 商店）与 71 条部分解码均不再展示为精确收益。
- **数据来源 + 置信等级**：每张候选卡片同时展示官方目录来源（`renderOfficialMeta`：原版/DLC、层数、价格、解锁、掉落）与证据等级徽章（官方精确/静态近似/手写策略/待校验），满足"每条推荐显示数据来源和置信等级"。
- **64 角色专家基准**：`tests/recommendationRegression.test.mjs` 新增全量基准——正向（手写核心候选必须出现在输出，768 项）+ 负向（官方目录 `bannedItems/bannedUpgrades/bannedItemGroups` 不得出现，264 项，覆盖 26 个有禁用项的角色），全部 64 角色 × 普通/无尽通过。
- **权重变化影响报告**：`scoreRecommendation` 返回结构化 `scoreBreakdown`（14 个评分分量），候选携带 `scoreBreakdown`（测试校验分量之和=总分）；新增 `reportWeightChange(overrides)` 重新计算排序并列出受影响角色、前后对比与关键评分分量（排序原因）。回归测试用 `statSynergy×2` 验证影响 57 个角色场景。

复核修正（2026-09-02，R4，分支 fix/p1-remediation）：

- **独立 fixture（消除循环论证）**：原 P1-9 正向基准把输出候选的 key 集合与同一输出比较，属循环论证（被剔除的候选从不检查）。现改为独立 fixture `tests/fixtures/recommendationBaseline.json`（128 个角色/模式，mustInclude 含排名 1642 项 + mustExclude 官方禁用项 264 项），fixture 与运行时输出解耦；大小写统一后再做禁用比较。删除任一核心候选、加入任一禁用项或排名越界都会让测试失败并指明角色 + 模式 + 候选（已做突变验证）。
- **权重报告覆盖全池**：`reportWeightChange` 原只重排已截断的武器 Top-N。现 `generateStrategyGuide` 暴露完整候选池（`allWeaponCandidates`/`allItemCandidates`，截断前），报告同时覆盖武器 + 道具（`statSynergy×2` 影响武器 67、道具 128 个场景）。

复核修正（2026-09-02，F3，分支 fix/p1-remediation）：

- **统一官方 nameKey 命名空间**：原禁用检查对手写 id（`coffee`）与官方 nameKey（`ITEM_COFFEE`）只做大小写归一后比较，两套命名空间互不匹配——手写候选（经 `summarizeOfficialRecords` 映射到 `ITEM_COFFEE`）与官方补充候选 `ITEM_COFFEE` 都不会命中 `mustExclude` 的 `ITEM_COFFEE`，Bull 的禁用咖啡检查形同虚设。现候选比较统一使用 `candidate.official.nameKey`（已验证全部 4450 个输出候选均携带 nameKey）；无法映射的候选显式 `assert.fail`（指明角色+模式+候选），绝不回退另一套 id 后继续断言。
- **fixture 重新生成 + 生成器入库**：新增 `scripts/generate-recommendation-baseline.mjs`（可复现），`tests/fixtures/recommendationBaseline.json` 的 mustInclude 1642 项 id 全部改为官方 nameKey（原 874 官方 + 768 手写），mustExclude 保留（本就是官方 nameKey/属性标记命名空间）。
- **禁用检查纯函数化 + 突变验证**：禁用检查抽为纯函数 `findBannedViolations(characterId, modeId, candidates, bannedIds)`（返回含角色/模式/候选/原因的违规列表，未映射候选以 `reason="unmapped"` 显式报告）。测试加入突变验证：向 Bull（normal20/endless）加入同一禁用项 `ITEM_COFFEE` 的手写候选（`coffee`，official 映射 `ITEM_COFFEE`）与官方补充候选（`official:ITEM_COFFEE`）均触发明确的角色+模式+候选错误；无法映射候选（`official` 无 nameKey）被显式报告。

## P2：中期优化

### [ ] P2-1 完善路由、数据加载和错误语义

问题：

- hash 查询参数直接调用 `decodeURIComponent`，畸形编码链接可能抛出 `URIError` 并阻断初始化。
- 三个数据 loader 只调用 `response.json()`，没有 Schema/version 校验。
- 图鉴只显式处理 catalog 加载失败；本地化或解锁数据失败时缺少清晰降级说明和重试入口。
- API 与本地服务会把坏 JSON、过大请求或上游异常混合映射为 500；生产还可能透传过多上游 detail。

主要证据：

- `src/app.js:656-667,722-740,1759-1804`
- `api/parse-screenshot.js:9-20`
- `scripts/dev-server.mjs:26-65`
- `src/ocrService.js:168-175`

建议方案：

1. 使用 `URLSearchParams` 并捕获无效编码，回退到安全默认路由。
2. 为 catalog、localization、unlocks 增加 `schemaVersion` 和运行时校验。
3. 各数据集独立显示加载、失败、降级和重试状态。
4. 统一 400/413/415/429/502/504 等错误语义，生产隐藏内部 detail。
5. 增加渲染错误边界，单个数据异常不应让整个应用失效。

验收标准：

- 畸形 hash、坏 JSON、字段缺失和单数据源失败均有可理解的降级页面。
- 用户可重试失败的数据加载。
- 客户端和服务端错误码一致，并有自动化测试。

### [ ] P2-2 完善可访问性和动态状态反馈

问题：

- 图鉴分类是链接，却使用 `aria-pressed`，语义不匹配。
- 搜索结果、计算结果和 OCR 状态没有 live region。
- 武器表格滚动区缺少区域名称；部分图片 alt 与紧邻标题重复。
- 长页面缺少快速跳转、折叠和清晰焦点管理。

主要证据：

- `src/app.js:416-443,536-641,1182-1200`
- `index.html:109-112`

建议方案：

1. 普通导航链接使用 `aria-current`，或实现完整 `tablist/tab` 模式。
2. 搜索数量、计算摘要和 OCR 状态使用合适的 `aria-live`/`role=status`，避免高频朗读。
3. 为可滚动表格添加区域名称和键盘可达性，装饰性重复图片使用空 alt。
4. 为折叠、分页和错误重试设计稳定焦点流。
5. 在 CI 中加入自动可访问性检查，并保留键盘手工验收。

验收标准：

- 键盘可以完成导航、搜索、展开、分页、模拟器输入和 OCR 操作。
- 屏幕阅读器能获知关键状态变化，但不会被每次输入重复轰炸。
- 自动可访问性检查无高严重度问题。

### [ ] P2-3 支持状态保存、分享和撤销

问题：

- 模拟器和筛选状态只存在内存对象中，刷新即丢失。
- 图鉴搜索没有稳定写入 URL。
- 全局“载入示例”“清空道具变化”在攻略和图鉴页也显示；载入示例会突然切换到模拟器。

主要证据：

- `src/app.js:91-123,644-647,1641-1741`
- `index.html:20-26`

建议方案：

1. 将模拟器动作移入模拟器页，避免跨页面副作用。
2. 使用带版本的本地存储保存草稿，并提供恢复默认和清除数据。
3. 将可分享的非敏感状态编码进 URL，或提供导入/导出 JSON。
4. 对导入数据复用统一 Schema；未来版本升级提供迁移或明确拒绝。

验收标准：

- 刷新后可恢复最近草稿，用户也能明确清除。
- 分享链接能恢复角色、模式、筛选或模拟器核心参数。
- 坏配置不会污染状态，且可以一键恢复默认。

### [ ] P2-4 强化数据抽取的原子性和失败语义

问题：

- 部分抽取器在 DLC 包缺失时仍可能生成部分结果。
- 图片抽取出现 `missing > 0` 时仍可能成功退出。
- 直接覆盖生成文件时，如果中途失败，可能留下目录、图片和解码清单不同步的状态。

主要证据：

- `scripts/extract-official-catalog.mjs:402-441`
- `scripts/extract-official-assets.mjs:94-131`
- `package.json:9-17`

建议方案：

1. 明确期望的 base/DLC 输入包集合；缺失时默认失败，除非显式选择部分抽取模式。
2. 所有生成结果先写入临时目录，完成 Schema、数量、图片和交叉引用校验后再原子替换。
3. 任何缺失图片、未知关键记录或跨文件不一致都返回非零；可审计例外写入显式 allowlist。
4. 抽取后自动运行官方数据 diff，并生成可读变更摘要。

验收标准：

- 故意缺少输入包、图片或关键翻译时，正式抽取命令失败且不改动现有稳定数据。
- 完整抽取可以一次性生成互相一致的目录、本地化、解锁、图片和复杂效果清单。
- 失败路径与原子替换有 fixture 测试。

### [ ] P2-5 拆分单体模块并统一版本治理

问题：

- `src/strategyData.js` 约 4,169 行，`src/strategyGenerator.js` 约 2,490 行，`src/app.js` 约 1,811 行，`src/compendium.js` 约 1,221 行，修改影响面较大。
- `parseJsonFromText`、标签映射和部分数据契约分散或重复。
- `package.json` 版本为 `0.1.0`，页面显示 `v0.4`，静态资源 query 还使用旧日期。
- 未固定 Node/npm 版本；当前零第三方依赖是优势，但未来加入依赖时缺少 lockfile 和可复现安装入口。

主要证据：

- `src/strategyData.js`
- `src/strategyGenerator.js`
- `src/app.js`
- `src/compendium.js`
- `package.json:1-24`
- `index.html:7-13`

建议方案：

1. 按 domain data、schema/registry、scoring rules、render、route/state、OCR adapter 拆分模块。
2. 将稳定策略数据逐步迁移到可校验 JSON 或小型领域模块，生成数据与 UI 复用同一 Schema。
3. 建立单一版本来源，由构建注入页面版本和资源版本。
4. 固定受支持的 Node LTS、npm/package manager，并在 CI 矩阵验证。
5. 首次加入第三方依赖时提交 lockfile，使用可复现安装命令。

验收标准：

- 评分规则、渲染、OCR 和数据抽取可以分别测试，不依赖加载整个应用。
- 重复 parser/registry 被合并，关键 Schema 只有一个来源。
- package、页面、构建产物和发布标签使用同一版本。

## 推荐实施顺序

### 第一批：安全热修

状态：已完成（2026-08-30，分支 fix/security-batch-1，含验收反馈修复轮）。自动化测试（`tests/devServer.test.mjs`、`tests/apiContract.test.mjs`、`tests/renderSecurity.test.mjs`、`tests/ocrService.test.mjs`）全部通过；浏览器/移动端/键盘端到端烟测按完成定义随 P1-4（第三批）统一执行。验收结论：P0-1、P1-1 通过；P0-2 在生产保持 `OCR_ENABLED=false` 时安全，线上启用 OCR 需先叠加平台级防护。

1. P0-1 本地服务器静态根、路径边界和监听地址。
2. P1-1 DOM 注入修复。
3. P0-2 生产 OCR 默认关闭或最小保护。
4. 为上述路径补服务器/API/浏览器回归测试。

### 第二批：输入与 OCR 可信边界

1. P1-2 OCR Schema 和精确标签映射。
2. P1-3 统一输入 Schema 与错误反馈。
3. P2-1 错误状态和数据加载降级。

### 第三批：自动化门禁

1. P1-4 CI、严格 verifier、干净构建和入口烟测。
2. P2-4 抽取原子性与失败语义。
3. 统一受支持的运行时和版本来源。

### 第四批：产品体验与性能

1. P1-5 攻略信息分层。
2. P1-6 图鉴分页/虚拟化。
3. P1-7 模拟器基础/高级模式。
4. P1-8 构建、数据和缓存优化。
5. P2-2 可访问性和 P2-3 状态保存/分享。

### 第五批：推荐质量

1. P1-9 剩余复杂效果解码。
2. 全角色专家基准与模式/筛选回归。
3. 推荐证据等级和不确定性展示。

## 每批通用验证

```bash
npm test
npm run verify:catalog
npm run verify:recommendations
npm run verify:effects
npm run verify:unlocks
npm run localization:coverage
npm run official-data:diff
npm run build
git diff --check
```

涉及本地服务器、OCR 或浏览器的批次，还必须运行新增的 HTTP、API 和端到端测试。涉及官方数据抽取时，应在临时目录或干净检出中验证失败原子性，避免覆盖稳定基线。

## 完成定义

一个修复项只有同时满足以下条件才算完成：

- 问题根因已修复，而非只隐藏入口或吞掉错误。
- 有自动化测试覆盖正常路径和至少一个关键失败路径。
- 桌面与移动端行为已验证；涉及交互时完成键盘检查。
- 文档、错误文案和部署说明与实际行为一致。
- `git diff --check`、相关测试、全部校验和构建通过。
- 没有把未解码、未验证或近似结果伪装成官方精确值。
