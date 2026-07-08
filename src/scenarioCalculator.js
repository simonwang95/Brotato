import {
  calculateWeaponDamage,
  clamp,
  normalizeStats,
  normalizeWeapon,
  toNumber,
} from "./calculator.js";
import { DEFAULT_COMBAT_CONTEXT, ITEM_EFFECTS, SCENARIOS } from "./scenarioData.js";

function resolveScenario(scenarioId) {
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) throw new Error(`Unknown scenario id: ${scenarioId}`);
  return scenario;
}

function resolveItemEffect(itemEffectId) {
  const itemEffect = ITEM_EFFECTS[itemEffectId] ?? ITEM_EFFECTS.none;
  if (!itemEffect) throw new Error(`Unknown item effect id: ${itemEffectId}`);
  return itemEffect;
}

function normalizeCombatContext(context = {}) {
  const merged = {
    ...DEFAULT_COMBAT_CONTEXT,
    ...context,
  };

  return Object.fromEntries(
    Object.entries(merged).map(([key, value]) => [key, toNumber(value, DEFAULT_COMBAT_CONTEXT[key])]),
  );
}

function calculateArmorDamageMultiplier(armor) {
  if (armor <= 0) return clamp(1 + Math.abs(armor) / 15, 1, 2.5);
  return clamp(1 - armor / (armor + 15), 0.1, 1);
}

function calculateOverflowLoss(expectedDamage, averageEnemyHp, wasteWeight) {
  if (expectedDamage <= 0 || averageEnemyHp <= 0 || wasteWeight <= 0) return 0;
  const wastedShare = Math.max(0, (expectedDamage - averageEnemyHp) / expectedDamage);
  return clamp(wastedShare * wasteWeight, 0, 0.85);
}

function calculateDeliveryModel(base, scenario, context) {
  const averageEnemyHp = context.averageEnemyHp > 0 ? context.averageEnemyHp : scenario.averageEnemyHp;
  const enemyArmorMultiplier = calculateArmorDamageMultiplier(context.enemyArmor);
  const overflowLoss = calculateOverflowLoss(
    base.expectedDamage * enemyArmorMultiplier,
    averageEnemyHp,
    scenario.overkillWasteWeight,
  );
  const positioningHitLoss = clamp(
    (context.positioningHitLoss / 100) * scenario.positioningStress,
    0,
    0.95,
  );
  const deliveryMultiplier = enemyArmorMultiplier * (1 - overflowLoss) * (1 - positioningHitLoss);

  return {
    averageEnemyHp,
    enemyArmorMultiplier,
    overflowLoss,
    positioningHitLoss,
    deliveryMultiplier,
  };
}

export function calculateScenarioHitModel(stats, weapon, scenarioId, options = {}) {
  const scenario = resolveScenario(scenarioId);
  const normalizedWeapon = normalizeWeapon(weapon);
  const context = normalizeCombatContext(options.combatContext);
  const base = calculateWeaponDamage(stats, normalizedWeapon, options);
  const baseHitRate =
    base.attacksPerSecond * normalizedWeapon.quantity * normalizedWeapon.hitsPerAttack;
  const delivery = calculateDeliveryModel(base, scenario, context);

  const lineExtraTargets = Math.max(0, scenario.averageLineTargets - 1);
  const nearbyExtraTargets = Math.max(0, scenario.averageTargetsInRange - 1);
  const piercingExtraHits =
    Math.min(normalizedWeapon.piercing, lineExtraTargets) *
    normalizedWeapon.piercingDamageMultiplier;
  const bounceExtraHits =
    Math.min(normalizedWeapon.bounces, nearbyExtraTargets) *
    normalizedWeapon.bounceDamageMultiplier;
  const explosionExtraHits =
    Math.min(normalizedWeapon.explosionTargets, nearbyExtraTargets) *
    normalizedWeapon.explosionDamageMultiplier;

  const contributionFromHits = (extraHits) =>
    base.expectedDamage * baseHitRate * extraHits;

  const rawPiercingDps = contributionFromHits(piercingExtraHits);
  const rawBounceDps = contributionFromHits(bounceExtraHits);
  const rawExplosionDps = contributionFromHits(explosionExtraHits);
  const rawExtraDps = rawPiercingDps + rawBounceDps + rawExplosionDps;
  const rawScenarioWeaponDps = base.dps + rawExtraDps;
  const piercingDps = rawPiercingDps * delivery.deliveryMultiplier;
  const bounceDps = rawBounceDps * delivery.deliveryMultiplier;
  const explosionDps = rawExplosionDps * delivery.deliveryMultiplier;
  const extraDps = piercingDps + bounceDps + explosionDps;

  return {
    scenario,
    context,
    weapon: normalizedWeapon,
    base,
    baseHitRate,
    baseHitDps: base.dps * delivery.deliveryMultiplier,
    rawBaseHitDps: base.dps,
    piercingExtraHits,
    bounceExtraHits,
    explosionExtraHits,
    rawPiercingDps,
    rawBounceDps,
    rawExplosionDps,
    piercingDps,
    bounceDps,
    explosionDps,
    rawExtraDps,
    extraDps,
    rawScenarioWeaponDps,
    delivery,
    enemyArmorMultiplier: delivery.enemyArmorMultiplier,
    overflowLoss: delivery.overflowLoss,
    positioningHitLoss: delivery.positioningHitLoss,
    scenarioWeaponDps: rawScenarioWeaponDps * delivery.deliveryMultiplier,
  };
}

