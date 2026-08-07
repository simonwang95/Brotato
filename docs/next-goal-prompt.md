# 下一阶段 Goal 模式提示词

下面内容可直接粘贴到 Codex Goal 模式中使用。

```text
/goal

目标：继续完善 Brotato Number Lab，优先降低剩余复杂效果的不确定性，并校准推荐模型质量；OCR 暂停推进，除非用户重新明确启用。

工作目录：***REMOVED***/Files/Code2/Brotato

当前稳定基线：
- 开始前必须运行 git status，不要假设本地分支已与远端同步，也不要回退用户已有修改。
- 官方图鉴本地化覆盖武器 79/79、物品 244/244、角色 64/64。
- data/official-unlocks.json 有 54 条 verified-static-text 角色挑战，pending-text 为 0；攻略对象直接引用生成的 src/officialUnlocks.js，不再保留待同步占位或运行时二次覆盖。
- 普通攻略和模拟器选择器只展示 64 条官方角色。Giant / CHARACTER_GIANT 缺口证据仍保留在图鉴、策略历史和 data/official-character-catalog-gaps.json 中，但不作为可选官方角色。
- 官方 79 个武器和 244 个物品均可进入补充候选池；推荐仍受角色禁用项、模式、DLC、默认解锁池和偏好过滤。
- Lucky、Knight、Ghost、Engineer、Druid、Beast Master、Wounded 已有普通/无尽 Top-N 回归，并覆盖仅原版、默认池、稳健/输出/工程/元素/远程/近战偏好与负向断言。
- data/official-effect-decoding.json 当前有 128 条记录，其中 14 条 pending-runtime-decode，未分类待解码 3 条；不能把未知触发频率或命中率伪造成精确 DPS。
- npm run official-data:diff 可将工作区目录、本地化、解锁和复杂效果记录与 HEAD 比较，并报告提取器版本、产品版本及输入包哈希变化；纯 extractedAt 变化会被忽略。

优先任务，按顺序推进：

1. 继续解码剩余复杂效果
- 先运行 npm run verify:effects 和 npm run report:effect-decoding，按 data/official-effect-decoding.json 的 pending-runtime-decode 与 unclassified-runtime-effect 清单推进。
- 优先处理会直接改变推荐排序的宠物、燃烧、减速区域、额外投射物、魅惑、结构物内部参数、武器破损和条件触发效果。
- 只使用安装包静态脚本、主资源、SubResource、PHashTranslation 和仓库已有证据；无法证明的参数继续明确标记，不猜触发次数、命中率、目标数量或每局资源次数。
- 新解码结果应同时改善图鉴中文展示，并在确实可量化时接入 scenario model；不能量化时说明影响边界。

2. 校准推荐回归与评分
- 在现有固定 Top-N 基线上继续检查“高分但不合理”的候选，先看 recommendationReasons，再决定修模型还是更新基线。
- 重点复核 Druid 的消耗品/收获兑现、Wounded 的一击即死禁用项、Knight 的护甲转近战、Ghost 的击杀成长、Lucky 的幸运/拾取边际收益、Engineer 的结构物路线。
- 评分保持“基础适配 + 场景数值收益 + 解锁/掉落 + 稀有度/价格 + 套装 + 角色机制 + 模式修正”，显著加减分必须产生用户可读理由。
- 新增规则需要正向和负向测试；不要只锁顺序，也要验证 DLC、默认池、角色禁用项和路线排除边界。

3. 做官方版本更新审计
- 游戏或 DLC 更新后依次重跑目录、本地化、解锁和复杂效果抽取，再运行 npm run official-data:diff。
- 对新增、删除、修改记录逐条判断是否影响本地化、解锁、图鉴展示、角色禁用项或推荐评分；不要只看总数。
- 如需自动阻止未经审计的数据变化，使用 npm run official-data:diff -- --fail-on-change；需要跨版本比较时使用 --ref <git-ref>。
- sourceMetadata 只记录可复现的静态安装包证据；不读取玩家存档，不从文件日期猜产品版本。

4. 维护解锁和目录边界
- npm run verify:unlocks 应保持 0 warning、0 pending-text；未来新增无法读取的挑战进入 data/official-unlock-pending.json，不手填猜测条件。
- Giant 只有在新的官方角色资源、翻译 key 和挑战/奖励映射形成一致证据链时才重新进入普通选择器；相似名称的道具、武器或敌人不能作为映射依据。
- 官方静态文本中英文冲突时保留原文、纠正依据和审计字段，再由单一生成链路同步到攻略。

暂不推进：
- 不修改 OCR 服务、截图裁剪、视觉模型提示词或图片识别流程。
- 不把 OCR 结果接入推荐评分；等用户重新明确启用后再单独规划和验证。

工程约束：
- 先读代码、数据和安装包静态资源，再修改文件；使用现有结构，避免大规模重构。
- 文件编辑使用 apply_patch；不回退与任务无关的修改。
- 所有结论区分官方静态数据、模型估算、手写策略判断和待校验。
- 前端推荐项继续显示图片、官方中文名、属性说明、评分理由和图鉴跳转。
- 修改前端后检查桌面与移动端，避免文本溢出、横向滚动和控件重叠。

每完成一批改动，运行：
- npm test
- npm run verify:catalog
- npm run verify:effects
- npm run verify:unlocks
- npm run localization:coverage
- npm run official-data:diff
- npm run build
- git diff --check

验收标准：
- 新解码效果有静态证据、中文展示和明确评分边界，不暴露未解释内部 key。
- 推荐变化有固定 Top-N、筛选边界和负向断言保护，且理由可读。
- 解锁条件保持单一可信来源，Giant 不被误当成官方可选角色。
- 官方数据变化可以通过版本差异命令逐条审计。
- OCR 文件没有被改动。
- 工作区最终保持干净；稳定节点完成后创建 git commit，并说明验证结果、剩余待解码清单和下一步建议。
```
