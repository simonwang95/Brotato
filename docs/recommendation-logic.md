# 推荐逻辑维护文档

这份文档维护攻略生成器的推荐逻辑。目标是让角色攻略、数值模型和后续截图输入保持同一套解释口径。

## 输入

当前页面支持：

- 角色：来自 `src/strategyData.js` 的 `CHARACTER_GUIDES`。
- 模式：20 关通关 / 无尽模式。
- 危险等级：危险 0 / 3 / 5，用于提高生存类第 20 关目标。
- DLC：允许 DLC / 仅原版，用官方目录的 `sourcePackage` 过滤。
- 稀有解锁物：允许解锁物 / 只看默认池，用官方目录的 `unlockedByDefault` 过滤。
- 偏好：稳健通关、极限输出、工程流、元素流、远程流、近战流，用关键词、武器/道具标签和路线标签调整推荐排序。

## 数据来源

- 手写攻略数据：`src/strategyData.js`。
- 官方武器/道具目录：`data/official-catalog.json`。
- 官方武器/道具中文名：`data/official-localization.json`。
- 官方角色解锁映射：`data/official-unlocks.json`。
- 目录匹配逻辑：`src/officialCatalog.js`。
- 生成逻辑：`src/strategyGenerator.js`。

手写推荐负责策略判断；官方目录负责校验来源、阶数、价格、默认解锁和掉落池状态。
新增角色如果尚未逐条校验解锁条件，`unlock` 必须保守标注为待校验，不能猜测为默认可用。

全图鉴本地化是后续“最优解评分”的基础。当前维护状态：

- `data/official-catalog.json` 先提供完整角色/武器/道具 `nameKey`、来源包、阶数、价格、套装和效果路径。
- `data/official-localization.json` 维护 `nameKey -> 官方中文名`，由本机安装包的英文/中文 translation 资源合并生成。
- `src/strategyData.js` 只维护当前策略会引用到的类型、定位、解锁说明和推荐理由。
- `data/official-unlocks.json` 由 `npm run extract:unlocks` 从安装包静态 challenge / achievement 资源生成。该数据不读取玩家存档，不受本机解锁进度影响。已确认文本写入 `zhDescription`；未解码文本保留 `pendingReason` 和 `pendingEvidence`，其中包含 `challengeId`、`nameKey`、`descriptionKey`、`value`、`stat`、`additionalArgs`、challenge 路径和奖励路径。
- `data/official-unlock-pending.json` 由 `npm run unlocks:pending` 从 `data/official-unlocks.json` 的 `pending-text` 记录派生。它集中维护当前无法可靠解码的 11 条挑战文本，标明 source package、官方角色 key、是否已有攻略、challenge key、数值和后续核验动作。
- `npm run localization:coverage` 用来检查官方图鉴里还有哪些角色、武器、道具没有进入本地化维护表。
- `npm run extract:localization` 可以重新从本机安装包生成本地化表。部分英文 translation 条目不是明文，脚本里用 `manual-override` 对已从中文包确认的关键名称做校准。
- 当前本地化表已覆盖官方目录里的 79 个武器、244 个物品和 44/64 个角色。后续如果官方目录新增条目，未确认名称要继续留在覆盖率报告中，不要凭直觉填入。
- `npm run verify:unlocks` 用来校验策略层的默认解锁、需解锁和掉落池文案是否与官方目录状态冲突。待校验角色会同时输出静态 challenge key 和 pending 阻塞原因；脚本也会反向列出已抽到但策略层未维护的官方角色解锁记录。角色图鉴会展示这些 official-only 角色，但攻略推荐仍只使用已维护路线的 `CHARACTER_GUIDES`。`Giant / CHARACTER_GIANT` 当前是记录在 `data/official-character-catalog-gaps.json` 的官方角色目录缺口，校验时单独列入 `Audited catalog gaps`，不按普通 warning 或映射失败处理。

## 推荐流程

1. 根据角色和模式读取基础计划。
2. 把手写推荐武器和关键道具解析为完整对象，并注入官方目录摘要。
3. 如果官方目录已载入，把 79 个武器和 244 个物品按 `nameKey` 扩展成补充候选池；候选必须与手写路线标签、武器套装或角色目标数值有明确交集。
4. 按 DLC 输入过滤非原版内容。
5. 按解锁物输入过滤非默认解锁内容。
6. 按评分器对保留下来的条目排序。评分器会同时读取候选自身的 `tags`、计划附加的 `routeTags`、手写优先级、偏好关键词、官方解锁/掉落状态、稀有度、价格、套装、官方数值效果、场景模型收益和模式目标。
7. 按危险等级上调生存类目标：最大生命、护甲、闪避、生命再生、生命窃取、移速。
8. 输出排序后的 Top 推荐武器、关键道具、属性优先级、第 20 关目标、节奏说明和资料状态。

