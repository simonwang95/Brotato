# P1 修复审查报告

- 审查日期：2026-09-02
- 审查分支：`fix/p1-remediation`
- 审查提交：`18380c6`
- 对比基线：`main`（`31ee7f2`）
- 依据文档：`docs/remediation-plan.md`
- 审查方式：分支差异审阅、实现追踪、自动化门禁、浏览器烟测、本地 HTTP 验证

## 结论

当前分支暂不建议合并到 `main`。

本次审查发现 5 个 P1 问题和 1 个 P2 问题。其中，官方武器参数带入、数字输入范围、发布后健康检查、推荐专家基准和浏览器门禁仍未满足对应 P1 验收目标。P1-8 的主要缓存正确性已经建立，但版本化 JavaScript 尚未获得计划中声明的长期 immutable 缓存。

P1-2 按项目当前决定继续保留为待办：线上 OCR 保持关闭，本地可使用 MTPLX 的 Qwen3.8；本次不因 P1-2 未完成而阻止该分支，但也不将其标记为已完成。

## 审查范围概览

| 项目 | 审查结论 | 说明 |
| --- | --- | --- |
| P1-2 OCR Schema | 保留待办 | 线上保持关闭；本地状态端点可用，不纳入本批完成范围 |
| P1-3 数字输入范围与错误反馈 | 未通过 | 多项游戏内合法负属性被统一 Schema 拒绝 |
| P1-4 CI、发布门禁和入口测试 | 未通过 | 浏览器测试存在 fail-open；发布后健康检查与哈希构建不兼容 |
| P1-5 攻略页信息分层 | 未发现阻断问题 | 核心/替代/研究候选和理由折叠已落地 |
| P1-6 图鉴分页/虚拟化 | 未发现阻断问题 | 首批 24 项、加载更多和自然滚动已落地 |
| P1-7 模拟器基础/高级模式 | 未通过 | 官方武器冷却单位转换错误，带入后 DPS 失真 |
| P1-8 静态数据和缓存策略 | 部分通过 | 哈希构建与 manifest 可用；JS 缓存头未匹配版本化路径 |
| P1-9 推荐模型校准和置信度 | 未通过 | “64 角色专家正向基准”是自证断言，不能防止候选丢失 |

## 阻断问题

### R1（P1）：官方武器冷却单位转换错误

位置：`src/app.js:481`

当前实现：

```js
weapon.cooldown = r2((s.cooldown ?? 10) / 10);
```

官方目录中的 `stats.cooldown` 单位为帧。仓库内已有两处一致证据：

- `src/strategyGenerator.js:1192` 使用 `stats.cooldown / 60`。
- `src/compendium.js:309-316` 将冷却显示为 `frames / 60` 秒。

因此，从攻略或图鉴“带入模拟器”时使用 `/10` 会把攻击间隔扩大为正确值的 6 倍，进而显著压低 DPS。例如：

- SMG 的 4 帧被转换为 `0.4s`，按仓库现有口径应约为 `0.067s`。
- Spear 的 45 帧被转换为 `4.5s`，按仓库现有口径应为 `0.75s`。

建议：

1. 统一复用已有官方武器转换逻辑，避免在 `app.js` 再维护一份单位转换。
2. 增加浏览器或单元回归测试，至少覆盖 SMG、Spear 和一个仅高阶存在的武器。
3. 同时处理 2 帧武器与当前 `cooldown.min = 0.05` 的边界，避免导入值低于 Schema 下限后被计算器静默夹取。

验收条件：图鉴显示的官方冷却、带入输入框的冷却和计算器实际使用的冷却三者一致。

### R2（P1）：统一 Schema 拒绝游戏内合法负属性

位置：`src/fieldSchema.js:15-28`

当前 Schema 将生命再生、生命窃取、闪避、暴击率、四类伤害属性、移速、收获和幸运等字段的最小值设为 0。

官方目录中存在大量合法负值，例如：

