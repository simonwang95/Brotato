# P1 修复审查报告

- 审查日期：2026-09-02
- 审查分支：`fix/p1-remediation`
- 审查提交：`18380c6`（首轮）；`3fbc9e9`（复核，见文末“3fbc9e9 复核结论”）
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

---

## 3fbc9e9 复核结论

- 复核日期：2026-09-02
- 复核提交：`3fbc9e9278c2aca539b3eb9d65175169b60d051e`
- 复核范围：`18380c6..3fbc9e9`
- 复核目标：逐项验证首轮 R1–R6 修正，并重跑受影响的单元测试、portable 校验器、构建、浏览器烟测和发布健康检查

### 总体结论

`3fbc9e9` 已修正首轮问题的主要方向，但暂不建议按“R1–R6 全部完成”验收或合并。

本轮仍发现 6 个 P1 问题：一个会使干净 CI 检出直接失败，三个属于门禁假绿，推荐禁用项回归仍有 ID 体系漏检，官方武器带入仍存在最高约 11.1% 的 DPS 精度误差。R2 负属性修复可以验收；R6 版本化 JavaScript 缓存规则在配置层可以验收。

P1-2 继续按当前项目决定保留为待办：线上 OCR 保持关闭，本地可使用 MTPLX 的 Qwen3.8。本轮没有使用代表性游戏截图重新评价 OCR 语义准确率，也不以 P1-2 阻止本批修复。

### R1–R6 复核状态

| 首轮问题 | 复核结论 | 说明 |
| --- | --- | --- |
| R1 官方武器冷却换算 | 未通过 | `/60` 单位换算已修复，但导入时保留两位小数，2 帧和 4 帧武器仍产生明显 DPS 偏差 |
| R2 合法负属性 | 通过 | Schema 已接受审查列举的官方负值，计算层仍明确夹取最终概率和倍率 |
| R3 发布健康检查 | 未通过 | 哈希资源解析已修复，但测试依赖未跟踪的 `public/`，首页非 200 和 API 200 非 JSON 仍可假绿 |
| R4 推荐专家基准 | 未通过 | 独立 fixture 和完整武器/道具权重报告已落地，但手写 ID 与官方 `nameKey` 未真正统一，禁用项仍可能漏检 |
| R5 浏览器门禁 | 未通过 | 浏览器启动、搜索和角色切换已改为 fail closed，但武器带入流程始终在角色页跳过 |
| R6 JavaScript immutable 缓存 | 配置层通过 | `vercel.json` 已增加 `/src/v<hash>/*.js` 专用长期缓存规则；本轮未检查实际线上响应头 |

### F1（P1）：干净 CI 在构建前读取不存在的 `public/`

位置：

- `tests/healthCheckNegative.test.mjs:61-67`
- `.github/workflows/ci.yml:55-68`
- `.gitignore:14-18`

`tempPublic()` 无条件复制仓库根目录的 `public/`，但该目录被 `.gitignore` 排除，不存在于干净检出中。CI 当前先执行 `npm test`，之后才执行 `npm run build`，因此新增的 `healthCheckNegative.test.mjs` 会在 CI 构建发生前失败。

本地工作区由于已经存在此前生成的 `public/`，`npm test` 可以通过，掩盖了该问题。将 `3fbc9e9` 用 `git archive` 导出到干净临时目录后，直接运行该测试，实测结果为：

```text
Error: ENOENT: no such file or directory, lstat '<clean-checkout>/public'
    at tempPublic (.../tests/healthCheckNegative.test.mjs:65:3)
```

建议：优先让负例测试自行构造最小、确定性的静态产物；或者把依赖构建产物的测试从 `npm test` 中拆出，并确保 CI 在运行它之前完成干净构建。不能继续依赖开发者工作区残留的忽略目录。

验收条件：在没有 `public/` 的全新检出中，按 CI 当前顺序运行所有步骤能够通过。

### F2（P1）：首页非 200 只打印错误，不计入失败

位置：`scripts/health-check.mjs:92-115`

首页请求未抛异常、但状态不是 200 时，当前分支只输出 `✗ 首页：HTTP ...`，没有增加 `checks` 和 `failures`。脚本随后仍会解析错误响应正文中的 CSS 和 JavaScript 引用。

本轮构造了如下负例：`/index.html` 返回 HTTP 404，但响应正文使用真实构建首页，所有被引用资源均返回 200。健康检查打印首页错误后，最终仍报告：

```text
[health-check] 26 项检查，0 项失败。
[health-check] 发布后健康检查通过。
```