`routeTags` 用来表达角色计划的整体路线，例如 `["Engineering", "Ranged"]`。它不会替代武器或道具自身标签，而是让道具这类没有武器套装标签的候选也能参与偏好排序。新增角色时，推荐写入 2-3 个稳定标签，避免每个推荐理由都塞关键词。

每个推荐条目会输出：

- `recommendationScore`：当前输入下的排序分数。
- `recommendationReasons`：最多 10 条主要命中原因，例如偏好关键词、候选标签、路线标签、手写优先级、解锁/掉落修正、稀有度/价格修正、套装修正、官方数值匹配角色目标、场景模型收益或机制修正。

页面会把这些原因按列表展示在推荐卡片中，并保留图鉴图片/名称链接，方便从攻略推荐跳到对应武器或道具图鉴核对属性。

评分权重的维护原则：

- 手写 `主推荐` / `核心` 是基础路线判断，权重要高于普通关键词。
- 手写路线候选有额外基础分，保证主路线稳定；官方补充候选主要用来发现同套装、同属性或同机制的遗漏项。
- 候选自身标签命中偏好，比仅靠 `routeTags` 命中更重要。
- `routeTags` 主要用于让关键道具跟随角色路线，而不是让所有候选无差别上分。
- 官方目录显示默认解锁或可掉落时，会得到小幅稳定性加分；需解锁或不进掉落池的条目会保守降分，但在允许解锁物时仍可作为路线目标出现。
- 稀有度和价格会作为可得性修正：低阶低价条目更适合前中期成型；高阶高价条目在普通通关中更保守，在无尽后期可保留成长价值。
- 官方效果或武器缩放命中角色属性优先级/第 20 关目标时，会得到数值协同加分。
- 官方武器记录会转换为 `scenario model` 输入，用角色目标面板中位数估算普通清怪、无尽怪潮或 Boss 单体的有效清场分。该分数用于排序和解释，但权重低于手写主线。
- 支持的触发道具会用 `calculateItemEffectDps` 估算场景 DPS。当前重点覆盖 `Cyberball`、`Baby Elephant`、`Baby with a Beard` 这类幸运/拾取/击杀触发道具。
- 拾取吸附类道具不会伪装成伤害 DPS，而是输出拾取频率收益。例如 `Baby Gecko` 和 `Sifd's Relic` 会按场景 `pickupRatePerSecond` 估算额外拾取机会，并给 Lucky 这类拾取触发路线机制加分。
- 机制修正用于表达纯 DPS 不容易覆盖的价值。例如 Lucky 路线会额外重视幸运缩放，Lute 的百分比伤害会被视作能放大拾取/击杀触发收益。
- 官方候选会读取套装和效果资源。例如幽魂路线只会吸收幽魂套装补充项，避免普通近战武器仅凭近战缩放混入；骑士路线会更容易吸收剑类/中世纪/护甲相关武器。套装命中角色 `routeTags` 时会输出 `套装修正` 解释。
- 无尽模式会小幅偏好成长、拾取、经济、幸运、弹射、贯通、范围和诅咒收益；20 关通关会小幅偏好稳定阈值。

推荐武器和关键道具必须带属性说明。当前由 `src/strategyGenerator.js` 根据武器标签、武器类型和道具定位自动生成；后续精修时可以在数据层加入手写 `statNote` 覆盖。

推荐武器必须考虑武器套装：

- 官方目录的 `setPaths` 是首选来源，手写 `tags` 是未载入 catalog 时的兜底。
- 套装说明由 `setNote` 暴露到页面，用于解释为什么推荐某条武器路线。
- 例如 `Sword（剑）` 同时属于剑类和中世纪套装，适合 `Knight（骑士）` 的护甲近战路线。
- `Ghost Axe（幽魂斧）`、`Ghost Flint（幽魂燧石）`、`Ghost Scepter（幽魂节杖）` 属于幽魂套装，适合 `Ghost（幽灵）` 的闪避和击杀成长路线。

本轮推荐修正还加入了更贴合角色机制的武器：

- `Hunter（猎人）` 优先 `Crossbow（十字弓）`，解锁后关注 `Sniper Gun（狙击手枪）`。
- `Crazy（狂战士）` 除近战小刀/盗贼匕首外，加入 `Shuriken（手里剑）` 作为精准暴击的远程分支。
- `Knight（骑士）` 除 `Sword（剑）` 外，加入 `Spiky Shield（尖刺盾）` 作为护甲转输出的替代路线。

