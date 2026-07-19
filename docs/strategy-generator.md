# 攻略生成器二期规格

目标：用户选择一个角色，并选择是否无尽模式，程序生成一份可执行攻略。

当前实现状态：v0.6 已接入页面，覆盖原版 44 个角色和深海魔怪 DLC 15 个角色。数据模块在 `src/strategyData.js`，生成逻辑在 `src/strategyGenerator.js`。
推荐规则的维护说明见 [recommendation-logic.md](recommendation-logic.md)。

## 输入

- 角色：当前覆盖原版 44 个角色，以及深海魔怪 DLC 15 个角色。
- 模式：20 关通关 / 无尽模式。
- 可选难度：危险等级、DLC、是否允许稀有解锁物。
- 可选偏好：稳健通关、极限输出、工程流、元素流、远程流、近战流。

当前页面已经接入全部输入。默认策略是危险 0、允许 DLC、允许解锁物、稳健通关；选择“仅原版”会隐藏深海魔怪等 DLC 武器和道具，选择“只看默认池”会隐藏官方目录标记为非默认解锁的条目。

角色目录校验以 `data/official-catalog.json` 为准。`Giant / CHARACTER_GIANT` 当前不在已抽取的 base + 深海魔怪官方角色目录里，相关证据记录在 `data/official-character-catalog-gaps.json`；攻略层暂时把它作为待校验候选，而不是硬填官方映射。

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
- 拾取吸附道具：用官方 `instant_gold_attracting` 数值估算额外拾取频率，不计入伤害 DPS。
- 暴击击杀经济道具：用官方 `gold_on_crit_kill` 触发值、角色目标暴击率和场景击杀频率估算额外材料/秒，不计入伤害 DPS。
- 拾取经济道具：用官方 `chance_double_gold` 触发值和场景拾取频率估算额外材料/秒，不计入伤害 DPS。
- 收获成长道具：用官方 `harvesting_growth` 和角色目标收获中位数估算等效额外收获，不计入伤害 DPS。
- 箱子经济道具：用官方 `item_box_gold` 估算每个箱子的额外材料潜力，不假设箱子掉落频率，也不计入伤害 DPS。
- 回收经济道具：用官方 `recycling_gains` 估算每次回收的额外材料，保留“材料/次”单位，不假设一局回收次数。
- 箱子额外道具：用官方 `extra_item_in_crate` 概率换算单箱期望；随机道具和同名道具分别标注，不假设一局箱子数或道具价格。
- 战利品外星人：`extra_loot_aliens_next_wave` 保留下一波固定数量；`loot_alien_chance` 只计算出现机会，并用 `loot_alien_speed` 作追逐风险折扣，不换算成虚构材料/秒。
- 波次存钱道具：用官方 `effect_gain_pct_gold_start_wave_limited` 估算波次开始材料百分比潜力，不假设具体持有材料数，也不计入伤害 DPS。
- 续航触发道具：用官方 `heal_on_kill`、`heal_on_crit_kill`、`heal_when_pickup_gold`、`consumable_heal`、`consumable_heal_over_time` 和 `heal_on_dodge` 估算击杀、暴击击杀、拾取、消耗品即时/持续和闪避治疗期望，不计入伤害 DPS。
- 水果掉落道具：用官方 `enemy_fruit_drops` 和场景击杀频率估算额外消耗品机会；静态目录没有水果治疗量时只输出消耗品/秒，不换算成生命/秒。
- 诅咒/风险经济道具：用官方 `gold_on_cursed_enemy_kill`、`enemy_gold_drops`、`curse_locked_items`、`stat_curse` 和敌人风险字段估算额外材料或商店诅咒潜力，不计入伤害 DPS。
- 下一波经验道具：用官方 `stats_next_wave` 的 `xp_gain` 估算短期经验潜力，并用同组敌人生命、伤害或速度字段做风险折扣；只在收获路线中转成经济排序分。
- 条件伤害：用官方 `damage_against_bosses`、`bonus_damage_against_targets_above_hp` 和 `giant_crit_damage` 估算 Boss / 高生命目标潜力；高生命阶段按 Boss 50%、普通清怪 25%、怪潮 20% 的场景权重折算。`giant_crit_damage` 的生命伤害换算未可靠解码，因此只按官方原始值和角色目标暴击率排序，不当作精确 DPS。
- 覆盖潜力道具：用官方 `explosion_damage`、`explosion_size`、`burning_spread`、`burning_enemy_hp_percent_damage`、`structure_attack_speed`、`structures_cooldown_reduction`、`structures_can_crit` 和结构物脚本路径估算爆炸、燃烧、结构物路线潜力；结构物可暴击时会合并角色目标暴击率与道具自带暴击率，按默认 2 倍暴击估算期望倍率。这类分数用于排序和解释，不作为精确 DPS。
- 官方自定义成长道具：用 `EFFECT_GAIN_STAT_FOR_EVERY*` / `custom_arg.gd` 中可稳定读取的 `statScaled` 和 `nbStatScaled` 估算“随某项来源放大”的潜力，例如 `Power Generator（发电机）` 随移速来源放大。该模型使用对数效用和属性阈值，只作为排序修正；目标收益仍未从子资源完全解码，因此不写成精确属性加成。
- 移速和闪避：合成为有效规避率，用来估算承伤倍率。
- 燃烧：用命中频率、施加概率和持续时间估算覆盖率，支持刷新和传播目标。
- 诅咒：拆成敌人强度倍率和奖励倍率，并给出奖励修正清场评分。
- 结构物：用结构物数量、冷却、工程学缩放、有效时间和命中率计算独立 DPS。
- 敌人护甲、平均敌人血量和走位命中损失：作为伤害交付倍率，影响场景有效 DPS。

