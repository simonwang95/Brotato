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
- 目录匹配逻辑：`src/officialCatalog.js`。
- 生成逻辑：`src/strategyGenerator.js`。

手写推荐负责策略判断；官方目录负责校验来源、阶数、价格、默认解锁和掉落池状态。
新增角色如果尚未逐条校验解锁条件，`unlock` 必须保守标注为待校验，不能猜测为默认可用。

全图鉴本地化是后续“最优解评分”的基础。当前维护节奏：

- `data/official-catalog.json` 先提供完整武器/道具 `nameKey`、来源包、阶数、价格、套装和效果路径。
- `data/official-localization.json` 维护 `nameKey -> 官方中文名`，由本机安装包的英文/中文 translation 资源合并生成。
- `src/strategyData.js` 只维护当前策略会引用到的类型、定位、解锁说明和推荐理由。
- `npm run localization:coverage` 用来检查官方图鉴里还有哪些武器/道具没有进入本地化维护表。
- `npm run extract:localization` 可以重新从本机安装包生成本地化表。部分英文 translation 条目不是明文，脚本里用 `manual-override` 对已从中文包确认的关键名称做校准。
- 当前本地化表已覆盖绝大多数武器；未确认的条目要继续留在覆盖率报告中，不要凭直觉填入。

## 推荐流程

1. 根据角色和模式读取基础计划。
2. 把推荐武器和关键道具解析为完整对象，并注入官方目录摘要。
3. 按 DLC 输入过滤非原版内容。
4. 按解锁物输入过滤非默认解锁内容。
5. 按偏好对保留下来的条目排序。排序会同时读取候选自身的 `tags` 和计划附加的 `routeTags`。
6. 按危险等级上调生存类目标：最大生命、护甲、闪避、生命再生、生命窃取、移速。
7. 输出推荐武器、关键道具、属性优先级、第 20 关目标、节奏说明和资料状态。

`routeTags` 用来表达角色计划的整体路线，例如 `["Engineering", "Ranged"]`。它不会替代武器或道具自身标签，而是让道具这类没有武器套装标签的候选也能参与偏好排序。新增角色时，推荐写入 2-3 个稳定标签，避免每个推荐理由都塞关键词。

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

首批接入深海魔怪 DLC 角色：

- `Sailor（水手）`：海军/重型近战，优先 `Anchor（锚）`。
- `Captain（船长）`：海军/剑类近战，解锁后关注 `Captain's Sword（船长的剑）`。
- `Builder（建造者）`：特殊炮塔工程，围绕最佳远程武器和工程学。
- `Chef（厨师）`：消耗品、燃烧和回复节奏。
- `Diver（潜水员）`：近距远程、海军和拾取节奏。
- `Curious（好奇之人）`：重复购买和经济成长。

这批角色的官方中文名来自本机深海魔怪安装包；角色解锁条件还未逐条校验，因此 `unlock` 文案必须继续保守标注。

## Lucky（幸运星）规则

Lucky 的核心不是单纯远程伤害，而是高幸运、高拾取频率和触发类伤害。

当前维护原则：

- `Lute（琉特琴）` 在允许 DLC 时应优先显示。
- `Cyberball（赛博球）`、`Baby Elephant（象宝宝）`、`Baby with a Beard（长胡子的婴儿）` 是触发伤害核心。
- `Baby Gecko（壁虎宝宝）` 和 `Sifd's Relic（圣物）` 用于提高拾取效率，是 Lucky 的重要节奏组件。
- 总伤害百分比应高于远程伤害优先级，因为它会放大拾取/击杀触发类伤害。
- 无尽第 20 关幸运目标当前维护为 `300 - 550`，普通 20 关为 `180 - 320`。

## 截图/照片输入规划

后续支持上传截图或照片时，建议拆成三步：

1. 图像识别：提取角色、波次、商店候选、当前属性面板、武器栏、道具栏。
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
