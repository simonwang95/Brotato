# 攻略生成器二期规格

目标：用户选择一个角色，并选择是否无尽模式，程序生成一份可执行攻略。

当前实现状态：v0.4 已接入页面，覆盖默认 5 个角色、Engineer、Lucky，以及大壮、老叟、大嗓门、多面手、野人、和平主义者、角斗士、节俭者、病人、农夫、幽灵。数据模块在 `src/strategyData.js`，生成逻辑在 `src/strategyGenerator.js`。
推荐规则的维护说明见 [recommendation-logic.md](recommendation-logic.md)。

## 输入

- 角色：当前覆盖全能者、斗士、狂战士、游侠、法师、工程师、幸运星、大壮、老叟、大嗓门、多面手、野人、和平主义者、角斗士、节俭者、病人、农夫、幽灵；剩余角色后续继续补。
- 模式：20 关通关 / 无尽模式。
- 可选难度：危险等级、DLC、是否允许稀有解锁物。
- 可选偏好：稳健通关、极限输出、工程流、元素流、远程流、近战流。

当前页面已经接入全部输入。默认策略是危险 0、允许 DLC、允许解锁物、稳健通关；选择“仅原版”会隐藏深海魔怪等 DLC 内容，选择“只看默认池”会隐藏官方目录标记为非默认解锁的条目。

## 输出

攻略结果建议分成五块。

1. 推荐武器
   - 主推荐武器。
   - 可替代武器。
   - 武器选择原因：角色加成、属性缩放、清怪能力、Boss 能力、无尽成长性。
   - 需要避免的武器类型。

2. 关键道具
   - 必拿道具。
   - 高优先级道具。
   - 只在特定流派下推荐的道具。
   - 道具解锁方式。
   - 为什么它对该角色重要。

3. 属性优先级
   - 前 10 波优先属性。
   - 11-20 波优先属性。
   - 无尽模式额外优先属性。
   - 需要控制上限或避免过量投入的属性。

4. 20 关目标面板
   - 生命值。
   - 护甲。
   - 闪避。
   - 生命窃取 / 生命再生。
   - 总伤害、攻速、暴击率。
   - 对应主伤害属性：近战 / 远程 / 元素 / 工程。
   - 收获、移速、范围、幸运等辅助属性。

5. 购物和升级节奏
   - 前期是否刷同类武器。
   - 何时锁关键道具。
   - 何时补生存。
   - 何时停止追某个输出属性。

## 数据结构草案

```js
const characterGuide = {
  characterId: "ranger",
  modes: {
    normal20: {
      weaponPlan: {
        recommended: ["SMG", "Shredder"],
        alternatives: ["Pistol"],
        avoid: ["slow melee weapons"],
        notes: "依赖远程伤害和攻速，优先成型清怪能力。"
      },
      keyItems: [
        {
          itemId: "scope",
          priority: "core",
          unlock: "默认可用 / 或具体解锁条件",
          reason: "远程伤害和范围同时提升输出稳定性。"
        }
      ],
      statPriority: {
        early: ["rangedDamage", "attackSpeed", "damagePercent"],
        mid: ["lifeSteal", "armor", "maxHp"],
        late: ["critChance", "range", "speed"]
      },
      wave20Targets: {
        maxHp: [55, 75],
        armor: [6, 10],
        dodge: [0, 30],
        lifeSteal: [8, 15],
        damagePercent: [40, 80],
        attackSpeed: [40, 90],
        critChance: [20, 50],
        rangedDamage: [30, 55],
        speed: [5, 15]
      }
    },
    endless: {
      // 更重视成长、经济、范围清怪和后期生存阈值。
    }
  }
};
```

## 和计算器的关系

当前第一版计算器负责回答：

- 某个道具让当前武器 DPS 增加多少。
- 某种属性对当前武器是否更有效。
- 同一角色路线下，不同武器的理论输出差距。

二期攻略生成器负责回答：

- 这个角色应该走什么路线。
- 这局普通 20 关和无尽模式的属性目标有什么差异。
- 哪些道具虽然当前 DPS 不高，但因为解锁、成长、经济或生存阈值仍然应该拿。

