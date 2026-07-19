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
- `data/official-unlocks.json` 由 `npm run extract:unlocks` 从安装包静态 challenge / achievement 资源生成。该数据不读取玩家存档，不受本机解锁进度影响。原版 CSV 未覆盖的描述会按 `descriptionKey` 查询简中 `PHashTranslation`，并用 challenge 的 `value`、`stat`、`additional_args` 展开占位符。当前 54 条记录全部有 `verified-static-text` 简中条件。
- `data/official-unlock-pending.json` 由 `npm run unlocks:pending` 从 `data/official-unlocks.json` 的 `pending-text` 记录派生。当前清单为 0 条；后续新增但无法可靠读取的文本仍会保留 source package、官方角色 key、攻略维护状态、challenge key、数值和核验动作。
- `npm run localization:coverage` 用来检查官方图鉴里还有哪些角色、武器、道具没有进入本地化维护表。
- `npm run extract:localization` 可以重新从本机安装包生成本地化表。部分英文 translation 条目不是明文，脚本里用 `manual-override` 对已从中文包确认的关键名称做校准。
- 当前本地化表已覆盖官方目录里的 79 个武器、244 个物品和 44/64 个角色。后续如果官方目录新增条目，未确认名称要继续留在覆盖率报告中，不要凭直觉填入。
- 角色图鉴特性来自官方目录里的 stat/effect key。已知 key 会格式化成中文；仍藏在官方 `custom_arg` SubResource 里的效果只显示为“官方自定义收益”，表示资源已定位但精确内部收益还没可靠解析。
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
- 支持的触发道具会用 `calculateItemEffectDps` 估算场景 DPS、经济/成长收益或续航潜力。推荐器会优先从官方 effect 字段动态生成模型：`chance_stat_damage_effect` 会按 `dmg_when_death` / `dmg_when_pickup_gold` / `dmg_on_dodge` 区分击杀、拾取和闪避触发伤害；`gold_on_crit_kill`、`chance_double_gold`、`instant_gold_attracting`、`harvesting_growth`、`item_box_gold`、`recycling_gains`、`extra_item_in_crate`、`loot_alien_chance`、`extra_loot_aliens_next_wave`、`effect_gain_pct_gold_start_wave_limited`、`stats_end_of_wave`、`stats_next_wave`、`piercing`、`pierce_on_crit`、`items_price`、`free_rerolls`、`reroll_price` 会分别生成暴击材料、拾取双倍材料、拾取频率、收获成长、箱子材料、单次回收材料、箱子额外道具、战利品外星人、波次存钱、每波属性成长、下一波经验、贯通覆盖、暴击贯通覆盖和商店效率模型；手写 `ITEM_EFFECTS` 只作为静态计算器兜底。
- 官方 `custom_arg` 的 `EFFECT_GAIN_STAT_FOR_EVERY*` 类道具会进入保守的“官方自定义成长潜力”模型。推荐器只使用静态目录里能可靠抽到的缩放来源，例如 `Power Generator` 随移速、`Pearl` 随幸运、`Stone Skin` 随护甲放大；最终获得哪项属性仍藏在子资源里，图鉴和推荐理由都不会把它伪装成已完全解码的精确公式。
- 自定义成长潜力只在角色属性优先级明确重视该缩放来源、且第 20 关目标达到最低阈值时加分。这样 Speedy 会解释 `Power Generator` 的移速成长，Lucky 的高幸运路线可以吸收幸运来源，但普通角色不会因为都有一点移速目标而泛化推荐发电机。
- 官方道具补充候选默认展示手写关键道具外的前 20 个高分候选，让 `Crown`、`Bag`、`Recycling Machine`、`Lure`、`Adrenaline`、`Cute Monkey`、`Dangerous Bunny` 这类非手写但强协同的经济或续航道具能进入对应路线推荐。
- 每波结束属性成长只会在正向属性命中角色目标时加分。例如 `Robot Arm（机械臂）` 的官方 `stats_end_of_wave` 会在 Builder 工程路线解释为工程学每波成长；同一条目里的负面生命成长不会变成推荐加分。
- 下一波经验类道具从官方 `stats_next_wave` 里读取 `xp_gain`，再用同一批下一波敌人生命、伤害或速度字段做风险折扣。例如 `Peacock（孔雀）` 会输出“下一波经验潜力”，但只在收获路线中转成经济分；`Celery Tea（芹菜茶）` 同时有 `stats_end_of_wave` 时优先走长期每波成长解释，避免把短期冲刺写成长期收益。
- 贯通类道具从官方 `piercing` 和 `pierce_on_crit` 字段生成覆盖潜力。例如 `Bandana（头巾）` 和 `Sharp Bullet（尖头子弹）` 会按场景直线目标数估算怪潮覆盖；`Eyepatch（眼罩）` 这类暴击贯通还会按角色目标暴击率折算。该分数是覆盖修正，不当作直接伤害 DPS。
- Boss / 高生命条件伤害会读取官方 `damage_against_bosses`、`bonus_damage_against_targets_above_hp` 和 `giant_crit_damage`。`Silver Bullet（银质子弹）` 直接解释官方 Boss 加伤；`Small Fish（小鱼）` 和 `Trident（三叉戟）` 按场景高生命阶段权重估算期望收益，当前 Boss / 普通清怪 / 怪潮分别使用 50% / 25% / 20%；`Giant Belt（巨型带）` 只展示官方原始值与角色目标暴击率，因为静态安装包尚未证明它对普通敌人、精英和 Boss 的生命伤害换算，不写成精确 DPS。
- 商店效率类道具从官方 `items_price`、`free_rerolls`、`reroll_price` 字段生成经济潜力。例如 `Coupon（优惠券）` 解释物品折扣，`Dangerous Bunny（危险兔子）` 解释免费刷新，`Spyglass（望远镜）` 解释刷新折扣；这些只在收获或幸运路线中转成场景分。
- 拾取吸附类道具不会伪装成伤害 DPS，而是输出拾取频率收益。例如 `Baby Gecko` 和 `Sifd's Relic` 会按场景 `pickupRatePerSecond` 估算额外拾取机会，并给 Lucky 这类拾取触发路线机制加分。
- 击杀、暴击击杀、拾取、消耗品和闪避治疗会从官方效果 key 动态生成续航模型。例如 `Goblet（高脚杯）` 按 `heal_on_kill` 与场景击杀频率估算，`Tentacle（触手）` 会把 `heal_on_crit_kill`、自带暴击率和角色目标暴击率合并，`Cute Monkey` 按拾取材料治疗概率估算，`Lemonade` / `Weird Food` 按消耗品即时治疗估算，`Jerky` 会合并官方 `consumable_heal` 和 `consumable_heal_over_time`，`Adrenaline` 按角色目标闪避与触发概率估算；这些只输出“治疗期望/续航潜力”，不计入伤害 DPS。
- `enemy_fruit_drops` 会生成额外消耗品机会模型，例如 `Fruit Basket（果篮）` 按场景击杀频率输出额外消耗品/秒，并在 Druid 这类攻略文本明确强调水果或消耗品的路线中获得机制分。静态目录没有提供每个水果的具体治疗量，因此该模型不会伪装成生命/秒；果篮的 `-3` 生命恢复也不会产生正向续航协同。
- 回收与箱子道具保持各自的官方计量单位：`Recycling Machine（回收装置）` 的 `recycling_gains=35` 解释为每次回收额外 35 材料，不当作 35%；`Treasure Map（藏宝图）` 的 20% 和 `Pearl（珍珠）` 的 3% 分别换算成每箱 `0.20` 个随机道具与 `0.03` 个同名道具期望，不假设一局箱子数。珍珠仍同时保留官方永久幸运成长潜力。
- 战利品外星人道具使用静态机会分，不伪造材料/秒。`Lure（鱼饵）` 保留下一波 `+2` 个的官方计数；`Whistle（哨子）` 使用 `loot_alien_chance=50`，并用 `loot_alien_speed=20` 作追逐风险折扣。安装包能确认战利品外星人有掉落资源，但没有为推荐器提供稳定的每局触发次数，因此理由只展示机会、数量和风险字段。
- 诅咒经济和敌人风险道具会从官方 `gold_on_cursed_enemy_kill`、`enemy_gold_drops`、`curse_locked_items`、`stat_curse`、`number_of_enemies`、`enemy_health`、`enemy_damage` 组合出风险调整后的经济潜力。例如 `Black Flag` 会解释诅咒击杀材料潜力，`Fish Hook` 会解释锁定物品诅咒潜力；这些同样只作为经济/风险评分，不计入伤害 DPS。
- 爆炸、燃烧和结构物支持道具会从官方 `explosion_damage`、`explosion_size`、`burning_spread`、`burning_enemy_hp_percent_damage`、`structure_attack_speed`、`structures_cooldown_reduction`、`structures_can_crit` 和 turret/structure 脚本路径生成覆盖潜力。例如 `Snake` 会解释燃烧覆盖，`Dynamite` 会解释爆炸覆盖，`Turret` 会解释结构物输出；`Pile Of Books（书堆）` 会把角色目标暴击率与自带暴击率合并，按默认 2 倍暴击估算结构物期望倍率。由于官方资源里仍缺少完整炮塔/燃烧内部参数，这些是排序修正和解释，不当作精确 DPS。
- 机制修正用于表达纯 DPS 不容易覆盖的价值。例如 Lucky 路线会额外重视幸运缩放，官方 `stat_luck` 武器缩放会被解释为高幸运路线收益，Lute 的百分比伤害会被视作能放大拾取/击杀触发收益；`Cyberball` 会按官方 `dmg_when_death` 作为击杀触发、25% 幸运伤害估算，`Baby Elephant` 会按 `dmg_when_pickup_gold` 作为拾取触发估算；幽魂武器的官方击杀成长效果会给幽魂路线额外解释。
- 官方候选会读取套装和效果资源。例如幽魂路线只会吸收幽魂套装补充项，避免普通近战武器仅凭近战缩放混入；骑士路线会更容易吸收剑类/中世纪/护甲相关武器。套装命中角色 `routeTags` 时会输出 `套装修正` 解释，官方护甲缩放武器会输出防御转输出的机制修正。
- 官方属性协同只把正值或无符号的机制字段当作正向匹配；例如 `Small Fish` 的 `-3%` 攻速和 `Metal Detector（金属探测器）` 的 `-5%` 总伤害不会再产生攻速/伤害协同分。袋子和金属探测器分别通过箱子材料、拾取双倍材料的真实机制获得经济路线分。
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
- `Buccaneer（海盗）`：海军远程和距离击杀经济；已用 `CHAL_STAT_DESC` 静态模板确认达到 100% 拾取范围后解锁。

DLC 角色的官方中文名来自本机深海魔怪安装包；默认/需解锁状态已用官方目录校验。`npm run extract:unlocks` 会映射 DLC challenge 奖励角色，并按 Godot `OptimizedTranslation` 的双哈希查表规则读取未压缩简中消息。当前 54 条静态角色挑战均已得到 verified-static-text；8 个已有攻略的 DLC 解锁条件已同步到策略层。`Beast Master` 和 `Wounded` 仍是 official-only 图鉴条目，但现在会显示精确静态条件，而不是 pending 证据；是否新增其攻略模板与文本可信度分开处理。`Giant（巨人）` 当前不在 base+DLC 官方角色目录中，缺口证据记录在 `data/official-character-catalog-gaps.json`，保留为策略层待校验候选。

## Lucky（幸运星）规则

Lucky 的核心不是单纯远程伤害，而是高幸运、高拾取频率和触发类伤害。

当前维护原则：

- `Lute（琉特琴）` 在允许 DLC 时应优先显示。
- `Lute（琉特琴）` 和 `Flute（长笛）` 这类官方 `stat_luck` 缩放武器会输出 Lucky 高幸运路线的机制修正。
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
