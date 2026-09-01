export const DAMAGE_TYPES = [
  "meleeDamage",
  "rangedDamage",
  "elementalDamage",
  "engineering",
];

export const DEFAULT_STATS = {
  maxHp: 0,
  hpRegen: 0,
  lifeSteal: 0,
  armor: 0,
  dodge: 0,
  damagePercent: 0,
  attackSpeed: 0,
  critChance: 0,
  meleeDamage: 0,
  rangedDamage: 0,
  elementalDamage: 0,
  engineering: 0,
  speed: 0,
  harvesting: 0,
  luck: 0,
};

export const DEFAULT_WEAPON = {
  name: "手动武器",
  quantity: 1,
  baseDamage: 20,
  cooldown: 1,
  hitsPerAttack: 1,
  piercing: 0,
  piercingDamageMultiplier: 0.5,
  bounces: 0,
  bounceDamageMultiplier: 0.5,
  explosionTargets: 0,
  explosionDamageMultiplier: 1,
  bossDamagePercent: 0,
  highHealthDamagePercent: 0,
  critChance: 0,
  critMultiplier: 2,
  scaling: {
    meleeDamage: 80,
    rangedDamage: 0,
    elementalDamage: 0,
    engineering: 0,
  },
};

export const DEFAULT_ITEM_DELTA = {
  maxHp: 0,
  hpRegen: 0,
  lifeSteal: 0,
  armor: 0,
  dodge: 0,
  damagePercent: 0,
  attackSpeed: 0,
  critChance: 0,
  meleeDamage: 0,
  rangedDamage: 0,
  elementalDamage: 0,
  engineering: 0,
  speed: 0,
  harvesting: 0,
  luck: 0,
};

export function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// 防御性有限值保护：任何中间或最终计算结果若出现 NaN/Infinity，
// 都回退到 fallback，避免非有限值静默流入展示层（P1-3）。
export function finiteOr(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function roundDamage(value, mode = "none") {
  if (mode === "floor") return Math.floor(value);
  if (mode === "round") return Math.round(value);
  if (mode === "ceil") return Math.ceil(value);
  return value;
}

export function normalizeStats(stats = {}) {
  return {
    ...DEFAULT_STATS,
    ...Object.fromEntries(
      Object.entries({ ...DEFAULT_STATS, ...stats }).map(([key, value]) => [
        key,
        toNumber(value),
      ]),
    ),
  };
}

export function normalizeWeapon(weapon = {}) {
  const merged = {
    ...DEFAULT_WEAPON,
    ...weapon,
    scaling: {
      ...DEFAULT_WEAPON.scaling,
      ...(weapon.scaling ?? {}),
    },
  };

  return {
    ...merged,
    quantity: Math.max(0, toNumber(merged.quantity, 1)),
    baseDamage: toNumber(merged.baseDamage),
    cooldown: Math.max(0.05, toNumber(merged.cooldown, 1)),
    hitsPerAttack: Math.max(0, toNumber(merged.hitsPerAttack, 1)),
    piercing: Math.max(0, toNumber(merged.piercing)),
    piercingDamageMultiplier: Math.max(
      0,
      toNumber(merged.piercingDamageMultiplier, 0.5),
    ),
    bounces: Math.max(0, toNumber(merged.bounces)),
    bounceDamageMultiplier: Math.max(
      0,
      toNumber(merged.bounceDamageMultiplier, 0.5),
    ),
    explosionTargets: Math.max(0, toNumber(merged.explosionTargets)),
    explosionDamageMultiplier: Math.max(
      0,
      toNumber(merged.explosionDamageMultiplier, 1),
    ),
    bossDamagePercent: Math.max(0, toNumber(merged.bossDamagePercent)),
    highHealthDamagePercent: Math.max(0, toNumber(merged.highHealthDamagePercent)),
    critChance: toNumber(merged.critChance),
    critMultiplier: Math.max(1, toNumber(merged.critMultiplier, 2)),
    scaling: Object.fromEntries(
      DAMAGE_TYPES.map((type) => [type, toNumber(merged.scaling[type])]),
    ),
  };
}

export function applyItemDelta(stats, itemDelta = {}) {
  const normalized = normalizeStats(stats);
  const delta = {
    ...DEFAULT_ITEM_DELTA,
    ...itemDelta,
  };

  return Object.fromEntries(
    Object.entries(normalized).map(([key, value]) => [
      key,
      value + toNumber(delta[key]),
    ]),
  );
}

export function calculateScaledDamage(stats, weapon) {
  const normalizedStats = normalizeStats(stats);
  const normalizedWeapon = normalizeWeapon(weapon);

  const scalingParts = Object.fromEntries(
    DAMAGE_TYPES.map((type) => {
      const statValue = normalizedStats[type];
      const scalingPercent = normalizedWeapon.scaling[type];
      return [type, statValue * (scalingPercent / 100)];
    }),
  );

  const scalingTotal = Object.values(scalingParts).reduce(
    (sum, value) => sum + value,
    0,
  );

  return {
    baseDamage: normalizedWeapon.baseDamage,
    scalingParts,
    raw: normalizedWeapon.baseDamage + scalingTotal,
  };
}

export function calculateWeaponDamage(stats, weapon, options = {}) {
  const normalizedStats = normalizeStats(stats);
  const normalizedWeapon = normalizeWeapon(weapon);
  const scaledDamage = calculateScaledDamage(normalizedStats, normalizedWeapon);
  const damageMultiplier = 1 + normalizedStats.damagePercent / 100;
  const rawNonCrit = Math.max(1, scaledDamage.raw * damageMultiplier);
  const nonCritDamage = Math.max(
    1,
    roundDamage(rawNonCrit, options.roundingMode),
  );
  const rawCrit = Math.max(1, rawNonCrit * normalizedWeapon.critMultiplier);
  const critDamage = Math.max(1, roundDamage(rawCrit, options.roundingMode));
  const totalCritChance = clamp(
    (normalizedStats.critChance + normalizedWeapon.critChance) / 100,
    0,
    1,
  );
  const expectedDamage =
    nonCritDamage * (1 - totalCritChance) + critDamage * totalCritChance;
  const speedMultiplier = Math.max(0.1, 1 + normalizedStats.attackSpeed / 100);
  const attackInterval = finiteOr(normalizedWeapon.cooldown / speedMultiplier, normalizedWeapon.cooldown);
  const attacksPerSecond = finiteOr(1 / attackInterval);
  const totalHitMultiplier =
    normalizedWeapon.hitsPerAttack * normalizedWeapon.quantity;
  const dps = finiteOr(expectedDamage * totalHitMultiplier * attacksPerSecond);

  return {
    weapon: normalizedWeapon,
    stats: normalizedStats,
    scaledDamage,
    damageMultiplier,
    rawNonCrit,
    nonCritDamage,
    critDamage,
    totalCritChance,
    expectedDamage,
    speedMultiplier,
    attackInterval,
    attacksPerSecond,
    totalHitMultiplier,
    dps,
  };
}

export function compareItem(stats, weapon, itemDelta = {}, options = {}) {
  const before = calculateWeaponDamage(stats, weapon, options);
  const afterStats = applyItemDelta(stats, itemDelta);
  const after = calculateWeaponDamage(afterStats, weapon, options);
  const dpsDelta = finiteOr(after.dps - before.dps);
  const dpsDeltaPercent = before.dps === 0 ? 0 : finiteOr((dpsDelta / before.dps) * 100);

  return {
    before,
    after,
    afterStats,
    dpsDelta,
    dpsDeltaPercent,
  };
}