## DLC 角色接入

已接入深海魔怪 DLC 角色：

- `Sailor（水手）`：海军/重型近战，优先 `Anchor（锚）`。
- `Captain（船长）`：海军/剑类近战，解锁后关注 `Captain's Sword（船长的剑）`。
- `Builder（建造者）`：特殊炮塔工程，围绕最佳远程武器和工程学。
- `Chef（厨师）`：消耗品、燃烧和回复节奏。
- `Diver（潜水员）`：近距远程、海军和拾取节奏。
- `Curious（好奇之人）`：重复购买和经济成长。
- `Giant（巨人）`：高生命、重型近战和高生命目标伤害。
- `Ogre（食人魔）`：受压环境下的重型/钝器近战。
- `Dwarf（矮人）`：钝器、工具和重型成长路线。
- `Creature（生物）`：原始/精准高频近战。
- `Gangster（匪徒）`：商店风险和经济滚动。
- `Romantic（浪漫之人）`：乐器、远程控制和魅惑路线。
- `Druid（德鲁伊）`：收获、消耗品和成长循环。
- `Hiker（徒步旅行者）`：行走经济和高移速路线。
- `Buccaneer（海盗）`：海军远程和距离击杀经济。

DLC 角色的官方中文名来自本机深海魔怪安装包；默认/需解锁状态已用官方目录校验。`npm run extract:unlocks` 能映射 DLC challenge 奖励角色，但当前 DLC translation 描述文本还未可靠解码，因此 `unlock` 文案必须继续保守标注。`npm run unlocks:pending` 会把这些未确认文本集中列成待校验清单；图鉴可以展示 `pendingEvidence` 里的静态 challenge 证据，不能把它等同于精确条件文本。`Baby`、`Beast Master`、`Technomage`、`Vagabond`、`Vampire`、`Wounded` 当前作为 official-only 图鉴条目显示，后续需要新增策略模板或明确排除。`Giant（巨人）` 当前不在 base+DLC 官方角色目录中，缺口证据记录在 `data/official-character-catalog-gaps.json`，保留为策略层待校验候选。

## Lucky（幸运星）规则

Lucky 的核心不是单纯远程伤害，而是高幸运、高拾取频率和触发类伤害。

当前维护原则：

- `Lute（琉特琴）` 在允许 DLC 时应优先显示。
- `Cyberball（赛博球）`、`Baby Elephant（象宝宝）`、`Baby with a Beard（长胡子的婴儿）` 是触发伤害核心。
- `Baby Gecko（壁虎宝宝）` 和 `Sifd's Relic（圣物）` 已进入拾取频率模型，用于解释 Lucky 的拾取触发稳定性。
- 总伤害百分比应高于远程伤害优先级，因为它会放大拾取/击杀触发类伤害。
- 无尽第 20 关幸运目标当前维护为 `300 - 550`，普通 20 关为 `180 - 320`。

## 截图/照片输入规划

当前先做最稳的一步：截图/照片只作为右侧“属性”面板 OCR，不直接识别角色、武器栏、道具栏或商店候选。

当前流程：

1. 玩家手动选择当前角色，避免模型猜错角色。
2. 上传局内截图或照片。
3. 服务端调用 OpenAI 兼容视觉模型，只要求读取右侧属性栏的属性名和数字。
4. 模型输出 `statsOcr: [{ label, value }]`。
5. 前端把中文属性名映射到内部字段，例如 `最大生命值 -> maxHp`、`%伤害 -> damagePercent`、`幸运 -> luck`。
6. 如果模型返回长文本，前端会兜底从中文属性名和 `stats.xxx` 行里提取数字。

当前不把截图输入接入推荐规则，只用于填充模拟器属性面板。这样比一次性识别整局信息更稳定，也更容易人工核对。

后续如果继续扩展，再拆成三层：

1. 专门 OCR：分别裁剪属性栏、武器栏、道具栏和商店候选。
2. 结构化归一：映射到内部字段，例如 `characterId`、`modeId`、`stats`、`weapons`、`ownedItems`、`shopCandidates`。
3. 推荐生成：把结构化局面作为额外输入，调整推荐权重。

截图输入不应直接改写推荐规则，而应生成一个 `currentRunContext`：

```js
const currentRunContext = {
  wave: 12,
  characterId: "lucky",
  modeId: "endless",
  stats: {
    luck: 210,
    damagePercent: 65
  },
  ownedItems: ["cyberball", "babyGecko"],
  shopCandidates: ["sifdsRelic", "babyElephant"]
};
```

推荐器后续可以基于 `currentRunContext` 做局内建议，例如“买圣物优先于普通远程伤害”。