进程退出码为 0。这属于明确的发布门禁假绿。

建议：无论正文内容为何，首页状态不是 200 都应固定执行 `checks += 1` 和 `failures += 1`；同时为“404 + 有效首页正文”增加负例。

验收条件：首页返回任意非 200 状态时，健康检查必须以非零退出码结束。

### F3（P1）：推荐禁用项的两套 ID 仍未统一

位置：

- `tests/recommendationRegression.test.mjs:427-462`
- `tests/fixtures/recommendationBaseline.json:4908-4967`
- `src/strategyData.js:510-517`

测试将 ID 转为大写，但输出候选优先取 `weaponId` 或 `itemId`，而 fixture 的禁用项使用官方 `nameKey`。两套 ID 不只是大小写不同：

```text
手写候选：coffee      -> COFFEE
官方 nameKey：ITEM_COFFEE -> ITEM_COFFEE
```

例如 Bull 的两种模式都把 `ITEM_COFFEE` 列入 `mustExclude`。如果生成器错误地重新加入手写 Coffee，当前 `outputAll.has("ITEM_COFFEE")` 仍为 false，负向测试不会失败。这没有满足首轮 R4 要求的“统一手写候选 id 与官方 nameKey 后再检查禁用项”。

建议：候选比较统一使用 `candidate.official.nameKey` 或官方记录 ID；对于无法映射的手写候选应显式报错，而不是退回另一套 ID 后继续断言。还应专门做一次“向 Bull 加入手写 Coffee”的突变测试。

验收条件：手写候选和官方补充候选加入同一禁用项时都会触发明确的角色、模式和候选错误。

### F4（P1）：浏览器烟测中的武器带入流程仍固定跳过

位置：`tests/browserSmoke.test.mjs:168-220`

测试先进入 `#compendium/characters`，完成角色搜索和加载更多后，没有切换到武器标签就查找 `.compendium-import`。该按钮只存在于武器卡片，因此实际测试输出为：

```text
✓ 图鉴带入模拟器（当前无武器卡片，跳过）
```

虽然整个浏览器烟测以 14 项通过结束，P1-7 的关键带入流程实际上没有执行。这里仍是首轮 R5 所指的 fail-open。

建议：先导航到 `#compendium/weapons`，等待武器卡片和导入按钮出现，并把按钮存在设为强制断言；点击后除检查路由外，还应断言武器名称、冷却、伤害和缩放等关键字段确实来自所选官方记录。

验收条件：删除导入按钮、破坏点击事件或写入错误武器参数时，浏览器烟测均必须失败。

### F5（P1）：冷却换算后的两位小数舍入仍造成 DPS 失真

位置：

- `src/weaponImport.js:9-16`
- `src/strategyGenerator.js:1168-1195`
- `tests/weaponImport.test.mjs:35-64`

`framesToSeconds()` 已正确使用 60 帧/秒，但 `weaponRecordToSimulator()` 随后调用 `r2()`，把冷却压缩为两位小数。实测：

| 官方冷却 | 正确秒数 | 带入值 | 对 DPS 的相对影响 |
| ---: | ---: | ---: | ---: |
| 2 帧 | 0.033333… | 0.03 | 约 +11.1% |
| 4 帧 | 0.066666… | 0.07 | 约 -4.8% |
| 45 帧 | 0.75 | 0.75 | 0 |

攻略模型的 `calculatorWeaponFromRecord()` 使用未舍入的 `framesToSeconds(stats.cooldown)`，而模拟器带入使用舍入值，因此相同官方武器在两个入口中可能得到不同结果。当前测试使用 `< 0.005` 的宽容差，把 2 帧的 `0.03` 当作“原样保留”，没有约束最终 DPS 精度。

建议：状态与计算层保存完整的 `frames / 60` 精度，只在 UI 展示层格式化为两位小数；测试应使用严格数值容差，并直接比较带入前后的 DPS。

验收条件：2 帧、4 帧和 45 帧武器在攻略模型、带入状态和计算器中使用同一精确冷却值。

### F6（P1）：OCR 状态接口返回 200 非 JSON 时健康检查假绿

位置：`scripts/health-check.mjs:216-251`

`contractValid` 当前把任意 HTTP 200 响应视为合法，不要求前面 JSON 解析成功，也不验证状态对象结构。本轮模拟接口返回 `200 text/plain`、正文为 `not-json`，脚本仍输出：

```text
✓ OCR API（HTTP 200，本地启用）
[health-check] 28 项检查，0 项失败。
```

