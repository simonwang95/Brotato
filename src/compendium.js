import { CHARACTER_GUIDES, ITEMS, WEAPONS } from "./strategyData.js";
import { getOfficialNameKey, toOfficialNameKey } from "./officialCatalog.js";

const SOURCE_LABELS = {
  base: "原版",
  abyssalTerrors: "深海魔怪",
};

const SET_LABELS = {
  blade: "刀刃",
  blunt: "钝器",
  fire: "元素",
  ethereal: "幽魂",
  explosive: "爆炸",
  gun: "枪械",
  heavy: "重型",
  legendary: "传奇",
  medical: "医疗",
  medieval: "中世纪",
  musical: "乐器",
  naval: "海军",
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
  stat_percent_damage: "总伤害",
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
  structure_range: "结构物范围",
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
  item_pearl: "珍珠",
  recycling_gains: "回收额外材料",
  loot_alien_chance: "战利品外星人出现概率",
  loot_alien_speed: "战利品外星人移速",
  extra_loot_aliens_next_wave: "下一波战利品外星人",
  dodge_cap: "闪避上限",
  min_weapon_tier: "最低武器阶级",
  no_ranged_weapons: "不能持有远程武器",
  stat_damage: "总伤害",
  stat_levels: "角色等级",
  enemy_speed: "敌人移速",
  enemy_fruit_drops: "水果掉落概率",
  hp_start_next_wave: "下一波起始生命",
  item_box_gold: "箱子材料",
  reroll_price: "商店刷新价格",
};

const PERCENT_STATS = new Set([
  "stat_attack_speed",
  "stat_crit_chance",
  "stat_dodge",
  "stat_lifesteal",
  "stat_percent_damage",
  "stat_speed",
  "structure_attack_speed",
  "dodge_cap",
  "enemy_speed",
]);

const EFFECT_TEXT_LABELS = {
  EFFECT_DEAL_DMG_WHEN_DEATH: "击杀敌人时",
  EFFECT_DEAL_DMG_WHEN_DODGE: "闪避敌人攻击时",
  EFFECT_DEAL_DMG_WHEN_PICKUP_GOLD: "拾取材料时",
  EFFECT_BROKEN_HOURGLASS: "沙漏已损坏，不再提供效果",
  EFFECT_BROKEN_MIRROR: "镜子已复制一个道具",
  EFFECT_DUPLICATE_ITEM: "复制下一个从商店获得的道具",
  EFFECT_ENEMY_FRUIT_DROPS: "敌人掉落水果的概率提高",
  EFFECT_ENEMY_PERCENT_DAMAGE_TAKEN_ONCE: "首次命中后提高目标受到的伤害",
  EFFECT_GOLDFISH_USED: "金鱼已经使用，当前正在休息",
  EFFECT_HOURGLASS: "将当前波次倒回",
  EFFECT_HP_CAP_AT_CURRENT_VALUE: "最大生命上限锁定为当前值",
  EFFECT_INCREASE_TIER_ON_REROLL: "下次刷新后提升道具阶级",
  EFFECT_LOST_ON_HIT: "受到伤害时失去奖励",
  EFFECT_NO_HIT_BOOST: "未受伤时基础伤害随时间提高",
  EFFECT_ONE_SHOT_ON_HIT_EFFECT: "命中时有概率直接秒杀目标",
  EFFECT_PET_BLAZEMANDER: "生成焰蜥蜴宠物",
  EFFECT_PET_BONK_DOG: "生成 Bonk 狗宠物",
  EFFECT_PET_BOT_O_MINE: "生成布雷机器人构筑物",
  EFFECT_PET_CATLING_GUN: "生成猫特林机枪宠物",
  EFFECT_PET_DOC_MOTH: "生成蛾医生宠物",
  EFFECT_PET_JELLYSHIELD: "生成水母盾宠物",
  EFFECT_PET_LOOTWORM: "生成搜刮虫虫宠物",
  EFFECT_PET_RATZILLA: "生成鼠斯拉宠物",
  EFFECT_PET_SCAPEGOAT: "生成替罪羔羊宠物",
  EFFECT_PROJECTILES_ON_HIT: "命中时产生额外投射物",
  EFFECT_SLOW_PROJECTILES_ON_HIT: "命中时产生减速投射物",
  EFFECT_SPEED_CAP_AT_CURRENT_VALUE: "移速上限锁定为当前值",
  EFFECT_SWAP_MAX_MIN_STAT_POS: "交换最高与最低的正面主属性",
  EFFECT_TEMP_STATS_PER_INTERVAL: "定时获得临时属性",
  EFFECT_WEAPON_SLOW_ON_HIT: "命中时减速敌人",
  EFFECT_WEAPON_STACK: "同名武器叠加伤害",
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
  effect_burn_chance: "攻击有概率施加燃烧",
  effect_item_box_gold: "打开箱子获得材料",
  effect_stat_next_wave: "下一波",
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
  EFFECT_WHISTLE_SOUND: "哨声效果",
};

