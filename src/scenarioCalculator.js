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
  if (itemEffectId && typeof itemEffectId === "object") return itemEffectId;
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
  const bossDamagePercent = scenario.id === "boss" ? normalizedWeapon.bossDamagePercent : 0;
  const highHealthDamageUptime = clamp(scenario.highHealthDamageUptime ?? 0.25, 0, 1);
  const highHealthDamagePercent = normalizedWeapon.highHealthDamagePercent;
  const conditionalDamageBonusPercent =
    bossDamagePercent + highHealthDamagePercent * highHealthDamageUptime;
  const conditionalDamageMultiplier = 1 + conditionalDamageBonusPercent / 100;
  const delivery = calculateDeliveryModel(
    {
      ...base,
      expectedDamage: base.expectedDamage * conditionalDamageMultiplier,
    },
    scenario,
    context,
  );

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
    base.expectedDamage * baseHitRate * extraHits * conditionalDamageMultiplier;

  const rawPiercingDps = contributionFromHits(piercingExtraHits);
  const rawBounceDps = contributionFromHits(bounceExtraHits);
  const rawExplosionDps = contributionFromHits(explosionExtraHits);
  const rawExtraDps = rawPiercingDps + rawBounceDps + rawExplosionDps;
  const rawBaseHitDps = base.dps * conditionalDamageMultiplier;
  const rawScenarioWeaponDps = rawBaseHitDps + rawExtraDps;
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
    baseHitDps: rawBaseHitDps * delivery.deliveryMultiplier,
    rawBaseHitDps,
    bossDamagePercent,
    highHealthDamagePercent,
    highHealthDamageUptime,
    conditionalDamageBonusPercent,
    conditionalDamageMultiplier,
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

  if (itemEffect.trigger === "cursedKillMaterial") {
    const materialValue = Math.max(0, itemEffect.materialValue ?? 1);
    const curseGain = Math.max(0, itemEffect.curseGain ?? 0);
    const cursedEnemyShare = clamp((context.curseIntensity + curseGain) / 100, 0, 0.6);
    const enemyCountMultiplier = 1 + Math.max(0, itemEffect.enemyCountPercent ?? 0) / 100;
    const riskMultiplier =
      1 +
      Math.max(0, itemEffect.enemyHealthPercent ?? 0) / 100 +
      Math.max(0, itemEffect.enemyDamagePercent ?? 0) / 100;
    const triggerRate = scenario.killRateMultiplier * enemyCountMultiplier;
    const extraMaterialRate = triggerRate * cursedEnemyShare * materialValue;
    const economyUtilityScore = (extraMaterialRate * 24 + curseGain * 0.35) / riskMultiplier;

    return {
      itemEffect,
      scenario,
      triggerRate,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      materialValue,
      curseGain,
      cursedEnemyShare,
      enemyCountMultiplier,
      riskMultiplier,
      extraMaterialRate,
      economyUtilityScore,
      economyLabel: "诅咒击杀材料潜力",
    };
  }

  if (itemEffect.trigger === "enemyGoldDropBonus") {
    const goldDropBonusPercent = Math.max(0, itemEffect.goldDropBonusPercent ?? 0);
    const riskMultiplier = 1 + Math.max(0, itemEffect.enemyDamagePercent ?? 0) / 100;
    const extraMaterialRate = scenario.killRateMultiplier * (goldDropBonusPercent / 100);
    const economyUtilityScore = (extraMaterialRate * 20) / riskMultiplier;

    return {
      itemEffect,
      scenario,
      triggerRate: scenario.killRateMultiplier,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      goldDropBonusPercent,
      riskMultiplier,
      extraMaterialRate,
      economyUtilityScore,
      economyLabel: "敌人掉落材料潜力",
    };
  }

  if (itemEffect.trigger === "curseShopPotential") {
    const curseLockedChance = Math.max(0, itemEffect.curseLockedChance ?? 0);
    const curseGain = Math.max(0, itemEffect.curseGain ?? 0);
    const economyUtilityScore = curseLockedChance / 8 + curseGain * 0.5;

    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      curseLockedChance,
      curseGain,
      economyUtilityScore,
      economyLabel: "锁定物品诅咒潜力",
    };
  }

  if (itemEffect.trigger === "shopEfficiency") {
    const itemDiscountPercent = Math.max(0, itemEffect.itemDiscountPercent ?? 0);
    const rerollDiscountPercent = Math.max(0, itemEffect.rerollDiscountPercent ?? 0);
    const freeRerolls = Math.max(0, itemEffect.freeRerolls ?? 0);
    const economyMultiplier =
      1 +
      clamp(normalizedStats.harvesting / 150, 0, 1) * 0.5 +
      clamp(normalizedStats.luck / 250, 0, 1) * 0.35;
    const economyUtilityScore =
      (itemDiscountPercent * 0.8 + rerollDiscountPercent * 0.16 + freeRerolls * 2.5) *
      economyMultiplier;

    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      itemDiscountPercent,
      rerollDiscountPercent,
      freeRerolls,
      economyMultiplier,
      economyUtilityScore,
      economyLabel: "商店效率潜力",
    };
  }

  if (itemEffect.trigger === "nextWaveXpSurge") {
    const xpGainPercent = Math.max(0, itemEffect.xpGainPercent ?? 0);
    const enemyHealthPercent = Math.max(0, itemEffect.enemyHealthPercent ?? 0);
    const enemyDamagePercent = Math.max(0, itemEffect.enemyDamagePercent ?? 0);
    const enemySpeedPercent = Math.max(0, itemEffect.enemySpeedPercent ?? 0);
    const riskMultiplier =
      1 + enemyHealthPercent / 100 + enemyDamagePercent / 100 + enemySpeedPercent / 150;
    const economyMultiplier =
      1 +
      clamp(normalizedStats.harvesting / 150, 0, 1) * 0.35 +
      clamp(normalizedStats.luck / 250, 0, 1) * 0.2;
    const economyUtilityScore = (xpGainPercent / 8 / riskMultiplier) * economyMultiplier;

    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      xpGainPercent,
      enemyHealthPercent,
      enemyDamagePercent,
      enemySpeedPercent,
      riskMultiplier,
      economyMultiplier,
      economyUtilityScore,
      economyLabel: "下一波经验潜力",
    };
  }

  if (itemEffect.trigger === "conditionalDamageSupport") {
    const bossDamagePercent = Math.max(0, itemEffect.bossDamagePercent ?? 0);
    const highHealthDamagePercent = Math.max(0, itemEffect.highHealthDamagePercent ?? 0);
    const giantCritDamageValue = Math.max(0, itemEffect.giantCritDamageValue ?? 0);
    const critChance = clamp(normalizedStats.critChance / 100, 0, 1);
    const highHealthDamageUptime = clamp(scenario.highHealthDamageUptime ?? 0.25, 0, 1);
    const effectiveBossDamagePercent = scenario.id === "boss" ? bossDamagePercent : 0;
    const expectedHighHealthDamagePercent = highHealthDamagePercent * highHealthDamageUptime;
    const bossDamageUtility = effectiveBossDamagePercent / 5;
    const highHealthDamageUtility = expectedHighHealthDamagePercent / 5;
    const giantCritUtility = scenario.id === "boss" ? (giantCritDamageValue * critChance) / 2 : 0;
    const conditionalDamageUtilityScore =
      bossDamageUtility + highHealthDamageUtility + giantCritUtility;
    const utilityLabel = giantCritDamageValue
      ? "暴击高生命目标潜力"
      : bossDamagePercent
        ? "Boss 条件伤害潜力"
        : "高生命目标伤害潜力";

    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      bossDamagePercent,
      highHealthDamagePercent,
      giantCritDamageValue,
      critChance,
      highHealthDamageUptime,
      effectiveBossDamagePercent,
      expectedHighHealthDamagePercent,
      bossDamageUtility,
      highHealthDamageUtility,
      giantCritUtility,
      conditionalDamageUtilityScore,
      utilityLabel,
    };
  }

  if (itemEffect.trigger === "explosionAmplifier") {
    const explosionDamagePercent = Math.max(0, itemEffect.explosionDamagePercent ?? 0);
    const explosionSizePercent = Math.max(0, itemEffect.explosionSizePercent ?? 0);
    const densityMultiplier = clamp(scenario.averageTargetsInRange / 4, 0.5, 2);
    const explosionUtilityScore =
      (explosionDamagePercent / 15 + explosionSizePercent / 12) * densityMultiplier;

    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      explosionDamagePercent,
      explosionSizePercent,
      densityMultiplier,
      explosionUtilityScore,
      utilityLabel: "爆炸覆盖潜力",
    };
  }

  if (itemEffect.trigger === "burningSupport") {
    const burnSpreadTargets = Math.max(0, itemEffect.burnSpreadTargets ?? 0);
    const burningEnemyHpPercent = Math.max(0, itemEffect.burningEnemyHpPercent ?? 0);
    const burningCooldownReductionPercent = Math.max(
      0,
      itemEffect.burningCooldownReductionPercent ?? 0,
    );
    const densityMultiplier = clamp(scenario.averageTargetsInRange / 4, 0.5, 2);
    const elementalMultiplier = 1 + clamp(normalizedStats.elementalDamage / 80, 0, 1.5);
    const burningUtilityScore =
      (burnSpreadTargets * 2 +
        burningEnemyHpPercent / 6 +
        burningCooldownReductionPercent / 12) *
      densityMultiplier *
      elementalMultiplier;

    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      burnSpreadTargets,
      burningEnemyHpPercent,
      burningCooldownReductionPercent,
      densityMultiplier,
      elementalMultiplier,
      burningUtilityScore,
      utilityLabel: "燃烧覆盖潜力",
    };
  }

  if (itemEffect.trigger === "structureSupport") {
    const structureCount = Math.max(0, itemEffect.structureCount ?? 0);
    const structureAttackSpeedPercent = Math.max(0, itemEffect.structureAttackSpeedPercent ?? 0);
    const structuresCooldownReductionPercent = Math.max(
      0,
      itemEffect.structuresCooldownReductionPercent ?? 0,
    );
    const projectileBonus = Math.max(0, itemEffect.projectileBonus ?? 0);
    const structuresCanCrit = Boolean(itemEffect.structuresCanCrit);
    const critChanceBonus = Math.max(0, itemEffect.critChanceBonus ?? 0);
    const structureCritChance = structuresCanCrit
      ? clamp((normalizedStats.critChance + critChanceBonus) / 100, 0, 1)
      : 0;
    const structureCritMultiplier = 1 + structureCritChance;
    const structureCritUtility = structuresCanCrit ? structureCritChance * 20 : 0;
    const engineeringMultiplier = 1 + clamp(normalizedStats.engineering / 80, 0, 1.5);
    const densityMultiplier = clamp(scenario.averageTargetsInRange / 4, 0.5, 2);
    const structureUtilityScore =
      (structureCount * 2 +
        structureAttackSpeedPercent / 10 +
        structuresCooldownReductionPercent / 8 +
        projectileBonus) *
        structureCritMultiplier *
        engineeringMultiplier *
        densityMultiplier +
      structureCritUtility *
      engineeringMultiplier *
      densityMultiplier;

    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      structureCount,
      structureAttackSpeedPercent,
      structuresCooldownReductionPercent,
      projectileBonus,
      structuresCanCrit,
      critChanceBonus,
      structureCritChance,
      structureCritMultiplier,
      structureCritUtility,
      engineeringMultiplier,
      densityMultiplier,
      structureUtilityScore,
      utilityLabel: structuresCanCrit ? "结构物暴击输出潜力" : "结构物输出潜力",
    };
  }

  if (itemEffect.trigger === "piercingSupport") {
    const piercing = Math.max(0, itemEffect.piercing ?? 0);
    const critChance = itemEffect.critGated ? clamp(normalizedStats.critChance / 100, 0, 1) : 1;
    const lineOpportunity = Math.max(0, scenario.averageLineTargets - 1);
    const effectivePiercing = Math.min(piercing, lineOpportunity) * critChance;
    const rangedMultiplier =
      1 +
      clamp(normalizedStats.rangedDamage / 80, 0, 1) +
      clamp(normalizedStats.damagePercent / 200, 0, 0.8);
    const densityMultiplier = clamp(scenario.averageLineTargets / 2, 0.5, 2);
    const piercingUtilityScore =
      effectivePiercing * scenario.killRateMultiplier * rangedMultiplier * densityMultiplier * 2;

    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      piercing,
      critChance,
      lineOpportunity,
      effectivePiercing,
      rangedMultiplier,
      densityMultiplier,
      piercingUtilityScore,
      utilityLabel: itemEffect.critGated ? "暴击贯通覆盖潜力" : "贯通覆盖潜力",
    };
  }

  if (itemEffect.trigger === "customGrowthPotential") {
    const scaledPlanStat = itemEffect.scaledPlanStat;
    const sourceStatValue = Math.max(0, normalizedStats[scaledPlanStat] ?? 0);
    const nbStatScaled = Math.max(1, Math.abs(toNumber(itemEffect.nbStatScaled ?? 1, 1)));
    const sourceUnits = sourceStatValue / nbStatScaled;
    const permanenceMultiplier = itemEffect.permStatsOnly ? 1.15 : 1;
    const customGrowthUtilityScore = Math.log1p(sourceUnits) * 1.4 * permanenceMultiplier;

    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      scaledPlanStat,
      sourceStatValue,
      nbStatScaled,
      sourceUnits,
      permanenceMultiplier,
      customGrowthUtilityScore,
      utilityLabel: "官方自定义成长潜力",
    };
  }

  if (itemEffect.trigger === "endWaveStatGrowth") {
    const wavesRemaining = Math.max(1, toNumber(itemEffect.wavesRemaining ?? 8, 8));
    const statGains = Array.isArray(itemEffect.statGains) ? itemEffect.statGains : [];
    const totalPerWaveGain = statGains.reduce(
      (sum, gain) => sum + Math.max(0, toNumber(gain.value ?? 0, 0)),
      0,
    );
    const projectedStatGain = totalPerWaveGain * wavesRemaining;
    const endWaveGrowthUtilityScore = projectedStatGain * 0.4;

    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      statGains,
      wavesRemaining,
      totalPerWaveGain,
      projectedStatGain,
      endWaveGrowthUtilityScore,
      economyLabel: "每波成长潜力",
    };
  }

  if (itemEffect.trigger === "harvestingGrowth") {
    const growthPercent = Math.max(0, itemEffect.growthPercent ?? 0);
    const extraHarvesting = Math.max(0, normalizedStats.harvesting) * (growthPercent / 100);
    const economyUtilityScore = extraHarvesting;

    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      growthPercent,
      extraHarvesting,
      economyUtilityScore,
      economyLabel: "收获成长等效",
    };
  }

  if (itemEffect.trigger === "crateMaterialBonus") {
    const extraMaterialPerCrate = Math.max(0, itemEffect.crateMaterialValue ?? 0);
    const economyUtilityScore = extraMaterialPerCrate / 4;

    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      extraMaterialPerCrate,
      economyUtilityScore,
      economyLabel: "箱子材料潜力",
    };
  }

  if (itemEffect.trigger === "startWaveSavings") {
    const savingsPercent = Math.max(0, itemEffect.savingsPercent ?? 0);
    const economyUtilityScore = savingsPercent / 2;

    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      savingsPercent,
      economyUtilityScore,
      economyLabel: "波次存钱潜力",
    };
  }

  if (itemEffect.trigger === "onPickupHealChance") {
    const chance = clamp((itemEffect.chance ?? 0) / 100, 0, 1);
    const healAmount = Math.max(0, itemEffect.healAmount ?? 1);
    const healingPerSecond = scenario.pickupRatePerSecond * chance * healAmount;
    const sustainUtilityScore = healingPerSecond * 20;

    return {
      itemEffect,
      scenario,
      triggerRate: scenario.pickupRatePerSecond,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      chance,
      healAmount,
      healingPerSecond,
      sustainUtilityScore,
      sustainLabel: "拾取治疗期望",
    };
  }

  if (itemEffect.trigger === "consumableHealBonus") {
    const healBonus = Math.max(0, itemEffect.healBonus ?? 0);
    const healOverTimeBonus = Math.max(0, itemEffect.healOverTimeBonus ?? 0);
    const totalHealBonus = healBonus + healOverTimeBonus;
    const consumablePickupShare = clamp(itemEffect.consumablePickupShare ?? 0.25, 0, 1);
    const triggerRate = scenario.pickupRatePerSecond * consumablePickupShare;
    const healingPerSecond = triggerRate * totalHealBonus;
    const sustainUtilityScore = healingPerSecond * 8;

    return {
      itemEffect,
      scenario,
      triggerRate,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      healBonus,
      healOverTimeBonus,
      totalHealBonus,
      consumablePickupShare,
      healingPerSecond,
      sustainUtilityScore,
      sustainLabel: "消耗品治疗潜力",
    };
  }

  if (itemEffect.trigger === "onDodgeHeal") {
    const dodgeChance = clamp(normalizedStats.dodge / 100, 0, 0.6);
    const chance = clamp((itemEffect.chance ?? 0) / 100, 0, 1);
    const healAmount = Math.max(0, itemEffect.healAmount ?? 0);
    const incomingHitPressure = scenario.killRateMultiplier * scenario.positioningStress;
    const healingPerSecond = incomingHitPressure * dodgeChance * chance * healAmount;
    const sustainUtilityScore = healingPerSecond * 6;

    return {
      itemEffect,
      scenario,
      triggerRate: incomingHitPressure,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      dodgeChance,
      chance,
      healAmount,
      incomingHitPressure,
      healingPerSecond,
      sustainUtilityScore,
      sustainLabel: "闪避治疗期望",
    };
  }

  if (itemEffect.trigger === "onKillHealChance") {
    const chance = clamp((itemEffect.chance ?? 0) / 100, 0, 1);
    const healAmount = Math.max(0, itemEffect.healAmount ?? 1);
    const critGated = Boolean(itemEffect.critGated);
    const critChanceBonus = Math.max(0, itemEffect.critChanceBonus ?? 0);
    const critChance = critGated
      ? clamp((normalizedStats.critChance + critChanceBonus) / 100, 0, 1)
      : 1;
    const triggerRate = scenario.killRateMultiplier * critChance;
    const healingPerSecond = triggerRate * chance * healAmount;
    const sustainUtilityScore = healingPerSecond * 12;

    return {
      itemEffect,
      scenario,
      triggerRate,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      chance,
      healAmount,
      critGated,
      critChanceBonus,
      critChance,
      healingPerSecond,
      sustainUtilityScore,
      sustainLabel: critGated ? "暴击击杀治疗期望" : "击杀治疗期望",
    };
  }

  if (itemEffect.trigger === "enemyFruitDropBonus") {
    const fruitDropChancePercent = Math.max(0, itemEffect.fruitDropChancePercent ?? 0);
    const fruitDropChance = clamp(fruitDropChancePercent / 100, 0, 1);
    const extraConsumablesPerSecond = scenario.killRateMultiplier * fruitDropChance;
    const consumableOpportunityScore = extraConsumablesPerSecond * 50;

    return {
      itemEffect,
      scenario,
      triggerRate: scenario.killRateMultiplier,
      expectedDamage: 0,
      dps: 0,
      rawDps: 0,
      fruitDropChancePercent,
      fruitDropChance,
      extraConsumablesPerSecond,
      consumableOpportunityScore,
      utilityLabel: "额外消耗品机会",
    };
  }

  const dodgeDamageTriggerRate =
    scenario.killRateMultiplier *
    scenario.positioningStress *
    clamp(normalizedStats.dodge / 100, 0, 0.6);
  const triggerRate =
    itemEffect.trigger === "onPickup"
      ? scenario.pickupRatePerSecond
      : itemEffect.trigger === "onKill"
        ? scenario.killRateMultiplier
        : itemEffect.trigger === "onDodgeDamage"
          ? dodgeDamageTriggerRate
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
