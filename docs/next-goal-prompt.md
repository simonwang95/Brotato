# 下一阶段 Goal 模式提示词

下面内容可直接粘贴到 Codex Goal 模式中使用。

```text
/goal

目标：继续完善 Brotato Number Lab，完成官方角色攻略闭环，并进一步提高图鉴效果数据与推荐评分的可信度、覆盖率和可解释性。

工作目录：***REMOVED***/Files/Code2/Brotato

当前稳定基线：
- main 与远端一致，开始前必须先运行 git status，确认工作区状态。
- 官方图鉴本地化覆盖：武器 79/79、物品 244/244、角色 64/64。
- 图鉴效果校验覆盖 79 个武器、244 个物品、1593 条属性/效果展示，不再直接暴露内部资源 key。
- data/official-unlocks.json 已包含 54 条角色奖励映射，全部为 verified-static-text，pending-text 为 0。
- 推荐器已把官方 79 个武器和 244 个物品纳入补充候选池；手写策略层当前校验 44 个武器、43 个物品、63 个角色。
- verify:unlocks 当前仅剩两个 official-only 角色 warning：Beast Master 和 Wounded。
- Giant / CHARACTER_GIANT 不在当前 base + Abyssal Terrors 官方角色目录中，缺口证据已记录在 data/official-character-catalog-gaps.json。

优先任务，按顺序推进：

1. 补齐 Beast Master 和 Wounded 官方角色攻略
- 从 data/official-catalog.json、data/official-localization.json、data/official-unlocks.json 和官方角色静态 effect/stat 数据读取名称、特性、图片和解锁条件。
- 为两个角色补充与现有 CHARACTER_GUIDES 风格一致的攻略模板、模式策略、武器路线、routeTags、关键道具、属性优先级、第 20 关目标和节奏说明。
- 推荐必须尊重模式、危险等级、DLC、是否允许解锁物和偏好流派。
- 不要仅凭角色名称或印象选择路线；每个核心推荐应能追溯到官方特性、武器套装、角色目标属性或场景模型收益。
- 更新反向解锁校验，使 verify:unlocks 不再把这两个角色报告为未维护。
- 补充针对两个角色的推荐测试，包括正常推荐和明显不应出现的负向断言。

2. 最终处理 Giant / CHARACTER_GIANT
- 继续搜索本机安装包和官方静态目录中的 character、challenge、achievement、translation、Progress 及关联资源，判断 Giant 是旧版本数据、未发布内容、别名还是策略层错误记录。
- 不读取或依赖玩家存档解锁进度，只使用静态安装包和仓库已有证据。
- 不要凭记忆硬造 CHARACTER_GIANT 映射或解锁条件。
- 如果仍找不到可靠官方证据，保留明确的目录缺口记录，并评估将 Giant 从普通官方角色选择/推荐入口隐藏或标记为非官方待核验候选；不要悄悄删除历史证据。
- 为最终行为补测试，并在文档中说明选择依据。

3. 继续解码复杂武器和物品效果
- 先生成或维护一份所有“待解码”效果及对应资源路径、effect key、子资源参数和影响范围的清单。
- 优先处理会直接影响推荐评分的效果：宠物伤害与间隔、燃烧、减速区域、额外投射物、魅惑、结构物内部参数、Giant Belt 的生命伤害换算，以及高/低生命阈值效果。
- 优先从官方脚本、主资源、SubResource 和 PHashTranslation 中稳定解析参数含义；无法证明的参数继续明确标记为待解码，不要猜。
- 解码结果既要改善图鉴中文说明，也要在适用时接入 scenario model，而不是只替换展示文案。
- 扩展 npm run verify:effects，防止内部 key、脚本路径、空效果或未经解释的占位字段重新进入 UI。

4. 建立推荐质量回归集并校准评分
- 为 Lucky、Knight、Ghost、Engineer、Druid、Beast Master、Wounded 等典型角色建立固定场景测试。
- 至少覆盖普通 20 关、无尽模式、允许/禁用 DLC、允许解锁物/只看默认池，以及稳健、输出、工程、元素、远程、近战偏好。
- 校验 Top 推荐的稳定性，同时加入“明显不应推荐”的负向断言，避免仅因名称或宽泛标签碰撞而入选。
- 评分继续采用“基础适配 + 场景数值收益 + 解锁/掉落 + 稀有度/价格 + 套装 + 角色机制 + 模式修正”。
- 保持可解释：每个显著加减分都应形成用户可读的 recommendationReasons。
- 场景模型不能伪造安装包没有提供的触发次数、命中率、治疗量或每局箱子数；近似值必须明确说明假设。

5. 清理解锁数据与文档债务
- src/strategyData.js 中仍有一批旧的“待校验”占位 unlock 文案，目前依赖 VERIFIED_CHARACTER_UNLOCKS 在运行时覆盖。将解锁条件收敛为明确的单一可信数据源，避免源文件和运行结果互相矛盾。
- 不要复制粘贴两套容易漂移的精确解锁文本；优先复用 data/official-unlocks.json 或稳定生成的数据模块。
- 更新 docs/strategy-generator.md 中已经过期的“解锁条件逐条来源校验待完成”等描述。
- 同步 README.md、docs/recommendation-logic.md 和 docs/strategy-generator.md 的角色数量、warning 数量、候选池覆盖、效果解码边界及评分机制。

6. 增加官方数据版本溯源
- 在不破坏现有数据读取结构的前提下，为官方目录、本地化和解锁抽取结果增加可复现的来源元数据。
- 优先记录游戏/DLC 来源包、提取时间、提取器版本，以及能够稳定获得的安装包哈希或版本信息。
- 如果安装包内无法可靠确定产品版本，明确记录 unknown 和证据边界，不要从文件日期猜版本号。
- 更新抽取脚本测试和使用文档，说明 Brotato 更新后如何重新抽取、比较和校验数据。

工程约束：
- 不要回退用户已有改动；工作区可能存在与本任务无关的修改。
- 先读代码、数据和安装包静态资源，再修改文件。
- 使用现有代码风格和数据结构，避免大规模重构。
- 文件编辑使用 apply_patch。
- 优先扩展现有解析器、场景模型和测试辅助函数，不为单个条目堆叠难以维护的特例。
- 所有数据结论区分“官方静态数据”“模型估算”“手写策略判断”和“待校验”。
- 本机存档解锁进度不得作为官方解锁条件或默认池状态的证据。
- UI 中推荐项继续显示图片、官方中文名、属性说明、评分理由，并可跳转图鉴。
- 新增或修改前端展示后，检查桌面和移动端，确保没有文本溢出、横向滚动或控件重叠。

每完成一批改动，运行：
- npm test
- npm run verify:catalog
- npm run verify:effects
- npm run verify:unlocks
- npm run localization:coverage
- npm run build
- git diff --check

验收标准：
- Beast Master 和 Wounded 能生成完整、可解释且经过测试的攻略推荐。
- verify:unlocks 不再报告这两个 official-only 角色未维护；任何剩余 warning 都有明确证据和说明。
- Giant 有基于静态资源的最终处理结论和回归测试，不存在硬造映射。
- 新解码效果不暴露内部 key，且影响推荐的效果已经接入可解释评分或明确说明为何暂不接入。
- 推荐回归集覆盖关键角色和输入组合，并包含负向断言。
- 解锁条件只有一个明确的可信来源，文档与代码现状一致。
- 新增的数据来源元数据可以支持后续版本差异审计。
- 工作区最终保持干净；完成稳定节点后创建 git commit，并在最终回复中给出变更摘要、验证结果、仍待解码/待验证清单和下一步建议。
```