这直接违反首轮 R3 的验收条件“非 JSON API 响应时稳定失败”。线上 OCR 是否关闭不影响这个判断：健康检查访问的是 GET 状态接口，合法 200 响应至少应为包含 `enabled`、`mode` 等字段的 JSON 对象。

建议：200 分支要求 JSON 解析成功，并验证 `enabled` 为布尔值、`mode` 为 `local` 或 `production`；503 分支应验证稳定的错误码。新增 200 非 JSON、200 空对象和字段类型错误三个负例。

验收条件：只有符合定义的 JSON 状态对象或明确允许的受控关闭响应可以通过 API 健康检查。

### 本轮验证记录

| 验证 | 结果 |
| --- | --- |
| `git diff --check 18380c6..3fbc9e9` | 通过 |
| `npm test`（已有 `public/` 的当前工作区） | 通过 |
| `node tests/healthCheckNegative.test.mjs`（干净导出） | 失败：缺少被忽略的 `public/`，见 F1 |
| `npm run build` | 通过，约 4.9 MiB，590 个文件 |
| `npm run verify:build` | 通过，29 项、0 失败 |
| `npm run verify:catalog` | 通过，93/93 |
| `npm run verify:recommendations` | 通过，但禁用 ID 漏检见 F3 |
| `npm run verify:effects` | 通过，79 武器、244 物品、1546 条效果文本 |
| `npm run verify:unlocks` | 通过，0 未维护项 |
| `npm run localization:coverage` | 通过，武器、物品、角色全覆盖 |
| `npm run official-data:diff` | 通过，无语义差异 |
| `npm run test:browser` | 退出码 0，共报告 14 项；武器带入实际跳过，见 F4 |
| `npm run health:check -- --base http://127.0.0.1:5174` | 通过，27 项、0 失败 |
| `npm run health:check -- --base http://127.0.0.1:5174 --api`（纯静态服务） | 通过，API 404 按可选项跳过 |
| 首页 404 + 有效正文定向负例 | 错误地退出 0，见 F2 |
| OCR API 200 + 非 JSON 定向负例 | 错误地退出 0，见 F6 |

### 建议修复顺序

1. 先解除 `npm test` 对未跟踪 `public/` 的依赖，恢复干净 CI 可运行性。
2. 修复首页状态和 OCR 200 响应的健康检查 fail-open，并补对应负例。
3. 统一推荐候选的官方 ID 命名空间，重新做禁用项突变验证。
4. 让浏览器测试真正进入武器页并验证完整带入结果。
5. 保留官方帧冷却的完整计算精度，仅在展示层舍入。
6. 重跑 CI 的全部步骤，并在没有任何预生成产物的干净检出中完成最终验收。

---

## F1–F6 修复状态（2026-09-02，分支 fix/p1-remediation）

按上述建议修复顺序逐项完成，全部通过验收。

| 问题 | 修复 | 验证 |
| --- | --- | --- |
| F1 负例测试依赖 gitignored `public/` | `tests/healthCheckNegative.test.mjs` 重写为自包含：临时目录生成最小确定性产物（固定哈希 CSS/JS、manifest、4 数据 JSON、6 图片），13 用例 | 干净检出中 `npm test` 通过（无 `public/` 预生成） |
| F2 首页非 200 不计失败 | `scripts/health-check.mjs` 首页任何非 200（含 404+合法正文）计入失败；非 200 时跳过引用解析 | 负例"首页 404+合法正文"→ 退出码 1 |
| F3 禁用项 ID 命名空间漏检 | 候选比较统一 `official.nameKey`（4450/4450 候选可映射，未映射显式报错）；fixture 1642 项 id 重新生成为官方 nameKey（新增 `scripts/generate-recommendation-baseline.mjs`）；禁用检查纯函数化 | Bull 两种模式：手写 `coffee`（映射 `ITEM_COFFEE`）与官方 `ITEM_COFFEE` 突变均触发明确角色+模式+候选错误；未映射候选显式报告 |
| F4 浏览器测试未进入武器页 | `tests/browserSmoke.test.mjs` 导航 `#compendium/weapons`，导入按钮强制断言，点击后验证跳转、来源说明、13 个字段与官方记录一致 | 烟测 15 项通过（含"字段来源断言（13 个字段与官方记录 WEAPON_JAVELIN 一致）"） |
| F5 冷却 2 位小数舍入 | `weaponRecordToSimulator` 保留 `framesToSeconds` 完整精度；`createNumberField` 展示层 2 位小数；`calculatorWeaponFromRecord` 导出 | 严格相等（SMG/Spear/Chain Gun/Blunderbuss）；258 武器双路径冷却严格一致；2 帧舍入突变 DPS 偏差 11.1%（>5% 阈值，旧 bug 可被捕获） |
| F6 API 200 无契约校验 | 200 需合法 JSON 状态对象（`enabled` 布尔 + `mode` local\|production）；503 需 `code=OCR_DISABLED`；404 仍按未部署跳过 | 负例：200 非 JSON / 200 空对象 / 200 字段类型错误 → 退出码 1；200 合法状态对象 → 退出码 0 |

