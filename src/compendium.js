import { CHARACTER_GUIDES, ITEMS, WEAPONS } from "./strategyData.js";
import { getOfficialNameKey, toOfficialNameKey } from "./officialCatalog.js";

const SOURCE_LABELS = {
  base: "原版",
  abyssalTerrors: "深海魔怪",
};

const SET_LABELS = {
  blade: "刀刃",
  blunt: "钝器",
  elemental: "元素",
  ethereal: "幽魂",
  explosive: "爆炸",
  gun: "枪械",
  heavy: "重型",
  legendary: "传奇",
  medical: "医疗",
  medieval: "中世纪",
  musical: "乐器",
  precise: "精准",
  primitive: "原始",
  support: "支援",
  tool: "工具",
  unarmed: "徒手",
};

const STAT_LABELS = {
  stat_armor: "护甲",
  stat_attack_speed: "攻速",
  stat_crit_chance: "暴击率",
  stat_dodge: "闪避",
  stat_elemental_damage: "元素伤害",
  stat_engineering: "工程学",
  stat_harvesting: "收获",
  stat_hp_regeneration: "生命再生",
  stat_lifesteal: "生命窃取",
  stat_luck: "幸运",
  stat_curse: "诅咒",
  stat_max_hp: "最大生命",
  stat_melee_damage: "近战伤害",
  stat_percent_damage: "伤害",
  stat_ranged_damage: "远程伤害",
  stat_range: "范围",
  stat_speed: "移速",
  stat_all: "全属性",
  enemy_damage: "敌人伤害",
  enemy_health: "敌人生命",
  enemy_gold_drops: "敌人材料掉落",
  gold_on_cursed_enemy_kill: "诅咒敌人击杀材料",
  curse_locked_items: "锁定物品诅咒概率",
  number_of_enemies: "敌人数量",
  bounce_damage: "弹射伤害",
  damage_against_bosses: "对 Boss 伤害",
  explosion_damage: "爆炸伤害",
  explosion_size: "爆炸范围",
  explode_on_hit: "命中爆炸",
  burning_spread: "燃烧传播",
  burning_enemy_hp_percent_damage: "燃烧敌人生命百分比伤害",
  burning_cooldown_reduction: "燃烧冷却缩短",
  tree_turrets: "树生成炮塔",
  structure_attack_speed: "结构物攻速",
  structures_can_crit: "结构物可暴击",
  projectiles: "投射物",
  free_weapon_slots: "空武器栏",
  items_price: "物品价格",
  level_upgrades_modifications: "升级选项",
  minimum_weapons_in_shop: "商店保底武器",
  next_level_xp_needed: "升级所需经验",
  weapon_slot: "武器栏",
  weapon_slot_upgrades: "武器栏升级波次",
  xp_gain: "经验获取",
  knockback: "击退",
  structure: "结构物",
  pet: "宠物",
  living_tree: "树",
  percent_player_missing_health: "已损失生命百分比",
  consumable_heal: "消耗品治疗",
  consumable_heal_over_time: "消耗品持续治疗",
  heal_when_pickup_gold: "拾取材料治疗概率",
  lose_hp_per_second: "每秒失去生命",
  die_in_one_hit: "受到一次伤害即死亡",
  beast_master_effect: "驯兽师宠物机制",
  boosted_wanted_item_tag: "提高宠物标签出现率",
  all_weapons_count_for_sets: "所有武器计入套装",
  no_duplicate_weapons: "不能持有重复武器",
  item_lootworm: "战利品虫",
  item_tardigrade: "水熊虫",
  item_turret: "炮塔",
};

const PERCENT_STATS = new Set([
  "stat_attack_speed",
  "stat_crit_chance",
  "stat_dodge",
  "stat_lifesteal",
  "stat_percent_damage",
  "stat_speed",
]);

