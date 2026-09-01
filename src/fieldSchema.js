// 统一数字字段 Schema 注册表（P1-3）。
//
// 这是模拟器所有数字输入的唯一约束来源：默认值、单位、步长、最小值、最大值、
// 是否必须为整数。UI 输入校验、OCR 导入、示例载入和未来配置导入全部复用
// validateNumberValue，避免各处各自夹值或各自解析。
//
// 约定：
// - min/max 同时反映游戏语义和计算器约束（例如冷却下限 0.05 秒、暴击倍率下限 1）。
//   合法范围内的值不会被计算层再次夹值，因此“页面显示值 === 传入计算器的值”。
// - 越界、空值、NaN、Infinity 一律判为非法，由 UI 明确报错并停止对应计算，
//   而不是静默夹值。

export const STAT_FIELD_SCHEMAS = {
  maxHp: { key: "maxHp", label: "最大生命", unit: "", step: 1, min: 0, max: 100000, integer: false, default: 0 },
  hpRegen: { key: "hpRegen", label: "生命再生", unit: "", step: 1, min: 0, max: 10000, integer: false, default: 0 },
  lifeSteal: { key: "lifeSteal", label: "生命窃取 %", unit: "%", step: 1, min: 0, max: 100, integer: false, default: 0 },
  armor: { key: "armor", label: "护甲", unit: "", step: 1, min: -1000, max: 10000, integer: false, default: 0 },
  dodge: { key: "dodge", label: "闪避 %", unit: "%", step: 1, min: 0, max: 100, integer: false, default: 0 },
  damagePercent: { key: "damagePercent", label: "总伤害 %", unit: "%", step: 1, min: -100, max: 10000, integer: false, default: 0 },
  attackSpeed: { key: "attackSpeed", label: "攻速 %", unit: "%", step: 1, min: -100, max: 10000, integer: false, default: 0 },
  critChance: { key: "critChance", label: "暴击率 %", unit: "%", step: 1, min: 0, max: 100, integer: false, default: 0 },
  meleeDamage: { key: "meleeDamage", label: "近战伤害", unit: "", step: 1, min: 0, max: 100000, integer: false, default: 0 },
  rangedDamage: { key: "rangedDamage", label: "远程伤害", unit: "", step: 1, min: 0, max: 100000, integer: false, default: 0 },
  elementalDamage: { key: "elementalDamage", label: "元素伤害", unit: "", step: 1, min: 0, max: 100000, integer: false, default: 0 },
  engineering: { key: "engineering", label: "工程学", unit: "", step: 1, min: 0, max: 100000, integer: false, default: 0 },
  speed: { key: "speed", label: "移速 %", unit: "%", step: 1, min: 0, max: 1000, integer: false, default: 0 },
  harvesting: { key: "harvesting", label: "收获", unit: "", step: 1, min: 0, max: 10000, integer: false, default: 0 },
  luck: { key: "luck", label: "幸运", unit: "", step: 1, min: 0, max: 10000, integer: false, default: 0 },
};

export const WEAPON_FIELD_SCHEMAS = {
  quantity: { key: "quantity", label: "武器数量", unit: "", step: 1, min: 0, max: 100, integer: true, default: 1 },
  baseDamage: { key: "baseDamage", label: "基础伤害", unit: "", step: 1, min: 0, max: 1000000, integer: false, default: 20 },
  cooldown: { key: "cooldown", label: "基础冷却 秒", unit: "s", step: 0.01, min: 0.05, max: 10, integer: false, default: 1 },
  hitsPerAttack: { key: "hitsPerAttack", label: "每次命中数", unit: "", step: 1, min: 0, max: 100, integer: true, default: 1 },
  piercing: { key: "piercing", label: "穿透次数", unit: "", step: 1, min: 0, max: 100, integer: true, default: 0 },
  piercingDamageMultiplier: { key: "piercingDamageMultiplier", label: "穿透伤害保留", unit: "x", step: 0.05, min: 0, max: 1, integer: false, default: 0.5 },
  bounces: { key: "bounces", label: "弹射次数", unit: "", step: 1, min: 0, max: 100, integer: true, default: 0 },
  bounceDamageMultiplier: { key: "bounceDamageMultiplier", label: "弹射伤害保留", unit: "x", step: 0.05, min: 0, max: 1, integer: false, default: 0.5 },
  explosionTargets: { key: "explosionTargets", label: "爆炸额外目标", unit: "", step: 1, min: 0, max: 100, integer: true, default: 0 },
  explosionDamageMultiplier: { key: "explosionDamageMultiplier", label: "爆炸伤害倍率", unit: "x", step: 0.05, min: 0, max: 10, integer: false, default: 1 },
  critChance: { key: "critChance", label: "武器暴击率 %", unit: "%", step: 1, min: 0, max: 100, integer: false, default: 0 },
  critMultiplier: { key: "critMultiplier", label: "暴击倍率", unit: "x", step: 0.1, min: 1, max: 10, integer: false, default: 2 },
};