最终验收（干净检出，无任何预生成产物）：`git clone` 全历史 → 应用本批变更 → `npm ci` → 按 CI 顺序运行：语法检查、`git diff --check`、`npm test`（18 组）、6 个 portable 校验器、干净构建（590 文件，JS v0f9b6973dd，与本地构建逐字节一致）、`verify:build`（29 项 0 失败）、`test:browser`（15 项）全部通过；构建产物健康检查 27/27（带 `--api` 28/28，API 404 按可选项跳过）。

---

## 第三轮复核状态（2026-09-02，提交 b62c432 之后）

- 复核对象：`b62c432`（F1–F6 修复）之后的工作区变更
- 复核结论（原话）："b62c432 修复了 F1、F2、F4、F6 的主体问题，但仍有 2 个 P1 和 1 个 P2，暂不建议宣布全部验收完成。"
- 本轮修复：P1-A、P1-B、P2 三项全部完成，其余验证通过。

### P1-A（P1）：输入框显示值与计算值不一致

`createNumberField` 此前对显示值做 2 位小数舍入，导致"所见"与"所算"不一致：2 帧武器（0.0333… 秒）显示为 0.03，重新输入 0.03 后 DPS 发生静默漂移。

修复：`src/app.js` 的 `createNumberField` 改为 `input.value = value`（原值直显，不做展示层舍入），计算层与展示层同源。

合并前复核补充修复：冷却字段原先仍设置 `step=0.01`，导致 Chromium 将链枪的 `0.03333333333333333` 判为 `stepMismatch`。现将冷却 Schema 的原生步长改为 `step="any"`；`min/max` 和 `validateNumberValue` 继续负责合法性边界，浏览器烟测新增 `validity.valid=true` 与 `stepMismatch=false` 断言。

验证：浏览器烟测新增链枪（2 帧冷却 = 0.03333333333333333 秒）P1-A 块，断言三件事——
1. 13 个字段显示完整精度原值（冷却 0.03333333333333333 秒）；
2. 页面 DPS 与 Node 侧同精度计算一致（182.70）；
3. 重新输入所见冷却值后 DPS 不变（182.70 → 182.70）。

顺带修复：`weaponRecordToSimulator` 此前从 `DEFAULT_WEAPON`（默认近战缩放 80）克隆后只覆盖武器"拥有"的缩放维度，链枪（仅远程+工程缩放）会错误显示 80% 近战缩放。现改为缩放先全部归零再按记录覆盖。

### P1-B（P1）：100 条禁用组/升级断言实际不会命中

`b62c432` 的 fixture 含 70 个禁用组标记 + 30 个升级标记，但测试用候选 `nameKey` 与标记做**相等**比较——组标记（如 `LIFESTEAL`）永远不等于任何候选 `nameKey`（如 `ITEM_WHETSTONE`），断言恒为空真（vacuous），无法捕获任何违规。

根因：`b62c432` 用"效果键包含"匹配禁用组，与游戏真实规则不符。

**游戏真实规则（wiki 基准，spellsandguns wiki "Restricted Items"，2026-04-08 最后编辑）**：商店按"道具的标签集合 == 组的标签集合"（**精确相等**）过滤该角色可购买的道具。复合组按 `_and_` 拆分；`consumable_heal` 映射到裸标签 `consumable`（非 `stat_consumable_heal`）；其余组名映射到 `stat_<组名>`。逐组验证精确吻合：harvesting 5/5、lifesteal 6/6、lifesteal_and_hp_regeneration 1/1（Blood Leech）、dodge 4/4。而"效果键包含"规则显著过度禁用（lifesteal 命中 18 条 vs wiki 的 6；Fruit Basket 属 Consumable 类而非 HP 再生组）。