const EFFECT_TEXT_LABELS = {
  EFFECT_DEAL_DMG_WHEN_DEATH: "击杀敌人时",
  EFFECT_DEAL_DMG_WHEN_PICKUP_GOLD: "拾取材料时",
  EFFECT_INCREASE_DAMAGE_RECEIVED: "使目标受到伤害提高",
  EFFECT_GAIN_STAT_FOR_FREE_WEAPON_SLOTS: "每个空武器栏",
  EFFECT_GAIN_STAT_FOR_EVERY_STAT: "每点属性",
  EFFECT_GAIN_STAT_FOR_EVERY_PERM_STAT: "每点永久属性",
  EFFECT_GAIN_STAT_FOR_EVERY_PERCENT_PLAYER_MISSING_HEALTH: "每点已损失生命百分比",
  EFFECT_GAIN_STAT_FOR_EVERY_TREE: "每棵树",
  EFFECT_GAIN_STAT_FOR_EVERY_DIFFERENT_STAT: "每种不同属性",
  EFFECT_GOLD_ON_CURSED_ENEMY_KILL: "诅咒敌人击杀材料",
  EFFECT_CURSE_LOCKED_ITEMS: "锁定物品诅咒概率",
  EFFECT_PROJECTILES: "投射物",
  EFFECT_STRUCTURES_CAN_CRIT: "结构物可暴击",
  EFFECT_TREE_TURRET: "树生成炮塔",
  EFFECT_LEVEL_UPGRADES_MODIFICATIONS: "升级属性选项",
  EFFECT_BEAST_MASTER_EFFECT: "驯兽师宠物机制",
  EFFECT_DIE_IN_ONE_HIT: "受到一次伤害即死亡",
  EFFECT_HEAL_WHEN_DODGE: "闪避时治疗",
  EFFECT_WEAPON_SLOT_UPGRADES: "武器栏升级波次",
  EFFECT_ONE_WEAPON_SLOT_INITIAL_LIMIT: "初始武器栏限制",
  WOUNDED_ITEMS_EXPLANATION: "受伤者道具机制",
  effect_gain_stat_end_of_wave: "每波结束",
  effect_starting_item: "起始物品",
  effect_knockback: "击退",
  effect_no_weapons: "不能持有武器",
  effect_minimum_weapon_in_shop: "商店保底武器",
  effect_consumable_heal: "消耗品治疗",
  effect_consumable_heal_over_time: "消耗品持续治疗",
  effect_heal_when_pickup_gold: "拾取材料治疗概率",
  effect_lose_hp_per_second: "每秒失去生命",
  effect_enemy_gold_drops: "敌人材料掉落",
  effect_chance_explode_on_hit: "命中爆炸",
  effect_burning_spread: "燃烧传播",
  effect_burning_enemy_hp_percent_damage: "燃烧敌人生命百分比伤害",
  effect_burning_cooldown_reduction: "燃烧冷却缩短",
  effect_structures_cooldown_reduction: "结构物冷却缩短",
  effect_builder_turret_alt: "建造者炮塔工程缩放",
  effect_builder_turret_upgrade: "建造者炮塔升级",
  effect_turret: "炮塔",
  effect_turret_flame: "燃烧炮塔",
  effect_turret_healing: "医疗炮塔",
  effect_turret_laser: "激光炮塔",
  effect_turret_rocket: "爆炸炮塔",
  effect_landmines: "地雷",
  effect_garden: "花园",
  effect_tyler: "泰勒",
  effect_wandering_bot: "流浪机器人",
};

const BINARY_EFFECT_KEYS = new Set(["die_in_one_hit", "beast_master_effect"]);

const CHARACTER_NAME_KEY_OVERRIDES = {
  oneArmed: "CHARACTER_ONE_ARM",
};

const UNLOCK_CHARACTER_ID_ALIASES = {
  oneArmed: "oneArm",
};

function camelIdFromCatalogId(id) {
  return String(id)
    .replace(/^character_/, "")
    .replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
}

function displayNameFromNameKey(nameKey) {
  return String(nameKey)
    .replace(/^CHARACTER_/, "")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined))];
}