// 默认值与 DEFAULT_WEAPON.scaling 保持一致（默认武器为 80% 近战缩放）。
export const SCALING_FIELD_SCHEMAS = {
  meleeDamage: { key: "meleeDamage", label: "近战缩放 %", unit: "%", step: 1, min: 0, max: 1000, integer: false, default: 80 },
  rangedDamage: { key: "rangedDamage", label: "远程缩放 %", unit: "%", step: 1, min: 0, max: 1000, integer: false, default: 0 },
  elementalDamage: { key: "elementalDamage", label: "元素缩放 %", unit: "%", step: 1, min: 0, max: 1000, integer: false, default: 0 },
  engineering: { key: "engineering", label: "工程缩放 %", unit: "%", step: 1, min: 0, max: 1000, integer: false, default: 0 },
};

// 道具变化量允许负值。
export const ITEM_DELTA_FIELD_SCHEMAS = {
  maxHp: { key: "maxHp", label: "最大生命 变化", unit: "", step: 1, min: -100000, max: 100000, integer: false, default: 0 },
  hpRegen: { key: "hpRegen", label: "生命再生 变化", unit: "", step: 1, min: -10000, max: 10000, integer: false, default: 0 },
  lifeSteal: { key: "lifeSteal", label: "生命窃取 % 变化", unit: "%", step: 1, min: -100, max: 100, integer: false, default: 0 },
  armor: { key: "armor", label: "护甲 变化", unit: "", step: 1, min: -1000, max: 1000, integer: false, default: 0 },
  dodge: { key: "dodge", label: "闪避 % 变化", unit: "%", step: 1, min: -100, max: 100, integer: false, default: 0 },
  damagePercent: { key: "damagePercent", label: "总伤害 % 变化", unit: "%", step: 1, min: -100, max: 1000, integer: false, default: 0 },
  attackSpeed: { key: "attackSpeed", label: "攻速 % 变化", unit: "%", step: 1, min: -100, max: 1000, integer: false, default: 0 },
  critChance: { key: "critChance", label: "暴击率 % 变化", unit: "%", step: 1, min: -100, max: 100, integer: false, default: 0 },
  meleeDamage: { key: "meleeDamage", label: "近战伤害 变化", unit: "", step: 1, min: -100000, max: 100000, integer: false, default: 0 },
  rangedDamage: { key: "rangedDamage", label: "远程伤害 变化", unit: "", step: 1, min: -100000, max: 100000, integer: false, default: 0 },
  elementalDamage: { key: "elementalDamage", label: "元素伤害 变化", unit: "", step: 1, min: -100000, max: 100000, integer: false, default: 0 },
  engineering: { key: "engineering", label: "工程学 变化", unit: "", step: 1, min: -100000, max: 100000, integer: false, default: 0 },
  speed: { key: "speed", label: "移速 % 变化", unit: "%", step: 1, min: -1000, max: 1000, integer: false, default: 0 },
  harvesting: { key: "harvesting", label: "收获 变化", unit: "", step: 1, min: -10000, max: 10000, integer: false, default: 0 },
  luck: { key: "luck", label: "幸运 变化", unit: "", step: 1, min: -10000, max: 10000, integer: false, default: 0 },
};

