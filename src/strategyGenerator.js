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
  stat_luck: "luck",
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

function officialAvailabilityScore(official) {
  if (!official?.found) return 0;

  const defaultUnlocked = official.records.some((record) => record.unlockedByDefault === true);
  const canBeLooted = official.records.some((record) => record.canBeLooted === true);
  return (defaultUnlocked ? 1 : 0) + (canBeLooted ? 1 : 0);
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
  const reasons = [];
  let score = 0;

  if (planStats.has("luck") && officialStats.includes("luck")) {
    score += 3;
    reasons.push("机制修正：幸运缩放贴合拾取触发路线");
  }
  if (planStats.has("damagePercent") && officialStats.includes("damagePercent")) {
    score += 2;
    reasons.push("机制修正：百分比伤害可放大触发收益");
  }

  return { score, reasons };
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

  const itemEffectId = ITEM_EFFECT_NAME_KEYS[entry.official.nameKey];
  if (!itemEffectId) return null;

  const scenarioId = scenarioIdForEntry(entry, mode);
  const result = calculateItemEffectDps(representativeStats(plan), scenarioId, itemEffectId);
  return { scenarioId, itemEffectId, result };
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

  const availabilityScore = officialAvailabilityScore(entry.official);
  if (availabilityScore) reasons.push("官方目录显示可稳定获取");

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
      availabilityScore +
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
      recommendationReasons: scoring.reasons.slice(0, 6),
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
  if (focusTags.length) {
    return targetTags.some((tag) => focusTags.includes(tag));
  }

  const statMatch = scoreOfficialStatSynergy(entry, plan).score > 0;
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
    visibleRecommendationLimit(itemPool, manualItems.length, 8),
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