攻略推荐器也会复用这套模型做轻量评分：

- 官方武器的 `damage`、`cooldown`、`crit_chance`、`crit_damage`、穿透、弹射和缩放字段会转换为计算器武器输入。
- 评分按角色第 20 关目标面板的中位数估算，不读取存档或当前局面。
- 普通通关默认看 `normalWave`，无尽或覆盖类武器看 `swarm`，高生命/Boss 说明看 `boss`。
- 场景分只作为排序修正；手写主路线、解锁/掉落、稀有度、价格、套装适配和机制修正仍保留解释权重。
- 幽魂武器会读取官方 `effect_gain_stat_every_killed_enemies`、`stat` 和 `stat_nb`，把逐阶 `20/18/16/12` 次该武器击杀换算为每 100 杀 `+5.0` 到 `+8.3` 的永久属性；不假设每波击杀归属。
- 骑士路线显式标记 `Blade`、`Medieval`、`Melee` 和 `Blunt`，并读取角色官方“每 1 护甲 `+2` 近战伤害”与禁用远程武器效果。Sword 的双套装与 T2 起步、Spiky Shield 的武器护甲缩放仍分别解释。
- Lucky 路线会读取官方武器 `scalingStats` 中的 `stat_luck`，用于解释 Lute、Flute 这类幸运缩放武器；角色自身的 75% 拾取触发、15% 幸运伤害和幸运获取 `+25%` 会与候选幸运、总伤害、拾取吸附合并为边际 DPS。
- 官方关键道具补充展示手写条目外的前 24 个候选；新增候选仍必须通过路线标签、目标属性或官方效果模型命中，不会只凭名称进入推荐。
- 官方道具效果会优先从静态 effect 字段生成模型：`chance_stat_damage_effect` 会按 `customKey` 区分击杀、拾取或闪避触发伤害，`gold_on_crit_kill`、`chance_double_gold`、`instant_gold_attracting`、`harvesting_growth`、`item_box_gold`、`recycling_gains`、`extra_item_in_crate`、`loot_alien_chance`、`extra_loot_aliens_next_wave`、波次存钱模板、`stats_end_of_wave`、`stats_next_wave`、`piercing`、`pierce_on_crit`、`items_price`、`free_rerolls` 和 `reroll_price` 会生成经济/拾取/每波成长/下一波经验/贯通覆盖/商店效率模型；`Cyberball` 因此按官方 `dmg_when_death` 作为击杀触发、25% 幸运伤害估算。

当前特殊道具先支持：