const PET_EFFECT_SUMMARIES = {
  EFFECT_PET_BLAZEMANDER:
    "生成焰蜥蜴宠物：进行普通攻击，并定期向四周发射燃烧投射物；具体伤害和间隔参数待解码。",
  EFFECT_PET_BONK_DOG:
    "生成 Bonk 狗宠物：进行普通攻击，并定期冲刺造成范围爆炸伤害；具体伤害和间隔参数待解码。",
  EFFECT_PET_BOT_O_MINE:
    "生成布雷机器人构筑物：发射子弹并定期生成地雷；具体伤害和间隔参数待解码。",
  EFFECT_PET_CATLING_GUN:
    "生成猫特林机枪宠物：发射子弹，靠近玩家或其他宠物时提高攻速；具体伤害参数待解码。",
  EFFECT_PET_DOC_MOTH:
    "生成蛾医生宠物：玩家处于其光环内时，生命再生和生命窃取属性翻倍。",
  EFFECT_PET_JELLYSHIELD: "生成水母盾宠物：环绕玩家移动并阻挡敌方投射物。",
  EFFECT_PET_LOOTWORM:
    "生成搜刮虫虫宠物：收集材料并摧毁树木；拾取材料时有 10% 概率使其价值翻倍。",
  EFFECT_PET_RATZILLA: "生成鼠斯拉宠物并攻击敌人；具体伤害参数待解码。",
  EFFECT_PET_SCAPEGOAT:
    "生成替罪羔羊宠物：代替玩家吸引敌人攻击；死亡后，玩家可站在旁边将其复活。",
};

const BINARY_EFFECT_KEYS = new Set([
  "beast_master_effect",
  "die_in_one_hit",
  "no_ranged_weapons",
]);

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

