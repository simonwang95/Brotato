import {
  CHARACTER_GUIDES,
  DANGER_LEVELS,
  DLC_OPTIONS,
  ITEMS,
  MODES,
  PREFERENCES,
  STAT_LABELS,
  UNLOCK_OPTIONS,
  WEAPONS,
} from "./strategyData.js";
import { summarizeOfficialRecords } from "./officialCatalog.js";
import { calculateItemEffectDps, calculateScenarioDps } from "./scenarioCalculator.js";

const WEAPON_SET_LABELS = {
  blade: "剑类",
  blunt: "钝器",
  ethereal: "幽魂",
  explosive: "爆炸",
  fire: "火焰",
  gun: "枪械",
  heavy: "重型",
  legendary: "传奇",
  medical: "医疗",
  medieval: "中世纪",
  musical: "乐器",
  naval: "海军",
  precise: "精准",
  primitive: "原始",
  support: "辅助",
  tool: "工具",
  unarmed: "徒手",
};

const OFFICIAL_STAT_TO_PLAN_STAT = {
  stat_max_hp: "maxHp",
  stat_hp_regeneration: "hpRegen",
  stat_lifesteal: "lifeSteal",
  stat_armor: "armor",
  stat_dodge: "dodge",
  stat_percent_damage: "damagePercent",
  stat_attack_speed: "attackSpeed",
  stat_crit_chance: "critChance",
  stat_melee_damage: "meleeDamage",
  stat_ranged_damage: "rangedDamage",
  stat_elemental_damage: "elementalDamage",
  stat_engineering: "engineering",
  stat_range: "range",
  stat_speed: "speed",
  stat_harvesting: "harvesting",
  harvesting_growth: "harvesting",
  item_box_gold: "harvesting",
  effect_gain_pct_gold_start_wave_limited: "harvesting",
  stat_luck: "luck",
  consumable_heal: "hpRegen",
  consumable_heal_over_time: "hpRegen",
  heal_when_pickup_gold: "hpRegen",
  heal_on_dodge: "hpRegen",
  stat_curse: "curse",
  gold_on_cursed_enemy_kill: "harvesting",
  enemy_gold_drops: "harvesting",
  curse_locked_items: "curse",
  number_of_enemies: "harvesting",
  stat_all: "damagePercent",
  stat_damage: "damagePercent",
  enemy_percent_damage_taken: "damagePercent",
  explosion_damage: "damagePercent",
  damage_against_bosses: "damagePercent",
  xp_gain: "harvesting",
};

const FOCUS_ROUTE_TAGS = new Set([
  "blade",
  "blunt",
  "engineering",
  "elemental",
  "ethereal",
  "explosive",
  "gun",
  "heavy",
  "medical",
  "medieval",
  "musical",
  "naval",
  "precise",
  "primitive",
  "support",
  "tool",
  "unarmed",
]);

const ITEM_EFFECT_NAME_KEYS = {
  ITEM_CYBERBALL: "cyberball",
  ITEM_BABY_ELEPHANT: "babyElephant",
  ITEM_BABY_WITH_A_BEARD: "babyWithABeard",
  ITEM_HUNTING_TROPHY: "huntingTrophy",
  ITEM_METAL_DETECTOR: "metalDetector",
  ITEM_CROWN: "crown",
  ITEM_BAG: "bag",
  ITEM_PIGGY_BANK: "piggyBank",
  ITEM_BABY_GECKO: "babyGecko",
  ITEM_SIFDS_RELIC: "sifdsRelic",
};

export function getAvailableCharacters() {
  return Object.values(CHARACTER_GUIDES).map(({ id, name, cnHint, unlock }) => ({
    id,
    name,
    cnHint,
    unlock,
  }));
}

export function getAvailableModes() {
  return Object.values(MODES);
}

export function getAvailableDangerLevels() {
  return Object.values(DANGER_LEVELS);
}

export function getAvailableDlcOptions() {
  return Object.values(DLC_OPTIONS);
}

export function getAvailableUnlockOptions() {
  return Object.values(UNLOCK_OPTIONS);
}

export function getAvailablePreferences() {
  return Object.values(PREFERENCES).map(({ id, label }) => ({ id, label }));
}

function resolveWeapon(entry, officialCatalog) {
  const weapon = WEAPONS[entry.weaponId];
  if (!weapon) {
    throw new Error(`Unknown weapon id: ${entry.weaponId}`);
  }
  const official = summarizeOfficialRecords(officialCatalog, "weapon", weapon);

  return {
    ...entry,
    weapon: {
      ...weapon,
      statNote: weapon.statNote ?? inferWeaponStatNote(weapon),
      setNote: weapon.setNote ?? inferWeaponSetNote(weapon, official),
    },
    official,
  };
}

function resolveItem(entry, officialCatalog) {
  const item = ITEMS[entry.itemId];
  if (!item) {
    throw new Error(`Unknown item id: ${entry.itemId}`);
  }

  return {
    ...entry,
    item: {
      ...item,
      statNote: item.statNote ?? inferItemStatNote(item),
    },
    official: summarizeOfficialRecords(officialCatalog, "item", item),
  };
}