- `Cyberball（赛博球）`：官方 `dmg_when_death` 击杀触发伤害
- `Baby Elephant（象宝宝）`：官方 `dmg_when_pickup_gold` 拾取触发伤害
- `Baby with a Beard（长胡子的婴儿）`
- `Hunting Trophy（狩猎战利品）`
- `Metal Detector（金属探测器）`
- `Crown（王冠）`
- `Bag（袋子）`
- `Piggy Bank（存钱罐）`
- `Baby Gecko（壁虎宝宝）`
- `Sifd's Relic（Sifd的圣物）`
- 官方 `dmg_on_dodge` 动态闪避触发伤害模型，例如 `Riposte（还击）`
- 官方 `stats_end_of_wave` 动态每波成长模型，例如 `Robot Arm（机械臂）` 的工程学成长
- 官方 `stats_next_wave` 动态下一波经验模型，例如 `Peacock（孔雀）`
- 官方 Boss / 高生命条件伤害模型，例如 `Silver Bullet（银质子弹）`、`Small Fish（小鱼）`、`Giant Belt（巨型带）`、`Trident（三叉戟）`
- 官方 `piercing` / `pierce_on_crit` 动态贯通覆盖模型，例如 `Bandana（头巾）`、`Sharp Bullet（尖头子弹）`、`Eyepatch（眼罩）`
- 官方 `items_price` / `free_rerolls` / `reroll_price` 动态商店效率模型，例如 `Coupon（优惠券）`、`Dangerous Bunny（危险兔子）`、`Spyglass（望远镜）`
- 官方 `heal_on_kill`、`heal_on_crit_kill`、`heal_when_pickup_gold`、`consumable_heal`、`consumable_heal_over_time`、`heal_on_dodge` 动态续航模型，例如 `Goblet（高脚杯）`、`Tentacle（触手）`、`Cute Monkey（萌萌猴）`、`Lemonade（柠檬水）`、`Weird Food（奇怪的食物）`、`Jerky（干肉条）`、`Adrenaline（肾上腺素）`
- 官方 `enemy_fruit_drops` 动态消耗品机会模型，例如 `Fruit Basket（果篮）`
- 官方 `recycling_gains`、`extra_item_in_crate` 动态回收/箱子机会模型，例如 `Recycling Machine（回收装置）`、`Treasure Map（藏宝图）`、`Pearl（珍珠）`
- 官方 `loot_alien_chance`、`extra_loot_aliens_next_wave` 动态战利品外星人模型，例如 `Whistle（哨子）`、`Lure（鱼饵）`
- 官方 `gold_on_cursed_enemy_kill`、`enemy_gold_drops`、`curse_locked_items` 动态风险经济模型，例如 `Black Flag（黑旗）`、`Fish Hook（鱼钩）`、`Starfish（海星）`
- 官方爆炸/燃烧/结构物动态潜力模型，例如 `Dynamite（炸药）`、`Honey（蜂蜜）`、`Snake（蛇）`、`Eyes Surgery（眼部手术）`、`Turret（炮塔）`、`Clockwork Wasp（机械黄蜂）`、`Pile of Books（一堆书）`
- 官方 `EFFECT_GAIN_STAT_FOR_EVERY*` 自定义成长潜力模型，例如 `Power Generator（发电机）`、`Pearl（珍珠）`、`Stone Skin（石头皮肤）`、`Strange Book（奇怪之书）`。当前只解释缩放来源，不猜测未解码的目标收益。

仍待校准：

- 这些模型目前是可解释近似值，不等同于完整反编译公式。
- `bonus_damage_against_targets_above_hp` 的精确生命阈值与 `giant_crit_damage` 对普通敌人、精英和 Boss 的换算仍需从脚本资源继续解码。
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
   - 已完成：推荐武器和关键道具显示属性说明。

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
- 主效果的 `key`、`value`、`customKey`、缩放字段
- 击杀成长效果的目标 `stat` 与单次成长 `statNb`

生成文件 `data/official-catalog.json` 是后续批量补全武器、道具和解锁信息的基础。
抽取器会把 Godot 资源最后的 `[resource]` 视为主效果，只把 `[sub_resource]` 当参数来源，避免 `arg_key/arg_value` 覆盖真实主字段。`npm run extract:catalog` 会在目录生成后自动运行资产提取，恢复每条记录的本地 `imageAssetPath`；需要只刷新图片时仍可单独运行 `npm run extract:assets`。

从安装包提取官方中文名称：

```bash
npm run extract:localization
```

该命令会读取原版和深海魔怪 DLC 的 `PHashTranslation` 资源，以官方 `nameKey` 按 Godot 两阶段哈希规则分别查询英文和简中消息，生成 `data/official-localization.json`。只接受未压缩 UTF-8 消息；当前 387 个名称全部覆盖，其中 386 个简中名来自 `translation-key`，仅 Retromation 连帽衫使用已从中文资源确认过的 `manual-override`。

从安装包提取角色解锁挑战映射：

