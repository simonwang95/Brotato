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
  stat_max_hp: "最大生命",
  stat_melee_damage: "近战伤害",
  stat_percent_damage: "伤害",
  stat_ranged_damage: "远程伤害",
  stat_range: "范围",
  stat_speed: "移速",
  stat_all: "全属性",
  enemy_damage: "敌人伤害",
  enemy_health: "敌人生命",
  bounce_damage: "弹射伤害",
  damage_against_bosses: "对 Boss 伤害",
  explosion_damage: "爆炸伤害",
  free_weapon_slots: "空武器栏",
  level_upgrades_modifications: "升级选项",
  next_level_xp_needed: "升级所需经验",
  weapon_slot: "武器栏",
  xp_gain: "经验获取",
  knockback: "击退",
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
  EFFECT_LEVEL_UPGRADES_MODIFICATIONS: "升级属性选项",
  effect_gain_stat_end_of_wave: "每波结束",
  effect_starting_item: "起始物品",
  effect_knockback: "击退",
};

const CHARACTER_NAME_KEY_OVERRIDES = {
  oneArmed: "CHARACTER_ONE_ARM",
};

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
  const trigger = EFFECT_TEXT_LABELS[effect.textKey] ?? effect.textKey;
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

  if (effect.scriptPath?.includes("gain_stat_for_every_stat_effect")) {
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

export function buildCharacterCompendium(catalog) {
  return Object.values(CHARACTER_GUIDES)
    .map((character) => {
      const { cnName, archetype } = splitChineseHint(character.cnHint);
      const unlockVerified = !/待校验|待补/.test(character.unlock);
      const official = findCharacterRecord(catalog, character);
      const traits = buildCharacterTraitLines(official);

      return {
        id: character.id,
        name: character.name,
        nameKey: characterNameKey(character),
        cnName,
        archetype,
        unlock: character.unlock,
        unlockStatus: unlockVerified ? "已维护条件" : "待补精确条件",
        summary: character.summary,
        traits,
        officialFound: Boolean(official),
        sourceLabel: official ? sourceLabel(official.sourcePackage) : "未匹配官方角色资源",
      };
    })
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

export function buildCompendium(catalog, localization) {
  return {
    characters: buildCharacterCompendium(catalog),
    weapons: buildCatalogCompendium(catalog, localization, "weapon", WEAPONS),
    items: buildCatalogCompendium(catalog, localization, "item", ITEMS),
  };
}