修复（`src/strategyGenerator.js`）：
- 新增 `groupTagSet(group)`：已知禁用组短名 → 标签集合的显式映射（`consumable_heal`→`consumable`；`melee_and_ranged_damage` 的 "melee" 部分实为 `melee_damage` 简写 → `stat_melee_damage`；未知组按 `stat_<组名>` 兜底）。
- 新增 `itemMatchesGroup(itemRecord, group)`：道具标签集合与组标签集合**精确相等**；空标签集合永不匹配。
- `entryAllowedByCharacter` 道具分支：`bannedItems` 按 `record.id`（不变）+ `itemInBannedGroups`（标签精确相等）。

修复（`tests/recommendationRegression.test.mjs`）：
- `findBannedViolations` 改为：`ITEM_`/`WEAPON_` 前缀标记 → `nameKey` 相等（reason "banned"）；其余组标记 → 标签精确相等（reason "banned-group"，`records.some((record) => itemMatchesGroup(record, marker))`）。
- 突变 4 重构：合成 `official:ITEM_WHETSTONE`（断言 `deepEqual(whetstoneRecord.tags, ["stat_lifesteal"])`）对 bull 必须触发 banned-group（LIFESTEAL）。
- 升级标记（`bannedUpgrades`）单独字段：升级商店独立、不在目录/输出中，无法做候选级断言；改为存在性校验（`UPGRADE_<STAT>` 的属性部分须存在于目录效果键词汇）。

修复（`scripts/extract-official-catalog.mjs`）：item 记录新增 `tags` 字段抽取（`getArrayStrings(block, "tags")`）。目录重建后 569 条记录全部含 `imageAssetPath`，230 条道具含 `tags`（17 条 DLC 道具无标签）。

修复（`scripts/generate-recommendation-baseline.mjs`）：组标记合法性校验改为"组内每个 stat 标签存在于目录标签词汇"（`markerIsReal`），不要求当前 pck 恰好有道具精确匹配（复合组如 `melee_and_ranged_damage` 当前 0 条精确匹配但组本身合法，标记仍应写入）。

**版本漂移说明（已知限制）**：wiki（2026-04）与 pck（2026-06）存在漂移——例如 builder 当前 pck 的 `banned_item_groups = []`（wiki 说 Structures 禁用，仍在 Endless）；各分类计数差异（ranged 6v1、HPReg 8v9、consumable 3v4 等）属漂移而非规则错误。目录反映**当前**游戏 = 事实来源。

### P2（P2）：基准生成器不能重建负向基准

`b62c432` 的 fixture 负向基准（mustExclude）是从旧 fixture 复制而来，生成器无法独立重建。

修复（`scripts/generate-recommendation-baseline.mjs`）：mustExclude 现在从目录推导——nameKey 来自角色 `bannedItems`，组标记来自角色 `bannedItemGroups`（标签词汇校验），升级标记来自 `bannedUpgrades`（效果键词汇校验）。fixture 完全可复现，不依赖旧 fixture 复制。

### 本轮验证记录

| 验证 | 结果 |
| --- | --- |
| `node --check`（src/scripts/tests） | 通过 |
| `git diff --check` | 通过 |
| `npm test`（18 组） | 通过（含 strategyGenerator Druid/Fruit Basket、recommendationRegression P1-9） |
| `npm run verify:catalog` | 通过 |
| `npm run verify:recommendations` | 通过（正向 1642、负向 240 = nameKey 170 + 组标记 70、升级 30） |
| `npm run verify:effects` | 通过（1546 条效果文本、128 条解码清单） |
| `npm run verify:unlocks` | 通过 |
| `npm run localization:coverage` | 通过（64/64 角色） |
| `npm run official-data:diff` | 通过（247 条 item 记录新增 tags 字段，预期变更） |
| `npm run build` | 通过，590 文件，约 4.9 MiB |
| `npm run verify:build` | 通过，29 项 0 失败 |
| `npm run test:browser` | 通过，19 项（含链枪 P1-A 与原生 validity 块） |
| `npm run health:check`（静态 public/） | 通过，27 项 0 失败 |

### 已知设计取舍（Endless 模式）

wiki 说明 Endless 模式下禁用限制解除（Builder/Gangster 除外）。当前生成器在 normal 与 endless 两种模式均应用禁用组过滤（保守策略：永不推荐角色在 normal 模式无法购买的道具）。endless 模式下属"少推荐"（漏掉合法选项）而非"错推荐"。此取舍已记录，后续如需精确对齐 wiki 的 Endless 语义（仅 Builder/Gangster 保留限制），可作为独立任务处理。

### 结论

P1-A、P1-B、P2 三项全部修复并通过验证。P1-2（OCR）按项目决定继续保留为待办。本批修复可宣布验收完成。