function displayNameFromNameKey(nameKey) {
  return nameKey
    .replace(/^(WEAPON|ITEM)_/, "")
    .toLowerCase()
    .split("_")
    .map((word) => {
      if (word === "smg") return "SMG";
      if (word === "dex") return "DEX";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function localizationForNameKey(localization, nameKey) {
  return localization?.entries?.[nameKey] ?? null;
}

function uniqueOfficialNameKeys(catalog, kind) {
  return [
    ...new Set(
      (catalog?.records ?? [])
        .filter((record) => record.kind === kind && record.nameKey)
        .map((record) => record.nameKey),
    ),
  ];
}

function officialSetTags(official) {
  return [
    ...new Set(
      (official?.records ?? [])
        .flatMap((record) => record.setPaths ?? [])
        .map(setIdFromPath)
        .filter(Boolean)
        .map((setId) => {
          if (setId === "gun") return "Gun";
          if (setId === "tool") return "Engineering";
          return setId.charAt(0).toUpperCase() + setId.slice(1);
        }),
    ),
  ];
}

function officialStatTags(official) {
  const stats = collectOfficialStats(official);
  const tags = [];
  if (stats.includes("meleeDamage")) tags.push("Melee");
  if (stats.includes("rangedDamage")) tags.push("Ranged");
  if (stats.includes("elementalDamage")) tags.push("Elemental");
  if (stats.includes("engineering")) tags.push("Engineering");
  if (stats.includes("critChance")) tags.push("Precise");
  if (stats.includes("luck")) tags.push("Luck");
  if (stats.includes("harvesting")) tags.push("Economy");
  if (stats.includes("curse")) tags.push("Curse");
  return tags;
}

function buildOfficialWeaponCandidate(nameKey, options, plan, routeTags) {
  const enName = localizationForNameKey(options.officialLocalization, nameKey)?.enName ?? displayNameFromNameKey(nameKey);
  const cnName = localizationForNameKey(options.officialLocalization, nameKey)?.cnName ?? "";
  const official = summarizeOfficialRecords(options.officialCatalog, "weapon", {
    name: enName,
    officialNameKey: nameKey,
  });
  const tags = [...new Set([...officialSetTags(official), ...officialStatTags(official)])];
  const weapon = {
    id: `official:${nameKey}`,
    name: enName,
    cnName,
    type: tags.length ? tags.join(" / ") : "官方武器候选",
    tags,
    unlock: official.display,
    statNote: `官方图鉴候选；${collectOfficialStats(official)
      .map((statId) => STAT_LABELS[statId] ?? statId)
      .join(" / ") || "详细数值见图鉴"}`,
    setNote: inferWeaponSetNote({ id: nameKey, tags }, official),
  };

  return {
    officialCandidate: true,
    priority: "官方候选",
    reason: "由官方图鉴补入候选池，按角色目标数值、套装和获取状态参与评分。",
    routeTags,
    weapon,
    official,
  };
}

function buildOfficialItemCandidate(nameKey, options, plan, routeTags) {
  const enName = localizationForNameKey(options.officialLocalization, nameKey)?.enName ?? displayNameFromNameKey(nameKey);
  const cnName = localizationForNameKey(options.officialLocalization, nameKey)?.cnName ?? "";
  const official = summarizeOfficialRecords(options.officialCatalog, "item", {
    name: enName,
    officialNameKey: nameKey,
  });
  const statLabels = collectOfficialStats(official).map((statId) => STAT_LABELS[statId] ?? statId);
  const item = {
    id: `official:${nameKey}`,
    name: enName,
    cnName,
    role: statLabels.length ? statLabels.join(" / ") : "官方道具候选",
    tags: officialStatTags(official),
    unlock: official.display,
    statNote: statLabels.length
      ? `官方图鉴候选；影响 ${statLabels.join(" / ")}。`
      : "官方图鉴候选；详细属性见图鉴。",
  };

  return {
    officialCandidate: true,
    priority: "官方候选",
    reason: "由官方图鉴补入候选池，按角色目标数值、稀有度和获取状态参与评分。",
    routeTags,
    item,
    official,
  };
}

function inferWeaponStatNote(weapon) {
  const tags = new Set(weapon.tags ?? []);
  const parts = [];

  if (tags.has("Engineering")) parts.push("工程学");
  if (tags.has("Elemental")) parts.push("元素伤害");
  if (tags.has("Ranged") || tags.has("Gun")) parts.push("远程伤害");
  if (tags.has("Melee") || tags.has("Unarmed")) parts.push("近战伤害");
  if (tags.has("Precise")) parts.push("暴击率");
  if (tags.has("Luck")) parts.push("幸运");
  if (weapon.id === "slingshot") parts.push("弹射收益");
  if (weapon.id === "pruner") parts.push("收获和续航");

  if (!parts.length) parts.push(weapon.type);
  return `主要看 ${parts.join(" / ")}；攻速、总伤害和生存阈值仍需按角色补齐。`;
}

function setIdFromPath(path) {
  return path?.match(/sets\/([^/]+)\/\1_set_data\.tres$/)?.[1] ?? null;
}

function weaponTagSets(weapon) {
  return (weapon.tags ?? [])
    .map((tag) => tag.toLowerCase())
    .filter((tag) => WEAPON_SET_LABELS[tag]);
}

function inferWeaponSetIds(weapon, official) {
  const officialSetIds =
    official?.records
      ?.flatMap((record) => record.setPaths ?? [])
      .map(setIdFromPath)
      .filter(Boolean) ?? [];

  return [...new Set([...officialSetIds, ...weaponTagSets(weapon)])];
}

function inferWeaponSetNote(weapon, official) {
  const setIds = inferWeaponSetIds(weapon, official);
  if (!setIds.length) return "";

  const labels = setIds.map((setId) => WEAPON_SET_LABELS[setId] ?? setId);
  const joinedLabels = labels.join(" / ");

  if (setIds.includes("ethereal")) {
    return `${joinedLabels}套装；幽魂系列偏击杀成长，适合闪避和后期属性滚雪球路线。`;
  }
  if (setIds.includes("blade") && setIds.includes("medieval")) {
    return `${joinedLabels}套装；同时吃剑类和中世纪套装，适合骑士等护甲近战路线。`;
  }
  return `${joinedLabels}套装；同套装武器越集中，前期成型和属性收益越稳定。`;
}

function inferItemStatNote(item) {
  const role = item.role ?? "";
  if (/幸运|拾取/.test(role)) return "重点影响幸运、拾取频率或触发类伤害。";
  if (/工程|结构/.test(role)) return "重点影响工程学、结构物密度或结构物输出。";
  if (/诅咒/.test(role)) return "重点影响诅咒敌人、诅咒道具或以风险换取奖励的收益。";
  if (/海军/.test(role)) return "重点影响海军路线的套装集中度、材料节奏或输出质量。";
  if (/弹射/.test(role)) return "重点影响弹射次数、怪群覆盖和远程弹体的二次命中。";
  if (/贯通/.test(role)) return "重点影响贯通、穿透怪群后的实际命中数和远程覆盖。";
  if (/范围/.test(role)) return "重点影响范围、先手输出距离和走位安全窗口。";
  if (/远程/.test(role)) return "重点影响远程伤害、命中窗口和枪械路线输出质量。";
  if (/暴击/.test(role)) return "重点影响暴击率、暴击收益或暴击经济。";
  if (/总伤害|输出/.test(role)) return "重点影响伤害百分比、击杀速度和精英/Boss 输出压力。";
  if (/移速/.test(role)) return "重点影响移速、走位空间和生存容错。";
  if (/经济|折扣|收获/.test(role)) return "重点影响经济、商店效率或收获成长。";
  if (/回复|续航|消耗品/.test(role)) return "重点影响回复、续航或容错。";
  if (/燃烧|点燃/.test(role)) return "重点影响元素伤害、燃烧覆盖和传播。";
  return `定位：${role || "通用补强"}。`;
}

function resolveOptions(options) {
  const danger = DANGER_LEVELS[options.dangerLevelId] ?? DANGER_LEVELS.danger0;
  const dlc = DLC_OPTIONS[options.dlcOptionId] ?? DLC_OPTIONS.allowDlc;
  const unlock = UNLOCK_OPTIONS[options.unlockOptionId] ?? UNLOCK_OPTIONS.allowUnlocks;
  const preference = PREFERENCES[options.preferenceId] ?? PREFERENCES.stable;

  return {
    danger,
    dlc,
    unlock,
    preference,
  };
}

function entryAllowedByOptions(entry, options) {
  const { official } = entry;
  if (!official?.found) return true;

  if (!options.dlc.allowDlc && official.sources?.some((source) => source !== "base")) {
    return false;
  }

  if (
    !options.unlock.allowRareUnlocks &&
    official.records.some((record) => record.unlockedByDefault === false)
  ) {
    return false;
  }

  return true;
}

function normalizeTag(tag) {
  return String(tag).toLowerCase();
}

function entryText(entry, target) {
  return [
    target.name,
    target.cnName,
    target.type,
    target.role,
    entry.priority,
    entry.reason,
  ]
    .join(" ")
    .toLowerCase();
}

function priorityScore(priority) {
  if (/主推荐|核心/.test(priority)) return 14;
  if (/替代|高|条件核心/.test(priority)) return 7;
  if (/补充|中/.test(priority)) return 2;
  return 0;
}

function officialNumericValues(official, field) {
  return (official?.records ?? [])
    .map((record) => record[field])
    .filter((value) => Number.isFinite(value));
}

function scoreAvailabilityFit(official) {
  if (!official?.found) return { score: 0, reasons: [] };

  const defaultUnlocked = official.records.some((record) => record.unlockedByDefault === true);
  const lockedOnly = official.records.every((record) => record.unlockedByDefault === false);
  const canBeLooted = official.records.some((record) => record.canBeLooted === true);
  const unlootableOnly =
    official.records.length > 0 && official.records.every((record) => record.canBeLooted === false);
  const reasons = [];
  let score = 0;

  if (defaultUnlocked) {
    score += 1;
    reasons.push("解锁修正：默认池更容易纳入路线");
  } else if (lockedOnly) {
    score -= 1;
    reasons.push("解锁修正：需解锁，评分保守");
  }

  if (canBeLooted) {
    score += 1;
    reasons.push("掉落修正：官方目录显示可掉落");
  } else if (unlootableOnly) {
    score -= 1;
    reasons.push("掉落修正：不进掉落池，依赖固定来源");
  }

  return { score, reasons };
}

function scoreRarityFit(official, mode) {
  if (!official?.found) return { score: 0, reasons: [] };

  const tiers = officialNumericValues(official, "tier");
  const values = officialNumericValues(official, "value");
  if (!tiers.length && !values.length) return { score: 0, reasons: [] };

  const minTier = tiers.length ? Math.min(...tiers) : null;
  const minValue = values.length ? Math.min(...values) : null;
  const reasons = [];
  let score = 0;

  if (minTier !== null && minTier <= 1) {
    score += 2;
    reasons.push(`稀有度修正：最低 T${minTier + 1}，前中期更容易成型`);
  } else if (minTier !== null && minTier >= 3) {
    const endlessBonus = mode?.id === "endless" ? 1 : -1;
    score += endlessBonus;
    reasons.push(
      mode?.id === "endless"
        ? `稀有度修正：T${minTier + 1} 高阶收益适合无尽后期`
        : `稀有度修正：最低 T${minTier + 1}，通关局评分保守`,
    );
  }

  if (minValue !== null && minValue <= 35) {
    score += 1;
    reasons.push(`价格修正：最低价格 ${minValue}，前期试错成本低`);
  } else if (minValue !== null && minValue >= 100 && mode?.id !== "endless") {
    score -= 1;
    reasons.push(`价格修正：最低价格 ${minValue}，需要更强经济支撑`);
  }

  return { score, reasons };
}

function scoreSetFit(entry) {
  if (!entry.weapon || !entry.official?.found) return { score: 0, reasons: [] };

  const routeTags = new Set((entry.routeTags ?? []).map(normalizeTag));
  const matchedSetIds = inferWeaponSetIds(entry.weapon, entry.official).filter((setId) =>
    routeTags.has(normalizeTag(setId)),
  );
  if (!matchedSetIds.length) return { score: 0, reasons: [] };

  const labels = matchedSetIds.map((setId) => WEAPON_SET_LABELS[setId] ?? setId);
  return {
    score: Math.min(4, matchedSetIds.length * 2),
    reasons: [`套装修正：${labels.join(" / ")}与角色路线集中度匹配`],
  };
}

function expandPlanPriority(priority) {
  return String(priority)
    .split(/或|\/|、|,|，|\s+/)
    .map((part) => part.trim())
    .filter((part) => STAT_LABELS[part]);
}

function collectPlanStats(plan) {
  const priorityStats = Object.values(plan.statPriority ?? {}).flatMap((priorities) =>
    priorities.flatMap(expandPlanPriority),
  );
  const targetStats = Object.keys(plan.wave20Targets ?? {}).filter((statId) => STAT_LABELS[statId]);
  return new Set([...priorityStats, ...targetStats]);
}

function collectOfficialStats(official) {
  const officialStatKeys = (official?.records ?? []).flatMap((record) => [
    ...(record.effects ?? []).flatMap((effect) => [
      effect.key,
      effect.statDisplayed,
      effect.statDisplayedName,
      effect.statName,
      effect.statScaled,
      effect.textKey,
      effect.customKey,
      ...(effect.statsModified ?? []),
    ]),
    ...(record.stats?.scalingStats ?? []).map((scaling) => scaling.stat),
  ]);

  return [
    ...new Set(
      officialStatKeys.map((statKey) => OFFICIAL_STAT_TO_PLAN_STAT[statKey]).filter(Boolean),
    ),
  ];
}

function scoreOfficialStatSynergy(entry, plan) {
  if (!plan || !entry.official?.found) return { score: 0, reasons: [] };

  const planStats = collectPlanStats(plan);
  const matchedStats = collectOfficialStats(entry.official).filter((statId) => planStats.has(statId));
  if (!matchedStats.length) return { score: 0, reasons: [] };

  const labels = matchedStats.map((statId) => STAT_LABELS[statId] ?? statId);
  return {
    score: Math.min(8, matchedStats.length * 2),
    reasons: [`官方数值匹配角色目标：${labels.join(" / ")}`],
  };
}

function scoreMechanicFit(entry, plan) {
  if (!entry.official?.found) return { score: 0, reasons: [] };

  const planStats = collectPlanStats(plan);
  const officialStats = collectOfficialStats(entry.official);
  const routeTags = new Set((entry.routeTags ?? []).map(normalizeTag));
  const weaponSetIds = new Set(
    entry.weapon ? inferWeaponSetIds(entry.weapon, entry.official).map(normalizeTag) : [],
  );
  const hasPickupAttraction = (entry.official.records ?? []).some((record) =>
    (record.effects ?? []).some((effect) => effect.key === "instant_gold_attracting"),
  );
  const hasHarvestingGrowth = (entry.official.records ?? []).some((record) =>
    (record.effects ?? []).some((effect) => effect.key === "harvesting_growth"),
  );
  const hasStartWaveSavings = (entry.official.records ?? []).some((record) =>
    (record.effects ?? []).some(
      (effect) => effect.textKey === "effect_gain_pct_gold_start_wave_limited",
    ),
  );
  const hasKillGrowth = (entry.official.records ?? []).some((record) =>
    (record.effects ?? []).some((effect) => effect.key === "effect_gain_stat_every_killed_enemies"),
  );
  const hasArmorScaling = (entry.official.records ?? []).some((record) =>
    (record.stats?.scalingStats ?? []).some((scaling) => scaling.stat === "stat_armor"),
  );
  const hasLuckScaling = (entry.official.records ?? []).some((record) =>
    (record.stats?.scalingStats ?? []).some((scaling) => scaling.stat === "stat_luck"),
  );
  const hasPickupHealing = (entry.official.records ?? []).some((record) =>
    (record.effects ?? []).some((effect) => effect.key === "heal_when_pickup_gold"),
  );
  const hasSustainTrigger = (entry.official.records ?? []).some((record) =>
    (record.effects ?? []).some((effect) =>
      ["consumable_heal", "consumable_heal_over_time"].includes(effect.key) ||
      effect.customKey === "heal_on_dodge",
    ),
  );
  const hasCurseEconomy = (entry.official.records ?? []).some((record) =>
    (record.effects ?? []).some((effect) =>
      ["gold_on_cursed_enemy_kill", "enemy_gold_drops", "curse_locked_items"].includes(effect.key),
    ),
  );
  const hasCurseGain = (entry.official.records ?? []).some((record) =>
    (record.effects ?? []).some((effect) => effect.key === "stat_curse" && effect.value > 0),
  );
  const reasons = [];
  let score = 0;

  if (planStats.has("luck") && officialStats.includes("luck")) {
    score += 3;
    reasons.push("机制修正：幸运缩放贴合拾取触发路线");
  }
  if (planStats.has("luck") && hasLuckScaling) {
    score += 3;
    reasons.push("机制修正：官方幸运缩放武器适合 Lucky 高幸运路线");
  }
  if (planStats.has("damagePercent") && officialStats.includes("damagePercent")) {
    score += 2;
    reasons.push("机制修正：百分比伤害可放大触发收益");
  }
  if (planStats.has("luck") && hasPickupAttraction) {
    score += 3;
    reasons.push("机制修正：拾取吸附提高 Lucky 触发频率");
  }
  if (planStats.has("harvesting") && hasHarvestingGrowth) {
    score += 3;
    reasons.push("机制修正：收获成长加速经济滚雪球");
  }
  if (planStats.has("harvesting") && hasStartWaveSavings) {
    score += 3;
    reasons.push("机制修正：波次存钱放大经济滚动");
  }
  if ((routeTags.has("ethereal") || weaponSetIds.has("ethereal")) && hasKillGrowth) {
    score += 3;
    reasons.push("机制修正：幽魂击杀成长适合后期属性滚雪球");
  }
  if (planStats.has("armor") && hasArmorScaling) {
    score += 3;
    reasons.push("机制修正：官方护甲缩放适合骑士防御转输出");
  }
  if (
    (planStats.has("hpRegen") || planStats.has("lifeSteal") || planStats.has("maxHp")) &&
    hasSustainTrigger
  ) {
    score += 2;
    reasons.push("机制修正：官方续航触发补足生存阈值");
  }
  if (planStats.has("luck") && hasPickupHealing) {
    score += 3;
    reasons.push("机制修正：拾取治疗跟随高拾取路线");
  }
  if ((routeTags.has("economy") || planStats.has("harvesting")) && hasCurseEconomy) {
    score += 3;
    reasons.push("机制修正：诅咒经济把风险换成材料收益");
  }
  if (modeSupportsCurseRisk(planStats, routeTags) && hasCurseGain) {
    score += 2;
    reasons.push("机制修正：诅咒收益适合高输出或无尽路线");
  }

  return { score, reasons };
}

function modeSupportsCurseRisk(planStats, routeTags) {
  return (
    planStats.has("damagePercent") ||
    planStats.has("armor") ||
    routeTags.has("economy") ||
    routeTags.has("ranged") ||
    routeTags.has("naval")
  );
}

function scoreModeFit(entry, mode) {
  const target = entry.weapon ?? entry.item;
  const text = entryText(entry, target);

  if (mode?.id === "endless" && /经济|成长|拾取|幸运|收获|弹射|贯通|范围|诅咒/.test(text)) {
    return {
      score: 2,
      reasons: ["无尽模式偏好成长、拾取或覆盖收益"],
    };
  }

  if (mode?.id === "normal20" && /稳定|生存|护甲|生命|回复|续航|攻速|伤害/.test(text)) {
    return {
      score: 1,
      reasons: ["20 关通关偏好稳定阈值"],
    };
  }

  return { score: 0, reasons: [] };
}

function midpoint(value) {
  if (Array.isArray(value)) return (Number(value[0]) + Number(value[1])) / 2;
  return Number(value) || 0;
}

function representativeStats(plan) {
  return Object.fromEntries(
    Object.entries(plan?.wave20Targets ?? {}).map(([statId, range]) => [statId, midpoint(range)]),
  );
}

function scenarioIdForEntry(entry, mode) {
  const text = entryText(entry, entry.weapon ?? entry.item);
  if (mode?.id === "endless" || /弹射|贯通|爆炸|拾取|幸运|清怪|覆盖|无尽/.test(text)) {
    return "swarm";
  }
  if (/Boss|精英|头目|高生命/.test(text)) return "boss";
  return "normalWave";
}

function calculatorWeaponFromRecord(record) {
  const stats = record?.stats;
  if (!stats?.damage || !stats?.cooldown) return null;

  const scaling = Object.fromEntries(
    Object.entries(OFFICIAL_STAT_TO_PLAN_STAT)
      .filter(([, statId]) =>
        ["meleeDamage", "rangedDamage", "elementalDamage", "engineering"].includes(statId),
      )
      .map(([, statId]) => [statId, 0]),
  );
  (stats.scalingStats ?? []).forEach((scalingStat) => {
    const statId = OFFICIAL_STAT_TO_PLAN_STAT[scalingStat.stat];
    if (scaling[statId] !== undefined) {
      scaling[statId] += Number(scalingStat.value) * 100;
    }
  });

  return {
    name: record.nameKey,
    baseDamage: stats.damage,
    cooldown: stats.cooldown / 60,
    hitsPerAttack: Math.max(1, stats.nb_projectiles ?? 1),
    piercing: stats.piercing ?? 0,
    piercingDamageMultiplier:
      stats.piercing_dmg_reduction === undefined
        ? 0.5
        : Math.max(0, 1 - stats.piercing_dmg_reduction),
    bounces: stats.bounce ?? 0,
    bounceDamageMultiplier:
      stats.bounce_dmg_reduction === undefined
        ? 0.5
        : Math.max(0, 1 - stats.bounce_dmg_reduction),
    explosionTargets: stats.explosion_targets ?? 0,
    explosionDamageMultiplier: stats.explosion_damage_multiplier ?? 1,
    critChance: (stats.crit_chance ?? 0) * 100,
    critMultiplier: stats.crit_damage ?? 2,
    scaling,
  };
}

function bestWeaponScenarioModel(entry, plan, mode) {
  if (!entry.weapon || !entry.official?.found) return null;

  const scenarioId = scenarioIdForEntry(entry, mode);
  const stats = representativeStats(plan);
  const results = (entry.official.records ?? [])
    .map((record) => {
      const weapon = calculatorWeaponFromRecord(record);
      if (!weapon) return null;
      return {
        record,
        result: calculateScenarioDps(stats, weapon, scenarioId),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.result.effectiveClearScore - left.result.effectiveClearScore);

  return results[0] ? { scenarioId, ...results[0] } : null;
}

function itemScenarioModel(entry, plan, mode) {
  if (!entry.item || !entry.official?.found) return null;

  const itemEffect = itemEffectForEntry(entry);
  if (!itemEffect) return null;

  const scenarioId = scenarioIdForEntry(entry, mode);
  const result = calculateItemEffectDps(representativeStats(plan), scenarioId, itemEffect);
  return {
    scenarioId,
    itemEffectId: typeof itemEffect === "string" ? itemEffect : itemEffect.id,
    result,
  };
}

function scoreScenarioModel(entry, plan, mode) {
  const weaponModel = bestWeaponScenarioModel(entry, plan, mode);
  if (weaponModel) {
    const score = Math.min(10, Math.max(0, Math.round(weaponModel.result.effectiveClearScore / 60)));
    const scenarioName = weaponModel.result.scenario.name;
    return {
      score,
      reasons: [
        `场景模型：${scenarioName}有效清场 ${Math.round(
          weaponModel.result.effectiveClearScore,
        )}`,
      ],
    };
  }

  const itemModel = itemScenarioModel(entry, plan, mode);
  if (itemModel) {
    if (itemModel.result.pickupUtilityScore) {
      const score = Math.min(8, Math.max(0, Math.round(itemModel.result.pickupUtilityScore)));
      return {
        score,
        reasons: [
          `场景模型：${itemModel.result.scenario.name}拾取频率 +${itemModel.result.extraPickupRate.toFixed(
            2,
          )}/秒`,
        ],
      };
    }

    if (itemModel.result.economyUtilityScore) {
      const score = Math.min(8, Math.max(0, Math.round(itemModel.result.economyUtilityScore)));
      const economyLabel = itemModel.result.economyLabel ?? "经济收益";
      const value = formatEconomyUtilityValue(itemModel.result, score);
      return {
        score,
        reasons: [`场景模型：${itemModel.result.scenario.name}${economyLabel} ${value}`],
      };
    }

    if (itemModel.result.sustainUtilityScore) {
      const score = Math.min(8, Math.max(0, Math.round(itemModel.result.sustainUtilityScore)));
      const sustainLabel = itemModel.result.sustainLabel ?? "续航潜力";
      return {
        score,
        reasons: [
          `场景模型：${itemModel.result.scenario.name}${sustainLabel} +${itemModel.result.healingPerSecond.toFixed(
            2,
          )} 生命/秒`,
        ],
      };
    }

    const score = Math.min(8, Math.max(0, Math.round(itemModel.result.dps / 12)));
    return {
      score,
      reasons: [
        `场景模型：${itemModel.result.scenario.name}触发伤害 ${Math.round(
          itemModel.result.dps,
        )} DPS`,
      ],
    };
  }

  return { score: 0, reasons: [] };
}

function officialEffects(official) {
  return (official?.records ?? []).flatMap((record) => record.effects ?? []);
}

function itemEffectForEntry(entry) {
  const staticItemEffectId = ITEM_EFFECT_NAME_KEYS[entry.official.nameKey];
  if (staticItemEffectId) return staticItemEffectId;

  const effects = officialEffects(entry.official);
  const baseEffect = {
    id: `official:${entry.official.nameKey}`,
    name: entry.item.name,
    cnName: entry.item.cnName,
  };
  const pickupHeal = effects.find(
    (effect) => effect.key === "heal_when_pickup_gold" && effect.value > 0,
  );
  if (pickupHeal) {
    return {
      ...baseEffect,
      id: `${baseEffect.id}:pickup-heal`,
      trigger: "onPickupHealChance",
      chance: pickupHeal.value,
      healAmount: 1,
      description: "按官方拾取材料治疗概率估算续航潜力；不计入伤害 DPS。",
    };
  }

  const dodgeHeal = effects.find(
    (effect) => effect.customKey === "heal_on_dodge" && effect.value > 0,
  );
  if (dodgeHeal) {
    return {
      ...baseEffect,
      id: `${baseEffect.id}:dodge-heal`,
      trigger: "onDodgeHeal",
      chance: dodgeHeal.chance ?? 100,
      healAmount: dodgeHeal.value,
      description: "按官方闪避治疗概率和角色目标闪避估算续航潜力；不计入伤害 DPS。",
    };
  }

  const consumableHeal = effects.find(
    (effect) => effect.key === "consumable_heal" && effect.value > 0,
  );
  if (consumableHeal) {
    return {
      ...baseEffect,
      id: `${baseEffect.id}:consumable-heal`,
      trigger: "consumableHealBonus",
      healBonus: consumableHeal.value,
      consumablePickupShare: 0.25,
      description: "按官方消耗品治疗加成估算续航潜力；不计入伤害 DPS。",
    };
  }

  const statValue = (key) => effects.find((effect) => effect.key === key)?.value ?? 0;
  const cursedKillGold = effects.find(
    (effect) => effect.key === "gold_on_cursed_enemy_kill" && effect.value > 0,
  );
  if (cursedKillGold) {
    return {
      ...baseEffect,
      id: `${baseEffect.id}:cursed-kill-material`,
      trigger: "cursedKillMaterial",
      materialValue: cursedKillGold.value,
      curseGain: statValue("stat_curse"),
      enemyCountPercent: statValue("number_of_enemies"),
      enemyHealthPercent: statValue("enemy_health"),
      enemyDamagePercent: statValue("enemy_damage"),
      description: "按官方诅咒击杀材料、诅咒值和敌人风险估算经济潜力；不计入伤害 DPS。",
    };
  }

  const enemyGoldDrops = effects.find(
    (effect) => effect.key === "enemy_gold_drops" && effect.value > 0,
  );
  if (enemyGoldDrops) {
    return {
      ...baseEffect,
      id: `${baseEffect.id}:enemy-gold-drops`,
      trigger: "enemyGoldDropBonus",
      goldDropBonusPercent: enemyGoldDrops.value,
      enemyDamagePercent: statValue("enemy_damage"),
      description: "按官方敌人材料掉落加成和敌人伤害风险估算经济潜力；不计入伤害 DPS。",
    };
  }

  const curseLockedItems = effects.find(
    (effect) => effect.key === "curse_locked_items" && effect.value > 0,
  );
  if (curseLockedItems) {
    return {
      ...baseEffect,
      id: `${baseEffect.id}:curse-shop-potential`,
      trigger: "curseShopPotential",
      curseLockedChance: curseLockedItems.value,
      curseGain: statValue("stat_curse"),
      description: "按官方锁定物品诅咒概率估算商店强化潜力；不计入伤害 DPS。",
    };
  }

  return null;
}

function formatEconomyUtilityValue(result, fallbackScore) {
  if (Number.isFinite(result.extraMaterialRate)) {
    return `+${result.extraMaterialRate.toFixed(2)}/秒`;
  }
  if (Number.isFinite(result.extraHarvesting)) {
    return `+${result.extraHarvesting.toFixed(1)} 收获`;
  }
  if (Number.isFinite(result.extraMaterialPerCrate)) {
    return `+${result.extraMaterialPerCrate.toFixed(0)}/箱`;
  }
  if (Number.isFinite(result.savingsPercent)) {
    return `+${result.savingsPercent.toFixed(0)}%/波`;
  }
  return `+${fallbackScore}`;
}

function scoreRecommendation(entry, preference, plan, mode) {
  const target = entry.weapon ?? entry.item;
  const targetTags = (target.tags ?? []).map(normalizeTag);
  const routeTags = (entry.routeTags ?? []).map(normalizeTag);
  const targetRouteMatches = targetTags.filter((tag) => routeTags.includes(tag));
  const text = entryText(entry, target);
  const reasons = [];

  const keywordScore = preference.keywords.reduce(
    (score, keyword) => {
      if (!text.includes(keyword.toLowerCase())) return score;
      reasons.push(`匹配偏好关键词：${keyword}`);
      return score + 3;
    },
    0,
  );
  const targetTagScore = preference.tags.reduce((score, tag) => {
    if (!targetTags.includes(normalizeTag(tag))) return score;
    reasons.push(`候选标签贴合偏好：${tag}`);
    return score + 5;
  }, 0);
  const routeTagScore = preference.tags.reduce((score, tag) => {
    if (!routeTags.includes(normalizeTag(tag))) return score;
    reasons.push(`路线标签贴合偏好：${tag}`);
    return score + 2;
  }, 0);
  const routeFitScore = targetRouteMatches.length * 2;
  if (targetRouteMatches.length) {
    reasons.push(`候选自身贴合路线：${targetRouteMatches.join(" / ")}`);
  }

  const planScore = priorityScore(entry.priority);
  if (planScore) reasons.push(`手写优先级：${entry.priority}`);
  const manualRouteScore = entry.officialCandidate ? 0 : 20;
  if (manualRouteScore) reasons.push("手写路线候选");

  const availabilityFit = scoreAvailabilityFit(entry.official);
  reasons.push(...availabilityFit.reasons);

  const rarityFit = scoreRarityFit(entry.official, mode);
  reasons.push(...rarityFit.reasons);

  const setFit = scoreSetFit(entry);
  reasons.push(...setFit.reasons);

  const officialStatSynergy = scoreOfficialStatSynergy(entry, plan);
  reasons.push(...officialStatSynergy.reasons);

  const mechanicFit = scoreMechanicFit(entry, plan);
  reasons.push(...mechanicFit.reasons);

  const modeFit = scoreModeFit(entry, mode);
  reasons.push(...modeFit.reasons);

  const scenarioModel = scoreScenarioModel(entry, plan, mode);
  reasons.push(...scenarioModel.reasons);

  return {
    score:
      keywordScore +
      targetTagScore +
      routeTagScore +
      routeFitScore +
      planScore +
      manualRouteScore +
      availabilityFit.score +
      rarityFit.score +
      setFit.score +
      officialStatSynergy.score +
      mechanicFit.score +
      modeFit.score +
      scenarioModel.score,
    reasons,
  };
}

function sortByRecommendationScore(entries, preference, plan, mode) {
  return entries
    .map((entry, index) => ({
      entry,
      index,
      scoring: scoreRecommendation(entry, preference, plan, mode),
    }))
    .sort((a, b) => b.scoring.score - a.scoring.score || a.index - b.index)
    .map(({ entry, scoring }) => ({
      ...entry,
      recommendationScore: scoring.score,
      recommendationReasons: scoring.reasons.slice(0, 10),
    }));
}

function filterAndSort(entries, options, plan, mode) {
  return sortByRecommendationScore(
    entries.filter((entry) => entryAllowedByOptions(entry, options)),
    options.preference,
    plan,
    mode,
  );
}

function manualRouteTags(manualEntries) {
  return [
    ...new Set(
      manualEntries.flatMap((entry) => [
        ...(entry.routeTags ?? []),
        ...((entry.weapon ?? entry.item)?.tags ?? []),
      ]),
    ),
  ];
}

function routeOrStatMatchesPlan(entry, plan, routeTags) {
  const target = entry.weapon ?? entry.item;
  const targetTags = (target.tags ?? []).map(normalizeTag);
  const normalizedRouteTags = routeTags.map(normalizeTag);
  const focusTags = normalizedRouteTags.filter((tag) => FOCUS_ROUTE_TAGS.has(tag));
  const tagMatch = targetTags.some((tag) => normalizedRouteTags.includes(tag));
  const statMatch = scoreOfficialStatSynergy(entry, plan).score > 0;
  if (focusTags.length) {
    return targetTags.some((tag) => focusTags.includes(tag)) || (!entry.weapon && statMatch);
  }

  return tagMatch || statMatch;
}

function expandOfficialWeaponPool(manualEntries, options, plan) {
  const manualNameKeys = new Set(manualEntries.map((entry) => entry.official.nameKey));
  const routeTags = manualRouteTags(manualEntries);
  const officialEntries = uniqueOfficialNameKeys(options.officialCatalog, "weapon")
    .filter((nameKey) => !manualNameKeys.has(nameKey))
    .map((nameKey) => buildOfficialWeaponCandidate(nameKey, options, plan, routeTags))
    .filter((entry) => routeOrStatMatchesPlan(entry, plan, routeTags));

  return [...manualEntries, ...officialEntries];
}

function expandOfficialItemPool(manualEntries, options, plan) {
  const manualNameKeys = new Set(manualEntries.map((entry) => entry.official.nameKey));
  const routeTags = manualRouteTags(manualEntries);
  const officialEntries = uniqueOfficialNameKeys(options.officialCatalog, "item")
    .filter((nameKey) => !manualNameKeys.has(nameKey))
    .map((nameKey) => buildOfficialItemCandidate(nameKey, options, plan, routeTags))
    .filter((entry) => routeOrStatMatchesPlan(entry, plan, routeTags));

  return [...manualEntries, ...officialEntries];
}

function visibleRecommendationLimit(entries, manualCount, extraCount) {
  return Math.min(entries.length, Math.max(manualCount, manualCount + extraCount));
}

export function formatStatTarget(statId, range) {
  const label = STAT_LABELS[statId] ?? statId;
  if (!Array.isArray(range)) return { label, value: String(range) };
  return {
    label,
    value: `${range[0]} - ${range[1]}`,
  };
}

export function formatStatPriority(priority) {
  if (STAT_LABELS[priority]) return STAT_LABELS[priority];

  return Object.entries(STAT_LABELS).reduce(
    (label, [statId, statLabel]) => label.replaceAll(statId, statLabel),
    priority,
  );
}

function formatStatPriorities(statPriority) {
  return Object.fromEntries(
    Object.entries(statPriority).map(([phase, priorities]) => [
      phase,
      priorities.map(formatStatPriority),
    ]),
  );
}

function adjustWave20Targets(targets, danger) {
  const survivalStats = new Set(["maxHp", "armor", "dodge", "hpRegen", "lifeSteal", "speed"]);
  return Object.entries(targets).map(([statId, range]) => {
    const adjustedRange =
      Array.isArray(range) && survivalStats.has(statId)
        ? range.map((value) => Math.round(value * danger.survivabilityMultiplier))
        : range;
    return formatStatTarget(statId, adjustedRange);
  });
}

export function generateStrategyGuide(characterId, modeId = "normal20", options = {}) {
  const resolvedOptions = resolveOptions(options);
  const character = CHARACTER_GUIDES[characterId];
  if (!character) {
    throw new Error(`Unknown character id: ${characterId}`);
  }

  const mode = MODES[modeId];
  if (!mode) {
    throw new Error(`Unknown mode id: ${modeId}`);
  }

  const plan = character.plans[modeId];
  if (!plan) {
    throw new Error(`Missing ${modeId} plan for ${character.name}`);
  }

  const manualWeapons = plan.recommendedWeapons.map((entry) =>
    resolveWeapon(entry, options.officialCatalog),
  );
  const manualItems = plan.keyItems.map((entry) => resolveItem(entry, options.officialCatalog));
  const weaponPool = options.officialCatalog
    ? expandOfficialWeaponPool(manualWeapons, options, plan)
    : manualWeapons;
  const itemPool = options.officialCatalog ? expandOfficialItemPool(manualItems, options, plan) : manualItems;
  const recommendedWeapons = filterAndSort(weaponPool, resolvedOptions, plan, mode).slice(
    0,
    visibleRecommendationLimit(weaponPool, manualWeapons.length, 5),
  );
  const keyItems = filterAndSort(itemPool, resolvedOptions, plan, mode).slice(
    0,
    visibleRecommendationLimit(itemPool, manualItems.length, 12),
  );

  return {
    character,
    mode,
    options: resolvedOptions,
    optionNotes: [
      resolvedOptions.danger.note,
      resolvedOptions.dlc.note,
      resolvedOptions.unlock.note,
      `偏好：${resolvedOptions.preference.label}。推荐顺序会优先贴合该路线。`,
    ],
    stance: plan.stance,
    recommendedWeapons,
    avoid: plan.avoid,
    keyItems,
    statPriority: formatStatPriorities(plan.statPriority),
    wave20Targets: adjustWave20Targets(plan.wave20Targets, resolvedOptions.danger),
    rhythm: plan.rhythm,
    sourceNotes: character.sourceNotes,
  };
}

export function validateStrategyData() {
  const errors = [];

  Object.values(CHARACTER_GUIDES).forEach((character) => {
    Object.keys(MODES).forEach((modeId) => {
      const plan = character.plans[modeId];
      if (!plan) {
        errors.push(`${character.id} is missing ${modeId} plan`);
        return;
      }

      plan.recommendedWeapons.forEach((entry) => {
        const weapon = WEAPONS[entry.weaponId];
        if (!weapon) {
          errors.push(`${character.id}/${modeId} references missing weapon ${entry.weaponId}`);
        }
        if (weapon && !weapon.cnName) {
          errors.push(`${entry.weaponId} needs a Chinese weapon name`);
        }
        if (!entry.reason) {
          errors.push(`${character.id}/${modeId}/${entry.weaponId} needs a weapon reason`);
        }
      });

      plan.keyItems.forEach((entry) => {
        const item = ITEMS[entry.itemId];
        if (!item) {
          errors.push(`${character.id}/${modeId} references missing item ${entry.itemId}`);
        }
        if (item && !item.cnName) {
          errors.push(`${entry.itemId} needs a Chinese item name`);
        }
        if (!entry.reason) {
          errors.push(`${character.id}/${modeId}/${entry.itemId} needs an item reason`);
        }
      });

      Object.values(plan.statPriority).forEach((priorities) => {
        priorities.forEach((priority) => {
          if (/[A-Za-z]/.test(formatStatPriority(priority))) {
            errors.push(`${character.id}/${modeId} priority "${priority}" needs Chinese display`);
          }
        });
      });

      Object.entries(plan.wave20Targets).forEach(([statId, range]) => {
        if (!STAT_LABELS[statId]) {
          errors.push(`${character.id}/${modeId} has unknown stat target ${statId}`);
        }
        if (
          !Array.isArray(range) ||
          range.length !== 2 ||
          !range.every((value) => Number.isFinite(value)) ||
          range[0] > range[1]
        ) {
          errors.push(`${character.id}/${modeId}/${statId} target must be [min, max]`);
        }
      });
    });
  });

  return errors;
}