export function calculateItemEffectDps(stats, scenarioId, itemEffectId = "none", options = {}) {
  const normalizedStats = normalizeStats(stats);
  const scenario = resolveScenario(scenarioId);
  const itemEffect = resolveItemEffect(itemEffectId);
  const context = normalizeCombatContext(options.combatContext);
  const enemyArmorMultiplier = calculateArmorDamageMultiplier(context.enemyArmor);

  if (itemEffect.trigger === "none") {
    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
    };
  }

  if (itemEffect.trigger === "pickupUtility") {
    const pickupAttraction = Math.max(0, itemEffect.pickupAttraction ?? 0);
    const pickupMultiplier = 1 + pickupAttraction / 100;
    const extraPickupRate = scenario.pickupRatePerSecond * (pickupAttraction / 100);
    const triggerAmplifier =
      1 +
      clamp(normalizedStats.luck / 300, 0, 2) * 0.5 +
      clamp(normalizedStats.damagePercent / 300, 0, 1);
    const pickupUtilityScore = extraPickupRate * triggerAmplifier * 10;

    return {
      itemEffect,
      scenario,
      triggerRate: extraPickupRate,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      pickupAttraction,
      pickupMultiplier,
      extraPickupRate,
      triggerAmplifier,
      pickupUtilityScore,
    };
  }

  if (itemEffect.trigger === "onCritKillMaterial") {
    const critChance = clamp(normalizedStats.critChance / 100, 0, 1);
    const chance = clamp((itemEffect.chance ?? 0) / 100, 0, 1);
    const materialValue = Math.max(0, itemEffect.materialValue ?? 1);
    const extraMaterialRate = scenario.killRateMultiplier * critChance * chance * materialValue;
    const economyUtilityScore = extraMaterialRate * 20;

    return {
      itemEffect,
      scenario,
      triggerRate: scenario.killRateMultiplier,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      critChance,
      materialValue,
      extraMaterialRate,
      economyUtilityScore,
      economyLabel: "暴击击杀材料",
    };
  }

  if (itemEffect.trigger === "onPickupMaterialBonus") {
    const chance = clamp((itemEffect.chance ?? 0) / 100, 0, 1);
    const materialValue = Math.max(0, itemEffect.materialValue ?? 1);
    const extraMaterialRate = scenario.pickupRatePerSecond * chance * materialValue;
    const economyUtilityScore = extraMaterialRate * 20;

    return {
      itemEffect,
      scenario,
      triggerRate: scenario.pickupRatePerSecond,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      materialValue,
      extraMaterialRate,
      economyUtilityScore,
      economyLabel: "拾取双倍材料期望",
    };
  }

  const triggerRate =
    itemEffect.trigger === "onPickup"
      ? scenario.pickupRatePerSecond
      : itemEffect.trigger === "onKill"
        ? scenario.killRateMultiplier
        : 0;
  const chance = itemEffect.chance / 100;
  const statScalingDamage = Object.entries(itemEffect.statScaling ?? {}).reduce(
    (sum, [statId, scaling]) => sum + (normalizedStats[statId] ?? 0) * scaling,
    0,
  );
  const expectedDamage = Math.max(
    0,
    itemEffect.baseDamage +
      normalizedStats.luck * itemEffect.luckScaling +
      statScalingDamage,
  );
  const damageMultiplier = Math.max(0, 1 + normalizedStats.damagePercent / 100);
  const modifiedExpectedDamage = expectedDamage * damageMultiplier;
  const rawDps = triggerRate * chance * modifiedExpectedDamage;
  const dps = rawDps * enemyArmorMultiplier;

  return {
    itemEffect,
    scenario,
    triggerRate,
    expectedDamage,
    damageMultiplier,
    modifiedExpectedDamage,
    rawDps,
    dps,
  };
}