- Druid、Sick、Vampire：`stat_hp_regeneration = -100`。
- Chunky、Cryptid、Druid：`stat_lifesteal = -100`。
- Crazy：`stat_dodge = -30`。
- Diver：`stat_ranged_damage = -100`。
- Pacifist：`stat_engineering = -100`。
- Hiker、Ogre、Old：负移速。
- Loud：负收获。
- Gladiator：负幸运。

影响：

- 手动录入合法面板值时会被标记为非法。
- `applyParsedSimulatorData()` 复用同一验证器，本地 OCR 返回这些负值时会被直接忽略。
- 对应角色无法准确进入模拟器，结果会继续使用最近一次有效值。

建议：面板 Schema 应允许游戏内可能出现的负属性；概率、倍率和生存模型的有效范围继续由计算层明确处理。新增来自官方角色/道具记录的负值测试，避免再次把“显示属性范围”和“最终生效范围”混为一体。

验收条件：上述官方负属性可被手动输入和导入，且计算器对最终概率或倍率仍执行清晰、可测试的语义限制。

### R3（P1）：发布后健康检查无法检查当前构建产物

位置：`scripts/health-check.mjs:89-115`

P1-8 已将静态资源改为：

- `styles.<hash>.css`
- `src/v<hash>/app.js` 及同目录模块
- `data/<name>.<hash>.json`
- 带内容哈希的图片路径

但健康检查仍请求旧路径：`/styles.css`、`/src/app.js`、稳定名 JSON 和稳定名图片。

实测步骤：

```bash
npm run build
npm run start:static
npm run health:check -- --base http://127.0.0.1:5174
```

结果：20 项检查中 19 项失败，除 `/index.html` 外均返回 404。

此外，`--api` 模式把所有 `>=500` 状态视为失败，而生产 OCR 正常关闭时按既有合约返回 503 `OCR_DISABLED`；这与“线上默认关闭、可选检查受控 JSON”的说明冲突。

建议：

1. 从 `index.html` 解析实际 CSS 和入口脚本路径。
2. 读取 `/data/manifest.json` 定位运行时 JSON。
3. 从目录 JSON 中抽样实际哈希图片路径。
4. API 检查区分“受控关闭”和真实服务故障，允许符合合约的 503 响应。

验收条件：当前 `public/` 构建的本地健康检查全部通过；模拟缺失哈希资源、坏 manifest 或非 JSON API 响应时稳定失败。

### R4（P1）：64 角色“专家正向基准”是自证断言

位置：`tests/recommendationRegression.test.mjs:439-445`

当前测试先把生成器输出保存为 `all`，再建立 `keys`，随后遍历 `all.filter(c => !c.officialCandidate)` 并断言这些候选存在于同一个 `all` 生成的 `keys` 中。

这意味着：如果某个预期手写核心候选被生成器错误丢弃，它不会进入循环，测试仍然通过。因此日志中的“正向 768 项”只是对当前输出数量的计数，不能证明 64 个角色的专家基准得到保留。

建议：

1. 建立独立于生成器输出的 fixture，按角色和模式维护 `mustInclude`、`mustExclude` 和允许排名区间。
2. 对 Bull 等不能使用普通武器的角色记录显式例外，而不是通过输出结果隐式消失。
3. 统一手写候选 id 与官方 `nameKey` 后再检查禁用项，避免大小写或 id 体系不同造成漏检。
4. 权重变化报告还应覆盖物品和完整候选池；当前实现只重排已经截断的武器列表，可能漏掉应进入 Top-N 的候选。

验收条件：人为删除任一 fixture 中的核心候选、加入任一禁用候选或让候选越出允许区间时，测试必须失败并指出角色、模式和候选。

### R5（P1）：浏览器烟测对关键路径 fail-open

位置：

- `tests/browserSmoke.test.mjs:94-101`
- `tests/browserSmoke.test.mjs:160-176`
- `tests/browserSmoke.test.mjs:183-193`

当前行为：

