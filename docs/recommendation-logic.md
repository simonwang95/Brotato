# 推荐逻辑维护文档

这份文档维护攻略生成器的推荐逻辑。目标是让角色攻略、数值模型和后续截图输入保持同一套解释口径。

## 输入

当前页面支持：

- 角色：来自 `src/strategyData.js` 的 `CHARACTER_GUIDES`。
- 模式：20 关通关 / 无尽模式。
- 危险等级：危险 0 / 3 / 5，用于提高生存类第 20 关目标。
- DLC：允许 DLC / 仅原版，用官方目录的 `sourcePackage` 过滤。
- 稀有解锁物：允许解锁物 / 只看默认池，用官方目录的 `unlockedByDefault` 过滤。
- 偏好：稳健通关、极限输出、工程流、元素流、远程流、近战流，用关键词和武器标签调整推荐排序。

## 数据来源

- 手写攻略数据：`src/strategyData.js`。
- 官方武器/道具目录：`data/official-catalog.json`。
- 目录匹配逻辑：`src/officialCatalog.js`。
- 生成逻辑：`src/strategyGenerator.js`。

手写推荐负责策略判断；官方目录负责校验来源、阶数、价格、默认解锁和掉落池状态。
新增角色如果尚未逐条校验解锁条件，`unlock` 必须保守标注为待校验，不能猜测为默认可用。

## 推荐流程

1. 根据角色和模式读取基础计划。
2. 把推荐武器和关键道具解析为完整对象，并注入官方目录摘要。
3. 按 DLC 输入过滤非原版内容。
4. 按解锁物输入过滤非默认解锁内容。
5. 按偏好对保留下来的条目排序。
6. 按危险等级上调生存类目标：最大生命、护甲、闪避、生命再生、生命窃取、移速。
7. 输出推荐武器、关键道具、属性优先级、第 20 关目标、节奏说明和资料状态。

推荐武器和关键道具必须带属性说明。当前由 `src/strategyGenerator.js` 根据武器标签、武器类型和道具定位自动生成；后续精修时可以在数据层加入手写 `statNote` 覆盖。

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