export function calculateBurningDps(stats, weapon, scenarioId, options = {}) {
  const normalizedStats = normalizeStats(stats);
  const scenario = resolveScenario(scenarioId);
  const context = normalizeCombatContext(options.combatContext);
  const hitModel = calculateScenarioHitModel(stats, weapon, scenarioId, options);
  const applicationChance = clamp(context.burnApplicationChance / 100, 0, 1);

  if (applicationChance === 0 || context.burnDuration <= 0 || context.burnTickRate <= 0) {
    return {
      uptime: 0,
      burnDamage: 0,
      spreadMultiplier: 1,
      dps: 0,
    };
  }

  const applicationRate = hitModel.baseHitRate * applicationChance * (1 - hitModel.positioningHitLoss);
  const uptime = clamp(1 - Math.exp(-applicationRate * context.burnDuration), 0, 1);
  const burnDamage = Math.max(
    0,
    context.burnBaseDamage + normalizedStats.elementalDamage * (context.burnElementalScaling / 100),
  );
  const spreadTargets = Math.min(
    Math.max(0, context.burnSpreadTargets),
    Math.max(0, scenario.averageTargetsInRange - 1),
  );
  const spreadMultiplier = 1 + spreadTargets * clamp(context.burnSpreadChance / 100, 0, 1);
  const dps =
    burnDamage *
    context.burnTickRate *
    uptime *
    spreadMultiplier *
    hitModel.enemyArmorMultiplier;

  return {
    applicationRate,
    uptime,
    burnDamage,
    spreadTargets,
    spreadMultiplier,
    dps,
  };
}

export function calculateStructureDps(stats, scenarioId, options = {}) {
  const normalizedStats = normalizeStats(stats);
  const scenario = resolveScenario(scenarioId);
  const context = normalizeCombatContext(options.combatContext);

  if (context.structureCount <= 0 || context.structureCooldown <= 0) {
    return {
      structureDamage: 0,
      attacksPerSecond: 0,
      targetMultiplier: 0,
      dps: 0,
    };
  }

  const structureDamage = Math.max(
    0,
    context.structureBaseDamage +
      normalizedStats.engineering * (context.structureEngineeringScaling / 100),
  );
  const attacksPerSecond = context.structureCount / Math.max(0.05, context.structureCooldown);
  const targetMultiplier = Math.min(
    Math.max(1, context.structureTargets),
    Math.max(1, scenario.averageTargetsInRange),
  );
  const uptime = clamp(context.structureUptime / 100, 0, 1);
  const hitChance = clamp(context.structureHitChance / 100, 0, 1);
  const enemyArmorMultiplier = calculateArmorDamageMultiplier(context.enemyArmor);
  const dps = structureDamage * attacksPerSecond * targetMultiplier * uptime * hitChance * enemyArmorMultiplier;

  return {
    structureDamage,
    attacksPerSecond,
    targetMultiplier,
    uptime,
    hitChance,
    enemyArmorMultiplier,
    dps,
  };
}

export function calculateCurseModel(options = {}) {
  const context = normalizeCombatContext(options.combatContext);
  const curseIntensity = Math.max(0, context.curseIntensity);
  const enemyPowerMultiplier = 1 + curseIntensity * (context.curseEnemyPowerPerPoint / 100);
  const rewardMultiplier = 1 + curseIntensity * (context.curseRewardPerPoint / 100);

  return {
    curseIntensity,
    enemyPowerMultiplier,
    rewardMultiplier,
  };
}

export function calculateSurvivalModel(stats, options = {}) {
  const normalizedStats = normalizeStats(stats);
  const context = normalizeCombatContext(options.combatContext);
  const curse = calculateCurseModel(options);
  const dodgeChance = clamp(normalizedStats.dodge / 100, 0, 0.6);
  const speedAvoidance = clamp(
    (normalizedStats.speed * context.speedAvoidancePerPoint) / 100,
    0,
    context.speedAvoidanceCap / 100,
  );
  const effectiveAvoidance = 1 - (1 - dodgeChance) * (1 - speedAvoidance);
  const incomingDamageMultiplier = (1 - effectiveAvoidance) * curse.enemyPowerMultiplier;
  const relativeSurvival = incomingDamageMultiplier <= 0 ? Infinity : 1 / incomingDamageMultiplier;

  return {
    dodgeChance,
    speedAvoidance,
    effectiveAvoidance,
    incomingDamageMultiplier,
    relativeSurvival,
  };
}

export function calculateScenarioDps(
  stats,
  weapon,
  scenarioId = "normalWave",
  itemEffectId = "none",
  options = {},
) {
  const hitModel = calculateScenarioHitModel(stats, weapon, scenarioId, options);
  const itemEffect = calculateItemEffectDps(stats, scenarioId, itemEffectId, options);
  const burning = calculateBurningDps(stats, weapon, scenarioId, options);
  const structures = calculateStructureDps(stats, scenarioId, options);
  const curse = calculateCurseModel(options);
  const survival = calculateSurvivalModel(stats, options);
  const totalDps = hitModel.scenarioWeaponDps + itemEffect.dps + burning.dps + structures.dps;
  const effectiveClearScore = totalDps === 0 ? 0 : (totalDps * curse.rewardMultiplier) / curse.enemyPowerMultiplier;

  return {
    ...hitModel,
    itemEffect,
    burning,
    structures,
    curse,
    survival,
    totalDps,
    effectiveClearScore,
  };
}