function rangeLabel(values, format = (value) => String(value)) {
  const cleanValues = unique(values).filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return "未知";

  const min = Math.min(...cleanValues);
  const max = Math.max(...cleanValues);
  return min === max ? format(min) : `${format(min)}-${format(max)}`;
}

function sourceLabel(sourcePackage) {
  return SOURCE_LABELS[sourcePackage] ?? sourcePackage ?? "未知来源";
}

function boolStateLabel(values, yesLabel, noLabel, mixedLabel, unknownLabel = "未知") {
  const cleanValues = unique(values).filter((value) => typeof value === "boolean");
  if (!cleanValues.length) return unknownLabel;
  if (cleanValues.length > 1) return mixedLabel;
  return cleanValues[0] ? yesLabel : noLabel;
}

function setIdFromPath(path) {
  const match = String(path).match(/sets\/([^/]+)\//);
  return match?.[1] ?? null;
}

function setLabelFromId(setId) {
  return SET_LABELS[String(setId).replace(/^set_/, "")] ?? setId ?? "未知套装";
}

function statLabel(stat) {
  return STAT_LABELS[stat] ?? stat ?? "未知属性";
}

function effectTextLabel(textKey) {
  if (!textKey || textKey === "[EMPTY]") return "";
  return EFFECT_TEXT_LABELS[textKey] ?? textKey;
}

function signedNumber(value) {
  if (!Number.isFinite(value)) return "未知";
  return value > 0 ? `+${value}` : String(value);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "未知";
  return `${Math.round(value * 100)}%`;
}

function formatStatValue(stat, value) {
  const suffix = PERCENT_STATS.has(stat) ? "%" : "";
  return `${signedNumber(value)}${suffix}`;
}

function formatCooldown(frames) {
  if (!Number.isFinite(frames)) return "未知";
  return `${frames} 帧 / ${(frames / 60).toFixed(2)} 秒`;
}

function formatCompactCooldown(frames) {
  if (!Number.isFinite(frames)) return "";
  return `${frames}帧 (${(frames / 60).toFixed(2)}秒)`;
}

function formatCustomScalingEffect(effect, trigger) {
  const scaled = statLabel(effect.statScaled);
  const count = Number.isFinite(effect.nbStatScaled) ? effect.nbStatScaled : 1;

  if (effect.textKey === "EFFECT_GAIN_STAT_FOR_EVERY_PERM_STAT") {
    return `每 ${count} 点永久${scaled}：官方自定义收益`;
  }

  if (effect.textKey === "EFFECT_GAIN_STAT_FOR_EVERY_PERCENT_PLAYER_MISSING_HEALTH") {
    return `每 ${count} 点${scaled}：官方自定义收益`;
  }

  if (effect.textKey === "EFFECT_GAIN_STAT_FOR_EVERY_TREE") {
    return `每 ${count} 棵${scaled}：官方自定义收益`;
  }

  if (effect.textKey === "EFFECT_GAIN_STAT_FOR_EVERY_STAT") {
    return `每 ${count} 点${scaled}：官方自定义收益`;
  }

  return `${trigger || `每 ${count} 点${scaled}`}：官方自定义收益`;
}

function formatTierSeries(records, getter, formatter = (value) => String(value)) {
  return records
    .filter((record) => getter(record) !== null && getter(record) !== undefined)
    .map((record) => {
      const value = formatter(getter(record), record);
      return value ? `T${record.tier + 1} ${value}` : "";
    })
    .filter(Boolean)
    .join(" / ");
}

function formatScalingStats(stats) {
  if (!stats?.length) return "";
  return stats
    .map((scaling) => `${formatPercent(scaling.value)} ${statLabel(scaling.stat)}`)
    .join("，");
}

function formatEffectDetail(effect) {
  const trigger = effectTextLabel(effect.textKey);
  const keyLabel = statLabel(effect.key);

  if (effect.scriptPath?.includes("class_bonus_effect")) {
    const setLabel = setLabelFromId(effect.setId);
    const stat = statLabel(effect.statDisplayedName);
    return `${setLabel}套装：${stat} ${signedNumber(effect.value)}%`;
  }

  if (effect.scriptPath?.includes("stat_gains_modification_effect")) {
    const stats = effect.statsModified?.length
      ? effect.statsModified.map(statLabel).join("、")
      : statLabel(effect.statDisplayed);
    return `${stats} 获取 ${signedNumber(effect.value)}%`;
  }

  if (
    effect.scriptPath?.includes("gain_stat_for_every_stat_effect") ||
    effect.scriptPath?.includes("custom_arg.gd")
  ) {
    if (!effect.key) {
      return formatCustomScalingEffect(effect, trigger);
    }
    const scaled = statLabel(effect.statScaled);
    return `${trigger || `每 ${effect.nbStatScaled ?? 1} ${scaled}`}：${statLabel(effect.key)} ${signedNumber(effect.value)}%`;
  }

  if (effect.scriptPath?.includes("chance_stat_damage_effect")) {
    const chance = Number.isFinite(effect.chance) ? `${effect.chance}% 概率` : "概率触发";
    return `${trigger || "触发时"}：${chance}，造成 ${effect.value}% ${keyLabel} 的伤害`;
  }

  if (effect.customKey === "enemy_percent_damage_taken") {
    return `${trigger || "命中目标"} ${signedNumber(effect.value)}%`;
  }

  if (effect.key) {
    const value = formatStatValue(effect.key, effect.value);
    if (effect.customKey === "starting_weapon") return `起始武器：${effect.key}`;
    if (effect.customKey === "starting_item") return `起始物品：${keyLabel} ${signedNumber(effect.value)}`;
    if (BINARY_EFFECT_KEYS.has(effect.key)) return keyLabel;
    if (trigger && Number.isFinite(effect.value) && effect.value === 0) return trigger;
    if (effect.customKey === "stats_end_of_wave") {
      return `${trigger || "每波结束"}：${keyLabel} ${value}`;
    }
    if (trigger === keyLabel) return `${keyLabel} ${value}`;
    return trigger && trigger !== effect.textKey
      ? `${trigger}：${keyLabel} ${value}`
      : `${keyLabel} ${value}`;
  }

  if (effect.customKey) {
    return `${effect.customKey} ${signedNumber(effect.value)}`;
  }

  if (trigger) return trigger;

  return effect.scriptPath ? effect.scriptPath.split("/").at(-1) : "未解析效果";
}

function buildEffectLines(records) {
  const lines = records.flatMap((record) =>
    (record.effects ?? []).map((effect) => {
      const label = formatEffectDetail(effect);
      return `T${record.tier + 1} ${label}`;
    }),
  );
  return unique(lines);
}

function buildWeaponAttributeLines(records) {
  const statRecords = records.filter((record) => record.stats);
  if (!statRecords.length) return buildEffectLines(records);

  const lines = [
    ["伤害", formatTierSeries(statRecords, (record) => record.stats.damage)],
    ["冷却", formatTierSeries(statRecords, (record) => record.stats.cooldown, formatCooldown)],
    [
      "暴击",
      formatTierSeries(
        statRecords,
        (record) => record.stats.crit_chance,
        (value, record) => `${formatPercent(value)} x${record.stats.crit_damage}`,
      ),
    ],
    ["范围", formatTierSeries(statRecords, (record) => record.stats.max_range)],
    ["击退", formatTierSeries(statRecords, (record) => record.stats.knockback)],
    [
      "缩放",
      formatTierSeries(statRecords, (record) => record.stats.scalingStats, formatScalingStats),
    ],
    ["投射物", formatTierSeries(statRecords, (record) => record.stats.nb_projectiles)],
    [
      "穿透",
      formatTierSeries(
        statRecords,
        (record) => record.stats.piercing,
        (value, record) =>
          `${value}，伤害保留 ${formatPercent(1 - (record.stats.piercing_dmg_reduction ?? 0))}`,
      ),
    ],
    [
      "弹射",
      formatTierSeries(
        statRecords,
        (record) => record.stats.bounce,
        (value, record) =>
          `${value}，伤害保留 ${formatPercent(1 - (record.stats.bounce_dmg_reduction ?? 0))}`,
      ),
    ],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}：${value}`);

  return [...lines, ...buildEffectLines(records)];
}

function buildWeaponTierRows(records) {
  return records
    .filter((record) => record.stats)
    .sort((left, right) => left.tier - right.tier)
    .map((record) => {
      const { stats } = record;
      return {
        tier: `T${record.tier + 1}`,
        price: Number.isFinite(record.value) ? String(record.value) : "",
        damage: Number.isFinite(stats.damage) ? String(stats.damage) : "",
        cooldown: formatCompactCooldown(stats.cooldown),
        crit:
          Number.isFinite(stats.crit_chance) && Number.isFinite(stats.crit_damage)
            ? `${formatPercent(stats.crit_chance)} x${stats.crit_damage}`
            : "",
        range: Number.isFinite(stats.max_range) ? String(stats.max_range) : "",
        knockback: Number.isFinite(stats.knockback) ? String(stats.knockback) : "",
        scaling: formatScalingStats(stats.scalingStats),
        projectiles: Number.isFinite(stats.nb_projectiles) ? String(stats.nb_projectiles) : "",
        piercing: Number.isFinite(stats.piercing)
          ? `${stats.piercing} / ${formatPercent(1 - (stats.piercing_dmg_reduction ?? 0))}`
          : "",
        bounce: Number.isFinite(stats.bounce)
          ? `${stats.bounce} / ${formatPercent(1 - (stats.bounce_dmg_reduction ?? 0))}`
          : "",
      };
    });
}

function buildItemAttributeLines(records) {
  const lines = buildEffectLines(records);
  return lines.length ? lines : ["待从效果资源解析具体数值"];
}

function characterNameKey(character) {
  return CHARACTER_NAME_KEY_OVERRIDES[character.id] ?? toOfficialNameKey("CHARACTER", character.name);
}

function findCharacterRecord(catalog, character) {
  const nameKey = characterNameKey(character);
  return (catalog?.records ?? []).find(
    (record) => record.kind === "character" && record.nameKey === nameKey,
  );
}

function buildUnlockRecordIndex(unlocks) {
  return new Map((unlocks?.records ?? []).map((record) => [record.characterId, record]));
}

function unlockRecordForCharacterId(unlockRecords, characterId) {
  return unlockRecords.get(characterId) ?? unlockRecords.get(UNLOCK_CHARACTER_ID_ALIASES[characterId]);
}

function buildUnlockEvidenceLines(record) {
  if (!record) return [];

  const staticFields = [
    `challenge=${record.challengeId}`,
    `descriptionKey=${record.descriptionKey}`,
    `value=${record.value}`,
    record.stat ? `stat=${record.stat}` : "",
    record.additionalArgs && record.additionalArgs !== "[  ]"
      ? `additionalArgs=${record.additionalArgs}`
      : "",
  ].filter(Boolean);

  if (record.extractionStatus === "verified-static-text") {
    return [
      record.zhDescription ? `官方静态条件：${record.zhDescription}` : "",
      staticFields.length ? `静态字段：${staticFields.join("，")}` : "",
    ].filter(Boolean);
  }

  return [
    record.pendingReason ?? "已定位静态 challenge，但精确条件文本仍待校验。",
    staticFields.length ? `静态字段：${staticFields.join("，")}` : "",
  ].filter(Boolean);
}

function buildOfficialUnlockText(official, unlockRecord) {
  if (unlockRecord?.extractionStatus === "verified-static-text" && unlockRecord.zhDescription) {
    return `官方静态条件：${unlockRecord.zhDescription}`;
  }

  if (unlockRecord?.extractionStatus === "pending-text") {
    return "官方静态 challenge 已定位，具体条件文本待校验。";
  }

  if (official?.unlockedByDefault === true) return "官方目录显示默认解锁。";
  if (official?.unlockedByDefault === false) return "官方目录显示需解锁，具体条件待补。";
  return "官方目录解锁状态未知。";
}

function buildCharacterTraitLines(record) {
  const lines = (record?.effects ?? []).map(formatEffectDetail);
  return unique(lines.filter(Boolean));
}

function splitChineseHint(cnHint) {
  const [cnName = "", ...rest] = String(cnHint).split("，");
  return {
    cnName,
    archetype: rest.join("，"),
  };
}

function buildStrategyIndex(kind, entries) {
  return Object.values(entries).reduce((index, entry) => {
    index.set(getOfficialNameKey(kind, entry), entry);
    return index;
  }, new Map());
}

function groupCatalogRecords(catalog, kind) {
  return (catalog?.records ?? [])
    .filter((record) => record.kind === kind)
    .reduce((groups, record) => {
      if (!groups.has(record.nameKey)) groups.set(record.nameKey, []);
      groups.get(record.nameKey).push(record);
      return groups;
    }, new Map());
}

function summarizeCatalogRecordGroup(nameKey, records, localization, strategyEntry) {
  const localized = localization?.entries?.[nameKey];
  const firstRecord = records[0];
  const sources = unique(records.map((record) => record.sourcePackage));
  const setIds = unique(records.flatMap((record) => record.setPaths ?? []).map(setIdFromPath));
  const effectPaths = unique(records.flatMap((record) => record.effectPaths ?? []));
  const cursedValues = unique(records.map((record) => record.isCursed));

  return {
    id: nameKey,
    nameKey,
    enName: localized?.enName ?? strategyEntry?.name ?? nameKey,
    cnName: localized?.cnName ?? strategyEntry?.cnName ?? "待本地化",
    localizationSource: localized?.source ?? "missing",
    iconResourcePath: firstRecord?.iconResourcePath ?? null,
    expectedImageAssetPath: firstRecord?.expectedImageAssetPath ?? null,
    imageAssetPath: firstRecord?.imageAssetPath ?? null,
    sourcePackages: sources,
    sourceLabel: sources.map(sourceLabel).join(" / "),
    tierLabel: rangeLabel(records.map((record) => record.tier), (tier) => `T${tier + 1}`),
    valueLabel: rangeLabel(records.map((record) => record.value), (value) => `${value}`),
    unlockLabel: boolStateLabel(
      records.map((record) => record.unlockedByDefault),
      "默认解锁",
      "需解锁",
      "解锁状态混合",
    ),
    lootLabel: boolStateLabel(
      records.map((record) => record.canBeLooted),
      "可掉落",
      "不进掉落池",
      "掉落状态混合",
      "掉落状态未知",
    ),
    setLabels: setIds.map((setId) => SET_LABELS[setId] ?? setId),
    effectCount: effectPaths.length,
    recordCount: records.length,
    isCursedLabel: boolStateLabel(cursedValues, "可诅咒", "普通", "诅咒状态混合", "诅咒状态未知"),
    curseFactorLabel: rangeLabel(records.map((record) => record.curseFactor)),
    strategyEntry,
    strategyUnlock: strategyEntry?.unlock ?? "未在策略层维护具体条件",
    strategyStatNote: strategyEntry?.statNote ?? strategyEntry?.role ?? strategyEntry?.type ?? "",
    strategyType: strategyEntry?.type ?? strategyEntry?.role ?? "",
    strategyTags: strategyEntry?.tags ?? [],
    detailedAttributes:
      records[0]?.kind === "weapon"
        ? buildWeaponAttributeLines(records)
        : buildItemAttributeLines(records),
    weaponTierRows: records[0]?.kind === "weapon" ? buildWeaponTierRows(records) : [],
    tierEffectLines: records[0]?.kind === "weapon" ? buildEffectLines(records) : [],
  };
}

export function buildCharacterCompendium(catalog, localization, unlocks) {
  const unlockRecords = buildUnlockRecordIndex(unlocks);
  const maintainedNameKeys = new Set(Object.values(CHARACTER_GUIDES).map(characterNameKey));
  const officialOnlyCharacters = (catalog?.records ?? [])
    .filter((record) => record.kind === "character" && !maintainedNameKeys.has(record.nameKey))
    .map((official) => {
      const id = camelIdFromCatalogId(official.id);
      const unlockRecord = unlockRecords.get(id);
      const localized = localization?.entries?.[official.nameKey];
      const name = localized?.enName ?? displayNameFromNameKey(official.nameKey);
      const unlockVerified = unlockRecord?.extractionStatus === "verified-static-text";

      return {
        id,
        name,
        nameKey: official.nameKey,
        cnName: localized?.cnName ?? "待本地化",
        archetype: "官方角色目录待补攻略",
        unlock: buildOfficialUnlockText(official, unlockRecord),
        unlockStatus: unlockVerified ? "已抽取静态条件" : "待补精确条件",
        unlockEvidenceStatus: unlockRecord?.extractionStatus ?? "missing",
        unlockEvidenceLines: buildUnlockEvidenceLines(unlockRecord),
        summary: "官方角色目录已抽取；策略路线、中文名和攻略模板仍待维护。",
        traits: buildCharacterTraitLines(official),
        officialFound: true,
        officialOnly: true,
        sourceLabel: sourceLabel(official.sourcePackage),
        iconResourcePath: official.iconResourcePath ?? null,
        expectedImageAssetPath: official.expectedImageAssetPath ?? null,
        imageAssetPath: official.imageAssetPath ?? null,
      };
    });

  return [
    ...Object.values(CHARACTER_GUIDES).map((character) => {
      const { cnName, archetype } = splitChineseHint(character.cnHint);
      const unlockVerified = !/待校验|待补/.test(character.unlock);
      const official = findCharacterRecord(catalog, character);
      const traits = buildCharacterTraitLines(official);
      const unlockRecord = unlockRecordForCharacterId(unlockRecords, character.id);

      return {
        id: character.id,
        name: character.name,
        nameKey: characterNameKey(character),
        cnName,
        archetype,
        unlock: character.unlock,
        unlockStatus: unlockVerified ? "已维护条件" : "待补精确条件",
        unlockEvidenceStatus: unlockRecord?.extractionStatus ?? "missing",
        unlockEvidenceLines: buildUnlockEvidenceLines(unlockRecord),
        summary: character.summary,
        traits,
        officialFound: Boolean(official),
        sourceLabel: official ? sourceLabel(official.sourcePackage) : "未匹配官方角色资源",
        iconResourcePath: official?.iconResourcePath ?? null,
        expectedImageAssetPath: official?.expectedImageAssetPath ?? null,
        imageAssetPath: official?.imageAssetPath ?? null,
      };
    }),
    ...officialOnlyCharacters,
  ]
    .sort((left, right) => left.name.localeCompare(right.name, "en"));
}

export function buildCatalogCompendium(catalog, localization, kind, strategyEntries) {
  const groups = groupCatalogRecords(catalog, kind);
  const strategyIndex = buildStrategyIndex(kind, strategyEntries);

  return [...groups.entries()]
    .map(([nameKey, records]) =>
      summarizeCatalogRecordGroup(nameKey, records, localization, strategyIndex.get(nameKey)),
    )
    .sort((left, right) => {
      const sourceCompare = left.sourceLabel.localeCompare(right.sourceLabel, "zh-CN");
      if (sourceCompare !== 0) return sourceCompare;
      return left.cnName.localeCompare(right.cnName, "zh-CN");
    });
}

export function buildCompendium(catalog, localization, unlocks) {
  return {
    characters: buildCharacterCompendium(catalog, localization, unlocks),
    weapons: buildCatalogCompendium(catalog, localization, "weapon", WEAPONS),
    items: buildCatalogCompendium(catalog, localization, "item", ITEMS),
  };
}
