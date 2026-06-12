# 攻略生成器二期规格

目标：用户选择一个角色，并选择是否无尽模式，程序生成一份可执行攻略。

当前实现状态：v0.2 已接入页面，覆盖默认 5 个角色和 Engineer。数据模块在 `src/strategyData.js`，生成逻辑在 `src/strategyGenerator.js`。

## 输入

- 角色：例如 大壮、游侠、法师、工程师等。
- 模式：20 关通关 / 无尽模式。
- 可选难度：危险等级、DLC、是否允许稀有解锁物。
- 可选偏好：稳健通关、极限输出、工程流、元素流、远程流、近战流。

第一版攻略生成器可以先只要求角色和模式，其余输入使用默认策略。

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

当前特殊道具先支持：

- `Cyberball（赛博球）`
- `Baby Elephant（象宝宝）`
- `Baby with a Beard（长胡子的婴儿）`

仍待加入：

- 燃烧持续时间、刷新和传播。
- 诅咒对敌人和奖励的双向影响。
- 结构物和工程流独立公式。
- 敌人护甲、溢出伤害和实际走位导致的命中损失。

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