两者共享同一套数据：角色、武器、道具、属性和解锁条件。

## 场景模型

v0.3 起加入 `scenario model`，用于把普通 DPS 估算扩展到不同战斗环境。

当前场景数据在 `src/scenarioData.js`：

- `boss`：Boss / 精英单体。
- `normalWave`：普通清怪。
- `swarm`：高密度怪潮 / 无尽。

当前计算逻辑在 `src/scenarioCalculator.js`：

- 穿透：受 `averageLineTargets` 限制。
- 弹射：受 `averageTargetsInRange` 限制。
- 爆炸额外目标：受 `averageTargetsInRange` 限制。
- 拾取触发道具：受 `pickupRatePerSecond`、触发概率和幸运缩放影响。
- 移速和闪避：合成为有效规避率，用来估算承伤倍率。
- 燃烧：用命中频率、施加概率和持续时间估算覆盖率，支持刷新和传播目标。
- 诅咒：拆成敌人强度倍率和奖励倍率，并给出奖励修正清场评分。
- 结构物：用结构物数量、冷却、工程学缩放、有效时间和命中率计算独立 DPS。
- 敌人护甲、平均敌人血量和走位命中损失：作为伤害交付倍率，影响场景有效 DPS。

当前特殊道具先支持：

- `Cyberball（赛博球）`
- `Baby Elephant（象宝宝）`
- `Baby with a Beard（长胡子的婴儿）`

仍待校准：

- 这些模型目前是可解释近似值，不等同于完整反编译公式。
- 后续需要从 `.pck` 资源里继续解析武器、道具、结构物和敌人的具体效果参数。

## 实现步骤

1. 建立静态资料库
   - 当前先用 `src/strategyData.js` 作为可直接 import 的数据包。
   - 全量稳定后再拆成 `data/characters.json`、`data/weapons.json`、`data/items.json`、`data/unlocks.json`、`data/guides.json`。

2. 补攻略规则
   - 已完成：按角色读取默认路线。
   - 已完成：按普通 20 关 / 无尽模式切换权重。
   - 待完成：用计算器给武器和属性收益提供数值依据。

3. 做攻略页面
   - 已完成：角色选择。
   - 已完成：模式选择。
   - 已完成：危险等级、DLC、解锁池、偏好选择。
   - 已完成：输出攻略卡片、目标面板和关键道具表。

4. 加校验
   - 已完成：道具引用必须存在。
   - 已完成：武器引用必须存在。
   - 已完成：目标面板区间必须是数字范围。
   - 待完成：解锁条件逐条来源校验。

## 数据校验原则

关键道具和解锁条件不能靠记忆随手填。正式录入前应该逐条对照游戏内或可信资料源；如果 Brotato 更新或 DLC 内容不同，需要给数据加版本字段。

## 本机安装包校验

当前项目可以用本机 Steam 安装包校验官方简中名称：

```bash
npm run verify:names
```

默认扫描：

- `Brotato.app/Contents/Resources/Brotato.pck`
- `BrotatoAbyssalTerrors.pck`

如果安装路径不同，设置 `BROTATO_INSTALL_DIR`。该命令只读游戏包，不写入安装目录。

也可以从安装包提取武器/道具目录：

```bash
npm run extract:catalog
```

当前提取字段：

- `id`
- `kind`
- `sourcePackage`
- `nameKey`
- `tier`
- `value`
- `unlockedByDefault`
- `canBeLooted`
- `setPaths`
- `effectPaths`

生成文件 `data/official-catalog.json` 是后续批量补全武器、道具和解锁信息的基础。

攻略资料和官方目录的引用校验：

```bash
npm run verify:catalog
```

这会把 `src/strategyData.js` 里的武器和道具名称转换为官方 `nameKey`，并检查是否能在 `data/official-catalog.json` 找到对应记录。

运行页面时，攻略生成器会把官方目录注入推荐结果，在武器和道具卡片中显示：

- 来源包：原版或深海魔怪。
- 阶数范围：例如 `T1-T4`。
- 商店价格范围。
- 官方解锁状态和是否进入掉落池。