```bash
npm run extract:unlocks
```

该命令读取 base/DLC `.pck` 中的 challenge 资源，并用原版 `achievementLocalizations.csv` 连接挑战 ID、奖励角色和条件文本。CSV 未覆盖的挑战通过 `scripts/optimized-translation.mjs` 按 Godot `OptimizedTranslation` 的两阶段哈希规则查询简中 `PHashTranslation`；占位符按官方 `ChallengeData._get_desc_args()` 的顺序由 `value`、翻译后的 `stat` 和 `additional_args` 展开。它只读取静态安装包数据，不读取玩家存档，也不受本机解锁进度影响。当前 54 条奖励映射全部有 `verified-static-text` 简中条件：43 条来自原版 achievement CSV，11 条来自简中 PHashTranslation。解析器只接受未压缩 UTF-8 消息；未来遇到压缩或缺失文本时仍会保留 `pendingReason` 与 `pendingEvidence`，不会猜测。

集中导出待校验解锁文本：

```bash
npm run unlocks:pending
```

该命令不会重新读取安装包，而是从 `data/official-unlocks.json` 过滤 `pending-text`，生成 `data/official-unlock-pending.json`。当前清单为 0 条。未来如果新版本出现无法可靠读取的条目，每条记录仍会保留官方角色 `nameKey`、静态 challenge key、数值、图标资源、奖励路径和后续核验动作。

角色图鉴会读取 `data/official-unlocks.json` 展示静态解锁证据。图鉴角色列表会合并官方目录角色和策略层角色；官方目录里存在但 `CHARACTER_GUIDES` 尚未维护的角色会标记为 official-only，只展示官方图片、特性和解锁证据，不生成攻略推荐。只有写入 `zhDescription` 的 `verified-static-text` 才能同步到 `src/strategyData.js` 的角色 `unlock` 文案；`pending-text` 仍只能证明 challenge 与奖励映射已定位。

角色特性展示同样遵守可信边界：`src/compendium.js` 会把已知官方 stat/effect key 翻译成中文，把起始物品、二元机制、掉落/宠物标签和主资源中明确的自定义成长公式展示出来；如果主资源仍未给出收益目标、只能定位到未展开的 SubResource 参数，则只显示“官方自定义收益”。这表示资源已定位，但具体内部收益尚未可靠解析，不能直接用于精确评分或解锁文案。

`npm run verify:unlocks` 会同时检查反向覆盖：如果安装包里已有角色奖励映射，但 `src/strategyData.js` 还没有维护对应角色，脚本会输出 `official-unlock:*` warning，并输出未维护记录中 verified-static-text、pending-text 和其他状态的细分计数。当前 `oneArm` 会通过别名映射到策略层的 `oneArmed`；8 个原先待补文本的 DLC 攻略角色已经同步精确条件。剩余 2 条 warning 是 `Beast Master` 和 `Wounded`：两者均已有 verified-static-text，但尚未维护攻略模板，因此继续作为 official-only 图鉴角色。

攻略资料和官方目录的引用校验：

```bash
npm run verify:catalog
```

这会把 `src/strategyData.js` 里的武器和道具名称转换为官方 `nameKey`，并检查是否能在 `data/official-catalog.json` 找到对应记录。

运行页面时，攻略生成器会把官方目录和本地化表注入推荐结果，在武器和道具卡片中显示：

- 来源包：原版或深海魔怪。
- 阶数范围：例如 `T1-T4`。
- 商店价格范围。
- 官方解锁状态和是否进入掉落池。
- 图鉴图片、官方中文名和可点击图鉴入口。
- 结构化推荐评分和理由列表，用于解释基础路线、偏好、解锁/稀有度/价格、套装、官方数值和场景模型收益。

生成器先保留手写路线推荐，再把官方目录里的全量武器/道具按 `nameKey` 扩展成补充候选。补充候选必须命中路线标签、武器套装或角色目标数值；评分理由会说明手写优先级、解锁/掉落状态、稀有度、价格、套装/数值协同、场景模型收益、机制修正和模式修正。

图鉴本地化覆盖率：

```bash
npm run localization:coverage
```

该命令会把官方目录中的唯一角色/武器/道具 `nameKey` 与 `data/official-localization.json` 对齐，列出尚未本地化维护的图鉴条目。当前角色、武器和物品均已满覆盖；后续推荐、截图识别和最优解评分都应共用这份名称数据。