export const COMBAT_CONTEXT_FIELD_SCHEMAS = {
  enemyArmor: { key: "enemyArmor", label: "敌人护甲", unit: "", step: 1, min: -1000, max: 10000, integer: false, default: 0 },
  averageEnemyHp: { key: "averageEnemyHp", label: "平均敌人血量（0 用场景默认）", unit: "", step: 1, min: 0, max: 10000000, integer: false, default: 0 },
  positioningHitLoss: { key: "positioningHitLoss", label: "走位命中损失 %", unit: "%", step: 1, min: 0, max: 100, integer: false, default: 0 },
  burnBaseDamage: { key: "burnBaseDamage", label: "燃烧基础每跳伤害", unit: "", step: 1, min: 0, max: 100000, integer: false, default: 0 },
  burnElementalScaling: { key: "burnElementalScaling", label: "燃烧元素缩放 %", unit: "%", step: 1, min: 0, max: 1000, integer: false, default: 50 },
  burnApplicationChance: { key: "burnApplicationChance", label: "燃烧施加概率 %", unit: "%", step: 1, min: 0, max: 100, integer: false, default: 0 },
  burnDuration: { key: "burnDuration", label: "燃烧持续 秒", unit: "s", step: 0.1, min: 0, max: 60, integer: false, default: 3 },
  burnTickRate: { key: "burnTickRate", label: "燃烧每秒跳数", unit: "/s", step: 0.1, min: 0, max: 10, integer: false, default: 1 },
  burnSpreadChance: { key: "burnSpreadChance", label: "燃烧传播概率 %", unit: "%", step: 1, min: 0, max: 100, integer: false, default: 0 },
  burnSpreadTargets: { key: "burnSpreadTargets", label: "传播额外目标", unit: "", step: 1, min: 0, max: 100, integer: true, default: 0 },
  curseIntensity: { key: "curseIntensity", label: "诅咒强度", unit: "", step: 1, min: 0, max: 100, integer: false, default: 0 },
  curseEnemyPowerPerPoint: { key: "curseEnemyPowerPerPoint", label: "每点诅咒敌人增强 %", unit: "%", step: 1, min: 0, max: 100, integer: false, default: 1 },
  curseRewardPerPoint: { key: "curseRewardPerPoint", label: "每点诅咒奖励增强 %", unit: "%", step: 1, min: 0, max: 100, integer: false, default: 0.5 },
  structureCount: { key: "structureCount", label: "结构物数量", unit: "", step: 1, min: 0, max: 100, integer: true, default: 0 },
  structureBaseDamage: { key: "structureBaseDamage", label: "结构物基础伤害", unit: "", step: 1, min: 0, max: 100000, integer: false, default: 10 },
  structureCooldown: { key: "structureCooldown", label: "结构物冷却 秒", unit: "s", step: 0.1, min: 0.05, max: 60, integer: false, default: 1.5 },
  structureEngineeringScaling: { key: "structureEngineeringScaling", label: "结构物工程缩放 %", unit: "%", step: 1, min: 0, max: 1000, integer: false, default: 100 },
  structureUptime: { key: "structureUptime", label: "结构物有效时间 %", unit: "%", step: 1, min: 0, max: 100, integer: false, default: 100 },
  structureHitChance: { key: "structureHitChance", label: "结构物命中率 %", unit: "%", step: 1, min: 0, max: 100, integer: false, default: 85 },
  structureTargets: { key: "structureTargets", label: "结构物目标数", unit: "", step: 1, min: 0, max: 100, integer: true, default: 1 },
  speedAvoidancePerPoint: { key: "speedAvoidancePerPoint", label: "每点移速规避 %", unit: "%", step: 0.05, min: 0, max: 10, integer: false, default: 0.35 },
  speedAvoidanceCap: { key: "speedAvoidanceCap", label: "移速规避上限 %", unit: "%", step: 1, min: 0, max: 100, integer: false, default: 35 },
};

// 把 Schema 表转成 { key: label } 映射，供 UI 复用同一份标签来源。
export function labelMap(schemas) {
  return Object.fromEntries(Object.values(schemas).map((schema) => [schema.key, schema.label]));
}

// 宽松地把原始值转成有限数字：接受 number、"25%"、"+5"、" 12.5 " 等；
// 无法解析时返回 NaN，由 validateNumberValue 判定为非法。
export function toNumeric(rawValue) {
  if (typeof rawValue === "number") return rawValue;
  if (rawValue === null || rawValue === undefined) return NaN;
  const cleaned = String(rawValue).replace(/[%+，,；;\s]/g, "");
  if (cleaned === "") return NaN;
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return NaN;
  return Number(match[0]);
}

// 统一数字校验器。返回 { ok, value, error }：
// - ok=false 时 value 可能是 NaN（无法解析）或越界原值，error 是面向用户的中文说明；
// - ok=true 时 value 是落在 [min, max] 内、满足整数约束的有限数字。
export function validateNumberValue(rawValue, schema) {
  if (rawValue === undefined || rawValue === null) {
    return { ok: false, value: NaN, error: "请输入数字" };
  }
  if (typeof rawValue === "string" && rawValue.trim() === "") {
    return { ok: false, value: NaN, error: "请输入数字" };
  }

  const number = toNumeric(rawValue);
  if (!Number.isFinite(number)) {
    return { ok: false, value: NaN, error: "必须是有限数字" };
  }
  if (schema.integer && !Number.isInteger(number)) {
    return { ok: false, value: number, error: "必须是整数" };
  }
  if (number < schema.min) {
    return { ok: false, value: number, error: `不能小于 ${schema.min}` };
  }
  if (number > schema.max) {
    return { ok: false, value: number, error: `不能大于 ${schema.max}` };
  }
  return { ok: true, value: number, error: null };
}