// 套装加成效果：把一组 { key, value } 属性效果格式化为中文，如「闪避 +6%，护甲 -1」。
export function formatSetBonusEffects(effects) {
  return (effects ?? [])
    .map((effect) => `${statLabel(effect.key)} ${formatStatValue(effect.key, effect.value)}`)
    .join("，");
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

function formatFractionChance(value) {
  if (!Number.isFinite(value)) return "概率未知";
  const percentage = value <= 1 ? value * 100 : value;
  return `${Number.isInteger(percentage) ? percentage : percentage.toFixed(1)}%`;
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

function formatRelatedWeaponStats(stats, label, cooldownFrames = stats?.cooldown) {
  if (!stats?.damage && !cooldownFrames) return "";
  const parts = [
    `${label}伤害 ${stats.damage ?? "未知"}`,
    Number.isFinite(cooldownFrames)
      ? `${label}间隔 ${formatCompactCooldown(cooldownFrames)}`
      : "",
  ].filter(Boolean);
  if (stats.scalingStats?.length) {
    parts.push(`缩放 ${formatScalingStats(stats.scalingStats)}`);
  }
  return parts.join("，");
}

function formatDamageProfile(stats) {
  if (!stats) return "伤害参数待解码";
  const scaling = formatScalingStats(stats.scalingStats);
  return `${stats.damage ?? "未知"}${scaling ? `（${scaling}）` : ""}点伤害`;
}

function formatSubEffect(effect) {
  if (!effect?.key) return "未分类强化";
  return `${statLabel(effect.key)} ${formatStatValue(effect.key, effect.value)}`;
}

function relatedWeaponLabel(stats, fallback) {
  if (stats?.scriptPath?.includes("ranged_weapon_stats")) return "远程";
  if (stats?.scriptPath?.includes("melee_weapon_stats")) return "近战";
  return fallback;
}

function formatPetEffect(effect) {
  const summary = PET_EFFECT_SUMMARIES[effect.textKey];
  if (!summary) return null;

  const related = effect.relatedResources ?? {};
  const details = [
    formatRelatedWeaponStats(
      related.weapon_stats,
      relatedWeaponLabel(related.weapon_stats, "宠物攻击"),
    ),
    formatRelatedWeaponStats(related.ranged_weapon_stats, "远程"),
    formatRelatedWeaponStats(related.explosion_effect?.stats, "爆炸"),
  ].filter(Boolean);

  const burning = related.burning_data;
  if (burning) {
    details.push(
      `燃烧 ${Number.isFinite(burning.damage) ? `${burning.damage}/跳` : "伤害未知"}` +
        `${Number.isFinite(burning.duration) ? `，持续 ${burning.duration} 秒` : ""}` +
        `${Number.isFinite(burning.chance) ? `，概率 ${formatFractionChance(burning.chance)}` : ""}`,
    );
  }

  const landmine = related.landmine_effect_stat;
  if (landmine) {
    if (landmine.stats) {
      details.push(formatRelatedWeaponStats(landmine.stats, "地雷生成", landmine.spawn_cooldown));
    } else {
      details.push(
        `地雷生成间隔 ${Number.isFinite(landmine.spawn_cooldown) ? formatCompactCooldown(landmine.spawn_cooldown) : "未知"}`,
      );
    }
  }

  if (Number.isFinite(effect.effectParameters?.double_chance)) {
    details.push(`材料翻倍概率 ${formatFractionChance(effect.effectParameters.double_chance)}`);
  }
  if (Number.isFinite(effect.effectParameters?.boost_zone_scale)) {
    details.push(`光环缩放 ${effect.effectParameters.boost_zone_scale}`);
  }

  if (!details.length) return summary;
  return `${summary.replace(/；具体[^。]+。?$/, "")}; ${details.join("；")}。`;
}

export function formatEffectDetail(effect) {
  const trigger = effectTextLabel(effect.textKey);
  const keyLabel = statLabel(effect.key);
  const scriptPath = effect.scriptPath ?? "";

  if (PET_EFFECT_SUMMARIES[effect.textKey]) return formatPetEffect(effect);

  if (scriptPath.endsWith("/pet_effect.gd") && !effect.textKey && !effect.key) {
    return "";
  }

  if (scriptPath.includes("swap_max_min_stat_effect")) {
    return "获得时：交换最高与最低的正面主属性";
  }

  if (scriptPath.includes("stat_cap_effect")) {
    if (effect.key === "hp_cap") {
      return "最大生命上限锁定为获得该物品时的当前值";
    }
    if (effect.key === "speed_cap") {
      return "移速上限锁定为获得该物品时的当前值";
    }
  }

  if (scriptPath.includes("exploding_effect")) {
    const attackType = effect.key === "effect_explode_melee" ? "近战命中" : "命中";
    return `${attackType}时有 ${formatFractionChance(effect.chance)} 概率爆炸`;
  }

  if (scriptPath.includes("burning_effect")) {
    const burning = effect.relatedResources?.burning_data;
    if (burning) {
      const details = [
        Number.isFinite(burning.damage) ? `每跳 ${burning.damage} 伤害` : "伤害未知",
        Number.isFinite(burning.duration) ? `持续 ${burning.duration} 秒` : "持续时间未知",
        Number.isFinite(burning.chance) ? `概率 ${formatFractionChance(burning.chance)}` : "触发概率待解码",
      ];
      if (burning.scalingStats?.length) details.push(`缩放 ${formatScalingStats(burning.scalingStats)}`);
      return `命中时施加燃烧；${details.join("，")}；传播/跳数参数待解码`;
    }
    return "命中时施加燃烧；燃烧伤害、持续时间和触发参数待解码";
  }

  if (scriptPath.includes("slow_in_zone_effect")) {
    return "命中时生成减速区域；减速幅度和持续时间待解码";
  }

  if (scriptPath.includes("projectiles_on_hit_effect")) {
    const count = Number.isFinite(effect.value) ? effect.value : "若干";
    if (effect.key === "effect_lightning_on_hit") {
      return `命中时产生 ${count} 个闪电投射物；投射物伤害参数待解码`;
    }
    if (effect.key === "EFFECT_SLOW_PROJECTILES_ON_HIT") {
      return `命中时产生 ${count} 个减速投射物；投射物伤害参数待解码`;
    }
    return `命中时产生 ${count} 个额外投射物；投射物伤害参数待解码`;
  }

  if (
    scriptPath.includes("weapon_effect_with_sub_effect") ||
    scriptPath.includes("effect_with_sub_effects")
  ) {
    const bonuses = effect.subEffects?.length
      ? effect.subEffects.map(formatSubEffect).join("、")
      : "具体强化参数待解码";
    if (effect.key === "convert_bonus_gold") {
      return `每 ${effect.value} 个未收集材料在波次结束时转换为：${bonuses}`;
    }
    const scope = effect.textKey === "EFFECT_MODIFY_EVERY_X_PROJECTILE" ? "每把远程武器的" : "";
    return `${scope}第 ${effect.value} 个投射物获得：${bonuses}`;
  }

  if (scriptPath.includes("null_charm_effect")) {
    const threshold = effect.effectParameters?.value2;
    const condition = Number.isFinite(threshold) ? `生命低于 ${threshold}%` : "低生命";
    const chance = Number.isFinite(effect.value) ? `${effect.value}% 概率` : "有概率";
    return `命中${condition}的敌人时有 ${chance}使其受到魅惑；持续时间待解码`;
  }

  if (scriptPath.includes("null_double_value_effect")) {
    if (effect.key === "bonus_damage_against_targets_above_hp") {
      return `对高生命目标造成的伤害 ${signedNumber(
        effect.value,
      )}%；目标生命高于 ${effect.effectParameters?.value2 ?? "待解码"}% 时生效`;
    }
    if (effect.key === "bonus_damage_against_targets_below_hp") {
      return `对低生命目标造成的伤害 ${signedNumber(
        effect.value,
      )}%；目标生命低于 ${effect.effectParameters?.value2 ?? "待解码"}% 时生效`;
    }
    if (effect.key === "bonus_current_health_damage") {
      return `附加目标当前生命值 ${effect.value}% 的伤害`;
    }
    if (effect.key === "break_on_hit") {
      return "命中时触发武器破损机制；具体概率和结果待解码";
    }
  }

  if (scriptPath.includes("weapon_slow_on_hit_effect")) {
    const scaledStat = effect.stat ? `随${statLabel(effect.stat)}提高` : "缩放属性待解码";
    return `命中时减速敌人，${scaledStat}（效果等级 ${signedNumber(effect.value)}）`;
  }

  if (scriptPath.includes("weapon_stack_effect")) {
    return `每额外持有 1 件同名武器：该武器基础伤害 ${signedNumber(effect.value)}`;
  }

  if (scriptPath.includes("one_shot_on_hit_effect")) {
    return `命中时有 ${effect.value}% 概率直接秒杀目标`;
  }

  if (scriptPath.includes("player_no_hit_effect")) {
    return `未受伤时基础伤害会随时间提高（每次 ${signedNumber(
      effect.value,
    )}）；受到伤害时重置`;
  }

  if (effect.key === "crit_on_hitting_burning_target") {
    return "命中燃烧中的敌人时必定暴击";
  }

  if (effect.key === "reload_turrets_on_shoot") {
    return "攻击时重置炮塔的攻击冷却";
  }

  if (effect.key === "reload_when_pickup_gold") {
    return "拾取材料时重置该武器的攻击冷却";
  }

  if (effect.key === "bounce_on_crit") {
    return `暴击时弹射 ${effect.value} 次`;
  }

  if (effect.key === "bounce") {
    return `弹射次数 ${signedNumber(effect.value)}`;
  }

  if (effect.key === "pierce_on_crit") {
    return `暴击时最多额外贯通 ${effect.value} 次`;
  }

  if (effect.key === "gold_on_crit_kill") {
    return `暴击击杀敌人时有 ${effect.value}% 概率获得 1 材料`;
  }

  if (effect.key === "burn_chance") {
    const burning = effect.relatedResources?.burning_data;
    if (burning) {
      return `攻击有 ${formatFractionChance(burning.chance)} 概率施加燃烧：每跳造成 ${formatDamageProfile(
        burning,
      )}，持续 ${burning.duration ?? "未知"} 秒`;
    }
    return "攻击有概率对敌人施加燃烧；触发概率待解码";
  }

  if (effect.textKey === "EFFECT_KNOCKBACK_AURA_PLURAL") {
    return `每 ${effect.value} 秒击退附近的敌人`;
  }

  if (effect.textKey === "EFFECT_LOCK_CURRENT_WEAPONS") {
    return "当前武器无法继续升级或回收";
  }

  if (effect.textKey === "EFFECT_START_WAVE_LESS_HP") {
    return `每波开始时拥有最大生命值的 ${100 + effect.value}%`;
  }

  if (effect.textKey === "EFFECT_INSTANT_GOLD_ATTRACTING") {
    return `${effect.value}% 概率立即吸收掉落的材料`;
  }

  if (effect.textKey === "EFFECT_FREE_SHOP_REROLL") {
    return `每次商店免费刷新 ${effect.value} 次`;
  }

  if (effect.textKey === "EFFECT_ACCURACY") {
    return `命中率 ${signedNumber(effect.value)}%`;
  }

  if (effect.textKey === "EFFECT_PROJECTILE" || effect.textKey === "EFFECT_PROJECTILES") {
    return `投射物 ${signedNumber(effect.value)}`;
  }

  if (effect.textKey === "EFFECT_CANDY_BAG_BONUS") {
    return `每波将 ${effect.value} 点属性随机分配到主要属性`;
  }

  if (effect.textKey === "EFFECT_EXTRA_ELITE_NEXT_WAVE_CHANCE") {
    return `每波有 ${effect.value}% 概率额外生成 1 个精英`;
  }

  if (effect.textKey === "EFFECT_MINIMUM_WEAPON_COOLDOWN") {
    return `武器攻击间隔最低为 ${formatCooldown(effect.value)}`;
  }

  if (effect.key === "bonus_damage_against_targets_above_hp") {
    return `对高生命目标造成的伤害 ${signedNumber(effect.value)}%；目标生命高于 ${
      effect.effectParameters?.value2 ?? "待解码"
    }% 时生效`;
  }

  if (effect.key === "bonus_damage_against_targets_below_hp") {
    return `对低生命目标造成的伤害 ${signedNumber(effect.value)}%；目标生命低于 ${
      effect.effectParameters?.value2 ?? "待解码"
    }% 时生效`;
  }

  if (effect.customKey === "increase_tier_on_reroll") {
    return `下次刷新后：该道具阶级 ${signedNumber(effect.value)}`;
  }

  if (effect.customKey === "duplicate_item") {
    return "复制下一个从商店获得的道具（不能超过道具持有上限）";
  }

  if (effect.customKey === "temp_stats_per_interval") {
    const interval = effect.effectParameters?.interval;
    const reset = effect.effectParameters?.reset_on_hit ? "；受到伤害时重置累计奖励" : "";
    return `每 ${interval ?? "待解码"} 秒：${keyLabel} ${formatStatValue(
      effect.key,
      effect.value,
    )}，持续到波次结束${reset}`;
  }

  if (effect.customKey === "stats_next_wave") {
    return `下一波：${keyLabel} ${formatStatValue(effect.key, effect.value)}`;
  }

  if (effect.customKey === "heal_on_dodge") {
    const chance = Number.isFinite(effect.chance) ? `${effect.chance}% 概率` : "有概率";
    return `闪避敌人攻击时：${chance}恢复 ${effect.value} 点生命`;
  }

  if (effect.customKey === "heal_on_kill" || effect.key === "heal_on_kill") {
    return `击杀敌人时有 ${effect.value}% 概率恢复 1 点生命`;
  }

  if (effect.customKey === "heal_on_crit_kill" || effect.key === "heal_on_crit_kill") {
    return `暴击击杀敌人时有 ${effect.value}% 概率恢复 1 点生命`;
  }

  if (effect.customKey === "explode_when_below_hp" || effect.key === "explode_when_below_hp") {
    const threshold = effect.effectParameters?.hp_threshold;
    const stats = effect.relatedResources?.stats;
    return `每波首次生命低于 ${threshold ?? "待解码"}% 时爆炸，造成 ${formatDamageProfile(
      stats,
    )}`;
  }

  if (effect.customKey === "chance_double_gold" || effect.key === "chance_double_gold") {
    return `拾取材料时有 ${effect.value}% 概率使其价值翻倍`;
  }

  if (effect.customKey === "harvesting_growth" || effect.key === "harvesting_growth") {
    return `每波结束时，收获额外增长 ${signedNumber(effect.value)}%`;
  }

  if (
    effect.customKey === "gain_pct_gold_start_wave" ||
    effect.key === "gain_pct_gold_start_wave"
  ) {
    return `每波开始时材料增加 ${signedNumber(effect.value)}%（受官方上限限制）`;
  }

  if (effect.customKey === "hit_protection" || effect.key === "hit_protection") {
    return `抵挡接下来受到的 ${effect.value} 次伤害`;
  }

  if (effect.customKey === "one_shot_trees" || effect.key === "one_shot_trees") {
    return "一次攻击即可摧毁树木";
  }

  if (
    effect.customKey === "extra_enemies_next_wave" ||
    effect.key === "extra_enemies_next_wave"
  ) {
    return `下一波额外特殊敌人 ${signedNumber(effect.value)}`;
  }

  if (effect.customKey === "projectiles_on_death" || effect.key === "projectiles_on_death") {
    return `敌人死亡时产生 ${effect.value} 个投射物，每个造成 ${formatDamageProfile(
      effect.relatedResources?.weapon_stats,
    )}`;
  }

  if (effect.customKey === "alien_eyes" || effect.key === "alien_eyes") {
    return `每 ${effect.effectParameters?.cooldown ?? "待解码"} 秒向周围发射 ${
      effect.value
    } 颗异形眼球，每颗造成 ${formatDamageProfile(effect.relatedResources?.weapon_stats)}`;
  }

  if (effect.customKey === "remove_speed" || effect.key === "remove_speed") {
    return `命中使敌人移速降低 ${effect.value}%，最多降低 ${
      effect.effectParameters?.value2 ?? "待解码"
    }%`;
  }

  if (effect.customKey === "hp_regen_bonus" || effect.key === "hp_regen_bonus") {
    return `生命低于 ${effect.effectParameters?.value2 ?? "待解码"}% 时，生命再生翻倍`;
  }

  if (effect.customKey === "torture" || effect.key === "torture") {
    return `每秒恢复 ${effect.value} 点生命，但无法通过其他方式恢复生命`;
  }

  if (scriptPath.includes("gain_stat_every_killed_enemies_effect")) {
    const threshold = Number.isFinite(effect.value) ? effect.value : "未知";
    const gain = Number.isFinite(effect.statNb) ? effect.statNb : 1;
    return `每用该武器击杀 ${threshold} 个敌人：${statLabel(effect.stat)} ${signedNumber(gain)}`;
  }

  if (scriptPath.includes("class_bonus_effect")) {
    const setLabel = setLabelFromId(effect.setId);
    const stat = statLabel(effect.statDisplayedName);
    return `${setLabel}套装：${stat} ${signedNumber(effect.value)}%`;
  }

  if (scriptPath.includes("stat_gains_modification_effect")) {
    const stats = effect.statsModified?.length
      ? effect.statsModified.map(statLabel).join("、")
      : statLabel(effect.statDisplayed);
    return `${stats} 获取 ${signedNumber(effect.value)}%`;
  }

  if (
    scriptPath.includes("gain_stat_for_every_stat_effect") ||
    scriptPath.includes("custom_arg.gd")
  ) {
    if (!effect.key) {
      return formatCustomScalingEffect(effect, trigger);
    }
    const scaled = statLabel(effect.statScaled);
    const permanent = effect.permStatsOnly ? "永久" : "";
    return `每 ${effect.nbStatScaled ?? 1} 点${permanent}${scaled}：${statLabel(
      effect.key,
    )} ${formatStatValue(effect.key, effect.value)}`;
  }

  if (scriptPath.includes("chance_stat_damage_effect")) {
    const chance = Number.isFinite(effect.chance) ? `${effect.chance}% 概率` : "概率触发";
    return `${trigger || "触发时"}：${chance}，造成相当于${keyLabel} ${effect.value}% 的伤害`;
  }

  if (effect.customKey === "enemy_percent_damage_taken") {
    const firstHit = effect.textKey === "EFFECT_ENEMY_PERCENT_DAMAGE_TAKEN_ONCE" ? "首次" : "";
    const damageType = scriptPath.includes("weapon_percent_damage_effect")
      ? ""
      : `以${keyLabel}`;
    const duration = effect.effectParameters?.duration_secs;
    const stacks = effect.effectParameters?.max_stacks;
    const stackText = Number.isFinite(stacks) && stacks > 1 ? `，最多叠加 ${stacks} 层` : "";
    return `${firstHit}${damageType}命中后：目标受到伤害 ${signedNumber(
      effect.value,
    )}%，持续 ${duration ?? "待解码"} 秒${stackText}`;
  }

  if (effect.key === "recycling_gains") {
    return `回收道具时额外材料 ${signedNumber(effect.value)}`;
  }

  if (effect.key === "item_box_gold") {
    return `打开箱子时获得材料 ${signedNumber(effect.value)}`;
  }

  if (effect.key === "enemy_fruit_drops") {
    return "敌人掉落水果的概率提高";
  }

  if (effect.key === "hp_start_next_wave") {
    return `下一波开始时的生命值 ${signedNumber(effect.value)}%`;
  }

  if (effect.key === "pickup_range") {
    return `拾取范围 ${signedNumber(effect.value)}%`;
  }

  if (effect.key === "piercing") {
    return `贯通次数 ${signedNumber(effect.value)}`;
  }

  if (effect.key === "piercing_damage") {
    return `贯通伤害 ${signedNumber(effect.value)}%`;
  }

  if (effect.key === "gold_drops") {
    return `材料掉落 ${signedNumber(effect.value)}%`;
  }

  if (effect.key === "trees") {
    return `每波生成的树木 ${signedNumber(effect.value)}`;
  }

  if (effect.key === "bouncing") {
    return `弹射次数 ${signedNumber(effect.value)}`;
  }

  if (effect.key === "giant_crit_damage") {
    return `暴击额外造成目标当前生命 ${effect.value}% 的伤害；Boss 和精英按 ${
      effect.effectParameters?.value2 ?? "待解码"
    }% 计算`;
  }

  if (effect.key === "weapons_price") return `武器价格 ${signedNumber(effect.value)}%`;
  if (effect.key === "max_turret_count") return `最大炮塔数量 ${signedNumber(effect.value)}`;
  if (effect.key === "trees_start_wave") return `每波开始额外生成树木 ${signedNumber(effect.value)}`;
  if (effect.key === "map_size") return `地图尺寸 ${signedNumber(effect.value)}%`;
  if (effect.key === "max_ranged_weapons") return `最多持有 ${effect.value} 件远程武器`;

  if (effect.key === "reroll_price") {
    return `商店刷新价格 ${signedNumber(effect.value)}%`;
  }

  if (effect.customKey === "extra_item_in_crate") {
    const itemLabel =
      effect.textKey === "EFFECT_EXTRA_RANDOM_ITEM_IN_CRATE" ? "随机道具" : keyLabel;
    return `每个箱子：${effect.value}% 概率额外获得${itemLabel}`;
  }

  if (effect.key === "loot_alien_chance") {
    return `战利品外星人出现概率 ${signedNumber(effect.value)}%`;
  }

  if (effect.key === "loot_alien_speed") {
    return `战利品外星人移速 ${signedNumber(effect.value)}%`;
  }

  if (effect.key === "extra_loot_aliens_next_wave") {
    return `下一波战利品外星人 ${signedNumber(effect.value)}`;
  }

  if (effect.key) {
    const value = formatStatValue(effect.key, effect.value);
    if (effect.key === "min_weapon_tier") return `最低武器阶级：T${effect.value + 1}`;
    if (effect.customKey === "starting_weapon") return `起始武器：${effect.key}`;
    if (effect.customKey === "starting_item") return `起始物品：${keyLabel} ${signedNumber(effect.value)}`;
    if (BINARY_EFFECT_KEYS.has(effect.key)) return keyLabel;
    if (trigger && Number.isFinite(effect.value) && effect.value === 0) return trigger;
    if (effect.customKey === "stats_end_of_wave") {
      return `${trigger || "每波结束"}：${keyLabel} ${value}`;
    }
    if (keyLabel === effect.key) {
      return trigger
        ? `${trigger}${Number.isFinite(effect.value) && effect.value !== 0 ? ` ${signedNumber(effect.value)}` : ""}`
        : "官方特殊效果；具体参数待解码";
    }
    if (trigger === keyLabel) return `${keyLabel} ${value}`;
    return trigger && trigger !== effect.textKey
      ? `${trigger}：${keyLabel} ${value}`
      : `${keyLabel} ${value}`;
  }

  if (effect.customKey) {
    return trigger || "官方特殊效果；具体参数待解码";
  }

  if (trigger) return trigger;

  return effect.scriptPath ? "官方特殊效果；具体参数待解码" : "效果参数待解码";
}

function buildEffectLines(records) {
  const lines = records.flatMap((record) =>
    (record.effects ?? []).flatMap((effect) => {
      const label = formatEffectDetail(effect);
      return label ? [`T${record.tier + 1} ${label}`] : [];
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

function summarizeCatalogRecordGroup(nameKey, records, localization, strategyEntry, setIndex) {
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
    tiers: unique(records.map((record) => record.tier)),
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
    setBonuses: setIds
      .map((setId) => {
        const set = setIndex?.get(setId);
        if (!set || !set.bonuses?.length) return null;
        return {
          setId,
          label: SET_LABELS[setId] ?? setId,
          bonuses: set.bonuses,
        };
      })
      .filter(Boolean),
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
        summary: "官方角色目录和中文名已抽取；策略路线与攻略模板仍待维护。",
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
  const setIndex = new Map((catalog?.sets ?? []).map((set) => [set.setId, set]));

  return [...groups.entries()]
    .map(([nameKey, records]) =>
      summarizeCatalogRecordGroup(
        nameKey,
        records,
        localization,
        strategyIndex.get(nameKey),
        setIndex,
      ),
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