- 浏览器无法启动时以退出码 0 跳过，即使运行在 CI。
- 搜索框不存在时仍调用 `ok()` 记录为通过。
- 角色选择器不存在时同样记录为通过。
- 搜索只断言 `after <= before`，即使搜索完全没有过滤也可能通过。

因此，即使关键入口被删除、浏览器依赖损坏或交互失效，CI 仍可能保持绿色，与 P1-4 的“失败时阻止合并”目标冲突。

建议：

1. CI 环境中浏览器启动失败必须返回非零；本地是否允许跳过可由显式参数控制。
2. 计划要求的控件必须存在，不能把缺失记录为通过。
3. 搜索应断言命中具体结果，并验证结果数严格减少。
4. 角色切换应断言页面内容或选中角色发生变化。
5. 增加“带入模拟器”、非法输入、加载更多以及移动端吸底摘要的关键流程覆盖。

验收条件：删除搜索框、角色下拉或破坏对应事件处理器后，浏览器门禁必须失败。

## 非阻断问题

### R6（P2）：immutable 缓存规则匹配不到版本化 JavaScript

位置：`vercel.json:26-33`

当前长期缓存规则要求文件名符合：

```text
<name>.<10位哈希>.js
```

但构建生成的 JavaScript 路径是：

```text
/src/v<10位哈希>/app.js
```

哈希位于目录名而非文件名，因此现有规则不会为版本化 JavaScript 设置一年 immutable 缓存。版本目录已经避免旧 JS 阻塞新版本，所以这主要影响重复访问的缓存效率，而非当前缓存正确性。

建议：为 `/src/v<hash>/*.js` 增加专门规则，或将 JavaScript 文件本身改为内容哈希名。

## 已执行验证

| 验证 | 结果 |
| --- | --- |
| `npm test` | 通过；首次沙箱内 HTTP 绑定被拒，允许绑定回环地址后完整通过 |
| `npm run verify:catalog` | 通过，93/93 |
| `npm run verify:recommendations` | 通过，但 R4 说明其中新增专家基准存在假绿 |
| `npm run verify:effects` | 通过，79 武器、244 物品 |
| `npm run verify:unlocks` | 通过，0 未维护项 |
| `npm run localization:coverage` | 通过，武器/物品/角色全覆盖 |
| `npm run official-data:diff` | 通过，无语义差异 |
| `npm run verify:names` | 通过，168/168 |
| `npm run build` | 通过，约 4.8 MiB |
| `npm run verify:build` | 通过，28 项、0 失败 |
| `npm run test:browser` | 当前代码通过 10 项，但存在 R5 的 fail-open 风险 |
| `git diff --check main...HEAD` | 通过 |
| `npm run health:check -- --base http://127.0.0.1:5174` | 失败，20 项中 19 项失败 |

审查结束时 Git 工作区保持干净。

## OCR 状态说明

- 生产 OCR 默认关闭的 API 合约测试通过。
- 本地开发服务只绑定 `127.0.0.1`。
- 本地 `/api/parse-screenshot` 状态端点返回 `enabled: true`、`mode: local`，确认现有 MTPLX 配置被识别。
- 本次没有使用非游戏截图评估 Qwen3.8 的语义准确率；P1-2 仍保持待办，后续重新启用 OCR 优先级时应使用代表性游戏截图单独验收 Schema、标签映射和负属性导入。

## 建议修复顺序

1. 修正官方武器冷却单位及其 Schema 边界，补带入模拟器回归测试。
2. 放开合法负属性范围，增加官方角色负值和 OCR 导入测试。
3. 修复 `health:check` 对哈希资源、manifest 和 OCR_DISABLED 的处理。
4. 将浏览器烟测改为 fail closed，并强化关键交互断言。
5. 建立独立的 64 角色专家 fixture，再重新声明 P1-9 完成。
6. 补版本化 JavaScript 的 immutable 缓存规则。

完成以上修复后，应重新运行 `docs/remediation-plan.md` 中的全部通用验证、浏览器烟测和本地发布后健康检查，再决定是否合并。
